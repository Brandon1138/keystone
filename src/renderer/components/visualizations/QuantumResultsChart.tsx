import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { ProcessedQuantumData } from '../../utils/dataProcessingUtils';
import { useTheme } from '@mui/material/styles';
import {
	Skeleton,
	Box,
	Typography,
	Paper,
	Tooltip,
	Card,
	CardContent,
	Grid,
	FormControl,
	Select,
	MenuItem,
	InputLabel,
	ToggleButton,
	ToggleButtonGroup,
} from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortIcon from '@mui/icons-material/Sort';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { SelectChangeEvent } from '@mui/material';

interface QuantumResultsChartProps {
	data: ProcessedQuantumData[];
	chartType?: 'histogram' | 'bars' | 'scatter';
	metricType?:
		| 'execution_time_sec'
		| 'circuit_depth'
		| 'cx_gate_count'
		| 'total_gate_count'
		| 'success_rate';
	title?: string;
	height?: number;
	loading?: boolean;
	sortOrder?: string;
	onSortOrderChange?: (sortOrder: string) => void;
	onMetricTypeChange?: (
		metricType:
			| 'execution_time_sec'
			| 'circuit_depth'
			| 'cx_gate_count'
			| 'total_gate_count'
			| 'success_rate'
	) => void;
}

// Define valid metric types for TypeScript
type MetricType =
	| 'execution_time_sec'
	| 'circuit_depth'
	| 'cx_gate_count'
	| 'total_gate_count'
	| 'success_rate';
type ChartType = 'histogram' | 'bars' | 'scatter';

