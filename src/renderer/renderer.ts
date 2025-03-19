import { ipcRenderer } from 'electron';
import './styles.css';
import { initRouter } from './components/Router';

// Set up dark mode by default
document.documentElement.classList.add('dark');

// DOM Elements will be accessed here
document.addEventListener('DOMContentLoaded', () => {
	console.log('Renderer process started');

	// Create app container if it doesn't exist
	const appContainer =
		document.getElementById('app') ||
		(() => {
			const container = document.createElement('div');
			container.id = 'app';
			document.body.appendChild(container);
			return container;
		})();

	// Initialize the router
	initRouter();

	// Handle quick run button on home page
	document.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;

		if (target.id === 'run-benchmark-btn') {
			const algorithmSelect = document.getElementById(
				'algorithm-select'
			) as HTMLSelectElement;
			const paramsSelect = document.getElementById(
				'params-select'
			) as HTMLSelectElement;

			if (algorithmSelect && paramsSelect) {
				ipcRenderer
					.invoke('run-benchmark', {
						algorithm: algorithmSelect.value,
						params: paramsSelect.value,
					})
					.then((result) => {
						console.log('Benchmark result:', result);
					})
					.catch((error) => {
						console.error('Error running benchmark:', error);
					});
			}
		}
	});
});
