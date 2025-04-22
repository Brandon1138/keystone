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
	Box,
	Typography,
	Skeleton,
	Card,
	CardHeader,
	CardContent,
	Collapse,
	IconButton,
	Grid,
	Tooltip,
	ButtonGroup,
	Button,
	FormControl,
	Select,
	MenuItem,
	SelectChangeEvent,
	Chip,
	Divider,
	ToggleButtonGroup,
	ToggleButton,
} from '@mui/material';
// Import Plotly types
import { Data, Layout, AxisType } from 'plotly.js';

// Icons
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import MemoryIcon from '@mui/icons-material/Memory';
import WarningIcon from '@mui/icons-material/Warning';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import HeatmapIcon from '@mui/icons-material/Grain';
import BoxPlotIcon from '@mui/icons-material/AccountTree';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import StorageIcon from '@mui/icons-material/Storage';

// Conditional logging helper
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

// Type definitions
interface NoiseErrorDataCardProps {
	data: ProcessedQuantumData[];
	loading?: boolean;
	height?: number;
	onViewDetails?: (runId: string) => void;
	chartRef?: React.RefObject<any>;
}

type ChartType = 'boxplot' | 'scatter' | 'radar' | 'heatmap' | 'bar' | 'trend';

// Define tooltips for quantum metrics
const QuantumTooltips = {
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

// Viridis color scale
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

// Create a type for our plot configuration
interface PlotConfig {
	data: Data[];
	layout: Partial<Layout>;
}

const NoiseErrorDataCard: React.FC<NoiseErrorDataCardProps> = ({
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

	// State for the card
	const [expanded, setExpanded] = useState<boolean>(true);
	const [selectedChartType, setSelectedChartType] =
		useState<ChartType>('radar');
	const [chartWidth, setChartWidth] = useState<number>(0);
	const [selectedBackend, setSelectedBackend] = useState<string>('hardware');

	// Handle backend change
	const handleBackendChange = (event: SelectChangeEvent) => {
		setSelectedBackend(event.target.value);
	};

	// Filter data by backend type
	const filteredData = useMemo(() => {
		if (selectedBackend === 'all') return data;

		return data.filter((item) => {
			const isSimulator =
				item.backend_used?.toLowerCase().includes('simulator') ||
				item.backend_used?.toLowerCase().includes('sim') ||
				item.backend_used === 'aer_simulator';

			return selectedBackend === 'simulator' ? isSimulator : !isSimulator;
		});
	}, [data, selectedBackend]);

	// Group data by backend for better visualization
	const dataByBackend = useMemo(() => {
		const groups: { [key: string]: ProcessedQuantumData[] } = {};

		filteredData.forEach((item) => {
			const backend = item.backend_used || 'unknown';
			if (!groups[backend]) groups[backend] = [];
			groups[backend].push(item);
		});

		return groups;
	}, [filteredData]);

	// Get unique backends with noise data
	const backends = useMemo(() => {
		const backendSet = new Set<string>();

		filteredData.forEach((item) => {
			// Only include backends that have at least one noise metric
			if (
				item.backend_used &&
				(item.gate_error !== null ||
					item.readout_error !== null ||
					item.t1_time !== null ||
					item.t2_time !== null ||
					item.quantum_volume !== null)
			) {
				backendSet.add(item.backend_used);
			}
		});

		return Array.from(backendSet);
	}, [filteredData]);

	// Extract noise metrics
	const noiseMetrics = useMemo(() => {
		const metrics = {
			gate_error: [] as { backend: string; value: number }[],
			readout_error: [] as { backend: string; value: number }[],
			t1_time: [] as { backend: string; value: number }[],
			t2_time: [] as { backend: string; value: number }[],
			quantum_volume: [] as { backend: string; value: number }[],
		};

		// For each backend, average the metrics across all runs
		Object.entries(dataByBackend).forEach(([backend, items]) => {
			const backendMetrics = {
				gate_error: [] as number[],
				readout_error: [] as number[],
				t1_time: [] as number[],
				t2_time: [] as number[],
				quantum_volume: [] as number[],
			};

			// Collect all values for each metric
			items.forEach((item) => {
				if (item.gate_error !== null && item.gate_error !== undefined) {
					backendMetrics.gate_error.push(item.gate_error);
				}
				if (item.readout_error !== null && item.readout_error !== undefined) {
					backendMetrics.readout_error.push(item.readout_error);
				}
				if (item.t1_time !== null && item.t1_time !== undefined) {
					backendMetrics.t1_time.push(item.t1_time);
				}
				if (item.t2_time !== null && item.t2_time !== undefined) {
					backendMetrics.t2_time.push(item.t2_time);
				}
				if (item.quantum_volume !== null && item.quantum_volume !== undefined) {
					backendMetrics.quantum_volume.push(item.quantum_volume);
				}
			});

			// Calculate averages and add to the result
			if (backendMetrics.gate_error.length > 0) {
				const avg =
					backendMetrics.gate_error.reduce((sum, val) => sum + val, 0) /
					backendMetrics.gate_error.length;
				metrics.gate_error.push({ backend, value: avg });
			}
			if (backendMetrics.readout_error.length > 0) {
				const avg =
					backendMetrics.readout_error.reduce((sum, val) => sum + val, 0) /
					backendMetrics.readout_error.length;
				metrics.readout_error.push({ backend, value: avg });
			}
			if (backendMetrics.t1_time.length > 0) {
				const avg =
					backendMetrics.t1_time.reduce((sum, val) => sum + val, 0) /
					backendMetrics.t1_time.length;
				metrics.t1_time.push({ backend, value: avg });
			}
			if (backendMetrics.t2_time.length > 0) {
				const avg =
					backendMetrics.t2_time.reduce((sum, val) => sum + val, 0) /
					backendMetrics.t2_time.length;
				metrics.t2_time.push({ backend, value: avg });
			}
			if (backendMetrics.quantum_volume.length > 0) {
				const avg =
					backendMetrics.quantum_volume.reduce((sum, val) => sum + val, 0) /
					backendMetrics.quantum_volume.length;
				metrics.quantum_volume.push({ backend, value: avg });
			}
		});

		return metrics;
	}, [dataByBackend]);

	// Check if we have any noise data
	const hasNoiseData = useMemo(() => {
		return (
			noiseMetrics.gate_error.length > 0 ||
			noiseMetrics.readout_error.length > 0 ||
			noiseMetrics.t1_time.length > 0 ||
			noiseMetrics.t2_time.length > 0 ||
			noiseMetrics.quantum_volume.length > 0
		);
	}, [noiseMetrics]);

	// Log when data actually changes
	useEffect(() => {
		const hasDataChanged =
			data !== prevDataRef.current &&
			(data.length !== prevDataRef.current.length ||
				JSON.stringify(data) !== JSON.stringify(prevDataRef.current));

		if (hasDataChanged) {
			log('Noise error card data changed:', data.length);
			prevDataRef.current = data;
		}
	}, [data]);

	// Handle window resize
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

	// Handle chart type change
	const handleChartTypeChange = useCallback(
		(event: React.MouseEvent<HTMLElement>, newChartType: ChartType | null) => {
			if (newChartType !== null) {
				setSelectedChartType(newChartType);
			}
		},
		[]
	);

	// Export chart data
	const handleExport = useCallback(
		(format: 'csv' | 'svg') => {
			if (!filteredData || filteredData.length === 0) return;

			if (format === 'csv') {
				const headers = [
					'Backend',
					'GateError',
					'ReadoutError',
					'T1Time',
					'T2Time',
					'QuantumVolume',
					'Algorithm',
					'Timestamp',
				];
				const csvRows = [headers.join(',')];

				filteredData.forEach((item) => {
					const row = [
						item.backend_used || 'unknown',
						item.gate_error !== null ? item.gate_error : '',
						item.readout_error !== null ? item.readout_error : '',
						item.t1_time !== null ? item.t1_time : '',
						item.t2_time !== null ? item.t2_time : '',
						item.quantum_volume !== null ? item.quantum_volume : '',
						item.algorithm || 'unknown',
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
				link.setAttribute('download', 'noise_error_data.csv');
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
						link.setAttribute('download', 'noise_error_chart.svg');
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
					}
				}
			}
		},
		[filteredData, plotRef]
	);

	// Generate the appropriate plot data based on chart type
	const plotConfig = useMemo(() => {
		if (!filteredData || filteredData.length === 0 || !hasNoiseData) {
			return {
				data: [],
				layout: { title: 'No noise data available' } as Partial<Layout>,
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
			case 'radar': {
				// Radar/polar chart showing the noise metrics for each backend
				const plotData: Data[] = [];

				// Only include backends with at least some noise data
				const backendsWithData = backends.filter((backend) => {
					return (
						noiseMetrics.gate_error.some((item) => item.backend === backend) ||
						noiseMetrics.readout_error.some(
							(item) => item.backend === backend
						) ||
						noiseMetrics.t1_time.some((item) => item.backend === backend) ||
						noiseMetrics.t2_time.some((item) => item.backend === backend) ||
						noiseMetrics.quantum_volume.some((item) => item.backend === backend)
					);
				});

				// Normalize values for radar chart
				// For errors, lower is better so we'll invert the scale (1 - normalized value)
				// For T1, T2, and QV, higher is better

				// Find max values for normalization
				const maxGateError = Math.max(
					...noiseMetrics.gate_error.map((item) => item.value),
					0.1
				);
				const maxReadoutError = Math.max(
					...noiseMetrics.readout_error.map((item) => item.value),
					0.1
				);
				const maxT1 = Math.max(
					...noiseMetrics.t1_time.map((item) => item.value),
					1
				);
				const maxT2 = Math.max(
					...noiseMetrics.t2_time.map((item) => item.value),
					1
				);
				const maxQV = Math.max(
					...noiseMetrics.quantum_volume.map((item) => item.value),
					1
				);

				backendsWithData.forEach((backend, index) => {
					// Get values for this backend
					const gateError =
						noiseMetrics.gate_error.find((item) => item.backend === backend)
							?.value || 0;
					const readoutError =
						noiseMetrics.readout_error.find((item) => item.backend === backend)
							?.value || 0;
					const t1Time =
						noiseMetrics.t1_time.find((item) => item.backend === backend)
							?.value || 0;
					const t2Time =
						noiseMetrics.t2_time.find((item) => item.backend === backend)
							?.value || 0;
					const quantumVolume =
						noiseMetrics.quantum_volume.find((item) => item.backend === backend)
							?.value || 0;

					// Normalize and invert error metrics (1 is best, 0 is worst)
					const normalizedGateError =
						gateError > 0 ? 1 - gateError / maxGateError : 0;
					const normalizedReadoutError =
						readoutError > 0 ? 1 - readoutError / maxReadoutError : 0;

					// Normalize other metrics (1 is best, 0 is worst)
					const normalizedT1 = t1Time > 0 ? t1Time / maxT1 : 0;
					const normalizedT2 = t2Time > 0 ? t2Time / maxT2 : 0;
					const normalizedQV = quantumVolume > 0 ? quantumVolume / maxQV : 0;

					const trace: Data = {
						type: 'scatterpolar',
						name: backend,
						r: [
							normalizedGateError,
							normalizedReadoutError,
							normalizedT1,
							normalizedT2,
							normalizedQV,
						],
						theta: [
							'Gate Error (inv)',
							'Readout Error (inv)',
							'T₁ Time',
							'T₂ Time',
							'Quantum Volume',
						],
						fill: 'toself',
						line: {
							color: viridisColors[index % viridisColors.length],
							width: 2,
						},
						marker: {
							size: 8,
							color: viridisColors[index % viridisColors.length],
						},
						hoverinfo: 'text',
						hovertext: [
							`Backend: ${backend}<br>Gate Error: ${gateError.toFixed(
								4
							)}%<br>Normalized (Inverted): ${normalizedGateError.toFixed(2)}`,
							`Backend: ${backend}<br>Readout Error: ${readoutError.toFixed(
								4
							)}%<br>Normalized (Inverted): ${normalizedReadoutError.toFixed(
								2
							)}`,
							`Backend: ${backend}<br>T₁ Time: ${t1Time.toFixed(
								2
							)} μs<br>Normalized: ${normalizedT1.toFixed(2)}`,
							`Backend: ${backend}<br>T₂ Time: ${t2Time.toFixed(
								2
							)} μs<br>Normalized: ${normalizedT2.toFixed(2)}`,
							`Backend: ${backend}<br>Quantum Volume: ${quantumVolume}<br>Normalized: ${normalizedQV.toFixed(
								2
							)}`,
						],
					};

					plotData.push(trace);
				});

				return {
					data: plotData,
					layout: {
						...baseLayout,
						title: 'Normalized Quantum Hardware Metrics by Backend',
						polar: {
							radialaxis: {
								visible: true,
								range: [0, 1],
								tickfont: {
									size: 10,
									color: isDarkMode ? '#ddd' : '#333',
								},
							},
							angularaxis: {
								tickfont: {
									size: 11,
									color: isDarkMode ? '#ddd' : '#333',
								},
							},
							bgcolor: isDarkMode
								? 'rgba(33,33,33,0.1)'
								: 'rgba(255,255,255,0.1)',
						},
					} as Partial<Layout>,
				};
			}

			case 'bar': {
				// Bar chart showing specific metrics across backends
				const plotData: Data[] = [];

				// Gate Error
				if (noiseMetrics.gate_error.length > 0) {
					plotData.push({
						type: 'bar',
						name: 'Gate Error (%)',
						x: noiseMetrics.gate_error.map((item) => item.backend),
						y: noiseMetrics.gate_error.map((item) => item.value),
						marker: {
							color: viridisColors[2],
							opacity: 0.8,
						},
						hoverinfo: 'text',
						hovertext: noiseMetrics.gate_error.map(
							(item) =>
								`Backend: ${item.backend}<br>Gate Error: ${item.value.toFixed(
									4
								)}%`
						),
					} as Data);
				}

				// Readout Error
				if (noiseMetrics.readout_error.length > 0) {
					plotData.push({
						type: 'bar',
						name: 'Readout Error (%)',
						x: noiseMetrics.readout_error.map((item) => item.backend),
						y: noiseMetrics.readout_error.map((item) => item.value),
						marker: {
							color: viridisColors[5],
							opacity: 0.8,
						},
						hoverinfo: 'text',
						hovertext: noiseMetrics.readout_error.map(
							(item) =>
								`Backend: ${
									item.backend
								}<br>Readout Error: ${item.value.toFixed(4)}%`
						),
					} as Data);
				}

				return {
					data: plotData,
					layout: {
						...baseLayout,
						title: 'Error Rates by Quantum Backend',
						xaxis: {
							title: 'Backend',
							tickangle: -45,
							tickfont: {
								size: 11,
							},
						},
						yaxis: {
							title: 'Error Rate (%)',
							tickformat: '.3f',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
						barmode: 'group',
						bargap: 0.15,
						bargroupgap: 0.1,
					} as Partial<Layout>,
				};
			}

			case 'scatter': {
				// Scatter plot comparing T1 vs T2 times with Quantum Volume as marker size
				const plotData: Data[] = [];

				// Create a mapping of backends that have both T1 and T2
				const combinedData = backends
					.map((backend) => {
						const t1 = noiseMetrics.t1_time.find(
							(item) => item.backend === backend
						)?.value;
						const t2 = noiseMetrics.t2_time.find(
							(item) => item.backend === backend
						)?.value;
						const qv = noiseMetrics.quantum_volume.find(
							(item) => item.backend === backend
						)?.value;
						const gateError = noiseMetrics.gate_error.find(
							(item) => item.backend === backend
						)?.value;

						return {
							backend,
							t1,
							t2,
							qv,
							gateError,
						};
					})
					.filter((item) => item.t1 !== undefined && item.t2 !== undefined);

				if (combinedData.length > 0) {
					plotData.push({
						type: 'scatter',
						mode: 'markers',
						name: 'Quantum Backends',
						x: combinedData.map((item) => item.t1),
						y: combinedData.map((item) => item.t2),
						marker: {
							size: combinedData.map((item) =>
								item.qv ? Math.log2(item.qv) * 4 : 8
							),
							color: combinedData.map((item) => item.gateError || 0),
							colorscale: viridisColorscale,
							colorbar: {
								title: 'Gate Error (%)',
								thickness: 15,
							},
							line: {
								color: isDarkMode ? '#333' : '#fff',
								width: 1,
							},
						},
						hoverinfo: 'text',
						hovertext: combinedData.map(
							(item) =>
								`Backend: ${item.backend}<br>` +
								`T₁ Time: ${item.t1?.toFixed(2)} μs<br>` +
								`T₂ Time: ${item.t2?.toFixed(2)} μs<br>` +
								`Quantum Volume: ${item.qv || 'N/A'}<br>` +
								`Gate Error: ${item.gateError?.toFixed(4) || 'N/A'}%`
						),
					} as Data);
				}

				return {
					data: plotData,
					layout: {
						...baseLayout,
						title: 'Coherence Times by Quantum Backend',
						xaxis: {
							title: 'T₁ Time (μs)',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
						yaxis: {
							title: 'T₂ Time (μs)',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
						annotations: [
							{
								text: 'Marker size: log₂(Quantum Volume)',
								showarrow: false,
								x: 0.5,
								y: 1.1,
								xref: 'paper',
								yref: 'paper',
								font: {
									size: 10,
									color: isDarkMode ? '#ccc' : '#666',
								},
							},
						],
					} as Partial<Layout>,
				};
			}

			case 'boxplot': {
				// Boxplots for T1 and T2 times
				const plotData: Data[] = [];

				// T1 Times
				if (noiseMetrics.t1_time.length > 0) {
					// Group by backend type
					const backendTypes: { [key: string]: number[] } = {};

					for (const item of noiseMetrics.t1_time) {
						// Simplified backend categorization
						let type = 'Other';
						if (item.backend.includes('ibm_')) {
							type = 'IBM Quantum';
						} else if (item.backend.includes('sim')) {
							type = 'Simulator';
						}

						if (!backendTypes[type]) backendTypes[type] = [];
						backendTypes[type].push(item.value);
					}

					// Create a box plot for each type
					Object.entries(backendTypes).forEach(([type, values], index) => {
						plotData.push({
							type: 'box',
							name: `${type} - T₁`,
							y: values,
							boxpoints: 'all',
							jitter: 0.5,
							marker: {
								color: viridisColors[(index * 2) % viridisColors.length],
								opacity: 0.7,
							},
							hoverinfo: 'y+name',
							hovertemplate: `T₁ Time: %{y} μs<br>Backend Type: ${type}<extra></extra>`,
						} as Data);
					});
				}

				// T2 Times
				if (noiseMetrics.t2_time.length > 0) {
					// Group by backend type
					const backendTypes: { [key: string]: number[] } = {};

					for (const item of noiseMetrics.t2_time) {
						// Simplified backend categorization
						let type = 'Other';
						if (item.backend.includes('ibm_')) {
							type = 'IBM Quantum';
						} else if (item.backend.includes('sim')) {
							type = 'Simulator';
						}

						if (!backendTypes[type]) backendTypes[type] = [];
						backendTypes[type].push(item.value);
					}

					// Create a box plot for each type
					Object.entries(backendTypes).forEach(([type, values], index) => {
						plotData.push({
							type: 'box',
							name: `${type} - T₂`,
							y: values,
							boxpoints: 'all',
							jitter: 0.5,
							marker: {
								color: viridisColors[(index * 2 + 1) % viridisColors.length],
								opacity: 0.7,
							},
							hoverinfo: 'y+name',
							hovertemplate: `T₂ Time: %{y} μs<br>Backend Type: ${type}<extra></extra>`,
						} as Data);
					});
				}

				return {
					data: plotData,
					layout: {
						...baseLayout,
						title: 'Coherence Times Distribution by Backend Type',
						yaxis: {
							title: 'Time (μs)',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
						xaxis: {
							title: 'Backend Type',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
					} as Partial<Layout>,
				};
			}

			case 'heatmap': {
				// Heatmap of all metrics across backends
				const metrics = [
					'Gate Error (%)',
					'Readout Error (%)',
					'T₁ Time (μs)',
					'T₂ Time (μs)',
					'Quantum Volume',
				];

				// Only include backends with at least some noise data
				const backendsWithData = backends.filter((backend) => {
					return (
						noiseMetrics.gate_error.some((item) => item.backend === backend) ||
						noiseMetrics.readout_error.some(
							(item) => item.backend === backend
						) ||
						noiseMetrics.t1_time.some((item) => item.backend === backend) ||
						noiseMetrics.t2_time.some((item) => item.backend === backend) ||
						noiseMetrics.quantum_volume.some((item) => item.backend === backend)
					);
				});

				// Normalize values for heatmap
				// We invert gate_error and readout_error scales so that higher values are always better
				const zValues: number[][] = [];
				const textValues: string[][] = [];

				// Find max values for normalization
				const maxGateError = Math.max(
					...noiseMetrics.gate_error.map((item) => item.value),
					0.1
				);
				const maxReadoutError = Math.max(
					...noiseMetrics.readout_error.map((item) => item.value),
					0.1
				);
				const maxT1 = Math.max(
					...noiseMetrics.t1_time.map((item) => item.value),
					1
				);
				const maxT2 = Math.max(
					...noiseMetrics.t2_time.map((item) => item.value),
					1
				);
				const maxQV = Math.max(
					...noiseMetrics.quantum_volume.map((item) => item.value),
					1
				);

				metrics.forEach((metric, i) => {
					const row: number[] = [];
					const textRow: string[] = [];

					backendsWithData.forEach((backend) => {
						if (i === 0) {
							// Gate Error
							const value = noiseMetrics.gate_error.find(
								(item) => item.backend === backend
							)?.value;
							if (value !== undefined) {
								// Invert scale: lower error = better (higher) score
								const normalizedValue = 1 - value / maxGateError;
								row.push(normalizedValue);
								textRow.push(
									`Backend: ${backend}<br>Gate Error: ${value.toFixed(
										4
									)}%<br>Normalized (Inverted): ${normalizedValue.toFixed(2)}`
								);
							} else {
								row.push(0);
								textRow.push(`No Gate Error data for ${backend}`);
							}
						} else if (i === 1) {
							// Readout Error
							const value = noiseMetrics.readout_error.find(
								(item) => item.backend === backend
							)?.value;
							if (value !== undefined) {
								// Invert scale: lower error = better (higher) score
								const normalizedValue = 1 - value / maxReadoutError;
								row.push(normalizedValue);
								textRow.push(
									`Backend: ${backend}<br>Readout Error: ${value.toFixed(
										4
									)}%<br>Normalized (Inverted): ${normalizedValue.toFixed(2)}`
								);
							} else {
								row.push(0);
								textRow.push(`No Readout Error data for ${backend}`);
							}
						} else if (i === 2) {
							// T1 Time
							const value = noiseMetrics.t1_time.find(
								(item) => item.backend === backend
							)?.value;
							if (value !== undefined) {
								const normalizedValue = value / maxT1;
								row.push(normalizedValue);
								textRow.push(
									`Backend: ${backend}<br>T₁ Time: ${value.toFixed(
										2
									)} μs<br>Normalized: ${normalizedValue.toFixed(2)}`
								);
							} else {
								row.push(0);
								textRow.push(`No T₁ Time data for ${backend}`);
							}
						} else if (i === 3) {
							// T2 Time
							const value = noiseMetrics.t2_time.find(
								(item) => item.backend === backend
							)?.value;
							if (value !== undefined) {
								const normalizedValue = value / maxT2;
								row.push(normalizedValue);
								textRow.push(
									`Backend: ${backend}<br>T₂ Time: ${value.toFixed(
										2
									)} μs<br>Normalized: ${normalizedValue.toFixed(2)}`
								);
							} else {
								row.push(0);
								textRow.push(`No T₂ Time data for ${backend}`);
							}
						} else if (i === 4) {
							// Quantum Volume
							const value = noiseMetrics.quantum_volume.find(
								(item) => item.backend === backend
							)?.value;
							if (value !== undefined) {
								const normalizedValue = value / maxQV;
								row.push(normalizedValue);
								textRow.push(
									`Backend: ${backend}<br>Quantum Volume: ${value}<br>Normalized: ${normalizedValue.toFixed(
										2
									)}`
								);
							} else {
								row.push(0);
								textRow.push(`No Quantum Volume data for ${backend}`);
							}
						}
					});

					zValues.push(row);
					textValues.push(textRow);
				});

				const heatmapData: Data[] = [
					{
						type: 'heatmap',
						z: zValues,
						x: backendsWithData,
						y: metrics,
						colorscale: viridisColorscale,
						hoverinfo: 'text',
						text: textValues,
						showscale: true,
						colorbar: {
							title: 'Normalized Score<br>(Higher is Better)',
							thickness: 15,
						},
					} as unknown as Data,
				];

				return {
					data: heatmapData,
					layout: {
						...baseLayout,
						title: 'Normalized Quantum Hardware Metrics by Backend',
						xaxis: {
							title: 'Backend',
							tickangle: -45,
						},
						yaxis: {
							title: 'Metric',
						},
					} as Partial<Layout>,
				};
			}

			case 'trend': {
				// Time series plot showing how metrics evolve over time
				const plotData: Data[] = [];

				// Group data by timestamp (using the first 10 chars of ISO date to get day granularity)
				const timeSeriesData: { [key: string]: ProcessedQuantumData[] } = {};

				filteredData.forEach((item) => {
					if (item.timestamp) {
						const day = item.timestamp.substring(0, 10);
						if (!timeSeriesData[day]) timeSeriesData[day] = [];
						timeSeriesData[day].push(item);
					}
				});

				// Sort dates
				const sortedDates = Object.keys(timeSeriesData).sort();

				// Calculate average gate error over time
				if (sortedDates.length > 0) {
					const gateErrorTrace: Data = {
						type: 'scatter',
						mode: 'lines+markers',
						name: 'Gate Error (%)',
						x: sortedDates,
						y: sortedDates
							.map((date) => {
								const items = timeSeriesData[date].filter(
									(item) =>
										item.gate_error !== null && item.gate_error !== undefined
								);
								if (items.length === 0) return null;

								const avg =
									items.reduce((sum, item) => sum + (item.gate_error || 0), 0) /
									items.length;
								return avg;
							})
							.filter((val) => val !== null) as number[],
						line: { color: viridisColors[2], width: 2 },
						marker: { size: 8, symbol: 'circle' },
						hoverinfo: 'text',
						hovertext: sortedDates.map((date) => {
							const items = timeSeriesData[date].filter(
								(item) =>
									item.gate_error !== null && item.gate_error !== undefined
							);
							if (items.length === 0) return '';

							const avg =
								items.reduce((sum, item) => sum + (item.gate_error || 0), 0) /
								items.length;
							return `Date: ${date}<br>Avg Gate Error: ${avg.toFixed(
								4
							)}%<br>Backends: ${items.length}`;
						}),
					};

					// Type guard to check if y exists and has length before checking length
					if (
						gateErrorTrace.y &&
						Array.isArray(gateErrorTrace.y) &&
						gateErrorTrace.y.length > 0
					) {
						plotData.push(gateErrorTrace);
					}

					// Calculate average readout error over time
					const readoutErrorTrace: Data = {
						type: 'scatter',
						mode: 'lines+markers',
						name: 'Readout Error (%)',
						x: sortedDates,
						y: sortedDates
							.map((date) => {
								const items = timeSeriesData[date].filter(
									(item) =>
										item.readout_error !== null &&
										item.readout_error !== undefined
								);
								if (items.length === 0) return null;

								const avg =
									items.reduce(
										(sum, item) => sum + (item.readout_error || 0),
										0
									) / items.length;
								return avg;
							})
							.filter((val) => val !== null) as number[],
						line: { color: viridisColors[5], width: 2 },
						marker: { size: 8, symbol: 'square' },
						hoverinfo: 'text',
						hovertext: sortedDates.map((date) => {
							const items = timeSeriesData[date].filter(
								(item) =>
									item.readout_error !== null &&
									item.readout_error !== undefined
							);
							if (items.length === 0) return '';

							const avg =
								items.reduce(
									(sum, item) => sum + (item.readout_error || 0),
									0
								) / items.length;
							return `Date: ${date}<br>Avg Readout Error: ${avg.toFixed(
								4
							)}%<br>Backends: ${items.length}`;
						}),
					};

					// Type guard to check if y exists and has length before checking length
					if (
						readoutErrorTrace.y &&
						Array.isArray(readoutErrorTrace.y) &&
						readoutErrorTrace.y.length > 0
					) {
						plotData.push(readoutErrorTrace);
					}
				}

				return {
					data: plotData,
					layout: {
						...baseLayout,
						title: 'Error Rates Trend Over Time',
						xaxis: {
							title: 'Date',
							type: 'date' as AxisType,
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
						yaxis: {
							title: 'Error Rate (%)',
							gridcolor: isDarkMode
								? 'rgba(255,255,255,0.1)'
								: 'rgba(0,0,0,0.1)',
						},
					} as Partial<Layout>,
				};
			}

			default:
				return {
					data: [],
					layout: { title: 'Select a chart type' } as Partial<Layout>,
				};
		}
	}, [
		filteredData,
		selectedChartType,
		isDarkMode,
		backends,
		dataByBackend,
		noiseMetrics,
		hasNoiseData,
	]);

	// Fix the linter errors in the plotConfig function
	const fixedPlotConfig = useMemo(() => {
		// Fix for the 'gateErrorTrace.y' & 'readoutErrorTrace.y' possibly undefined errors
		const config = { ...plotConfig };

		// For trend chart type, make sure to only push traces with defined y values
		if (selectedChartType === 'trend' && config.data.length > 0) {
			// Filter out any traces with undefined y values
			// Use a type guard to check if y exists and is an array with elements
			config.data = config.data.filter((trace) => {
				return (
					'y' in trace &&
					trace.y !== undefined &&
					Array.isArray(trace.y) &&
					trace.y.length > 0
				);
			});
		}

		return config;
	}, [plotConfig, selectedChartType]);

	// Memoized KPI strip to show summary metrics
	const kpiStrip = useMemo(() => {
		if (!hasNoiseData) return null;

		const avgGateError =
			noiseMetrics.gate_error.length > 0
				? noiseMetrics.gate_error.reduce((sum, item) => sum + item.value, 0) /
				  noiseMetrics.gate_error.length
				: null;

		const avgReadoutError =
			noiseMetrics.readout_error.length > 0
				? noiseMetrics.readout_error.reduce(
						(sum, item) => sum + item.value,
						0
				  ) / noiseMetrics.readout_error.length
				: null;

		const avgT1 =
			noiseMetrics.t1_time.length > 0
				? noiseMetrics.t1_time.reduce((sum, item) => sum + item.value, 0) /
				  noiseMetrics.t1_time.length
				: null;

		const avgT2 =
			noiseMetrics.t2_time.length > 0
				? noiseMetrics.t2_time.reduce((sum, item) => sum + item.value, 0) /
				  noiseMetrics.t2_time.length
				: null;

		return (
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
					{avgGateError !== null && (
						<Grid item xs={6} sm={3}>
							<Box sx={{ textAlign: 'center' }}>
								<Typography variant="caption" color="text.secondary">
									Avg Gate Error
									<Tooltip title={QuantumTooltips.gateError} arrow>
										<InfoOutlinedIcon
											sx={{ fontSize: '0.8rem', ml: 0.5, opacity: 0.7 }}
										/>
									</Tooltip>
								</Typography>
								<Typography
									variant="h6"
									sx={{ color: viridisColors[2], fontWeight: 'bold' }}
								>
									{avgGateError.toFixed(4)}%
								</Typography>
							</Box>
						</Grid>
					)}

					{avgReadoutError !== null && (
						<Grid item xs={6} sm={3}>
							<Box sx={{ textAlign: 'center' }}>
								<Typography variant="caption" color="text.secondary">
									Avg Readout Error
									<Tooltip title={QuantumTooltips.readoutError} arrow>
										<InfoOutlinedIcon
											sx={{ fontSize: '0.8rem', ml: 0.5, opacity: 0.7 }}
										/>
									</Tooltip>
								</Typography>
								<Typography
									variant="h6"
									sx={{ color: viridisColors[5], fontWeight: 'bold' }}
								>
									{avgReadoutError.toFixed(4)}%
								</Typography>
							</Box>
						</Grid>
					)}

					{avgT1 !== null && (
						<Grid item xs={6} sm={3}>
							<Box sx={{ textAlign: 'center' }}>
								<Typography variant="caption" color="text.secondary">
									Avg T₁ Time
									<Tooltip title={QuantumTooltips.t1Time} arrow>
										<InfoOutlinedIcon
											sx={{ fontSize: '0.8rem', ml: 0.5, opacity: 0.7 }}
										/>
									</Tooltip>
								</Typography>
								<Typography
									variant="h6"
									sx={{ color: viridisColors[7], fontWeight: 'bold' }}
								>
									{avgT1.toFixed(2)} μs
								</Typography>
							</Box>
						</Grid>
					)}

					{avgT2 !== null && (
						<Grid item xs={6} sm={3}>
							<Box sx={{ textAlign: 'center' }}>
								<Typography variant="caption" color="text.secondary">
									Avg T₂ Time
									<Tooltip title={QuantumTooltips.t2Time} arrow>
										<InfoOutlinedIcon
											sx={{ fontSize: '0.8rem', ml: 0.5, opacity: 0.7 }}
										/>
									</Tooltip>
								</Typography>
								<Typography
									variant="h6"
									sx={{ color: viridisColors[9], fontWeight: 'bold' }}
								>
									{avgT2.toFixed(2)} μs
								</Typography>
							</Box>
						</Grid>
					)}
				</Grid>
			</Box>
		);
	}, [noiseMetrics, hasNoiseData, isDarkMode]);

	// Memoized controls to prevent re-renders
	const controls = useMemo(
		() => (
			<Box
				sx={{
					display: 'flex',
					flexDirection: { xs: 'column', md: 'row' },
					justifyContent: 'space-between',
					alignItems: { xs: 'start', md: 'center' },
					gap: 2,
					mb: 2,
				}}
			>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						flexWrap: 'wrap',
						gap: 2,
					}}
				>
					<FormControl size="small" sx={{ minWidth: 120 }}>
						<Select
							value={selectedBackend}
							onChange={handleBackendChange}
							displayEmpty
							variant="outlined"
							size="small"
							sx={{
								bgcolor: isDarkMode
									? 'rgba(33,33,33,0.7)'
									: 'rgba(250,250,250,0.7)',
							}}
						>
							<MenuItem value="all">All Backends</MenuItem>
							<MenuItem value="simulator">
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<StorageIcon
										fontSize="small"
										sx={{ color: theme.palette.info.main }}
									/>
									<span>Simulators</span>
								</Box>
							</MenuItem>
							<MenuItem value="hardware">
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<MemoryIcon
										fontSize="small"
										sx={{ color: theme.palette.success.main }}
									/>
									<span>Hardware</span>
								</Box>
							</MenuItem>
						</Select>
					</FormControl>

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
						<ToggleButton
							value="radar"
							aria-label="radar chart"
							title="Radar Chart"
						>
							<ShowChartIcon fontSize="small" />
						</ToggleButton>
						<ToggleButton value="bar" aria-label="bar chart" title="Bar Chart">
							<BarChartIcon fontSize="small" />
						</ToggleButton>
						<ToggleButton
							value="scatter"
							aria-label="scatter plot"
							title="Scatter Plot"
						>
							<ScatterPlotIcon fontSize="small" />
						</ToggleButton>
						<ToggleButton
							value="boxplot"
							aria-label="box plot"
							title="Box Plot"
						>
							<BoxPlotIcon fontSize="small" />
						</ToggleButton>
						<ToggleButton value="heatmap" aria-label="heatmap" title="Heatmap">
							<HeatmapIcon fontSize="small" />
						</ToggleButton>
						<ToggleButton
							value="trend"
							aria-label="trend chart"
							title="Trend Chart"
						>
							<ViewColumnIcon fontSize="small" />
						</ToggleButton>
					</ToggleButtonGroup>
				</Box>

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
		[
			selectedChartType,
			handleChartTypeChange,
			isDarkMode,
			handleExport,
			selectedBackend,
			handleBackendChange,
			theme,
		]
	);

	// Memoized plot with stable layout
	const chartPlot = useMemo(() => {
		// Create a copy of the layout to avoid modifying the original
		const safeLayout = { ...fixedPlotConfig.layout } as Partial<Layout>;

		// Add the dimension properties
		safeLayout.width = chartWidth > 0 ? chartWidth : undefined;
		safeLayout.height = height;
		safeLayout.autosize = chartWidth <= 0;

		return (
			<Plot
				ref={plotRef}
				data={fixedPlotConfig.data}
				layout={safeLayout}
				config={{
					displayModeBar: true,
					displaylogo: false,
					responsive: true,
					toImageButtonOptions: {
						format: 'svg',
						filename: 'noise_error_chart',
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
	}, [fixedPlotConfig, chartWidth, height, plotRef]);

	// Complete component with card UI and backend filter selection
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
						<WarningIcon sx={{ color: '#9747FF' }} />
						<Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
							Quantum Noise & Error Analysis
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
					{selectedBackend !== 'all' && (
						<Box sx={{ mb: 2 }}>
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

					{filteredData.length > 0 ? (
						<>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
								Based on {filteredData.length} quantum runs from{' '}
								{backends.length} backends
							</Typography>

							{kpiStrip}
							{controls}

							{loading || !hasNoiseData ? (
								<Box
									sx={{
										height: height,
										width: '100%',
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'center',
										alignItems: 'center',
										backgroundColor: isDarkMode
											? 'rgba(33,33,33,0.5)'
											: 'rgba(250,250,250,0.5)',
										borderRadius: '8px',
									}}
								>
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
										<>
											<WarningIcon
												sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
											/>
											<Typography variant="h6" color="text.secondary">
												No noise data available
											</Typography>
											<Typography
												variant="body2"
												color="text.secondary"
												sx={{ mt: 1, textAlign: 'center', maxWidth: '80%' }}
											>
												{selectedBackend === 'simulator'
													? "Simulators typically don't report error metrics."
													: 'Run quantum workloads on hardware backends to collect noise metrics.'}
											</Typography>
										</>
									)}
								</Box>
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
						</>
					) : (
						<Box
							sx={{
								py: 8,
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'center',
								alignItems: 'center',
								backgroundColor: isDarkMode
									? 'rgba(33,33,33,0.5)'
									: 'rgba(250,250,250,0.5)',
								borderRadius: '8px',
								gap: 2,
							}}
						>
							<MemoryIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
							<Typography
								variant="body1"
								color="text.secondary"
								textAlign="center"
							>
								{selectedBackend !== 'all'
									? `No quantum data available for ${selectedBackend} backend.`
									: 'No quantum data available.'}
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								textAlign="center"
							>
								Run quantum workloads to generate noise statistics.
							</Typography>
						</Box>
					)}
				</CardContent>
			</Collapse>
		</Card>
	);
};

export default React.memo(NoiseErrorDataCard, (prevProps, nextProps) => {
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
