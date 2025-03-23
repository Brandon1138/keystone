import React, { useState, useEffect, useRef } from 'react';
import { CircularProgress, Box, Typography, Paper, Grid } from '@mui/material';
import { Card } from './ui/card';
import './dashboard.css';
import {
	getAlgorithmDefinition,
	getAlgorithmOperations,
	getOperationDisplayName,
} from '../../types/algorithm-types';

// Interface for benchmark progress data
interface BenchmarkProgressData {
	progress:
		| 'keygen'
		| 'encaps'
		| 'decaps'
		| 'sign'
		| 'verify'
		| 'encrypt'
		| 'decrypt'
		| 'shared_secret';
	parameter: string;
	iteration: number;
	total: number;
	current_avg_ms: number;
	current_min_ms: number;
	current_max_ms: number;
	current_throughput_ops_sec: number;
	current_mem_avg_kb: number;
	current_mem_peak_kb: number;
	key_size?: number;
	public_key_bytes?: number; // For RSA public key size
	secret_key_bytes?: number; // For RSA secret key size
	curve?: string; // For ECDH curve name
	shared_secret_bytes?: number; // For ECDH shared secret size
	signature_bytes?: number; // For ECDSA signature size
}

// Interface to store the last data for each phase
interface PhaseData {
	keygen?: BenchmarkProgressData;
	encaps?: BenchmarkProgressData;
	decaps?: BenchmarkProgressData;
	sign?: BenchmarkProgressData;
	verify?: BenchmarkProgressData;
	encrypt?: BenchmarkProgressData;
	decrypt?: BenchmarkProgressData;
	shared_secret?: BenchmarkProgressData;
}

// Track overall progress across phases
interface OverallProgress {
	currentPhase: number;
	totalPhases: number;
	currentIteration: number;
	totalIterations: number;
	phaseMap: { [key: string]: number };
	completedPhases: Set<string>;
}

interface BenchmarkDashboardProps {
	isRunning: boolean;
	algorithm: string;
	securityParam: string;
}

