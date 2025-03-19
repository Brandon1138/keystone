import React from 'react';
import { Link } from 'react-router-dom';
import SpeedIcon from '@mui/icons-material/Speed';
import InsightsIcon from '@mui/icons-material/Insights';
import CompareIcon from '@mui/icons-material/Compare';

/**
 * Home Page Component
 */
export const HomePage: React.FC = () => {
	// Feature cards data
	const featureCards = [
		{
			title: 'Run Benchmarks',
			description:
				'Execute benchmarks for Kyber, Dilithium, McEliece, and classic algorithms like RSA and ECC.',
			icon: <SpeedIcon />,
			link: '/run-benchmark',
		},
		{
			title: 'Visualize Results',
			description:
				'View detailed charts and graphs of your benchmark results, comparing different metrics.',
			icon: <InsightsIcon />,
			link: '/visualization',
		},
		{
			title: 'Compare Algorithms',
			description:
				'Compare post-quantum algorithms against each other or against classical algorithms.',
			icon: <CompareIcon />,
			link: '/compare',
		},
	];

	return (
		<div className="space-y-8">
			{/* Welcome section */}
			<div className="bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm p-6">
				<h2 className="text-xl font-medium mb-4 text-foreground dark:text-foreground-dark">
					Welcome to PQC Benchmark Tool
				</h2>
				<div className="space-y-3 text-muted-foreground dark:text-muted-foreground-dark">
					<p>
						This application allows you to run, visualize and compare benchmarks
						for post-quantum cryptography algorithms.
					</p>
					<p>
						To get started, go to the "Run Benchmark" page and select an
						algorithm.
					</p>
				</div>
			</div>

			{/* Feature cards section */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{featureCards.map((card, index) => (
					<div
						key={index}
						className="group bg-card dark:bg-card-dark rounded-xl border border-border/40 dark:border-border-dark/40 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
					>
						<div className="p-6">
							<div className="flex items-center gap-4 mb-4">
								<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
									{card.icon}
								</div>
								<h3 className="text-lg font-medium text-foreground dark:text-foreground-dark">
									{card.title}
								</h3>
							</div>
							<p className="text-sm text-muted-foreground dark:text-muted-foreground-dark mb-6 line-clamp-3">
								{card.description}
							</p>
							<Link
								to={card.link}
								className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
							>
								Get started
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
								>
									<path d="M5 12h14"></path>
									<path d="m12 5 7 7-7 7"></path>
								</svg>
							</Link>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default HomePage;
