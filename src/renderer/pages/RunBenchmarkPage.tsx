import React from 'react';
import { BenchmarkRunner } from '../components/BenchmarkRunner';

/**
 * Run Benchmark Page Component
 */
export const RunBenchmarkPage: React.FC = () => {
	return (
		<div className="container relative z-10 px-6 py-4">
			<BenchmarkRunner />
		</div>
	);
};

export default RunBenchmarkPage;
