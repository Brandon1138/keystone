import React, { useState, useEffect, useCallback } from 'react';
import {
	Button,
	Select,
	MenuItem,
	FormControl,
	SelectChangeEvent,
	Typography,
	Box,
	Grid,
	InputLabel,
	CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Card } from '../components/ui/card';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareIcon from '@mui/icons-material/Compare';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';

// Import visualization components
import PerformanceChart from '../components/visualizations/PerformanceChart';
import QuantumResultsChart from '../components/visualizations/QuantumResultsChart';
import StatisticsCard from '../components/visualizations/StatisticsCard';
import QuantumStatsCard from '../components/visualizations/QuantumStatsCard';

// Import data utils
import {
	fetchAndProcessData,
	filterBenchmarkData,
	filterQuantumData,
	ProcessedBenchmarkData,
	ProcessedQuantumData,
} from '../utils/dataProcessingUtils';

/**
 * Visualization Page Component
 */
export const VisualizationPage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// State for visualization controls
	const [activeChart, setActiveChart] = useState<string>('performance');
	const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('all');
	const [timeRange, setTimeRange] = useState<string>('all');
	const [dataSource, setDataSource] = useState<string>('benchmarks');
	const [windowSize, setWindowSize] = useState<{
		width: number;
		height: number;
	}>({
		width: window.innerWidth,
		height: window.innerHeight,
	});

	// State for data
	const [loading, setLoading] = useState<boolean>(true);
	const [refreshing, setRefreshing] = useState<boolean>(false);
	const [benchmarkData, setBenchmarkData] = useState<ProcessedBenchmarkData[]>(
		[]
	);
	const [quantumData, setQuantumData] = useState<ProcessedQuantumData[]>([]);
	const [filteredBenchmarkData, setFilteredBenchmarkData] = useState<
		ProcessedBenchmarkData[]
	>([]);
	const [filteredQuantumData, setFilteredQuantumData] = useState<
		ProcessedQuantumData[]
	>([]);

	// Add state for persisting selections across chart types
	const [selectedOperations, setSelectedOperations] = useState<{
		[key: string]: boolean;
	}>({});
	const [selectedAlgorithmFilters, setSelectedAlgorithmFilters] = useState<{
		[key: string]: boolean;
	}>({});
	const [currentSortOrder, setCurrentSortOrder] = useState<string>('default');
	const [currentMetricType, setCurrentMetricType] = useState<
		| 'execution_time_sec'
		| 'circuit_depth'
		| 'cx_gate_count'
		| 'total_gate_count'
		| 'success_rate'
	>('execution_time_sec');

	// Handle state changes
	const handleChartChange = (value: string) => {
		setActiveChart(value);
	};

	const handleAlgorithmChange = (event: SelectChangeEvent) => {
		console.log(`Algorithm changed to: ${event.target.value}`);
		setSelectedAlgorithm(event.target.value);
		// Automatically apply filters when algorithm changes
		setTimeout(() => applyFilters(), 0);
	};

	const handleTimeRangeChange = (event: SelectChangeEvent) => {
		setTimeRange(event.target.value);
		// Automatically apply filters when time range changes
		setTimeout(() => applyFilters(), 0);
	};

	const handleDataSourceChange = (event: SelectChangeEvent) => {
		const newDataSource = event.target.value;
		console.log(`Data source changed to: ${newDataSource}`);
		setDataSource(newDataSource);

		// Reset algorithm selection when switching data sources to avoid invalid selections
		setSelectedAlgorithm('all');

		// Automatically apply filters when data source changes
		setTimeout(() => applyFilters(), 0);
	};

	// Handle window resize events (including fullscreen transitions)
	const handleResize = useCallback(() => {
		setWindowSize({
			width: window.innerWidth,
			height: window.innerHeight,
		});
	}, []);

	// Apply filters
	const applyFilters = () => {
		console.log(
			`Applying filters: dataSource=${dataSource}, algorithm=${selectedAlgorithm}, timeRange=${timeRange}`
		);
		setLoading(true);

		// Filter benchmark data
		const filteredBench = filterBenchmarkData(
			benchmarkData,
			selectedAlgorithm,
			timeRange
		);
		setFilteredBenchmarkData(filteredBench);
		console.log(`Filtered benchmark data: ${filteredBench.length} items`);

		// Filter quantum data
		const filteredQuantum = filterQuantumData(
			quantumData,
			selectedAlgorithm,
			timeRange
		);
		setFilteredQuantumData(filteredQuantum);
		console.log(`Filtered quantum data: ${filteredQuantum.length} items`);

		setLoading(false);
	};

	// Handle manual refresh
	const handleRefreshData = async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	};

	// Separate loadData function for refresh button and initial load
	const loadData = async () => {
		setLoading(true);
		try {
			// Load data with debug information
			console.log('Fetching data from database...');
			const { benchmarkData, quantumData } = await fetchAndProcessData();

			console.log('Loaded benchmark data:', benchmarkData.length, 'records');
			console.log('Loaded quantum data:', quantumData.length, 'records');

			// Set data directly from database
			setBenchmarkData(benchmarkData);
			setQuantumData(quantumData);

			if (quantumData.length > 0) {
				console.log('Sample quantum data:', quantumData[0]);
			}

			// Apply filters to new data
			const filteredBench = filterBenchmarkData(
				benchmarkData,
				selectedAlgorithm,
				timeRange
			);
			const filteredQuantum = filterQuantumData(
				quantumData,
				selectedAlgorithm,
				timeRange
			);

			console.log('Filtered benchmark data:', filteredBench.length, 'records');
			console.log('Filtered quantum data:', filteredQuantum.length, 'records');

			setFilteredBenchmarkData(filteredBench);
			setFilteredQuantumData(filteredQuantum);
		} catch (error) {
			console.error('Error loading data:', error);
		} finally {
			setLoading(false);
		}
	};

	// Fetch data on mount and set up resize listener
	useEffect(() => {
		// Load data only once on component mount
		loadData();

		// Add resize event listener for fullscreen transitions
		window.addEventListener('resize', handleResize);

		return () => {
			// Clean up function - remove event listener
			window.removeEventListener('resize', handleResize);
		};
	}, [handleResize]);

	// Force chart updates when window size changes
	useEffect(() => {
		// This empty dependency array with windowSize will trigger
		// a re-render when window dimensions change
		if (!loading) {
			const currentHasData =
				(dataSource === 'benchmarks' && filteredBenchmarkData.length > 0) ||
				(dataSource === 'quantum' && filteredQuantumData.length > 0);

			if (currentHasData) {
				// Minimal delay to ensure DOM has updated
				const timer = setTimeout(() => {
					// Force re-render of charts by applying filters
					applyFilters();
				}, 100);

				return () => clearTimeout(timer);
			}
		}
	}, [
		windowSize,
		loading,
		dataSource,
		filteredBenchmarkData,
		filteredQuantumData,
	]);

	// Get data based on selected source
	const getActiveData = () => {
		console.log('Getting active data for source:', dataSource);
		console.log('Available benchmark data:', filteredBenchmarkData.length);
		console.log('Available quantum data:', filteredQuantumData.length);

		if (dataSource === 'benchmarks') {
			return filteredBenchmarkData;
		} else if (dataSource === 'quantum') {
			return filteredQuantumData;
		}
		return [];
	};

	// Determine if we have any data to display
	const hasData =
		(dataSource === 'benchmarks' && filteredBenchmarkData.length > 0) ||
		(dataSource === 'quantum' && filteredQuantumData.length > 0);

	// Handle operations selection change
	const handleOperationsChange = (operations: { [key: string]: boolean }) => {
		setSelectedOperations(operations);
	};

	// Handle algorithm filters change
	const handleAlgorithmFiltersChange = (algorithms: {
		[key: string]: boolean;
	}) => {
		setSelectedAlgorithmFilters(algorithms);
	};

	// Handle sort order change
	const handleSortOrderChange = (sortOrder: string) => {
		setCurrentSortOrder(sortOrder);
	};

	// Handle metric type change for quantum charts
	const handleMetricTypeChange = (
		metricType:
			| 'execution_time_sec'
			| 'circuit_depth'
			| 'cx_gate_count'
			| 'total_gate_count'
			| 'success_rate'
	) => {
		setCurrentMetricType(metricType);
	};

	return (
		<div className="space-y-5">
			{/* Main Configuration Card */}
			<Card
				className={`p-6 rounded-xl shadow-md ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4 justify-between">
					<div className="flex items-center">
						<DataUsageIcon style={{ color: '#9747FF' }} className="mr-3" />
						<h2
							className="text-[20px] font-semibold"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							Data Visualization
						</h2>
					</div>
					<Button
						variant="outlined"
						startIcon={<RefreshIcon />}
						onClick={handleRefreshData}
						disabled={refreshing}
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
						{refreshing ? 'Refreshing...' : 'Refresh Data'}
					</Button>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Visualize and analyze benchmark results and quantum workloads. Select
					the data source, algorithm, and time range to view different
					visualizations.
				</p>

				{/* Controls Grid */}
				<Grid container spacing={3} alignItems="center">
					<Grid item xs={12} sm={3}>
						<FormControl fullWidth>
							<InputLabel
								id="data-source-label"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									padding: '0 5px',
									zIndex: 1,
									transform: 'translate(14px, -9px) scale(0.75)',
									'&.MuiInputLabel-shrink': {
										transform: 'translate(14px, -9px) scale(0.75)',
									},
								}}
								shrink
							>
								Data Source
							</InputLabel>
							<Select
								labelId="data-source-label"
								id="data-source-select"
								value={dataSource}
								label="Data Source"
								onChange={handleDataSourceChange}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: 'transparent',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								}}
							>
								<MenuItem value="benchmarks">Benchmark Results</MenuItem>
								<MenuItem value="quantum">Quantum Workloads</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} sm={3}>
						<FormControl fullWidth>
							<InputLabel
								id="algorithm-label"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									padding: '0 5px',
									zIndex: 1,
									transform: 'translate(14px, -9px) scale(0.75)',
									'&.MuiInputLabel-shrink': {
										transform: 'translate(14px, -9px) scale(0.75)',
									},
								}}
								shrink
							>
								Algorithm
							</InputLabel>
							<Select
								labelId="algorithm-label"
								id="algorithm-select"
								value={selectedAlgorithm}
								label="Algorithm"
								onChange={handleAlgorithmChange}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: 'transparent',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								}}
							>
								<MenuItem value="all">All Algorithms</MenuItem>

								{dataSource === 'benchmarks' ? (
									// Benchmark algorithms
									<>
										{/* Post-Quantum Algorithms */}
										<MenuItem value="kyber">ML-KEM (Kyber)</MenuItem>
										<MenuItem value="dilithium">ML-DSA (Dilithium)</MenuItem>
										<MenuItem value="falcon">Falcon</MenuItem>
										<MenuItem value="sphincs">SPHINCS+</MenuItem>
										<MenuItem value="mceliece">Classic McEliece</MenuItem>
										{/* Classical Algorithms */}
										<MenuItem value="rsa">RSA</MenuItem>
										<MenuItem value="ecdsa">ECDSA</MenuItem>
										<MenuItem value="ecdh">ECDH</MenuItem>
										<MenuItem value="aes">AES</MenuItem>
									</>
								) : (
									// Quantum algorithms
									<>
										<MenuItem value="shor">Shor's Algorithm</MenuItem>
										<MenuItem value="grover">Grover's Algorithm</MenuItem>
									</>
								)}
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} sm={3}>
						<FormControl fullWidth>
							<InputLabel
								id="time-range-label"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									padding: '0 5px',
									zIndex: 1,
									transform: 'translate(14px, -9px) scale(0.75)',
									'&.MuiInputLabel-shrink': {
										transform: 'translate(14px, -9px) scale(0.75)',
									},
								}}
								shrink
							>
								Time Range
							</InputLabel>
							<Select
								labelId="time-range-label"
								id="time-range-select"
								value={timeRange}
								label="Time Range"
								onChange={handleTimeRangeChange}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: 'transparent',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								}}
							>
								<MenuItem value="day">Last 24 Hours</MenuItem>
								<MenuItem value="week">Last Week</MenuItem>
								<MenuItem value="month">Last Month</MenuItem>
								<MenuItem value="all">All Time</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} sm={3}>
						<Button
							variant="contained"
							fullWidth
							startIcon={<FilterListIcon />}
							onClick={applyFilters}
							disabled={loading}
							sx={{
								bgcolor: '#9747FF',
								'&:hover': { bgcolor: '#8030E0' },
								textTransform: 'uppercase',
								fontWeight: 'bold',
								padding: '10px 24px',
								fontSize: '0.9rem',
								borderRadius: '8px',
							}}
						>
							{loading ? (
								<>
									<CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
									Applying
								</>
							) : (
								'Apply Filters'
							)}
						</Button>
					</Grid>
				</Grid>

				{/* Chart Type Buttons */}
				<Box mt={4} sx={{ display: 'flex', gap: 2 }}>
					<Button
						variant={activeChart === 'performance' ? 'contained' : 'outlined'}
						startIcon={<AssessmentIcon />}
						onClick={() => handleChartChange('performance')}
						sx={{
							bgcolor:
								activeChart === 'performance' ? '#9747FF' : 'transparent',
							borderColor: '#9747FF',
							color:
								activeChart === 'performance'
									? '#FFFFFF'
									: isDarkMode
									? '#FFFFFF'
									: '#000000',
							'&:hover': {
								bgcolor:
									activeChart === 'performance'
										? '#8030E0'
										: isDarkMode
										? 'rgba(151, 71, 255, 0.1)'
										: 'rgba(151, 71, 255, 0.1)',
							},
							fontWeight: 'medium',
							borderRadius: '8px',
						}}
					>
						Performance Metrics
					</Button>
					<Button
						variant={activeChart === 'bar' ? 'contained' : 'outlined'}
						startIcon={<BarChartIcon />}
						onClick={() => handleChartChange('bar')}
						sx={{
							bgcolor: activeChart === 'bar' ? '#9747FF' : 'transparent',
							borderColor: '#9747FF',
							color:
								activeChart === 'bar'
									? '#FFFFFF'
									: isDarkMode
									? '#FFFFFF'
									: '#000000',
							'&:hover': {
								bgcolor:
									activeChart === 'bar'
										? '#8030E0'
										: isDarkMode
										? 'rgba(151, 71, 255, 0.1)'
										: 'rgba(151, 71, 255, 0.1)',
							},
							fontWeight: 'medium',
							borderRadius: '8px',
						}}
					>
						Bar Charts
					</Button>
					<Button
						variant={activeChart === 'trend' ? 'contained' : 'outlined'}
						startIcon={<TimelineIcon />}
						onClick={() => handleChartChange('trend')}
						sx={{
							bgcolor: activeChart === 'trend' ? '#9747FF' : 'transparent',
							borderColor: '#9747FF',
							color:
								activeChart === 'trend'
									? '#FFFFFF'
									: isDarkMode
									? '#FFFFFF'
									: '#000000',
							'&:hover': {
								bgcolor:
									activeChart === 'trend'
										? '#8030E0'
										: isDarkMode
										? 'rgba(151, 71, 255, 0.1)'
										: 'rgba(151, 71, 255, 0.1)',
							},
							fontWeight: 'medium',
							borderRadius: '8px',
						}}
					>
						Trend Analysis
					</Button>
					<Button
						variant={activeChart === 'compare' ? 'contained' : 'outlined'}
						startIcon={<CompareIcon />}
						onClick={() => handleChartChange('compare')}
						sx={{
							bgcolor: activeChart === 'compare' ? '#9747FF' : 'transparent',
							borderColor: '#9747FF',
							color:
								activeChart === 'compare'
									? '#FFFFFF'
									: isDarkMode
									? '#FFFFFF'
									: '#000000',
							'&:hover': {
								bgcolor:
									activeChart === 'compare'
										? '#8030E0'
										: isDarkMode
										? 'rgba(151, 71, 255, 0.1)'
										: 'rgba(151, 71, 255, 0.1)',
							},
							fontWeight: 'medium',
							borderRadius: '8px',
						}}
					>
						Comparison View
					</Button>
				</Box>
			</Card>

			{/* Visualization Area */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				{/* Main Chart */}
				<Card
					className={`p-6 rounded-xl shadow-md col-span-2 ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					}`}
				>
					<Typography
						variant="h6"
						gutterBottom
						className="mb-4"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						{activeChart === 'performance' && 'Performance Metrics Chart'}
						{activeChart === 'bar' && 'Comparative Bar Chart'}
						{activeChart === 'trend' && 'Trend Analysis Over Time'}
						{activeChart === 'compare' && 'Algorithm Comparison View'}
					</Typography>

					{/* Render appropriate visualization based on dataSource and activeChart */}
					{dataSource === 'benchmarks' ? (
						<>
							{activeChart === 'performance' && (
								<PerformanceChart
									data={filteredBenchmarkData}
									metricType="avg_ms"
									loading={loading}
									// Pass saved selections
									selectedOperations={selectedOperations}
									selectedAlgorithms={selectedAlgorithmFilters}
									sortOrder={currentSortOrder}
									// Pass callbacks to update parent state
									onOperationsChange={handleOperationsChange}
									onAlgorithmsChange={handleAlgorithmFiltersChange}
									onSortOrderChange={handleSortOrderChange}
								/>
							)}
							{activeChart === 'bar' && (
								<PerformanceChart
									data={filteredBenchmarkData}
									metricType="ops_per_sec"
									title="Operations Per Second"
									loading={loading}
									// Pass saved selections
									selectedOperations={selectedOperations}
									selectedAlgorithms={selectedAlgorithmFilters}
									sortOrder={currentSortOrder}
									// Pass callbacks to update parent state
									onOperationsChange={handleOperationsChange}
									onAlgorithmsChange={handleAlgorithmFiltersChange}
									onSortOrderChange={handleSortOrderChange}
								/>
							)}
							{activeChart === 'trend' && (
								<PerformanceChart
									data={filteredBenchmarkData}
									metricType="mem_peak_kb"
									title="Memory Usage Trends"
									loading={loading}
									// Pass saved selections
									selectedOperations={selectedOperations}
									selectedAlgorithms={selectedAlgorithmFilters}
									sortOrder={currentSortOrder}
									// Pass callbacks to update parent state
									onOperationsChange={handleOperationsChange}
									onAlgorithmsChange={handleAlgorithmFiltersChange}
									onSortOrderChange={handleSortOrderChange}
								/>
							)}
							{activeChart === 'compare' && (
								<PerformanceChart
									data={filteredBenchmarkData}
									title="Algorithm Comparison"
									loading={loading}
									// Pass saved selections
									selectedOperations={selectedOperations}
									selectedAlgorithms={selectedAlgorithmFilters}
									sortOrder={currentSortOrder}
									// Pass callbacks to update parent state
									onOperationsChange={handleOperationsChange}
									onAlgorithmsChange={handleAlgorithmFiltersChange}
									onSortOrderChange={handleSortOrderChange}
								/>
							)}
						</>
					) : dataSource === 'quantum' ? (
						<>
							{activeChart === 'performance' && (
								<QuantumResultsChart
									data={filteredQuantumData}
									chartType="bars"
									metricType={currentMetricType}
									loading={loading}
									sortOrder={currentSortOrder}
									onSortOrderChange={handleSortOrderChange}
									onMetricTypeChange={handleMetricTypeChange}
								/>
							)}
							{activeChart === 'bar' && (
								<QuantumResultsChart
									data={filteredQuantumData}
									chartType="bars"
									metricType={currentMetricType}
									title="Circuit Depth Comparison"
									loading={loading}
									sortOrder={currentSortOrder}
									onSortOrderChange={handleSortOrderChange}
									onMetricTypeChange={handleMetricTypeChange}
								/>
							)}
							{activeChart === 'trend' && (
								<QuantumResultsChart
									data={filteredQuantumData}
									chartType="histogram"
									title="Quantum Measurement Distribution"
									loading={loading}
									sortOrder={currentSortOrder}
									onSortOrderChange={handleSortOrderChange}
									onMetricTypeChange={handleMetricTypeChange}
									metricType={currentMetricType}
								/>
							)}
							{activeChart === 'compare' && (
								<QuantumResultsChart
									data={filteredQuantumData}
									chartType="scatter"
									title="Execution Time vs Circuit Complexity"
									loading={loading}
									sortOrder={currentSortOrder}
									onSortOrderChange={handleSortOrderChange}
									onMetricTypeChange={handleMetricTypeChange}
									metricType={currentMetricType}
								/>
							)}
						</>
					) : (
						// Placeholder for encryption data (not implemented yet)
						<div
							className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 h-96 flex items-center justify-center"
							style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }}
						>
							<div className="text-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-24 w-24 mx-auto"
									fill="none"
									viewBox="0 0 24 24"
									stroke={
										isDarkMode
											? 'rgba(255, 255, 255, 0.5)'
											: 'rgba(0, 0, 0, 0.5)'
									}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
								<Typography
									variant="h6"
									style={{
										marginTop: '16px',
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.7)',
									}}
								>
									Run encryption demos to view visualization data
								</Typography>
							</div>
						</div>
					)}
				</Card>

				{/* Smaller Analysis Cards */}
				<Card
					className={`p-6 rounded-xl shadow-md ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					}`}
				>
					{dataSource === 'benchmarks' ? (
						<StatisticsCard
							data={filteredBenchmarkData}
							title="Key Performance Indicators"
							algorithm={
								selectedAlgorithm !== 'all' ? selectedAlgorithm : undefined
							}
							loading={loading}
							metricType="performance"
						/>
					) : dataSource === 'quantum' ? (
						<QuantumStatsCard
							data={filteredQuantumData}
							title="Quantum Circuit Metrics"
							algorithm={
								selectedAlgorithm !== 'all' ? selectedAlgorithm : undefined
							}
							loading={loading}
							metricType="circuit"
						/>
					) : (
						// Placeholder for encryption data
						<div>
							<Typography
								variant="h6"
								gutterBottom
								className="mb-4"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								Key Performance Indicators
							</Typography>
							<div
								className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 h-64 flex items-center justify-center"
								style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }}
							>
								<Typography
									style={{
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.7)',
									}}
								>
									KPI data will appear here
								</Typography>
							</div>
						</div>
					)}
				</Card>

				<Card
					className={`p-6 rounded-xl shadow-md ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					}`}
				>
					{dataSource === 'benchmarks' ? (
						<StatisticsCard
							data={filteredBenchmarkData}
							title="Memory Usage Statistics"
							algorithm={
								selectedAlgorithm !== 'all' ? selectedAlgorithm : undefined
							}
							loading={loading}
							metricType="memory"
						/>
					) : dataSource === 'quantum' ? (
						<QuantumStatsCard
							data={filteredQuantumData}
							title="Success Rate Analysis"
							algorithm={
								selectedAlgorithm !== 'all' ? selectedAlgorithm : undefined
							}
							loading={loading}
							metricType="success"
						/>
					) : (
						// Placeholder for encryption data
						<div>
							<Typography
								variant="h6"
								gutterBottom
								className="mb-4"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								Quick Statistics
							</Typography>
							<div
								className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 h-64 flex items-center justify-center"
								style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }}
							>
								<Typography
									style={{
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.7)',
									}}
								>
									Statistics will appear here
								</Typography>
							</div>
						</div>
					)}
				</Card>
			</div>
		</div>
	);
};

export default VisualizationPage;
