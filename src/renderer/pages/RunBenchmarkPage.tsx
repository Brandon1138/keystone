import React from 'react';
import { BenchmarkRunner } from '../components/BenchmarkRunner';

/**
 * Run Benchmark Page Component
 */
export const RunBenchmarkPage: React.FC = () => {
	return (
		<div>
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
				<h2 className="text-xl font-semibold mb-4">Run Benchmark</h2>
				<p className="mb-4">
					Configure and run benchmarks for post-quantum and classical
					cryptography algorithms.
				</p>
				<p className="text-gray-600 dark:text-gray-400">
					Select an algorithm and security parameters below to start a
					benchmark.
				</p>
			</div>

			{/* Use the existing BenchmarkRunner component */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
				<BenchmarkRunner />
			</div>
		</div>
	);
};

export default RunBenchmarkPage;
