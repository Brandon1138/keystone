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
	// Start with dark mode by default
	const [lightMode, setLightMode] = useState(false);

	// Initialize theme mode
	useEffect(() => {
		if (lightMode) {
			document.documentElement.classList.add('light');
			document.documentElement.classList.remove('dark');
		} else {
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
		}
	}, [lightMode]);

	// Toggle light/dark mode
	const toggleTheme = () => {
		setLightMode(!lightMode);
	};

	return (
		<Router>
			<div className="min-h-screen bg-background text-foreground">
				<div className="container mx-auto p-4">
					{/* Header */}
					<header className="mb-6">
						<h1 className="text-2xl font-bold mb-2">
							Post-Quantum Cryptography Benchmark
						</h1>
						<p className="text-muted-foreground">
							A tool for benchmarking post-quantum cryptography algorithms
						</p>
					</header>

					{/* Navigation */}
					<Navigation toggleTheme={toggleTheme} lightMode={lightMode} />

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
					<footer className="mt-8 text-center text-muted-foreground text-sm">
						<p>PQC Benchmark Tool - Version 1.0.0</p>
						<p>
							Running on Electron <span id="electron-version"></span>, Node{' '}
							<span id="node-version"></span>, and Chromium{' '}
							<span id="chrome-version"></span>
						</p>
					</footer>
				</div>
			</div>
		</Router>
	);
};

// Navigation component
const Navigation: React.FC<{
	toggleTheme: () => void;
	lightMode: boolean;
}> = ({ toggleTheme, lightMode }) => {
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
		<nav className="flex flex-wrap gap-x-6 gap-y-2 mb-6 items-center border-b border-border pb-3">
			{navItems.map((item) => {
				const isActive =
					location.pathname === item.href ||
					(item.href === '/home' && location.pathname === '/');
				const linkClasses = isActive
					? 'text-primary font-medium'
					: 'text-foreground hover:text-primary transition-colors';

				return (
					<Link key={item.href} to={item.href} className={linkClasses}>
						{item.text}
					</Link>
				);
			})}

			{/* Theme toggle */}
			<button
				className="ml-auto btn btn-secondary"
				onClick={toggleTheme}
				aria-label="Toggle theme"
			>
				{lightMode ? (
					<DarkModeIcon className="h-5 w-5" />
				) : (
					<LightModeIcon className="h-5 w-5" />
				)}
			</button>
		</nav>
	);
};

export default App;
