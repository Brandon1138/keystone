import React from 'react';
import { BenchmarkResult } from '../../types/benchmark';
import {
	getAlgorithmInfo,
	getCategoryColorClass,
} from '../utils/algorithm-categories';

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

	return (
		<div className="card hover:shadow-md">
			<div className="flex justify-between items-start">
				<div className="flex items-center">
					<div className={`mr-2 ${categoryColor}`}>{algorithmInfo.icon}</div>
					<div>
						<h4 className="font-medium">
							{algorithmInfo.displayName} ({benchmark.securityParam})
						</h4>
						<p className="text-sm text-muted-foreground">
							{new Date(benchmark.timestamp).toLocaleString()}
						</p>
						{!compact && (
							<p className="text-xs text-muted-foreground mt-1">
								Category: {algorithmInfo.category}
							</p>
						)}
					</div>
				</div>
				<span
					className={`px-2 py-1 rounded-full text-xs ${
						benchmark.status === 'completed'
							? 'bg-green-800/20 text-green-400'
							: 'bg-red-800/20 text-red-400'
					}`}
				>
					{benchmark.status}
				</span>
			</div>

			{benchmark.status === 'completed' &&
			benchmark.metrics &&
			Object.keys(benchmark.metrics).length > 0 ? (
				<div
					className={`mt-3 ${
						compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-3 gap-3'
					}`}
				>
					{Object.entries(benchmark.metrics).map(([key, value]) => (
						<div
							key={key}
							className={`${
								compact ? 'text-sm' : 'text-base p-2 bg-muted rounded-md'
							}`}
						>
							<span className="capitalize">{key}: </span>
							<span className="font-medium">{value} ms</span>
						</div>
					))}
				</div>
			) : (
				benchmark.status === 'completed' && (
					<div className="mt-2 text-sm text-amber-400">
						No metrics data available
					</div>
				)
			)}

			{benchmark.status === 'failed' && benchmark.error && (
				<div className="mt-2 text-sm text-red-400">
					Error: {benchmark.error}
				</div>
			)}
		</div>
	);
};
