import React, { useState, useEffect } from 'react';
import {
	HashRouter as Router,
	Routes,
	Route,
	Link,
	useLocation,
} from 'react-router-dom';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

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
				<header className="mb-6">
					<h1 className="text-2xl font-bold mb-2 text-foreground dark:text-foreground-dark">
						Post-Quantum Cryptography Benchmark
					</h1>
					<p className="text-muted-foreground dark:text-muted-foreground-dark">
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
				<footer className="mt-8 text-center text-muted-foreground dark:text-muted-foreground-dark text-sm">
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
		<nav className="flex flex-wrap gap-x-6 gap-y-2 mb-6 items-center border-b border-border dark:border-border-dark pb-3">
			{navItems.map((item) => {
				const isActive =
					location.pathname === item.href ||
					(item.href === '/home' && location.pathname === '/');
				const linkClasses = isActive
					? 'text-primary font-medium'
					: 'text-foreground dark:text-foreground-dark hover:text-primary dark:hover:text-primary';

				return (
					<Link key={item.href} to={item.href} className={linkClasses}>
						{item.text}
					</Link>
				);
			})}

			{/* Dark mode toggle */}
			<button
				className="ml-auto p-2 rounded-md bg-muted dark:bg-muted-dark text-foreground dark:text-foreground-dark hover:bg-muted/80 dark:hover:bg-muted-dark/80 transition-colors"
				onClick={toggleDarkMode}
				aria-label="Toggle dark mode"
			>
				{darkMode ? (
					<LightModeIcon className="h-5 w-5" />
				) : (
					<DarkModeIcon className="h-5 w-5" />
				)}
			</button>
		</nav>
	);
};

export default App;
