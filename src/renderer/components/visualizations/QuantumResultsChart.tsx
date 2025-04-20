import React, { useState, useEffect, useRef } from 'react';
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
	Chip,
} from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortIcon from '@mui/icons-material/Sort';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import { SelectChangeEvent } from '@mui/material';
import { ModeBarDefaultButtons, Config } from 'plotly.js';

// Conditional logging helper
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

interface QuantumResultsChartProps {
	data: ProcessedQuantumData[];
	chartType?: 'bars' | 'scatter';
	metricType?:
		| 'qpu_time_sec'
		| 'circuit_depth'
		| 'total_gate_count'
		| 'success_rate'
		| 'confidence';
	title?: string;
	height?: number;
	loading?: boolean;
	sortOrder?: string;
	onSortOrderChange?: (sortOrder: string) => void;
	onMetricTypeChange?: (
		metricType:
			| 'qpu_time_sec'
			| 'circuit_depth'
			| 'total_gate_count'
			| 'success_rate'
			| 'confidence'
	) => void;
	chartRef?: React.RefObject<any>;
}

// Define valid metric types for TypeScript
type MetricType =
	| 'qpu_time_sec'
	| 'circuit_depth'
	| 'total_gate_count'
	| 'success_rate'
	| 'confidence';
type ChartType = 'bars' | 'scatter';

