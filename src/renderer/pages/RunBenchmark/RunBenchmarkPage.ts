import { Layout } from '../../components/Layout';
import { ipcRenderer } from 'electron';

/**
 * Run Benchmark Page Component
 */
export const RunBenchmarkPage = (): HTMLElement => {
	// Create content specific to the Run Benchmark page
	const runBenchmarkContent = document.createElement('div');

	// Create the benchmark form section
	const formSection = document.createElement('div');
	formSection.className =
		'bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8';
	formSection.innerHTML = `
    <h2 class="text-xl font-semibold mb-6">Configure Benchmark</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <!-- Algorithm selection -->
      <div>
        <label for="algorithm-select" class="block text-sm font-medium mb-2">Algorithm</label>
        <select id="algorithm-select" class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
          <optgroup label="Post-Quantum">
            <option value="kyber">Kyber</option>
            <option value="dilithium">Dilithium</option>
            <option value="falcon">Falcon</option>
            <option value="mceliece">McEliece</option>
            <option value="sphincs">SPHINCS+</option>
          </optgroup>
          <optgroup label="Classical">
            <option value="rsa">RSA</option>
            <option value="ecdh">ECDH</option>
            <option value="ecdsa">ECDSA</option>
          </optgroup>
        </select>
      </div>
      
      <!-- Security parameter selection -->
      <div>
        <label for="params-select" class="block text-sm font-medium mb-2">Security Parameter</label>
        <select id="params-select" class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
          <option value="512">512</option>
          <option value="768">768</option>
          <option value="1024">1024</option>
        </select>
      </div>
    </div>
    
    <!-- Additional options -->
    <div class="mb-6">
      <h3 class="text-lg font-medium mb-4">Additional Options</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-center">
          <input type="checkbox" id="run-iterations" class="mr-2">
          <label for="run-iterations" class="text-sm">Run multiple iterations</label>
        </div>
        
        <div class="flex items-center">
          <label for="iterations-count" class="text-sm mr-2">Iterations:</label>
          <input type="number" id="iterations-count" value="10" min="1" max="1000" class="w-20 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600">
        </div>
      </div>
    </div>
    
    <!-- Run controls -->
    <div class="flex space-x-4">
      <button id="run-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Run Benchmark
      </button>
      
      <button id="stop-btn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 opacity-50 cursor-not-allowed" disabled>
        Stop
      </button>
    </div>
  `;

	// Create the results section
	const resultsSection = document.createElement('div');
	resultsSection.className = 'bg-white dark:bg-gray-800 rounded-lg shadow p-6';
	resultsSection.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">Results</h2>
      <div id="status-indicator" class="hidden">
        <div class="flex items-center text-blue-600 dark:text-blue-400">
          <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Running benchmark...</span>
        </div>
      </div>
    </div>
    
    <div id="results-placeholder" class="text-center py-8 text-gray-500 dark:text-gray-400">
      No results yet. Run a benchmark to see results here.
    </div>
    
    <div id="results-content" class="hidden">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <!-- These will be populated with actual results -->
        <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 class="text-lg font-medium mb-2">KeyGen Time</h3>
          <p class="text-2xl font-bold text-blue-600 dark:text-blue-400" id="keygen-result">0.0 ms</p>
        </div>
        
        <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 class="text-lg font-medium mb-2">Encaps/Encrypt Time</h3>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400" id="encaps-result">0.0 ms</p>
        </div>
        
        <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 class="text-lg font-medium mb-2">Decaps/Decrypt Time</h3>
          <p class="text-2xl font-bold text-purple-600 dark:text-purple-400" id="decaps-result">0.0 ms</p>
        </div>
      </div>
      
      <div id="additional-metrics" class="border-t dark:border-gray-700 pt-6 mt-6">
        <h3 class="text-lg font-medium mb-4">Additional Metrics</h3>
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Metric</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700" id="metrics-table-body">
            <!-- Table rows will be added here via JavaScript -->
          </tbody>
        </table>
      </div>
    </div>
  `;

	// Add all sections to the page content
	runBenchmarkContent.appendChild(formSection);
	runBenchmarkContent.appendChild(resultsSection);

	// Create the complete page with layout
	const page = Layout('run-benchmark', runBenchmarkContent);

	// Add event listeners after the page is mounted to the DOM
	setTimeout(() => {
		// Form elements
		const algorithmSelect = document.getElementById(
			'algorithm-select'
		) as HTMLSelectElement;
		const paramsSelect = document.getElementById(
			'params-select'
		) as HTMLSelectElement;
		const runButton = document.getElementById('run-btn');
		const stopButton = document.getElementById('stop-btn');
		const statusIndicator = document.getElementById('status-indicator');
		const resultsPlaceholder = document.getElementById('results-placeholder');
		const resultsContent = document.getElementById('results-content');

		// Result elements
		const keygenResult = document.getElementById('keygen-result');
		const encapsResult = document.getElementById('encaps-result');
		const decapsResult = document.getElementById('decaps-result');
		const metricsTableBody = document.getElementById('metrics-table-body');

		// Handle algorithm change to update available parameters
		algorithmSelect?.addEventListener('change', () => {
			// This would update the params dropdown based on the selected algorithm
			// For now, just a placeholder
			console.log('Algorithm changed:', algorithmSelect.value);
		});

		// Run button click handler
		runButton?.addEventListener('click', async () => {
			if (!algorithmSelect || !paramsSelect) return;

			// Show running state
			if (statusIndicator) statusIndicator.classList.remove('hidden');
			if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
			if (resultsContent) resultsContent.classList.add('hidden');
			if (runButton) runButton.setAttribute('disabled', 'true');
			if (stopButton) {
				stopButton.removeAttribute('disabled');
				stopButton.classList.remove('opacity-50', 'cursor-not-allowed');
			}

			try {
				// Call the main process to run the benchmark
				const result = await ipcRenderer.invoke('run-benchmark', {
					algorithm: algorithmSelect.value,
					params: paramsSelect.value,
				});

				console.log('Benchmark result:', result);

				// Update UI with results (this is just placeholder logic)
				// In a real implementation, we would parse the actual benchmark data
				if (keygenResult) keygenResult.textContent = '0.15 ms';
				if (encapsResult) encapsResult.textContent = '0.23 ms';
				if (decapsResult) decapsResult.textContent = '0.18 ms';

				// Populate metrics table
				if (metricsTableBody) {
					metricsTableBody.innerHTML = `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap">Total time</td>
              <td class="px-6 py-4 whitespace-nowrap">0.56 ms</td>
            </tr>
            <tr>
              <td class="px-6 py-4 whitespace-nowrap">Memory usage</td>
              <td class="px-6 py-4 whitespace-nowrap">12.4 MB</td>
            </tr>
          `;
				}

				// Show results
				if (resultsContent) resultsContent.classList.remove('hidden');
			} catch (error) {
				console.error('Error running benchmark:', error);
			} finally {
				// Reset UI state
				if (statusIndicator) statusIndicator.classList.add('hidden');
				if (runButton) runButton.removeAttribute('disabled');
				if (stopButton) {
					stopButton.setAttribute('disabled', 'true');
					stopButton.classList.add('opacity-50', 'cursor-not-allowed');
				}
			}
		});

		// Stop button click handler
		stopButton?.addEventListener('click', async () => {
			try {
				await ipcRenderer.invoke('stop-benchmark');
				console.log('Benchmark stopped');
			} catch (error) {
				console.error('Error stopping benchmark:', error);
			}
		});
	}, 0);

	return page;
};
