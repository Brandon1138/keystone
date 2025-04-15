import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
} from 'react';
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
import AlgorithmComparisonCard from '../components/visualizations/AlgorithmComparisonCard';
import AlgorithmComparisonView from '../components/visualizations/AlgorithmComparisonView';
import BenchmarkDataTable from '../components/visualizations/BenchmarkDataTable';

// Import data utils and event bus
import {
	fetchAndProcessData,
	filterBenchmarkData,
	filterQuantumData,
	ProcessedBenchmarkData,
	ProcessedQuantumData,
} from '../utils/dataProcessingUtils';
import { eventBus, EVENTS, notifyResize, debounce } from '../utils/eventUtils';

// Conditional logging helper
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

/**
 * Visualization Page Component
 */
export const VisualizationPage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Refs for tracking component mount state
	const isMounted = useRef(true);
	const perfChartRef = useRef<any>(null);
	const quantumChartRef = useRef<any>(null);
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);

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

	// Track component mount status for cleanup
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);

	// Force resize charts function
	const forceResizeCharts = useCallback(() => {
		if (!isMounted.current) return;

		log('Forcing charts to resize');

		// Use a slightly longer delay to ensure DOM is ready
		setTimeout(() => {
			if (!isMounted.current) return;

			// Force chart resize if refs are available
			if (perfChartRef.current?.plotRef?.current?.handleResize) {
				perfChartRef.current.plotRef.current.handleResize();
				log('Resized performance chart');
			}

			if (quantumChartRef.current?.plotRef?.current?.handleResize) {
				quantumChartRef.current.plotRef.current.handleResize();
				log('Resized quantum chart');
			}
		}, 250);
	}, []);

	// Handle database update events
	useEffect(() => {
		const handleDatabaseUpdate = (
			dataType: 'benchmark' | 'quantum' | 'all'
		) => {
			log(`Database updated event received: ${dataType}`);

			// Only refresh if this component is still mounted
			if (!isMounted.current) return;

			if (
				dataType === 'all' ||
				(dataType === 'benchmark' && dataSource === 'benchmarks') ||
				(dataType === 'quantum' && dataSource === 'quantum')
			) {
				handleRefreshData();
			}
		};

		// Register event listeners
		eventBus.on(EVENTS.DATABASE_UPDATED, handleDatabaseUpdate);

		// Clean up on unmount
		return () => {
			eventBus.off(EVENTS.DATABASE_UPDATED, handleDatabaseUpdate);
		};
	}, [dataSource]);

	// Handle fullscreen toggle and resize events
	useEffect(() => {
		// Set up resize observer for chart container
		if (chartContainerRef.current && !resizeObserverRef.current) {
			resizeObserverRef.current = new ResizeObserver(
				debounce(() => {
					log('ResizeObserver detected size change');
					forceResizeCharts();
				}, 250)
			);

			resizeObserverRef.current.observe(chartContainerRef.current);
		}

		// Handle global resize events
		const handleGlobalResize = () => {
			log('Global resize event received');
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
			forceResizeCharts();
		};

		// Handle fullscreen toggle events
		const handleFullscreenToggle = () => {
			log('Fullscreen toggle event received');
			forceResizeCharts();
		};

		// Register event listeners
		eventBus.on(EVENTS.FULLSCREEN_TOGGLE, handleFullscreenToggle);
		eventBus.on(EVENTS.RESIZE, handleGlobalResize);

		// Set up direct fullscreen change listeners
		const fullscreenChangeHandler = () => {
			log('Fullscreen change detected');
			notifyResize(); // Use the debounced resize notification
		};

		document.addEventListener('fullscreenchange', fullscreenChangeHandler);
		document.addEventListener(
			'webkitfullscreenchange',
			fullscreenChangeHandler
		);
		document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
		document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);

		// Listener for window resize
		window.addEventListener('resize', notifyResize);

		// Clean up on unmount
		return () => {
			if (resizeObserverRef.current && chartContainerRef.current) {
				resizeObserverRef.current.unobserve(chartContainerRef.current);
				resizeObserverRef.current.disconnect();
				resizeObserverRef.current = null;
			}

			eventBus.off(EVENTS.FULLSCREEN_TOGGLE, handleFullscreenToggle);
			eventBus.off(EVENTS.RESIZE, handleGlobalResize);

			document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
			document.removeEventListener(
				'webkitfullscreenchange',
				fullscreenChangeHandler
			);
			document.removeEventListener(
				'mozfullscreenchange',
				fullscreenChangeHandler
			);
			document.removeEventListener(
				'MSFullscreenChange',
				fullscreenChangeHandler
			);

			window.removeEventListener('resize', notifyResize);
		};
	}, [forceResizeCharts]);

	// Handle state changes with memoized callbacks
	const handleChartChange = useCallback(
		(value: string) => {
			setActiveChart(value);
			// Resize charts when switching between chart types
			setTimeout(() => forceResizeCharts(), 100);
		},
		[forceResizeCharts]
	);

	const handleAlgorithmChange = useCallback((event: SelectChangeEvent) => {
		log(`Algorithm changed to: ${event.target.value}`);
		setSelectedAlgorithm(event.target.value);
	}, []);

	const handleTimeRangeChange = useCallback((event: SelectChangeEvent) => {
		setTimeRange(event.target.value);
	}, []);

	const handleDataSourceChange = useCallback((event: SelectChangeEvent) => {
		const newDataSource = event.target.value;
		log(`Data source changed to: ${newDataSource}`);
		setDataSource(newDataSource);
		// Reset algorithm selection when switching data sources to avoid invalid selections
		setSelectedAlgorithm('all');
	}, []);

	// Apply filters with useCallback
	const applyFilters = useCallback(() => {
		log(
			`Applying filters: dataSource=${dataSource}, algorithm=${selectedAlgorithm}, timeRange=${timeRange}`
		);
		setLoading(true);

		// Use setTimeout to prevent UI blocking
		setTimeout(() => {
			if (!isMounted.current) return;

			// Filter benchmark data
			const filteredBench = filterBenchmarkData(
				benchmarkData,
				selectedAlgorithm,
				timeRange
			);
			setFilteredBenchmarkData(filteredBench);
			log(`Filtered benchmark data: ${filteredBench.length} items`);

			// Filter quantum data
			const filteredQuantum = filterQuantumData(
				quantumData,
				selectedAlgorithm,
				timeRange
			);
			setFilteredQuantumData(filteredQuantum);
			log(`Filtered quantum data: ${filteredQuantum.length} items`);

			setLoading(false);

			// After applying filters, ensure charts are correctly sized
			setTimeout(() => forceResizeCharts(), 100);
		}, 0);
	}, [
		benchmarkData,
		quantumData,
		selectedAlgorithm,
		timeRange,
		dataSource,
		forceResizeCharts,
	]);

	// Effect to apply filters when dependencies change
	useEffect(() => {
		if (benchmarkData.length > 0 || quantumData.length > 0) {
			applyFilters();
		}
	}, [selectedAlgorithm, timeRange, dataSource, applyFilters]);

	// Handle manual refresh - modified to check component mount state
	const handleRefreshData = useCallback(async () => {
		if (!isMounted.current) return;

		setRefreshing(true);
		await loadData();

		// Resize charts after data refresh
		setTimeout(() => {
			forceResizeCharts();
			if (isMounted.current) {
				setRefreshing(false);
			}
		}, 250);
	}, [forceResizeCharts]);

	// Separate loadData function for refresh button and initial load
	const loadData = useCallback(async () => {
		if (!isMounted.current) return;
		setLoading(true);

		try {
			// Load data with debug information
			log('Fetching data from database...');
			const { benchmarkData, quantumData } = await fetchAndProcessData();

			if (!isMounted.current) return;

			log('Loaded benchmark data:', benchmarkData.length, 'records');
			log('Loaded quantum data:', quantumData.length, 'records');

			// Set data directly from database
			setBenchmarkData(benchmarkData);
			setQuantumData(quantumData);

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

			log('Filtered benchmark data:', filteredBench.length, 'records');
			log('Filtered quantum data:', filteredQuantum.length, 'records');

			setFilteredBenchmarkData(filteredBench);
			setFilteredQuantumData(filteredQuantum);
		} catch (error) {
			console.error('Error loading data:', error);
			if (error instanceof Error) {
				console.error('Error details:', error.message, error.stack);
			}
		} finally {
			if (isMounted.current) {
				setLoading(false);
			}
		}
	}, [selectedAlgorithm, timeRange]);

	// Fetch data on mount and set up resize listener
	useEffect(() => {
		// Load data only once on component mount
		loadData();
	}, [loadData]);

	// Get active data with memoization
	const activeData = useMemo(() => {
		log('Getting active data for source:', dataSource);
		log('Available benchmark data:', filteredBenchmarkData.length);
		log('Available quantum data:', filteredQuantumData.length);

		if (dataSource === 'benchmarks') {
			return filteredBenchmarkData;
		} else if (dataSource === 'quantum') {
			return filteredQuantumData;
		}
		return [];
	}, [dataSource, filteredBenchmarkData, filteredQuantumData]);

	// Determine if we have any data to display
	const hasData = useMemo(
		() =>
			(dataSource === 'benchmarks' && filteredBenchmarkData.length > 0) ||
			(dataSource === 'quantum' && filteredQuantumData.length > 0),
		[dataSource, filteredBenchmarkData, filteredQuantumData]
	);

	// Handle operations selection change
	const handleOperationsChange = useCallback(
		(operations: { [key: string]: boolean }) => {
			setSelectedOperations(operations);
		},
		[]
	);

	// Handle algorithm filters change
	const handleAlgorithmFiltersChange = useCallback(
		(algorithms: { [key: string]: boolean }) => {
			setSelectedAlgorithmFilters(algorithms);
		},
		[]
	);

	// Handle sort order change
	const handleSortOrderChange = useCallback((sortOrder: string) => {
		setCurrentSortOrder(sortOrder);
	}, []);

	// Handle metric type change for quantum charts
	const handleMetricTypeChange = useCallback(
		(
			metricType:
				| 'execution_time_sec'
				| 'circuit_depth'
				| 'cx_gate_count'
				| 'total_gate_count'
				| 'success_rate'
		) => {
			setCurrentMetricType(metricType);
		},
		[]
	);

	return (
		<div className="container relative z-10 px-6 py-4">
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
						Visualize and analyze benchmark results and quantum workloads.
						Select the data source, algorithm, and time range to view different
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

									{dataSource === 'benchmarks'
										? [
												/* Post-Quantum Algorithms */
												<MenuItem key="kyber" value="kyber">
													ML-KEM (Kyber)
												</MenuItem>,
												<MenuItem key="dilithium" value="dilithium">
													ML-DSA (Dilithium)
												</MenuItem>,
												<MenuItem key="falcon" value="falcon">
													Falcon
												</MenuItem>,
												<MenuItem key="sphincs" value="sphincs">
													SPHINCS+
												</MenuItem>,
												<MenuItem key="mceliece" value="mceliece">
													Classic McEliece
												</MenuItem>,
												/* Classical Algorithms */
												<MenuItem key="rsa" value="rsa">
													RSA
												</MenuItem>,
												<MenuItem key="ecdsa" value="ecdsa">
													ECDSA
												</MenuItem>,
												<MenuItem key="ecdh" value="ecdh">
													ECDH
												</MenuItem>,
												<MenuItem key="aes" value="aes">
													AES
												</MenuItem>,
										  ]
										: [
												/* Quantum algorithms */
												<MenuItem key="shor" value="shor">
													Shor's Algorithm
												</MenuItem>,
												<MenuItem key="grover" value="grover">
													Grover's Algorithm
												</MenuItem>,
										  ]}
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
									textTransform: 'uppercase',
									fontWeight: 'bold',
									padding: '10px 16px',
									fontSize: '0.85rem',
									borderRadius: '8px',
								}}
							>
								{loading ? (
									<Box sx={{ display: 'flex', alignItems: 'center' }}>
										<CircularProgress
											size={24}
											color="inherit"
											sx={{ mr: 1 }}
										/>
										Applying
									</Box>
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
							Average Time
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
							Operations/Sec
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
							Memory Usage
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
							Compare
						</Button>
					</Box>
				</Card>

				{/* Main Chart with refs */}
				<Card
					className={`p-6 rounded-xl shadow-md col-span-3 ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					}`}
					ref={chartContainerRef}
				>
					{/* Add loading overlay using the custom CSS class */}
					{loading && (
						<div
							className={`visualization-loading-overlay ${
								isDarkMode ? 'dark' : 'light'
							}`}
						>
							<div className="text-center">
								<CircularProgress
									size={60}
									sx={{
										color: '#9747FF',
										marginBottom: '16px',
									}}
								/>
								<Typography variant="h6" color={isDarkMode ? 'white' : 'black'}>
									Loading visualization data...
								</Typography>
							</div>
						</div>
					)}

					<Typography
						variant="h6"
						gutterBottom
						className="mb-4"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						{dataSource === 'benchmarks'
							? activeChart === 'performance'
								? 'Average Time'
								: activeChart === 'bar'
								? 'Operations Per Second'
								: activeChart === 'trend'
								? 'Peak Memory Usage'
								: activeChart === 'compare'
								? 'Algorithm Comparison'
								: ''
							: dataSource === 'quantum'
							? activeChart === 'performance'
								? 'Quantum Results'
								: activeChart === 'bar'
								? 'Circuit Depth Comparison'
								: activeChart === 'trend'
								? 'Quantum Measurement Distribution'
								: activeChart === 'compare'
								? 'Execution Time vs Circuit Complexity'
								: ''
							: 'Encryption Performance'}
					</Typography>

					{hasData ? (
						<>
							{dataSource === 'benchmarks' ? (
								<>
									{activeChart === 'performance' && (
										<PerformanceChart
											data={filteredBenchmarkData}
											metricType="avg_ms"
											loading={loading}
											title="Average Time"
											// Pass saved selections
											selectedOperations={selectedOperations}
											selectedAlgorithms={selectedAlgorithmFilters}
											sortOrder={currentSortOrder}
											// Pass callbacks to update parent state
											onOperationsChange={handleOperationsChange}
											onAlgorithmsChange={handleAlgorithmFiltersChange}
											onSortOrderChange={handleSortOrderChange}
											chartRef={perfChartRef}
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
											chartRef={perfChartRef}
										/>
									)}
									{activeChart === 'trend' && (
										<PerformanceChart
											data={filteredBenchmarkData}
											metricType="mem_peak_kb"
											title="Peak Memory Usage"
											loading={loading}
											// Pass saved selections
											selectedOperations={selectedOperations}
											selectedAlgorithms={selectedAlgorithmFilters}
											sortOrder={currentSortOrder}
											// Pass callbacks to update parent state
											onOperationsChange={handleOperationsChange}
											onAlgorithmsChange={handleAlgorithmFiltersChange}
											onSortOrderChange={handleSortOrderChange}
											chartRef={perfChartRef}
										/>
									)}
									{activeChart === 'compare' && (
										<AlgorithmComparisonView
											data={filteredBenchmarkData}
											title="Algorithm Comparison"
											loading={loading}
											chartRef={perfChartRef}
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
											chartRef={quantumChartRef}
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
											chartRef={quantumChartRef}
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
											chartRef={quantumChartRef}
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
											chartRef={quantumChartRef}
										/>
									)}
								</>
							) : (
								// Placeholder for encryption data (not implemented yet)
								<div
									className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 h-96 flex items-center justify-center"
									style={{
										backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
									}}
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
						</>
					) : (
						// Placeholders for encryption data
						<Card
							className={`p-6 rounded-xl shadow-md ${
								isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
							}`}
						>
							<div>
								<Typography
									variant="h6"
									gutterBottom
									className="mb-4"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									Encryption Performance
								</Typography>
								<div
									className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 h-64 flex items-center justify-center"
									style={{
										backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
									}}
								>
									<Typography
										style={{
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.7)'
												: 'rgba(0, 0, 0, 0.7)',
										}}
									>
										Encryption statistics will appear here
									</Typography>
								</div>
							</div>
						</Card>
					)}
				</Card>

				{/* Statistics Cards */}
				{dataSource === 'benchmarks' ? (
					<>
						{/* Show comparison cards only when "All Algorithms" is selected AND view is "Comparison View" */}
						{selectedAlgorithm === 'all' && activeChart === 'compare' ? (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
								<Card
									className={`p-6 rounded-xl shadow-md ${
										isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
									}`}
								>
									<AlgorithmComparisonCard
										data={filteredBenchmarkData}
										title="Performance Comparison"
										titleIcon="Speed"
										loading={loading}
										comparisonType="performance"
									/>
								</Card>

								<Card
									className={`p-6 rounded-xl shadow-md ${
										isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
									}`}
								>
									<AlgorithmComparisonCard
										data={filteredBenchmarkData}
										title="Memory Comparison"
										titleIcon="Memory"
										loading={loading}
										comparisonType="memory"
									/>
								</Card>

								<Card
									className={`p-6 rounded-xl shadow-md ${
										isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
									}`}
								>
									<AlgorithmComparisonCard
										data={filteredBenchmarkData}
										title="Size Comparison"
										titleIcon="Storage"
										loading={loading}
										comparisonType="size"
									/>
								</Card>
							</div>
						) : (
							<>
								{/* Show BenchmarkDataTable for Average Time, Operations/Sec, and Memory Usage views */}
								{activeChart === 'performance' ||
								activeChart === 'bar' ||
								activeChart === 'trend' ? (
									<Card
										className={`p-6 rounded-xl shadow-md col-span-3 ${
											isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
										}`}
									>
										<BenchmarkDataTable
											data={filteredBenchmarkData}
											metric={
												activeChart === 'performance'
													? 'avg_ms'
													: activeChart === 'bar'
													? 'ops_per_sec'
													: 'mem_peak_kb'
											}
											loading={loading}
											height={450}
											sortColumn={
												currentSortOrder !== 'default'
													? currentSortOrder.split('_').slice(1).join('_')
													: ''
											}
											sortDirection={
												currentSortOrder !== 'default'
													? currentSortOrder.startsWith('asc_')
														? 'asc'
														: currentSortOrder.startsWith('desc_')
														? 'desc'
														: 'none'
													: 'none'
											}
											onSortChange={(column, direction) => {
												if (direction === 'none') {
													setCurrentSortOrder('default');
												} else {
													setCurrentSortOrder(`${direction}_${column}`);
												}
												// Force resize charts after sorting
												setTimeout(() => forceResizeCharts(), 100);
											}}
										/>
									</Card>
								) : (
									<>
										{/* AES has only two cards that should appear side by side */}
										{selectedAlgorithm?.toLowerCase().includes('aes') ? (
											// Special 2-column grid layout just for AES cards
											<div className="grid grid-cols-1 md:grid-cols-2 gap-5 col-span-3">
												{/* AES Encryption Card */}
												<Card
													className={`p-6 rounded-xl shadow-md ${
														isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
													}`}
												>
													<StatisticsCard
														data={filteredBenchmarkData}
														title="Encryption Performance"
														titleIcon="LockOpen"
														algorithm={selectedAlgorithm}
														loading={loading}
														metricType="performance"
														operation="encryption"
													/>
												</Card>

												{/* AES Decryption Card */}
												<Card
													className={`p-6 rounded-xl shadow-md ${
														isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
													}`}
												>
													<StatisticsCard
														data={filteredBenchmarkData}
														title="Decryption Performance"
														titleIcon="Lock"
														algorithm={selectedAlgorithm}
														loading={loading}
														metricType="performance"
														operation="decryption"
													/>
												</Card>
											</div>
										) : (
											<>
												{/* Standard 3-card layout for all other algorithms */}
												<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
													<Card
														className={`p-6 rounded-xl shadow-md ${
															isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
														}`}
													>
														<StatisticsCard
															data={filteredBenchmarkData}
															title="Key Generation Performance"
															titleIcon="VpnKey"
															algorithm={
																selectedAlgorithm !== 'all'
																	? selectedAlgorithm
																	: undefined
															}
															loading={loading}
															metricType="performance"
															operation="keygen"
														/>
													</Card>

													<Card
														className={`p-6 rounded-xl shadow-md ${
															isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
														}`}
													>
														<StatisticsCard
															data={filteredBenchmarkData}
															title={
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('dilithium') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('falcon') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('sphincs') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('ecdsa')
																	? 'Signature Performance'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('kyber') ||
																	  selectedAlgorithm
																			?.toLowerCase()
																			.includes('mceliece')
																	? 'Encapsulation Performance'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('ecdh') ||
																	  selectedAlgorithm
																			?.toLowerCase()
																			.includes('rsa')
																	? 'Public Key Operation'
																	: 'Operation Performance'
															}
															titleIcon={
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('dilithium') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('falcon') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('sphincs') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('ecdsa')
																	? 'Create'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('kyber') ||
																	  selectedAlgorithm
																			?.toLowerCase()
																			.includes('mceliece')
																	? 'LockOpen'
																	: 'VpnKey'
															}
															algorithm={
																selectedAlgorithm !== 'all'
																	? selectedAlgorithm
																	: undefined
															}
															loading={loading}
															metricType="performance"
															operation={
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('dilithium') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('falcon') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('sphincs') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('ecdsa')
																	? 'sign'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('kyber') ||
																	  selectedAlgorithm
																			?.toLowerCase()
																			.includes('mceliece')
																	? 'encapsulate'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('ecdh')
																	? 'shared_secret'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('rsa')
																	? 'encryption'
																	: ''
															}
														/>
													</Card>

													<Card
														className={`p-6 rounded-xl shadow-md ${
															isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
														}`}
													>
														<StatisticsCard
															data={filteredBenchmarkData}
															title={
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('dilithium') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('falcon') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('sphincs') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('ecdsa')
																	? 'Verification Performance'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('kyber') ||
																	  selectedAlgorithm
																			?.toLowerCase()
																			.includes('mceliece')
																	? 'Decapsulation Performance'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('ecdh') ||
																	  selectedAlgorithm
																			?.toLowerCase()
																			.includes('rsa')
																	? 'Private Key Operation'
																	: 'Operation Performance'
															}
															titleIcon={
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('dilithium') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('falcon') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('sphincs') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('ecdsa')
																	? 'VerifiedUser'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('kyber') ||
																	  selectedAlgorithm
																			?.toLowerCase()
																			.includes('mceliece')
																	? 'Lock'
																	: 'VpnKey'
															}
															algorithm={
																selectedAlgorithm !== 'all'
																	? selectedAlgorithm
																	: undefined
															}
															loading={loading}
															metricType="performance"
															operation={
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('dilithium') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('falcon') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('sphincs') ||
																selectedAlgorithm
																	?.toLowerCase()
																	.includes('ecdsa')
																	? 'verify'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('kyber') ||
																	  selectedAlgorithm
																			?.toLowerCase()
																			.includes('mceliece')
																	? 'decapsulate'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('ecdh')
																	? 'shared_secret'
																	: selectedAlgorithm
																			?.toLowerCase()
																			.includes('rsa')
																	? 'decryption'
																	: ''
															}
														/>
													</Card>
												</div>
											</>
										)}
									</>
								)}
							</>
						)}
					</>
				) : dataSource === 'quantum' ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
						<Card
							className={`p-6 rounded-xl shadow-md ${
								isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
							}`}
						>
							<QuantumStatsCard
								data={filteredQuantumData}
								title="Success Rate Analysis"
								titleIcon="CheckCircle"
								algorithm={
									selectedAlgorithm !== 'all' ? selectedAlgorithm : undefined
								}
								loading={loading}
								metricType="success"
							/>
						</Card>

						<Card
							className={`p-6 rounded-xl shadow-md ${
								isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
							}`}
						>
							<QuantumStatsCard
								data={filteredQuantumData}
								title="Circuit Metrics"
								titleIcon="Memory"
								algorithm={
									selectedAlgorithm !== 'all' ? selectedAlgorithm : undefined
								}
								loading={loading}
								metricType="circuit"
							/>
						</Card>

						<Card
							className={`p-6 rounded-xl shadow-md ${
								isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
							}`}
						>
							<QuantumStatsCard
								data={filteredQuantumData}
								title="Runtime Analysis"
								titleIcon="Timer"
								algorithm={
									selectedAlgorithm !== 'all' ? selectedAlgorithm : undefined
								}
								loading={loading}
								metricType="runtime"
							/>
						</Card>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
						{/* Placeholders for encryption data */}
						<Card
							className={`p-6 rounded-xl shadow-md ${
								isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
							}`}
						>
							<div>
								<Typography
									variant="h6"
									gutterBottom
									className="mb-4"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									Encryption Performance
								</Typography>
								<div
									className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 h-64 flex items-center justify-center"
									style={{
										backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
									}}
								>
									<Typography
										style={{
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.7)'
												: 'rgba(0, 0, 0, 0.7)',
										}}
									>
										Encryption statistics will appear here
									</Typography>
								</div>
							</div>
						</Card>

						<Card
							className={`p-6 rounded-xl shadow-md ${
								isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
							}`}
						>
							<div>
								<Typography
									variant="h6"
									gutterBottom
									className="mb-4"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									Key Metrics
								</Typography>
								<div
									className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 h-64 flex items-center justify-center"
									style={{
										backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
									}}
								>
									<Typography
										style={{
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.7)'
												: 'rgba(0, 0, 0, 0.7)',
										}}
									>
										Key metrics will appear here
									</Typography>
								</div>
							</div>
						</Card>

						<Card
							className={`p-6 rounded-xl shadow-md ${
								isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
							}`}
						>
							<div>
								<Typography
									variant="h6"
									gutterBottom
									className="mb-4"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									Security Analysis
								</Typography>
								<div
									className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 h-64 flex items-center justify-center"
									style={{
										backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
									}}
								>
									<Typography
										style={{
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.7)'
												: 'rgba(0, 0, 0, 0.7)',
										}}
									>
										Security analysis will appear here
									</Typography>
								</div>
							</div>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
};

export default VisualizationPage;
