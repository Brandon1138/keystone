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
import { BackgroundContext } from './pages/HomePage';
import { gsap } from 'gsap';
import { SettingsProvider, useSettings } from './context/SettingsContext';

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

// Components
import { QuantumLatticeBackground } from './components';

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
				main: '#3b82f6', // blue-500, keeping this for toggles and switches
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
					// Style for contained buttons (the primary ones)
					contained: {
						background: 'linear-gradient(to right, #9747FF, #7847FF)',
						transition: 'all 0.3s ease',
						boxShadow: '0 4px 6px rgba(151, 71, 255, 0.2)',
						'&:hover': {
							background: 'linear-gradient(to right, #8030E0, #6030E0)',
							boxShadow: '0 5px 15px rgba(151, 71, 255, 0.4)',
							transform: 'translateY(-1px)',
						},
					},
					// Preserve default styles for secondary buttons and outlined buttons
					containedSecondary: {
						background: undefined, // Use default MUI style
						'&:hover': {
							background: undefined, // Use default MUI style
							boxShadow: undefined,
							transform: undefined,
						},
					},
					outlined: {
						// No changes to outlined buttons
					},
					text: {
						// No changes to text buttons
					},
				},
			},
			// Ensure toggles and switches (MuiSwitch) keep the blue color
			MuiSwitch: {
				styleOverrides: {
					switchBase: {
						color: mode === 'dark' ? '#666666' : '#CCCCCC', // Grey color when off
						'&.Mui-disabled': {
							color: mode === 'dark' ? '#424242' : '#E0E0E0',
						},
					},
					colorPrimary: {
						'&.Mui-checked': {
							color: '#3b82f6',
						},
					},
					track: {
						backgroundColor: mode === 'dark' ? '#333333' : '#E0E0E0',
						'.Mui-checked.Mui-checked + &': {
							backgroundColor: 'rgba(59, 130, 246, 0.5)',
						},
						'&.Mui-disabled': {
							backgroundColor: mode === 'dark' ? '#424242' : '#E0E0E0',
						},
					},
				},
			},
		},
	});

// PageTransition Component
const PageTransition = ({ children }: { children: React.ReactNode }) => {
	const location = useLocation();
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);

	useEffect(() => {
		if (!containerRef.current) return;

		setIsTransitioning(true);

		// Create a timeline with staggered effects that match the quantum theme
		const timeline = gsap.timeline({
			onComplete: () => setIsTransitioning(false),
			immediateRender: true,
			defaults: { overwrite: 'auto' },
		});

		// First fade out the current page with a slight blur and scale effect
		timeline.to(containerRef.current, {
			opacity: 0,
			scale: 0.98,
			filter: 'blur(5px)',
			duration: 0.25,
			ease: 'power3.out',
		});

		// Then bring in the new page with a subtle quantum-like effect
		timeline.fromTo(
			containerRef.current,
			{
				opacity: 0,
				scale: 1.02,
				filter: 'blur(5px)',
				y: -10,
			},
			{
				opacity: 1,
				scale: 1,
				filter: 'blur(0px)',
				y: 0,
				duration: 0.45,
				ease: 'power2.inOut',
				clearProps: 'all',
			}
		);

		return () => {
			// Clean up animation if component unmounts during transition
			timeline.kill();
		};
	}, [location.pathname]);

	return (
		<div
			ref={containerRef}
			className={`transition-container ${
				isTransitioning ? 'is-transitioning' : ''
			}`}
			style={{ willChange: 'opacity, transform' }}
		>
			{children}
		</div>
	);
};

// QuantumBackground component to use settings
const QuantumBackground: React.FC = () => {
	const { settings } = useSettings();
	const [backgroundIntensity, setBackgroundIntensity] = useState(1);

	return (
		<BackgroundContext.Provider
			value={{ setIntensity: setBackgroundIntensity }}
		>
			<QuantumLatticeBackground
				enabled={settings.animatedBackground}
				intensity={backgroundIntensity}
			/>
		</BackgroundContext.Provider>
	);
};

// Conditional Page Transition component
const ConditionalPageTransition: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { settings } = useSettings();

	// If motion transitions are disabled, render children directly
	if (!settings.enableMotionTransitions) {
		return <>{children}</>;
	}

	// Otherwise use the PageTransition component
	return <PageTransition>{children}</PageTransition>;
};

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
			<SettingsProvider>
				<Router>
					<div className="min-h-screen bg-background text-foreground relative overflow-hidden">
						{/* Quantum Lattice Background */}
						<QuantumBackground />

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
											className={
												lightMode ? 'text-[#131313]' : 'text-[#FAFAFA]'
											}
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
								<ConditionalPageTransition>
									<Routes>
										<Route path="/" element={<HomePage />} />
										<Route path="/home" element={<HomePage />} />
										<Route
											path="/run-benchmark"
											element={<RunBenchmarkPage />}
										/>
										<Route
											path="/run-encryption"
											element={<RunEncryptionPage />}
										/>
										<Route
											path="/visualization"
											element={<VisualizationPage />}
										/>
										<Route path="/codex" element={<CodexPage />} />
										<Route path="/export" element={<ExportPage />} />
										<Route
											path="/quantum-workloads"
											element={<RunQuantumWorkloadsPage />}
										/>
										<Route
											path="/schedule-jobs"
											element={<ScheduleJobsPage />}
										/>
										<Route path="/import" element={<ImportPage />} />
										<Route path="/settings" element={<SettingsPage />} />
									</Routes>
								</ConditionalPageTransition>
							</main>

							{/* Footer */}
							<footer className="mt-8 text-center text-sm text-gray-500">
								<p>Keystone - Version 1.0.0-rc</p>
								<p>
									Running on Electron<span id="electron-version"></span>, Node
									<span id="node-version"></span>, and Chromium
									<span id="chrome-version"></span>
								</p>
							</footer>
						</div>
					</div>
				</Router>
			</SettingsProvider>
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
