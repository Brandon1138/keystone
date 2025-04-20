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
		qpu_time_sec?: number | null;
		// Noise metrics
		gate_error?: number | null;
		readout_error?: number | null;
		t1_time?: number | null;
		t2_time?: number | null;
		quantum_volume?: number | null;
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
	qpu_time_sec?: number | null;
	// Noise metrics legacy fields
	gate_error?: number | null;
	readout_error?: number | null;
	t1_time?: number | null;
	t2_time?: number | null;
	quantum_volume?: number | null;
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
	qpu_time_sec: number | null;
	circuit_depth: number | null;
	cx_gate_count: number | null;
	total_gate_count: number | null;
	backend_used: string | null;
	raw_counts: { [key: string]: number } | null;
	success_rate?: number;
	confidence?: number;
	quantum_type: 'Quantum_Shor' | 'Quantum_Grover';
	plot_file_path?: string | null;
	// Noise and error metrics
	gate_error?: number | null;
	readout_error?: number | null;
	t1_time?: number | null;
	t2_time?: number | null;
	quantum_volume?: number | null;
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

// Fast modular exponentiation helper
function modExp(base: number, exp: number, mod: number): number {
	let result = 1;
	let b = base % mod;
	let e = exp;
	while (e > 0) {
		if (e & 1) result = (result * b) % mod;
		b = (b * b) % mod;
		e >>= 1;
	}
	return result;
}

