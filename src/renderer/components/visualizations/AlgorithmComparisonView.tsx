import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useLayoutEffect,
} from 'react';
import Plot from 'react-plotly.js';
import { ProcessedBenchmarkData } from '../../utils/dataProcessingUtils';
import { useTheme } from '@mui/material/styles';
import {
	Skeleton,
	Box,
	Typography,
	FormGroup,
	FormControlLabel,
	Checkbox,
	Grid,
	Paper,
	Tooltip,
	Select,
	MenuItem,
	InputLabel,
	FormControl,
	SelectChangeEvent,
	Chip,
	Alert,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteIcon from '@mui/icons-material/Delete';

// Conditional logging helper
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

// Simple debounce function
const debounce = (fn: Function, ms = 300) => {
	let timeoutId: ReturnType<typeof setTimeout>;
	return function (...args: any[]) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), ms);
	};
};

// Add TypeScript interface for window.Plotly
declare global {
	interface Window {
		Plotly?: {
			relayout: (element: HTMLElement, layout: any) => void;
			react?: (element: HTMLElement, data: any, layout: any) => void;
			purge?: (element: HTMLElement) => void;
		};
	}
}

interface AlgorithmComparisonViewProps {
	data: ProcessedBenchmarkData[];
	title?: string;
	height?: number;
	loading?: boolean;
	chartRef?: React.RefObject<any>;
}

// Interface for algorithm data structure
interface AlgorithmData {
	id: string;
	name: string;
	variant: string;
	color: string;
	selected: boolean;
}

// Interface for operation metrics
interface OperationMetrics {
	[key: string]: {
		// Algorithm ID
		[op: string]: {
			// Operation name
			avg_ms: number;
			ops_per_sec: number;
			mem_peak_kb: number;
		};
	};
}

