// Define types locally since they're not exported from benchmark.ts
type Run = {
	runId: string;
	timestamp: string;
	runType: 'PQC_Classical' | 'Quantum_Shor' | 'Quantum_Grover';
	status: 'pending' | 'running' | 'completed' | 'failed';
	algorithm?: string;
	securityParam?: string;
	iterations?: number;
	error?: string;
	notes?: string;
};

type QuantumResult = {
	resultId: string;
	runId: string;
	status: 'success' | 'error';
	exitCode?: number;
	data?: {
		// Properties directly from database schema
		status?: 'success' | 'error';
		// Shor's algorithm specific data
		n_value?: number;
		a_value?: number;
		factors?: number[] | null;
		// Grover's algorithm specific data
		input_marked_states?: string[];
		top_measured_state?: string;
		top_measured_count?: number;
		found_correct_state?: boolean;
		num_qubits?: number;
		// Common quantum metrics
		execution_time_sec?: number | null;
		circuit_depth?: number | null;
		cx_gate_count?: number | null;
		total_gate_count?: number | null;
		backend_used?: string | null;
		job_id?: string | null;
		shots?: number;
		ran_on_hardware?: boolean;
		plot_file_path?: string | null;
		error_message?: string | null;
		raw_counts?: { [key: string]: number } | null;
	};
	logs?: string[];
	plotFilePath?: string;
	jsonFilePath?: string;
	// Legacy fields for backward compatibility
	execution_time_sec?: number | null;
	circuit_depth?: number | null;
	cx_gate_count?: number | null;
	total_gate_count?: number | null;
	backend_used?: string | null;
	job_id?: string | null;
	shots?: number;
	ran_on_hardware?: boolean;
	plot_file_path?: string | null;
	error_message?: string | null;
	raw_counts?: { [key: string]: number } | null;
	n_value?: number;
	a_value?: number;
	factors?: number[] | null;
	input_marked_states?: string[];
	top_measured_state?: string;
	top_measured_count?: number;
	found_correct_state?: boolean;
	num_qubits?: number;
};

type PqcClassicalDetail = {
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
};

// Types for use in visualization components
export interface ProcessedBenchmarkData {
	runId: string;
	timestamp: string;
	algorithm: string;
	variant: string;
	securityParam?: string;
	operations: OperationMetrics[];
	// Size metrics for keys and data (in bytes) - may be present for cryptographic algorithms
	sizes?: {
		public_key_bytes?: number;
		secret_key_bytes?: number;
		signature_bytes?: number;
		shared_secret_bytes?: number;
		ciphertext_bytes?: number;
		key_bytes?: number;
		iv_bytes?: number;
	};
}

export interface OperationMetrics {
	operation: string;
	avg_ms: number;
	ops_per_sec: number;
	mem_peak_kb: number;
	mem_avg_kb: number;
	min_ms: number;
	max_ms: number;
}

export interface ProcessedQuantumData {
	runId: string;
	timestamp: string;
	algorithm: string;
	shots: number;
	execution_time_sec: number | null;
	circuit_depth: number | null;
	cx_gate_count: number | null;
	total_gate_count: number | null;
	backend_used: string | null;
	raw_counts: { [key: string]: number } | null;
	success_rate?: number;
	quantum_type: 'Quantum_Shor' | 'Quantum_Grover';
}

