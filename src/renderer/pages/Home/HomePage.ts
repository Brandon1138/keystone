import { Layout } from '../../components/Layout';

/**
 * Home Page Component
 */
export const HomePage = (): HTMLElement => {
	// Create content specific to the Home page
	const homeContent = document.createElement('div');

	// Welcome section
	const welcomeSection = document.createElement('div');
	welcomeSection.className =
		'bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8';
	welcomeSection.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Welcome to PQC Benchmark Tool</h2>
    <p class="mb-4">
      This application allows you to run, visualize and compare benchmarks
      for post-quantum cryptography algorithms.
    </p>
    <p>
      To get started, go to the "Run Benchmark" page and select an algorithm.
    </p>
  `;

	// Quick features overview section
	const featuresSection = document.createElement('div');
	featuresSection.className = 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8';

	// Feature cards
	const featureCards = [
		{
			title: 'Run Benchmarks',
			description:
				'Execute benchmarks for Kyber, Dilithium, McEliece, and classic algorithms like RSA and ECC.',
			icon: '🚀',
			link: '#run-benchmark',
		},
		{
			title: 'Visualize Results',
			description:
				'View detailed charts and graphs of your benchmark results, comparing different metrics.',
			icon: '📊',
			link: '#visualization',
		},
		{
			title: 'Compare Algorithms',
			description:
				'Compare post-quantum algorithms against each other or against classical algorithms.',
			icon: '⚖️',
			link: '#compare',
		},
	];

	featureCards.forEach((card) => {
		const featureCard = document.createElement('div');
		featureCard.className =
			'bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200';
		featureCard.innerHTML = `
      <div class="text-3xl mb-4">${card.icon}</div>
      <h3 class="text-lg font-semibold mb-2">${card.title}</h3>
      <p class="text-gray-600 dark:text-gray-400 mb-4">${card.description}</p>
      <a href="${card.link}" class="text-blue-600 dark:text-blue-400 font-medium hover:underline">
        Get started →
      </a>
    `;
		featuresSection.appendChild(featureCard);
	});

	// Quick run section (similar to what's in the initial HTML)
	const quickRunSection = document.createElement('div');
	quickRunSection.className = 'bg-white dark:bg-gray-800 rounded-lg shadow p-6';
	quickRunSection.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Quick Run</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label for="algorithm-select" class="block text-sm font-medium mb-2">Algorithm</label>
        <select id="algorithm-select" class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
          <option value="kyber">Kyber</option>
          <option value="dilithium">Dilithium</option>
          <option value="falcon">Falcon</option>
          <option value="mceliece">McEliece</option>
          <option value="rsa">RSA</option>
          <option value="ecdh">ECDH</option>
        </select>
      </div>
      <div>
        <label for="params-select" class="block text-sm font-medium mb-2">Security Parameter</label>
        <select id="params-select" class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
          <option value="512">512</option>
          <option value="768">768</option>
          <option value="1024">1024</option>
        </select>
      </div>
    </div>
    <button id="run-benchmark-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
      Run Benchmark
    </button>
  `;

	// Add all sections to the home content
	homeContent.appendChild(welcomeSection);
	homeContent.appendChild(featuresSection);
	homeContent.appendChild(quickRunSection);

	// Apply the layout to the content
	return Layout('home', homeContent);
};
