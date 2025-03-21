import React from 'react';
import { BenchmarkRunner } from '../components/BenchmarkRunner';
import { SpeedIcon } from '../utils/algorithm-icons';

/**
 * Run Benchmark Page Component
 */
export const RunBenchmarkPage: React.FC = () => {
	return (
		<div className="container relative z-10 px-6 py-4">
			<div className="flex items-center mb-6">
				<div className="bg-primary/20 p-2 rounded-full mr-3">
					<SpeedIcon className="w-6 h-6 text-[#9747FF]" />
				</div>
				<h2 className="text-2xl font-bold">Run Benchmarks</h2>
			</div>
			<BenchmarkRunner />
		</div>
	);
};

export default RunBenchmarkPage;