// Function to fetch and process all benchmark data
export async function fetchAndProcessData(): Promise<{
	benchmarkData: ProcessedBenchmarkData[];
	quantumData: ProcessedQuantumData[];
}> {
	try {
		// Log database path - should be C:\Users\brand\AppData\Roaming\pqcbenchgui4\pqc-workbench-results.json
		console.log('Database path should be in AppData/Roaming/pqcbenchgui4/');

		// Fetch all runs
		console.log('Fetching runs from database...');
		const runs = await window.databaseAPI.getAllRuns();
		console.log(`Retrieved ${runs.length} runs from database`);

		// Log run types for debugging
		const pqcRuns = runs.filter((r: Run) => r.runType === 'PQC_Classical');
		const shorRuns = runs.filter((r: Run) => r.runType === 'Quantum_Shor');
		const groverRuns = runs.filter((r: Run) => r.runType === 'Quantum_Grover');

		console.log(
			`Run types: PQC=${pqcRuns.length}, Shor=${shorRuns.length}, Grover=${groverRuns.length}`
		);

		// Fetch all PQC classical details and quantum results with error handling
		console.log('Fetching PQC classical details...');
		let pqcClassicalDetails: PqcClassicalDetail[] = [];
		try {
			pqcClassicalDetails =
				await window.databaseAPI.getAllPqcClassicalDetails();
			console.log(
				`Retrieved ${pqcClassicalDetails.length} PQC classical details`
			);
		} catch (error) {
			console.error('Error fetching PQC classical details:', error);
		}

		console.log('Fetching quantum results...');
		let quantumResults: QuantumResult[] = [];
		try {
			quantumResults = await window.databaseAPI.getAllQuantumResults();
			console.log(`Retrieved ${quantumResults.length} quantum results`);
		} catch (error) {
			console.error('Error fetching quantum results:', error);
		}

		// Process PQC classical data
		console.log('Processing PQC classical data...');
		const benchmarkData = processPqcClassicalData(runs, pqcClassicalDetails);
		console.log(`Processed ${benchmarkData.length} benchmark data points`);

		// Process quantum data
		console.log('Processing quantum data...');
		const quantumData = processQuantumData(runs, quantumResults);
		console.log(`Processed ${quantumData.length} quantum data points`);

		return { benchmarkData, quantumData };
	} catch (error) {
		console.error('Error fetching and processing data:', error);
		if (error instanceof Error) {
			console.error('Error details:', error.message, error.stack);
		}
		return { benchmarkData: [], quantumData: [] };
	}
}

