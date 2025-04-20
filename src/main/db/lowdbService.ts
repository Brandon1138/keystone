import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import * as path from 'path';
import { app } from 'electron';
import { nanoid } from 'nanoid';
import { BenchmarkParams, BenchmarkResult } from '../../types/benchmark';
import { Article, RssFeed } from '../types/articles';

// Data structure definitions
export interface Run {
	runId: string;
	timestamp: string;
	runType: 'PQC_Classical' | 'Quantum_Shor' | 'Quantum_Grover';
	status: 'pending' | 'running' | 'completed' | 'failed';
	algorithm?: string;
	securityParam?: string;
	iterations?: number;
	error?: string;
	notes?: string;
}

export interface QuantumResult {
	resultId: string;
	runId: string;
	// Common fields for both Shor and Grover
	status: 'success' | 'error';
	execution_time_sec: number | null;
	circuit_depth: number | null;
	cx_gate_count: number | null;
	total_gate_count: number | null;
	backend_used: string | null;
	job_id: string | null;
	shots: number;
	ran_on_hardware: boolean;
	plot_file_path: string | null;
	error_message: string | null;
	raw_counts: { [key: string]: number } | null;
	qpu_time_sec?: number | null;

	// Noise and error metrics
	gate_error?: number | null;
	readout_error?: number | null;
	t1_time?: number | null;
	t2_time?: number | null;
	quantum_volume?: number | null;

	// Shor-specific fields
	n_value?: number;
	a_value?: number;
	factors?: number[] | null;

	// Grover-specific fields
	input_marked_states?: string[];
	top_measured_state?: string;
	top_measured_count?: number;
	found_correct_state?: boolean;
	num_qubits?: number;
}

export interface PqcClassicalDetail {
	detailId: string;
	runId: string;
	mainAlgorithm: string;
	variant: string;
	iterations: number;
	sizes?: {
		public_key_bytes?: number;
		secret_key_bytes?: number;
		signature_bytes?: number;
		shared_secret_bytes?: number;
		ciphertext_bytes?: number;
		key_bytes?: number;
		iv_bytes?: number;
	};
	key_size?: number;
	curve?: string;

	// Performance metrics for various operations
	keygen?: {
		min_ms: number;
		max_ms: number;
		avg_ms: number;
		ops_per_sec: number;
		mem_peak_kb: number;
		mem_avg_kb: number;
	};
	sign?: {
		min_ms: number;
		max_ms: number;
		avg_ms: number;
		ops_per_sec: number;
		mem_peak_kb: number;
		mem_avg_kb: number;
	};
	verify?: {
		min_ms: number;
		max_ms: number;
		avg_ms: number;
		ops_per_sec: number;
		mem_peak_kb: number;
		mem_avg_kb: number;
	};
	encaps?: {
		min_ms: number;
		max_ms: number;
		avg_ms: number;
		ops_per_sec: number;
		mem_peak_kb: number;
		mem_avg_kb: number;
	};
	decaps?: {
		min_ms: number;
		max_ms: number;
		avg_ms: number;
		ops_per_sec: number;
		mem_peak_kb: number;
		mem_avg_kb: number;
	};
	encryption?: {
		min_ms: number;
		max_ms: number;
		avg_ms: number;
		ops_per_sec: number;
		mem_peak_kb: number;
		mem_avg_kb: number;
	};
	decryption?: {
		min_ms: number;
		max_ms: number;
		avg_ms: number;
		ops_per_sec: number;
		mem_peak_kb: number;
		mem_avg_kb: number;
	};
	shared_secret?: {
		min_ms: number;
		max_ms: number;
		avg_ms: number;
		ops_per_sec: number;
		mem_peak_kb: number;
		mem_avg_kb: number;
	};
}

// The overall structure of the data property in LowDB
interface DatabaseSchema {
	runs: Run[];
	quantumResults: QuantumResult[];
	pqcClassicalDetails: PqcClassicalDetail[];
	articles: Article[];
	rssFeeds: RssFeed[];
}

// Default empty database structure
const defaultData: DatabaseSchema = {
	runs: [],
	quantumResults: [],
	pqcClassicalDetails: [],
	articles: [],
	rssFeeds: [],
};

// Create a class to encapsulate LowDB operations
class LowDBService {
	private db: Low<DatabaseSchema>;
	private initialized: boolean = false;
	private dbPath: string;
	private defaultDatasetPath: string;

