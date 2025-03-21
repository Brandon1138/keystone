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
							bgcolor: 'background.paper',
							transition:
								'transform 0.3s, box-shadow 0.3s, background-color 0.3s',
							'&:hover': {
								transform: 'translateY(-5px)',
								boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
							},
							position: 'relative',
							zIndex: 1,
						}}
					>
						<CardContent sx={{ p: 2 }}>
							<div className="mb-3">
								<div className="flex items-center mb-1">
									<div className="mr-2">{card.icon}</div>
									<h3 style={{ fontSize: '20px', margin: 0, fontWeight: 500 }}>
										{card.title}
									</h3>
								</div>
								<p
									style={{
										fontSize: '12px',
										marginTop: '6px',
										marginBottom: '12px',
										opacity: 0.8,
									}}
								>
									{card.description}
								</p>
								<div className="flex justify-between items-center">
									<Button
										component={Link}
										to={card.link}
										variant="contained"
										size="small"
										sx={{
											mt: 1,
											bgcolor: '#9747FF',
											'&:hover': {
												bgcolor: '#8030E0',
											},
											fontSize: '0.75rem',
											padding: '4px 12px',
										}}
									>
										Get Started
									</Button>
									{card.secondaryIcon && (
										<div className="mt-2">{card.secondaryIcon}</div>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
};

export default HomePage;
