/**
 * Router Component - Handles client-side routing
 */

// Import page components
import { HomePage } from '../pages/Home/HomePage';
import { RunBenchmarkPage } from '../pages/RunBenchmark/RunBenchmarkPage';
import { VisualizationPage } from '../pages/Visualization/VisualizationPage';
import { ComparePage } from '../pages/Compare/ComparePage';
import { ExportPage } from '../pages/Export/ExportPage';
import { initThemeToggle } from './Layout';

// Define route type
type RouteKey =
	| '#home'
	| '#run-benchmark'
	| '#visualization'
	| '#compare'
	| '#export';
type RouteConfig = {
	page: () => HTMLElement;
	id: string;
};

// Route definitions
const routes: Record<RouteKey, RouteConfig> = {
	'#home': { page: HomePage, id: 'home' },
	'#run-benchmark': { page: RunBenchmarkPage, id: 'run-benchmark' },
	'#visualization': { page: VisualizationPage, id: 'visualization' },
	'#compare': { page: ComparePage, id: 'compare' },
	'#export': { page: ExportPage, id: 'export' },
};

// Function to render the current page based on hash
const renderCurrentPage = () => {
	const rootElement = document.getElementById('app');
	if (!rootElement) {
		console.error('Root element #app not found');
		return;
	}

	// Get current hash or default to home
	let currentRoute = window.location.hash || '#home';

	// If route doesn't exist, go to home
	if (!Object.prototype.hasOwnProperty.call(routes, currentRoute)) {
		window.location.hash = '#home';
		currentRoute = '#home';
	}

	// Get the page component and page ID
	const { page: PageComponent, id: pageId } = routes[currentRoute as RouteKey];

	// Render the page
	const pageElement = PageComponent();

	// Clear previous content
	rootElement.innerHTML = '';

	// Append the new page content
	rootElement.appendChild(pageElement);

	// Initialize theme toggle button
	initThemeToggle();
};

// Initialize the router
export const initRouter = () => {
	// Initial render
	renderCurrentPage();

	// Listen for hash changes
	window.addEventListener('hashchange', renderCurrentPage);
};
