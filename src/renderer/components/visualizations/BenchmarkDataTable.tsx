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
	Button,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
	ProcessedBenchmarkData,
	OperationMetrics,
} from '../../utils/dataProcessingUtils';

// Define types for color highlight options
type TimeHighlightOption = 'average' | 'min' | 'max';
type MemoryHighlightOption = 'peak' | 'average';
type SortDirection = 'asc' | 'desc' | 'none';

interface BenchmarkDataTableProps {
	data: ProcessedBenchmarkData[];
	metric: 'avg_ms' | 'ops_per_sec' | 'mem_peak_kb';
	loading?: boolean;
	height?: number;
	sortColumn?: string;
	sortDirection?: SortDirection;
	onSortChange?: (column: string, direction: SortDirection) => void;
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
	sortColumn = '',
	sortDirection = 'none',
	onSortChange = () => {},
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [tableFullscreen, setTableFullscreen] = useState<boolean>(false);

	// Add state for color highlighting options
	const [timeHighlight, setTimeHighlight] =
		useState<TimeHighlightOption>('average');
	const [memoryHighlight, setMemoryHighlight] =
		useState<MemoryHighlightOption>('peak');

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

		// Apply sorting if enabled
		let sorted = [...processedData];

		if (sortColumn && sortDirection !== 'none') {
			sorted.sort((a, b) => {
				// If sorting by algorithm or variant
				if (sortColumn === 'algorithm' || sortColumn === 'variant') {
					const aValue = a[sortColumn] || '';
					const bValue = b[sortColumn] || '';
					const compareResult = aValue.localeCompare(bValue);
					return sortDirection === 'asc' ? compareResult : -compareResult;
				}

				// If sorting by operation metrics
				const aValue =
					a[sortColumn] === null ? Number.NEGATIVE_INFINITY : a[sortColumn];
				const bValue =
					b[sortColumn] === null ? Number.NEGATIVE_INFINITY : b[sortColumn];
				const compareResult = aValue - bValue;
				return sortDirection === 'asc' ? compareResult : -compareResult;
			});

			return { tableData: sorted, operations: sortedOperations };
		}

		// Default sorting by algorithm name and variant when no column sort is active
		sorted.sort((a, b) => {
			if (a.algorithm !== b.algorithm) {
				return a.algorithm.localeCompare(b.algorithm);
			}
			return a.variant.localeCompare(b.variant);
		});