	constructor() {
		// Set the default dataset path
		this.defaultDatasetPath = path.join(
			app.getPath('userData'),
			'pqc-workbench-results.json'
		);

		// Initially use the default path
		this.dbPath = this.defaultDatasetPath;

		// Create a new adapter with the default path
		const adapter = new JSONFile<DatabaseSchema>(this.dbPath);

		// Initialize with default data structure
		this.db = new Low(adapter, defaultData);
	}

	/**
	 * Get the current database path
	 */
	getDbPath(): string {
		return this.dbPath;
	}

	/**
	 * Switch to a different database file
	 */
	async switchDatabase(newDbPath: string): Promise<boolean> {
		try {
			// Create a new adapter with the new path
			const adapter = new JSONFile<DatabaseSchema>(newDbPath);

			// Save the current database if it's been initialized
			if (this.initialized) {
				await this.db.write();
			}

			// Switch to the new database
			this.db = new Low(adapter, defaultData);
			this.dbPath = newDbPath;
			this.initialized = false;

			// Initialize the new database
			await this.initialize();

			console.log(`Switched database to: ${newDbPath}`);
			return true;
		} catch (error) {
			console.error('Error switching database:', error);
			return false;
		}
	}

	/**
	 * Create a new empty database
	 */
	async createNewDatabase(newDbPath: string): Promise<boolean> {
		try {
			// Create a new adapter with the new path
			const adapter = new JSONFile<DatabaseSchema>(newDbPath);

			// Create a new database with empty data
			this.db = new Low(adapter, { ...defaultData });
			this.dbPath = newDbPath;
			this.initialized = false;

			// Write the empty database to disk
			await this.db.write();

			// Initialize the new database
			await this.initialize();

			console.log(`Created new database at: ${newDbPath}`);
			return true;
		} catch (error) {
			console.error('Error creating new database:', error);
			return false;
		}
	}

	/**
	 * Reset to the default database
	 */
	async resetToDefaultDatabase(): Promise<boolean> {
		return await this.switchDatabase(this.defaultDatasetPath);
	}

	/**
	 * Initialize the database
	 */
	async initialize(): Promise<void> {
		try {
			// Read the database
			await this.db.read();

			// Make sure data is initialized (should already be from constructor)
			if (!this.db.data) {
				this.db.data = {
					runs: [],
					quantumResults: [],
					pqcClassicalDetails: [],
					articles: [],
					rssFeeds: [],
				};
			}

			// Write the default structure if needed
			if (!this.initialized) {
				await this.db.write();
				this.initialized = true;
				console.log(`LowDB initialized successfully at ${this.dbPath}`);
			}
		} catch (error) {
			console.error('Error initializing LowDB:', error);
			throw error;
		}
	}

	/**
	 * Ensure the database is loaded before operations
	 */
	async ensureLoaded(): Promise<void> {
		if (!this.initialized) {
			await this.initialize();
		} else {
			// Refresh data if needed
			await this.db.read();
		}
	}

	/**
	 * Create a new run record
	 */
	async createRun(
		runType: Run['runType'],
		algorithm?: string,
		securityParam?: string,
		iterations?: number,
		notes?: string
	): Promise<string> {
		await this.ensureLoaded();

		const runId = nanoid();
		const newRun: Run = {
			runId,
			timestamp: new Date().toISOString(),
			runType,
			status: 'pending',
			algorithm,
			securityParam,
			iterations,
			notes,
		};

		this.db.data.runs.push(newRun);
		await this.db.write();
		return runId;
	}

	/**
	 * Update the status of a run
	 */
	async updateRunStatus(
		runId: string,
		status: Run['status'],
		error?: string
	): Promise<boolean> {
		await this.ensureLoaded();

		const runIndex = this.db.data.runs.findIndex((r) => r.runId === runId);
		if (runIndex > -1) {
			this.db.data.runs[runIndex].status = status;
			if (error) {
				this.db.data.runs[runIndex].error = error;
			}
			await this.db.write();
			return true;
		}
		return false;
	}

