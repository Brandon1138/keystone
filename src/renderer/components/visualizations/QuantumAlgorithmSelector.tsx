import React from 'react';
import { Box, Tabs, Tab, Tooltip, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ScienceIcon from '@mui/icons-material/Science';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SearchIcon from '@mui/icons-material/Search';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface QuantumAlgorithmSelectorProps {
	selectedAlgorithm: string;
	onAlgorithmChange: (algorithm: string) => void;
}

const QuantumAlgorithmSelector: React.FC<QuantumAlgorithmSelectorProps> = ({
	selectedAlgorithm,
	onAlgorithmChange,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	const algorithms = [
		{
			id: 'all',
			name: 'All Quantum Algorithms',
			icon: <ScienceIcon />,
			description: 'View combined metrics from all quantum algorithms',
			tooltip: 'Aggregate view of all quantum workloads',
		},
		{
			id: 'shor',
			name: "Shor's Algorithm",
			icon: <FactCheckIcon />,
			description: 'Integer factorization using quantum period finding',
			tooltip:
				"Shor's algorithm factors integers in polynomial time using quantum computers",
		},
		{
			id: 'grover',
			name: "Grover's Algorithm",
			icon: <SearchIcon />,
			description: 'Quantum search algorithm with quadratic speedup',
			tooltip:
				"Grover's algorithm provides a quadratic speedup for unstructured search problems",
		},
	];

	const getTabValue = () => {
		switch (selectedAlgorithm) {
			case 'all':
				return 0;
			case 'shor':
				return 1;
			case 'grover':
				return 2;
			default:
				return 0;
		}
	};

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		const algorithmId = algorithms[newValue]?.id || 'all';
		onAlgorithmChange(algorithmId);
	};

	return (
		<Box sx={{ width: '100%', mb: 3 }}>
			<Paper
				elevation={0}
				sx={{
					borderRadius: '8px',
					backgroundColor: isDarkMode
						? 'rgba(33,33,33,0.5)'
						: 'rgba(250,250,250,0.5)',
					border: `1px solid ${
						isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
					}`,
				}}
			>
				<Tabs
					value={getTabValue()}
					onChange={handleTabChange}
					variant="fullWidth"
					aria-label="quantum algorithm tabs"
					sx={{
						'& .MuiTabs-indicator': {
							backgroundColor: '#9747FF',
						},
						'& .MuiTab-root.Mui-selected': {
							color: '#9747FF',
						},
					}}
				>
					{algorithms.map((algorithm, index) => (
						<Tab
							key={algorithm.id}
							icon={algorithm.icon}
							label={algorithm.name}
							iconPosition="start"
							sx={{
								minHeight: '48px',
								fontSize: '0.85rem',
								'&:hover': {
									backgroundColor: isDarkMode
										? 'rgba(151, 71, 255, 0.08)'
										: 'rgba(151, 71, 255, 0.05)',
								},
							}}
							title={algorithm.tooltip}
						/>
					))}
				</Tabs>
			</Paper>
		</Box>
	);
};

export default QuantumAlgorithmSelector;
