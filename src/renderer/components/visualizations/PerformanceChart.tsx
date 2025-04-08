import React, { useState, useEffect } from 'react';
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
}

const PerformanceChart = ({
	data,
	title = 'Performance Comparison',
	metricType = 'avg_ms',
	height = 400,
	loading = false,
	selectedOperations = {},
	selectedAlgorithms = {},
	sortOrder = 'default',
	onOperationsChange,
	onAlgorithmsChange,
	onSortOrderChange,
}: PerformanceChartProps) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [plotData, setPlotData] = useState<any[]>([]);
	const [allOperations, setAllOperations] = useState<string[]>([]);
	const [allAlgorithms, setAllAlgorithms] = useState<string[]>([]);
	const [algorithmGroups, setAlgorithmGroups] = useState<Map<string, string[]>>(
		new Map()
	);

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
				console.log(
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
					console.warn(
						`Missing metric ${metricType} for operation ${operationName} in ${algorithm}`
					);
				}
			});
		});

		// Set the operations and algorithms arrays
		const operationsArray = Array.from(uniqueOperations);
		setAllOperations(operationsArray);
		console.log('Available operations for visualization:', operationsArray);

		const algorithmsArray = Array.from(uniqueAlgorithms);
		setAllAlgorithms(algorithmsArray);
		console.log('Available algorithms for visualization:', algorithmsArray);

		// Initialize selections if they're empty
		if (onOperationsChange && Object.keys(selectedOperations).length === 0) {
			const initialSelections = Object.fromEntries(
				operationsArray.map((op) => [op, true])
			);
			onOperationsChange(initialSelections);
			console.log('Initialized operation selections:', initialSelections);
		}

		if (onAlgorithmsChange && Object.keys(selectedAlgorithms).length === 0) {
			const initialAlgorithmSelections = Object.fromEntries(
				algorithmsArray.map((alg) => [alg, true])
			);
			onAlgorithmsChange(initialAlgorithmSelections);
			console.log(
				'Initialized algorithm selections:',
				initialAlgorithmSelections
			);
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

				if (sortOrder === 'asc') {
					return aVal - bVal; // Sort low to high
				} else if (sortOrder === 'desc') {
					return bVal - aVal; // Sort high to low
				} else if (sortOrder === 'alpha') {
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

	// Define chart layout
	const layout = {
		title: title,
		barmode: 'group' as const,
		height: height,
		margin: { l: 60, r: 30, t: 50, b: 120 }, // Increased bottom margin for x-axis labels
		bargap: 0.25, // Space between different algorithm groups
		bargroupgap: 0.1, // Space between bars within the same algorithm group
		xaxis: {
			title: 'Algorithm',
			tickangle: -45,
			gridcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
		},
		yaxis: {
			title: metricLabels[metricType],
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
		showlegend: false, // Hide default legend since we're creating a custom one
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
		<>
			{/* Conditionally render the chart or no data message */}
			{data.length === 0 || plotData.length === 0 ? (
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
					}}
				>
					<Typography
						variant="body1"
						color={isDarkMode ? 'text.secondary' : 'text.primary'}
					>
						{data.length === 0
							? 'No data available for visualization. Run benchmarks to generate data.'
							: 'No data displayed with current filters. Select at least one algorithm and operation.'}
					</Typography>
				</Box>
			) : (
				<>
					<Paper
						elevation={0}
						sx={{
							backgroundColor: isDarkMode
								? 'rgba(0,0,0,0.3)'
								: 'rgba(0,0,0,0.03)',
							p: 1.5,
							mb: 2,
							borderRadius: '8px',
							border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
						}}
					>
						<Typography variant="body2" color="text.secondary">
							<strong>What this measures:</strong>{' '}
							{metricDescriptions[metricType]}
							&nbsp;
							<Tooltip
								title={`This chart compares ${metricLabels[metricType]} across different cryptographic algorithms and their variants. Use the checkboxes below to filter operations and algorithms.`}
								arrow
							>
								<InfoOutlined
									sx={{ fontSize: '0.9rem', verticalAlign: 'middle' }}
								/>
							</Tooltip>
						</Typography>
					</Paper>

					<Plot
						data={plotData}
						layout={layout}
						config={config}
						style={{ width: '100%', height: 'auto' }}
					/>
				</>
			)}

			{/* Controls panel with sorting and filters in horizontal layout */}
			<Grid container spacing={2} sx={{ mt: 2 }}>
				{/* Sorting controls */}
				<Grid item xs={12} sm={12} md={12} lg={12}>
					<Card
						variant="outlined"
						sx={{
							borderRadius: '8px',
							backgroundColor: isDarkMode
								? 'rgba(0,0,0,0.3)'
								: 'rgba(255,255,255,0.7)',
							border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
						}}
					>
						<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
							<Grid container alignItems="center" spacing={2}>
								<Grid item>
									<Typography
										variant="subtitle1"
										sx={{ display: 'flex', alignItems: 'center' }}
									>
										<SortIcon sx={{ mr: 1 }} /> Sort Options
									</Typography>
								</Grid>
								<Grid item>
									<FormControl size="small" sx={{ minWidth: 200 }}>
										<Select
											value={sortOrder}
											onChange={handleSortChange}
											displayEmpty
											variant="outlined"
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
											<MenuItem value="alpha">Alphabetical</MenuItem>
										</Select>
									</FormControl>
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				</Grid>

				{/* Filter sections - side by side */}
				<Grid item xs={12} sm={6} md={6} lg={6}>
					<Box
						sx={{
							p: 2,
							borderRadius: '8px',
							backgroundColor: isDarkMode
								? 'rgba(0,0,0,0.5)'
								: 'rgba(255,255,255,0.7)',
							border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
							height: '100%',
						}}
					>
						<Typography variant="subtitle1" gutterBottom>
							Operations
						</Typography>
						<FormGroup>
							<Grid container spacing={1}>
								{allOperations.map((operation) => (
									<Grid item xs={6} sm={6} md={4} lg={3} key={operation}>
										<FormControlLabel
											key={operation}
											control={
												<Checkbox
													checked={selectedOperations[operation] || false}
													onChange={() => handleOperationToggle(operation)}
													sx={{
														color: operationColors[operation],
														'&.Mui-checked': {
															color: operationColors[operation],
														},
													}}
												/>
											}
											label={operationDisplayNames[operation] || operation}
										/>
									</Grid>
								))}
							</Grid>
						</FormGroup>
					</Box>
				</Grid>

				<Grid item xs={12} sm={6} md={6} lg={6}>
					<Box
						sx={{
							p: 2,
							borderRadius: '8px',
							backgroundColor: isDarkMode
								? 'rgba(0,0,0,0.5)'
								: 'rgba(255,255,255,0.7)',
							border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
							height: '100%',
						}}
					>
						<Typography variant="subtitle1" gutterBottom>
							Algorithms
						</Typography>
						<FormGroup>
							<Grid container spacing={1}>
								{Array.from(algorithmGroups.keys()).map((baseAlgorithm) => {
									// Get all full algorithm names for this base algorithm
									const algorithmsForGroup =
										algorithmGroups.get(baseAlgorithm) || [];
									// Check if any are currently selected
									const groupAnySelected = algorithmsForGroup.some(
										(alg) => selectedAlgorithms[alg]
									);

									return (
										<Grid item xs={6} sm={6} md={4} lg={3} key={baseAlgorithm}>
											<FormControlLabel
												control={
													<Checkbox
														checked={groupAnySelected}
														onChange={() =>
															handleAlgorithmGroupToggle(baseAlgorithm)
														}
														sx={{
															color: isDarkMode ? '#fff' : '#333',
															'&.Mui-checked': {
																color: '#9747FF',
															},
														}}
													/>
												}
												label={
													baseAlgorithm.charAt(0).toUpperCase() +
													baseAlgorithm.slice(1)
												}
											/>
										</Grid>
									);
								})}
							</Grid>
						</FormGroup>
					</Box>
				</Grid>
			</Grid>
		</>
	);
};

export default PerformanceChart;
