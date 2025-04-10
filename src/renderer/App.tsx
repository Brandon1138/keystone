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
import { Switch, Divider, ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/inter';

// Pages
import {
	HomePage,
	RunBenchmarkPage,
	RunEncryptionPage,
	VisualizationPage,
	ExportPage,
	RunQuantumWorkloadsPage,
	ScheduleJobsPage,
	CodexPage,
	ImportPage,
	SettingsPage,
} from './pages';

// Create theme based on mode
const createAppTheme = (mode: 'light' | 'dark') =>
	createTheme({
		typography: {
			fontFamily:
				'"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		},
		palette: {
			mode: mode,
			primary: {
				main: '#3b82f6', // blue-500, matching our primary in Tailwind
			},
			background: {
				default: mode === 'dark' ? '#212121' : '#FAFAFA',
				paper: mode === 'dark' ? '#212121' : '#E9E9E9',
			},
		},
		shape: {
			borderRadius: 8, // matching our rounded-lg in Tailwind
		},
		components: {
			MuiButton: {
				styleOverrides: {
					root: {
						textTransform: 'none', // shadcn style uses lowercase
					},
				},
			},
		},
	});

const App: React.FC = () => {
	// Start with dark mode by default
	const [lightMode, setLightMode] = useState(false);
	const theme = createAppTheme(lightMode ? 'light' : 'dark');

	// Initialize theme mode
	useEffect(() => {
		if (lightMode) {
			document.documentElement.classList.add('light');
			document.documentElement.classList.remove('dark');
			document.body.style.backgroundColor = '#FAFAFA';
		} else {
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
			document.body.style.backgroundColor = '#212121';
		}
		// Apply font family globally
		document.body.style.fontFamily =
			'"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
	}, [lightMode]);

	// Toggle light/dark mode
	const toggleTheme = () => {
		setLightMode(!lightMode);
	};

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Router>
				<div className="min-h-screen bg-background text-foreground relative overflow-hidden">
					{/* Background circles - only visible in dark mode */}
					{!lightMode && (
						<>
							<div className="bg-circle bg-circle-topleft"></div>
							<div className="bg-circle bg-circle-bottomright"></div>
						</>
					)}

					<div className="container mx-auto p-2 relative z-10">
						{/* Header */}
						<header className="mb-4">
							<div className="flex justify-between items-center">
								{/* Logo */}
								<div className="p-2">
									<img
										src={
											lightMode
												? './keystone_logo_light.svg'
												: './keystone_logo_dark.svg'
										}
										alt="Keystone Logo"
										className="h-40"
									/>
								</div>

								{/* Dark Mode Toggle */}
								<div className="flex items-center">
									<DarkModeIcon
										className={lightMode ? 'text-[#131313]' : 'text-[#FAFAFA]'}
									/>
									<Switch
										checked={!lightMode}
										onChange={toggleTheme}
										color="primary"
									/>
								</div>
							</div>

							{/* Introductory Text */}
							<p
								className="text-xl mb-2"
								style={{ color: lightMode ? '#000000' : '#FFFFFF' }}
							>
								A Multi-Backend Workbench for Post-Quantum Cryptography &
								Quantum Runtimes
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
								<Route path="/run-encryption" element={<RunEncryptionPage />} />
								<Route path="/visualization" element={<VisualizationPage />} />
								<Route path="/codex" element={<CodexPage />} />
								<Route path="/export" element={<ExportPage />} />
								<Route
									path="/quantum-workloads"
									element={<RunQuantumWorkloadsPage />}
								/>
								<Route path="/schedule-jobs" element={<ScheduleJobsPage />} />
								<Route path="/import" element={<ImportPage />} />
								<Route path="/settings" element={<SettingsPage />} />
							</Routes>
						</main>

						{/* Footer */}
						<footer className="mt-8 text-center text-sm text-gray-500">
							<p>Keystone - Version 1.0.0</p>
							<p>
								Running on Electron<span id="electron-version"></span>, Node
								<span id="node-version"></span>, and Chromium
								<span id="chrome-version"></span>
							</p>
						</footer>
					</div>
				</div>
			</Router>
		</ThemeProvider>
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
		{ text: 'Run Quantum Workloads', href: '/quantum-workloads' },
		{ text: 'Run Benchmark', href: '/run-benchmark' },
		{ text: 'Run Encryption', href: '/run-encryption' },
		{ text: 'Schedule Jobs', href: '/schedule-jobs' },
		{ text: 'Visualize', href: '/visualization' },
		{ text: 'Codex', href: '/codex' },
		{ text: 'Import', href: '/import' },
		{ text: 'Export', href: '/export' },
		{ text: 'Settings', href: '/settings' },
	];

	return (
		<nav
			className="flex flex-wrap mb-4 items-center justify-between border-b pb-2"
			style={{
				borderColor: lightMode ? '#E9E9E9' : 'var(--border-color, #2e2e3e)',
			}}
		>
			{navItems.map((item) => {
				const isActive =
					location.pathname === item.href ||
					(item.href === '/home' && location.pathname === '/');
				const linkClasses = isActive
					? 'text-primary font-medium px-2 text-sm sm:text-base sm:px-3 py-2 whitespace-nowrap'
					: lightMode
					? 'text-black hover:text-primary transition-colors px-2 text-sm sm:text-base sm:px-3 py-2 whitespace-nowrap'
					: 'text-foreground hover:text-primary transition-colors px-2 text-sm sm:text-base sm:px-3 py-2 whitespace-nowrap';

				return (
					<Link key={item.href} to={item.href} className={linkClasses}>
						{item.text}
					</Link>
				);
			})}
		</nav>
	);
};

export default App;