const QuantumResultsChart = ({
	data,
	chartType = 'bars',
	metricType = 'qpu_time_sec',
	title = 'Quantum Algorithm Performance',
	height = 400,
	loading = false,
	sortOrder = 'default',
	onSortOrderChange,
	onMetricTypeChange,
	chartRef,
}: QuantumResultsChartProps) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [plotData, setPlotData] = useState<any[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [selectedChartType, setSelectedChartType] =
		useState<ChartType>(chartType);
	const [selectedMetric, setSelectedMetric] = useState<MetricType>(metricType);
	const [selectedBackend, setSelectedBackend] = useState<string>('all');
	const localPlotRef = useRef<any>(null);
	const plotRef = chartRef || localPlotRef;
	const [chartWidth, setChartWidth] = useState<number>(0);

	const metricLabels = {
		qpu_time_sec: 'QPU Time (seconds)',
		circuit_depth: 'Circuit Depth',
		total_gate_count: 'Total Gate Count',
		success_rate: 'Success Rate (%)',
		confidence: 'Confidence (%)',
	};

	// Descriptions for each metric and chart type
	const metricDescriptions = {
		qpu_time_sec:
			'Actual QPU time in seconds for the algorithm. Lower values indicate more efficient execution.',
		circuit_depth:
			'Maximum number of sequential operations in the quantum circuit. Lower depths generally indicate faster execution times on real quantum hardware.',
		total_gate_count:
			'Total number of quantum gates in the circuit. Fewer gates generally means less opportunity for errors.',
		success_rate:
			'Percentage of runs where the algorithm produced the correct answer. Higher is better.',
		confidence:
			'Ratio of correct measurement outcomes to total shots; higher is better.',
	};

	const chartDescriptions = {
		bars: 'Compares the selected metric across different quantum algorithms. Use this to identify which algorithms perform better for specific metrics.',
		scatter:
			'Plots the relationship between circuit depth and the selected metric. Helps identify how complexity affects performance.',
	};

	// Handle window resize to update chart size
	useEffect(() => {
		const handleResize = () => {
			if (plotRef.current && plotRef.current.el) {
				// Get the current container width
				const containerWidth = plotRef.current.el.clientWidth;
				if (containerWidth !== chartWidth) {
					setChartWidth(containerWidth);

					// Use Plotly's built-in resize handler
					if (plotRef.current.el._fullLayout) {
						plotRef.current.handleResize();
					}
				}
			}
		};

		// Specifically handle fullscreen transitions
		const handleFullscreenChange = () => {
			// Add a delay to ensure DOM has fully updated after transition
			setTimeout(() => {
				if (plotRef.current && plotRef.current.el) {
					// Force a complete redraw without recalculating data
					plotRef.current.handleResize();
					// If we still have issues, we can force a more complete redraw
					plotRef.current.resizeHandler();
				}
			}, 100); // Small delay to let the DOM settle
		};

		// Add a more complete redraw function for severe resize cases
		const forceCompleteRedraw = () => {
			if (!plotRef.current) return;

			// First try standard resize
			if (plotRef.current.handleResize) {
				plotRef.current.handleResize();
			}

			// For more severe cases, force a more complete redraw
			setTimeout(() => {
				if (plotRef.current && plotRef.current.el) {
					// Force Plotly to completely recalculate layout
					if (typeof window !== 'undefined' && window.Plotly) {
						window.Plotly.relayout(plotRef.current.el, {
							'xaxis.autorange': true,
							'yaxis.autorange': true,
						});
					} else if (plotRef.current.resizeHandler) {
						plotRef.current.resizeHandler();
					}
				}
			}, 200);
		};

		// Add event listeners
		window.addEventListener('resize', handleResize);
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // For Safari
		document.addEventListener('mozfullscreenchange', handleFullscreenChange); // For Firefox
		document.addEventListener('MSFullscreenChange', handleFullscreenChange); // For IE/Edge

		// Add dedicated listeners for severe size changes
		window.addEventListener('resize', forceCompleteRedraw);

		// Call once to initialize
		setTimeout(handleResize, 0);

		// Clean up
		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('resize', forceCompleteRedraw);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener(
				'webkitfullscreenchange',
				handleFullscreenChange
			);
			document.removeEventListener(
				'mozfullscreenchange',
				handleFullscreenChange
			);
			document.removeEventListener(
				'MSFullscreenChange',
				handleFullscreenChange
			);
		};
	}, [height, chartWidth]);

	useEffect(() => {
		log(
			`QuantumResultsChart rendering with ${data.length} data points, chart type: ${selectedChartType}`
		);
		setErrorMessage(null);

		if (!data || data.length === 0) {
			log('No quantum data available for visualization');
			return;
		}

		try {
			let plotlyData: any[] = [];

			// Filter by backend type if not 'all'
			let filteredData = [...data];
			if (selectedBackend !== 'all') {
				filteredData = data.filter((item) => {
					const isSimulator =
						item.backend_used?.toLowerCase().includes('simulator') ||
						item.backend_used?.toLowerCase().includes('sim') ||
						item.backend_used === 'aer_simulator';

					if (selectedBackend === 'simulator') {
						return isSimulator;
					} else {
						return !isSimulator; // hardware
					}
				});

				log(`Filtered to ${filteredData.length} ${selectedBackend} results`);

				if (filteredData.length === 0) {
					setErrorMessage(
						`No ${selectedBackend} data available. Run quantum workloads on ${selectedBackend} backend.`
					);
					return;
				}
			}

			// For bar charts of different metrics
			if (selectedChartType === 'bars') {
				// Group data by algorithm
				const algoData: { [key: string]: number[] } = {};

				log(`Processing bar chart for metric: ${selectedMetric}`);

				filteredData.forEach((item) => {
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
					} else if (
						selectedMetric === 'confidence' &&
						item.confidence !== undefined
					) {
						metricValue = item.confidence * 100; // Convert to percentage
					} else {
						// Type assertion to access dynamic property with type safety
						const metricVal = item[selectedMetric];
						if (metricVal !== null && metricVal !== undefined) {
							metricValue = metricVal as number;
						} else {
							// Skip items with no value for this metric
							log(`No ${selectedMetric} value for algorithm: ${algorithm}`);
							return;
						}
					}

					if (metricValue !== undefined && !isNaN(metricValue)) {
						algoData[algorithm].push(metricValue);
					}
				});

				log(`Grouped data by algorithm:`, Object.keys(algoData));

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
						log(`No values for algorithm: ${algorithm}`);
						return;
					}

					// Calculate average value
					const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
					log(
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

				filteredData.forEach((item) => {
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
					// Default to qpu_time_sec vs circuit_depth
					const xMetric: MetricType =
						selectedMetric === 'success_rate' ? 'qpu_time_sec' : selectedMetric;
					const yMetric: MetricType = 'circuit_depth';

					// Filter items with valid x and y values
					const validItems = items.filter(
						(item) => item[xMetric] !== null && item[yMetric] !== null
					);

					if (validItems.length === 0) return;

					const xValues = validItems.map((item) =>
						xMetric === 'qpu_time_sec' && item.success_rate !== undefined
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

			log(`Generated ${plotlyData.length} plot data points`);
			setPlotData(plotlyData);
		} catch (error) {
			log('Error generating quantum chart:', error);
			setErrorMessage(
				'Error generating chart: ' +
					(error instanceof Error ? error.message : 'Unknown error')
			);
			setPlotData([]);
		}
	}, [
		data,
		selectedChartType,
		selectedMetric,
		isDarkMode,
		sortOrder,
		selectedBackend,
	]);

	// Handle chart type change
	const handleChartTypeChange = (
		event: React.MouseEvent<HTMLElement>,
		newChartType: string | null
	) => {
		if (
			newChartType !== null &&
			(newChartType === 'bars' || newChartType === 'scatter')
		) {
			setSelectedChartType(newChartType as ChartType);
		}
	};

	// Handle backend type change
	const handleBackendChange = (event: SelectChangeEvent) => {
		setSelectedBackend(event.target.value);
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
		setSelectedMetric(value);
		if (onMetricTypeChange) {
			onMetricTypeChange(value);
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
		modebar: {
			orientation: 'v' as 'v',
			bgcolor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
			color: isDarkMode ? '#fff' : '#333',
			activecolor: '#9747FF',
		},
	};

	// Add specific layout properties based on chart type
	if (selectedChartType === 'bars') {
		layout = {
			...layout,
			barmode: 'group' as const,
			xaxis: {
				title: {
					text: 'Quantum Algorithm',
					font: {
						size: 14,
						color: isDarkMode ? '#fff' : '#333',
						family: 'Arial, sans-serif',
						weight: 600,
					},
					standoff: 15,
				},
				tickangle: -45,
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
			},
			yaxis: {
				title: {
					text: metricLabels[selectedMetric],
					font: {
						size: 14,
						color: isDarkMode ? '#fff' : '#333',
						family: 'Arial, sans-serif',
						weight: 600,
					},
					standoff: 15,
				},
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
				? metricLabels['qpu_time_sec']
				: metricLabels[selectedMetric];

		layout = {
			...layout,
			xaxis: {
				title: {
					text: xAxisTitle,
					font: {
						size: 14,
						color: isDarkMode ? '#fff' : '#333',
						family: 'Arial, sans-serif',
						weight: 600,
					},
					standoff: 15,
				},
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
				autorange: true,
			},
			yaxis: {
				title: {
					text: metricLabels['circuit_depth'],
					font: {
						size: 14,
						color: isDarkMode ? '#fff' : '#333',
						family: 'Arial, sans-serif',
						weight: 600,
					},
					standoff: 15,
				},
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
				autorange: true,
				rangemode: 'tozero' as const,
			},
		};
	}

	const config: Partial<Config> = {
		responsive: true,
		displayModeBar: true,
		modeBarButtonsToRemove: [
			'lasso2d',
			'select2d',
			'autoScale2d',
			'resetScale2d',
		],
		displaylogo: false,
		toImageButtonOptions: {
			filename: 'quantum_performance_chart',
			width: 1200,
			height: 800,
		},
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
			{/* Control panel - updated to a more modern layout */}
			<div className="mb-4 flex justify-between items-center">
				<Typography
					variant="subtitle1"
					gutterBottom
					sx={{ color: theme.palette.text.primary }}
				>
					{title}
					<Tooltip title={metricDescriptions[selectedMetric]} arrow>
						<InfoOutlined
							fontSize="small"
							sx={{
								verticalAlign: 'middle',
								ml: 0.5,
								color: isDarkMode ? '#aaa' : '#666',
							}}
						/>
					</Tooltip>
				</Typography>

				{/* Sort Order Control - Keep in top right */}
				<FormControl
					size="small"
					sx={{
						width: '200px',
						'.MuiOutlinedInput-root': {
							borderRadius: '8px',
							bgcolor: isDarkMode
								? 'rgba(33,33,33,0.9)'
								: 'rgba(255,255,255,0.9)',
						},
					}}
				>
					<InputLabel
						id="sort-order-label"
						sx={{ color: isDarkMode ? '#ddd' : '#333' }}
					>
						Sort Order
					</InputLabel>
					<Select
						labelId="sort-order-label"
						id="sort-order"
						value={sortOrder}
						label="Sort Order"
						onChange={handleSortChange}
						sx={{ color: isDarkMode ? 'white' : 'black' }}
					>
						<MenuItem value="default">Default Order</MenuItem>
						<MenuItem value="asc">
							<Box sx={{ display: 'flex', alignItems: 'center' }}>
								<ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
								<span>Low to High</span>
							</Box>
						</MenuItem>
						<MenuItem value="desc">
							<Box sx={{ display: 'flex', alignItems: 'center' }}>
								<ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} />
								<span>High to Low</span>
							</Box>
						</MenuItem>
					</Select>
				</FormControl>
			</div>

			{/* Horizontal Controls layout */}
			<div className="flex flex-wrap gap-4 mb-4">
				{/* Chart type selector */}
				<Card
					className={`
						relative
						z-10
						p-2
						transition-all
						duration-300
						shadow-md
						${isDarkMode ? 'bg-[#121212]/80' : 'bg-[#FAFAFA]'}
						hover:shadow-xl
						hover:bg-white/30 dark:hover:bg-[#212121]/40
						group
						flex-1
						min-w-[150px]
						rounded-xl
					`}
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

				{/* Metric selector */}
				<Card
					className={`
						relative
						z-10
						p-2
						transition-all
						duration-300
						shadow-md
						${isDarkMode ? 'bg-[#121212]/80' : 'bg-[#FAFAFA]'}
						hover:shadow-xl
						hover:bg-white/30 dark:hover:bg-[#212121]/40
						group
						flex-1
						min-w-[150px]
						rounded-xl
					`}
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
							>
								<MenuItem value="qpu_time_sec">QPU Time</MenuItem>
								<MenuItem value="circuit_depth">Circuit Depth</MenuItem>
								<MenuItem value="total_gate_count">Total Gate Count</MenuItem>
								<MenuItem value="success_rate">Success Rate</MenuItem>
								<MenuItem value="confidence">Confidence</MenuItem>
							</Select>
						</FormControl>
					</CardContent>
				</Card>

				{/* Backend selector */}
				<Card
					className={`
						relative
						z-10
						p-2
						transition-all
						duration-300
						shadow-md
						${isDarkMode ? 'bg-[#121212]/80' : 'bg-[#FAFAFA]'}
						hover:shadow-xl
						hover:bg-white/30 dark:hover:bg-[#212121]/40
						group
						flex-1
						min-w-[150px]
						rounded-xl
					`}
				>
					<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
						<Typography
							variant="subtitle2"
							gutterBottom
							sx={{ display: 'flex', alignItems: 'center' }}
						>
							Backend Type
						</Typography>
						<FormControl fullWidth size="small">
							<Select
								value={selectedBackend}
								onChange={handleBackendChange}
								displayEmpty
								variant="outlined"
							>
								<MenuItem value="all">
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
									>
										<span>All Backends</span>
									</div>
								</MenuItem>
								<MenuItem value="simulator">
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
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
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
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
					</CardContent>
				</Card>
			</div>

			{/* Add backends info if filtering */}
			{selectedBackend !== 'all' && (
				<Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
					<Typography variant="body2" color="text.secondary">
						Showing only:
					</Typography>
					<Chip
						icon={
							selectedBackend === 'simulator' ? <StorageIcon /> : <MemoryIcon />
						}
						label={
							selectedBackend === 'simulator'
								? 'Simulator Results'
								: 'Hardware Results'
						}
						color={selectedBackend === 'simulator' ? 'info' : 'success'}
						size="small"
						variant="outlined"
					/>
				</Box>
			)}

			<Plot
				ref={plotRef}
				data={plotData}
				layout={{
					...layout,
					autosize: true,
					responsive: true,
				}}
				config={config}
				style={{ width: '100%', height: 'auto' }}
				useResizeHandler={true}
				onInitialized={(figure) => {
					// When the plot is first initialized, make sure it's correctly sized
					if (plotRef.current && plotRef.current.el) {
						setTimeout(() => {
							if (plotRef.current && plotRef.current.handleResize) {
								plotRef.current.handleResize();
							}
						}, 50);
					}
				}}
				onUpdate={(figure) => {
					// After each update, ensure the plot is properly sized
					if (plotRef.current && plotRef.current.el) {
						setTimeout(() => {
							if (plotRef.current && plotRef.current.handleResize) {
								plotRef.current.handleResize();
							}
						}, 50);
					}
				}}
			/>
		</>
	);
};

export default QuantumResultsChart;
