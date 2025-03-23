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
import AssessmentIcon from '@mui/icons-material/Assessment';
import ComputerIcon from '@mui/icons-material/Computer';
import {
	getAlgorithmOperations,
	getOperationDisplayName,
} from '../../types/algorithm-types';

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

	// Get the expected operations for this algorithm
	const algorithmOperations = getAlgorithmOperations(benchmark.algorithm);

	// Function to get relevant metrics for a specific phase
	const getPhaseMetrics = (phase: string) => {
		const metrics: { [key: string]: number } = {};
		const phasePrefix = phase.toLowerCase();

		Object.entries(benchmark.metrics).forEach(([key, value]) => {
			const keyLower = key.toLowerCase();
			if (keyLower.startsWith(phasePrefix + '_')) {
				const metricName = key.substring(phasePrefix.length + 1);
				metrics[metricName] = value;
			} else if (keyLower.includes(phasePrefix)) {
				metrics[key] = value;
			}
		});

		if (Object.keys(metrics).length === 0) {
			if (phasePrefix in benchmark.metrics) {
				metrics['time_ms'] = benchmark.metrics[phasePrefix];
			}
		}
		return metrics;
	};

	// Get metrics for each possible operation and check if we have data
	const operationMetrics = algorithmOperations.reduce((acc, operation) => {
		acc[operation] = getPhaseMetrics(operation);
		return acc;
	}, {} as { [key: string]: { [key: string]: number } });

	const hasOperationData = algorithmOperations.reduce((acc, operation) => {
		acc[operation] = Object.keys(operationMetrics[operation]).length > 0;
		return acc;
	}, {} as { [key: string]: boolean });

	const formatNumber = (num: number | undefined, precision: number = 6) => {
		if (num === undefined || isNaN(num)) return '0';
		return num.toFixed(precision).replace(/\.?0+$/, '');
	};

	const formatMetricName = (name: string): string => {
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
					<h3
						className="text-xl font-medium"
						style={{
							color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
						}}
					>
						{title}
					</h3>
				</div>
				<div className="space-y-3">
					{Object.entries(metrics).map(([key, value]) => (
						<div key={key} className="metric-update">
							<div className="text-sm" style={{ color: '#999999' }}>
								{formatMetricName(key)}
							</div>
							<div
								className="text-lg font-medium"
								style={{
									color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
								}}
							>
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
							</div>
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
						icon={<AssessmentIcon style={{ color: '#9747FF' }} />}
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
						icon={<ComputerIcon style={{ color: '#9747FF' }} />}
					/>
				</div>
			</div>
		);
	};

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

	return (
		<div className="space-y-[20px]">
			{benchmark.status === 'failed' && benchmark.error && (
				<div className="mt-2 p-4 bg-red-950/20 border border-red-800/40 rounded-md text-red-400">
					Error: {benchmark.error}
				</div>
			)}
			{benchmark.status === 'completed' && (
				<div className="space-y-[20px]">
					{/* Dynamically render phase rows based on available operation data */}
					{algorithmOperations.map(
						(operation) =>
							hasOperationData[operation] && (
								<PhaseRow
									key={operation}
									displayName={getOperationDisplayName(
										benchmark.algorithm,
										operation
									)}
									performanceMetrics={
										organizeMetrics(operationMetrics[operation])
											.performanceMetrics
									}
									systemMetrics={
										organizeMetrics(operationMetrics[operation]).systemMetrics
									}
								/>
							)
					)}

					{/* Show notice if no operation data is available */}
					{algorithmOperations.every(
						(operation) => !hasOperationData[operation]
					) && (
						<div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-md text-amber-400">
							No detailed metrics available for this benchmark. Only aggregated
							data was recorded.
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