// Process PQC classical benchmark data
function processPqcClassicalData(
	runs: Run[],
	pqcClassicalDetails: PqcClassicalDetail[]
): ProcessedBenchmarkData[] {
	const processedData: ProcessedBenchmarkData[] = [];
	console.log(`Processing ${pqcClassicalDetails.length} PQC classical details`);

	for (const detail of pqcClassicalDetails) {
		const run = runs.find((r) => r.runId === detail.runId);
		if (!run || run.status !== 'completed') continue;

		const operations: OperationMetrics[] = [];
		console.log(
			`Processing algorithm: ${detail.mainAlgorithm} (${detail.variant}), runId: ${detail.runId}`
		);

		// Check which operations are available in this detail
		const availableOps = [];
		if (detail.keygen) availableOps.push('keygen');
		if (detail.sign) availableOps.push('sign');
		if (detail.verify) availableOps.push('verify');
		if (detail.encaps) availableOps.push('encaps');
		if (detail.decaps) availableOps.push('decaps');
		if (detail.encryption) availableOps.push('encryption');
		if (detail.decryption) availableOps.push('decryption');
		if (detail.shared_secret) availableOps.push('shared_secret');

		console.log(`Available operations: ${availableOps.join(', ')}`);

		// Check each operation type and add if it exists
		if (detail.keygen) {
			operations.push({
				operation: 'keygen',
				...detail.keygen,
			});
		}
		if (detail.sign) {
			operations.push({
				operation: 'sign',
				...detail.sign,
			});
		}
		if (detail.verify) {
			operations.push({
				operation: 'verify',
				...detail.verify,
			});
		}
		if (detail.encaps) {
			operations.push({
				operation: 'encapsulate', // Use full name here directly
				...detail.encaps,
			});
		}
		if (detail.decaps) {
			operations.push({
				operation: 'decapsulate', // Use full name here directly
				...detail.decaps,
			});
		}
		if (detail.encryption) {
			operations.push({
				operation: 'encryption',
				...detail.encryption,
			});
		}
		if (detail.decryption) {
			operations.push({
				operation: 'decryption',
				...detail.decryption,
			});
		}
		if (detail.shared_secret) {
			operations.push({
				operation: 'shared_secret',
				...detail.shared_secret,
			});
		}

		// Log operations after creation
		console.log(`Added ${operations.length} operations to process`);
		operations.forEach((op) => {
			console.log(
				`Operation ${op.operation}: avg_ms=${op.avg_ms}, ops_per_sec=${op.ops_per_sec}, mem_peak_kb=${op.mem_peak_kb}`
			);
		});

		// Ensure we have required metrics for all operations
		operations.forEach((op) => {
			// Ensure we have required metrics for all operations
			if (op.avg_ms === undefined) {
				console.warn(`Missing avg_ms for ${op.operation}, setting default`);
				op.avg_ms = 0;
			}
			if (op.ops_per_sec === undefined) {
				console.warn(
					`Missing ops_per_sec for ${op.operation}, calculating from avg_ms`
				);
				op.ops_per_sec = op.avg_ms > 0 ? 1000 / op.avg_ms : 0;
			}
			if (op.mem_peak_kb === undefined) {
				console.warn(
					`Missing mem_peak_kb for ${op.operation}, setting default`
				);
				op.mem_peak_kb = op.mem_avg_kb || 0;
			}
			if (op.mem_avg_kb === undefined) {
				console.warn(`Missing mem_avg_kb for ${op.operation}, setting default`);
				op.mem_avg_kb = op.mem_peak_kb || 0;
			}
			if (op.min_ms === undefined) {
				console.warn(`Missing min_ms for ${op.operation}, setting to avg_ms`);
				op.min_ms = op.avg_ms;
			}
			if (op.max_ms === undefined) {
				console.warn(`Missing max_ms for ${op.operation}, setting to avg_ms`);
				op.max_ms = op.avg_ms;
			}
		});

		// Set proper variant for classical algorithms if not provided
		let variant = detail.variant;
		if (
			detail.mainAlgorithm.toLowerCase() === 'aes' &&
			(!variant || variant === 'unknown')
		) {
			variant = 'AES-256';
		}
		if (
			(detail.mainAlgorithm.toLowerCase() === 'ecdsa' ||
				detail.mainAlgorithm.toLowerCase() === 'ecdh') &&
			(!variant || variant === 'unknown')
		) {
			// Use curve information if available, otherwise default to P-256
			variant = detail.curve ? detail.curve : 'P-256';
		}

		processedData.push({
			runId: detail.runId,
			timestamp: run.timestamp,
			algorithm: detail.mainAlgorithm,
			variant: variant,
			securityParam:
				run.securityParam || getDefaultSecurityParam(detail.mainAlgorithm),
			operations,
			sizes: detail.sizes,
		});
	}

	return processedData;
}

// Helper to provide default security parameters for common algorithms
function getDefaultSecurityParam(algorithm: string): string {
	const lowerAlgo = algorithm.toLowerCase();
	if (lowerAlgo === 'aes') return '256';
	if (lowerAlgo === 'ecdsa' || lowerAlgo === 'ecdh') return 'P-256';
	if (lowerAlgo === 'rsa') return '2048';
	return '';
}

