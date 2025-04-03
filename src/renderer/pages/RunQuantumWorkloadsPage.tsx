import React from 'react';
import { QuantumWorkloadRunner } from '../components/QuantumWorkloadRunner';

/**
 * Run Quantum Workloads Page Component
 */
export const RunQuantumWorkloadsPage: React.FC = () => {
	return (
		<div className="container relative z-10 px-6 py-4">
			<QuantumWorkloadRunner />
		</div>
	);
};

export default RunQuantumWorkloadsPage;
