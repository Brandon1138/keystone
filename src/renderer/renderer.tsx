import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './styles.css';
import App from './App';

// Create dark and light MUI themes that complement our Tailwind config
const createAppTheme = (mode: 'light' | 'dark') =>
	createTheme({
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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
	console.log('Renderer process started');

	// Make sure we have the app container
	const appContainer =
		document.getElementById('app') ||
		(() => {
			const container = document.createElement('div');
			container.id = 'app';
			document.body.appendChild(container);
			return container;
		})();

	// Initialize React app
	const root = ReactDOM.createRoot(appContainer);
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);

	// Set version info in the footer (keeping this functionality from the original)
	const replaceText = (selector: string, text: string) => {
		const element = document.getElementById(selector);
		if (element) {
			element.innerText = text;
			// Add styling to make version text less visible and theme-responsive
			element.style.opacity = '0.6';
			element.style.fontSize = '90%';

			// Update text color based on theme
			const updateTextColor = () => {
				const isDarkMode = document.documentElement.classList.contains('dark');
				element.style.color = isDarkMode ? '#808080' : '#808080';
			};

			// Set initial color
			updateTextColor();

			// Add listener to update when theme changes
			const observer = new MutationObserver(updateTextColor);
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class'],
			});
		}
	};

	// This will be populated by Electron through preload.js
	for (const type of ['chrome', 'node', 'electron']) {
		replaceText(`${type}-version`, window.process?.versions?.[type] || '');
	}
});