// Process quantum workload data - ensure we get any available quantum data
function processQuantumData(
	runs: Run[],
	quantumResults: QuantumResult[]
): ProcessedQuantumData[] {
	const processedData: ProcessedQuantumData[] = [];

	console.log(
		'Processing quantum data. Total runs:',
		runs.length,
		'Total quantum results:',
		quantumResults.length
	);

	// Directly check if we have any quantum results
	if (quantumResults.length === 0) {
		console.warn('No quantum results found in database!');
		return [];
	}

	// Print details about first few quantum results for debugging
	if (quantumResults.length > 0) {
		console.log(
			'Sample quantum result:',
			JSON.stringify(quantumResults[0], null, 2).substring(0, 500) + '...'
		);
	}

	// Check all quantum results, even if run is not found
	for (const result of quantumResults) {
		// Skip if result has no essential data
		if (!result || !result.resultId) {
			console.warn('Skipping invalid quantum result:', result);
			continue;
		}

		// Find corresponding run
		const run = runs.find((r) => r.runId === result.runId);

		// Log if run not found but process result anyway
		if (!run) {
			console.warn(
				`Run not found for quantum result ${result.resultId}, using default values`
			);
		}

		// Skip only if run exists and was explicitly failed (allow pending/running/completed)
		if (run && run.status === 'failed') {
			console.log('Skipping failed quantum run:', run.runId);
			continue;
		}

		// Use run info if available, otherwise use default values from result
		const timestamp = run?.timestamp || new Date().toISOString();
		const algorithm = run?.algorithm || 'Quantum Algorithm';

		// Determine run type based on run info or result data
		let runType =
			(run?.runType as 'Quantum_Shor' | 'Quantum_Grover') || 'Quantum_Shor';

		// Check if we need to infer type from the data properties
		if (!runType) {
			if (
				result.data?.factors !== undefined ||
				result.data?.n_value !== undefined
			) {
				runType = 'Quantum_Shor';
			} else if (result.data?.input_marked_states !== undefined) {
				runType = 'Quantum_Grover';
			}
		}

		// Calculate success rate for Grover's algorithm using data field if available
		let success_rate: number | undefined = undefined;

		// Extract data from the new structure with data field
		const data = result.data || {};

		// Get metrics, checking both places in result
		const execution_time_sec =
			data.execution_time_sec ?? result.execution_time_sec ?? 0;
		const circuit_depth = data.circuit_depth ?? result.circuit_depth ?? 0;
		const cx_gate_count = data.cx_gate_count ?? result.cx_gate_count ?? 0;
		const total_gate_count =
			data.total_gate_count ?? result.total_gate_count ?? 0;
		const backend_used =
			data.backend_used ?? result.backend_used ?? 'simulator';
		const shots = data.shots ?? result.shots ?? 1000;
		const raw_counts = data.raw_counts ?? result.raw_counts ?? {};

		// Calculate success rate based on result type
		if (runType === 'Quantum_Grover') {
			const found_correct_state =
				data.found_correct_state ?? result.found_correct_state;
			const top_measured_count =
				data.top_measured_count ?? result.top_measured_count;

			if (
				found_correct_state !== undefined &&
				top_measured_count !== undefined &&
				shots > 0
			) {
				success_rate = found_correct_state ? top_measured_count / shots : 0;
			}
		} else if (runType === 'Quantum_Shor') {
			const factors = data.factors ?? result.factors;

			if (factors !== null && factors && factors.length > 0) {
				success_rate = 1.0; // Found factors
			} else {
				success_rate = 0.0; // Did not find factors
			}
		}

		// Build processed data object with reasonable defaults for any null values
		const processedItem: ProcessedQuantumData = {
			runId: result.runId,
			timestamp: timestamp,
			algorithm: algorithm,
			shots: shots,
			execution_time_sec: execution_time_sec,
			circuit_depth: circuit_depth,
			cx_gate_count: cx_gate_count,
			total_gate_count: total_gate_count,
			backend_used: backend_used,
			raw_counts: raw_counts,
			success_rate: success_rate || 0,
			quantum_type: runType,
		};

		processedData.push(processedItem);
	}

	console.log('Processed quantum data items:', processedData.length);
	if (processedData.length > 0) {
		console.log('First processed quantum item:', processedData[0]);
	}

	return processedData;
}