	/**
	 * Insert quantum result data
	 */
	async insertQuantumResult(runId: string, resultData: any): Promise<string> {
		await this.ensureLoaded();

		// Debug log to check for noise metrics
		if (resultData) {
			console.log('Inserting quantum result with data:', {
				runId,
				gate_error: resultData.gate_error,
				readout_error: resultData.readout_error,
				t1_time: resultData.t1_time,
				t2_time: resultData.t2_time,
				quantum_volume: resultData.quantum_volume,
			});
		}

		const resultId = nanoid();
		const newResult: QuantumResult = {
			resultId,
			runId,
			...resultData,
		};

		this.db.data.quantumResults.push(newResult);
		await this.db.write();
		return resultId;
	}

	/**
	 * Insert PQC/Classical benchmark result
	 */
	async insertPqcClassicalResult(
		runId: string,
		benchmarkData: any
	): Promise<string[]> {
		await this.ensureLoaded();

		const mainAlgorithm = benchmarkData.algorithm;
		const iterations = benchmarkData.iterations;
		const detailIds: string[] = [];

		// Process each result item
		if (benchmarkData.results && Array.isArray(benchmarkData.results)) {
			for (const resultItem of benchmarkData.results) {
				const detailId = nanoid();
				let variant;

				// Special handling for AES to ensure security parameter is preserved
				if (mainAlgorithm.toLowerCase() === 'aes' && resultItem.algorithm) {
					variant = resultItem.algorithm;
				} else {
					variant =
						resultItem.algorithm ||
						resultItem.parameter ||
						resultItem.key_size?.toString() ||
						'unknown';
				}

				// Create the detail record
				const newDetail: PqcClassicalDetail = {
					detailId,
					runId,
					mainAlgorithm,
					variant,
					iterations,
					...resultItem,
				};

				this.db.data.pqcClassicalDetails.push(newDetail);
				detailIds.push(detailId);
			}
		} else {
			// If there are no detailed results, create a single entry
			const detailId = nanoid();
			const newDetail: PqcClassicalDetail = {
				detailId,
				runId,
				mainAlgorithm,
				variant: benchmarkData.securityParam || 'unknown',
				iterations: iterations || 0,
				...benchmarkData,
			};
			this.db.data.pqcClassicalDetails.push(newDetail);
			detailIds.push(detailId);
		}

		await this.db.write();
		return detailIds;
	}

	/**
	 * Get all runs
	 */
	async getAllRuns(): Promise<Run[]> {
		await this.ensureLoaded();
		return [...(this.db.data.runs || [])];
	}

	/**
	 * Get runs by type
	 */
	async getRunsByType(runType: Run['runType']): Promise<Run[]> {
		await this.ensureLoaded();
		return this.db.data.runs.filter((r) => r.runType === runType);
	}

	/**
	 * Get runs by status
	 */
	async getRunsByStatus(status: Run['status']): Promise<Run[]> {
		await this.ensureLoaded();
		return this.db.data.runs.filter((r) => r.status === status);
	}

	/**
	 * Get runs by algorithm
	 */
	async getRunsByAlgorithm(algorithm: string): Promise<Run[]> {
		await this.ensureLoaded();
		return this.db.data.runs.filter((r) => r.algorithm === algorithm);
	}

	/**
	 * Get full details of a run
	 */
	async getFullRunDetails(runId: string): Promise<{
		run: Run | undefined;
		details: (QuantumResult | PqcClassicalDetail)[];
	}> {
		await this.ensureLoaded();

		const run = this.db.data.runs.find((r) => r.runId === runId);
		let details: (QuantumResult | PqcClassicalDetail)[] = [];

		if (run) {
			if (run.runType === 'PQC_Classical') {
				details = this.db.data.pqcClassicalDetails.filter(
					(d) => d.runId === runId
				);
			} else {
				// Quantum result (Shor or Grover)
				details = this.db.data.quantumResults.filter((d) => d.runId === runId);
			}
		}

		return { run, details };
	}

	/**
	 * Get run by ID
	 */
	async getRunById(runId: string): Promise<Run | undefined> {
		await this.ensureLoaded();
		return this.db.data.runs.find((r) => r.runId === runId);
	}

	/**
	 * Get all quantum results
	 */
	async getAllQuantumResults(): Promise<QuantumResult[]> {
		await this.ensureLoaded();
		return [...(this.db.data.quantumResults || [])];
	}

	/**
	 * Get quantum result by ID
	 */
	async getQuantumResultById(
		resultId: string
	): Promise<QuantumResult | undefined> {
		await this.ensureLoaded();
		return this.db.data.quantumResults.find((r) => r.resultId === resultId);
	}

