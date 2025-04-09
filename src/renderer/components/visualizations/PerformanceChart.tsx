import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
	Divider,
	Card,
	CardContent,
	SelectChangeEvent,
} from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortIcon from '@mui/icons-material/Sort';

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

interface PerformanceChartProps {
	data: ProcessedBenchmarkData[];
	title?: string;
	metricType?: 'avg_ms' | 'ops_per_sec' | 'mem_peak_kb';
	height?: number;
	loading?: boolean;
	selectedOperations?: { [key: string]: boolean };
	selectedAlgorithms?: { [key: string]: boolean };
	sortOrder?: string;
	onOperationsChange?: (operations: { [key: string]: boolean }) => void;
	onAlgorithmsChange?: (algorithms: { [key: string]: boolean }) => void;
	onSortOrderChange?: (sortOrder: string) => void;
	chartRef?: React.RefObject<any>;
}

const PerformanceChart = ({
	data,
	title = 'Performance Comparison',
	metricType = 'avg_ms',
	height = 700,
	loading = false,
	selectedOperations = {},
	selectedAlgorithms = {},
	sortOrder = 'default',
	onOperationsChange,
	onAlgorithmsChange,
	onSortOrderChange,
	chartRef,
}: PerformanceChartProps) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [plotData, setPlotData] = useState<any[]>([]);
	const [allOperations, setAllOperations] = useState<string[]>([]);
	const [allAlgorithms, setAllAlgorithms] = useState<string[]>([]);
	const [algorithmGroups, setAlgorithmGroups] = useState<Map<string, string[]>>(
		new Map()
	);
	const localPlotRef = useRef<any>(null);
	const plotRef = chartRef || localPlotRef;
	const [chartWidth, setChartWidth] = useState<number>(0);
	const [chartHeight, setChartHeight] = useState<number>(height - 170);
	const containerRef = useRef<HTMLDivElement>(null);
	const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);
	const initialRenderRef = useRef<boolean>(true);

	const metricLabels = {
		avg_ms: 'Average Time (ms)',
		ops_per_sec: 'Operations Per Second',
		mem_peak_kb: 'Peak Memory Usage (KB)',
	};

	const metricDescriptions = {
		avg_ms:
			'Lower values indicate better performance. This shows the average time in milliseconds needed to complete the operation.',
		ops_per_sec:
			'Higher values indicate better performance. This shows how many operations an algorithm can complete per second.',
		mem_peak_kb:
			'Lower values generally indicate more efficient memory usage. This shows the maximum memory used during the operation in kilobytes.',
	};

	// Define operation display names
	const operationDisplayNames: { [key: string]: string } = {
		keygen: 'Key Generation',
		sign: 'Sign',
		verify: 'Verify',
		encapsulate: 'Encapsulate',
		decapsulate: 'Decapsulate',
		encryption: 'Encryption',
		decryption: 'Decryption',
		shared_secret: 'Shared Secret',
		// Add more mappings as needed
	};

	// Get operation colors for the legend
	const operationColors: { [key: string]: string } = {};
	const colors = [
		'#9747FF', // Primary purple
		'#4CAF50', // Green
		'#2196F3', // Blue
		'#FF9800', // Orange
		'#E91E63', // Pink
		'#607D8B', // Blue Grey
		'#8BC34A', // Light Green
		'#FF5722', // Deep Orange
	];

	// Run before DOM paints to measure container and set initial dimensions
	useLayoutEffect(() => {
		if (containerRef.current) {
			const containerWidth = containerRef.current.clientWidth;
			setChartWidth(containerWidth);
		}
	}, []);

	// Handle window resize to update chart size
	useEffect(() => {
		// Create debounced resize handler
		const debouncedResize = debounce(() => {
			if (containerRef.current && plotRef.current && plotRef.current.el) {
				const containerWidth = containerRef.current.clientWidth;
				setChartWidth(containerWidth);

				const adjustedHeight = height - 170;
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
		}, 100);

		// Specifically handle fullscreen transitions
		const handleFullscreenChange = () => {
			// Clear any existing timeout
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}

			// Multiple resize attempts with shorter delays
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
			// Force another resize after a slight delay to ensure proper rendering
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

	useEffect(() => {
		if (data.length === 0) return;

		// Process data for plotting
		// Group by algorithm and operation for grouping
		const algorithmData: {
			[key: string]: {
				[op: string]: number[];
			};
		} = {};

		const uniqueOperations = new Set<string>();
		const uniqueAlgorithms = new Set<string>();
		const algorithmGroups = new Map<string, string[]>();

		// Group data by algorithm and operation
		data.forEach((item) => {
			const algorithm = `${item.algorithm} (${item.variant})`;
			const baseAlgorithm = item.algorithm.toLowerCase();

			uniqueAlgorithms.add(algorithm);

			// Track which full algorithm names belong to which base algorithm
			if (!algorithmGroups.has(baseAlgorithm)) {
				algorithmGroups.set(baseAlgorithm, []);
			}
			if (!algorithmGroups.get(baseAlgorithm)?.includes(algorithm)) {
				algorithmGroups.get(baseAlgorithm)?.push(algorithm);
			}

			if (!algorithmData[algorithm]) {
				algorithmData[algorithm] = {};
			}

			item.operations.forEach((op) => {
				// Normalize operation name to ensure consistency
				let operationName = op.operation.toLowerCase();

				// Log raw operation data for debugging
				log(
					`Processing raw operation: ${op.operation}, metrics: avg_ms=${op.avg_ms}, ops_per_sec=${op.ops_per_sec}`
				);

				// Add the normalized operation to our unique set
				uniqueOperations.add(operationName);

				if (!algorithmData[algorithm][operationName]) {
					algorithmData[algorithm][operationName] = [];
				}

				// Add the metric value if it exists
				if (op[metricType] !== undefined) {
					algorithmData[algorithm][operationName].push(op[metricType]);
				} else {
					log(
						`Missing metric ${metricType} for operation ${operationName} in ${algorithm}`
					);
				}
			});
		});

		// Set the operations and algorithms arrays
		const operationsArray = Array.from(uniqueOperations);
		setAllOperations(operationsArray);
		log('Available operations for visualization:', operationsArray);

		const algorithmsArray = Array.from(uniqueAlgorithms);
		setAllAlgorithms(algorithmsArray);
		log('Available algorithms for visualization:', algorithmsArray);

		// Initialize selections if they're empty
		if (onOperationsChange && Object.keys(selectedOperations).length === 0) {
			const initialSelections = Object.fromEntries(
				operationsArray.map((op) => [op, op === 'keygen'])
			);
			onOperationsChange(initialSelections);
			log('Initialized operation selections:', initialSelections);
		}

		if (onAlgorithmsChange && Object.keys(selectedAlgorithms).length === 0) {
			const initialAlgorithmSelections = Object.fromEntries(
				algorithmsArray.map((alg) => [alg, true])
			);
			onAlgorithmsChange(initialAlgorithmSelections);
			log('Initialized algorithm selections:', initialAlgorithmSelections);
		}

		// Store the algorithm groups for later use
		setAlgorithmGroups(algorithmGroups);

		// Create plot data
		const plotlyData: any[] = [];

		// Convert to plotly format with filtering
		Object.entries(algorithmData).forEach(
			([algorithm, operations], algIndex) => {
				// Skip if algorithm is not selected
				if (!selectedAlgorithms[algorithm]) return;

				// Use a color specific to this algorithm
				const algorithmColor = colors[algIndex % colors.length];
				console.log(`Using color ${algorithmColor} for algorithm ${algorithm}`);

				// Track operations for this algorithm
				let opIndex = 0;
				Object.entries(operations).forEach(([operation, values]) => {
					// Skip if operation is not selected
					if (!selectedOperations[operation]) return;

					// Calculate average if multiple values
					const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
					console.log(
						`Plotting operation ${operation} for ${algorithm} with value ${avgValue}`
					);

					// For operations within the same algorithm, use slightly different shades
					const shade = opIndex / (Object.keys(operations).length * 2);
					const adjustedColor = adjustColorShade(algorithmColor, shade);

					// Get display name for operation - use the mapping if available
					const displayName = operationDisplayNames[operation] || operation;

					plotlyData.push({
						x: [algorithm],
						y: [avgValue],
						name: displayName, // Use display name here
						type: 'bar',
						marker: {
							color: colors[algIndex % colors.length], // Use algorithm index for color
							opacity: 0.7 + 0.3 * (opIndex / Object.keys(operations).length), // Vary opacity by operation
							line: {
								color: isDarkMode ? '#333' : '#fff',
								width: 1,
							},
						},
						text: avgValue.toFixed(2),
						textposition: 'auto',
						hoverinfo: 'x+y+name',
						legendgroup: operation,
					});
					opIndex++;
				});
			}
		);

		// Function to adjust color shade for better differentiation
		function adjustColorShade(color: string, adjustment: number): string {
			// This is a placeholder; in a real implementation, you'd manipulate the color
			return color;
		}

		// Apply sorting if needed
		if (sortOrder !== 'default' && plotlyData.length > 0) {
			// Sort based on y values (metric values)
			const sortedData = [...plotlyData].sort((a, b) => {
				const aVal = a.y[0]; // Get the metric value
				const bVal = b.y[0]; // Get the metric value

				if (sortOrder === 'ascending') {
					return aVal - bVal; // Sort low to high
				} else if (sortOrder === 'descending') {
					return bVal - aVal; // Sort high to low
				} else if (sortOrder === 'alphabetical') {
					// Sort by algorithm name alphabetically
					return a.x[0].localeCompare(b.x[0]);
				}
				return 0;
			});

			setPlotData(sortedData);
		} else {
			setPlotData(plotlyData);
		}
	}, [
		data,
		metricType,
		isDarkMode,
		selectedOperations,
		selectedAlgorithms,
		sortOrder,
		onOperationsChange,
		onAlgorithmsChange,
	]);

	// Assign consistent colors to operations
	allOperations.forEach((op, index) => {
		operationColors[op] = colors[index % colors.length];
	});

	// Helper functions to determine the state of algorithm group checkboxes
	const isAlgorithmGroupChecked = (baseAlgorithm: string): boolean => {
		const algorithmsInGroup = algorithmGroups.get(baseAlgorithm) || [];
		// Group is checked if all algorithms in the group are checked (or not explicitly unchecked)
		return (
			algorithmsInGroup.length > 0 &&
			algorithmsInGroup.every((alg) => selectedAlgorithms[alg] !== false)
		);
	};

	const isAlgorithmGroupIndeterminate = (baseAlgorithm: string): boolean => {
		const algorithmsInGroup = algorithmGroups.get(baseAlgorithm) || [];
		// Group is indeterminate if some algorithms are checked and some are not
		const checkedCount = algorithmsInGroup.filter(
			(alg) => selectedAlgorithms[alg] !== false
		).length;
		return checkedCount > 0 && checkedCount < algorithmsInGroup.length;
	};

	// Create plot layout with appropriate styling for the current theme
	const plotLayout = {
		barmode: 'group' as const,
		title: '',
		hovermode: 'closest' as const,
		showlegend: true,
		autosize: true,
		font: {
			family: 'Arial, sans-serif',
			size: 12,
			color: isDarkMode ? '#ffffff' : '#333333',
		},
		paper_bgcolor: 'transparent',
		plot_bgcolor: 'transparent',
		xaxis: {
			title: '',
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
			title: metricLabels[metricType],
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
			b: 150,
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
	};

	// Define chart layout
	const layout = {
		title: title,
		barmode: 'group' as const,
		height: height,
		margin: { l: 60, r: 30, t: 50, b: 120 }, // Reduced bottom margin for x-axis labels
		bargap: 0.25, // Space between different algorithm groups
		bargroupgap: 0.1, // Space between bars within the same algorithm group
		xaxis: {
			title: 'Algorithm',
			tickangle: -45,
			automargin: true, // Add automargin to ensure labels fit
			gridcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
		},
		yaxis: {
			title: '', // Removed metric label from y-axis
			gridcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
			autorange: true,
			rangemode: 'tozero' as const,
			fixedrange: false,
		},
		plot_bgcolor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
		paper_bgcolor: 'transparent',
		font: {
			color: isDarkMode ? '#fff' : '#333',
		},
		showlegend: false, // Ensure legend is hidden
		modebar: {
			orientation: 'v' as 'v',
			bgcolor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
			color: isDarkMode ? '#fff' : '#333',
			activecolor: '#9747FF',
		},
	};

	const config = {
		responsive: true,
		displayModeBar: true,
		modeBarButtonsToRemove: ['lasso2d', 'select2d'] as (
			| 'lasso2d'
			| 'select2d'
		)[],
		displaylogo: false,
		toImageButtonOptions: {
			filename: 'performance_chart',
			width: 1200,
			height: 800,
		},
	};

	// Handle toggling operation visibility
	const handleOperationToggle = (operation: string) => {
		if (onOperationsChange) {
			const newOperations = {
				...selectedOperations,
				[operation]: !selectedOperations[operation],
			};
			onOperationsChange(newOperations);
		}
	};

	// Handle toggling algorithm group visibility
	const handleAlgorithmGroupToggle = (baseAlgorithm: string) => {
		if (onAlgorithmsChange) {
			const updatedSelections = { ...selectedAlgorithms };

			// Get all algorithms that belong to this base algorithm
			const algorithmsForGroup = algorithmGroups.get(baseAlgorithm) || [];

			// Check if any are currently selected
			const groupAnySelected = algorithmsForGroup.some(
				(alg) => selectedAlgorithms[alg]
			);

			// Toggle all algorithms in this group
			algorithmsForGroup.forEach((alg) => {
				updatedSelections[alg] = !groupAnySelected;
			});

			onAlgorithmsChange(updatedSelections);
		}
	};

	// Handle sorting change
	const handleSortChange = (event: SelectChangeEvent) => {
		if (onSortOrderChange) {
			onSortOrderChange(event.target.value);
		}
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
			{loading ? (
				<Skeleton
					variant="rectangular"
					width="100%"
					height={height}
					sx={{
						bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
						borderRadius: '8px',
					}}
				/>
			) : data.length === 0 ? (
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
						No data available. Run benchmarks to see performance metrics.
					</Typography>
				</Box>
			) : (
				<>
					<div className="mb-4 flex justify-between items-center">
						<Typography variant="subtitle1" gutterBottom>
							{title}
							<Tooltip title={metricDescriptions[metricType]} arrow>
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
								<MenuItem value="default">Default</MenuItem>
								<MenuItem value="ascending">
									<Box sx={{ display: 'flex', alignItems: 'center' }}>
										<ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
										<span>Ascending</span>
									</Box>
								</MenuItem>
								<MenuItem value="descending">
									<Box sx={{ display: 'flex', alignItems: 'center' }}>
										<ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} />
										<span>Descending</span>
									</Box>
								</MenuItem>
								<MenuItem value="alphabetical">
									<Box sx={{ display: 'flex', alignItems: 'center' }}>
										<SortIcon fontSize="small" sx={{ mr: 0.5 }} />
										<span>Alphabetical</span>
									</Box>
								</MenuItem>
							</Select>
						</FormControl>
					</div>

					{/* Chart Container with explicit dimensions */}
					<div
						className="chart-container"
						style={{
							width: '100%',
							minHeight: `${chartHeight}px`,
							height: '100%',
							position: 'relative',
						}}
					>
						<Plot
							data={plotData}
							layout={{
								...layout,
								width: chartWidth || undefined,
								height: chartHeight,
								autosize: false,
							}}
							config={{
								responsive: true,
								displayModeBar: true,
								modeBarButtonsToRemove: [
									'select2d',
									'lasso2d',
									'autoScale2d',
									'resetScale2d',
								],
								displaylogo: false,
							}}
							useResizeHandler={true}
							style={{ width: '100%', height: '100%' }}
							ref={plotRef}
							onInitialized={(figure) => {
								// Force width update
								if (figure && figure.layout) {
									setChartWidth(
										figure.layout.width ||
											containerRef.current?.clientWidth ||
											0
									);
								}
							}}
						/>
					</div>

					{/* Horizontal Controls below the chart */}
					<div className="flex flex-wrap gap-4 mt-3">
						{/* Operations Filter */}
						<Paper
							elevation={3}
							sx={{
								p: 2,
								bgcolor: isDarkMode
									? 'rgba(33,33,33,0.9)'
									: 'rgba(255,255,255,0.9)',
								borderRadius: '8px',
								flex: 1,
								minWidth: '250px',
							}}
						>
							<Typography
								variant="subtitle2"
								gutterBottom
								sx={{ color: isDarkMode ? '#ddd' : '#333' }}
							>
								Operations
							</Typography>
							<FormGroup
								sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}
							>
								{allOperations.map((operation) => (
									<FormControlLabel
										key={operation}
										control={
											<Checkbox
												checked={selectedOperations[operation] !== false}
												size="small"
												sx={{
													color: operationColors[operation] || '#9747FF',
													'&.Mui-checked': {
														color: operationColors[operation] || '#9747FF',
													},
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
										sx={{ width: '150px', margin: '0px 0px 4px 0px' }}
									/>
								))}
							</FormGroup>
						</Paper>

						{/* Algorithm Filter */}
						<Paper
							elevation={3}
							sx={{
								p: 2,
								bgcolor: isDarkMode
									? 'rgba(33,33,33,0.9)'
									: 'rgba(255,255,255,0.9)',
								borderRadius: '8px',
								flex: 1,
								minWidth: '250px',
							}}
						>
							<Typography
								variant="subtitle2"
								gutterBottom
								sx={{ color: isDarkMode ? '#ddd' : '#333' }}
							>
								Algorithm Groups
							</Typography>
							<FormGroup
								sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}
							>
								{Array.from(algorithmGroups.keys()).map((baseAlgorithm) => (
									<FormControlLabel
										key={baseAlgorithm}
										control={
											<Checkbox
												checked={isAlgorithmGroupChecked(baseAlgorithm)}
												indeterminate={isAlgorithmGroupIndeterminate(
													baseAlgorithm
												)}
												size="small"
												sx={{
													color: '#9747FF',
													'&.Mui-checked': {
														color: '#9747FF',
													},
												}}
												onChange={() =>
													handleAlgorithmGroupToggle(baseAlgorithm)
												}
											/>
										}
										label={
											<Typography
												variant="body2"
												sx={{ color: isDarkMode ? '#ddd' : '#333' }}
											>
												{baseAlgorithm.toUpperCase()}
											</Typography>
										}
										sx={{ width: '150px', margin: '0px 0px 4px 0px' }}
									/>
								))}
							</FormGroup>
						</Paper>
					</div>
				</>
			)}
		</div>
	);
};

export default PerformanceChart;
