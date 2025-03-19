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
		<div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
			<div className="flex justify-between items-start">
				<div className="flex items-center">
					<div className={`mr-2 ${categoryColor}`}>{algorithmInfo.icon}</div>
					<div>
						<h4 className="font-medium">
							{algorithmInfo.displayName} ({benchmark.securityParam})
						</h4>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{new Date(benchmark.timestamp).toLocaleString()}
						</p>
						{!compact && (
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Category: {algorithmInfo.category}
							</p>
						)}
					</div>
				</div>
				<span
					className={`px-2 py-1 rounded-full text-xs ${
						benchmark.status === 'completed'
							? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
							: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
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
								compact
									? 'text-sm'
									: 'text-base p-2 bg-gray-50 dark:bg-gray-700 rounded'
							}`}
						>
							<span className="capitalize">{key}: </span>
							<span className="font-medium">{value} ms</span>
						</div>
					))}
				</div>
			) : (
				benchmark.status === 'completed' && (
					<div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
						No metrics data available
					</div>
				)
			)}

			{benchmark.status === 'failed' && benchmark.error && (
				<div className="mt-2 text-sm text-red-600 dark:text-red-400">
					Error: {benchmark.error}
				</div>
			)}
		</div>
	);
};
