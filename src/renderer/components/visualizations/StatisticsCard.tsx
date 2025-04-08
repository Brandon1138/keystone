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
	ProcessedBenchmarkData,
	calculateStatistics,
} from '../../utils/dataProcessingUtils';

interface StatisticsCardProps {
	data: ProcessedBenchmarkData[];
	title: string;
	algorithm?: string;
	loading?: boolean;
	metricType?: 'performance' | 'memory';
}

// Define tooltips for statistical terms
const StatTooltips = {
	average:
		'Mean value calculated as the sum of all values divided by the count of values',
	min: 'Minimum (lowest) value observed across all measurements',
	max: 'Maximum (highest) value observed across all measurements',
	stdDev:
		'Standard deviation measures how spread out the values are. Lower values indicate more consistent performance',
	opsPerSec:
		'Operations per second - higher values indicate better performance',
	peak: 'Maximum memory used during operation execution',
	memoryRange:
		'The difference between maximum and minimum memory usage, indicating volatility',
};

const StatisticsCard: React.FC<StatisticsCardProps> = ({
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
			? data.filter(
					(item) => item.algorithm.toLowerCase() === algorithm.toLowerCase()
			  )
			: data;

	// Extract performance metrics
	const getMetricsForOperation = (operationType: string) => {
		const metrics = {
			avg_ms: [] as number[],
			ops_per_sec: [] as number[],
			mem_peak_kb: [] as number[],
		};

		filteredData.forEach((item) => {
			const operation = item.operations.find(
				(op) => op.operation === operationType
			);
			if (operation) {
				metrics.avg_ms.push(operation.avg_ms);
				metrics.ops_per_sec.push(operation.ops_per_sec);
				metrics.mem_peak_kb.push(operation.mem_peak_kb);
			}
		});

		return metrics;
	};

	// Collect metrics for common operations
	const keygenMetrics = getMetricsForOperation('keygen');
	const signMetrics = getMetricsForOperation('sign');
	const verifyMetrics = getMetricsForOperation('verify');
	const encapsMetrics = getMetricsForOperation('encapsulate');
	const decapsMetrics = getMetricsForOperation('decapsulate');

	// Calculate statistics for the operations with the most data
	let primaryStats = keygenMetrics;
	if (signMetrics.avg_ms.length > primaryStats.avg_ms.length)
		primaryStats = signMetrics;
	if (verifyMetrics.avg_ms.length > primaryStats.avg_ms.length)
		primaryStats = verifyMetrics;
	if (encapsMetrics.avg_ms.length > primaryStats.avg_ms.length)
		primaryStats = encapsMetrics;
	if (decapsMetrics.avg_ms.length > primaryStats.avg_ms.length)
		primaryStats = decapsMetrics;

	// Get statistics for the primary operation
	const timeStats = calculateStatistics(primaryStats.avg_ms);
	const opsStats = calculateStatistics(primaryStats.ops_per_sec);
	const memStats = calculateStatistics(primaryStats.mem_peak_kb);

	// Helper to format numbers
	const formatNumber = (num: number, decimals: number = 2) => {
		return num.toLocaleString(undefined, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		});
	};

	// Determine operation with most data
	let primaryOperation = 'keygen';
	if (primaryStats === signMetrics) primaryOperation = 'sign';
	if (primaryStats === verifyMetrics) primaryOperation = 'verify';
	if (primaryStats === encapsMetrics) primaryOperation = 'encapsulate';
	if (primaryStats === decapsMetrics) primaryOperation = 'decapsulate';

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
							No data available for statistics. Run benchmarks to generate data.
						</Typography>
					</Box>
				) : (
					<>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Based on {filteredData.length} benchmark runs
							{algorithm && algorithm !== 'all' ? ` for ${algorithm}` : ''}
						</Typography>

						<Box sx={{ mb: 2 }}>
							<Typography variant="body2" color="text.secondary">
								This card shows key statistical measures to help you interpret
								benchmark results. Lower execution times and memory usage
								generally indicate better performance.
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
							{metricType === 'memory'
								? 'Memory Usage'
								: `${primaryOperation} Performance`}
						</Typography>

						<Grid container spacing={1.5}>
							{metricType === 'memory' ? (
								<>
									{renderMetric(
										'Peak Memory',
										memStats.mean,
										'KB',
										StatTooltips.peak
									)}
									{renderMetric(
										'Min Memory',
										memStats.min,
										'KB',
										StatTooltips.min
									)}
									{renderMetric(
										'Max Memory',
										memStats.max,
										'KB',
										StatTooltips.max
									)}
								</>
							) : (
								<>
									{renderMetric(
										'Average Time',
										timeStats.mean,
										'ms',
										StatTooltips.average
									)}
									{renderMetric(
										'Operations/sec',
										opsStats.mean,
										'',
										StatTooltips.opsPerSec
									)}
									{renderMetric(
										'Min Time',
										timeStats.min,
										'ms',
										StatTooltips.min
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
							{metricType === 'memory'
								? 'Memory Statistics'
								: 'Performance Statistics'}
						</Typography>

						<Grid container spacing={1.5}>
							{metricType === 'memory' ? (
								<>
									{renderMetric(
										'Std Deviation',
										memStats.stdDev,
										'KB',
										StatTooltips.stdDev
									)}
									{Object.keys(memStats).length > 0 &&
										filteredData.length > 1 &&
										renderMetric(
											'Memory Usage Range',
											memStats.max - memStats.min,
											'KB',
											StatTooltips.memoryRange
										)}
								</>
							) : (
								<>
									{renderMetric(
										'Max Time',
										timeStats.max,
										'ms',
										StatTooltips.max
									)}
									{renderMetric(
										'Std Deviation',
										timeStats.stdDev,
										'ms',
										StatTooltips.stdDev
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

export default StatisticsCard;
