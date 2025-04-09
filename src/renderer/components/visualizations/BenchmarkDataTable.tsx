import React, { useMemo, useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Typography,
	Box,
	Tooltip,
	Skeleton,
	useTheme,
	Modal,
	IconButton,
	FormControl,
	FormLabel,
	RadioGroup,
	FormControlLabel,
	Radio,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import {
	ProcessedBenchmarkData,
	OperationMetrics,
} from '../../utils/dataProcessingUtils';

// Define types for color highlight options
type TimeHighlightOption = 'average' | 'min' | 'max';
type MemoryHighlightOption = 'peak' | 'average';

interface BenchmarkDataTableProps {
	data: ProcessedBenchmarkData[];
	metric: 'avg_ms' | 'ops_per_sec' | 'mem_peak_kb';
	loading?: boolean;
	height?: number;
}

// Labels and descriptions for the metrics
const metricLabels = {
	avg_ms: 'Average Time (ms)',
	ops_per_sec: 'Operations Per Second',
	mem_peak_kb: 'Peak Memory Usage (KB)',
};

const metricDescriptions = {
	avg_ms:
		'Lower values indicate better performance. Shows the average time in milliseconds needed to complete the operation.',
	ops_per_sec:
		'Higher values indicate better performance. Shows how many operations an algorithm can complete per second.',
	mem_peak_kb:
		'Lower values generally indicate more efficient memory usage. Shows the maximum memory used during the operation in kilobytes.',
};

// Add additional columns based on selected metric
const getAdditionalColumns = (
	metric: string
): Array<keyof OperationMetrics> => {
	if (metric === 'avg_ms') {
		return ['min_ms', 'max_ms'];
	}
	if (metric === 'mem_peak_kb') {
		return ['mem_avg_kb'];
	}
	return [];
};

// Get header label for additional columns
const getAdditionalColumnLabel = (column: string): string => {
	switch (column) {
		case 'min_ms':
			return 'Min Time (ms)';
		case 'max_ms':
			return 'Max Time (ms)';
		case 'mem_avg_kb':
			return 'Avg Memory (KB)';
		default:
			return column;
	}
};

// Add additional column description tooltips
const getAdditionalColumnDescription = (column: string): string => {
	switch (column) {
		case 'min_ms':
			return 'Minimum time recorded for this operation across all iterations.';
		case 'max_ms':
			return 'Maximum time recorded for this operation across all iterations.';
		case 'mem_avg_kb':
			return 'Average memory usage across all iterations of this operation.';
		default:
			return '';
	}
};

// Helper functions
const formatNumber = (num: number, decimals: number = 2): string => {
	return num.toLocaleString(undefined, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
};

// Add a UUID generator function
function generateUniqueId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const BenchmarkDataTable: React.FC<BenchmarkDataTableProps> = ({
	data,
	metric,
	loading = false,
	height = 400,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [tableFullscreen, setTableFullscreen] = useState<boolean>(false);

	// Add state for color highlighting options
	const [timeHighlight, setTimeHighlight] =
		useState<TimeHighlightOption>('average');
	const [memoryHighlight, setMemoryHighlight] =
		useState<MemoryHighlightOption>('peak');
	const [showColorOptions, setShowColorOptions] = useState<boolean>(false);

	// Get additional columns based on the selected metric
	const additionalColumns = getAdditionalColumns(metric);

	// Process the data to extract unique operations and organize by algorithm
	const { tableData, operations } = useMemo(() => {
		if (data.length === 0) {
			return { tableData: [], operations: [] };
		}

		// Extract all unique operations
		const uniqueOperations = new Set<string>();
		data.forEach((item) => {
			item.operations.forEach((op) => {
				uniqueOperations.add(op.operation);
			});
		});

		// Sort operations in logical order (keygen, sign, verify, etc.)
		const operationOrder = [
			'keygen',
			'sign',
			'verify',
			'encapsulate',
			'decapsulate',
			'encryption',
			'decryption',
			'shared_secret',
		];

		const sortedOperations = Array.from(uniqueOperations).sort((a, b) => {
			const indexA = operationOrder.indexOf(a);
			const indexB = operationOrder.indexOf(b);
			if (indexA === -1 && indexB === -1) return a.localeCompare(b);
			if (indexA === -1) return 1;
			if (indexB === -1) return -1;
			return indexA - indexB;
		});

		// Create table data structure with truly unique IDs
		const processedData = data.map((item) => {
			// Create a unique ID for each row
			const uniqueId = generateUniqueId();

			const row: any = {
				id: uniqueId,
				algorithm: item.algorithm,
				variant: item.variant,
				originalId: `${item.algorithm}-${item.variant}`, // Store original ID separately
			};

			// Add each operation's primary metric value and additional columns
			sortedOperations.forEach((op) => {
				const operation = item.operations.find((o) => o.operation === op);
				row[op] = operation ? operation[metric] : null;

				// Add additional metric values for each operation
				additionalColumns.forEach((additionalColumn) => {
					const columnKey = `${op}_${additionalColumn}`;
					row[columnKey] = operation ? operation[additionalColumn] : null;
				});
			});

			return row;
		});

		// Sort by algorithm name and variant
		processedData.sort((a, b) => {
			if (a.algorithm !== b.algorithm) {
				return a.algorithm.localeCompare(b.algorithm);
			}
			return a.variant.localeCompare(b.variant);
		});

		return { tableData: processedData, operations: sortedOperations };
	}, [data, metric, additionalColumns]);

	// Get the appropriate metric to highlight based on user selection
	const getMetricToHighlight = (
		operation: string,
		baseMetric: string,
		row: any
	): { value: number | null; metricKey: string } => {
		if (baseMetric === 'avg_ms') {
			// For time metrics
			if (timeHighlight === 'min') {
				const key = `${operation}_min_ms`;
				return { value: row[key], metricKey: key };
			} else if (timeHighlight === 'max') {
				const key = `${operation}_max_ms`;
				return { value: row[key], metricKey: key };
			} else {
				// Default to average
				return { value: row[operation], metricKey: operation };
			}
		} else if (baseMetric === 'mem_peak_kb') {
			// For memory metrics
			if (memoryHighlight === 'average') {
				const key = `${operation}_mem_avg_kb`;
				return { value: row[key], metricKey: key };
			} else {
				// Default to peak
				return { value: row[operation], metricKey: operation };
			}
		}

		// For other metrics like ops_per_sec, just use the main value
		return { value: row[operation], metricKey: operation };
	};

	// Helper to get cell background color based on metric value
	const getCellBackgroundColor = (
		value: number,
		operation: string,
		metricKey: string
	): string => {
		if (value === null || value === undefined) return 'transparent';

		// Find min and max values for this metric across all rows to calculate color intensity
		const valuesForMetric = tableData
			.map((row) => row[metricKey])
			.filter((v) => v !== null && v !== undefined) as number[];

		if (valuesForMetric.length === 0) return 'transparent';

		const min = Math.min(...valuesForMetric);
		const max = Math.max(...valuesForMetric);

		// No range, or only one value
		if (min === max) return 'transparent';

		// Calculate where this value falls in the range
		let normalizedValue: number;

		if (metric === 'ops_per_sec') {
			// For ops_per_sec, higher is better
			normalizedValue = (value - min) / (max - min);
			// Return green scale (darker = better)
			return isDarkMode
				? `rgba(76, 175, 80, ${0.1 + normalizedValue * 0.4})`
				: `rgba(76, 175, 80, ${0.1 + normalizedValue * 0.3})`;
		} else {
			// For avg_ms and mem_peak_kb, lower is better
			normalizedValue = (value - min) / (max - min);
			// Return red scale (darker = worse)
			return isDarkMode
				? `rgba(233, 30, 99, ${0.1 + normalizedValue * 0.3})`
				: `rgba(233, 30, 99, ${0.1 + normalizedValue * 0.2})`;
		}
	};

	// Display names for operations
	const operationDisplayNames: { [key: string]: string } = {
		keygen: 'Key Generation',
		sign: 'Sign',
		verify: 'Verify',
		encapsulate: 'Encapsulate',
		decapsulate: 'Decapsulate',
		encryption: 'Encryption',
		decryption: 'Decryption',
		shared_secret: 'Shared Secret',
	};

	// Handle color option changes
	const handleTimeHighlightChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setTimeHighlight(event.target.value as TimeHighlightOption);
	};

	const handleMemoryHighlightChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setMemoryHighlight(event.target.value as MemoryHighlightOption);
	};

	const toggleColorOptions = () => {
		setShowColorOptions(!showColorOptions);
	};

	// Define a function to render table headers and body that can be reused
	const renderTableContent = (): React.ReactNode => (
		<>
			<TableHead>
				<TableRow>
					<TableCell
						sx={{
							fontWeight: 'bold',
							bgcolor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
							color: isDarkMode ? '#fff' : '#000',
						}}
					>
						Algorithm
					</TableCell>
					<TableCell
						sx={{
							fontWeight: 'bold',
							bgcolor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
							color: isDarkMode ? '#fff' : '#000',
						}}
					>
						Variant
					</TableCell>
					{operations.map((op) => (
						<React.Fragment key={op}>
							{/* Main metric column */}
							<TableCell
								align="right"
								sx={{
									fontWeight: 'bold',
									bgcolor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
									color: isDarkMode ? '#fff' : '#000',
								}}
							>
								<Tooltip
									title={`${operationDisplayNames[op] || op}: ${
										metricLabels[metric]
									}`}
									arrow
								>
									<span>{operationDisplayNames[op] || op}</span>
								</Tooltip>
							</TableCell>

							{/* Additional columns for this operation */}
							{additionalColumns.map((addCol) => (
								<TableCell
									key={`${op}_${addCol}`}
									align="right"
									sx={{
										fontWeight: 'bold',
										bgcolor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
										color: isDarkMode ? '#fff' : '#000',
									}}
								>
									<Tooltip title={getAdditionalColumnDescription(addCol)} arrow>
										<span>{getAdditionalColumnLabel(addCol)}</span>
									</Tooltip>
								</TableCell>
							))}
						</React.Fragment>
					))}
				</TableRow>
			</TableHead>
			<TableBody>
				{tableData.map((row) => (
					<TableRow key={row.id} hover>
						<TableCell
							component="th"
							scope="row"
							sx={{
								color: '#9747FF',
								fontWeight: 'medium',
								whiteSpace: 'nowrap',
							}}
						>
							{row.algorithm}
						</TableCell>
						<TableCell sx={{ whiteSpace: 'nowrap' }}>{row.variant}</TableCell>
						{operations.map((op) => (
							<React.Fragment key={`${row.id}-${op}`}>
								{/* Main metric value */}
								<TableCell
									align="right"
									sx={{
										backgroundColor: (() => {
											if (row[op] === null) return 'transparent';

											// Determine which metric to use for color highlighting
											const metricToHighlight = getMetricToHighlight(
												op,
												metric,
												row
											);

											// If this is the highlighted column, apply color
											if (
												(metric === 'avg_ms' && timeHighlight === 'average') ||
												(metric === 'mem_peak_kb' &&
													memoryHighlight === 'peak') ||
												metric === 'ops_per_sec'
											) {
												return getCellBackgroundColor(row[op], op, op);
											}
											return 'transparent';
										})(),
										whiteSpace: 'nowrap',
									}}
								>
									{row[op] !== null && row[op] !== undefined
										? formatNumber(row[op])
										: '—'}
								</TableCell>

								{/* Additional metric values */}
								{additionalColumns.map((addCol) => {
									const columnKey = `${op}_${addCol}`;
									// Determine if this column should be highlighted
									const shouldHighlight =
										(metric === 'avg_ms' &&
											((addCol === 'min_ms' && timeHighlight === 'min') ||
												(addCol === 'max_ms' && timeHighlight === 'max'))) ||
										(metric === 'mem_peak_kb' &&
											addCol === 'mem_avg_kb' &&
											memoryHighlight === 'average');

									return (
										<TableCell
											key={`${row.id}-${columnKey}`}
											align="right"
											sx={{
												backgroundColor:
													shouldHighlight && row[columnKey] !== null
														? getCellBackgroundColor(
																row[columnKey],
																op,
																columnKey
														  )
														: 'transparent',
												whiteSpace: 'nowrap',
											}}
										>
											{row[columnKey] !== null && row[columnKey] !== undefined
												? formatNumber(row[columnKey])
												: '—'}
										</TableCell>
									);
								})}
							</React.Fragment>
						))}
					</TableRow>
				))}
			</TableBody>
		</>
	);

	// Render the color highlighting controls
	const renderColorControls = () => {
		if (!showColorOptions) return null;

		return (
			<Box
				sx={{
					mt: 2,
					mb: 2,
					p: 2,
					bgcolor: isDarkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
					borderRadius: '8px',
				}}
			>
				{metric === 'avg_ms' && (
					<FormControl component="fieldset" sx={{ mb: 1 }}>
						<FormLabel
							component="legend"
							sx={{ fontSize: '0.9rem', color: isDarkMode ? '#ccc' : '#555' }}
						>
							Highlight Time Values
						</FormLabel>
						<RadioGroup
							row
							aria-label="time-highlight"
							name="time-highlight"
							value={timeHighlight}
							onChange={handleTimeHighlightChange}
						>
							<FormControlLabel
								value="average"
								control={<Radio size="small" sx={{ color: '#E91E63' }} />}
								label="Average"
								sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
							/>
							<FormControlLabel
								value="min"
								control={<Radio size="small" sx={{ color: '#E91E63' }} />}
								label="Min"
								sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
							/>
							<FormControlLabel
								value="max"
								control={<Radio size="small" sx={{ color: '#E91E63' }} />}
								label="Max"
								sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
							/>
						</RadioGroup>
					</FormControl>
				)}

				{metric === 'mem_peak_kb' && (
					<FormControl component="fieldset">
						<FormLabel
							component="legend"
							sx={{ fontSize: '0.9rem', color: isDarkMode ? '#ccc' : '#555' }}
						>
							Highlight Memory Values
						</FormLabel>
						<RadioGroup
							row
							aria-label="memory-highlight"
							name="memory-highlight"
							value={memoryHighlight}
							onChange={handleMemoryHighlightChange}
						>
							<FormControlLabel
								value="peak"
								control={<Radio size="small" sx={{ color: '#E91E63' }} />}
								label="Peak"
								sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
							/>
							<FormControlLabel
								value="average"
								control={<Radio size="small" sx={{ color: '#E91E63' }} />}
								label="Average"
								sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
							/>
						</RadioGroup>
					</FormControl>
				)}
			</Box>
		);
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

	if (data.length === 0) {
		return (
			<Box
				display="flex"
				alignItems="center"
				justifyContent="center"
				height={height}
				sx={{
					bgcolor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
					borderRadius: '8px',
					border: '1px dashed',
					borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
				}}
			>
				<Typography variant="body1" color="textSecondary">
					No data available. Run benchmarks to see metrics.
				</Typography>
			</Box>
		);
	}

	return (
		<Box>
			{/* Fullscreen Modal */}
			<Modal
				open={tableFullscreen}
				onClose={() => setTableFullscreen(false)}
				aria-labelledby="table-modal-title"
				aria-describedby="table-modal-description"
			>
				<Box
					sx={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						width: '90%',
						height: '90%',
						bgcolor: isDarkMode ? '#212121' : '#f0f0f0',
						boxShadow: 24,
						p: 4,
						borderRadius: 2,
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<div className="flex justify-between items-center mb-3">
						<Typography id="table-modal-title" variant="h6" component="h2">
							{metricLabels[metric]}
							<Tooltip title={metricDescriptions[metric]} arrow>
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
						<Box sx={{ display: 'flex', alignItems: 'center' }}>
							<Tooltip title="Toggle Color Highlighting Options">
								<IconButton
									onClick={toggleColorOptions}
									size="small"
									sx={{ mr: 1 }}
								>
									<ColorLensIcon />
								</IconButton>
							</Tooltip>
							<IconButton onClick={() => setTableFullscreen(false)}>
								<FullscreenExitIcon />
							</IconButton>
						</Box>
					</div>

					{/* Color controls in fullscreen mode */}
					{renderColorControls()}

					{/* Table in fullscreen mode */}
					<TableContainer
						component={Paper}
						sx={{
							flex: 1,
							overflow: 'auto',
							bgcolor: isDarkMode
								? 'rgba(33,33,33,0.9)'
								: 'rgba(255,255,255,0.9)',
							'& .MuiTableCell-root': {
								borderBottom: `1px solid ${
									isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
								}`,
							},
						}}
					>
						<Table stickyHeader>{renderTableContent()}</Table>
					</TableContainer>
				</Box>
			</Modal>

			{/* Modified header with color options and fullscreen buttons */}
			<Box
				sx={{
					mb: 2,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Box sx={{ display: 'flex', alignItems: 'center' }}>
					<Typography variant="subtitle1">{metricLabels[metric]}</Typography>
					<Tooltip title={metricDescriptions[metric]} arrow>
						<InfoOutlinedIcon
							fontSize="small"
							sx={{
								verticalAlign: 'middle',
								ml: 0.5,
								color: isDarkMode ? '#aaa' : '#666',
							}}
						/>
					</Tooltip>
				</Box>
				<Box>
					<Tooltip title="Toggle Color Highlighting Options">
						<IconButton
							onClick={toggleColorOptions}
							size="small"
							sx={{ mr: 1 }}
						>
							<ColorLensIcon />
						</IconButton>
					</Tooltip>
					<Tooltip title="View Fullscreen">
						<IconButton onClick={() => setTableFullscreen(true)} size="small">
							<FullscreenIcon />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>

			{/* Color controls in regular mode */}
			{renderColorControls()}

			{/* Regular table */}
			<TableContainer
				component={Paper}
				sx={{
					maxHeight: height,
					bgcolor: isDarkMode ? 'rgba(33,33,33,0.9)' : 'rgba(255,255,255,0.9)',
					'& .MuiTableCell-root': {
						borderBottom: `1px solid ${
							isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
						}`,
					},
				}}
			>
				<Table stickyHeader>{renderTableContent()}</Table>
			</TableContainer>
		</Box>
	);
};

export default BenchmarkDataTable;
