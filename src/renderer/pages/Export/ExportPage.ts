import { Layout } from '../../components/Layout';

/**
 * Export Data Page Component
 */
export const ExportPage = (): HTMLElement => {
	// Create content specific to the Export Data page
	const exportContent = document.createElement('div');

	// Create a placeholder section
	const placeholderSection = document.createElement('div');
	placeholderSection.className =
		'bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8';
	placeholderSection.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Export Data</h2>
    <p class="mb-4">
      This page will allow you to export benchmark results in various formats.
    </p>
    <p class="text-gray-500 dark:text-gray-400">
      Coming soon in Phase 7: Export Data Page
    </p>
  `;

	// Create export options mockup
	const exportOptions = document.createElement('div');
	exportOptions.className =
		'bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8';
	exportOptions.innerHTML = `
    <h3 class="text-lg font-medium mb-4">Export Format</h3>
    <div class="flex space-x-4 mb-6">
      <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        CSV
      </button>
      <button class="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
        JSON
      </button>
      <button class="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
        PDF
      </button>
    </div>
    
    <div class="mb-6">
      <h3 class="text-lg font-medium mb-4">Select Benchmarks to Export</h3>
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-72 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <p class="text-gray-500 dark:text-gray-400 text-center py-8">
          No benchmark data available to export.
          <br>
          Run some benchmarks first.
        </p>
      </div>
    </div>
    
    <button class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 opacity-50 cursor-not-allowed" disabled>
      Export Selected
    </button>
  `;

	// Add all sections to the page content
	exportContent.appendChild(placeholderSection);
	exportContent.appendChild(exportOptions);

	// Apply the layout to the content
	return Layout('export', exportContent);
};
