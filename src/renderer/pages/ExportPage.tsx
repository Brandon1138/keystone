import React, { useState } from 'react';

/**
 * Export Data Page Component
 */
export const ExportPage: React.FC = () => {
	const [selectedFormat, setSelectedFormat] = useState<string>('csv');

	return (
		<div>
			{/* Placeholder section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
				<h2 className="text-xl font-semibold mb-4">Export Data</h2>
				<p className="mb-4">
					This page will allow you to export benchmark results in various
					formats.
				</p>
				<p className="text-gray-500 dark:text-gray-400">
					Coming soon in Phase 7: Export Data Page
				</p>
			</div>

			{/* Export options mockup */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
				<h3 className="text-lg font-medium mb-4">Export Format</h3>
				<div className="flex space-x-4 mb-6">
					<button
						className={`px-4 py-2 rounded-md ${
							selectedFormat === 'csv'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
						} hover:bg-blue-700`}
						onClick={() => setSelectedFormat('csv')}
					>
						CSV
					</button>
					<button
						className={`px-4 py-2 rounded-md ${
							selectedFormat === 'json'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
						} hover:bg-gray-300 dark:hover:bg-gray-600`}
						onClick={() => setSelectedFormat('json')}
					>
						JSON
					</button>
					<button
						className={`px-4 py-2 rounded-md ${
							selectedFormat === 'pdf'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
						} hover:bg-gray-300 dark:hover:bg-gray-600`}
						onClick={() => setSelectedFormat('pdf')}
					>
						PDF
					</button>
				</div>

				<div className="mb-6">
					<h3 className="text-lg font-medium mb-4">
						Select Benchmarks to Export
					</h3>
					<div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-72 overflow-y-auto bg-gray-50 dark:bg-gray-900">
						<p className="text-gray-500 dark:text-gray-400 text-center py-8">
							No benchmark data available to export.
							<br />
							Run some benchmarks first.
						</p>
					</div>
				</div>

				<button
					className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 opacity-50 cursor-not-allowed"
					disabled
				>
					Export Selected
				</button>
			</div>
		</div>
	);
};

export default ExportPage;
