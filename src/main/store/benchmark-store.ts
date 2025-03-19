import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { BenchmarkResult } from '../../types/benchmark';

export class BenchmarkStore {
	private storePath: string;
	private data: {
		benchmarks: BenchmarkResult[];
	};

	constructor() {
		// Store data in the app's user data directory
		this.storePath = path.join(app.getPath('userData'), 'benchmark-data.json');
		this.data = { benchmarks: [] };
		this.loadData();
	}

	/**
	 * Load benchmark data from the JSON file
	 */
	private loadData(): void {
		try {
			if (fs.existsSync(this.storePath)) {
				const fileContent = fs.readFileSync(this.storePath, 'utf-8');
				this.data = JSON.parse(fileContent);
			} else {
				// Initialize with empty data and create the file
				this.saveData();
			}
		} catch (error) {
			console.error('Error loading benchmark data:', error);
			// Initialize with empty data if there's an error
			this.data = { benchmarks: [] };
		}
	}

	/**
	 * Save the current data to the JSON file
	 */
	private saveData(): void {
		try {
			fs.writeFileSync(
				this.storePath,
				JSON.stringify(this.data, null, 2),
				'utf-8'
			);
		} catch (error) {
			console.error('Error saving benchmark data:', error);
		}
	}

	/**
	 * Save a new benchmark result
	 */
	saveBenchmarkResult(result: Omit<BenchmarkResult, 'id'>): BenchmarkResult {
		const benchmarkWithId: BenchmarkResult = {
			...result,
			id: uuidv4(),
		};

		this.data.benchmarks.push(benchmarkWithId);
		this.saveData();
		return benchmarkWithId;
	}

	/**
	 * Get all benchmark results
	 */
	getAllBenchmarkResults(): BenchmarkResult[] {
		return [...this.data.benchmarks];
	}

	/**
	 * Get benchmark results filtered by algorithm
	 */
	getBenchmarksByAlgorithm(algorithm: string): BenchmarkResult[] {
		return this.data.benchmarks.filter(
			(benchmark) =>
				benchmark.algorithm.toLowerCase() === algorithm.toLowerCase()
		);
	}

	/**
	 * Get benchmark results filtered by security parameter
	 */
	getBenchmarksBySecurityParam(securityParam: string): BenchmarkResult[] {
		return this.data.benchmarks.filter(
			(benchmark) => benchmark.securityParam === securityParam
		);
	}

	/**
	 * Get benchmark results filtered by algorithm and security parameter
	 */
	getBenchmarksByAlgorithmAndParam(
		algorithm: string,
		securityParam: string
	): BenchmarkResult[] {
		return this.data.benchmarks.filter(
			(benchmark) =>
				benchmark.algorithm.toLowerCase() === algorithm.toLowerCase() &&
				benchmark.securityParam === securityParam
		);
	}

	/**
	 * Get benchmarks within a date range
	 */
	getBenchmarksByDateRange(startDate: Date, endDate: Date): BenchmarkResult[] {
		return this.data.benchmarks.filter((benchmark) => {
			const benchmarkDate = new Date(benchmark.timestamp);
			return benchmarkDate >= startDate && benchmarkDate <= endDate;
		});
	}

	/**
	 * Get benchmarks by completion status
	 */
	getBenchmarksByStatus(status: 'completed' | 'failed'): BenchmarkResult[] {
		return this.data.benchmarks.filter(
			(benchmark) => benchmark.status === status
		);
	}

	/**
	 * Delete a benchmark by ID
	 */
	deleteBenchmark(id: string): boolean {
		const initialLength = this.data.benchmarks.length;
		this.data.benchmarks = this.data.benchmarks.filter(
			(benchmark) => benchmark.id !== id
		);

		if (initialLength !== this.data.benchmarks.length) {
			this.saveData();
			return true;
		}
		return false;
	}

	/**
	 * Clear all benchmarks
	 */
	clearAllBenchmarks(): void {
		this.data.benchmarks = [];
		this.saveData();
	}

	/**
	 * Get benchmark by ID
	 */
	getBenchmarkById(id: string): BenchmarkResult | undefined {
		return this.data.benchmarks.find((benchmark) => benchmark.id === id);
	}

	/**
	 * Custom query function for more complex filtering
	 */
	queryBenchmarks(
		filterFn: (benchmark: BenchmarkResult) => boolean
	): BenchmarkResult[] {
		return this.data.benchmarks.filter(filterFn);
	}
}
