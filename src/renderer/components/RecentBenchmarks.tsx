import React, { useEffect, useState } from 'react';
import { BenchmarkResult } from '../../types/benchmark';
import { benchmarkStoreUtils } from '../utils/benchmark-store-utils';
import { BenchmarkResultCard } from './BenchmarkResultCard';

export const RecentBenchmarks: React.FC = () => {
	const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadBenchmarks = async () => {
			try {
				setLoading(true);
				const results = await benchmarkStoreUtils.getAllBenchmarks();
				// Sort by timestamp (newest first)
				const sortedResults = [...results].sort(
					(a, b) =>
						new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				);
				// Take only the 5 most recent benchmarks
				setBenchmarks(sortedResults.slice(0, 5));
			} catch (error) {
				console.error('Failed to load benchmarks:', error);
			} finally {
				setLoading(false);
			}
		};

		loadBenchmarks();
	}, []);

	if (loading) {
		return (
			<div className="p-4">
				<div className="animate-pulse flex space-x-4">
					<div className="flex-1 space-y-4 py-1">
						<div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
						<div className="space-y-2">
							<div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
							<div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (benchmarks.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500 dark:text-gray-400">
				No benchmark data available. Run your first benchmark to see results
				here.
			</div>
		);
	}

	return (
		<div className="p-4">
			<h3 className="text-xl font-semibold mb-4">Recent Benchmarks</h3>
			<div className="space-y-4">
				{benchmarks.map((benchmark) => (
					<BenchmarkResultCard
						key={benchmark.id}
						benchmark={benchmark}
						compact
					/>
				))}
			</div>
		</div>
	);
};
