import React, { useState, useEffect } from 'react';
import {
	BenchmarkParams,
	BenchmarkResult,
	SUPPORTED_ALGORITHMS,
	SECURITY_PARAMS,
} from '../../types/benchmark';
import { benchmarkStoreUtils } from '../utils/benchmark-store-utils';
import {
	getAlgorithmInfo,
	getCategoryColorClass,
} from '../utils/algorithm-categories';
import { BenchmarkResultCard } from './BenchmarkResultCard';
import { Card } from './ui/card';
import { Speedometer } from './Speedometer';
import { MetricsCard } from './MetricsCard';
import { useTheme } from '@mui/material/styles';
import SpeedIcon from '@mui/icons-material/Speed';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ComputerIcon from '@mui/icons-material/Computer';
import {
	Button,
	Select,
	MenuItem,
	TextField,
	InputLabel,
	FormControl,
	SelectChangeEvent,
	CircularProgress,
} from '@mui/material';
import { getOperationDisplayName } from '../../types/algorithm-types';

export const BenchmarkRunner: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const initialAlgorithm = SUPPORTED_ALGORITHMS[0];
	const [selectedAlgorithm, setSelectedAlgorithm] =
		useState<string>(initialAlgorithm);
	const [selectedParam, setSelectedParam] = useState<string>(
		SECURITY_PARAMS[initialAlgorithm][0]
	);
	const [iterations, setIterations] = useState<number>(10000); // Default to 10,000 iterations
	const [currentBenchmark, setCurrentBenchmark] =
		useState<BenchmarkResult | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [benchmarkId, setBenchmarkId] = useState<string | null>(null);
	const [justCompleted, setJustCompleted] = useState(false);

	// State for tracking current metrics
	const [currentPhase, setCurrentPhase] = useState<string>('Ready');
	const [progress, setProgress] = useState<number>(0);
	const [performanceMetrics, setPerformanceMetrics] = useState({
		avgTime: '0',
		minTime: '0',
		maxTime: '0',
	});
	const [systemMetrics, setSystemMetrics] = useState({
		throughput: '0',
		avgMemory: '0',
		peakMemory: '0',
	});

	const handleAlgorithmChange = (event: SelectChangeEvent) => {
		const algorithm = event.target.value;
		setSelectedAlgorithm(algorithm);
		setSelectedParam(SECURITY_PARAMS[algorithm][0]);
		setJustCompleted(false);

		// Set default iterations based on algorithm type
		if (['kyber', 'aes'].includes(algorithm)) {
			setIterations(10000);
		} else if (['ecdsa', 'ecdh', 'falcon', 'dilithium'].includes(algorithm)) {
			setIterations(1000);
		} else if (['mceliece', 'sphincs', 'rsa'].includes(algorithm)) {
			setIterations(100);
		}
	};

	const handleParamChange = (event: SelectChangeEvent) => {
		setSelectedParam(event.target.value);
		setJustCompleted(false);
	};

	const handleIterationsChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const value = parseInt(event.target.value);
		if (!isNaN(value) && value > 0) {
			setIterations(value);
		}
	};

	const runBenchmark = async () => {
		setIsRunning(true);
		setJustCompleted(false);
		setCurrentBenchmark(null); // Clear previous results

		// Reset metrics
		setProgress(0);
		setCurrentPhase('Initializing');
		setPerformanceMetrics({
			avgTime: '0',
			minTime: '0',
			maxTime: '0',
		});
		setSystemMetrics({
			throughput: '0',
			avgMemory: '0',
			peakMemory: '0',
		});

		try {
			const params: BenchmarkParams = {
				algorithm: selectedAlgorithm,
				securityParam: selectedParam,
				iterations: iterations,
			};
			const result = await benchmarkStoreUtils.runBenchmark(params);
			setCurrentBenchmark(result);
			setBenchmarkId(result.id);
		} catch (error) {
			console.error('Benchmark failed:', error);
			// If the error is already a BenchmarkResult (from the main process), use it
			if (
				error &&
				typeof error === 'object' &&
				'id' in error &&
				'status' in error
			) {
				const errorResult = error as BenchmarkResult;
				setCurrentBenchmark(errorResult);
				setBenchmarkId(errorResult.id);
			}
		} finally {
			setIsRunning(false);
			setJustCompleted(true);
			setCurrentPhase('Completed');
			setProgress(100);
		}
	};

	const stopBenchmark = async () => {
		if (benchmarkId) {
			try {
				await benchmarkStoreUtils.stopBenchmark(benchmarkId);
			} catch (error) {
				console.error('Failed to stop benchmark:', error);
			} finally {
				setIsRunning(false);
				setJustCompleted(true);
				setCurrentPhase('Stopped');
			}
		}
	};

	// Set up event listener for benchmark progress updates
	useEffect(() => {
		if (!isRunning) return;

		const handleBenchmarkProgress = (data: any) => {
			// Update phase and progress
			if (data.progress) {
				// Get operation display name using our utility function
				const phaseDisplayName = getOperationDisplayName(
					selectedAlgorithm,
					data.progress
				);
				setCurrentPhase(phaseDisplayName);

				// Calculate progress percentage
				if (data.iteration && data.total) {
					setProgress((data.iteration / data.total) * 100);
				}

				// Update performance metrics
				setPerformanceMetrics({
					avgTime: data.current_avg_ms?.toFixed(6) || '0',
					minTime: data.current_min_ms?.toFixed(6) || '0',
					maxTime: data.current_max_ms?.toFixed(6) || '0',
				});

				// Update system metrics
				setSystemMetrics({
					throughput: data.current_throughput_ops_sec?.toFixed(2) || '0',
					avgMemory: data.current_mem_avg_kb?.toFixed(2) || '0',
					peakMemory: data.current_mem_peak_kb?.toFixed(2) || '0',
				});
			}
		};

		window.electron.ipcRenderer.on(
			'benchmark-progress',
			handleBenchmarkProgress
		);

		return () => {
			window.electron.ipcRenderer.removeListener(
				'benchmark-progress',
				handleBenchmarkProgress
			);
		};
	}, [isRunning]);

	// Reset justCompleted after a delay
	useEffect(() => {
		if (justCompleted) {
			const timer = setTimeout(() => {
				setJustCompleted(false);
			}, 3000); // Reset after 3 seconds (after animation completes)

			return () => clearTimeout(timer);
		}
	}, [justCompleted]);

	// Get algorithm display name
	const algorithmInfo = getAlgorithmInfo(selectedAlgorithm);
	const algorithmDisplayName = algorithmInfo.displayName;

	return (
		<div className="space-y-5">
			{/* Configuration Card with header and description */}
			<Card
				className={`p-6 mb-5 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<SpeedIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[20px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Run Benchmarks
					</h2>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Configure and run benchmarks for post-quantum and classical
					cryptography algorithms. Select an algorithm and a security parameter
					to start a benchmark.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
					{/* Algorithm Selection */}
					<div>
						<FormControl fullWidth variant="outlined">
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
								id="algorithm"
								value={selectedAlgorithm}
								onChange={handleAlgorithmChange}
								disabled={isRunning}
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
								{SUPPORTED_ALGORITHMS.map((algo) => {
									const { displayName, category } = getAlgorithmInfo(algo);
									return (
										<MenuItem key={algo} value={algo}>
											{displayName} ({category})
										</MenuItem>
									);
								})}
							</Select>
						</FormControl>
					</div>

					{/* Security Parameter Selection */}
					<div>
						<FormControl fullWidth variant="outlined">
							<InputLabel
								id="security-param-label"
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
								Security Parameter
							</InputLabel>
							<Select
								labelId="security-param-label"
								id="security-param"
								value={selectedParam}
								onChange={handleParamChange}
								disabled={isRunning}
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
								{SECURITY_PARAMS[selectedAlgorithm]?.map((param) => (
									<MenuItem key={param} value={param}>
										{param}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</div>

					{/* Iterations */}
					<div>
						<FormControl fullWidth>
							<TextField
								id="iterations"
								type="number"
								value={iterations}
								onChange={handleIterationsChange}
								inputProps={{
									min: '1',
									step: '1000',
								}}
								disabled={isRunning}
								label="Iterations"
								variant="outlined"
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									borderRadius: '8px',
									overflow: 'visible',
									'& .MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
									},
									'& .MuiOutlinedInput-root': {
										borderRadius: '8px',
										overflow: 'hidden',
										'& fieldset': {
											borderColor: 'transparent',
											borderRadius: '8px',
										},
									},
									'&:hover .MuiOutlinedInput-root fieldset': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'& .MuiOutlinedInput-root.Mui-focused fieldset': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
									'& .MuiInputLabel-root': {
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.6)',
										transform: 'translate(14px, -9px) scale(0.75)',
										'&.MuiInputLabel-shrink': {
											transform: 'translate(14px, -9px) scale(0.75)',
										},
									},
								}}
							/>
						</FormControl>
					</div>
				</div>

				{/* Buttons */}
				<div className="flex space-x-4">
					<Button
						variant="contained"
						disableElevation
						onClick={runBenchmark}
						disabled={isRunning}
						sx={{
							fontSize: '0.9rem',
							padding: '10px 24px',
							textTransform: 'uppercase',
							fontWeight: 'bold',
							borderRadius: '8px',
							opacity: isRunning ? 0.7 : 1,
							cursor: isRunning ? 'not-allowed' : 'pointer',
						}}
						startIcon={
							isRunning ? <CircularProgress size={20} color="inherit" /> : null
						}
					>
						{isRunning ? 'RUNNING...' : 'RUN BENCHMARK'}
					</Button>
					{isRunning && (
						<Button
							variant="outlined"
							disableElevation
							onClick={stopBenchmark}
							sx={{
								backgroundColor: isDarkMode
									? 'rgba(255, 0, 0, 0.08)'
									: 'rgba(255, 0, 0, 0.04)',
								color: isDarkMode
									? 'rgba(255, 100, 100, 0.9)'
									: 'rgba(220, 0, 0, 0.8)',
								borderColor: isDarkMode
									? 'rgba(255, 100, 100, 0.5)'
									: 'rgba(220, 0, 0, 0.5)',
								'&:hover': {
									backgroundColor: isDarkMode
										? 'rgba(255, 0, 0, 0.12)'
										: 'rgba(255, 0, 0, 0.08)',
									borderColor: isDarkMode
										? 'rgba(255, 100, 100, 0.7)'
										: 'rgba(220, 0, 0, 0.7)',
								},
								fontSize: '0.9rem',
								padding: '10px 24px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								borderRadius: '8px',
							}}
						>
							Stop
						</Button>
					)}
				</div>
			</Card>

			{/* Metrics Dashboard */}
			{(isRunning || !currentBenchmark) && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
					{/* Performance Metrics */}
					<Card
						className={`p-4 h-full rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<div className="flex items-center mb-3">
							<AssessmentIcon style={{ color: '#9747FF' }} className="mr-2" />
							<h3
								className="text-xl font-medium"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								Performance Metrics
							</h3>
						</div>
						<div className="space-y-3">
							<div
								className={`metric-update ${isRunning ? 'animate-metric' : ''}`}
							>
								<div className="text-sm" style={{ color: '#999999' }}>
									Average Execution Time
								</div>
								<div
									className="text-lg font-medium"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									{performanceMetrics.avgTime} ms
								</div>
							</div>
							<div
								className={`metric-update ${isRunning ? 'animate-metric' : ''}`}
							>
								<div className="text-sm" style={{ color: '#999999' }}>
									Minimum Execution Time
								</div>
								<div
									className="text-lg font-medium"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									{performanceMetrics.minTime} ms
								</div>
							</div>
							<div
								className={`metric-update ${isRunning ? 'animate-metric' : ''}`}
							>
								<div className="text-sm" style={{ color: '#999999' }}>
									Maximum Execution Time
								</div>
								<div
									className="text-lg font-medium"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									{performanceMetrics.maxTime} ms
								</div>
							</div>
						</div>
					</Card>

					{/* Speedometer */}
					<Card
						className={`p-4 flex items-center justify-center rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<Speedometer
							value={progress}
							isRunning={isRunning}
							justCompleted={justCompleted}
							label={currentPhase}
							algorithm={isRunning ? algorithmDisplayName : undefined}
							securityParam={isRunning ? selectedParam : undefined}
						/>
					</Card>

					{/* System Metrics */}
					<Card
						className={`p-4 h-full rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<div className="flex items-center mb-3">
							<ComputerIcon style={{ color: '#9747FF' }} className="mr-2" />
							<h3
								className="text-xl font-medium"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								System Metrics
							</h3>
						</div>
						<div className="space-y-3">
							<div
								className={`metric-update ${isRunning ? 'animate-metric' : ''}`}
							>
								<div className="text-sm" style={{ color: '#999999' }}>
									Current Throughput
								</div>
								<div
									className="text-lg font-medium"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									{systemMetrics.throughput} ops/sec
								</div>
							</div>
							<div
								className={`metric-update ${isRunning ? 'animate-metric' : ''}`}
							>
								<div className="text-sm" style={{ color: '#999999' }}>
									Average Memory Usage
								</div>
								<div
									className="text-lg font-medium"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									{systemMetrics.avgMemory} KB
								</div>
							</div>
							<div
								className={`metric-update ${isRunning ? 'animate-metric' : ''}`}
							>
								<div className="text-sm" style={{ color: '#999999' }}>
									Peak Memory Usage
								</div>
								<div
									className="text-lg font-medium"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									{systemMetrics.peakMemory} KB
								</div>
							</div>
						</div>
					</Card>
				</div>
			)}

			{/* Results Dashboard (when completed) */}
			{currentBenchmark && !isRunning && (
				<div className="mt-5">
					<BenchmarkResultCard
						benchmark={currentBenchmark}
						justCompleted={justCompleted}
					/>
				</div>
			)}
		</div>
	);
};

export default BenchmarkRunner;
