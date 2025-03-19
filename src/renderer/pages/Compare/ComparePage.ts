import { Layout } from '../../components/Layout';

/**
 * Compare Benchmarks Page Component
 */
export const ComparePage = (): HTMLElement => {
	// Create content specific to the Compare Benchmarks page
	const compareContent = document.createElement('div');

	// Create a placeholder section
	const placeholderSection = document.createElement('div');
	placeholderSection.className =
		'bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8';
	placeholderSection.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Compare Benchmarks</h2>
    <p class="mb-4">
      This page will allow you to compare different algorithms and security parameters side-by-side.
    </p>
    <p class="text-gray-500 dark:text-gray-400">
      Coming soon in Phase 6: Comparison Page
    </p>
  `;

	// Create a mode selector mockup
	const modeSelector = document.createElement('div');
	modeSelector.className =
		'bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8';
	modeSelector.innerHTML = `
    <h3 class="text-lg font-medium mb-4">Comparison Mode</h3>
    <div class="flex space-x-4">
      <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Algorithm vs Algorithm
      </button>
      <button class="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
        Post-Quantum vs Classical
      </button>
    </div>
  `;

	// Create a comparison mockup area
	const comparisonMockup = document.createElement('div');
	comparisonMockup.className =
		'bg-white dark:bg-gray-800 rounded-lg shadow p-6';
	comparisonMockup.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">Comparison Preview</h2>
    </div>
    
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-96 flex items-center justify-center">
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 mx-auto text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p class="mt-4 text-xl text-gray-500 dark:text-gray-400">
          Comparison charts will appear here after selecting algorithms to compare
        </p>
      </div>
    </div>
  `;

	// Add all sections to the page content
	compareContent.appendChild(placeholderSection);
	compareContent.appendChild(modeSelector);
	compareContent.appendChild(comparisonMockup);

	// Apply the layout to the content
	return Layout('compare', compareContent);
};
