import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { BenchmarkParams, BenchmarkResult } from '../types/benchmark';
import { v4 as uuidv4 } from 'uuid';

// Define the progress data interface
export interface BenchmarkProgressData {
	progress: 'keygen' | 'encaps' | 'decaps';
	parameter: string;
	iteration: number;
	total: number;
	current_avg_ms: number;
	current_min_ms: number;
	current_max_ms: number;
	current_throughput_ops_sec: number;
	current_mem_avg_kb: number;
	current_mem_peak_kb: number;
}

class BenchmarkManager {
	private activeProcesses: Map<string, ChildProcess> = new Map();
	private readonly executablesPath = 'C:\\Users\\brand\\executables';
	private progressCallback: ((data: BenchmarkProgressData) => void) | null =
		null;

	// Set up progress callback
	onProgress(callback: (data: BenchmarkProgressData) => void): void {
		this.progressCallback = callback;
	}

	runBenchmark(params: BenchmarkParams): Promise<BenchmarkResult> {
		const benchmarkId = uuidv4();
		const executablePath = path.join(
			this.executablesPath,
			`benchmark_${params.algorithm}.exe`
		);

		// Build args - include iterations if specified
		const args = [params.securityParam];
		if (params.iterations) {
			args.push('--iterations', params.iterations.toString());
		}

		return new Promise((resolve, reject) => {
			const metrics: { [key: string]: number } = {};
			// Store last progress data for each operation type as a fallback
			const lastProgressData: { [key: string]: BenchmarkProgressData } = {};

			const process = spawn(executablePath, args);
			this.activeProcesses.set(benchmarkId, process);

			// Handle process output - extract metrics
			process.stdout.on('data', (data: Buffer) => {
				const output = data.toString();
				const lines = output.split('\n');

				for (const line of lines) {
					// Try to parse JSON progress data
					try {
						if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
							const progressData = JSON.parse(line.trim());
							// If this is progress data, send it via the callback and store it
							if (
								progressData.progress &&
								typeof progressData.progress === 'string' &&
								typeof progressData.iteration === 'number' &&
								typeof progressData.total === 'number'
							) {
								// Store the last progress data for each operation type
								lastProgressData[progressData.progress] = progressData;

								// Send to renderer
								if (this.progressCallback) {
									this.progressCallback(progressData);
								}
							}
						}
					} catch (e) {
						// Not valid JSON, continue with normal parsing
					}

					// Pattern 1: Metric (unit): value
					let match = line.match(/(\w+)\s*\((?:\w+|ms)\):\s*([\d.]+)/i);
					if (match) {
						const [, metric, value] = match;
						metrics[metric.toLowerCase()] = parseFloat(value);
						continue;
					}

					// Pattern 2: Metric: value ms
					match = line.match(/(\w+):\s*([\d.]+)\s*ms/i);
					if (match) {
						const [, metric, value] = match;
						metrics[metric.toLowerCase()] = parseFloat(value);
						continue;
					}

					// Pattern 3: Metric = value
					match = line.match(/(\w+)\s*=\s*([\d.]+)/i);
					if (match) {
						const [, metric, value] = match;
						metrics[metric.toLowerCase()] = parseFloat(value);
						continue;
					}
				}
			});

			// Handle stderr output for better error reporting
			let errorOutput = '';
			process.stderr.on('data', (data: Buffer) => {
				errorOutput += data.toString();
			});

			process.on('error', (error) => {
				this.activeProcesses.delete(benchmarkId);
				reject({
					id: benchmarkId,
					algorithm: params.algorithm,
					securityParam: params.securityParam,
					metrics: {},
					timestamp: new Date().toISOString(),
					status: 'failed',
					error: error.message || 'Unknown error occurred',
				});
			});

			process.on('close', (code) => {
				this.activeProcesses.delete(benchmarkId);

				// Check if we actually got any metrics
				let hasMetrics = Object.keys(metrics).length > 0;

				// If no metrics were found through regex, use the metrics from progress data
				if (!hasMetrics && Object.keys(lastProgressData).length > 0) {
					// Convert progress data to metrics
					Object.values(lastProgressData).forEach((data) => {
						if (data.progress) {
							// Add average time for this operation
							metrics[`${data.progress}_avg_ms`] = data.current_avg_ms;

							// Add min/max times
							metrics[`${data.progress}_min_ms`] = data.current_min_ms;
							metrics[`${data.progress}_max_ms`] = data.current_max_ms;

							// Add throughput
							metrics[`${data.progress}_ops_sec`] =
								data.current_throughput_ops_sec;

							// Add memory metrics if available
							if (data.current_mem_avg_kb !== undefined) {
								metrics[`${data.progress}_mem_avg_kb`] =
									data.current_mem_avg_kb;
							}
							if (data.current_mem_peak_kb !== undefined) {
								metrics[`${data.progress}_mem_peak_kb`] =
									data.current_mem_peak_kb;
							}
						}
					});

					// Check if we've added metrics from progress data
					hasMetrics = Object.keys(metrics).length > 0;
				}

				if (code === 0 && hasMetrics) {
					resolve({
						id: benchmarkId,
						algorithm: params.algorithm,
						securityParam: params.securityParam,
						metrics,
						timestamp: new Date().toISOString(),
						status: 'completed',
					});
				} else {
					// If process exited with code 0 but no metrics were found, it's still an error
					const errorMessage =
						errorOutput ||
						(code !== 0
							? `Process exited with code ${code}`
							: 'No metrics found in benchmark output');

					reject({
						id: benchmarkId,
						algorithm: params.algorithm,
						securityParam: params.securityParam,
						metrics: hasMetrics ? metrics : {}, // Include any metrics we did find
						timestamp: new Date().toISOString(),
						status: 'failed',
						error: errorMessage,
					});
				}
			});
		});
	}

	stopBenchmark(benchmarkId: string): boolean {
		const process = this.activeProcesses.get(benchmarkId);
		if (process) {
			process.kill();
			this.activeProcesses.delete(benchmarkId);
			return true;
		}
		return false;
	}
}

export const benchmarkManager = new BenchmarkManager();