		return { tableData: sorted, operations: sortedOperations };
	}, [data, metric, additionalColumns, sortColumn, sortDirection]);

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

	// Handle column header click for sorting
	const handleHeaderClick = (column: string) => {
		let newDirection: SortDirection = 'asc';

		// If already sorting by this column, toggle direction
		if (column === sortColumn) {
			if (sortDirection === 'asc') {
				newDirection = 'desc';
			} else if (sortDirection === 'desc') {
				newDirection = 'none'; // Third click resets
			}
		}

		onSortChange(column, newDirection);
	};

	// Reset sorting to default
	const handleResetSort = () => {
		onSortChange('', 'none');
	};

	// Render the color highlighting controls
	const renderColorControls = () => {
		return null; // Return null instead of the controls box
	};

	// Render the table with headers and body
	const renderTable = () => (
		<Table
			stickyHeader
			aria-label="benchmark data table"
			size="small"
			sx={{
				'.MuiTableCell-root': {
					borderBottom: isDarkMode
						? '1px solid rgba(255, 255, 255, 0.1)'
						: '1px solid rgba(0, 0, 0, 0.1)',
				},
				minWidth: operations.length > 3 ? 900 : 600, // Ensure minimum width for many columns
				tableLayout: 'fixed', // Fixed table layout to prevent column width inconsistencies
			}}
		>
			<TableHead>
				<TableRow>
					{/* Algorithm Column Header */}
					<TableCell
						sx={{
							backgroundColor: isDarkMode ? '#333333' : '#f5f5f5',
							color: isDarkMode ? '#FFFFFF' : '#000000',
							fontWeight: 'bold',
							cursor: 'pointer',
							userSelect: 'none',
							position: 'sticky',
							left: 0,
							zIndex: 3,
							width: '150px',
							padding: '10px 16px',
							borderRight: isDarkMode
								? '1px solid rgba(255, 255, 255, 0.05)'
								: '1px solid rgba(0, 0, 0, 0.05)',
						}}
						onClick={() => handleHeaderClick('algorithm')}
					>
						<Box sx={{ display: 'flex', alignItems: 'center' }}>
							Algorithm
							{sortColumn === 'algorithm' &&
								sortDirection !== 'none' &&
								(sortDirection === 'asc' ? (
									<ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5 }} />
								) : (
									<ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5 }} />
								))}
						</Box>
					</TableCell>

					{/* Variant Column Header */}
					<TableCell
						sx={{
							backgroundColor: isDarkMode ? '#333333' : '#f5f5f5',
							color: isDarkMode ? '#FFFFFF' : '#000000',
							fontWeight: 'bold',
							cursor: 'pointer',
							userSelect: 'none',
							position: 'sticky',
							left: 0,
							zIndex: 3,
							width: '100px',
							padding: '10px 16px',
							borderRight: isDarkMode
								? '1px solid rgba(255, 255, 255, 0.05)'
								: '1px solid rgba(0, 0, 0, 0.05)',
						}}
						onClick={() => handleHeaderClick('variant')}
					>
						<Box sx={{ display: 'flex', alignItems: 'center' }}>
							Variant
							{sortColumn === 'variant' &&
								sortDirection !== 'none' &&
								(sortDirection === 'asc' ? (
									<ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5 }} />
								) : (
									<ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5 }} />
								))}
						</Box>
					</TableCell>

					{/* Operation Column Headers */}
					{operations.map((operation) => (
						<TableCell
							key={operation}
							sx={{
								backgroundColor: isDarkMode ? '#333333' : '#f5f5f5',
								color: isDarkMode ? '#FFFFFF' : '#000000',
								fontWeight: 'bold',
								cursor: 'pointer',
								userSelect: 'none',
								padding: '10px 16px',
								width: `${Math.floor(100 / operations.length)}%`,
								minWidth: '120px',
								borderRight: isDarkMode
									? '1px solid rgba(255, 255, 255, 0.05)'
									: '1px solid rgba(0, 0, 0, 0.05)',
							}}
							onClick={() => handleHeaderClick(operation)}
						>
							<Box sx={{ display: 'flex', alignItems: 'center' }}>
								{operation.charAt(0).toUpperCase() + operation.slice(1)}
								{sortColumn === operation &&
									sortDirection !== 'none' &&
									(sortDirection === 'asc' ? (
										<ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5 }} />
									) : (
										<ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5 }} />
									))}
							</Box>

							{/* Additional metrics displayed below main label for this operation */}
							{additionalColumns.map((additionalColumn) => {
								const columnKey = `${operation}_${additionalColumn}`;
								return (
									<Box
										key={columnKey}
										sx={{
											fontSize: '0.7rem',
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.7)'
												: 'rgba(0, 0, 0, 0.7)',
											display: 'flex',
											alignItems: 'center',
											cursor: 'pointer',
											mt: 0.5,
										}}
										onClick={(e) => {
											e.stopPropagation(); // Stop propagation to parent cell click
											handleHeaderClick(columnKey);
										}}
									>
										{getAdditionalColumnLabel(additionalColumn)}
										{sortColumn === columnKey &&
											sortDirection !== 'none' &&
											(sortDirection === 'asc' ? (
												<ArrowUpwardIcon
													fontSize="small"
													sx={{ ml: 0.5, fontSize: '0.8rem' }}
												/>
											) : (
												<ArrowDownwardIcon
													fontSize="small"
													sx={{ ml: 0.5, fontSize: '0.8rem' }}
												/>
											))}
									</Box>
								);
							})}
						</TableCell>
					))}
				</TableRow>
			</TableHead>

			<TableBody>
				{loading ? (
					// Skeleton loading state
					Array.from(new Array(5)).map((_, index) => (
						<TableRow key={index}>
							<TableCell>
								<Skeleton variant="text" width="80%" />
							</TableCell>
							<TableCell>
								<Skeleton variant="text" width="60%" />
							</TableCell>
							{operations.map((op, i) => (
								<TableCell key={i}>
									<Skeleton variant="text" width="70%" />
									{additionalColumns.map((_, j) => (
										<Box key={j} sx={{ mt: 1 }}>
											<Skeleton variant="text" width="40%" height={15} />
										</Box>
									))}
								</TableCell>
							))}
						</TableRow>
					))
				) : tableData.length === 0 ? (
					// No data state
					<TableRow>
						<TableCell
							colSpan={2 + operations.length}
							align="center"
							sx={{ py: 3 }}
						>
							<Typography variant="body1" color="textSecondary">
								No data available for the selected filters.
							</Typography>
						</TableCell>
					</TableRow>
				) : (
					// Actual data rows
					tableData.map((row) => (
						<TableRow
							key={row.id}
							sx={{
								'&:hover': {
									backgroundColor: isDarkMode
										? 'rgba(255, 255, 255, 0.05)'
										: 'rgba(0, 0, 0, 0.05)',
								},
							}}
						>
							<TableCell
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									fontWeight: 'medium',
									position: 'sticky',
									left: 0,
									backgroundColor: isDarkMode ? '#212121' : '#E9E9E9',
									zIndex: 2,
									padding: '8px 16px',
									borderRight: isDarkMode
										? '1px solid rgba(255, 255, 255, 0.05)'
										: '1px solid rgba(0, 0, 0, 0.05)',
								}}
							>
								{row.algorithm}
							</TableCell>
							<TableCell
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									fontStyle: 'italic',
									padding: '8px 16px',
									borderRight: isDarkMode
										? '1px solid rgba(255, 255, 255, 0.05)'
										: '1px solid rgba(0, 0, 0, 0.05)',
								}}
							>
								{row.variant}
							</TableCell>
							{operations.map((operation) => {
								const { value, metricKey } = getMetricToHighlight(
									operation,
									metric,
									row
								);
								const backgroundColor =
									value !== null
										? getCellBackgroundColor(value, operation, metricKey)
										: 'transparent';

								return (
									<TableCell
										key={operation}
										sx={{
											color: isDarkMode ? '#FFFFFF' : '#000000',
											backgroundColor,
											transition: 'background-color 0.3s',
											padding: '8px 16px',
											borderRight: isDarkMode
												? '1px solid rgba(255, 255, 255, 0.05)'
												: '1px solid rgba(0, 0, 0, 0.05)',
										}}
									>
										{row[operation] !== null ? (
											formatNumber(row[operation])
										) : (
											<Typography
												variant="body2"
												color="textSecondary"
												sx={{ fontStyle: 'italic' }}
											>
												N/A
											</Typography>
										)}

										{/* Additional metrics for this operation */}
										{additionalColumns.map((additionalColumn) => {
											const columnKey = `${operation}_${additionalColumn}`;
											return (
												<Box
													key={columnKey}
													sx={{
														fontSize: '0.7rem',
														color: isDarkMode
															? 'rgba(255, 255, 255, 0.6)'
															: 'rgba(0, 0, 0, 0.6)',
														mt: 0.5,
													}}
												>
													{row[columnKey] !== null
														? `${getAdditionalColumnLabel(
																additionalColumn
														  )}: ${formatNumber(row[columnKey])}`
														: ''}
												</Box>
											);
										})}
									</TableCell>
								);
							})}
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);

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
						overflow: 'hidden', // Prevent modal overflow
					}}
				>
					{/* Modal Header */}
					<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
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

						<Box sx={{ display: 'flex', gap: 1 }}>
							{/* Reset Sort Button - only show if sorting is active */}
							{sortColumn && sortDirection !== 'none' && (
								<Button
									size="small"
									startIcon={<RestartAltIcon />}
									onClick={handleResetSort}
									variant="outlined"
									sx={{
										borderColor: '#9747FF',
										color: isDarkMode ? '#FFFFFF' : '#000000',
										'&:hover': {
											borderColor: '#8030E0',
											bgcolor: isDarkMode
												? 'rgba(151, 71, 255, 0.1)'
												: 'rgba(151, 71, 255, 0.1)',
										},
									}}
								>
									Reset Sort
								</Button>
							)}

							<IconButton
								onClick={() => setTableFullscreen(false)}
								size="small"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									border: '1px solid',
									borderColor: isDarkMode
										? 'rgba(255, 255, 255, 0.2)'
										: 'rgba(0, 0, 0, 0.2)',
								}}
							>
								<FullscreenExitIcon fontSize="small" />
							</IconButton>
						</Box>
					</Box>

					{/* Color controls in fullscreen mode */}
					{/* renderColorControls() - removed */}

					{/* Table container with overflow handling */}
					<TableContainer
						component={Paper}
						elevation={0}
						sx={{
							flex: 1,
							overflow: 'auto',
							backgroundColor: 'transparent',
							borderRadius: '8px',
						}}
					>
						{renderTable()}
					</TableContainer>
				</Box>
			</Modal>

			{/* Normal view container */}
			<Box sx={{ width: '100%' }}>
				{/* Action Bar */}
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						mb: 2,
					}}
				>
					{/* Title and info */}
					<Box sx={{ display: 'flex', alignItems: 'center' }}>
						<Typography
							variant="h6"
							component="h3"
							sx={{
								fontWeight: 'medium',
								color: isDarkMode ? '#FFFFFF' : '#000000',
							}}
						>
							{metricLabels[metric]}
						</Typography>
						<Tooltip title={metricDescriptions[metric]} placement="top">
							<InfoOutlinedIcon
								sx={{
									ml: 1,
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.7)'
										: 'rgba(0, 0, 0, 0.7)',
								}}
							/>
						</Tooltip>
					</Box>

					{/* Action buttons */}
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						{/* Reset Sort Button - only show if sorting is active */}
						{sortColumn && sortDirection !== 'none' && (
							<Button
								size="small"
								startIcon={<RestartAltIcon />}
								onClick={handleResetSort}
								variant="outlined"
								sx={{
									borderColor: '#9747FF',
									color: isDarkMode ? '#FFFFFF' : '#000000',
									'&:hover': {
										borderColor: '#8030E0',
										bgcolor: isDarkMode
											? 'rgba(151, 71, 255, 0.1)'
											: 'rgba(151, 71, 255, 0.1)',
									},
								}}
							>
								Reset Sort
							</Button>
						)}

						<Tooltip title="View Fullscreen">
							<IconButton
								onClick={() => setTableFullscreen(true)}
								size="small"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									border: '1px solid',
									borderColor: isDarkMode
										? 'rgba(255, 255, 255, 0.2)'
										: 'rgba(0, 0, 0, 0.2)',
								}}
							>
								<FullscreenIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				</Box>

				{/* Color controls - now always visible */}
				{/* renderColorControls() - removed */}

				{/* Table container */}
				<TableContainer
					component={Paper}
					elevation={0}
					sx={{
						maxHeight: height,
						backgroundColor: 'transparent',
						borderRadius: '8px',
						overflow: 'auto',
					}}
				>
					{renderTable()}
				</TableContainer>
			</Box>
		</Box>
	);
};

export default BenchmarkDataTable;
