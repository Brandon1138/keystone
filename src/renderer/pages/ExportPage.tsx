import React, { useState } from 'react';

/**
 * Export Data Page Component
 */
export const ExportPage: React.FC = () => {
	const [selectedFormat, setSelectedFormat] = useState<string>('csv');

	return (
		<div className="space-y-8">
			{/* Placeholder section */}
			<div className="bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm p-6">
				<h2 className="text-xl font-medium mb-4 text-foreground dark:text-foreground-dark">
					Export Data
				</h2>
				<div className="space-y-3 text-muted-foreground dark:text-muted-foreground-dark">
					<p>
						This page will allow you to export benchmark results in various
						formats.
					</p>
					<p>Coming soon in Phase 7: Export Data Page</p>
				</div>
			</div>

			{/* Export options mockup */}
			<div className="bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm p-6">
				<h3 className="text-lg font-medium mb-4 text-foreground dark:text-foreground-dark">
					Export Format
				</h3>
				<div className="flex space-x-4 mb-6">
					<button
						className={`px-4 py-2 rounded-md transition-colors ${
							selectedFormat === 'csv'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:bg-muted/80'
						}`}
						onClick={() => setSelectedFormat('csv')}
					>
						CSV
					</button>
					<button
						className={`px-4 py-2 rounded-md transition-colors ${
							selectedFormat === 'json'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:bg-muted/80'
						}`}
						onClick={() => setSelectedFormat('json')}
					>
						JSON
					</button>
					<button
						className={`px-4 py-2 rounded-md transition-colors ${
							selectedFormat === 'pdf'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:bg-muted/80'
						}`}
						onClick={() => setSelectedFormat('pdf')}
					>
						PDF
					</button>
				</div>

				<div className="mb-6">
					<h3 className="text-lg font-medium mb-4 text-foreground dark:text-foreground-dark">
						Select Benchmarks to Export
					</h3>
					<div className="border border-border/40 dark:border-border-dark/40 rounded-lg p-4 max-h-72 overflow-y-auto bg-muted/30 dark:bg-muted-dark/30">
						<p className="text-muted-foreground dark:text-muted-foreground-dark text-center py-8">
							No benchmark data available to export.
							<br />
							Run some benchmarks first.
						</p>
					</div>
				</div>

				<button
					className="px-4 py-2 bg-primary/50 text-primary-foreground rounded-md hover:bg-primary/60 opacity-50 cursor-not-allowed transition-colors"
					disabled
				>
					Export Selected
				</button>
			</div>
		</div>
	);
};

export default ExportPage;
