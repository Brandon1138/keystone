import React from 'react';
import { BenchmarkRunner } from '../components/BenchmarkRunner';

/**
 * Run Benchmark Page Component
 */
export const RunBenchmarkPage: React.FC = () => {
	return (
		<div className="space-y-8">
			<div className="bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm p-6">
				<h2 className="text-xl font-medium mb-4 text-foreground dark:text-foreground-dark">
					Run Benchmark
				</h2>
				<div className="space-y-3 text-muted-foreground dark:text-muted-foreground-dark">
					<p>
						Configure and run benchmarks for post-quantum and classical
						cryptography algorithms.
					</p>
					<p>
						Select an algorithm and security parameters below to start a
						benchmark.
					</p>
				</div>
			</div>

			{/* Use the existing BenchmarkRunner component */}
			<div className="bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm">
				<BenchmarkRunner />
			</div>
		</div>
	);
};

export default RunBenchmarkPage;