const QuantumResultsChart = ({
	data,
	chartType = 'bars',
	metricType = 'execution_time_sec',
	title = 'Quantum Algorithm Performance',
	height = 400,
	loading = false,
	sortOrder = 'default',
	onSortOrderChange,
	onMetricTypeChange,
}: QuantumResultsChartProps) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [plotData, setPlotData] = useState<any[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [selectedChartType, setSelectedChartType] =
		useState<ChartType>(chartType);
	const [selectedMetric, setSelectedMetric] = useState<MetricType>(metricType);

	const metricLabels = {
		execution_time_sec: 'Execution Time (seconds)',
		circuit_depth: 'Circuit Depth',
		cx_gate_count: 'CX Gate Count',
		total_gate_count: 'Total Gate Count',
		success_rate: 'Success Rate (%)',
	};

	// Descriptions for each metric and chart type
	const metricDescriptions = {
		execution_time_sec:
			'Total runtime in seconds for the quantum algorithm. Lower values indicate more efficient execution.',
		circuit_depth:
			'Maximum number of sequential operations in the quantum circuit. Lower depths generally indicate faster execution times on real quantum hardware.',
		cx_gate_count:
			'Number of CNOT (controlled-NOT) gates used. CNOTs are error-prone on real hardware, so fewer is better.',
		total_gate_count:
			'Total number of quantum gates in the circuit. Fewer gates generally means less opportunity for errors.',
		success_rate:
			'Percentage of runs where the algorithm produced the correct answer. Higher is better.',
	};

	const chartDescriptions = {
		histogram:
			'Shows the distribution of quantum states measured after algorithm execution. Taller bars indicate states that were measured more frequently.',
		bars: 'Compares the selected metric across different quantum algorithms. Use this to identify which algorithms perform better for specific metrics.',
		scatter:
			'Plots the relationship between circuit depth and the selected metric. Helps identify how complexity affects performance.',
	};

	useEffect(() => {
		console.log(
			`QuantumResultsChart rendering with ${data.length} data points, chart type: ${selectedChartType}`
		);
		setErrorMessage(null);

		if (!data || data.length === 0) {
			console.log('No quantum data available for visualization');
			return;
		}

		try {
			let plotlyData: any[] = [];

			// For histogram of raw_counts
			if (selectedChartType === 'histogram') {
				// Find results with raw_counts
				const validData = data.filter(
					(d) =>
						d.raw_counts !== null && Object.keys(d.raw_counts || {}).length > 0
				);
				console.log(
					`Found ${validData.length} results with raw counts for histogram`
				);

				if (validData.length === 0) {
					setErrorMessage(
						'No measurement data available for histogram. Run quantum workloads first.'
					);
					return;
				}

				// Sort by date and get most recent
				const sortedData = [...validData].sort(
					(a, b) =>
						new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				);

				const latestResult = sortedData[0];
				console.log(
					`Using result from ${latestResult.timestamp} for histogram`
				);

				if (
					!latestResult.raw_counts ||
					Object.keys(latestResult.raw_counts).length === 0
				) {
					setErrorMessage('No measurement counts in the result data');
					return;
				}

				// Extract states and counts
				const states = Object.keys(latestResult.raw_counts);
				const counts = Object.values(latestResult.raw_counts);

				plotlyData = [
					{
						x: states,
						y: counts,
						type: 'bar',
						marker: {
							color: '#9747FF',
							opacity: 0.8,
							line: {
								color: isDarkMode ? '#333' : '#fff',
								width: 1,
							},
						},
						text: counts.map((c) => c.toString()),
						textposition: 'auto',
						hoverinfo: 'x+y',
						name: `${
							latestResult.algorithm
						} - Run ID: ${latestResult.runId.substring(0, 8)}`,
					},
				];
			}
			// For bar charts of different metrics
			else if (selectedChartType === 'bars') {
				// Group data by algorithm
				const algoData: { [key: string]: number[] } = {};

				console.log(`Processing bar chart for metric: ${selectedMetric}`);

				data.forEach((item) => {
					if (!item) return;

					const algorithm = item.algorithm || 'Unknown';

					if (!algoData[algorithm]) {
						algoData[algorithm] = [];
					}

					// Use the correct metric with fallbacks for null values
					let metricValue: number | undefined;

					if (
						selectedMetric === 'success_rate' &&
						item.success_rate !== undefined
					) {
						metricValue = item.success_rate * 100; // Convert to percentage
					} else {
						// Type assertion to access dynamic property with type safety
						const metricVal = item[selectedMetric];
						if (metricVal !== null && metricVal !== undefined) {
							metricValue = metricVal as number;
						} else {
							// Skip items with no value for this metric
							console.log(
								`No ${selectedMetric} value for algorithm: ${algorithm}`
							);
							return;
						}
					}

					if (metricValue !== undefined && !isNaN(metricValue)) {
						algoData[algorithm].push(metricValue);
					}
				});

				console.log(`Grouped data by algorithm:`, Object.keys(algoData));

				// Colors for the bars
				const colors = [
					'#9747FF', // Primary purple
					'#4CAF50', // Green
					'#2196F3', // Blue
					'#FF9800', // Orange
					'#E91E63', // Pink
				];

				// Create plot data for each algorithm
				const plotItems: any[] = [];
				Object.entries(algoData).forEach(([algorithm, values], idx) => {
					if (values.length === 0) {
						console.log(`No values for algorithm: ${algorithm}`);
						return;
					}

					// Calculate average value
					const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
					console.log(
						`Algorithm ${algorithm}: average ${selectedMetric} = ${avgValue}`
					);

					plotItems.push({
						x: [algorithm],
						y: [avgValue],
						type: 'bar',
						name: algorithm,
						marker: {
							color: colors[idx % colors.length],
							opacity: 0.8,
							line: {
								color: isDarkMode ? '#333' : '#fff',
								width: 1,
							},
						},
						text:
							selectedMetric === 'success_rate'
								? `${avgValue.toFixed(1)}%`
								: avgValue.toFixed(2),
						textposition: 'auto',
						hoverinfo: 'x+y+name',
						algorithm: algorithm,
						value: avgValue,
					});
				});

				// Apply sorting if not default
				if (sortOrder !== 'default' && plotItems.length > 0) {
					plotItems.sort((a, b) => {
						if (sortOrder === 'asc') {
							return a.value - b.value; // Low to high
						} else if (sortOrder === 'desc') {
							return b.value - a.value; // High to low
						}
						return 0;
					});
				}

				plotlyData = plotItems;
			}
			// For scatter plot (e.g. execution time vs circuit depth)
			else if (selectedChartType === 'scatter') {
				// Group by algorithm for different colors/symbols
				const groupedData: { [key: string]: ProcessedQuantumData[] } = {};

				data.forEach((item) => {
					const algorithm = item.algorithm;
					if (!groupedData[algorithm]) {
						groupedData[algorithm] = [];
					}
					groupedData[algorithm].push(item);
				});

				// Colors and symbols for different algorithms
				const colors = [
					'#9747FF', // Primary purple
					'#4CAF50', // Green
					'#2196F3', // Blue
					'#FF9800', // Orange
					'#E91E63', // Pink
				];

				const symbols = ['circle', 'square', 'diamond', 'cross', 'x'];

				// Create a scatter plot for each algorithm group
				Object.entries(groupedData).forEach(([algorithm, items], idx) => {
					// Default to execution_time_sec vs circuit_depth
					const xMetric: MetricType =
						selectedMetric === 'success_rate'
							? 'execution_time_sec'
							: selectedMetric;
					const yMetric: MetricType = 'circuit_depth';

					// Filter items with valid x and y values
					const validItems = items.filter(
						(item) => item[xMetric] !== null && item[yMetric] !== null
					);

					if (validItems.length === 0) return;

					const xValues = validItems.map((item) =>
						xMetric === 'execution_time_sec' && item.success_rate !== undefined
							? item.success_rate * 100
							: (item[xMetric] as number)
					);

					const yValues = validItems.map((item) => item[yMetric] as number);

					plotlyData.push({
						x: xValues,
						y: yValues,
						type: 'scatter',
						mode: 'markers',
						name: algorithm,
						marker: {
							color: colors[idx % colors.length],
							symbol: symbols[idx % symbols.length],
							size: 10,
							opacity: 0.8,
							line: {
								color: isDarkMode ? '#333' : '#fff',
								width: 1,
							},
						},
						hovertemplate: `${algorithm}<br>${metricLabels[xMetric]}: %{x}<br>${metricLabels[yMetric]}: %{y}<extra></extra>`,
					});
				});
			}

			console.log(`Generated ${plotlyData.length} plot data points`);
			setPlotData(plotlyData);
		} catch (error) {
			console.error('Error generating quantum chart:', error);
			setErrorMessage(
				'Error generating chart: ' +
					(error instanceof Error ? error.message : 'Unknown error')
			);
			setPlotData([]);
		}
	}, [data, selectedChartType, selectedMetric, isDarkMode, sortOrder]);

	// Handle chart type change
	const handleChartTypeChange = (
		event: React.MouseEvent<HTMLElement>,
		newChartType: string | null
	) => {
		if (
			newChartType !== null &&
			(newChartType === 'histogram' ||
				newChartType === 'bars' ||
				newChartType === 'scatter')
		) {
			setSelectedChartType(newChartType);
		}
	};

	// Handle sort order change
	const handleSortChange = (event: SelectChangeEvent) => {
		if (onSortOrderChange) {
			onSortOrderChange(event.target.value);
		}
	};

	// Handle metric type change
	const handleMetricChange = (event: SelectChangeEvent) => {
		const value = event.target.value as MetricType;
		if (onMetricTypeChange) {
			onMetricTypeChange(value);
		} else {
			setSelectedMetric(value);
		}
	};

	// Configure layout based on chart type
	let layout: any = {
		title: title,
		height: height,
		margin: { l: 60, r: 30, t: 50, b: 80 },
		plot_bgcolor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
		paper_bgcolor: 'transparent',
		font: {
			color: isDarkMode ? '#fff' : '#333',
		},
		legend: {
			orientation: 'h' as const,
			x: 0.5,
			y: 1.1,
			xanchor: 'center' as const,
			bgcolor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
			bordercolor: isDarkMode ? '#444' : '#ddd',
			borderwidth: 1,
		},
	};

	// Add specific layout properties based on chart type
	if (selectedChartType === 'histogram') {
		layout = {
			...layout,
			xaxis: {
				title: 'Measured State',
				tickangle: -45,
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
			},
			yaxis: {
				title: 'Count',
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
				autorange: true,
				rangemode: 'tozero' as const,
			},
		};
	} else if (selectedChartType === 'bars') {
		layout = {
			...layout,
			barmode: 'group' as const,
			xaxis: {
				title: 'Algorithm',
				tickangle: -45,
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
			},
			yaxis: {
				title: metricLabels[selectedMetric],
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
				autorange: true,
				rangemode: 'tozero' as const,
				fixedrange: false,
			},
		};
	} else if (selectedChartType === 'scatter') {
		// Determine the x-axis metric title based on metricType
		const xAxisTitle =
			selectedMetric === 'success_rate'
				? metricLabels['execution_time_sec']
				: metricLabels[selectedMetric];

		layout = {
			...layout,
			xaxis: {
				title: xAxisTitle,
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
				autorange: true,
			},
			yaxis: {
				title: metricLabels['circuit_depth'],
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
				autorange: true,
				rangemode: 'tozero' as const,
			},
		};
	}

	const config = {
		responsive: true,
		displayModeBar: true,
		modeBarButtonsToRemove: ['lasso2d', 'select2d'] as (
			| 'lasso2d'
			| 'select2d'
		)[],
	};

	if (loading) {
		return (
			<Box sx={{ width: '100%', height: height }}>
				<Skeleton
					variant="rectangular"
					width="100%"
					height={height}
					animation="wave"
					sx={{
						bgcolor: isDarkMode
							? 'rgba(255, 255, 255, 0.1)'
							: 'rgba(0, 0, 0, 0.1)',
						borderRadius: '8px',
					}}
				/>
			</Box>
		);
	}

	if (data.length === 0 || plotData.length === 0) {
		return (
			<Box
				sx={{
					width: '100%',
					height: height,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
					borderRadius: '8px',
					border: isDarkMode ? '1px solid #333' : '1px solid #ddd',
					flexDirection: 'column',
				}}
			>
				<Typography
					variant="body1"
					color={isDarkMode ? 'text.secondary' : 'text.primary'}
					textAlign="center"
					sx={{ p: 2 }}
				>
					{errorMessage ||
						'No quantum data available for visualization. Run quantum workloads to generate data.'}
				</Typography>

				{/* Add extra debugging info */}
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ mt: 1, fontSize: '0.75rem' }}
				>
					Data Source: Quantum Workloads | Data points: {data.length}
				</Typography>
			</Box>
		);
	}

	return (
		<>
			<Paper
				elevation={0}
				sx={{
					backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
					p: 1.5,
					mb: 2,
					borderRadius: '8px',
					border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
				}}
			>
				<Typography variant="body2" color="text.secondary">
					<strong>What this shows:</strong>{' '}
					{chartDescriptions[selectedChartType]}{' '}
					{selectedChartType !== 'histogram' && (
						<>
							<strong>Metric:</strong> {metricDescriptions[selectedMetric]}{' '}
						</>
					)}
					<Tooltip
						title={`Quantum computing metrics require different interpretation than classical ones. For accurate comparison, ensure algorithms were run with similar parameters and shots.`}
						arrow
					>
						<InfoOutlined
							sx={{ fontSize: '0.9rem', verticalAlign: 'middle' }}
						/>
					</Tooltip>
				</Typography>
			</Paper>

			{/* Control panel */}
			<Grid container spacing={2} sx={{ mb: 2 }}>
				{/* Chart type selector */}
				<Grid item xs={12} sm={4}>
					<Card
						variant="outlined"
						sx={{
							borderRadius: '8px',
							backgroundColor: isDarkMode
								? 'rgba(0,0,0,0.3)'
								: 'rgba(255,255,255,0.7)',
							border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
							height: '100%',
						}}
					>
						<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
							<Typography variant="subtitle2" gutterBottom>
								Chart Type
							</Typography>
							<ToggleButtonGroup
								value={selectedChartType}
								exclusive
								onChange={handleChartTypeChange}
								aria-label="chart type"
								size="small"
								fullWidth
							>
								<ToggleButton value="bars" aria-label="bar chart">
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
									>
										<BarChartIcon fontSize="small" />
										<Typography variant="body2">Bars</Typography>
									</div>
								</ToggleButton>
								<ToggleButton value="histogram" aria-label="histogram">
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
									>
										<ShowChartIcon fontSize="small" />
										<Typography variant="body2">Histogram</Typography>
									</div>
								</ToggleButton>
								<ToggleButton value="scatter" aria-label="scatter plot">
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
									>
										<ScatterPlotIcon fontSize="small" />
										<Typography variant="body2">Scatter</Typography>
									</div>
								</ToggleButton>
							</ToggleButtonGroup>
						</CardContent>
					</Card>
				</Grid>

				{/* Metric selector */}
				<Grid item xs={12} sm={4}>
					<Card
						variant="outlined"
						sx={{
							borderRadius: '8px',
							backgroundColor: isDarkMode
								? 'rgba(0,0,0,0.3)'
								: 'rgba(255,255,255,0.7)',
							border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
							height: '100%',
						}}
					>
						<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
							<Typography variant="subtitle2" gutterBottom>
								Metric
							</Typography>
							<FormControl fullWidth size="small">
								<Select
									value={selectedMetric}
									onChange={handleMetricChange}
									displayEmpty
									variant="outlined"
									disabled={selectedChartType === 'histogram'}
								>
									<MenuItem value="execution_time_sec">Execution Time</MenuItem>
									<MenuItem value="circuit_depth">Circuit Depth</MenuItem>
									<MenuItem value="cx_gate_count">CX Gate Count</MenuItem>
									<MenuItem value="total_gate_count">Total Gate Count</MenuItem>
									<MenuItem value="success_rate">Success Rate</MenuItem>
								</Select>
							</FormControl>
						</CardContent>
					</Card>
				</Grid>

				{/* Sorting options */}
				<Grid item xs={12} sm={4}>
					<Card
						variant="outlined"
						sx={{
							borderRadius: '8px',
							backgroundColor: isDarkMode
								? 'rgba(0,0,0,0.3)'
								: 'rgba(255,255,255,0.7)',
							border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
							height: '100%',
						}}
					>
						<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
							<Typography
								variant="subtitle2"
								gutterBottom
								sx={{ display: 'flex', alignItems: 'center' }}
							>
								<SortIcon sx={{ mr: 1, fontSize: '1rem' }} /> Sort Order
							</Typography>
							<FormControl fullWidth size="small">
								<Select
									value={sortOrder}
									onChange={handleSortChange}
									displayEmpty
									variant="outlined"
									disabled={selectedChartType !== 'bars'}
								>
									<MenuItem value="default">Default Order</MenuItem>
									<MenuItem value="asc">
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
											}}
										>
											<ArrowUpwardIcon fontSize="small" />
											<span>Low to High</span>
										</div>
									</MenuItem>
									<MenuItem value="desc">
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
											}}
										>
											<ArrowDownwardIcon fontSize="small" />
											<span>High to Low</span>
										</div>
									</MenuItem>
								</Select>
							</FormControl>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			<Plot
				data={plotData}
				layout={layout}
				config={config}
				style={{ width: '100%', height: 'auto' }}
			/>
		</>
	);
};

export default QuantumResultsChart;
