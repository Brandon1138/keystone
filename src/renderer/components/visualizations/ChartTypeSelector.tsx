import React from 'react';
import { Box, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Icons
import BarChartIcon from '@mui/icons-material/BarChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CompareIcon from '@mui/icons-material/Compare';
import TuneIcon from '@mui/icons-material/Tune';

interface ChartTypeSelectorProps {
	activeChart: string;
	onChange: (value: string) => void;
	mode: 'benchmark' | 'quantum';
}

const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
	activeChart,
	onChange,
	mode,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Define chart types based on the mode
	const chartTypes =
		mode === 'quantum'
			? [
					{
						value: 'performance',
						label: 'Metrics Overview',
						icon: <TuneIcon />,
					},
					{ value: 'bar', label: 'Circuit Metrics', icon: <BarChartIcon /> },
					{
						value: 'trend',
						label: 'Noise & Error Data',
						icon: <ShowChartIcon />,
					},
					{
						value: 'compare',
						label: 'Circuit Complexity',
						icon: <CompareIcon />,
					},
			  ]
			: [
					{
						value: 'performance',
						label: 'Average Time',
						icon: <BarChartIcon />,
					},
					{ value: 'bar', label: 'Operations/Sec', icon: <BarChartIcon /> },
					{ value: 'trend', label: 'Memory Usage', icon: <ShowChartIcon /> },
					{ value: 'compare', label: 'Compare', icon: <CompareIcon /> },
			  ];

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: '100%',
				mt: 3,
				mb: 1,
				padding: '8px',
				backgroundColor: 'transparent',
			}}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: 1.5,
					flexWrap: 'wrap',
					justifyContent: 'center',
					backgroundColor: 'transparent',
					borderRadius: '9999px',
					padding: '4px 16px',
				}}
			>
				{chartTypes.map((type) => (
					<Button
						key={type.value}
						startIcon={type.icon}
						onClick={() => onChange(type.value)}
						variant={activeChart === type.value ? 'contained' : 'text'}
						size="small"
						sx={{
							backgroundColor:
								activeChart === type.value ? '#9747FF' : 'transparent',
							color:
								activeChart === type.value
									? '#FFFFFF'
									: isDarkMode
									? '#FFFFFF'
									: '#000000',
							borderRadius: '9999px',
							textTransform: 'none',
							fontWeight: activeChart === type.value ? 600 : 400,
							padding: '6px 20px',
							minWidth: 0,
							'&:hover': {
								backgroundColor:
									activeChart === type.value
										? '#8030E0'
										: isDarkMode
										? 'rgba(151, 71, 255, 0.1)'
										: 'rgba(151, 71, 255, 0.1)',
							},
							'& .MuiButton-startIcon': {
								marginRight: '6px',
								'& > *:nth-of-type(1)': {
									fontSize: '16px',
								},
							},
						}}
					>
						{type.label}
					</Button>
				))}
			</Box>
		</Box>
	);
};

export default ChartTypeSelector;
