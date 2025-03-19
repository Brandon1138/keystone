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

			process.stdout.on('data', (data: Buffer) => {
				const lines = data.toString().split('\n');
				for (const line of lines) {
					const match = line.match(/(\w+)\s*\(\w+\):\s*([\d.]+)/);
					if (match) {
						const [, metric, value] = match;
						metrics[metric.toLowerCase()] = parseFloat(value);
					}
				}
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
					error: error.message,
				});
			});

			process.on('close', (code) => {
				this.activeProcesses.delete(benchmarkId);
				if (code === 0) {
					resolve({
						id: benchmarkId,
						algorithm: params.algorithm,
						securityParam: params.securityParam,
						metrics,
						timestamp: new Date().toISOString(),
						status: 'completed',
					});
				} else {
					reject({
						id: benchmarkId,
						algorithm: params.algorithm,
						securityParam: params.securityParam,
						metrics,
						timestamp: new Date().toISOString(),
						status: 'failed',
						error: `Process exited with code ${code}`,
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
