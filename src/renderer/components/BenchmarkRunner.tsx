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
import {
	SpeedIcon,
	PerformanceIcon,
	ComputerIcon,
} from '../utils/algorithm-icons';
import { Button } from '@mui/material';

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

	const handleAlgorithmChange = (
		event: React.ChangeEvent<HTMLSelectElement>
	) => {
		const algorithm = event.target.value;
		setSelectedAlgorithm(algorithm);
		setSelectedParam(SECURITY_PARAMS[algorithm][0]);
	};

	const handleParamChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedParam(event.target.value);
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
				// Convert phase names to display formats
				const phaseDisplayNames: { [key: string]: string } = {
					keygen: 'Key Generation',
					encaps: 'Encapsulation',
					decaps: 'Decapsulation',
					sign: 'Signing',
					verify: 'Verification',
				};

				setCurrentPhase(phaseDisplayNames[data.progress] || data.progress);

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

	// Get algorithm display name
	const algorithmInfo = getAlgorithmInfo(selectedAlgorithm);
	const algorithmDisplayName = algorithmInfo.displayName;

	return (
		<div className="space-y-5">
			{/* Description */}
			<p className="text-muted-foreground mb-5">
				Configure and run benchmarks for post-quantum and classical cryptography
				algorithms. Select an algorithm and a security parameter to start a
				benchmark.
			</p>

			{/* Configuration Card */}
			<Card
				className={`p-6 mb-5 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
					{/* Algorithm Selection */}
					<div>
						<label className="block text-sm font-medium mb-2">Algorithm</label>
						<select
							className="w-full p-2 border border-border rounded-md"
							value={selectedAlgorithm}
							onChange={handleAlgorithmChange}
							disabled={isRunning}
							style={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								color: isDarkMode ? '#ffffff' : '#111111',
							}}
						>
							{SUPPORTED_ALGORITHMS.map((algo) => {
								const { displayName, category } = getAlgorithmInfo(algo);
								return (
									<option key={algo} value={algo}>
										{displayName} ({category})
									</option>
								);
							})}
						</select>
					</div>

					{/* Security Parameter Selection */}
					<div>
						<label className="block text-sm font-medium mb-2">
							Security Parameter
						</label>
						<select
							className="w-full p-2 border border-border rounded-md"
							value={selectedParam}
							onChange={handleParamChange}
							disabled={isRunning}
							style={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								color: isDarkMode ? '#ffffff' : '#111111',
							}}
						>
							{SECURITY_PARAMS[selectedAlgorithm]?.map((param) => (
								<option key={param} value={param}>
									{param}
								</option>
							))}
						</select>
					</div>

					{/* Iterations */}
					<div>
						<label className="block text-sm font-medium mb-2">Iterations</label>
						<input
							type="number"
							className="w-full p-2 border border-border rounded-md"
							value={iterations}
							onChange={handleIterationsChange}
							min="1"
							step="1000"
							disabled={isRunning}
							style={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								color: isDarkMode ? '#ffffff' : '#111111',
							}}
						/>
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
							bgcolor: '#9747FF',
							'&:hover': {
								bgcolor: '#8030E0',
							},
							fontSize: '0.9rem',
							padding: '8px 20px',
							textTransform: 'none',
							fontWeight: 'bold',
							borderRadius: '6px',
							opacity: isRunning ? 0.7 : 1,
							cursor: isRunning ? 'not-allowed' : 'pointer',
						}}
					>
						Run Benchmark
					</Button>
					{isRunning && (
						<Button
							variant="contained"
							disableElevation
							onClick={stopBenchmark}
							sx={{
								bgcolor: '#ff4757',
								'&:hover': {
									bgcolor: '#e01e37',
								},
								fontSize: '0.9rem',
								padding: '8px 20px',
								textTransform: 'none',
								fontWeight: 'bold',
								borderRadius: '6px',
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
							<div className="mr-2 rounded-full p-2 bg-[#9747FF20]">
								<PerformanceIcon className="w-5 h-5 text-[#9747FF]" />
							</div>
							<h3 className="text-xl font-medium">Performance Metrics</h3>
						</div>
						<div className="space-y-3">
							<div className="metric-update">
								<div className="text-sm text-muted-foreground">
									Average Execution Time
								</div>
								<div className="text-lg font-medium">
									{performanceMetrics.avgTime} ms
								</div>
							</div>
							<div className="metric-update">
								<div className="text-sm text-muted-foreground">
									Minimum Execution Time
								</div>
								<div className="text-lg font-medium">
									{performanceMetrics.minTime} ms
								</div>
							</div>
							<div className="metric-update">
								<div className="text-sm text-muted-foreground">
									Maximum Execution Time
								</div>
								<div className="text-lg font-medium">
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
							<div className="mr-2 rounded-full p-2 bg-[#9747FF20]">
								<ComputerIcon className="w-5 h-5 text-[#9747FF]" />
							</div>
							<h3 className="text-xl font-medium">System Metrics</h3>
						</div>
						<div className="space-y-3">
							<div className="metric-update">
								<div className="text-sm text-muted-foreground">
									Current Throughput
								</div>
								<div className="text-lg font-medium">
									{systemMetrics.throughput} ops/sec
								</div>
							</div>
							<div className="metric-update">
								<div className="text-sm text-muted-foreground">
									Average Memory Usage
								</div>
								<div className="text-lg font-medium">
									{systemMetrics.avgMemory} KB
								</div>
							</div>
							<div className="metric-update">
								<div className="text-sm text-muted-foreground">
									Peak Memory Usage
								</div>
								<div className="text-lg font-medium">
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
					<BenchmarkResultCard benchmark={currentBenchmark} />
				</div>
			)}
		</div>
	);
};
