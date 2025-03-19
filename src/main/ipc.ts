import { ipcMain } from 'electron';
import { benchmarkManager } from './benchmarkManager';
import { BenchmarkParams, BenchmarkResult } from '../types/benchmark';
import { benchmarkStore } from './store';

export function setupBenchmarkIPC() {
	ipcMain.handle('run-benchmark', async (_, params: BenchmarkParams) => {
		try {
			const result = await benchmarkManager.runBenchmark(params);
			// Save the benchmark result to the store
			const savedResult = benchmarkStore.saveBenchmarkResult(result);
			return savedResult;
		} catch (error: any) {
			// We'll still save failed benchmarks but mark them as failed
			if (
				error &&
				typeof error === 'object' &&
				error.id &&
				error.status === 'failed'
			) {
				return benchmarkStore.saveBenchmarkResult(
					error as Omit<BenchmarkResult, 'id'>
				);
			}
			return error;
		}
	});

	ipcMain.handle('stop-benchmark', async (_, benchmarkId: string) => {
		return benchmarkManager.stopBenchmark(benchmarkId);
	});

	// New IPC handlers for benchmark data operations
	ipcMain.handle('get-all-benchmarks', async () => {
		return benchmarkStore.getAllBenchmarkResults();
	});

	ipcMain.handle(
		'get-benchmarks-by-algorithm',
		async (_, algorithm: string) => {
			return benchmarkStore.getBenchmarksByAlgorithm(algorithm);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-security-param',
		async (_, securityParam: string) => {
			return benchmarkStore.getBenchmarksBySecurityParam(securityParam);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-algorithm-and-param',
		async (_, algorithm: string, securityParam: string) => {
			return benchmarkStore.getBenchmarksByAlgorithmAndParam(
				algorithm,
				securityParam
			);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-date-range',
		async (_, startDate: string, endDate: string) => {
			return benchmarkStore.getBenchmarksByDateRange(
				new Date(startDate),
				new Date(endDate)
			);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-status',
		async (_, status: 'completed' | 'failed') => {
			return benchmarkStore.getBenchmarksByStatus(status);
		}
	);

	ipcMain.handle('get-benchmark-by-id', async (_, id: string) => {
		return benchmarkStore.getBenchmarkById(id);
	});

	ipcMain.handle('delete-benchmark', async (_, id: string) => {
		return benchmarkStore.deleteBenchmark(id);
	});

	ipcMain.handle('clear-all-benchmarks', async () => {
		benchmarkStore.clearAllBenchmarks();
		return true;
	});
}
