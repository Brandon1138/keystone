import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './styles.css';
import App from './App';

// Create a dark MUI theme that complements our Tailwind config
const darkTheme = createTheme({
	palette: {
		mode: 'dark',
		primary: {
			main: '#3b82f6', // blue-500, matching our primary in Tailwind
		},
		background: {
			default: '#09090b', // matching our background in Tailwind
			paper: '#1e1e2e', // matching our card background in Tailwind
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
			<ThemeProvider theme={darkTheme}>
				<CssBaseline />
				<App />
			</ThemeProvider>
		</React.StrictMode>
	);

	// Set version info in the footer (keeping this functionality from the original)
	const replaceText = (selector: string, text: string) => {
		const element = document.getElementById(selector);
		if (element) element.innerText = text;
	};

	// This will be populated by Electron through preload.js
	for (const type of ['chrome', 'node', 'electron']) {
		replaceText(`${type}-version`, window.process?.versions?.[type] || '');
	}
});
