import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';

// Type declaration for window.process
declare global {
	interface Window {
		process?: {
			versions: {
				chrome: string;
				node: string;
				electron: string;
				[key: string]: string;
			};
		};
	}
}

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
		if (element) element.innerText = text;
	};

	// This will be populated by Electron through preload.js
	for (const type of ['chrome', 'node', 'electron']) {
		replaceText(`${type}-version`, window.process?.versions?.[type] || '');
	}
});
