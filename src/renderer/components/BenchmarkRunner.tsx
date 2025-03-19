import React, { useState } from 'react';
import {
	BenchmarkParams,
	BenchmarkResult,
	SUPPORTED_ALGORITHMS,
	SECURITY_PARAMS,
} from '../../types/benchmark';

// Declare the electron interface on the window object
declare global {
	interface Window {
		electron: {
			ipcRenderer: {
				invoke(channel: string, ...args: any[]): Promise<any>;
				on(channel: string, func: (...args: any[]) => void): void;
				once(channel: string, func: (...args: any[]) => void): void;
				removeListener(channel: string, func: (...args: any[]) => void): void;
			};
		};
	}
}

export const BenchmarkRunner: React.FC = () => {
	const initialAlgorithm = SUPPORTED_ALGORITHMS[0];
	const [selectedAlgorithm, setSelectedAlgorithm] =
		useState<string>(initialAlgorithm);
	const [selectedParam, setSelectedParam] = useState<string>(
		SECURITY_PARAMS[initialAlgorithm][0]
	);
	const [currentBenchmark, setCurrentBenchmark] =
		useState<BenchmarkResult | null>(null);
	const [isRunning, setIsRunning] = useState(false);

	const handleAlgorithmChange = (
		event: React.ChangeEvent<HTMLSelectElement>
	) => {
		const algorithm = event.target.value;
		setSelectedAlgorithm(algorithm);
		setSelectedParam(SECURITY_PARAMS[algorithm][0]);
	};

	const handleParamChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedParam(event.target.value);
	};

	const runBenchmark = async () => {
		setIsRunning(true);
		try {
			const params: BenchmarkParams = {
				algorithm: selectedAlgorithm,
				securityParam: selectedParam,
			};
			const result = await window.electron.ipcRenderer.invoke(
				'run-benchmark',
				params
			);
			setCurrentBenchmark(result);
		} catch (error) {
			console.error('Benchmark failed:', error);
		} finally {
			setIsRunning(false);
		}
	};

	const stopBenchmark = async () => {
		if (currentBenchmark?.id) {
			await window.electron.ipcRenderer.invoke(
				'stop-benchmark',
				currentBenchmark.id
			);
			setIsRunning(false);
		}
	};

	const renderMetrics = () => {
		if (!currentBenchmark?.metrics) return null;
		return (
			<div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
				<h3 className="text-xl font-semibold mb-2">Results:</h3>
				{Object.entries(currentBenchmark.metrics).map(([key, value]) => (
					<div key={key} className="flex justify-between py-1">
						<span className="capitalize">{key}:</span>
						<span>{value} ms</span>
					</div>
				))}
			</div>
		);
	};

	return (
		<div className="p-6">
			<h2 className="text-2xl font-bold mb-6">Run Benchmark</h2>

			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium mb-2">Algorithm</label>
					<select
						className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
						value={selectedAlgorithm}
						onChange={handleAlgorithmChange}
						disabled={isRunning}
					>
						{SUPPORTED_ALGORITHMS.map((algo) => (
							<option key={algo} value={algo}>
								{algo.charAt(0).toUpperCase() + algo.slice(1)}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm font-medium mb-2">
						Security Parameter
					</label>
					<select
						className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
						value={selectedParam}
						onChange={handleParamChange}
						disabled={isRunning}
					>
						{SECURITY_PARAMS[selectedAlgorithm]?.map((param) => (
							<option key={param} value={param}>
								{param}
							</option>
						))}
					</select>
				</div>

				<div className="flex space-x-4">
					<button
						className={`px-4 py-2 rounded-md ${
							isRunning
								? 'bg-gray-500 cursor-not-allowed'
								: 'bg-blue-600 hover:bg-blue-700 text-white'
						}`}
						onClick={runBenchmark}
						disabled={isRunning}
					>
						Run Benchmark
					</button>

					{isRunning && (
						<button
							className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
							onClick={stopBenchmark}
						>
							Stop
						</button>
					)}
				</div>

				{isRunning && (
					<div className="mt-4">
						<div className="flex items-center text-blue-600 dark:text-blue-400">
							<svg
								className="animate-spin h-5 w-5 mr-2"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>Running benchmark...</span>
						</div>
					</div>
				)}

				{currentBenchmark && renderMetrics()}

				{currentBenchmark?.error && (
					<div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
						<h3 className="text-xl font-semibold mb-2">Error:</h3>
						<p>{currentBenchmark.error}</p>
					</div>
				)}
			</div>
		</div>
	);
};
