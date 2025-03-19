import React, { useState } from 'react';

/**
 * Visualization Page Component
 */
export const VisualizationPage: React.FC = () => {
	const [activeChart, setActiveChart] = useState<string>('line');

	return (
		<div>
			{/* Placeholder section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
				<h2 className="text-xl font-semibold mb-4">Visualization</h2>
				<p className="mb-4">
					This page will allow you to visualize benchmark results with charts
					and graphs.
				</p>
				<p className="text-gray-500 dark:text-gray-400">
					Coming soon in Phase 5: Visualization Page
				</p>
			</div>

			{/* Chart mockup area */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold">Chart Preview</h2>
					<div className="flex space-x-4">
						<button
							className={`px-3 py-1 rounded-md ${
								activeChart === 'line'
									? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
									: 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900 dark:hover:text-blue-200'
							}`}
							onClick={() => setActiveChart('line')}
						>
							Line Chart
						</button>
						<button
							className={`px-3 py-1 rounded-md ${
								activeChart === 'bar'
									? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
									: 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900 dark:hover:text-blue-200'
							}`}
							onClick={() => setActiveChart('bar')}
						>
							Bar Chart
						</button>
						<button
							className={`px-3 py-1 rounded-md ${
								activeChart === 'scatter'
									? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
									: 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900 dark:hover:text-blue-200'
							}`}
							onClick={() => setActiveChart('scatter')}
						>
							Scatter Plot
						</button>
					</div>
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
							Charts will appear here after running benchmarks
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default VisualizationPage;