// Process quantum workload data - ensure we get any available quantum data
function processQuantumData(
	runs: Run[],
	quantumResults: QuantumResult[]
): ProcessedQuantumData[] {
	const processed: ProcessedQuantumData[] = [];

	for (const run of runs) {
		if (run.runType.startsWith('Quantum_')) {
			const result = quantumResults.find((res) => res.runId === run.runId);
			if (result) {
				// Extract fields from result, checking both direct props and nested data structure
				// This fixes our noise metrics extraction
				const extractField = <T>(fieldName: string): T | null => {
					// Check if field exists directly on result
					if (result && typeof result === 'object' && fieldName in result) {
						const value = (result as any)[fieldName] as T;
						if (
							fieldName.includes('error') ||
							fieldName.includes('time') ||
							fieldName.includes('volume')
						) {
							console.log(
								`Found ${fieldName} directly on result: ${value} (type: ${typeof value})`
							);
						}
						return value;
					}
					// Check if field exists in result.data
					if (
						result &&
						result.data &&
						typeof result.data === 'object' &&
						fieldName in result.data
					) {
						const value = (result.data as any)[fieldName] as T;
						if (
							fieldName.includes('error') ||
							fieldName.includes('time') ||
							fieldName.includes('volume')
						) {
							console.log(
								`Found ${fieldName} in result.data: ${value} (type: ${typeof value})`
							);
						}
						return value;
					}

					// If we get here for noise metrics, log that it wasn't found
					if (
						fieldName.includes('error') ||
						fieldName.includes('time') ||
						fieldName.includes('volume')
					) {
						console.log(`Warning: ${fieldName} not found in result`);
					}
					return null;
				};

				const execution_time_sec = extractField<number>('execution_time_sec');
				const circuit_depth = extractField<number>('circuit_depth');
				const cx_gate_count = extractField<number>('cx_gate_count');
				const total_gate_count = extractField<number>('total_gate_count');
				const backend_used = extractField<string>('backend_used');
				const shots = extractField<number>('shots') || 0;
				const raw_counts = extractField<{ [key: string]: number }>(
					'raw_counts'
				);
				const plot_file_path = extractField<string>('plot_file_path');
				const qpu_time_sec = extractField<number>('qpu_time_sec');

				// Extract noise metrics
				const gate_error = extractField<number>('gate_error');
				const readout_error = extractField<number>('readout_error');
				const t1_time = extractField<number>('t1_time');
				const t2_time = extractField<number>('t2_time');
				const quantum_volume = extractField<number>('quantum_volume');

				// Debug log noise metrics
				console.log(`Processing quantum data for ${run.runId}:`, {
					backend_used,
					gate_error,
					readout_error,
					t1_time,
					t2_time,
					quantum_volume,
				});

				// Calculate success rate and confidence
				let success_rate = 0;
				let confidence = 0;

				// Map algorithm types to ensure compatibility
				let processedAlgorithm = run.algorithm || 'Unknown';
				if (run.runType === 'Quantum_Shor') {
					processedAlgorithm = 'Shor';
				} else if (run.runType === 'Quantum_Grover') {
					processedAlgorithm = 'Grover';
				}

				// Process raw counts to extract metrics
				if (raw_counts && Object.keys(raw_counts).length > 0) {
					if (run.runType === 'Quantum_Shor') {
						// For Shor's algorithm, check if factorization was successful
						const status = extractField<string>('status');
						if (status === 'success') {
							success_rate = 1.0; // If the algorithm successfully found factors
						} else {
							success_rate = 0.0;
						}

						// For Shor, confidence calculation depends on whether this was run on a simulator or hardware
						const isSimulator =
							backend_used?.toLowerCase().includes('simulator') ||
							backend_used?.toLowerCase().includes('sim');

						// Parse N and a from algorithm string (e.g. 'Shor N=15 a=7')
						const algoStr = processedAlgorithm || '';
						const N = parseInt(
							algoStr.split('N=')[1]?.split(/\D/)[0] || '0',
							10
						);
						const aVal = parseInt(
							algoStr.split('a=')[1]?.split(/\D/)[0] || '0',
							10
						);

						// Compute period r such that a^r mod N = 1
						let r = 1;
						while (r < N && modExp(aVal, r, N) !== 1) {
							r++;
						}

						let correctCount = 0;
						const totalShots = Object.values(raw_counts).reduce(
							(sum, count) => sum + (count as number),
							0
						);

						if (r > 0 && Object.entries(raw_counts).length > 0) {
							const entries = Object.entries(raw_counts);
							const bitLen = entries[0][0].length;
							const Q = 1 << bitLen;

							if (isSimulator) {
								// For simulators, the distribution already represents the correct solution
								// Sum up all counts as correctCount
								correctCount = totalShots;
							} else {
								// For hardware results, use tolerance-based peak detection
								// For Shor with period r, we expect peaks at positions j*Q/r where j=0,1,2,...,r-1
								for (const [bit, cnt] of entries) {
									const v = parseInt(bit, 2);
									if (isNaN(v)) continue;

									// For each possible j value (0 to r-1)
									for (let j = 0; j < r; j++) {
										// Calculate expected peak position
										const expectedPos = Math.round((j * Q) / r);

										// Allow for more measurement noise by checking if v is close to an expected peak
										// Using a wider tolerance to capture the full width of peaks
										if (
											Math.abs(v - expectedPos) <=
											Math.max(3, Math.floor(Q / (r * 10)))
										) {
											correctCount += cnt as number;
											break; // Count this measurement once
										}
									}
								}
							}
						}

						// Calculate confidence based on backend type
						if (isSimulator) {
							// For simulators, use the stored shots value
							confidence = shots > 0 ? correctCount / shots : 0;
						} else {
							// For hardware, use the actual sum of all raw counts as the denominator
							confidence = totalShots > 0 ? correctCount / totalShots : 0;
						}
					} else if (run.runType === 'Quantum_Grover') {
						const isSimulator =
							backend_used?.toLowerCase().includes('simulator') ||
							backend_used?.toLowerCase().includes('sim');
						if (isSimulator) {
							// For simulators, assume perfect confidence
							confidence = shots > 0 ? 1.0 : 0;
							// Ensure success_rate is also set to 100% on simulator
							success_rate = shots > 0 ? 1.0 : 0;
						} else {
							// For Grover's algorithm with Qiskit
							const found_correct_state =
								extractField<boolean>('found_correct_state') || false;
							success_rate = found_correct_state ? 1.0 : 0.0;

							// Get the marked states from the result
							const markedStates =
								extractField<string[]>('input_marked_states') || [];

							// Extract top-measured data as a fallback
							const topMeasuredState =
								extractField<string>('top_measured_state');
							const topMeasuredCount =
								extractField<number>('top_measured_count') || 0;

							// Log marked states for debugging
							console.log(
								`Grover marked states for ${run.runId}:`,
								markedStates
							);
							console.log(`Grover algorithm info:`, run.algorithm);
							console.log(`Grover raw counts for ${run.runId}:`, raw_counts);
							console.log(`Grover backend used: ${backend_used}`);

							// For Grover, confidence is based on the ratio of marked states found
							const totalShots = Object.values(raw_counts || {}).reduce(
								(sum, count) => sum + (count as number),
								0
							);

							console.log(`Grover totalShots: ${totalShots}`);

							if (markedStates && markedStates.length > 0 && totalShots > 0) {
								// Sum counts for all marked states
								let correctCount = 0;
								console.log(
									`Looking for ${markedStates.length} marked states in raw counts:`,
									raw_counts
								);

								markedStates.forEach((state) => {
									// Try exact match first
									if (raw_counts && raw_counts[state]) {
										correctCount += raw_counts[state];
										console.log(
											`Found exact match for marked state ${state}: ${raw_counts[state]} counts`
										);
									} else {
										// If exact match not found, try looking for similar states (with potential bit flips)
										// This handles noise in real quantum hardware
										if (raw_counts) {
											Object.entries(raw_counts).forEach(
												([measuredState, count]) => {
													const hamming = countBitDifferences(
														state,
														measuredState
													);
													// For hardware results, allow for bit-flip errors by accepting states with small Hamming distance
													const maxHammingAllowed = Math.min(
														Math.max(1, Math.floor(state.length / 5)),
														3 // Cap at 3 bit flips maximum to avoid false positives
													);

													if (hamming <= maxHammingAllowed) {
														correctCount += count as number;
														console.log(
															`Found match for marked state ${state}: ${measuredState} with ${count} counts (Hamming distance: ${hamming})`
														);
													}
												}
											);
										}
									}
								});

								// Calculate confidence based on the actual measurement results
								confidence = correctCount / totalShots;

								console.log(
									`Grover confidence calculation: ${correctCount} marked state counts out of ${totalShots} total shots = ${confidence.toFixed(
										4
									)} (${(confidence * 100).toFixed(1)}%)`
								);
							} else if (topMeasuredCount > 0 && shots > 0) {
								console.log(
									`Using top_measured_count for Grover confidence: ${topMeasuredCount}/${shots}`
								);
								confidence = topMeasuredCount / shots;
							} else if (raw_counts && Object.keys(raw_counts).length > 0) {
								// Raw counts fallback: pick the highest-count state
								const sortedCounts = Object.entries(raw_counts).sort(
									(a, b) => (b[1] as number) - (a[1] as number)
								);

								if (sortedCounts.length > 0) {
									confidence = (sortedCounts[0][1] as number) / shots;
									console.log(
										`Using top-measured state ${
											sortedCounts[0][0]
										} for Grover confidence: ${confidence.toFixed(4)} (${(
											confidence * 100
										).toFixed(1)}%)`
									);
								} else {
									console.log(
										`No measurement data available for Grover confidence calculation`
									);
									confidence = 0;
								}
							} else {
								console.log(
									`No measurement data available for Grover confidence calculation`
								);
								confidence = 0;
							}
						}
					}
				}

				processed.push({
					runId: run.runId,
					timestamp: run.timestamp,
					algorithm: processedAlgorithm,
					quantum_type: run.runType as 'Quantum_Shor' | 'Quantum_Grover',
					shots: shots || 0,
					execution_time_sec: execution_time_sec || null,
					qpu_time_sec: qpu_time_sec || null,
					circuit_depth: circuit_depth || null,
					cx_gate_count: cx_gate_count || null,
					total_gate_count: total_gate_count || null,
					backend_used: backend_used || null,
					raw_counts: raw_counts || null,
					success_rate,
					confidence,
					plot_file_path: plot_file_path || null,
					// Add noise metrics if available
					gate_error: gate_error || null,
					readout_error: readout_error || null,
					t1_time: t1_time || null,
					t2_time: t2_time || null,
					quantum_volume: quantum_volume || null,
				});
			}
		}
	}

	return processed;
}

// Helper function to count bit differences between two binary strings
function countBitDifferences(str1: string, str2: string): number {
	// If strings are different lengths, focus on rightmost bits
	const len1 = str1.length;
	const len2 = str2.length;
	const minLen = Math.min(len1, len2);
	const maxLen = Math.max(len1, len2);

	// Get the rightmost minLen bits from both strings
	const rightStr1 = str1.slice(len1 - minLen);
	const rightStr2 = str2.slice(len2 - minLen);

	// Count differences in the common bits
	let differences = 0;
	for (let i = 0; i < minLen; i++) {
		if (rightStr1[i] !== rightStr2[i]) {
			differences++;
		}
	}

	// Add differences for the extra bits (all counted as differences)
	differences += maxLen - minLen;

	return differences;
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
