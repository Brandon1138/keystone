import React from 'react';
import { Typography, Grid } from '@mui/material';
import { BenchmarkResult } from '../../types/benchmark';
import {
	getAlgorithmInfo,
	getCategoryColorClass,
} from '../utils/algorithm-categories';
import { Card } from './ui/card';
import './dashboard.css';

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

	// Component to render a phase dashboard
	const PhaseResultDashboard = ({
		phaseName,
		phaseMetrics,
		displayName,
	}: {
		phaseName: string;
		phaseMetrics: { [key: string]: number };
		displayName: string;
	}) => {
		// Organize metrics by category
		const performanceMetrics: { [key: string]: number } = {};
		const systemMetrics: { [key: string]: number } = {};

		// Categorize metrics
		Object.entries(phaseMetrics).forEach(([key, value]) => {
			const keyLower = key.toLowerCase();

			// First check if it's explicitly a memory or system metric
			if (
				keyLower.includes('mem') ||
				keyLower.includes('kb') ||
				keyLower.includes('mb') ||
				keyLower.includes('ops') ||
				keyLower.includes('throughput')
			) {
				// This is a system metric
				systemMetrics[key] = value;
			}
			// Then check if it's a performance metric
			else if (
				keyLower.includes('avg') ||
				keyLower.includes('min') ||
				keyLower.includes('max') ||
				keyLower.includes('time') ||
				keyLower.includes('ms')
			) {
				// Only add to performance if not already identified as system
				performanceMetrics[key] = value;
			} else {
				// Default to performance metrics for uncategorized
				performanceMetrics[key] = value;
			}
		});

		// Render a static speedometer with the value at 100%
		const StaticSpeedometer = () => (
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

		return (
			<Card className="p-4 mb-4 bg-card dark:bg-card-dark dashboard-phase">
				<div className="flex items-center mb-2">
					<Typography variant="h6" className="capitalize">
						{displayName}
					</Typography>
				</div>

				<Grid container spacing={3}>
					{compact ? (
						// Compact view - just basic metrics
						<Grid item xs={12}>
							<div className="space-y-2">
								{Object.entries(performanceMetrics)
									.slice(0, 2)
									.map(([key, value]) => (
										<Typography key={key} variant="body2">
											{formatMetricName(key)}: {formatNumber(value)}{' '}
											{key.includes('time') || key.includes('ms') ? 'ms' : ''}
										</Typography>
									))}
							</div>
						</Grid>
					) : (
						// Full view - all metrics and speedometer
						<>
							{/* Speedometer - Center */}
							<Grid item xs={12} md={4}>
								<div className="flex flex-col items-center justify-center">
									{/* Static Speedometer */}
									<StaticSpeedometer />
									<Typography variant="body2" className="mt-2 text-center">
										Completed
									</Typography>
								</div>
							</Grid>

							{/* Performance Metrics - Left */}
							<Grid item xs={12} md={4}>
								<div className="space-y-2">
									<Typography variant="subtitle2" className="font-medium">
										Performance
									</Typography>
									{Object.entries(performanceMetrics).map(([key, value]) => (
										<Typography
											key={key}
											variant="body2"
											className="text-muted-foreground"
										>
											{formatMetricName(key)}: {formatNumber(value)}{' '}
											{key.includes('time') || key.includes('ms') ? 'ms' : ''}
										</Typography>
									))}
									{Object.keys(performanceMetrics).length === 0 && (
										<Typography
											variant="body2"
											className="text-muted-foreground italic"
										>
											No performance metrics available
										</Typography>
									)}
								</div>
							</Grid>

							{/* System Metrics - Right */}
							<Grid item xs={12} md={4}>
								<div className="space-y-2">
									<Typography variant="subtitle2" className="font-medium">
										System
									</Typography>
									{Object.entries(systemMetrics).map(([key, value]) => (
										<Typography
											key={key}
											variant="body2"
											className="text-muted-foreground"
										>
											{formatMetricName(key)}: {formatNumber(value)}{' '}
											{key.includes('ops')
												? 'ops/sec'
												: key.includes('kb')
												? 'KB'
												: key.includes('mb')
												? 'MB'
												: ''}
										</Typography>
									))}
									{Object.keys(systemMetrics).length === 0 && (
										<Typography
											variant="body2"
											className="text-muted-foreground italic"
										>
											No system metrics available
										</Typography>
									)}
								</div>
							</Grid>
						</>
					)}
				</Grid>
			</Card>
		);
	};

	return (
		<div className="space-y-4">
			{/* Header with algorithm info */}
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center">
					<div className={`mr-2 ${categoryColor}`}>{algorithmInfo.icon}</div>
					<div>
						<h3 className="text-xl font-bold">
							{algorithmInfo.displayName} ({benchmark.securityParam})
						</h3>
						<p className="text-sm text-muted-foreground">
							{new Date(benchmark.timestamp).toLocaleString()}
						</p>
					</div>
				</div>
				<span
					className={`px-3 py-1 rounded-full text-sm ${
						benchmark.status === 'completed'
							? 'bg-green-800/20 text-green-400'
							: 'bg-red-800/20 text-red-400'
					}`}
				>
					{benchmark.status}
				</span>
			</div>

			{/* If benchmark failed, show error */}
			{benchmark.status === 'failed' && benchmark.error && (
				<div className="mt-2 p-4 bg-red-950/20 border border-red-800/40 rounded-md text-red-400">
					Error: {benchmark.error}
				</div>
			)}

			{/* If completed, show phase dashboards */}
			{benchmark.status === 'completed' && (
				<div className="space-y-4">
					{hasKeygenData && (
						<PhaseResultDashboard
							phaseName="keygen"
							phaseMetrics={keygenMetrics}
							displayName="Key Generation"
						/>
					)}

					{hasEncapsData && (
						<PhaseResultDashboard
							phaseName="encaps"
							phaseMetrics={encapsMetrics}
							displayName="Encapsulation"
						/>
					)}

					{hasDecapsData && (
						<PhaseResultDashboard
							phaseName="decaps"
							phaseMetrics={decapsMetrics}
							displayName="Decapsulation"
						/>
					)}

					{/* If no phase data is found */}
					{!hasKeygenData && !hasEncapsData && !hasDecapsData && (
						<div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-md text-amber-400">
							No detailed metrics available for this benchmark. Only aggregated
							data was recorded.
							{/* Show raw metrics if available */}
							{Object.keys(benchmark.metrics).length > 0 && (
								<div className="mt-4 grid grid-cols-2 gap-2">
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