// Calculate statistics for a given metric across multiple benchmark results
export function calculateStatistics(data: number[]): {
	mean: number;
	median: number;
	stdDev: number;
	min: number;
	max: number;
} {
	if (data.length === 0) {
		return {
			mean: 0,
			median: 0,
			stdDev: 0,
			min: 0,
			max: 0,
		};
	}

	// Sort data for median calculation
	const sortedData = [...data].sort((a, b) => a - b);

	// Calculate mean
	const sum = data.reduce((acc, value) => acc + value, 0);
	const mean = sum / data.length;

	// Calculate median
	let median: number;
	const midPoint = Math.floor(sortedData.length / 2);
	if (sortedData.length % 2 === 0) {
		median = (sortedData[midPoint - 1] + sortedData[midPoint]) / 2;
	} else {
		median = sortedData[midPoint];
	}

	// Calculate standard deviation
	const squaredDiffs = data.map((value) => Math.pow(value - mean, 2));
	const variance =
		squaredDiffs.reduce((acc, value) => acc + value, 0) / data.length;
	const stdDev = Math.sqrt(variance);

	// Min and max
	const min = sortedData[0];
	const max = sortedData[sortedData.length - 1];

	return {
		mean,
		median,
		stdDev,
		min,
		max,
	};
}

// Filter data based on selection criteria
export function filterBenchmarkData(
	data: ProcessedBenchmarkData[],
	algorithm?: string,
	timeRange?: string
): ProcessedBenchmarkData[] {
	let filteredData = [...data];

	// Filter by algorithm
	if (algorithm && algorithm !== 'all') {
		filteredData = filteredData.filter(
			(item) => item.algorithm.toLowerCase() === algorithm.toLowerCase()
		);
	}

	// Filter by time range
	if (timeRange) {
		const now = new Date();
		let cutoffDate: Date;

		switch (timeRange) {
			case 'day':
				cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				break;
			case 'week':
				cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
			case 'month':
				cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				break;
			default:
				// 'all' or any other value, no time filtering
				return filteredData;
		}

		filteredData = filteredData.filter((item) => {
			const itemDate = new Date(item.timestamp);
			return itemDate >= cutoffDate;
		});
	}

	return filteredData;
}

// Filter quantum data based on selection criteria
export function filterQuantumData(
	data: ProcessedQuantumData[],
	algorithm?: string,
	timeRange?: string
): ProcessedQuantumData[] {
	let filteredData = [...data];
	console.log(
		`Filtering quantum data: ${data.length} items, algorithm=${algorithm}, timeRange=${timeRange}`
	);

	// Filter by algorithm
	if (algorithm && algorithm !== 'all') {
		if (algorithm === 'shor') {
			// Filter for Shor's algorithm
			filteredData = filteredData.filter(
				(item) => item.quantum_type === 'Quantum_Shor'
			);
			console.log(
				`Filtered to ${filteredData.length} Shor's algorithm results`
			);
		} else if (algorithm === 'grover') {
			// Filter for Grover's algorithm
			filteredData = filteredData.filter(
				(item) => item.quantum_type === 'Quantum_Grover'
			);
			console.log(
				`Filtered to ${filteredData.length} Grover's algorithm results`
			);
		} else {
			// Original behavior - filter by algorithm name
			filteredData = filteredData.filter(
				(item) => item.algorithm.toLowerCase() === algorithm.toLowerCase()
			);
		}
	}

	// Filter by time range
	if (timeRange) {
		const now = new Date();
		let cutoffDate: Date;

		switch (timeRange) {
			case 'day':
				cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				break;
			case 'week':
				cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
			case 'month':
				cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				break;
			default:
				// 'all' or any other value, no time filtering
				return filteredData;
		}

		filteredData = filteredData.filter((item) => {
			const itemDate = new Date(item.timestamp);
			return itemDate >= cutoffDate;
		});
	}

	console.log(`Final filtered quantum data: ${filteredData.length} items`);
	return filteredData;
}
