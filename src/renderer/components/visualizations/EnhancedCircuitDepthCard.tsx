import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from 'react';
import Plot from 'react-plotly.js';
import { ProcessedQuantumData } from '../../utils/dataProcessingUtils';
import { useTheme } from '@mui/material/styles';
import {
	Skeleton,
	Box,
	Typography,
	Paper,
	Tooltip,
	Grid,
	FormControl,
	Select,
	MenuItem,
	InputLabel,
	ToggleButton,
	ToggleButtonGroup,
	Chip,
	Tabs,
	Tab,
	IconButton,
	Card,
	CardHeader,
	CardContent,
	Collapse,
	Divider,
	Stack,
	ButtonGroup,
	Button,
} from '@mui/material';
// Import Plotly types
import { Data, Layout, AxisType } from 'plotly.js';

// Icons
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GridViewIcon from '@mui/icons-material/GridView';
import TimelineIcon from '@mui/icons-material/Timeline';
import HeatmapIcon from '@mui/icons-material/Grain';
import BoxPlotIcon from '@mui/icons-material/AccountTree';
import ScienceIcon from '@mui/icons-material/Science';
import SearchIcon from '@mui/icons-material/Search';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// Conditional logging helper
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

// Type definitions
interface EnhancedCircuitDepthCardProps {
	data: ProcessedQuantumData[];
	loading?: boolean;
	height?: number;
	onViewDetails?: (runId: string) => void;
	chartRef?: React.RefObject<any>;
}

type ChartType =
	| 'boxplot'
	| 'scatter'
	| 'heatmap'
	| 'violin'
	| 'parallel'
	| 'multiples';

// Viridis color scale (custom implementation)
const viridisColorscale = [
	[0, 'rgb(68,1,84)'],
	[0.1, 'rgb(72,35,116)'],
	[0.2, 'rgb(64,67,135)'],
	[0.3, 'rgb(52,94,141)'],
	[0.4, 'rgb(41,120,142)'],
	[0.5, 'rgb(32,144,140)'],
	[0.6, 'rgb(34,167,132)'],
	[0.7, 'rgb(68,190,112)'],
	[0.8, 'rgb(121,209,81)'],
	[0.9, 'rgb(189,222,38)'],
	[1.0, 'rgb(253,231,37)'],
];

// Extract string values from viridis colorscale for use in colorway
const viridisColors: string[] = viridisColorscale.map(
	(color) => color[1] as string
);

// Create a type for our plot configuration that properly handles Layout
interface PlotConfig {
	data: Data[];
	layout: Partial<Layout>;
}

