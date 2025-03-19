import React from 'react';
import { Link } from 'react-router-dom';

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
			icon: '🚀',
			link: '/run-benchmark',
		},
		{
			title: 'Visualize Results',
			description:
				'View detailed charts and graphs of your benchmark results, comparing different metrics.',
			icon: '📊',
			link: '/visualization',
		},
		{
			title: 'Compare Algorithms',
			description:
				'Compare post-quantum algorithms against each other or against classical algorithms.',
			icon: '⚖️',
			link: '/compare',
		},
	];

	return (
		<div>
			{/* Welcome section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
				<h2 className="text-xl font-semibold mb-4">
					Welcome to PQC Benchmark Tool
				</h2>
				<p className="mb-4">
					This application allows you to run, visualize and compare benchmarks
					for post-quantum cryptography algorithms.
				</p>
				<p>
					To get started, go to the "Run Benchmark" page and select an
					algorithm.
				</p>
			</div>

			{/* Quick features overview section */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				{featureCards.map((card, index) => (
					<div
						key={index}
						className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200"
					>
						<div className="text-3xl mb-4">{card.icon}</div>
						<h3 className="text-lg font-semibold mb-2">{card.title}</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							{card.description}
						</p>
						<Link
							to={card.link}
							className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
						>
							Get started →
						</Link>
					</div>
				))}
			</div>
		</div>
	);
};

export default HomePage;
