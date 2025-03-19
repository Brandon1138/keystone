import React, { useState } from 'react';

/**
 * Compare Benchmarks Page Component
 */
export const ComparePage: React.FC = () => {
	const [activeMode, setActiveMode] = useState<string>('algorithm');

	return (
		<div>
			{/* Placeholder section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
				<h2 className="text-xl font-semibold mb-4">Compare Benchmarks</h2>
				<p className="mb-4">
					This page will allow you to compare different algorithms and security
					parameters side-by-side.
				</p>
				<p className="text-gray-500 dark:text-gray-400">
					Coming soon in Phase 6: Comparison Page
				</p>
			</div>

			{/* Mode selector */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
				<h3 className="text-lg font-medium mb-4">Comparison Mode</h3>
				<div className="flex space-x-4">
					<button
						className={`px-4 py-2 rounded-md ${
							activeMode === 'algorithm'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
						}`}
						onClick={() => setActiveMode('algorithm')}
					>
						Algorithm vs Algorithm
					</button>
					<button
						className={`px-4 py-2 rounded-md ${
							activeMode === 'classical'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
						}`}
						onClick={() => setActiveMode('classical')}
					>
						Post-Quantum vs Classical
					</button>
				</div>
			</div>

			{/* Comparison mockup area */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold">Comparison Preview</h2>
				</div>

				<div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-96 flex items-center justify-center">
					<div className="text-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-24 w-24 mx-auto text-gray-400 dark:text-gray-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
						<p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
							Comparison charts will appear here after selecting algorithms to
							compare
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ComparePage;
