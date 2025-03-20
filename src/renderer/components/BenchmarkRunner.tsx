import React, { useState } from 'react';
import {
	BenchmarkParams,
	BenchmarkResult,
	SUPPORTED_ALGORITHMS,
	SECURITY_PARAMS,
} from '../../types/benchmark';
import { benchmarkStoreUtils } from '../utils/benchmark-store-utils';
import {
	getAlgorithmInfo,
	getCategoryColorClass,
} from '../utils/algorithm-categories';
import { BenchmarkResultCard } from './BenchmarkResultCard';
import { BenchmarkDashboard } from './BenchmarkDashboard';

export const BenchmarkRunner: React.FC = () => {
	const initialAlgorithm = SUPPORTED_ALGORITHMS[0];
	const [selectedAlgorithm, setSelectedAlgorithm] =
		useState<string>(initialAlgorithm);
	const [selectedParam, setSelectedParam] = useState<string>(
		SECURITY_PARAMS[initialAlgorithm][0]
	);
	const [iterations, setIterations] = useState<number>(10000); // Default to 10,000 iterations
	const [currentBenchmark, setCurrentBenchmark] =
		useState<BenchmarkResult | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [benchmarkId, setBenchmarkId] = useState<string | null>(null);

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

	const handleIterationsChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const value = parseInt(event.target.value);
		if (!isNaN(value) && value > 0) {
			setIterations(value);
		}
	};

	const runBenchmark = async () => {
		setIsRunning(true);
		setCurrentBenchmark(null); // Clear previous results
		try {
			const params: BenchmarkParams = {
				algorithm: selectedAlgorithm,
				securityParam: selectedParam,
				iterations: iterations,
			};
			const result = await benchmarkStoreUtils.runBenchmark(params);
			setCurrentBenchmark(result);
			setBenchmarkId(result.id);
		} catch (error) {
			console.error('Benchmark failed:', error);
			// If the error is already a BenchmarkResult (from the main process), use it
			if (
				error &&
				typeof error === 'object' &&
				'id' in error &&
				'status' in error
			) {
				const errorResult = error as BenchmarkResult;
				setCurrentBenchmark(errorResult);
				setBenchmarkId(errorResult.id);
			}
		} finally {
			setIsRunning(false);
		}
	};

	const stopBenchmark = async () => {
		if (benchmarkId) {
			try {
				await benchmarkStoreUtils.stopBenchmark(benchmarkId);
			} catch (error) {
				console.error('Failed to stop benchmark:', error);
			} finally {
				setIsRunning(false);
			}
		}
	};

	return (
		<div className="p-6">
			<h2 className="text-2xl font-bold mb-6">Run Benchmark</h2>
			<div className="space-y-4">
				{/* Algorithm and Security Parameter Selection on the same line */}
				<div className="flex space-x-4">
					<div className="flex-1">
						<label className="block text-sm font-medium mb-2">Algorithm</label>
						<div className="flex space-x-2">
							<select
								className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
								value={selectedAlgorithm}
								onChange={handleAlgorithmChange}
								disabled={isRunning}
							>
								{SUPPORTED_ALGORITHMS.map((algo) => {
									const { displayName, category } = getAlgorithmInfo(algo);
									return (
										<option key={algo} value={algo}>
											{displayName} ({category})
										</option>
									);
								})}
							</select>
							<div
								className={`flex items-center px-2 ${getCategoryColorClass(
									getAlgorithmInfo(selectedAlgorithm).category
								)}`}
							>
								{getAlgorithmInfo(selectedAlgorithm).icon}
							</div>
						</div>
					</div>

					<div className="flex-1">
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
				</div>

				<div>
					<label className="block text-sm font-medium mb-2">Iterations</label>
					<input
						type="number"
						className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
						value={iterations}
						onChange={handleIterationsChange}
						min="1"
						step="1000"
						disabled={isRunning}
					/>
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

				{/* Real-time Dashboard */}
				{isRunning && (
					<div className="mt-6">
						<BenchmarkDashboard
							isRunning={isRunning}
							algorithm={selectedAlgorithm}
							securityParam={selectedParam}
						/>
					</div>
				)}

				{currentBenchmark && !isRunning && (
					<div className="mt-6">
						<h3 className="text-xl font-semibold mb-2">Benchmark Result:</h3>
						<BenchmarkResultCard benchmark={currentBenchmark} />
					</div>
				)}
			</div>
		</div>
	);
};
