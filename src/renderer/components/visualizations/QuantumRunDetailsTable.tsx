import React, { useState, useMemo } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Typography,
	Tooltip,
	IconButton,
	Box,
	Chip,
	TableSortLabel,
	TablePagination,
	TextField,
	InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ProcessedQuantumData } from '../../utils/dataProcessingUtils';
import SearchIcon from '@mui/icons-material/Search';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LaptopIcon from '@mui/icons-material/Laptop';
import MemoryIcon from '@mui/icons-material/Memory';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Define column types for sorting
type Column = {
	id: keyof ProcessedQuantumData | 'formattedTime';
	label: string;
	tooltip?: string;
	align?: 'left' | 'right' | 'center';
	format?: (value: any, row?: ProcessedQuantumData) => any;
	width?: string;
};

interface QuantumRunDetailsTableProps {
	data: ProcessedQuantumData[];
	loading?: boolean;
	height?: number;
	onViewDetails?: (runId: string) => void;
}

const QuantumRunDetailsTable: React.FC<QuantumRunDetailsTableProps> = ({
	data,
	loading = false,
	height = 400,
	onViewDetails,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Table state
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);
	const [orderBy, setOrderBy] = useState<
		keyof ProcessedQuantumData | 'formattedTime'
	>('timestamp');
	const [order, setOrder] = useState<'asc' | 'desc'>('desc');
	const [searchQuery, setSearchQuery] = useState('');

	// Define columns with tooltips and formatting
	const columns: Column[] = [
		{
			id: 'algorithm',
			label: 'Algorithm',
			tooltip: 'The quantum algorithm that was executed',
			width: '15%',
		},
		{
			id: 'formattedTime',
			label: 'Run Time',
			tooltip: 'When the quantum workload was executed',
			width: '15%',
		},
		{
			id: 'backend_used',
			label: 'Backend',
			tooltip: 'The quantum hardware or simulator used to run the algorithm',
			width: '15%',
			format: (value: any) => value || 'Unknown',
		},
		{
			id: 'success_rate',
			label: 'Success',
			tooltip: 'Whether the algorithm produced the expected result',
			align: 'center',
			width: '10%',
			format: (value: any, row?: ProcessedQuantumData) => {
				// Special handling for Grover's algorithm
				if (row && row.quantum_type === 'Quantum_Grover') {
					// For Grover's algorithm, check if we have a confidence value as an additional signal
					const isSuccess =
						value > 0 || (row.confidence && row.confidence >= 0.4);

					return isSuccess ? (
						<Tooltip
							title={`Success rate: ${(value > 0
								? value * 100
								: (row.confidence || 0) * 100
							).toFixed(1)}%`}
						>
							<CheckCircleIcon
								sx={{
									color:
										value >= 0.5 || (row.confidence && row.confidence >= 0.6)
											? '#4caf50'
											: '#ff9800',
									fontSize: '1.2rem',
								}}
							/>
						</Tooltip>
					) : (
						<Tooltip title="Algorithm did not produce expected result">
							<ErrorOutlineIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />
						</Tooltip>
					);
				}

				// Default handling for other algorithms
				return value !== undefined ? (
					value > 0 ? (
						<Tooltip title={`Success rate: ${(value * 100).toFixed(1)}%`}>
							<CheckCircleIcon
								sx={{
									color: value >= 0.5 ? '#4caf50' : '#ff9800',
									fontSize: '1.2rem',
								}}
							/>
						</Tooltip>
					) : (
						<Tooltip title="Algorithm did not produce expected result">
							<ErrorOutlineIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />
						</Tooltip>
					)
				) : (
					'—'
				);
			},
		},
		{
			id: 'confidence',
			label: 'Confidence',
			tooltip: 'Fraction of shots yielding the top measured state',
			align: 'center',
			width: '10%',
			format: (value: any) =>
				value !== undefined ? (
					<Tooltip title={`Confidence: ${(value * 100).toFixed(1)}%`}>
						<span>{`${(value * 100).toFixed(1)}%`}</span>
					</Tooltip>
				) : (
					'—'
				),
		},
		{
			id: 'circuit_depth',
			label: 'Depth',
			tooltip: 'Circuit depth (number of sequential operations)',
			align: 'right',
			width: '10%',
			format: (value: any) => (value !== null ? value : '—'),
		},
		{
			id: 'execution_time_sec',
			label: 'Time (s)',
			tooltip: 'Total execution time in seconds',
			align: 'right',
			width: '10%',
			format: (value: any) => (value !== null ? Number(value).toFixed(2) : '—'),
		},
		{
			id: 'shots',
			label: 'Shots',
			tooltip: 'Number of times the circuit was executed',
			align: 'right',
			width: '10%',
		},
		{
			id: 'runId',
			label: 'Actions',
			align: 'center',
			width: '5%',
			format: (value: any) => (
				<IconButton
					size="small"
					onClick={() => onViewDetails && onViewDetails(value)}
					sx={{
						color: theme.palette.primary.main,
					}}
				>
					<VisibilityIcon fontSize="small" />
				</IconButton>
			),
		},
	];

	// Process and format data for display
	const processedData = useMemo(() => {
		return data.map((row) => ({
			...row,
			formattedTime: new Date(row.timestamp).toLocaleString(),
		}));
	}, [data]);

	// Handle searching
	const filteredData = useMemo(() => {
		if (!searchQuery) return processedData;

		const lowerQuery = searchQuery.toLowerCase();
		return processedData.filter((row) => {
			return (
				(row.algorithm && row.algorithm.toLowerCase().includes(lowerQuery)) ||
				(row.backend_used &&
					row.backend_used.toLowerCase().includes(lowerQuery)) ||
				row.formattedTime.toLowerCase().includes(lowerQuery)
			);
		});
	}, [processedData, searchQuery]);

	// Handle sorting
	const sortedData = useMemo(() => {
		if (!orderBy) return filteredData;

		return [...filteredData].sort((a, b) => {
			let aValue: any = a[orderBy];
			let bValue: any = b[orderBy];

			// Handle null/undefined values in sorting
			if (aValue === null || aValue === undefined)
				return order === 'asc' ? -1 : 1;
			if (bValue === null || bValue === undefined)
				return order === 'asc' ? 1 : -1;

			// Handle string comparisons
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return order === 'asc'
					? aValue.localeCompare(bValue)
					: bValue.localeCompare(aValue);
			}

			// Handle numeric comparisons
			return order === 'asc' ? aValue - bValue : bValue - aValue;
		});
	}, [filteredData, orderBy, order]);

	// Pagination
	const paginatedData = useMemo(() => {
		const startIdx = page * rowsPerPage;
		return sortedData.slice(startIdx, startIdx + rowsPerPage);
	}, [sortedData, page, rowsPerPage]);

	// Handle sort request
	const handleRequestSort = (
		property: keyof ProcessedQuantumData | 'formattedTime'
	) => {
		const isAsc = orderBy === property && order === 'asc';
		setOrder(isAsc ? 'desc' : 'asc');
		setOrderBy(property);
	};

	// Handle pagination changes
	const handleChangePage = (event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	return (
		<Box sx={{ width: '100%' }}>
			{/* Search and filter controls */}
			<Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
				<TextField
					placeholder="Search runs..."
					variant="outlined"
					size="small"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					sx={{ flexGrow: 1, maxWidth: 300 }}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<SearchIcon color="action" />
							</InputAdornment>
						),
					}}
				/>
				<Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
					<Chip
						icon={<MemoryIcon />}
						label="Hardware Runs"
						size="small"
						color="primary"
						variant="outlined"
						onClick={() => setSearchQuery('qasm')}
						sx={{
							cursor: 'pointer',
							borderColor: theme.palette.primary.main,
							'&:hover': {
								backgroundColor: `${theme.palette.primary.main}20`,
							},
						}}
					/>
					<Chip
						icon={<LaptopIcon />}
						label="Simulator Runs"
						size="small"
						color="secondary"
						variant="outlined"
						onClick={() => setSearchQuery('simulator')}
						sx={{
							cursor: 'pointer',
							borderColor: theme.palette.secondary.main,
							'&:hover': {
								backgroundColor: `${theme.palette.secondary.main}20`,
							},
						}}
					/>
				</Box>
			</Box>

			{/* Table container */}
			<TableContainer
				component={Paper}
				sx={{
					maxHeight: height,
					backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
					borderRadius: '8px',
					boxShadow: isDarkMode
						? '0 4px 14px rgba(0,0,0,0.4)'
						: '0 4px 14px rgba(0,0,0,0.1)',
				}}
			>
				<Table stickyHeader aria-label="quantum runs table" size="small">
					<TableHead>
						<TableRow>
							{columns.map((column) => (
								<TableCell
									key={column.id}
									align={column.align || 'left'}
									sx={{
										fontWeight: 'bold',
										backgroundColor: isDarkMode ? '#333' : '#e0e0e0',
										color: isDarkMode ? '#fff' : '#000',
										width: column.width || 'auto',
										whiteSpace: 'nowrap',
									}}
								>
									<Box sx={{ display: 'flex', alignItems: 'center' }}>
										{column.id !== 'runId' ? (
											<TableSortLabel
												active={orderBy === column.id}
												direction={orderBy === column.id ? order : 'asc'}
												onClick={() => handleRequestSort(column.id)}
											>
												{column.label}
											</TableSortLabel>
										) : (
											column.label
										)}
										{column.tooltip && (
											<Tooltip title={column.tooltip} arrow>
												<InfoOutlinedIcon
													sx={{ fontSize: '0.8rem', ml: 0.5, opacity: 0.7 }}
												/>
											</Tooltip>
										)}
									</Box>
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{paginatedData.length > 0 ? (
							paginatedData.map((row, index) => (
								<TableRow
									key={row.runId}
									hover
									sx={{
										backgroundColor: isDarkMode
											? index % 2 === 0
												? '#222'
												: '#2a2a2a'
											: index % 2 === 0
											? '#fff'
											: '#f9f9f9',
										'&:hover': {
											backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
										},
									}}
								>
									{columns.map((column) => {
										const value = row[column.id];
										return (
											<TableCell
												key={column.id}
												align={column.align || 'left'}
												sx={{
													color: isDarkMode ? '#eee' : '#333',
													px: 2,
													py: 1,
													borderBottom: isDarkMode
														? '1px solid #333'
														: '1px solid #e0e0e0',
												}}
											>
												{column.format
													? (
															column.format as (
																value: any,
																row?: ProcessedQuantumData
															) => any
													  )(value, row)
													: value}
											</TableCell>
										);
									})}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									align="center"
									sx={{ py: 3 }}
								>
									<Typography variant="body1" color="text.secondary">
										{loading ? 'Loading data...' : 'No quantum runs found'}
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Pagination controls */}
			<TablePagination
				rowsPerPageOptions={[5, 10, 25]}
				component="div"
				count={sortedData.length}
				rowsPerPage={rowsPerPage}
				page={page}
				onPageChange={handleChangePage}
				onRowsPerPageChange={handleChangeRowsPerPage}
				sx={{
					color: isDarkMode ? '#eee' : undefined,
					'.MuiTablePagination-selectIcon': {
						color: isDarkMode ? '#eee' : undefined,
					},
				}}
			/>
		</Box>
	);
};

export default QuantumRunDetailsTable;
