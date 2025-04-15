import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { Button } from '@mui/material';

// Icons
import SpeedIcon from '@mui/icons-material/Speed';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import NetworkPingIcon from '@mui/icons-material/NetworkPing';
import ExportNotesIcon from '@mui/icons-material/Download';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
import CodeIcon from '@mui/icons-material/Code';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SettingsIcon from '@mui/icons-material/Settings';
import ImportIcon from '@mui/icons-material/Upload';
import MenuBookIcon from '@mui/icons-material/MenuBook';

// Import your custom Card component
import { Card } from '../components/ui/card';
// ^ Adjust path if needed

// Background context for demonstrating intensity changes
export const BackgroundContext = React.createContext({
	setIntensity: (value: number) => {},
});

/**
 * Home Page Component
 */
export const HomePage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const { setIntensity } = useContext(BackgroundContext);

	// Feature cards data
	const featureCards = [
		{
			title: 'Run Quantum Workloads',
			description: "Run Shor's and Grover's algorithms via IBM Quantum Cloud.",
			icon: <NetworkPingIcon style={{ color: '#9747FF' }} />,
			link: '/quantum-workloads',
			secondaryIcon: <AccountCircleIcon style={{ color: '#ABABA3' }} />,
		},
		{
			title: 'Run Benchmarks',
			description: 'Execute and monitor cryptographic algorithm benchmarks.',
			icon: <SpeedIcon style={{ color: '#9747FF' }} />,
			link: '/run-benchmark',
			secondaryIcon: <CodeIcon style={{ color: '#ABABA3' }} />,
		},
		{
			title: 'Run Encryption',
			description:
				'Generate keys and encrypt or decrypt messages using various cryptographic algorithms.',
			icon: <EnhancedEncryptionIcon style={{ color: '#9747FF' }} />,
			link: '/run-encryption',
			secondaryIcon: <CodeIcon style={{ color: '#ABABA3' }} />,
		},
		{
			title: 'Schedule Jobs',
			description:
				'Schedule benchmarks and quantum workloads to run asynchronously.',
			icon: <ScheduleIcon style={{ color: '#9747FF' }} />,
			link: '/schedule-jobs',
			secondaryIcon: <CodeIcon style={{ color: '#ABABA3' }} />,
		},
		{
			title: 'Visualize',
			description: 'View interactive charts and detailed performance metrics.',
			icon: <DataUsageIcon style={{ color: '#9747FF' }} />,
			link: '/visualization',
		},
		{
			title: 'Codex',
			description:
				'Access resources on standards, libraries, quantum frameworks, and research materials.',
			icon: <MenuBookIcon style={{ color: '#9747FF' }} />,
			link: '/codex',
		},
		{
			title: 'Import',
			description:
				'Import benchmark results and datasets for analysis and comparison.',
			icon: <ImportIcon style={{ color: '#9747FF' }} />,
			link: '/import',
		},
		{
			title: 'Export',
			description: 'Export benchmark results and reports in multiple formats.',
			icon: <ExportNotesIcon style={{ color: '#9747FF' }} />,
			link: '/export',
		},
		{
			title: 'Settings',
			description:
				'Configure application preferences, connections, and user settings.',
			icon: <SettingsIcon style={{ color: '#9747FF' }} />,
			link: '/settings',
		},
	];

	// Simulate random intensity changes to demonstrate the background reactivity
	useEffect(() => {
		// Only run this demo effect when in dark mode
		if (!isDarkMode) {
			setIntensity(1);
			return;
		}

		// Periodically change intensity
		const intensityInterval = setInterval(() => {
			// Random intensity between 1 and 2.5
			const newIntensity = 1 + Math.random() * 1.5;
			setIntensity(newIntensity);
		}, 5000);

		return () => {
			clearInterval(intensityInterval);
			// Reset to default when component unmounts
			setIntensity(1);
		};
	}, [isDarkMode, setIntensity]);

	return (
		<div className="space-y-4 relative z-10">
			{/* Feature cards section */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{featureCards.map((card, index) => (
					<Card
						key={index}
						className="
              relative
              z-10
              h-full
              min-h-[220px]
              p-4
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-xl
              hover:bg-white/30 dark:hover:bg-[#212121]/40
              group
            "
					>
						{/* Card Header with extra top spacing */}
						<div className="flex items-center mb-1 mt-2">
							<div className="mr-2 transition-transform duration-300 group-hover:scale-110">
								{card.icon}
							</div>
							<h3
								className="text-[20px] font-semibold"
								style={{
									color: isDarkMode ? '#ffffff' : '#000000',
								}}
							>
								{card.title}
							</h3>
						</div>

						{/* Card Description */}
						<p
							className="text-sm opacity-90 mb-4 font-medium"
							style={{
								color: isDarkMode ? '#f0f0f0' : '#111111',
								textShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
							}}
						>
							{card.description}
						</p>

						{/* Action Button (bottom-left by default) */}
						<Button
							component={Link}
							to={card.link}
							variant="contained"
							disableElevation
							size="small"
							sx={{
								fontSize: '0.8rem',
								padding: '6px 16px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								letterSpacing: '0.5px',
								borderRadius: '8px',
							}}
						>
							GET STARTED
						</Button>

						{/* If there's a secondary icon, place it in from the corner */}
						{card.secondaryIcon && (
							<div className="absolute bottom-4 right-4">
								{card.secondaryIcon}
							</div>
						)}
					</Card>
				))}
			</div>
		</div>
	);
};

export default HomePage;
