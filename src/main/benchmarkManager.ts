import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { BenchmarkParams, BenchmarkResult } from '../types/benchmark';
import { v4 as uuidv4 } from 'uuid';

class BenchmarkManager {
	private activeProcesses: Map<string, ChildProcess> = new Map();
	private readonly executablesPath = 'C:\\Users\\brand\\executables';

	runBenchmark(params: BenchmarkParams): Promise<BenchmarkResult> {
		const benchmarkId = uuidv4();
		const executablePath = path.join(
			this.executablesPath,
			`benchmark_${params.algorithm}.exe`
		);

		return new Promise((resolve, reject) => {
			const metrics: { [key: string]: number } = {};
			const process = spawn(executablePath, [params.securityParam]);
			this.activeProcesses.set(benchmarkId, process);

			// Handle process output - extract metrics
			process.stdout.on('data', (data: Buffer) => {
				const output = data.toString();
				const lines = output.split('\n');

				for (const line of lines) {
					// Try different regex patterns for metric extraction
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
				const hasMetrics = Object.keys(metrics).length > 0;

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
