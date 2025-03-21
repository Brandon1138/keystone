import React from 'react';
import { Typography, Grid } from '@mui/material';
import { BenchmarkResult } from '../../types/benchmark';
import {
	getAlgorithmInfo,
	getCategoryColorClass,
} from '../utils/algorithm-categories';
import { Card } from './ui/card';
import './dashboard.css';
import { gsap } from 'gsap';
import { useTheme } from '@mui/material/styles';
import { Speedometer } from './Speedometer';
import {
	SpeedIcon,
	PerformanceIcon,
	ComputerIcon,
} from '../utils/algorithm-icons';

interface BenchmarkResultCardProps {
	benchmark: BenchmarkResult;
	compact?: boolean;
}

export const BenchmarkResultCard: React.FC<BenchmarkResultCardProps> = ({
	benchmark,
	compact = false,
}) => {
	const algorithmInfo = getAlgorithmInfo(benchmark.algorithm);
	const categoryColor = getCategoryColorClass(algorithmInfo.category);
	const theme = useTheme();

	// Function to get relevant metrics for a specific phase
	const getPhaseMetrics = (phase: string) => {
		const metrics: { [key: string]: number } = {};
		const phasePrefix = phase.toLowerCase();

		// Extract all metrics that start with the phase name or contain the phase name
		Object.entries(benchmark.metrics).forEach(([key, value]) => {
			const keyLower = key.toLowerCase();

			// Check if the key starts with the phase prefix
			if (keyLower.startsWith(phasePrefix + '_')) {
				// Extract the metric name without the phase prefix
				const metricName = key.substring(phasePrefix.length + 1);
				metrics[metricName] = value;
			}
			// Also check for metrics that contain the phase name (e.g., avg_keygen, keygen_time)
			else if (keyLower.includes(phasePrefix)) {
				// Use the full key as is - we'll normalize the display later
				metrics[key] = value;
			}
		});

		// For metrics not found in structured format, look for common patterns
		if (Object.keys(metrics).length === 0) {
			// Check if we have the phase as a direct metric
			if (phasePrefix in benchmark.metrics) {
				metrics['time_ms'] = benchmark.metrics[phasePrefix];
			}
		}

		return metrics;
	};

	// Get metrics for each phase
	const keygenMetrics = getPhaseMetrics('keygen');
	const encapsMetrics = getPhaseMetrics('encaps');
	const decapsMetrics = getPhaseMetrics('decaps');

	// Check if each phase has data
	const hasKeygenData = Object.keys(keygenMetrics).length > 0;
	const hasEncapsData = Object.keys(encapsMetrics).length > 0;
	const hasDecapsData = Object.keys(decapsMetrics).length > 0;

	// Helper to format numbers with fixed precision
	const formatNumber = (num: number | undefined, precision: number = 6) => {
		if (num === undefined || isNaN(num)) return '0';
		return num.toFixed(precision).replace(/\.?0+$/, '');
	};

	// Helper to format metric names for display
	const formatMetricName = (name: string): string => {
		// Replace underscores with spaces and capitalize the first letter of each word
		return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	};

	// Component to render an individual metric card
	const MetricCard = ({
		title,
		metrics,
		icon,
	}: {
		title: string;
		metrics: { [key: string]: number };
		icon: React.ReactNode;
	}) => {
		return (
			<Card
				className={`p-4 h-full ${
					theme.palette.mode === 'dark' ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-3 gap-2">
					{icon}
					<Typography variant="subtitle1" className="font-medium text-lg">
						{title}
					</Typography>
				</div>
				<div className="space-y-3">
					{Object.entries(metrics).map(([key, value]) => (
						<div key={key} className="metric-update">
							<Typography variant="body2" className="text-muted-foreground">
								{formatMetricName(key)}
							</Typography>
							<Typography variant="h6">
								{formatNumber(value)}{' '}
								{key.includes('ops')
									? 'ops/sec'
									: key.includes('kb') || key.includes('KB')
									? 'KB'
									: key.includes('mb') || key.includes('MB')
									? 'MB'
									: key.includes('time') || key.includes('ms')
									? 'ms'
									: ''}
							</Typography>
						</div>
					))}
					{Object.keys(metrics).length === 0 && (
						<Typography
							variant="body2"
							className="text-muted-foreground italic"
						>
							No metrics available
						</Typography>
					)}
				</div>
			</Card>
		);
	};

	// Component to render a phase row with three cards
	const PhaseRow = ({
		displayName,
		performanceMetrics,
		systemMetrics,
	}: {
		displayName: string;
		performanceMetrics: { [key: string]: number };
		systemMetrics: { [key: string]: number };
	}) => {
		return (
			<div className="mb-5">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-[20px]">
					<MetricCard
						title="Performance Metrics"
						metrics={performanceMetrics}
						icon={<PerformanceIcon className="w-6 h-6 text-[#9747FF]" />}
					/>
					<Card
						className={`p-4 h-full flex flex-col items-center justify-center ${
							theme.palette.mode === 'dark' ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<Speedometer
							value={100}
							isRunning={false}
							label={displayName}
							algorithm={benchmark.algorithm}
							securityParam={benchmark.securityParam}
						/>
					</Card>
					<MetricCard
						title="System Metrics"
						metrics={systemMetrics}
						icon={<ComputerIcon className="w-6 h-6 text-[#9747FF]" />}
					/>
				</div>
			</div>
		);
	};

	// Organize metrics by category for each phase
	const organizeMetrics = (phaseMetrics: { [key: string]: number }) => {
		const performanceMetrics: { [key: string]: number } = {};
		const systemMetrics: { [key: string]: number } = {};

		Object.entries(phaseMetrics).forEach(([key, value]) => {
			const keyLower = key.toLowerCase();

			if (
				keyLower.includes('mem') ||
				keyLower.includes('kb') ||
				keyLower.includes('mb') ||
				keyLower.includes('ops') ||
				keyLower.includes('throughput')
			) {
				systemMetrics[key] = value;
			} else if (
				keyLower.includes('avg') ||
				keyLower.includes('min') ||
				keyLower.includes('max') ||
				keyLower.includes('time') ||
				keyLower.includes('ms')
			) {
				performanceMetrics[key] = value;
			} else {
				performanceMetrics[key] = value;
			}
		});

		return { performanceMetrics, systemMetrics };
	};

	// Extract organized metrics for each phase
	const {
		performanceMetrics: keygenPerformanceMetrics,
		systemMetrics: keygenSystemMetrics,
	} = organizeMetrics(keygenMetrics);
	const {
		performanceMetrics: encapsPerformanceMetrics,
		systemMetrics: encapsSystemMetrics,
	} = organizeMetrics(encapsMetrics);
	const {
		performanceMetrics: decapsPerformanceMetrics,
		systemMetrics: decapsSystemMetrics,
	} = organizeMetrics(decapsMetrics);

	return (
		<div className="space-y-[20px]">
			{/* If benchmark failed, show error */}
			{benchmark.status === 'failed' && benchmark.error && (
				<div className="mt-2 p-4 bg-red-950/20 border border-red-800/40 rounded-md text-red-400">
					Error: {benchmark.error}
				</div>
			)}

			{/* If completed, show phase rows in the new layout */}
			{benchmark.status === 'completed' && (
				<div className="space-y-[20px]">
					{hasKeygenData && (
						<PhaseRow
							displayName="Key Generation"
							performanceMetrics={keygenPerformanceMetrics}
							systemMetrics={keygenSystemMetrics}
						/>
					)}

					{hasEncapsData && (
						<PhaseRow
							displayName="Encapsulation"
							performanceMetrics={encapsPerformanceMetrics}
							systemMetrics={encapsSystemMetrics}
						/>
					)}

					{hasDecapsData && (
						<PhaseRow
							displayName="Decapsulation"
							performanceMetrics={decapsPerformanceMetrics}
							systemMetrics={decapsSystemMetrics}
						/>
					)}

					{/* If no phase data is found */}
					{!hasKeygenData && !hasEncapsData && !hasDecapsData && (
						<div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-md text-amber-400">
							No detailed metrics available for this benchmark. Only aggregated
							data was recorded.
							{/* Show raw metrics if available */}
							{Object.keys(benchmark.metrics).length > 0 && (
								<div className="mt-4 grid grid-cols-2 gap-5">
									{Object.entries(benchmark.metrics).map(([key, value]) => (
										<div key={key} className="text-sm">
											<span className="capitalize">
												{formatMetricName(key)}:{' '}
											</span>
											<span className="font-medium">{value} ms</span>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
