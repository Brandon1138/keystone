import React, { useState } from 'react';

/**
 * Compare Benchmarks Page Component
 */
export const ComparePage: React.FC = () => {
	const [activeMode, setActiveMode] = useState<string>('algorithm');

	return (
		<div className="space-y-8">
			{/* Placeholder section */}
			<div className="bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm p-6">
				<h2 className="text-xl font-medium mb-4 text-foreground dark:text-foreground-dark">
					Compare Benchmarks
				</h2>
				<div className="space-y-3 text-muted-foreground dark:text-muted-foreground-dark">
					<p>
						This page will allow you to compare different algorithms and
						security parameters side-by-side.
					</p>
					<p>Coming soon in Phase 6: Comparison Page</p>
				</div>
			</div>

			{/* Mode selector */}
			<div className="bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm p-6">
				<h3 className="text-lg font-medium mb-4 text-foreground dark:text-foreground-dark">
					Comparison Mode
				</h3>
				<div className="flex space-x-4">
					<button
						className={`px-4 py-2 rounded-md ${
							activeMode === 'algorithm'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:bg-muted/80'
						} transition-colors`}
						onClick={() => setActiveMode('algorithm')}
					>
						Algorithm vs Algorithm
					</button>
					<button
						className={`px-4 py-2 rounded-md ${
							activeMode === 'classical'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:bg-muted/80'
						} transition-colors`}
						onClick={() => setActiveMode('classical')}
					>
						Post-Quantum vs Classical
					</button>
				</div>
			</div>

			{/* Comparison mockup area */}
			<div className="bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm p-6">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-medium text-foreground dark:text-foreground-dark">
						Comparison Preview
					</h2>
				</div>

				<div className="border border-border/40 dark:border-border-dark/40 rounded-lg p-4 h-96 flex items-center justify-center bg-muted/30 dark:bg-muted-dark/30">
					<div className="text-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-24 w-24 mx-auto text-muted-foreground/50 dark:text-muted-foreground-dark/50"
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
						<p className="mt-4 text-xl text-muted-foreground dark:text-muted-foreground-dark">
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
