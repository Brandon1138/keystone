import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, Button } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import NetworkPingIcon from '@mui/icons-material/NetworkPing';
import ExportNotesIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

/**
 * Home Page Component
 */
export const HomePage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Feature cards data
	const featureCards = [
		{
			title: 'Run Benchmarks',
			description: 'Execute and monitor cryptographic algorithm benchmarks.',
			icon: <SpeedIcon style={{ color: '#9747FF' }} />,
			link: '/run-benchmark',
			secondaryIcon: <CodeIcon style={{ color: '#ABABA3' }} />,
		},
		{
			title: 'Visualize',
			description: 'View interactive charts and detailed performance metrics.',
			icon: <DataUsageIcon style={{ color: '#9747FF' }} />,
			link: '/visualization',
		},
		{
			title: 'Compare',
			description: 'Analyze algorithm performance through direct comparisons.',
			icon: <CompareArrowsIcon style={{ color: '#9747FF' }} />,
			link: '/compare',
		},
		{
			title: 'Run Quantum Workloads',
			description: "Run Shor's and Grover's algorithms via IBM Quantum Cloud.",
			icon: <NetworkPingIcon style={{ color: '#9747FF' }} />,
			link: '/quantum-workloads',
			secondaryIcon: <AccountCircleIcon style={{ color: '#ABABA3' }} />,
		},
		{
			title: 'Export',
			description: 'Export benchmark results and reports in multiple formats.',
			icon: <ExportNotesIcon style={{ color: '#9747FF' }} />,
			link: '/export',
		},
		{
			title: 'Settings',
			description: 'Manage configurations, preferences, and integrations.',
			icon: <SettingsIcon style={{ color: '#9747FF' }} />,
			link: '/settings',
		},
	];

	return (
		<div className="space-y-4 relative z-10">
			{/* Feature cards section */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{featureCards.map((card, index) => (
					<Card
						key={index}
						sx={{
							borderRadius: '12px',
							bgcolor: isDarkMode ? '#1a1a1a' : 'background.paper',
							transition:
								'transform 0.3s, box-shadow 0.3s, background-color 0.3s',
							'&:hover': {
								transform: 'translateY(-5px)',
								boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
							},
							position: 'relative',
							zIndex: 1,
							height: '100%', // Set a consistent height for all cards
						}}
					>
						<CardContent
							sx={{
								p: 2,
								height: '100%',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'space-between',
							}}
						>
							<div>
								<div className="flex items-center mb-1">
									<div className="mr-2">{card.icon}</div>
									<h3
										style={{
											fontSize: '20px',
											margin: 0,
											fontWeight: 600,
											color: isDarkMode ? '#ffffff' : '#000000',
										}}
									>
										{card.title}
									</h3>
								</div>
								<p
									style={{
										fontSize: '13px',
										marginTop: '8px',
										marginBottom: '16px',
										opacity: 0.7,
										color: isDarkMode ? '#e0e0e0' : '#333333',
									}}
								>
									{card.description}
								</p>
							</div>
							<div className="flex justify-between items-center">
								<Button
									component={Link}
									to={card.link}
									variant="contained"
									disableElevation
									size="small"
									sx={{
										bgcolor: '#9747FF',
										'&:hover': {
											bgcolor: '#8030E0',
										},
										fontSize: '0.8rem',
										padding: '6px 16px',
										textTransform: 'uppercase',
										fontWeight: 'bold',
										letterSpacing: '0.5px',
										borderRadius: '4px',
									}}
								>
									GET STARTED
								</Button>
								{card.secondaryIcon && <div>{card.secondaryIcon}</div>}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
};

export default HomePage;
