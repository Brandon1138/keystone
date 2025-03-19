import { Layout } from '../../components/Layout';

/**
 * Visualization Page Component
 */
export const VisualizationPage = (): HTMLElement => {
	// Create content specific to the Visualization page
	const visualizationContent = document.createElement('div');

	// Create a placeholder section
	const placeholderSection = document.createElement('div');
	placeholderSection.className =
		'bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8';
	placeholderSection.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Visualization</h2>
    <p class="mb-4">
      This page will allow you to visualize benchmark results with charts and graphs.
    </p>
    <p class="text-gray-500 dark:text-gray-400">
      Coming soon in Phase 5: Visualization Page
    </p>
  `;

	// Create a mockup chart area
	const chartMockup = document.createElement('div');
	chartMockup.className = 'bg-white dark:bg-gray-800 rounded-lg shadow p-6';
	chartMockup.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">Chart Preview</h2>
      <div class="flex space-x-4">
        <button class="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">Line Chart</button>
        <button class="px-3 py-1 text-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900 dark:hover:text-blue-200 rounded-md">Bar Chart</button>
        <button class="px-3 py-1 text-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900 dark:hover:text-blue-200 rounded-md">Scatter Plot</button>
      </div>
    </div>
    
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-96 flex items-center justify-center">
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 mx-auto text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
          Charts will appear here after running benchmarks
        </p>
      </div>
    </div>
  `;

	// Add all sections to the page content
	visualizationContent.appendChild(placeholderSection);
	visualizationContent.appendChild(chartMockup);

	// Apply the layout to the content
	return Layout('visualization', visualizationContent);
};