	/**
	 * Get all PQC/Classical details
	 */
	async getAllPqcClassicalDetails(): Promise<PqcClassicalDetail[]> {
		await this.ensureLoaded();
		return [...(this.db.data.pqcClassicalDetails || [])];
	}

	/**
	 * Get PQC/Classical details by algorithm
	 */
	async getPqcClassicalDetailsByAlgorithm(
		algorithm: string
	): Promise<PqcClassicalDetail[]> {
		await this.ensureLoaded();
		return this.db.data.pqcClassicalDetails.filter(
			(d) => d.mainAlgorithm === algorithm
		);
	}

	/**
	 * Delete a run and its associated details
	 */
	async deleteRun(runId: string): Promise<boolean> {
		await this.ensureLoaded();

		const initialRunsLength = this.db.data.runs.length;

		// Remove the run
		this.db.data.runs = this.db.data.runs.filter((r) => r.runId !== runId);

		// Remove associated details
		this.db.data.quantumResults = this.db.data.quantumResults.filter(
			(r) => r.runId !== runId
		);
		this.db.data.pqcClassicalDetails = this.db.data.pqcClassicalDetails.filter(
			(d) => d.runId !== runId
		);

		// Only write if something was deleted
		if (initialRunsLength !== this.db.data.runs.length) {
			await this.db.write();
			return true;
		}

		return false;
	}

	/**
	 * Clear all data
	 */
	async clearAllData(): Promise<void> {
		await this.ensureLoaded();

		this.db.data = {
			runs: [],
			quantumResults: [],
			pqcClassicalDetails: [],
			articles: [],
			rssFeeds: [],
		};
		await this.db.write();
	}

	/**
	 * Add a new article
	 */
	async addArticle(article: Omit<Article, 'id'>): Promise<string> {
		await this.ensureLoaded();
		const id = nanoid();
		// Make sure the article has all required properties
		const newArticle: Article = {
			id,
			title: article.title || 'No Title',
			content: article.content || 'No Content',
			date: article.date || new Date().toISOString(),
			...article,
		};
		this.db.data.articles.push(newArticle);
		await this.db.write();
		return id;
	}

	/**
	 * Update an article
	 */
	async updateArticle(id: string, updates: Partial<Article>): Promise<boolean> {
		await this.ensureLoaded();
		const index = this.db.data.articles.findIndex(
			(article) => article.id === id
		);
		if (index === -1) return false;

		this.db.data.articles[index] = {
			...this.db.data.articles[index],
			...updates,
		};

		await this.db.write();
		return true;
	}

	/**
	 * Get all articles
	 */
	async getAllArticles(): Promise<Article[]> {
		await this.ensureLoaded();
		return this.db.data.articles;
	}

	/**
	 * Delete an article
	 */
	async deleteArticle(id: string): Promise<boolean> {
		await this.ensureLoaded();
		const initialLength = this.db.data.articles.length;
		this.db.data.articles = this.db.data.articles.filter(
			(article) => article.id !== id
		);
		await this.db.write();
		return initialLength > this.db.data.articles.length;
	}

	/**
	 * Add a new RSS feed
	 */
	async addRssFeed(feed: Omit<RssFeed, 'id'>): Promise<string> {
		await this.ensureLoaded();
		const id = nanoid();
		// Make sure the feed has all required properties
		const newFeed: RssFeed = {
			id,
			url: feed.url || 'https://example.com',
			name: feed.name || 'Default Feed',
			...feed,
		};
		this.db.data.rssFeeds.push(newFeed);
		await this.db.write();
		return id;
	}

	/**
	 * Get all RSS feeds
	 */
	async getAllRssFeeds(): Promise<RssFeed[]> {
		await this.ensureLoaded();
		return this.db.data.rssFeeds;
	}

	/**
	 * Update RSS feed last fetched timestamp
	 */
	async updateRssFeedLastFetched(id: string): Promise<boolean> {
		await this.ensureLoaded();
		const index = this.db.data.rssFeeds.findIndex((feed) => feed.id === id);
		if (index === -1) return false;

		this.db.data.rssFeeds[index].lastFetched = new Date().toISOString();
		await this.db.write();
		return true;
	}
}

// Create and export a singleton instance
export const lowdbService = new LowDBService();