const AlgorithmComparisonView = ({
	data,
	title = 'Algorithm Comparison',
	height = 700,
	loading = false,
	chartRef,
}: AlgorithmComparisonViewProps) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const localPlotRef = useRef<any>(null);
	const plotRef = chartRef || localPlotRef;
	const [chartWidth, setChartWidth] = useState<number>(0);
	const [chartHeight, setChartHeight] = useState<number>(height - 220);
	const lastWidthRef = useRef<number>(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const initialRenderRef = useRef<boolean>(true);
	const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);
	const dataProcessedRef = useRef<boolean>(false);

	// State for metrics selection
	const [selectedMetric, setSelectedMetric] = useState<
		'avg_ms' | 'ops_per_sec' | 'mem_peak_kb'
	>('avg_ms');
	const [selectedOperations, setSelectedOperations] = useState<{
		[key: string]: boolean;
	}>({});
	const [normalizeData, setNormalizeData] = useState<boolean>(false);
	const [baselineAlgorithm, setBaselineAlgorithm] = useState<string>('');

	// State for available algorithms and operations
	const [availableAlgorithms, setAvailableAlgorithms] = useState<
		AlgorithmData[]
	>([]);
	const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
	const [availableOperations, setAvailableOperations] = useState<string[]>([]);
	const [operationMetrics, setOperationMetrics] = useState<OperationMetrics>(
		{}
	);

	// Color palette for algorithms - memo this to prevent recreation
	const colorPalette = useMemo(
		() => [
			'#9747FF', // Primary purple
			'#4CAF50', // Green
			'#2196F3', // Blue
			'#FF9800', // Orange
			'#E91E63', // Pink
			'#607D8B', // Blue Grey
		],
		[]
	);

	// Define operation display names - memo to prevent recreation
	const operationDisplayNames: { [key: string]: string } = useMemo(
		() => ({
			keygen: 'Key Generation',
			sign: 'Sign',
			verify: 'Verify',
			encapsulate: 'Encapsulate',
			decapsulate: 'Decapsulate',
			encryption: 'Encryption',
			decryption: 'Decryption',
			shared_secret: 'Shared Secret',
		}),
		[]
	);

	// Metric labels and descriptions - memo to prevent recreation
	const metricLabels = useMemo(
		() => ({
			avg_ms: 'Average Time (ms)',
			ops_per_sec: 'Operations Per Second',
			mem_peak_kb: 'Peak Memory Usage (KB)',
		}),
		[]
	);

	const metricDescriptions = useMemo(
		() => ({
			avg_ms:
				'Lower values indicate better performance. This shows the average time in milliseconds needed to complete the operation.',
			ops_per_sec:
				'Higher values indicate better performance. This shows how many operations an algorithm can complete per second.',
			mem_peak_kb:
				'Lower values generally indicate more efficient memory usage. This shows the maximum memory used during the operation in kilobytes.',
		}),
		[]
	);

	// Metric polarity
	const metricPolarity = useMemo(
		() => ({
			avg_ms: 'lower',
			ops_per_sec: 'higher',
			mem_peak_kb: 'lower',
		}),
		[]
	);

	// Additional ref to track algorithm category changes
	const previousDataCategoryRef = useRef<string>('');

	// Helper function to determine algorithm category
	const getAlgorithmCategory = (algorithms: AlgorithmData[]): string => {
		if (algorithms.length === 0) return '';

		// Check if we're dealing with a specific algorithm family
		const firstAlg = algorithms[0].name.toLowerCase();
		if (algorithms.every((alg) => alg.name.toLowerCase() === firstAlg)) {
			return firstAlg; // All algorithms are the same family
		}

		// If mixed, return "all"
		return 'all';
	};

	// Helper to determine operation defaults based on algorithm type
	const getDefaultOperations = (
		algorithmType: string,
		availableOps: string[]
	): { [key: string]: boolean } => {
		const operations = Object.fromEntries(
			availableOps.map((op) => [op, false])
		);

		// Defaults for signature algorithms
		if (['falcon', 'dilithium', 'sphincs'].includes(algorithmType)) {
			if (availableOps.includes('keygen')) operations['keygen'] = true;
			if (availableOps.includes('sign')) operations['sign'] = true;
			if (availableOps.includes('verify')) operations['verify'] = true;
		}
		// Defaults for KEM algorithms
		else if (
			['kyber', 'mceliece', 'hqc', 'sike', 'bike'].includes(algorithmType)
		) {
			if (availableOps.includes('keygen')) operations['keygen'] = true;
			if (availableOps.includes('encapsulate'))
				operations['encapsulate'] = true;
			if (availableOps.includes('decapsulate'))
				operations['decapsulate'] = true;
		}
		// Defaults for ECDH
		else if (['ecdh', 'x25519', 'p256'].includes(algorithmType)) {
			if (availableOps.includes('keygen')) operations['keygen'] = true;
			if (availableOps.includes('shared_secret'))
				operations['shared_secret'] = true;
		}
		// Default case - select keygen if available, otherwise first 3 operations
		else {
			if (availableOps.includes('keygen')) operations['keygen'] = true;

			// Get top 3 operations if not enough are selected
			const selectedCount = Object.values(operations).filter(Boolean).length;
			if (selectedCount < Math.min(3, availableOps.length)) {
				availableOps.slice(0, 3).forEach((op) => {
					operations[op] = true;
				});
			}
		}

		return operations;
	};

	// Use layout effect to measure container before initial render
	useLayoutEffect(() => {
		if (containerRef.current) {
			const containerWidth = containerRef.current.clientWidth;
			if (containerWidth !== chartWidth) {
				setChartWidth(containerWidth);
			}
		}
	}, [chartWidth]);

	// Handle window resize to update chart size
	useEffect(() => {
		// Create debounced resize handler
		const debouncedResize = debounce(() => {
			if (containerRef.current && plotRef.current && plotRef.current.el) {
				const containerWidth = containerRef.current.clientWidth;
				if (Math.abs(containerWidth - lastWidthRef.current) > 5) {
					setChartWidth(containerWidth);
					lastWidthRef.current = containerWidth;

					const adjustedHeight = height - 220;
					setChartHeight(adjustedHeight);

					// Use Plotly's relayout to resize the chart
					if (plotRef.current.el._fullLayout) {
						const currentLayout = {
							...plotRef.current.el.layout,
							width: containerWidth,
							height: adjustedHeight,
							autosize: false,
						};

						if (typeof plotRef.current.relayout === 'function') {
							plotRef.current.relayout(currentLayout);
						} else if (
							window.Plotly &&
							typeof window.Plotly.relayout === 'function'
						) {
							window.Plotly.relayout(plotRef.current.el, currentLayout);
						}
					}
				}
			}
		}, 100);

		// Handle fullscreen transitions
		const handleFullscreenChange = () => {
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}

			// Apply multiple resize attempts with staggered timing
			[50, 150, 300].forEach((delay) => {
				resizeTimeoutRef.current = setTimeout(debouncedResize, delay);
			});
		};

		// Add event listeners
		window.addEventListener('resize', debouncedResize);
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('mozfullscreenchange', handleFullscreenChange);
		document.addEventListener('MSFullscreenChange', handleFullscreenChange);

		// Initial sizing after component mounts
		if (initialRenderRef.current) {
			debouncedResize();
			setTimeout(debouncedResize, 100);
			initialRenderRef.current = false;
		}

		// Clean up
		return () => {
			window.removeEventListener('resize', debouncedResize);
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

			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}

			// Clean up Plotly to prevent memory leaks
			if (
				plotRef.current &&
				plotRef.current.el &&
				window.Plotly &&
				window.Plotly.purge
			) {
				window.Plotly.purge(plotRef.current.el);
			}
		};
	}, [height]);

	// Process data when it changes - use a ref to prevent multiple processing passes
	useEffect(() => {
		if (data.length === 0) return;

		// Extract unique algorithms and operations
		const algorithms = new Map<string, AlgorithmData>();
		const operations = new Set<string>();
		const metrics: OperationMetrics = {};

		// Process data to extract available algorithms and operations
		data.forEach((item) => {
			const algorithmId = `${item.algorithm}-${item.variant}`;

			// Add algorithm if not already added
			if (!algorithms.has(algorithmId)) {
				algorithms.set(algorithmId, {
					id: algorithmId,
					name: item.algorithm,
					variant: item.variant,
					color: colorPalette[algorithms.size % colorPalette.length],
					selected: false,
				});

				// Initialize metrics for this algorithm
				metrics[algorithmId] = {};
			}

			// Process operations
			item.operations.forEach((op) => {
				const operationName = op.operation.toLowerCase();
				operations.add(operationName);

				// Store metrics for this algorithm-operation combination
				if (!metrics[algorithmId][operationName]) {
					metrics[algorithmId][operationName] = {
						avg_ms: 0,
						ops_per_sec: 0,
						mem_peak_kb: 0,
					};
				}

				metrics[algorithmId][operationName] = {
					avg_ms: op.avg_ms || 0,
					ops_per_sec: op.ops_per_sec || 0,
					mem_peak_kb: op.mem_peak_kb || 0,
				};
			});
		});

		// Batch state updates to reduce renders
		const batchUpdate = () => {
			const newAlgorithms = Array.from(algorithms.values());
			const newOperations = Array.from(operations);

			// Determine the current algorithm category
			const currentCategory = getAlgorithmCategory(newAlgorithms);
			const categoryChanged =
				currentCategory !== previousDataCategoryRef.current &&
				previousDataCategoryRef.current !== '';

			// Update previous category ref
			previousDataCategoryRef.current = currentCategory;

			setAvailableAlgorithms(newAlgorithms);
			setAvailableOperations(newOperations);
			setOperationMetrics(metrics);

			// Select default algorithms
			// Reset selections if category changed or no algorithms are selected
			if (categoryChanged || selectedAlgorithms.length === 0) {
				let defaultSelectedAlgs: string[] = [];

				// For a specific algorithm family, select up to 4 variants
				if (currentCategory !== 'all') {
					// Get all algorithms in this family (already filtered by the category check)
					defaultSelectedAlgs = newAlgorithms
						.slice(0, 4) // Take up to 4 variants
						.map((alg) => alg.id);
				} else {
					// For mixed algorithms, prioritize Kyber variants first
					const kyber512 = newAlgorithms.find(
						(alg) =>
							alg.name.toLowerCase() === 'kyber' && alg.variant.includes('512')
					);
					const kyber768 = newAlgorithms.find(
						(alg) =>
							alg.name.toLowerCase() === 'kyber' && alg.variant.includes('768')
					);
					const kyber1024 = newAlgorithms.find(
						(alg) =>
							alg.name.toLowerCase() === 'kyber' && alg.variant.includes('1024')
					);

					if (kyber512) defaultSelectedAlgs.push(kyber512.id);
					if (kyber768) defaultSelectedAlgs.push(kyber768.id);
					if (kyber1024) defaultSelectedAlgs.push(kyber1024.id);

					// If no Kyber variants found, default to first few algorithms
					if (defaultSelectedAlgs.length === 0 && newAlgorithms.length > 0) {
						defaultSelectedAlgs = newAlgorithms
							.slice(0, Math.min(3, newAlgorithms.length))
							.map((alg) => alg.id);
					}
				}

				if (defaultSelectedAlgs.length > 0) {
					setSelectedAlgorithms(defaultSelectedAlgs);
					setBaselineAlgorithm(defaultSelectedAlgs[0]);
				}

				// Set appropriate operations based on algorithm type
				const initialOperations = getDefaultOperations(
					currentCategory,
					newOperations
				);
				setSelectedOperations(initialOperations);
			}

			dataProcessedRef.current = true;
		};

		// Use requestAnimationFrame for smoother updates
		requestAnimationFrame(batchUpdate);

		// Reset data processed flag when data changes
		return () => {
			dataProcessedRef.current = false;
		};
	}, [data, colorPalette, selectedAlgorithms]);

	// Calculate plot data when dependencies change - use useMemo instead of useEffect
	const plotData = useMemo(() => {
		if (selectedAlgorithms.length === 0 || availableOperations.length === 0)
			return [];

		const plotlyData: any[] = [];

		// Filter operations to only those that are selected
		const filteredOperations = availableOperations.filter(
			(op) => selectedOperations[op]
		);

		// Get metrics for baseline algorithm for normalization
		const baselineMetrics = baselineAlgorithm
			? operationMetrics[baselineAlgorithm]
			: null;

		// Process each selected algorithm
		selectedAlgorithms.forEach((algId) => {
			const algorithm = availableAlgorithms.find((a) => a.id === algId);
			if (!algorithm) return;

			const metricValues: number[] = [];
			const operationLabels: string[] = [];
			const textValues: string[] = [];
			const diffIndicators: string[] = [];
			const barColors: string[] = [];

			// Process each operation for this algorithm
			filteredOperations.forEach((op) => {
				const metrics = operationMetrics[algId]?.[op];
				if (!metrics) return;

				const metricValue = metrics[selectedMetric];
				let displayValue = metricValue;
				let diffText = '';
				let barColor = algorithm.color;

				// Handle normalization if enabled
				if (normalizeData && baselineMetrics && baselineAlgorithm !== algId) {
					const baselineValue = baselineMetrics[op]?.[selectedMetric] || 0;
					if (baselineValue > 0) {
						// Calculate percentage difference
						const percentDiff =
							((metricValue - baselineValue) / baselineValue) * 100;
						displayValue = percentDiff;

						// Format diff text
						const isBetter =
							(metricPolarity[selectedMetric] === 'lower' && percentDiff < 0) ||
							(metricPolarity[selectedMetric] === 'higher' && percentDiff > 0);

						diffText = `${Math.abs(percentDiff).toFixed(1)}% ${
							isBetter ? 'better' : 'worse'
						}`;

						// Set color based on better/worse
						barColor = isBetter ? '#4CAF50' : '#E91E63';
						diffIndicators.push(isBetter ? '↑' : '↓');
					} else {
						diffText = 'N/A (baseline = 0)';
						diffIndicators.push('-');
					}
				} else {
					// Not normalized, just show the value
					diffText = metricValue.toFixed(2);
					diffIndicators.push('');
				}

				metricValues.push(displayValue);
				operationLabels.push(operationDisplayNames[op] || op);
				textValues.push(diffText);
				barColors.push(barColor);
			});

			// Create bar chart for this algorithm
			plotlyData.push({
				x: operationLabels,
				y: metricValues,
				name: `${algorithm.name} (${algorithm.variant})`,
				type: 'bar',
				marker: {
					color: barColors,
					opacity: 0.8,
					line: {
						color: isDarkMode ? '#333' : '#fff',
						width: 1,
					},
				},
				text: normalizeData
					? textValues.map((text, i) => `${text} ${diffIndicators[i]}`)
					: textValues,
				textposition: 'auto',
				hoverinfo: 'x+y+name+text',
			});
		});

		return plotlyData;
	}, [
		selectedMetric,
		selectedOperations,
		selectedAlgorithms,
		availableOperations,
		availableAlgorithms,
		operationMetrics,
		normalizeData,
		baselineAlgorithm,
		isDarkMode,
		metricPolarity,
		operationDisplayNames,
	]);

	// Handle metric type change
	const handleMetricChange = (event: SelectChangeEvent) => {
		setSelectedMetric(
			event.target.value as 'avg_ms' | 'ops_per_sec' | 'mem_peak_kb'
		);
	};

	// Handle operation selection toggle
	const handleOperationToggle = (operation: string) => {
		setSelectedOperations((prev) => ({
			...prev,
			[operation]: !prev[operation],
		}));
	};

	// Handle algorithm selection toggle
	const handleAlgorithmToggle = (algorithmId: string) => {
		setSelectedAlgorithms((prev) => {
			if (prev.includes(algorithmId)) {
				// Remove algorithm from selection
				const newSelected = prev.filter((id) => id !== algorithmId);

				// Update baseline if needed
				if (baselineAlgorithm === algorithmId && newSelected.length > 0) {
					setBaselineAlgorithm(newSelected[0]);
				}

				return newSelected;
			} else {
				// Add algorithm to selection (limit to 4)
				if (prev.length < 4) {
					const newSelected = [...prev, algorithmId];

					// Set as baseline if it's the first algorithm
					if (prev.length === 0) {
						setBaselineAlgorithm(algorithmId);
					}

					return newSelected;
				}
				return prev;
			}
		});
	};

	// Handle changing the baseline algorithm
	const handleBaselineChange = (event: SelectChangeEvent) => {
		setBaselineAlgorithm(event.target.value);
	};

	// Create plot layout with appropriate styling for the current theme
	const plotLayout: any = {
		barmode: 'group' as const,
		title: '',
		hovermode: 'closest' as const,
		autosize: true,
		font: {
			family: 'Arial, sans-serif',
			size: 12,
			color: isDarkMode ? '#ffffff' : '#333333',
		},
		paper_bgcolor: 'transparent',
		plot_bgcolor: 'transparent',
		xaxis: {
			title: 'Operations',
			tickangle: -45,
			gridcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
			zerolinecolor: isDarkMode
				? 'rgba(255, 255, 255, 0.2)'
				: 'rgba(0, 0, 0, 0.2)',
			tickfont: {
				size: 10,
				color: isDarkMode ? '#bbbbbb' : '#333333',
			},
		},
		yaxis: {
			title: normalizeData
				? 'Percentage Difference (%)'
				: metricLabels[selectedMetric],
			titlefont: {
				size: 12,
				color: isDarkMode ? '#ffffff' : '#333333',
			},
			tickfont: {
				size: 10,
				color: isDarkMode ? '#bbbbbb' : '#333333',
			},
			gridcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
			zerolinecolor: isDarkMode
				? 'rgba(255, 255, 255, 0.2)'
				: 'rgba(0, 0, 0, 0.2)',
		},
		margin: {
			l: 60,
			r: 30,
			t: 30,
			b: 120,
		},
		legend: {
			orientation: 'h' as const,
			yanchor: 'bottom' as const,
			y: -0.3,
			xanchor: 'center' as const,
			x: 0.5,
			bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)',
			bordercolor: isDarkMode
				? 'rgba(255, 255, 255, 0.1)'
				: 'rgba(0, 0, 0, 0.1)',
			borderwidth: 1,
			font: {
				size: 10,
				color: isDarkMode ? '#ffffff' : '#333333',
			},
		},
		annotations: normalizeData
			? [
					{
						x: 0,
						y: 1.1,
						xref: 'paper',
						yref: 'paper',
						text: `Baseline: ${
							availableAlgorithms.find((a) => a.id === baselineAlgorithm)
								?.name || ''
						} (${
							availableAlgorithms.find((a) => a.id === baselineAlgorithm)
								?.variant || ''
						})`,
						showarrow: false,
						font: {
							size: 10,
							color: isDarkMode ? '#bbbbbb' : '#333333',
						},
					},
			  ]
			: [],
	};

	const plotConfig = {
		responsive: true,
		displayModeBar: true,
		modeBarButtonsToRemove: ['lasso2d', 'select2d'] as (
			| 'lasso2d'
			| 'select2d'
		)[],
		displaylogo: false,
		toImageButtonOptions: {
			filename: 'algorithm_comparison',
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

	return (
		<div
			className="relative w-full"
			style={{ minHeight: `${height}px` }}
			ref={containerRef}
		>
			{data.length === 0 ? (
				<Box
					display="flex"
					alignItems="center"
					justifyContent="center"
					height={height}
					sx={{
						bgcolor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
						borderRadius: '8px',
						border: '1px dashed',
						borderColor: isDarkMode
							? 'rgba(255,255,255,0.2)'
							: 'rgba(0,0,0,0.2)',
					}}
				>
					<Typography variant="body1" color="textSecondary">
						No data available. Run benchmarks to see comparison metrics.
					</Typography>
				</Box>
			) : (
				<>
					<div className="mb-4 flex flex-wrap justify-between items-center">
						<Typography variant="subtitle1" className="flex items-center mb-2">
							{title}
							<Tooltip title={metricDescriptions[selectedMetric]} arrow>
								<InfoOutlinedIcon
									fontSize="small"
									sx={{
										verticalAlign: 'middle',
										ml: 0.5,
										color: isDarkMode ? '#aaa' : '#666',
									}}
								/>
							</Tooltip>
						</Typography>

						{/* Controls for metric and normalization */}
						<div className="flex flex-wrap gap-3 mb-2">
							<FormControl
								size="small"
								sx={{
									minWidth: '180px',
									'.MuiOutlinedInput-root': {
										borderRadius: '8px',
										bgcolor: isDarkMode
											? 'rgba(33,33,33,0.9)'
											: 'rgba(255,255,255,0.9)',
									},
								}}
							>
								<InputLabel
									id="metric-select-label"
									sx={{ color: isDarkMode ? '#ddd' : '#333' }}
								>
									Metric
								</InputLabel>
								<Select
									labelId="metric-select-label"
									id="metric-select"
									value={selectedMetric}
									label="Metric"
									onChange={handleMetricChange}
									sx={{ color: isDarkMode ? 'white' : 'black' }}
								>
									<MenuItem value="avg_ms">Average Time (ms)</MenuItem>
									<MenuItem value="ops_per_sec">Operations Per Second</MenuItem>
									<MenuItem value="mem_peak_kb">Memory Usage (KB)</MenuItem>
								</Select>
							</FormControl>

							<FormControlLabel
								control={
									<Checkbox
										checked={normalizeData}
										onChange={(e) => setNormalizeData(e.target.checked)}
										sx={{
											color: '#9747FF',
											'&.Mui-checked': { color: '#9747FF' },
										}}
									/>
								}
								label="Normalize Data"
								sx={{
									color: isDarkMode ? '#ddd' : '#333',
									'.MuiFormControlLabel-label': { fontSize: '0.9rem' },
								}}
							/>

							{normalizeData && (
								<FormControl
									size="small"
									sx={{
										minWidth: '180px',
										'.MuiOutlinedInput-root': {
											borderRadius: '8px',
											bgcolor: isDarkMode
												? 'rgba(33,33,33,0.9)'
												: 'rgba(255,255,255,0.9)',
										},
									}}
								>
									<InputLabel
										id="baseline-select-label"
										sx={{ color: isDarkMode ? '#ddd' : '#333' }}
									>
										Baseline Algorithm
									</InputLabel>
									<Select
										labelId="baseline-select-label"
										id="baseline-select"
										value={baselineAlgorithm}
										label="Baseline Algorithm"
										onChange={handleBaselineChange}
										sx={{ color: isDarkMode ? 'white' : 'black' }}
										disabled={selectedAlgorithms.length === 0}
									>
										{selectedAlgorithms.map((algId) => {
											const alg = availableAlgorithms.find(
												(a) => a.id === algId
											);
											return (
												<MenuItem key={algId} value={algId}>
													{alg ? `${alg.name} (${alg.variant})` : algId}
												</MenuItem>
											);
										})}
									</Select>
								</FormControl>
							)}
						</div>
					</div>

					{/* Algorithm selection chips */}
					<Box sx={{ mb: 3 }}>
						<Typography
							variant="subtitle2"
							sx={{ mb: 1, color: isDarkMode ? '#ddd' : '#333' }}
						>
							Selected Algorithms:
						</Typography>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
							{selectedAlgorithms.length === 0 ? (
								<Typography
									variant="body2"
									sx={{
										color: isDarkMode ? '#aaa' : '#777',
										fontStyle: 'italic',
									}}
								>
									No algorithms selected. Please select up to 4 algorithms to
									compare.
								</Typography>
							) : (
								selectedAlgorithms.map((algId) => {
									const alg = availableAlgorithms.find((a) => a.id === algId);
									return (
										<Chip
											key={algId}
											label={`${alg?.name || ''} (${alg?.variant || ''})`}
											onDelete={() => handleAlgorithmToggle(algId)}
											deleteIcon={<DeleteIcon />}
											sx={{
												bgcolor: alg?.color || '#9747FF',
												color: 'white',
												fontWeight: 'medium',
												'& .MuiChip-deleteIcon': {
													color: 'white',
													'&:hover': { color: 'rgba(255,255,255,0.7)' },
												},
											}}
										/>
									);
								})
							)}

							{selectedAlgorithms.length < 4 && (
								<Tooltip title="Select up to 4 algorithms to compare">
									<Chip
										icon={<CompareArrowsIcon />}
										label="Add Algorithm"
										variant="outlined"
										sx={{
											borderColor: '#9747FF',
											color: '#9747FF',
											cursor: 'default',
										}}
									/>
								</Tooltip>
							)}
						</Box>
					</Box>

					{/* Main chart area */}
					<div
						className="chart-container"
						style={{
							width: '100%',
							minHeight: `${chartHeight}px`,
							height: '100%',
							position: 'relative',
						}}
					>
						{selectedAlgorithms.length === 0 ? (
							<Alert severity="info" sx={{ mb: 2 }}>
								Please select at least one algorithm from the list below to view
								comparison data.
							</Alert>
						) : (
							<Plot
								data={plotData}
								layout={{
									...plotLayout,
									width: chartWidth || undefined,
									height: chartHeight,
								}}
								config={plotConfig}
								useResizeHandler={true}
								style={{ width: '100%', height: '100%' }}
								ref={plotRef}
								onInitialized={(figure) => {
									if (
										figure &&
										figure.layout &&
										figure.layout.width &&
										chartWidth === 0
									) {
										// Only set width state during initialization
										setChartWidth(figure.layout.width);
										lastWidthRef.current = figure.layout.width;
									}
								}}
							/>
						)}
					</div>

					{/* Bottom controls section */}
					<Grid container spacing={2} sx={{ mt: 2 }}>
						{/* Available Algorithms Selection */}
						<Grid item xs={12} md={6}>
							<Paper
								elevation={3}
								sx={{
									p: 2,
									bgcolor: isDarkMode
										? 'rgba(33,33,33,0.9)'
										: 'rgba(255,255,255,0.9)',
									borderRadius: '8px',
								}}
							>
								<Typography
									variant="subtitle2"
									gutterBottom
									sx={{ color: isDarkMode ? '#ddd' : '#333' }}
								>
									Available Algorithms
								</Typography>
								<Box sx={{ maxHeight: '180px', overflow: 'auto', pr: 1 }}>
									<FormGroup
										sx={{
											display: 'flex',
											flexDirection: 'row',
											flexWrap: 'wrap',
										}}
									>
										{availableAlgorithms.map((algorithm) => (
											<FormControlLabel
												key={algorithm.id}
												control={
													<Checkbox
														checked={selectedAlgorithms.includes(algorithm.id)}
														disabled={
															selectedAlgorithms.length >= 4 &&
															!selectedAlgorithms.includes(algorithm.id)
														}
														size="small"
														sx={{
															color: algorithm.color,
															'&.Mui-checked': { color: algorithm.color },
														}}
														onChange={() => handleAlgorithmToggle(algorithm.id)}
													/>
												}
												label={
													<Typography
														variant="body2"
														sx={{ color: isDarkMode ? '#ddd' : '#333' }}
													>
														{algorithm.name} ({algorithm.variant})
													</Typography>
												}
												sx={{ width: '200px', margin: '0px 0px 4px 0px' }}
											/>
										))}
									</FormGroup>
								</Box>
							</Paper>
						</Grid>

						{/* Operations Selection */}
						<Grid item xs={12} md={6}>
							<Paper
								elevation={3}
								sx={{
									p: 2,
									bgcolor: isDarkMode
										? 'rgba(33,33,33,0.9)'
										: 'rgba(255,255,255,0.9)',
									borderRadius: '8px',
								}}
							>
								<Typography
									variant="subtitle2"
									gutterBottom
									sx={{ color: isDarkMode ? '#ddd' : '#333' }}
								>
									Operations to Compare
								</Typography>
								<Box sx={{ maxHeight: '180px', overflow: 'auto', pr: 1 }}>
									<FormGroup
										sx={{
											display: 'flex',
											flexDirection: 'row',
											flexWrap: 'wrap',
										}}
									>
										{availableOperations.map((operation) => (
											<FormControlLabel
												key={operation}
												control={
													<Checkbox
														checked={!!selectedOperations[operation]}
														size="small"
														sx={{
															color: '#9747FF',
															'&.Mui-checked': { color: '#9747FF' },
														}}
														onChange={() => handleOperationToggle(operation)}
													/>
												}
												label={
													<Typography
														variant="body2"
														sx={{ color: isDarkMode ? '#ddd' : '#333' }}
													>
														{operationDisplayNames[operation] || operation}
													</Typography>
												}
												sx={{ width: '180px', margin: '0px 0px 4px 0px' }}
											/>
										))}
									</FormGroup>
								</Box>
							</Paper>
						</Grid>
					</Grid>
				</>
			)}
		</div>
	);
};

export default AlgorithmComparisonView;
