/**
 * Layout Component - Provides a consistent layout for all pages
 */

// Helper function to create HTML elements
const createElement = (
	tag: string,
	classes: string = '',
	content: string = '',
	attributes: Record<string, string> = {}
): HTMLElement => {
	const element = document.createElement(tag);
	if (classes) {
		element.className = classes;
	}
	if (content) {
		element.innerHTML = content;
	}
	for (const [key, value] of Object.entries(attributes)) {
		element.setAttribute(key, value);
	}
	return element;
};

// Create navigation items
const createNavItems = (currentPage: string) => {
	const navItems = [
		{ text: 'Home', href: '#home' },
		{ text: 'Run Benchmark', href: '#run-benchmark' },
		{ text: 'Visualization', href: '#visualization' },
		{ text: 'Compare Benchmarks', href: '#compare' },
		{ text: 'Export Data', href: '#export' },
	];

	const navContainer = createElement('nav', 'flex space-x-6 mb-8');

	navItems.forEach((item) => {
		const isActive = item.text.toLowerCase().replace(' ', '-') === currentPage;
		const linkClasses = isActive
			? 'text-blue-600 dark:text-blue-400 font-medium'
			: 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400';

		const link = createElement('a', linkClasses, item.text, {
			href: item.href,
		});
		navContainer.appendChild(link);
	});

	// Add theme toggle button
	const themeToggle = createElement(
		'button',
		'ml-auto text-gray-600 dark:text-gray-400',
		'Toggle Dark Mode',
		{ id: 'theme-toggle' }
	);
	navContainer.appendChild(themeToggle);

	return navContainer;
};

export const Layout = (
	currentPage: string,
	pageContent: HTMLElement
): HTMLElement => {
	// Create main container
	const container = createElement('div', 'container');

	// Header
	const header = createElement('header', 'mb-8');
	const title = createElement(
		'h1',
		'text-3xl font-bold mb-2',
		'Post-Quantum Cryptography Benchmark'
	);
	const subtitle = createElement(
		'p',
		'text-gray-600 dark:text-gray-400',
		'A tool for benchmarking post-quantum cryptography algorithms'
	);
	header.appendChild(title);
	header.appendChild(subtitle);

	// Navigation
	const nav = createNavItems(currentPage);

	// Main content wrapper
	const main = createElement('main', '');
	main.appendChild(pageContent);

	// Footer
	const footer = createElement(
		'footer',
		'mt-8 text-center text-gray-600 dark:text-gray-400 text-sm'
	);
	footer.innerHTML = `
    <p>PQC Benchmark Tool - Version 1.0.0</p>
    <p>
      Running on Electron <span id="electron-version"></span>, Node
      <span id="node-version"></span>, and Chromium
      <span id="chrome-version"></span>
    </p>
  `;

	// Assemble the layout
	container.appendChild(header);
	container.appendChild(nav);
	container.appendChild(main);
	container.appendChild(footer);

	return container;
};

// Function to initialize the theme toggle button
export const initThemeToggle = (): void => {
	const themeToggleBtn = document.getElementById('theme-toggle');
	if (themeToggleBtn) {
		themeToggleBtn.addEventListener('click', () => {
			document.documentElement.classList.toggle('dark');
		});
	}
};
