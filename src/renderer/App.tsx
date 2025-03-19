import React, { useState, useEffect } from 'react';
import {
	HashRouter as Router,
	Routes,
	Route,
	Link,
	useLocation,
} from 'react-router-dom';

// Pages
import {
	HomePage,
	RunBenchmarkPage,
	VisualizationPage,
	ComparePage,
	ExportPage,
} from './pages';

const App: React.FC = () => {
	const [darkMode, setDarkMode] = useState(true);

	// Initialize dark mode
	useEffect(() => {
		if (darkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [darkMode]);

	// Toggle dark mode
	const toggleDarkMode = () => {
		setDarkMode(!darkMode);
	};

	return (
		<Router>
			<div className="container mx-auto p-4">
				{/* Header */}
				<header className="mb-8">
					<h1 className="text-3xl font-bold mb-2">
						Post-Quantum Cryptography Benchmark
					</h1>
					<p className="text-gray-600 dark:text-gray-400">
						A tool for benchmarking post-quantum cryptography algorithms
					</p>
				</header>

				{/* Navigation */}
				<Navigation toggleDarkMode={toggleDarkMode} darkMode={darkMode} />

				{/* Main Content */}
				<main>
					<Routes>
						<Route path="/" element={<HomePage />} />
						<Route path="/home" element={<HomePage />} />
						<Route path="/run-benchmark" element={<RunBenchmarkPage />} />
						<Route path="/visualization" element={<VisualizationPage />} />
						<Route path="/compare" element={<ComparePage />} />
						<Route path="/export" element={<ExportPage />} />
					</Routes>
				</main>

				{/* Footer */}
				<footer className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
					<p>PQC Benchmark Tool - Version 1.0.0</p>
					<p>
						Running on Electron <span id="electron-version"></span>, Node{' '}
						<span id="node-version"></span>, and Chromium{' '}
						<span id="chrome-version"></span>
					</p>
				</footer>
			</div>
		</Router>
	);
};

// Navigation component
const Navigation: React.FC<{
	toggleDarkMode: () => void;
	darkMode: boolean;
}> = ({ toggleDarkMode, darkMode }) => {
	const location = useLocation();

	// Navigation items
	const navItems = [
		{ text: 'Home', href: '/home' },
		{ text: 'Run Benchmark', href: '/run-benchmark' },
		{ text: 'Visualization', href: '/visualization' },
		{ text: 'Compare Benchmarks', href: '/compare' },
		{ text: 'Export Data', href: '/export' },
	];

	return (
		<nav className="flex space-x-6 mb-8 items-center">
			{navItems.map((item) => {
				const isActive =
					location.pathname === item.href ||
					(item.href === '/home' && location.pathname === '/');
				const linkClasses = isActive
					? 'text-blue-600 dark:text-blue-400 font-medium'
					: 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400';

				return (
					<Link key={item.href} to={item.href} className={linkClasses}>
						{item.text}
					</Link>
				);
			})}

			{/* Dark mode toggle */}
			<button
				className="ml-auto text-gray-600 dark:text-gray-400"
				onClick={toggleDarkMode}
				aria-label="Toggle dark mode"
			>
				{darkMode ? '🌙' : '☀️'} Toggle Theme
			</button>
		</nav>
	);
};

export default App;
