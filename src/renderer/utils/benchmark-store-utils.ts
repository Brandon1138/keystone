import {
	BenchmarkParams,
	BenchmarkResult,
	SUPPORTED_ALGORITHMS,
} from '../../types/benchmark';
import { getAlgorithmInfo, AlgorithmCategory } from './algorithm-categories';

/**
 * Utility functions for accessing benchmark data from the renderer process
 */
export const benchmarkStoreUtils = {
	/**
	 * Run a new benchmark and save the result
	 */
	async runBenchmark(params: BenchmarkParams): Promise<BenchmarkResult> {
		return window.electron.ipcRenderer.invoke('run-benchmark', params);
	},

	/**
	 * Stop a running benchmark
	 */
	async stopBenchmark(benchmarkId: string): Promise<boolean> {
		return window.electron.ipcRenderer.invoke('stop-benchmark', benchmarkId);
	},

	/**
	 * Get all benchmark results
	 */
	async getAllBenchmarks(): Promise<BenchmarkResult[]> {
		return window.electron.ipcRenderer.invoke('get-all-benchmarks');
	},

	/**
	 * Get benchmark results filtered by algorithm
	 */
	async getBenchmarksByAlgorithm(
		algorithm: string
	): Promise<BenchmarkResult[]> {
		return window.electron.ipcRenderer.invoke(
			'get-benchmarks-by-algorithm',
			algorithm
		);
	},

	/**
	 * Get benchmark results filtered by security parameter
	 */
	async getBenchmarksBySecurityParam(
		securityParam: string
	): Promise<BenchmarkResult[]> {
		return window.electron.ipcRenderer.invoke(
			'get-benchmarks-by-security-param',
			securityParam
		);
	},

	/**
	 * Get benchmark results filtered by algorithm and security parameter
	 */
	async getBenchmarksByAlgorithmAndParam(
		algorithm: string,
		securityParam: string
	): Promise<BenchmarkResult[]> {
		return window.electron.ipcRenderer.invoke(
			'get-benchmarks-by-algorithm-and-param',
			algorithm,
			securityParam
		);
	},

	/**
	 * Get benchmarks within a date range
	 */
	async getBenchmarksByDateRange(
		startDate: Date,
		endDate: Date
	): Promise<BenchmarkResult[]> {
		return window.electron.ipcRenderer.invoke(
			'get-benchmarks-by-date-range',
			startDate.toISOString(),
			endDate.toISOString()
		);
	},

	/**
	 * Get benchmarks by completion status
	 */
	async getBenchmarksByStatus(
		status: 'completed' | 'failed'
	): Promise<BenchmarkResult[]> {
		return window.electron.ipcRenderer.invoke(
			'get-benchmarks-by-status',
			status
		);
	},

	/**
	 * Get a benchmark by ID
	 */
	async getBenchmarkById(id: string): Promise<BenchmarkResult | undefined> {
		return window.electron.ipcRenderer.invoke('get-benchmark-by-id', id);
	},

	/**
	 * Delete a benchmark by ID
	 */
	async deleteBenchmark(id: string): Promise<boolean> {
		return window.electron.ipcRenderer.invoke('delete-benchmark', id);
	},

	/**
	 * Clear all benchmarks
	 */
	async clearAllBenchmarks(): Promise<boolean> {
		return window.electron.ipcRenderer.invoke('clear-all-benchmarks');
	},

	/**
	 * Get benchmarks for comparison (all completed benchmarks grouped by algorithm and security param)
	 */
	async getBenchmarksForComparison(): Promise<{
		[key: string]: BenchmarkResult[];
	}> {
		const allBenchmarks = await this.getBenchmarksByStatus('completed');
		const result: { [key: string]: BenchmarkResult[] } = {};

		allBenchmarks.forEach((benchmark) => {
			const key = `${benchmark.algorithm}-${benchmark.securityParam}`;
			if (!result[key]) {
				result[key] = [];
			}
			result[key].push(benchmark);
		});

		return result;
	},

	/**
	 * Get average metrics for each algorithm/parameter combination
	 * Useful for comparison charts
	 */
	async getAverageMetrics(): Promise<
		{
			key: string;
			algorithm: string;
			securityParam: string;
			metrics: { [key: string]: number };
			count: number;
		}[]
	> {
		const benchmarkGroups = await this.getBenchmarksForComparison();

		return Object.entries(benchmarkGroups).map(([key, benchmarks]) => {
			const metrics: { [key: string]: number } = {};
			const metricsCount: { [key: string]: number } = {};

			// Calculate sum of all metrics
			benchmarks.forEach((benchmark) => {
				Object.entries(benchmark.metrics).forEach(([metricName, value]) => {
					if (!metrics[metricName]) {
						metrics[metricName] = 0;
						metricsCount[metricName] = 0;
					}
					metrics[metricName] += value;
					metricsCount[metricName]++;
				});
			});

			// Calculate average
			Object.keys(metrics).forEach((metricName) => {
				metrics[metricName] = metrics[metricName] / metricsCount[metricName];
			});

			const [algorithm, securityParam] = key.split('-');

			return {
				key,
				algorithm,
				securityParam,
				metrics,
				count: benchmarks.length,
			};
		});
	},

	/**
	 * Get all algorithms grouped by category
	 */
	getAlgorithmsByCategory(): { [key in AlgorithmCategory]: string[] } {
		const result: { [key in AlgorithmCategory]: string[] } = {
			KEM: [],
			Signature: [],
			Symmetric: [],
			ClassicalPublicKey: [],
		};

		SUPPORTED_ALGORITHMS.forEach((algorithm) => {
			const { category } = getAlgorithmInfo(algorithm);
			result[category].push(algorithm);
		});

		return result;
	},
};
