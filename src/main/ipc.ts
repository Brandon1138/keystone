import { ipcMain } from 'electron';
import { benchmarkManager } from './benchmarkManager';
import { BenchmarkParams } from '../types/benchmark';

export function setupBenchmarkIPC() {
	ipcMain.handle('run-benchmark', async (_, params: BenchmarkParams) => {
		try {
			const result = await benchmarkManager.runBenchmark(params);
			return result;
		} catch (error) {
			return error;
		}
	});

	ipcMain.handle('stop-benchmark', async (_, benchmarkId: string) => {
		return benchmarkManager.stopBenchmark(benchmarkId);
	});
}
