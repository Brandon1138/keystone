import React from 'react';
import {
	Card,
	CardContent,
	Typography,
	Grid,
	Divider,
	Box,
	Skeleton,
	Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import {
	ProcessedQuantumData,
	calculateStatistics,
} from '../../utils/dataProcessingUtils';

interface QuantumStatsCardProps {
	data: ProcessedQuantumData[];
	title: string;
	algorithm?: string;
	loading?: boolean;
	metricType?: 'circuit' | 'success';
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
};

const QuantumStatsCard: React.FC<QuantumStatsCardProps> = ({
	data,
	title,
	algorithm,
	loading = false,
	metricType,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

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

	console.log(
		`QuantumStatsCard filtered data: ${
			filteredData.length
		} items for algorithm: ${algorithm || 'all'}`
	);

	// Extract performance metrics
	const getMetrics = () => {
		const metrics = {
			execution_time: [] as number[],
			circuit_depth: [] as number[],
			cx_gate_count: [] as number[],
			total_gate_count: [] as number[],
			success_rate: [] as number[],
		};

		filteredData.forEach((item) => {
			if (item.execution_time_sec !== null) {
				metrics.execution_time.push(item.execution_time_sec);
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
		});

		return metrics;
	};

	const metrics = getMetrics();

	// Calculate statistics
	const timeStats = calculateStatistics(metrics.execution_time);
	const depthStats = calculateStatistics(metrics.circuit_depth);
	const cxStats = calculateStatistics(metrics.cx_gate_count);
	const gateStats = calculateStatistics(metrics.total_gate_count);
	const successStats = calculateStatistics(metrics.success_rate);

	// Helper to format numbers
	const formatNumber = (num: number, decimals: number = 2) => {
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

	if (loading) {
		return (
			<Card
				sx={{
					height: '100%',
					backgroundColor: isDarkMode ? '#212121' : '#E9E9E9',
					borderRadius: '12px',
					boxShadow: isDarkMode
						? '0 4px 8px rgba(0, 0, 0, 0.4)'
						: '0 4px 8px rgba(0, 0, 0, 0.1)',
				}}
			>
				<CardContent>
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
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			sx={{
				height: '100%',
				backgroundColor: isDarkMode ? '#212121' : '#E9E9E9',
				borderRadius: '12px',
				boxShadow: isDarkMode
					? '0 4px 8px rgba(0, 0, 0, 0.4)'
					: '0 4px 8px rgba(0, 0, 0, 0.1)',
			}}
		>
			<CardContent>
				<Typography
					variant="h6"
					sx={{ color: isDarkMode ? '#fff' : '#000', mb: 0.5 }}
				>
					{title}
				</Typography>

				{filteredData.length === 0 ? (
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
							No quantum data available. Run quantum workloads to generate
							statistics.
						</Typography>
					</Box>
				) : (
					<>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Based on {filteredData.length} quantum algorithm runs
							{algorithm && algorithm !== 'all' ? ` for ${algorithm}` : ''}
						</Typography>

						<Box sx={{ mb: 2 }}>
							<Typography variant="body2" color="text.secondary">
								Quantum metrics reflect both algorithm design and hardware
								limitations.
								{algorithm === 'shor'
									? " Shor's algorithm performance is measured by successful factorization and circuit efficiency."
									: algorithm === 'grover'
									? " Grover's algorithm performance is measured by marked state finding success rate."
									: ' For quantum algorithms, lower circuit complexity often leads to better results on real hardware.'}
							</Typography>
						</Box>

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
								: 'Circuit Metrics'}
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
									{renderMetric(
										'Execution Time',
										timeStats.mean,
										's',
										QuantumTooltips.executionTime
									)}
									{renderMetric(
										'Shots (avg)',
										filteredData.reduce((acc, item) => acc + item.shots, 0) /
											filteredData.length,
										'',
										QuantumTooltips.shots
									)}
								</>
							) : (
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
								</>
							)}
						</Grid>

						<Divider
							sx={{
								my: 2,
								borderColor: isDarkMode
									? 'rgba(255,255,255,0.1)'
									: 'rgba(0,0,0,0.1)',
							}}
						/>

						<Typography
							variant="subtitle2"
							sx={{
								color: '#9747FF',
								mb: 1,
								textTransform: 'uppercase',
								fontWeight: 'bold',
							}}
						>
							{metricType === 'success' ? 'Run Statistics' : 'Performance'}
						</Typography>

						<Grid container spacing={1.5}>
							{metricType === 'success' ? (
								<>
									{metrics.success_rate.length > 0 && (
										<>
											{renderMetric(
												'Min Success',
												successStats.min,
												'%',
												QuantumTooltips.minSuccess
											)}
											{renderMetric(
												'Max Success',
												successStats.max,
												'%',
												QuantumTooltips.maxSuccess
											)}
										</>
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
									{metrics.success_rate.length > 0 &&
										renderMetric(
											'Success Rate',
											successStats.mean,
											'%',
											QuantumTooltips.successRate
										)}
									{renderMetric(
										'Shots (avg)',
										filteredData.reduce((acc, item) => acc + item.shots, 0) /
											filteredData.length,
										'',
										QuantumTooltips.shots
									)}
								</>
							)}
						</Grid>
					</>
				)}
			</CardContent>
		</Card>
	);
};

export default QuantumStatsCard;