const EnhancedCircuitDepthCard: React.FC<EnhancedCircuitDepthCardProps> = ({
	data,
	loading = false,
	height = 600,
	onViewDetails,
	chartRef,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const localPlotRef = useRef<any>(null);
	const plotRef = chartRef || localPlotRef;
	const prevDataRef = useRef<ProcessedQuantumData[]>([]);

	// State for the enhanced card
	const [expanded, setExpanded] = useState<boolean>(true);
	const [selectedChartType, setSelectedChartType] =
		useState<ChartType>('boxplot');
	const [chartWidth, setChartWidth] = useState<number>(0);

	// Statistics for circuit depth
	const depthStats = useMemo(() => {
		if (!data || data.length === 0)
			return { min: 0, median: 0, max: 0, stdDev: 0 };

		const depths = data.map((d) => d.circuit_depth || 0).filter((d) => d > 0);
		if (depths.length === 0) return { min: 0, median: 0, max: 0, stdDev: 0 };

		depths.sort((a, b) => a - b);

		const min = depths[0];
		const max = depths[depths.length - 1];
		let median;
		if (depths.length % 2 === 0) {
			median = (depths[depths.length / 2 - 1] + depths[depths.length / 2]) / 2;
		} else {
			median = depths[Math.floor(depths.length / 2)];
		}

		// Calculate standard deviation
		const mean = depths.reduce((sum, val) => sum + val, 0) / depths.length;
		const stdDev = Math.sqrt(
			depths.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
				depths.length
		);

		return { min, median, max, stdDev };
	}, [data]);

	// Log only when data actually changes (not just reference)
	useEffect(() => {
		const hasDataChanged =
			data !== prevDataRef.current &&
			(data.length !== prevDataRef.current.length ||
				JSON.stringify(data) !== JSON.stringify(prevDataRef.current));

		if (hasDataChanged) {
			log('Circuit depth card data changed:', data.length);
			prevDataRef.current = data;
		}
	}, [data]);

	// Handle window resize events - using a more efficient approach
	useEffect(() => {
		const handleResize = () => {
			if (plotRef.current && plotRef.current.el) {
				const containerWidth = plotRef.current.el.clientWidth;
				if (containerWidth !== chartWidth) {
					setChartWidth(containerWidth);
					if (plotRef.current.el._fullLayout) {
						plotRef.current.handleResize();
					}
				}
			}
		};

		// Use resize observer instead of window event when possible
		let resizeObserver: ResizeObserver | null = null;
		if (plotRef.current && plotRef.current.el && window.ResizeObserver) {
			resizeObserver = new ResizeObserver(handleResize);
			resizeObserver.observe(plotRef.current.el);
		} else {
			window.addEventListener('resize', handleResize);
		}

		// Initial size check
		setTimeout(handleResize, 0);

		return () => {
			if (resizeObserver) {
				if (plotRef.current && plotRef.current.el) {
					resizeObserver.unobserve(plotRef.current.el);
				}
				resizeObserver.disconnect();
			} else {
				window.removeEventListener('resize', handleResize);
			}
		};
	}, [height, chartWidth, plotRef]);

	// Group data by algorithm
	const dataByAlgorithm = useMemo(() => {
		const groups: { [key: string]: ProcessedQuantumData[] } = {};
		if (!data || data.length === 0) return groups;

		data.forEach((item) => {
			const alg = item.algorithm || 'unknown';
			if (!groups[alg]) groups[alg] = [];
			groups[alg].push(item);
		});

		return groups;
	}, [data]);

	// Get unique backends
	const backends = useMemo(() => {
		const backendSet = new Set<string>();
		data.forEach((item) => {
			if (item.backend_used) backendSet.add(item.backend_used);
		});
		return Array.from(backendSet);
	}, [data]);

	// Handle chart type change - memoized
	const handleChartTypeChange = useCallback(
		(event: React.MouseEvent<HTMLElement>, newChartType: ChartType | null) => {
			if (newChartType !== null) {
				setSelectedChartType(newChartType);
			}
		},
		[]
	);

	// Export chart data - memoized
	const handleExport = useCallback(
		(format: 'csv' | 'svg') => {
			if (!data || data.length === 0) return;

			if (format === 'csv') {
				const headers = [
					'Algorithm',
					'Backend',
					'CircuitDepth',
					'ExecutionTime',
					'TotalGates',
					'SuccessRate',
					'Timestamp',
				];
				const csvRows = [headers.join(',')];

				data.forEach((item) => {
					const row = [
						item.algorithm || 'unknown',
						item.backend_used || 'unknown',
						item.circuit_depth || 0,
						item.qpu_time_sec || 0,
						item.total_gate_count || 0,
						item.success_rate || 0,
						item.timestamp || '',
					];
					csvRows.push(row.join(','));
				});

				const csvContent = csvRows.join('\n');
				const blob = new Blob([csvContent], {
					type: 'text/csv;charset=utf-8;',
				});
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.setAttribute('download', 'circuit_depth_data.csv');
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			} else if (format === 'svg') {
				if (plotRef.current) {
					const svgData =
						plotRef.current.el.querySelector('.main-svg')?.outerHTML;
					if (svgData) {
						const blob = new Blob([svgData], {
							type: 'image/svg+xml;charset=utf-8',
						});
						const url = URL.createObjectURL(blob);
						const link = document.createElement('a');
						link.href = url;
						link.setAttribute('download', 'circuit_depth_chart.svg');
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
					}
				}
			}
		},
		[data, plotRef]
	);

	// Generate the appropriate plot data based on chart type - heavily memoized
	const plotConfig = useMemo(() => {
		if (!data || data.length === 0) {
			return {
				data: [],
				layout: { title: 'No data available' } as Partial<Layout>,
			};
		}

		// Common layout configuration
		const baseLayout: Partial<Layout> = {
			margin: { l: 60, r: 30, t: 30, b: 60 },
			paper_bgcolor: isDarkMode
				? 'rgba(33,33,33,0.5)'
				: 'rgba(255,255,255,0.5)',
			plot_bgcolor: isDarkMode ? 'rgba(33,33,33,0.2)' : 'rgba(255,255,255,0.2)',
			font: {
				family: 'Arial, sans-serif',
				size: 12,
				color: isDarkMode ? '#FFFFFF' : '#000000',
			},
			hovermode: 'closest',
			colorway: viridisColors,
			showlegend: true,
			legend: {
				orientation: 'h',
				y: -0.2,
				x: 0.5,
				xanchor: 'center',
			},
			modebar: {
				orientation: 'v' as 'v',
				bgcolor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
				color: isDarkMode ? '#fff' : '#333',
				activecolor: '#9747FF',
			},
			hoverlabel: {
				bgcolor: isDarkMode ? '#333' : '#FFF',
				font: { color: isDarkMode ? '#FFF' : '#000' },
				bordercolor: '#9747FF',
			},
		};

		// Generate plot data based on selected chart type
		switch (selectedChartType) {
			case 'boxplot': {
				const plotData: Data[] = Object.entries(dataByAlgorithm).map(
					([algorithm, items]) => {
						return {
							type: 'box',
							name: algorithm,
							y: items.map((item) => item.circuit_depth || 0),
							boxpoints: 'outliers',
							marker: {
								color:
									algorithm === 'shor'
										? viridisColors[8]
										: algorithm === 'grover'
										? viridisColors[4]
										: viridisColors[0],
								opacity: 0.8,
								outliercolor: '#9747FF',
							},
							boxmean: true,
							hoverinfo: 'y+name',
							hovertemplate:
								'Algorithm: %{name}<br>Circuit Depth: %{y}<extra></extra>',
						} as Data;
					}
				);

				return {
					data: plotData,
					layout: {
						...baseLayout,
						title: 'Circuit Depth Distribution by Algorithm',
						yaxis: {
							title: 'Circuit Depth',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
							zeroline: false,
						},
						xaxis: {
							title: 'Algorithm',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
					} as Partial<Layout>,
				};
			}

			case 'scatter': {
				const plotData: Data[] = Object.entries(dataByAlgorithm).map(
					([algorithm, items]) => {
						return {
							type: 'scatter',
							mode: 'markers',
							name: algorithm,
							x: items.map((item) => item.circuit_depth || 0),
							y: items.map((item) => item.qpu_time_sec || 0),
							marker: {
								size: items.map((item) =>
									Math.min(Math.max((item.shots || 100) / 50, 5), 30)
								),
								color: items.map((item) => item.success_rate || 0),
								colorscale: viridisColorscale,
								colorbar: {
									title: 'Success Rate',
									thickness: 15,
								},
								opacity: 0.8,
								line: {
									color: isDarkMode ? '#333' : '#FFF',
									width: 1,
								},
							},
							hoverinfo: 'text',
							hovertext: items.map(
								(item) =>
									`Algorithm: ${item.algorithm}<br>` +
									`Circuit Depth: ${item.circuit_depth}<br>` +
									`Execution Time: ${item.qpu_time_sec?.toFixed(3)} sec<br>` +
									`Shots: ${item.shots}<br>` +
									`Success Rate: ${(item.success_rate || 0).toFixed(2)}%`
							),
						} as Data;
					}
				);

				return {
					data: plotData,
					layout: {
						...baseLayout,
						title: 'Circuit Depth vs. Execution Time',
						xaxis: {
							title: 'Circuit Depth',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
						yaxis: {
							title: 'Execution Time (seconds)',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
					},
				};
			}

			case 'heatmap': {
				// Create heatmap data structure
				const algorithms = Object.keys(dataByAlgorithm);

				const zValues: number[][] = [];
				const textValues: string[][] = [];

				algorithms.forEach((algorithm) => {
					const row: number[] = [];
					const textRow: string[] = [];

					backends.forEach((backend) => {
						const relevantData = dataByAlgorithm[algorithm].filter(
							(item) => item.backend_used === backend
						);

						if (relevantData.length > 0) {
							const avgDepth =
								relevantData.reduce(
									(sum, item) => sum + (item.circuit_depth || 0),
									0
								) / relevantData.length;
							row.push(avgDepth);

							const details =
								`Algorithm: ${algorithm}<br>` +
								`Backend: ${backend}<br>` +
								`Avg. Circuit Depth: ${avgDepth.toFixed(1)}<br>` +
								`Samples: ${relevantData.length}`;

							textRow.push(details);
						} else {
							row.push(0);
							textRow.push(`No data for ${algorithm} on ${backend}`);
						}
					});

					zValues.push(row);
					textValues.push(textRow);
				});

				// Cast to unknown first then to Data to avoid type conflicts
				const heatmapData: Data[] = [
					{
						type: 'heatmap',
						z: zValues,
						x: backends,
						y: algorithms,
						colorscale: viridisColorscale,
						hoverinfo: 'text',
						text: textValues as any, // Cast to any to avoid text type incompatibility
						showscale: true,
						colorbar: {
							title: 'Avg. Circuit Depth',
							thickness: 15,
						},
					} as unknown as Data,
				];

				return {
					data: heatmapData,
					layout: {
						...baseLayout,
						title: 'Average Circuit Depth by Algorithm and Backend',
						xaxis: {
							title: 'Backend',
							tickangle: -45,
						},
						yaxis: {
							title: 'Algorithm',
						},
					},
				};
			}

			case 'violin': {
				const plotData: Data[] = Object.entries(dataByAlgorithm).map(
					([algorithm, items]) => {
						return {
							type: 'violin',
							name: algorithm,
							y: items.map((item) => item.circuit_depth || 0),
							box: {
								visible: true,
							},
							meanline: {
								visible: true,
							},
							line: {
								color:
									algorithm === 'shor'
										? viridisColors[8]
										: algorithm === 'grover'
										? viridisColors[4]
										: viridisColors[0],
							},
							fillcolor:
								algorithm === 'shor'
									? 'rgba(121,209,81,0.5)'
									: algorithm === 'grover'
									? 'rgba(41,120,142,0.5)'
									: 'rgba(68,1,84,0.5)',
							hoverinfo: 'y+name',
							hovertemplate:
								'Algorithm: %{name}<br>Circuit Depth: %{y}<extra></extra>',
							points: 'all',
						} as Data;
					}
				);

				return {
					data: plotData,
					layout: {
						...baseLayout,
						title: 'Circuit Depth Distribution (Violin Plot)',
						yaxis: {
							title: 'Circuit Depth',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
						xaxis: {
							title: 'Algorithm',
						},
					},
				};
			}

			case 'parallel': {
				// Prepare data for parallel coordinates
				const dimensions = [
					{
						label: 'Circuit Depth',
						values: data.map((d) => d.circuit_depth || 0),
						range: [
							0,
							Math.max(...data.map((d) => d.circuit_depth || 0)) * 1.1,
						],
					},
					{
						label: 'Total Gates',
						values: data.map((d) => d.total_gate_count || 0),
						range: [
							0,
							Math.max(...data.map((d) => d.total_gate_count || 0)) * 1.1,
						],
					},
					{
						label: 'Execution Time (s)',
						values: data.map((d) => d.qpu_time_sec || 0),
						range: [0, Math.max(...data.map((d) => d.qpu_time_sec || 0)) * 1.1],
					},
					{
						label: 'Success Rate (%)',
						values: data.map((d) => d.success_rate || 0),
						range: [0, 100],
					},
				];

				// Create a color array based on algorithm
				const algorithmSet = new Set(data.map((d) => d.algorithm || 'unknown'));
				const algorithms = Array.from(algorithmSet);
				const colors = data.map(
					(d) =>
						algorithms.indexOf(d.algorithm || 'unknown') /
						Math.max(1, algorithms.length - 1)
				);

				const parallelData: Data[] = [
					{
						type: 'parcoords',
						line: {
							color: colors,
							colorscale: viridisColorscale,
							showscale: true,
							colorbar: {
								title: 'Algorithm Index',
								thickness: 15,
							},
						},
						dimensions: dimensions as any, // Cast to any to avoid dimensions type incompatibility
						hoverinfo: 'none',
					} as unknown as Data,
				];

				return {
					data: parallelData,
					layout: {
						title: 'Parallel Coordinates View',
						showlegend: false,
						margin: { l: 120, r: 120, t: 60, b: 40 },
					} as Partial<Layout>,
				};
			}

			case 'multiples': {
				// Create small multiple time series plots
				const dataOverTime: Data[] = Object.entries(dataByAlgorithm).map(
					([algorithm, items]) => {
						// Sort by timestamp
						const sortedItems = [...items].sort(
							(a, b) =>
								new Date(a.timestamp || '').getTime() -
								new Date(b.timestamp || '').getTime()
						);

						return {
							type: 'scatter',
							mode: 'lines+markers',
							name: algorithm,
							x: sortedItems.map((item) => new Date(item.timestamp || '')),
							y: sortedItems.map((item) => item.circuit_depth || 0),
							line: {
								color:
									algorithm === 'shor'
										? viridisColors[8]
										: algorithm === 'grover'
										? viridisColors[4]
										: viridisColors[0],
								width: 2,
							},
							marker: {
								size: 6,
								color:
									algorithm === 'shor'
										? viridisColors[9]
										: algorithm === 'grover'
										? viridisColors[5]
										: viridisColors[1],
							},
							hoverinfo: 'text',
							hovertext: sortedItems.map(
								(item) =>
									`Algorithm: ${item.algorithm}<br>` +
									`Date: ${new Date(
										item.timestamp || ''
									).toLocaleString()}<br>` +
									`Circuit Depth: ${item.circuit_depth}<br>` +
									`Backend: ${item.backend_used}`
							),
						} as Data;
					}
				);

				// Create a layout object with proper types
				const multLayout: Partial<Layout> = {
					...baseLayout,
					title: 'Circuit Depth Over Time by Algorithm',
					xaxis: {
						title: 'Date',
						// This is the key change - using 'date' as a proper AxisType
						type: 'date' as AxisType,
						gridcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
					},
					yaxis: {
						title: 'Circuit Depth',
						gridcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
					},
				};

				return {
					data: dataOverTime,
					layout: multLayout,
				};
			}

			default:
				return {
					data: [],
					layout: { title: 'Select a chart type' } as Partial<Layout>,
				};
		}
	}, [data, selectedChartType, isDarkMode, dataByAlgorithm, backends]);

	// Memoized KPI strip to prevent re-renders
	const kpiStrip = useMemo(
		() => (
			<Box
				sx={{
					mb: 2,
					p: 2,
					backgroundColor: isDarkMode
						? 'rgba(33,33,33,0.7)'
						: 'rgba(250,250,250,0.7)',
					borderRadius: '8px',
					border: `1px solid ${
						isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
					}`,
				}}
			>
				<Grid container spacing={2}>
					<Grid item xs={3}>
						<Box sx={{ textAlign: 'center' }}>
							<Typography variant="caption" color="text.secondary">
								Min Depth
							</Typography>
							<Typography
								variant="h6"
								sx={{ color: viridisColors[1], fontWeight: 'bold' }}
							>
								{depthStats.min}
							</Typography>
						</Box>
					</Grid>
					<Grid item xs={3}>
						<Box sx={{ textAlign: 'center' }}>
							<Typography variant="caption" color="text.secondary">
								Median Depth
							</Typography>
							<Typography
								variant="h6"
								sx={{ color: viridisColors[5], fontWeight: 'bold' }}
							>
								{depthStats.median.toFixed(0)}
							</Typography>
						</Box>
					</Grid>
					<Grid item xs={3}>
						<Box sx={{ textAlign: 'center' }}>
							<Typography variant="caption" color="text.secondary">
								Max Depth
							</Typography>
							<Typography
								variant="h6"
								sx={{ color: viridisColors[9], fontWeight: 'bold' }}
							>
								{depthStats.max}
							</Typography>
						</Box>
					</Grid>
					<Grid item xs={3}>
						<Box sx={{ textAlign: 'center' }}>
							<Typography variant="caption" color="text.secondary">
								Std Deviation
							</Typography>
							<Typography
								variant="h6"
								sx={{ color: '#9747FF', fontWeight: 'bold' }}
							>
								{depthStats.stdDev.toFixed(1)}
							</Typography>
						</Box>
					</Grid>
				</Grid>
			</Box>
		),
		[depthStats, isDarkMode]
	);

	// Memoized controls to prevent re-renders
	const controls = useMemo(
		() => (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					mb: 2,
				}}
			>
				<ToggleButtonGroup
					value={selectedChartType}
					exclusive
					onChange={handleChartTypeChange}
					aria-label="chart type"
					size="small"
					sx={{
						backgroundColor: isDarkMode
							? 'rgba(33,33,33,0.7)'
							: 'rgba(250,250,250,0.7)',
						borderRadius: '24px',
						'& .MuiToggleButton-root.Mui-selected': {
							color: '#fff',
							backgroundColor: '#9747FF',
						},
						'& .MuiToggleButton-root': {
							border: 0,
							borderRadius: '24px',
							mx: 0.5,
						},
					}}
				>
					<ToggleButton value="boxplot" aria-label="box plot" title="Box Plot">
						<BoxPlotIcon fontSize="small" />
					</ToggleButton>
					<ToggleButton
						value="scatter"
						aria-label="scatter plot"
						title="Scatter Plot"
					>
						<ScatterPlotIcon fontSize="small" />
					</ToggleButton>
					<ToggleButton value="heatmap" aria-label="heatmap" title="Heatmap">
						<HeatmapIcon fontSize="small" />
					</ToggleButton>
					<ToggleButton
						value="violin"
						aria-label="violin plot"
						title="Violin Plot"
					>
						<ShowChartIcon fontSize="small" />
					</ToggleButton>
					<ToggleButton
						value="parallel"
						aria-label="parallel coordinates"
						title="Parallel Coordinates"
					>
						<ViewColumnIcon fontSize="small" />
					</ToggleButton>
					<ToggleButton
						value="multiples"
						aria-label="small multiples"
						title="Small Multiples"
					>
						<GridViewIcon fontSize="small" />
					</ToggleButton>
				</ToggleButtonGroup>

				<ButtonGroup
					variant="outlined"
					size="small"
					sx={{
						'& .MuiButton-root': {
							borderColor: isDarkMode
								? 'rgba(255,255,255,0.3)'
								: 'rgba(0,0,0,0.23)',
							color: isDarkMode ? '#fff' : '#000',
						},
						'& .MuiButton-root:hover': {
							backgroundColor: isDarkMode
								? 'rgba(255,255,255,0.05)'
								: 'rgba(0,0,0,0.05)',
							borderColor: isDarkMode
								? 'rgba(255,255,255,0.5)'
								: 'rgba(0,0,0,0.5)',
						},
					}}
				>
					<Button
						startIcon={<DownloadIcon />}
						onClick={() => handleExport('csv')}
						aria-label="Export CSV"
						title="Export as CSV"
					>
						CSV
					</Button>
					<Button
						startIcon={<DownloadIcon />}
						onClick={() => handleExport('svg')}
						aria-label="Export SVG"
						title="Export as SVG"
					>
						SVG
					</Button>
				</ButtonGroup>
			</Box>
		),
		[selectedChartType, handleChartTypeChange, isDarkMode, handleExport]
	);

	// Memoized plot with stable layout
	const chartPlot = useMemo(() => {
		// Create a copy of the layout to avoid modifying the original
		const safeLayout = { ...plotConfig.layout } as Partial<Layout>;

		// Add the dimension properties
		safeLayout.width = chartWidth > 0 ? chartWidth : undefined;
		safeLayout.height = height;
		safeLayout.autosize = chartWidth <= 0;

		return (
			<Plot
				ref={plotRef}
				data={plotConfig.data}
				layout={safeLayout}
				config={{
					displayModeBar: true,
					displaylogo: false,
					responsive: true,
					toImageButtonOptions: {
						format: 'svg',
						filename: 'circuit_depth_chart',
						width: 1200,
						height: 800,
					},
					modeBarButtonsToRemove: [
						'lasso2d',
						'select2d',
						'autoScale2d',
						'resetScale2d',
						'toggleSpikelines',
					],
				}}
				useResizeHandler={true}
				className="plot-container"
				style={{ width: '100%', height: '100%' }}
			/>
		);
	}, [plotConfig, chartWidth, height, plotRef]);

	return (
		<Card
			sx={{
				backgroundColor: isDarkMode ? '#212121' : '#E9E9E9',
				borderRadius: '12px',
				overflow: 'hidden',
			}}
		>
			<CardHeader
				title={
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						<BarChartIcon sx={{ color: '#9747FF' }} />
						<Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
							Circuit Depth Comparison
						</Typography>
					</Box>
				}
				action={
					<IconButton
						onClick={() => setExpanded(!expanded)}
						aria-expanded={expanded}
						aria-label="toggle view"
					>
						{expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
					</IconButton>
				}
				sx={{
					p: 2,
					backgroundColor: isDarkMode
						? 'rgba(33,33,33,0.7)'
						: 'rgba(250,250,250,0.7)',
					borderBottom: `1px solid ${
						isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
					}`,
				}}
			/>

			<Collapse in={expanded} timeout="auto" unmountOnExit>
				<CardContent sx={{ p: 3 }}>
					{kpiStrip}
					{controls}

					{loading ? (
						<Skeleton
							variant="rectangular"
							height={height}
							width="100%"
							sx={{
								borderRadius: '8px',
								backgroundColor: isDarkMode
									? 'rgba(255,255,255,0.1)'
									: 'rgba(0,0,0,0.1)',
							}}
						/>
					) : (
						<Box
							sx={{
								height: height,
								width: '100%',
								position: 'relative',
								'& .plot-container': {
									borderRadius: '8px',
									overflow: 'hidden',
								},
							}}
						>
							{chartPlot}
						</Box>
					)}
				</CardContent>
			</Collapse>
		</Card>
	);
};

// Wrap component with React.memo to prevent unnecessary re-renders when props haven't changed
export default React.memo(EnhancedCircuitDepthCard, (prevProps, nextProps) => {
	// Only re-render if loading state changes or data actually changes
	if (prevProps.loading !== nextProps.loading) {
		return false; // Different loading state, should re-render
	}

	// If the reference is the same, we can skip render
	if (prevProps.data === nextProps.data) {
		return true; // Same data reference, no need to re-render
	}

	// If data length is different, re-render
	if (prevProps.data.length !== nextProps.data.length) {
		return false;
	}

	// If all other conditions met, do a shallow comparison of data items by unique identifiers
	// This avoids expensive deep comparisons
	const prevIds = new Set(prevProps.data.map((item) => item.runId));
	const nextIds = new Set(nextProps.data.map((item) => item.runId));

	// Identical data identifiers, no need to re-render
	if (
		prevIds.size === nextIds.size &&
		[...prevIds].every((id) => nextIds.has(id))
	) {
		return true;
	}

	return false; // Data has changed, should re-render
});
