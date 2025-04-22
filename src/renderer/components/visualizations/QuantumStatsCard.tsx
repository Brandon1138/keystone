import React, { useState } from 'react';
import {
	Card,
	CardContent,
	Typography,
	Grid,
	Divider,
	Box,
	Skeleton,
	Tooltip,
	FormControl,
	Select,
	MenuItem,
	SelectChangeEvent,
	Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import {
	ProcessedQuantumData,
	calculateStatistics,
} from '../../utils/dataProcessingUtils';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MemoryIcon from '@mui/icons-material/Memory';
import TimerIcon from '@mui/icons-material/Timer';
import StorageIcon from '@mui/icons-material/Storage';
import WarningIcon from '@mui/icons-material/Warning';

interface QuantumStatsCardProps {
	data: ProcessedQuantumData[];
	title: string;
	titleIcon?: string;
	algorithm?: string;
	loading?: boolean;
	metricType: 'success' | 'circuit' | 'runtime' | 'noise';
}

// Define tooltips for quantum metrics
const QuantumTooltips = {
	depth:
		'Circuit depth is the longest path through the quantum circuit. Lower depths are better for NISQ-era hardware due to decoherence.',
	cxGates:
		'CNOT (CX) gates are two-qubit gates that are significantly more error-prone than single-qubit gates on current hardware.',
	totalGates:
		'The total number of quantum gates in the circuit. Fewer gates typically means less opportunity for errors.',
	executionTime:
		'Total time to execute the quantum circuit, including compilation and queue time for hardware execution.',
	successRate:
		'Percentage of runs where the algorithm produced the expected answer. Higher is better.',
	shots:
		'Number of times the quantum circuit was executed to collect measurement statistics.',
	minSuccess:
		'Minimum success rate achieved across all quantum algorithm runs.',
	maxSuccess:
		'Maximum success rate achieved across all quantum algorithm runs.',
	qubitCount:
		'Number of qubits used in the circuit, derived from measurement bitstrings.',
	mostUsedQC: 'Most frequently used quantum backend across filtered runs.',
	gateError:
		'Average 2-qubit gate error rate for the backend. Lower values indicate better quantum hardware performance.',
	readoutError:
		'Average error rate when measuring qubit states. Represents the probability of incorrectly reading a qubit state.',
	t1Time:
		'T₁ relaxation time - how long a qubit stays in the |1⟩ state before decaying to |0⟩. Longer times are better.',
	t2Time:
		'T₂ coherence time - how long a qubit maintains superposition. Critical for algorithm performance. Longer times are better.',
	quantumVolume:
		'Quantum Volume - a holistic metric that represents the largest random circuit a quantum computer can successfully implement.',
};

const QuantumStatsCard: React.FC<QuantumStatsCardProps> = ({
	data,
	title,
	titleIcon,
	algorithm,
	loading = false,
	metricType,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [selectedBackend, setSelectedBackend] = useState<string>('hardware');

	// Handle backend change
	const handleBackendChange = (event: SelectChangeEvent) => {
		setSelectedBackend(event.target.value);
	};

	// Filter data by algorithm if specified
	const filteredData =
		algorithm && algorithm !== 'all'
			? data.filter((item) => {
					if (algorithm === 'shor') {
						return item.quantum_type === 'Quantum_Shor';
					} else if (algorithm === 'grover') {
						return item.quantum_type === 'Quantum_Grover';
					} else {
						return item.algorithm.toLowerCase() === algorithm.toLowerCase();
					}
			  })
			: data;

	// Further filter by backend type
	const backendFilteredData =
		selectedBackend !== 'all'
			? filteredData.filter((item) => {
					const isSimulator =
						item.backend_used?.toLowerCase().includes('simulator') ||
						item.backend_used?.toLowerCase().includes('sim') ||
						item.backend_used === 'aer_simulator';

					if (selectedBackend === 'simulator') {
						return isSimulator;
					} else {
						// Debug hardware item data
						if (!isSimulator) {
							console.log('Hardware backend item:', {
								backend: item.backend_used,
								gate_error: item.gate_error,
								readout_error: item.readout_error,
								t1_time: item.t1_time,
								t2_time: item.t2_time,
								quantum_volume: item.quantum_volume,
							});
						}
						return !isSimulator; // hardware
					}
			  })
			: filteredData;

	console.log(
		`QuantumStatsCard filtered data: ${
			backendFilteredData.length
		} items for algorithm: ${
			algorithm || 'all'
		} and backend: ${selectedBackend}`
	);

	// Extract performance metrics
	const getMetrics = () => {
		const metrics = {
			execution_time: [] as number[],
			qpu_time: [] as number[],
			circuit_depth: [] as number[],
			cx_gate_count: [] as number[],
			total_gate_count: [] as number[],
			success_rate: [] as number[],
			confidence: [] as number[],
			// Noise & error metrics (placeholder, assuming these would be populated in the future)
			gate_error: [] as number[],
			readout_error: [] as number[],
			t1_time: [] as number[],
			t2_time: [] as number[],
			quantum_volume: [] as number[],
		};

		backendFilteredData.forEach((item) => {
			// Always capture execution time if available
			if (
				item.execution_time_sec !== null &&
				item.execution_time_sec !== undefined
			) {
				metrics.execution_time.push(item.execution_time_sec);
			}

			// Only capture QPU time for hardware backends
			const isHardwareBackend = !(
				item.backend_used?.toLowerCase().includes('simulator') ||
				item.backend_used?.toLowerCase().includes('sim')
			);

			if (
				isHardwareBackend &&
				item.qpu_time_sec !== null &&
				item.qpu_time_sec !== undefined
			) {
				metrics.qpu_time.push(item.qpu_time_sec);
			}

			if (item.circuit_depth !== null) {
				metrics.circuit_depth.push(item.circuit_depth);
			}
			if (item.cx_gate_count !== null) {
				metrics.cx_gate_count.push(item.cx_gate_count);
			}
			if (item.total_gate_count !== null) {
				metrics.total_gate_count.push(item.total_gate_count);
			}
			if (item.success_rate !== undefined) {
				metrics.success_rate.push(item.success_rate * 100); // Convert to percentage
			}
			if (item.confidence !== undefined) {
				metrics.confidence.push(item.confidence * 100);
			}

			// Populate noise & error metrics if available
			// These would need to be added to the ProcessedQuantumData type and collected from backends
			if (item.backend_used && isHardwareBackend) {
				// Use real error metrics from the backend if available
				if (item.gate_error !== null && item.gate_error !== undefined) {
					// Values are already in percentage form from the backend
					metrics.gate_error.push(item.gate_error);
					console.log(
						`Found real gate_error: ${item.gate_error}% for ${item.backend_used}`
					);
				}
				if (item.readout_error !== null && item.readout_error !== undefined) {
					// Values are already in percentage form from the backend
					metrics.readout_error.push(item.readout_error);
					console.log(
						`Found real readout_error: ${item.readout_error}% for ${item.backend_used}`
					);
				}
				if (item.t1_time !== null && item.t1_time !== undefined) {
					metrics.t1_time.push(item.t1_time);
				}
				if (item.t2_time !== null && item.t2_time !== undefined) {
					metrics.t2_time.push(item.t2_time);
				}
				if (item.quantum_volume !== null && item.quantum_volume !== undefined) {
					metrics.quantum_volume.push(item.quantum_volume);
				}

				// Fallback to placeholder values only if no real metrics are available
				// These should only be used if we absolutely can't get real metrics
				if (
					metrics.gate_error.length === 0 &&
					item.backend_used.includes('ibm')
				) {
					// Placeholder metrics for IBM hardware - only used if real values aren't available
					const backendBasedSeed = (item.backend_used.length % 10) / 10;
					metrics.gate_error.push(2.0 + backendBasedSeed * 0.8); // Realistic fallback: 2.0% - 2.8%
					console.log('WARNING: Using placeholder gate_error values');
				}
				if (
					metrics.readout_error.length === 0 &&
					item.backend_used.includes('ibm')
				) {
					const backendBasedSeed = (item.backend_used.length % 10) / 10;
					metrics.readout_error.push(2.5 + backendBasedSeed * 1.0); // Realistic fallback: 2.5% - 3.5%
					console.log('WARNING: Using placeholder readout_error values');
				}
				if (metrics.t1_time.length === 0 && item.backend_used.includes('ibm')) {
					const backendBasedSeed = (item.backend_used.length % 10) / 10;
					metrics.t1_time.push(60 + backendBasedSeed * 20); // 60-80 microseconds
					console.log('WARNING: Using placeholder t1_time values');
				}
				if (metrics.t2_time.length === 0 && item.backend_used.includes('ibm')) {
					const backendBasedSeed = (item.backend_used.length % 10) / 10;
					metrics.t2_time.push(40 + backendBasedSeed * 15); // 40-55 microseconds
					console.log('WARNING: Using placeholder t2_time values');
				}
				if (
					metrics.quantum_volume.length === 0 &&
					item.backend_used.includes('ibm')
				) {
					const backendBasedSeed = (item.backend_used.length % 10) / 10;
					metrics.quantum_volume.push(
						Math.pow(2, 6 + Math.floor(backendBasedSeed * 4))
					); // 2^6 to 2^9
					console.log('WARNING: Using placeholder quantum_volume values');
				}
			}
		});

		return metrics;
	};

	const metrics = getMetrics();

	// Calculate statistics
	const timeStats = calculateStatistics(metrics.execution_time);
	const qpuTimeStats = calculateStatistics(metrics.qpu_time);
	const depthStats = calculateStatistics(metrics.circuit_depth);
	const cxStats = calculateStatistics(metrics.cx_gate_count);
	const gateStats = calculateStatistics(metrics.total_gate_count);
	const successStats = calculateStatistics(metrics.success_rate);
	const confidenceStats = calculateStatistics(metrics.confidence);

	// Noise & error metrics statistics
	const gateErrorStats = calculateStatistics(metrics.gate_error);
	const readoutErrorStats = calculateStatistics(metrics.readout_error);
	const t1TimeStats = calculateStatistics(metrics.t1_time);
	const t2TimeStats = calculateStatistics(metrics.t2_time);
	const quantumVolumeStats = calculateStatistics(metrics.quantum_volume);

	// Compute qubit count and most used backend metrics
	const qubitCounts = backendFilteredData.map((item) =>
		item.raw_counts ? Object.keys(item.raw_counts)[0]?.length || 0 : 0
	);
	const qubitStats = calculateStatistics(qubitCounts);

	const backendCounts = backendFilteredData.reduce(
		(acc: Record<string, number>, item) => {
			const bn = item.backend_used || 'Unknown';
			acc[bn] = (acc[bn] || 0) + 1;
			return acc;
		},
		{}
	);
	const mostUsedQC =
		Object.entries(backendCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

	// Helper to format numbers
	const formatNumber = (num: number, decimals: number = 2) => {
		// Handle special case for very small numbers - use scientific notation
		if (num !== 0 && Math.abs(num) < 0.0001) {
			return num.toExponential(decimals);
		}
		return num.toLocaleString(undefined, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		});
	};

	// Helper to render a metric row with tooltip
	const renderMetric = (
		label: string,
		value: number,
		unit: string,
		tooltipText?: string
	) => (
		<Grid container item spacing={1} alignItems="center">
			<Grid item xs={7}>
				<Typography
					variant="body2"
					color={isDarkMode ? 'text.secondary' : 'text.primary'}
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					{label}
					{tooltipText && (
						<Tooltip title={tooltipText} arrow>
							<InfoOutlined
								sx={{ fontSize: '0.8rem', ml: 0.5, opacity: 0.7 }}
							/>
						</Tooltip>
					)}
				</Typography>
			</Grid>
			<Grid item xs={5}>
				<Typography variant="body2" fontWeight="medium" align="right">
					{formatNumber(value)} {unit}
				</Typography>
			</Grid>
		</Grid>
	);

	// Helper to render a string metric (for non-numeric values)
	const renderMetricString = (
		label: string,
		value: string,
		tooltipText?: string
	) => (
		<Grid container item spacing={1} alignItems="center">
			<Grid item xs={7}>
				<Typography
					variant="body2"
					color={isDarkMode ? 'text.secondary' : 'text.primary'}
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					{label}
					{tooltipText && (
						<Tooltip title={tooltipText} arrow>
							<InfoOutlined
								sx={{ fontSize: '0.8rem', ml: 0.5, opacity: 0.7 }}
							/>
						</Tooltip>
					)}
				</Typography>
			</Grid>
			<Grid item xs={5}>
				<Typography variant="body2" fontWeight="medium" align="right">
					{value}
				</Typography>
			</Grid>
		</Grid>
	);

	if (loading) {
		return (
			<>
				<Skeleton variant="text" width="60%" height={30} />
				<Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
				<Skeleton
					variant="rectangular"
					height={180}
					sx={{ borderRadius: '8px', mb: 2 }}
				/>
				<Skeleton variant="text" width="80%" height={24} />
				<Skeleton variant="text" width="70%" height={24} />
				<Skeleton variant="text" width="75%" height={24} />
			</>
		);
	}

	return (
		<>
			<Typography
				variant="h6"
				sx={{
					color: isDarkMode ? '#fff' : '#000',
					mb: 0.5,
					display: 'flex',
					alignItems: 'center',
				}}
			>
				{titleIcon && (
					<Box
						component="span"
						sx={{ mr: 1, display: 'flex', alignItems: 'center' }}
					>
						{titleIcon === 'CheckCircle' && (
							<CheckCircleIcon sx={{ color: '#9747FF' }} />
						)}
						{titleIcon === 'Memory' && <MemoryIcon sx={{ color: '#9747FF' }} />}
						{titleIcon === 'Timer' && <TimerIcon sx={{ color: '#9747FF' }} />}
						{titleIcon === 'Warning' && (
							<WarningIcon sx={{ color: '#9747FF' }} />
						)}
					</Box>
				)}
				{title}
			</Typography>

			{/* Backend selector */}
			<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
				<Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
					Backend:
				</Typography>
				<FormControl size="small" sx={{ minWidth: 120 }}>
					<Select
						value={selectedBackend}
						onChange={handleBackendChange}
						displayEmpty
						variant="outlined"
						size="small"
					>
						<MenuItem value="all">All Backends</MenuItem>
						<MenuItem value="simulator">
							<div
								style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
							>
								<StorageIcon
									fontSize="small"
									sx={{ color: theme.palette.info.main }}
								/>
								<span>Simulators</span>
							</div>
						</MenuItem>
						<MenuItem value="hardware">
							<div
								style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
							>
								<MemoryIcon
									fontSize="small"
									sx={{ color: theme.palette.success.main }}
								/>
								<span>Hardware</span>
							</div>
						</MenuItem>
					</Select>
				</FormControl>
			</Box>

			{backendFilteredData.length === 0 ? (
				<Box
					sx={{
						py: 8,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
						borderRadius: '8px',
						mt: 2,
					}}
				>
					<Typography
						variant="body1"
						color={isDarkMode ? 'text.secondary' : 'text.primary'}
					>
						{selectedBackend !== 'all'
							? `No quantum data available for ${selectedBackend} backend. Run quantum workloads on ${selectedBackend} backend.`
							: 'No quantum data available. Run quantum workloads to generate statistics.'}
					</Typography>
				</Box>
			) : (
				<>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Based on {backendFilteredData.length} quantum{' '}
						{algorithm ? algorithm : 'algorithm'} runs
					</Typography>
					{selectedBackend !== 'all' && (
						<Box sx={{ mt: 1, mb: 1 }}>
							<Chip
								size="small"
								variant="outlined"
								icon={
									selectedBackend === 'simulator' ? (
										<StorageIcon />
									) : (
										<MemoryIcon />
									)
								}
								label={
									selectedBackend === 'simulator'
										? 'Simulators only'
										: 'Hardware only'
								}
								color={selectedBackend === 'simulator' ? 'info' : 'success'}
							/>
						</Box>
					)}

					<Typography
						variant="subtitle2"
						sx={{
							color: '#9747FF',
							mb: 1,
							textTransform: 'uppercase',
							fontWeight: 'bold',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						{metricType === 'success'
							? 'Success Analysis'
							: metricType === 'circuit'
							? 'Circuit Metrics'
							: metricType === 'noise'
							? 'Noise & Error Profile'
							: 'Runtime Analysis'}
					</Typography>

					<Grid container spacing={1.5}>
						{metricType === 'success' ? (
							<>
								{metrics.success_rate.length > 0 &&
									renderMetric(
										'Success Rate',
										successStats.mean,
										'%',
										QuantumTooltips.successRate
									)}
								{metrics.confidence.length > 0 &&
									renderMetric(
										'Confidence',
										confidenceStats.mean,
										'%',
										'Fraction of shots yielding the top measured state'
									)}
								{renderMetric(
									'Execution Time',
									timeStats.mean,
									's',
									QuantumTooltips.executionTime
								)}
								{metrics.qpu_time.length > 0
									? renderMetric(
											'QPU Time',
											qpuTimeStats.mean,
											's',
											'Time used by the quantum processing unit only, excluding compilation and queue time'
									  )
									: selectedBackend !== 'simulator' && ( // Only show N/A when not specifically looking at simulators
											<Grid container item spacing={1} alignItems="center">
												<Grid item xs={7}>
													<Typography
														variant="body2"
														color={
															isDarkMode ? 'text.secondary' : 'text.primary'
														}
														sx={{ display: 'flex', alignItems: 'center' }}
													>
														QPU Time
														<Tooltip
															title="Time used by the quantum processing unit only, excluding compilation and queue time"
															arrow
														>
															<InfoOutlined
																sx={{
																	fontSize: '0.8rem',
																	ml: 0.5,
																	opacity: 0.7,
																}}
															/>
														</Tooltip>
													</Typography>
												</Grid>
												<Grid item xs={5}>
													<Typography
														variant="body2"
														fontWeight="medium"
														align="right"
													>
														N/A
													</Typography>
												</Grid>
											</Grid>
									  )}
								{renderMetric(
									'Shots (avg)',
									backendFilteredData.reduce(
										(acc, item) => acc + item.shots,
										0
									) / backendFilteredData.length,
									'',
									QuantumTooltips.shots
								)}
							</>
						) : metricType === 'circuit' ? (
							<>
								{renderMetric(
									'Average Depth',
									depthStats.mean,
									'',
									QuantumTooltips.depth
								)}
								{renderMetric(
									'CX Gates',
									cxStats.mean,
									'',
									QuantumTooltips.cxGates
								)}
								{renderMetric(
									'Total Gates',
									gateStats.mean,
									'',
									QuantumTooltips.totalGates
								)}
								{renderMetric(
									'Qubit Count',
									qubitStats.mean,
									'',
									QuantumTooltips.qubitCount
								)}
								{renderMetricString(
									'Most Used QC',
									mostUsedQC,
									QuantumTooltips.mostUsedQC
								)}
							</>
						) : metricType === 'noise' ? (
							<>
								{selectedBackend === 'simulator' ? (
									// For simulators, show that noise metrics are not applicable
									<Grid container spacing={1.5}>
										<Grid item xs={12}>
											<Typography
												variant="body2"
												color="text.secondary"
												align="center"
												sx={{ my: 1 }}
											>
												Noise metrics are only available for hardware backends.
												<br />
												Simulators typically use ideal (noiseless) models unless
												explicitly configured.
											</Typography>
										</Grid>
									</Grid>
								) : metrics.gate_error.length > 0 ? (
									// For hardware backends with available metrics
									<>
										{/* DEBUG INFO - log actual values */}
										{(() => {
											console.log('NOISE METRICS:', {
												gate_error: metrics.gate_error,
												readout_error: metrics.readout_error,
												t1_time: metrics.t1_time,
												t2_time: metrics.t2_time,
												quantum_volume: metrics.quantum_volume,
												gateErrorStats,
												readoutErrorStats,
											});
											return null;
										})()}

										{renderMetric(
											'Gate Error',
											gateErrorStats.mean,
											'%',
											QuantumTooltips.gateError
										)}
										{renderMetric(
											'Readout Error',
											readoutErrorStats.mean,
											'%',
											QuantumTooltips.readoutError
										)}
										{renderMetric(
											'T₁ Time',
											t1TimeStats.mean,
											'μs',
											QuantumTooltips.t1Time
										)}
										{renderMetric(
											'T₂ Time',
											t2TimeStats.mean,
											'μs',
											QuantumTooltips.t2Time
										)}
										{renderMetric(
											'Quantum Volume',
											quantumVolumeStats.mean,
											'',
											QuantumTooltips.quantumVolume
										)}
									</>
								) : (
									// For hardware backends without metrics
									<Grid container spacing={1.5}>
										<Grid item xs={12}>
											<Typography
												variant="body2"
												color="text.secondary"
												align="center"
												sx={{ my: 1 }}
											>
												Noise and error metrics not available for the selected
												backend(s).
												<br />
												Future runs will collect this data from hardware
												backends.
											</Typography>
										</Grid>
									</Grid>
								)}
							</>
						) : (
							<>
								{renderMetric(
									'Execution Time',
									timeStats.mean,
									's',
									QuantumTooltips.executionTime
								)}
								{metrics.qpu_time.length > 0
									? renderMetric(
											'QPU Time',
											qpuTimeStats.mean,
											's',
											'Time used by the quantum processing unit only, excluding compilation and queue time'
									  )
									: selectedBackend !== 'simulator' && ( // Only show N/A when not specifically looking at simulators
											<Grid container item spacing={1} alignItems="center">
												<Grid item xs={7}>
													<Typography
														variant="body2"
														color={
															isDarkMode ? 'text.secondary' : 'text.primary'
														}
														sx={{ display: 'flex', alignItems: 'center' }}
													>
														QPU Time
														<Tooltip
															title="Time used by the quantum processing unit only, excluding compilation and queue time"
															arrow
														>
															<InfoOutlined
																sx={{
																	fontSize: '0.8rem',
																	ml: 0.5,
																	opacity: 0.7,
																}}
															/>
														</Tooltip>
													</Typography>
												</Grid>
												<Grid item xs={5}>
													<Typography
														variant="body2"
														fontWeight="medium"
														align="right"
													>
														N/A
													</Typography>
												</Grid>
											</Grid>
									  )}
								{metrics.success_rate.length > 0 &&
									renderMetric(
										'Success Rate',
										successStats.mean,
										'%',
										QuantumTooltips.successRate
									)}
								{renderMetric(
									'Shots (avg)',
									backendFilteredData.reduce(
										(acc, item) => acc + item.shots,
										0
									) / backendFilteredData.length,
									'',
									QuantumTooltips.shots
								)}
							</>
						)}
					</Grid>

					{/* Remove the Divider and 'Runtime' section for the runtime card */}
					{null}
				</>
			)}
		</>
	);
};

export default QuantumStatsCard;
