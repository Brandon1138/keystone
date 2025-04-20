import React from 'react';
import { Box, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Icons
import SettingsIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import SchoolIcon from '@mui/icons-material/School';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

interface CodexTabSelectorProps {
	activeSection: string;
	onChange: (value: string) => void;
}

const CodexTabSelector: React.FC<CodexTabSelectorProps> = ({
	activeSection,
	onChange,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Define codex sections
	const tabTypes = [
		{
			value: 'standardization',
			label: 'Standards',
			icon: <SettingsIcon />,
		},
		{
			value: 'libraries',
			label: 'Libraries',
			icon: <CodeIcon />,
		},
		{
			value: 'quantum',
			label: 'Frameworks',
			icon: <SchoolIcon />,
		},
		{
			value: 'knowledge',
			label: 'Knowledge',
			icon: <LibraryBooksIcon />,
		},
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
				{tabTypes.map((type) => (
					<Button
						key={type.value}
						startIcon={type.icon}
						onClick={() => onChange(type.value)}
						variant={activeSection === type.value ? 'contained' : 'text'}
						size="small"
						sx={{
							backgroundColor:
								activeSection === type.value ? '#9747FF' : 'transparent',
							color:
								activeSection === type.value
									? '#FFFFFF'
									: isDarkMode
									? '#FFFFFF'
									: '#000000',
							borderRadius: '9999px',
							textTransform: 'none',
							fontWeight: activeSection === type.value ? 600 : 400,
							padding: '6px 20px',
							minWidth: 0,
							'&:hover': {
								backgroundColor:
									activeSection === type.value
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

export default CodexTabSelector;