export const BenchmarkDashboard: React.FC<BenchmarkDashboardProps> = ({
	isRunning,
	algorithm,
	securityParam,
}) => {
	const [progressData, setProgressData] =
		useState<BenchmarkProgressData | null>(null);
	const [completedPhases, setCompletedPhases] = useState<PhaseData>({});
	const [isCompleted, setIsCompleted] = useState(false);
	const [lastSeenPhase, setLastSeenPhase] = useState<string | null>(null);

	// Use refs to keep track of phase transitions
	const phaseTransitionsRef = useRef<Set<string>>(new Set());

	// Determine the total number of phases based on the algorithm
	const getTotalPhases = (algo: string): number => {
		return getAlgorithmOperations(algo).length;
	};

	// Get phase number based on phase name and algorithm
	const getPhaseNumber = (phaseName: string, algo: string): number => {
		const operations = getAlgorithmOperations(algo);
		const index = operations.indexOf(phaseName);
		return index >= 0 ? index : 0;
	};

	// Initialize overall progress state
	const [overallProgress, setOverallProgress] = useState<OverallProgress>({
		currentPhase: 0,
		totalPhases: getTotalPhases(algorithm),
		currentIteration: 0,
		totalIterations: 0,
		phaseMap: getAlgorithmOperations(algorithm).reduce((acc, op, index) => {
			acc[op] = index;
			return acc;
		}, {} as { [key: string]: number }),
		completedPhases: new Set(),
	});

	// Reset state when algorithm changes
	useEffect(() => {
		const operations = getAlgorithmOperations(algorithm);
		const phaseMap = operations.reduce((acc, op, index) => {
			acc[op] = index;
			return acc;
		}, {} as { [key: string]: number });

		setOverallProgress({
			currentPhase: 0,
			totalPhases: operations.length,
			currentIteration: 0,
			totalIterations: 0,
			phaseMap,
			completedPhases: new Set(),
		});
		phaseTransitionsRef.current = new Set();
		setLastSeenPhase(null);
	}, [algorithm]);

	// Set up IPC listeners for benchmark progress
	useEffect(() => {
		if (!isRunning) {
			if (
				progressData &&
				!isCompleted &&
				Object.keys(completedPhases).length > 0
			) {
				setIsCompleted(true);
			}
			return;
		}

		// Reset states when starting a new benchmark
		setIsCompleted(false);
		setCompletedPhases({});
		phaseTransitionsRef.current = new Set();
		setLastSeenPhase(null);

		setOverallProgress({
			currentPhase: 0,
			totalPhases: getTotalPhases(algorithm),
			currentIteration: 0,
			totalIterations: 0,
			phaseMap: getAlgorithmOperations(algorithm).reduce((acc, op, index) => {
				acc[op] = index;
				return acc;
			}, {} as { [key: string]: number }),
			completedPhases: new Set(),
		});

		const handleBenchmarkProgress = (data: BenchmarkProgressData) => {
			// Ensure all required fields are present before setting state
			if (
				data &&
				typeof data.progress === 'string' &&
				typeof data.parameter === 'string' &&
				typeof data.iteration === 'number' &&
				typeof data.total === 'number'
			) {
				// Store current data
				setProgressData(data);

				// Store the last data for each phase
				setCompletedPhases((prev) => ({
					...prev,
					[data.progress]: data,
				}));

				// Detect phase transitions
				if (lastSeenPhase !== null && lastSeenPhase !== data.progress) {
					// Mark previous phase as completed
					phaseTransitionsRef.current.add(lastSeenPhase);
				}

				// Update last seen phase
				setLastSeenPhase(data.progress);

				// Get current phase number
				const currentPhaseNumber = getPhaseNumber(data.progress, algorithm);

				// Calculate progress for the total progress bar
				setOverallProgress((prev) => {
					const totalPhases = getTotalPhases(algorithm);
					const phaseSize = 1 / totalPhases;

					// Count completed phases (based on transitions detected)
					const completedPhasesCount = phaseTransitionsRef.current.size;

					// Calculate the progress of the current phase
					const currentPhaseProgress = data.iteration / data.total;

					// Update completed phases set
					const updatedCompletedPhases = new Set(prev.completedPhases);
					phaseTransitionsRef.current.forEach((phase) => {
						updatedCompletedPhases.add(phase);
					});

					return {
						currentPhase: currentPhaseNumber,
						totalPhases,
						currentIteration: data.iteration,
						totalIterations: data.total,
						phaseMap: prev.phaseMap,
						completedPhases: updatedCompletedPhases,
					};
				});
			}
		};

		// Listen for benchmark progress updates
		window.electron.ipcRenderer.on(
			'benchmark-progress',
			handleBenchmarkProgress
		);

		return () => {
			// Clean up listener when component unmounts or benchmark stops
			window.electron.ipcRenderer.removeListener(
				'benchmark-progress',
				handleBenchmarkProgress
			);
		};
	}, [isRunning, algorithm, lastSeenPhase]);

	// Calculate percentages for progress indicators
	const currentProgress =
		progressData && progressData.iteration && progressData.total
			? (progressData.iteration / progressData.total) * 100
			: 0;

	// Calculate total progress percentage correctly
	const calculateTotalProgressPercentage = () => {
		if (!progressData || !overallProgress.totalIterations) return 0;

		const totalPhases = overallProgress.totalPhases;
		const phaseSize = 100 / totalPhases;

		// Calculate progress from completed phases
		const completedPhasesProgress =
			phaseTransitionsRef.current.size * phaseSize;

		// Calculate progress of the current phase
		const currentPhaseProgress =
			(progressData.iteration / progressData.total) * phaseSize;

		return completedPhasesProgress + currentPhaseProgress;
	};

	const totalProgressPercentage = calculateTotalProgressPercentage();

	// Helper to get display name for a phase
	const getPhaseDisplayName = (phase: string): string => {
		return getOperationDisplayName(algorithm, phase);
	};

	// Helper to format numbers with fixed precision
	const formatNumber = (num: number | undefined, precision: number = 6) => {
		if (num === undefined || isNaN(num)) return '0';
		return num.toFixed(precision).replace(/\.?0+$/, '');
	};

	// Get progress class for styling based on percentage
	const getProgressClass = (progress: number) => {
		if (progress < 40) return 'progress-low';
		if (progress < 80) return 'progress-medium';
		return 'progress-high';
	};

	// Create a needle-style speedometer rather than percentage
	const SpeedometerNeedle = ({ value }: { value: number }) => {
		// Convert percentage to rotation angle (0% = -90deg, 100% = 90deg)
		const angle = (value / 100) * 180 - 90;

		return (
			<div className="speedometer-container">
				<div className="speedometer-dial">
					<div className="speedometer-ticks">
						{/* Create tick marks - 11 ticks for 0-100% */}
						{Array.from({ length: 11 }).map((_, i) => (
							<div
								key={i}
								className="speedometer-tick"
								style={{ transform: `rotate(${-90 + i * 18}deg)` }}
							/>
						))}
					</div>

					{/* Tick labels for 0, 20, 40, 60, 80, 100 */}
					<div className="speedometer-tick-labels">
						{[0, 20, 40, 60, 80, 100].map((num) => {
							// Calculate position around the bottom of the dial
							// Map 0-100 to positions around the bottom half of the dial
							const angle = -90 + (num * 180) / 100;
							const radians = (angle * Math.PI) / 180;
							const radius = 90; // Distance from center

							// Calculate position with x (right is positive) and y (down is positive)
							let x = Math.cos(radians) * radius;
							let y = Math.sin(radians) * radius;

							// Adjust for the center of the dial
							x += 110; // center x
							y += 110; // center y

							return (
								<div
									key={num}
									className="speedometer-tick-label"
									style={{
										transform: `translate(${x - 15}px, ${y - 10}px)`,
									}}
								>
									{num}
								</div>
							);
						})}
					</div>

					{/* Needle */}
					<div
						className="speedometer-needle"
						style={{ transform: `rotate(${angle}deg)` }}
					/>
					<div className="speedometer-center" />

					{/* Percentage display */}
					<div className="speedometer-value">{Math.round(value)}</div>

					{/* Digital display */}
					<div className="speedometer-digital">PROGRESS</div>
				</div>
			</div>
		);
	};

	// Static completed speedometer with animations
	const CompletedSpeedometer = () => (
		<div className="speedometer-container">
			<div className="speedometer-dial completed">
				<div className="speedometer-ticks">
					{Array.from({ length: 11 }).map((_, i) => (
						<div
							key={i}
							className="speedometer-tick"
							style={{ transform: `rotate(${-90 + i * 18}deg)` }}
						/>
					))}
				</div>

				{/* Tick labels for 0, 20, 40, 60, 80, 100 */}
				<div className="speedometer-tick-labels">
					{[0, 20, 40, 60, 80, 100].map((num) => {
						// Calculate position around the bottom of the dial
						// Map 0-100 to positions around the bottom half of the dial
						const angle = -90 + (num * 180) / 100;
						const radians = (angle * Math.PI) / 180;
						const radius = 90; // Distance from center

						// Calculate position with x (right is positive) and y (down is positive)
						let x = Math.cos(radians) * radius;
						let y = Math.sin(radians) * radius;

						// Adjust for the center of the dial
						x += 110; // center x
						y += 110; // center y

						return (
							<div
								key={num}
								className="speedometer-tick-label"
								style={{
									transform: `translate(${x - 15}px, ${y - 10}px)`,
								}}
							>
								{num}
							</div>
						);
					})}
				</div>

				<div
					className="speedometer-needle"
					style={{ transform: `rotate(90deg)` }}
				/>
				<div className="speedometer-center" />
				<div className="speedometer-value">100</div>
				<div className="speedometer-digital">COMPLETED</div>
			</div>
		</div>
	);

	// Component to render an individual phase dashboard
	const PhaseResultDashboard = ({
		phaseData,
		phaseName,
	}: {
		phaseData: BenchmarkProgressData;
		phaseName: string;
	}) => {
		return (
			<Card className="p-4 mb-4 bg-card dark:bg-card-dark dashboard-phase">
				<div className="flex items-center mb-2">
					<Typography variant="h6" className="capitalize">
						{phaseName}
					</Typography>
					{phaseData.key_size && (
						<Typography variant="subtitle1" className="ml-2">
							(Key Size: {phaseData.key_size} bits)
						</Typography>
					)}
					{phaseData.curve && (
						<Typography variant="subtitle1" className="ml-2">
							(Curve: {phaseData.curve})
						</Typography>
					)}
				</div>

				<Grid container spacing={3}>
					{/* Performance Metrics */}
					<Grid item xs={12} md={4}>
						<div className="space-y-2">
							<Typography variant="subtitle2" className="font-medium">
								Performance
							</Typography>
							<div>
								<Typography variant="body2" className="text-muted-foreground">
									Average Time: {formatNumber(phaseData.current_avg_ms)} ms
								</Typography>
								<Typography variant="body2" className="text-muted-foreground">
									Min/Max: {formatNumber(phaseData.current_min_ms)}/
									{formatNumber(phaseData.current_max_ms)} ms
								</Typography>
							</div>
						</div>
					</Grid>

					{/* Completed Speedometer - Center */}
					<Grid item xs={12} md={4}>
						<div className="flex flex-col items-center justify-center">
							<CompletedSpeedometer />
						</div>
					</Grid>

					{/* System Metrics */}
					<Grid item xs={12} md={4}>
						<div className="space-y-2">
							<Typography variant="subtitle2" className="font-medium">
								System
							</Typography>
							<div>
								<Typography variant="body2" className="text-muted-foreground">
									Throughput:{' '}
									{formatNumber(phaseData.current_throughput_ops_sec)} ops/sec
								</Typography>
								<Typography variant="body2" className="text-muted-foreground">
									Memory: {formatNumber(phaseData.current_mem_avg_kb)} KB avg /{' '}
									{formatNumber(phaseData.current_mem_peak_kb)} KB peak
								</Typography>
								{/* Display RSA/ECDH key sizes if available */}
								{phaseData.public_key_bytes && (
									<Typography variant="body2" className="text-muted-foreground">
										Public Key: {phaseData.public_key_bytes} bytes
									</Typography>
								)}
								{phaseData.secret_key_bytes && (
									<Typography variant="body2" className="text-muted-foreground">
										Secret Key: {phaseData.secret_key_bytes} bytes
									</Typography>
								)}
								{phaseData.shared_secret_bytes && (
									<Typography variant="body2" className="text-muted-foreground">
										Shared Secret: {phaseData.shared_secret_bytes} bytes
									</Typography>
								)}
								{phaseData.signature_bytes && phaseData.progress === 'sign' && (
									<Typography variant="body2" className="text-muted-foreground">
										Signature Size: {phaseData.signature_bytes} bytes
									</Typography>
								)}
							</div>
						</div>
					</Grid>
				</Grid>
			</Card>
		);
	};

	// If no data yet, show a placeholder
	if (!isRunning && !isCompleted) {
		return (
			<Card className="p-6 bg-card dark:bg-card-dark">
				<div className="text-center text-muted-foreground dark:text-muted-foreground-dark py-12">
					Select an algorithm and parameters, then run the benchmark to see
					real-time metrics.
				</div>
			</Card>
		);
	}

	// If the benchmark is completed, show stacked results for each phase
	if (isCompleted) {
		// For ECDH algorithm, add curve name to all phases from metadata if available
		if (
			algorithm === 'ecdh' &&
			completedPhases.keygen &&
			!completedPhases.keygen.curve
		) {
			// If we have keygen data but no curve info, try to get it from the latest data
			if (progressData && progressData.curve) {
				// Add curve info to all phases
				Object.keys(completedPhases).forEach((key) => {
					if (completedPhases[key as keyof PhaseData]) {
						(
							completedPhases[key as keyof PhaseData] as BenchmarkProgressData
						).curve = progressData.curve;
					}
				});
			}
		}

		return (
			<Card className="p-6 bg-card dark:bg-card-dark">
				<h3 className="text-xl font-bold mb-4">Benchmark Results</h3>
				<p className="mb-4 text-muted-foreground dark:text-muted-foreground-dark">
					Results for {algorithm} with security parameter {securityParam}
				</p>

				{/* Stacked phase results */}
				<div className="space-y-4">
					{completedPhases.keygen && (
						<PhaseResultDashboard
							phaseData={completedPhases.keygen}
							phaseName="Key Generation"
						/>
					)}
					{completedPhases.encaps && (
						<PhaseResultDashboard
							phaseData={completedPhases.encaps}
							phaseName="Encapsulation"
						/>
					)}
					{completedPhases.decaps && (
						<PhaseResultDashboard
							phaseData={completedPhases.decaps}
							phaseName="Decapsulation"
						/>
					)}
					{completedPhases.sign && (
						<PhaseResultDashboard
							phaseData={completedPhases.sign}
							phaseName="Signature Generation"
						/>
					)}
					{completedPhases.verify && (
						<PhaseResultDashboard
							phaseData={completedPhases.verify}
							phaseName="Signature Verification"
						/>
					)}
					{completedPhases.encrypt && (
						<PhaseResultDashboard
							phaseData={completedPhases.encrypt}
							phaseName="Encryption"
						/>
					)}
					{completedPhases.decrypt && (
						<PhaseResultDashboard
							phaseData={completedPhases.decrypt}
							phaseName="Decryption"
						/>
					)}
					{completedPhases.shared_secret && (
						<PhaseResultDashboard
							phaseData={completedPhases.shared_secret}
							phaseName="Shared Secret Computation"
						/>
					)}
				</div>
			</Card>
		);
	}

	// If still initializing
	if (!progressData) {
		return (
			<Card className="p-6 bg-card dark:bg-card-dark">
				<div className="text-center text-muted-foreground dark:text-muted-foreground-dark py-12">
					Initializing benchmark...
				</div>
			</Card>
		);
	}

	// Display the current phase number (1-indexed for display)
	const displayPhaseNumber = overallProgress.currentPhase + 1;

	// Get the display name for the current phase
	const currentPhaseDisplayName = getPhaseDisplayName(progressData.progress);

	// Real-time dashboard during benchmark run
	return (
		<Card className="p-6 bg-card dark:bg-card-dark dashboard">
			{/* Overall Progress Bar */}
			<div className="mb-6">
				<div className="flex justify-between mb-1 items-center">
					<Typography variant="subtitle2" className="text-sm">
						Total Progress
					</Typography>
					<Typography variant="body2" className="text-xs">
						Phase {displayPhaseNumber}/{overallProgress.totalPhases} (
						{currentPhaseDisplayName})
					</Typography>
				</div>
				<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
					<div
						className="bg-primary h-2.5 rounded-full progress-bar"
						style={{ width: `${totalProgressPercentage}%` }}
					></div>
				</div>
			</div>

			<Grid container spacing={4}>
				{/* Performance Metrics - Left Side */}
				<Grid item xs={12} md={4}>
					<Card className="p-4 bg-card/50 dark:bg-[#21212180] dashboard-metrics h-full">
						<Typography variant="subtitle1" className="font-medium mb-3">
							Performance Metrics
						</Typography>

						<div className="space-y-4">
							<div className="metric-update">
								<Typography
									variant="body2"
									className="text-muted-foreground dark:text-muted-foreground-dark"
								>
									Average Execution Time
								</Typography>
								<Typography variant="h6">
									{formatNumber(progressData.current_avg_ms)} ms
								</Typography>
							</div>

							<div className="metric-update">
								<Typography
									variant="body2"
									className="text-muted-foreground dark:text-muted-foreground-dark"
								>
									Minimum Execution Time
								</Typography>
								<Typography variant="h6">
									{formatNumber(progressData.current_min_ms)} ms
								</Typography>
							</div>

							<div className="metric-update">
								<Typography
									variant="body2"
									className="text-muted-foreground dark:text-muted-foreground-dark"
								>
									Maximum Execution Time
								</Typography>
								<Typography variant="h6">
									{formatNumber(progressData.current_max_ms)} ms
								</Typography>
							</div>
						</div>
					</Card>
				</Grid>

				{/* Speedometer - Center */}
				<Grid item xs={12} md={4}>
					<div className="flex flex-col items-center justify-center relative dashboard-speedometer h-full">
						{/* Parameter name at top */}
						<div className="mb-2 text-center">
							<Typography variant="h6" className="font-semibold">
								{progressData.parameter || ''}
							</Typography>
							<Typography variant="subtitle1" className="capitalize">
								{currentPhaseDisplayName}
							</Typography>
						</div>

						{/* Needle Speedometer */}
						<SpeedometerNeedle value={currentProgress} />

						{/* Iteration counter */}
						<Typography variant="body2" className="text-center mt-4">
							{progressData.iteration !== undefined
								? progressData.iteration.toLocaleString()
								: '0'}{' '}
							/{' '}
							{progressData.total !== undefined
								? progressData.total.toLocaleString()
								: '0'}{' '}
							iterations
						</Typography>
					</div>
				</Grid>

				{/* System Metrics - Right Side */}
				<Grid item xs={12} md={4}>
					<Card className="p-4 bg-card/50 dark:bg-[#21212180] dashboard-metrics h-full">
						<Typography variant="subtitle1" className="font-medium mb-3">
							System Metrics
						</Typography>

						<div className="space-y-4">
							<div className="metric-update">
								<Typography
									variant="body2"
									className="text-muted-foreground dark:text-muted-foreground-dark"
								>
									Current Throughput
								</Typography>
								<Typography variant="h6">
									{formatNumber(progressData.current_throughput_ops_sec)}{' '}
									ops/sec
								</Typography>
							</div>

							<div className="metric-update">
								<Typography
									variant="body2"
									className="text-muted-foreground dark:text-muted-foreground-dark"
								>
									Average Memory Usage
								</Typography>
								<Typography variant="h6">
									{formatNumber(progressData.current_mem_avg_kb)} KB
								</Typography>
							</div>

							<div className="metric-update">
								<Typography
									variant="body2"
									className="text-muted-foreground dark:text-muted-foreground-dark"
								>
									Peak Memory Usage
								</Typography>
								<Typography variant="h6">
									{formatNumber(progressData.current_mem_peak_kb)} KB
								</Typography>
							</div>

							{/* Show RSA specific metrics when available */}
							{progressData.public_key_bytes && (
								<div className="metric-update">
									<Typography
										variant="body2"
										className="text-muted-foreground dark:text-muted-foreground-dark"
									>
										Public Key Size
									</Typography>
									<Typography variant="h6">
										{progressData.public_key_bytes} bytes
									</Typography>
								</div>
							)}

							{progressData.secret_key_bytes && (
								<div className="metric-update">
									<Typography
										variant="body2"
										className="text-muted-foreground dark:text-muted-foreground-dark"
									>
										Secret Key Size
									</Typography>
									<Typography variant="h6">
										{progressData.secret_key_bytes} bytes
									</Typography>
								</div>
							)}

							{progressData.signature_bytes &&
								progressData.progress === 'sign' && (
									<div className="metric-update">
										<Typography
											variant="body2"
											className="text-muted-foreground dark:text-muted-foreground-dark"
										>
											Signature Size
										</Typography>
										<Typography variant="h6">
											{progressData.signature_bytes} bytes
										</Typography>
									</div>
								)}
						</div>
					</Card>
				</Grid>
			</Grid>
		</Card>
	);
};
