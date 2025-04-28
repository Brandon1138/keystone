import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { Job, BenchmarkJob, QuantumJob } from '../types/jobs';
import { benchmarkManager } from './benchmarkManager';
import { lowdbService } from './db/lowdbService';
import { BenchmarkParams } from '../types/benchmark';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

/**
 * Gets the project root directory
 */
function getProjectRoot(): string {
	const isDevelopment = process.env.NODE_ENV === 'development';
	if (isDevelopment) {
		// In development, find the directory containing package.json
		let currentDir = __dirname;
		while (
			!fs.existsSync(path.join(currentDir, 'package.json')) &&
			currentDir !== path.parse(currentDir).root
		) {
			currentDir = path.dirname(currentDir);
		}
		if (fs.existsSync(path.join(currentDir, 'package.json'))) {
			return currentDir;
		} else {
			// Fallback if package.json not found
			return path.resolve(__dirname, '..', '..');
		}
	} else {
		// In production, use resources path
		const processAny = process as any;
		const resourcesPath =
			processAny.resourcesPath ||
			(app
				? path.dirname(app.getAppPath())
				: path.resolve(__dirname, '..', '..'));
		return resourcesPath;
	}
}

/**
 * Service that manages job scheduling and execution
 */
export class JobSchedulerService {
	private jobQueue: Job[] = [];
	private isProcessing: boolean = false;
	private mainWindow: BrowserWindow | null = null;
	private scheduleCheckInterval: NodeJS.Timeout | null = null;

	constructor() {
		console.log('[JobSchedulerService] Initializing job scheduler service');
		this.startScheduleChecker();
		this.verifyQuantumScripts();
	}

	/**
	 * Verify that quantum scripts exist and log their paths
	 * This is used for diagnostics at startup
	 */
	private verifyQuantumScripts(): void {
		const quantumScriptsPath = this.getQuantumScriptPath();
		console.log(
			`[JobSchedulerService] Verifying quantum scripts in: ${quantumScriptsPath}`
		);

		// Check if directory exists
		if (!fs.existsSync(quantumScriptsPath)) {
			console.error(
				`[JobSchedulerService] ERROR: Quantum scripts directory does not exist: ${quantumScriptsPath}`
			);
			return;
		}

		// List all Python scripts
		const scriptFiles = fs
			.readdirSync(quantumScriptsPath)
			.filter((file) => file.endsWith('.py'));

		if (scriptFiles.length === 0) {
			console.error(
				`[JobSchedulerService] ERROR: No Python scripts found in ${quantumScriptsPath}`
			);
		} else {
			console.log(
				`[JobSchedulerService] Found ${scriptFiles.length} quantum scripts:`
			);
			scriptFiles.forEach((file) => {
				const filePath = path.join(quantumScriptsPath, file);
				console.log(
					`  - ${file} (${fs.existsSync(filePath) ? 'exists' : 'MISSING!'})`
				);
			});

			// Specifically check for required scripts
			const requiredScripts = ['shor_n15.py', 'grover_search.py'];
			const missingScripts = requiredScripts.filter(
				(script) => !fs.existsSync(path.join(quantumScriptsPath, script))
			);

			if (missingScripts.length > 0) {
				console.error(
					`[JobSchedulerService] ERROR: Missing required quantum scripts: ${missingScripts.join(
						', '
					)}`
				);
			} else {
				console.log(
					`[JobSchedulerService] All required quantum scripts are available.`
				);
			}
		}
	}

	/**
	 * Gets the path to the quantum scripts directory
	 */
	private getQuantumScriptPath(): string {
		return path.join(getProjectRoot(), 'quantum');
	}

	/**
	 * Start the schedule checker that periodically checks for scheduled jobs
	 */
	private startScheduleChecker(): void {
		// Check every 30 seconds for scheduled jobs
		this.scheduleCheckInterval = setInterval(() => {
			console.log('[JobSchedulerService] Checking for scheduled jobs');
			this.processQueue();
		}, 30000); // 30 seconds
	}

	/**
	 * Stop the schedule checker when the app is closing
	 */
	public stopScheduleChecker(): void {
		if (this.scheduleCheckInterval) {
			clearInterval(this.scheduleCheckInterval);
			this.scheduleCheckInterval = null;
		}
	}

	/**
	 * Set the main window reference to enable IPC communication
	 */
	setMainWindow(window: BrowserWindow): void {
		this.mainWindow = window;
	}

	/**
	 * Add a new job to the queue and start processing if not already in progress
	 */
	addJob(
		jobDefinition: Omit<
			Job,
			| 'id'
			| 'status'
			| 'createdAt'
			| 'startedAt'
			| 'completedAt'
			| 'result'
			| 'error'
			| 'runCount'
		>
	): Job {
		// Create a new job with generated ID and timestamps
		let newJob: Job;

		if (jobDefinition.type === 'benchmark') {
			// Handle benchmark job
			const benchmarkDef = jobDefinition as Omit<
				BenchmarkJob,
				| 'id'
				| 'status'
				| 'createdAt'
				| 'startedAt'
				| 'completedAt'
				| 'result'
				| 'error'
				| 'runCount'
			>;
			newJob = {
				...benchmarkDef,
				id: uuidv4(),
				status: 'pending',
				createdAt: new Date(),
				numberOfRuns: benchmarkDef.numberOfRuns || 1,
				runCount: 0,
			} as BenchmarkJob;
		} else {
			// Handle quantum job
			const quantumDef = jobDefinition as Omit<
				QuantumJob,
				| 'id'
				| 'status'
				| 'createdAt'
				| 'startedAt'
				| 'completedAt'
				| 'result'
				| 'error'
				| 'runCount'
			>;
			newJob = {
				...quantumDef,
				id: uuidv4(),
				status: 'pending',
				createdAt: new Date(),
				numberOfRuns: quantumDef.numberOfRuns || 1,
				runCount: 0,
			} as QuantumJob;
		}

		// Add job to queue
		this.jobQueue.push(newJob);

		// Send update to renderer
		this.sendJobQueueUpdate();

		// Start processing the queue if not already processing
		this.processQueue();

		return newJob;
	}

	/**
	 * Process the next pending job in the queue
	 */
	async processQueue(): Promise<void> {
		// If already processing or no pending jobs, return
		if (this.isProcessing || !this.getNextPendingJob()) {
			return;
		}

		// Mark as processing
		this.isProcessing = true;

		// Get the next pending job
		const job = this.getNextPendingJob();
		if (!job) {
			this.isProcessing = false;
			return;
		}

		try {
			// Update job status to running
			job.status = 'running';
			job.startedAt = new Date();
			job.runCount = 0;

			// Send update to renderer
			this.sendJobQueueUpdate();

			// Execute job based on type
			if (job.type === 'benchmark') {
				await this.executeBenchmarkJob(job as BenchmarkJob);
			} else if (job.type === 'quantum') {
				await this.executeQuantumJob(job as QuantumJob);
			}

			// Mark job as completed
			job.status = 'completed';
			job.completedAt = new Date();
		} catch (error: any) {
			// Mark job as failed
			job.status = 'failed';
			job.completedAt = new Date();
			job.error = error.message || 'Unknown error occurred';
			console.error(`[JobSchedulerService] Job ${job.id} failed:`, error);
		}

		// Send final update
		this.sendJobQueueUpdate();

		// Mark as not processing
		this.isProcessing = false;

		// Process next job
		this.processQueue();
	}

	/**
	 * Execute a benchmark job
	 */
	private async executeBenchmarkJob(job: BenchmarkJob): Promise<void> {
		// Execute the job numberOfRuns times
		for (let i = 0; i < job.numberOfRuns; i++) {
			// Update run count
			job.runCount = i + 1;
			this.sendJobQueueUpdate();

			// Skip if job was cancelled
			if (job.status === 'cancelled') {
				break;
			}

			try {
				// Create params for benchmarkManager
				const params: BenchmarkParams = {
					algorithm: job.algorithm,
					securityParam: job.securityParameter,
					iterations: job.iterations,
				};

				// Execute benchmark
				const result = await benchmarkManager.runBenchmark(params);

				// Store the result
				if (!job.result) {
					job.result = [];
				}
				job.result.push(result);

				// Send update
				this.sendJobQueueUpdate();
			} catch (error) {
				// If any run fails, mark the entire job as failed and stop
				throw error;
			}
		}
	}

	/**
	 * Execute a quantum job
	 */
	private async executeQuantumJob(job: QuantumJob): Promise<void> {
		// Execute the job numberOfRuns times
		for (let i = 0; i < job.numberOfRuns; i++) {
			// Update run count
			job.runCount = i + 1;
			this.sendJobQueueUpdate();

			// Skip if job was cancelled
			if (job.status === 'cancelled') {
				break;
			}

			try {
				let result;

				if (job.algorithm === 'shor') {
					// Run Shor's algorithm
					result = await this.runQuantumWorkload(
						job.apiToken || '',
						job.shotCount,
						job.target === 'real_hardware',
						job.plotTheme || 'dark'
					);
				} else if (job.algorithm === 'grover') {
					// Run Grover's algorithm
					result = await this.runGroverSearch(
						job.apiToken || '',
						job.markedStates || '101',
						job.shotCount,
						job.target === 'real_hardware',
						job.plotTheme || 'dark'
					);
				} else {
					throw new Error(`Unknown quantum algorithm: ${job.algorithm}`);
				}

				// Store the result
				if (!job.result) {
					job.result = [];
				}
				job.result.push(result);

				// Send update
				this.sendJobQueueUpdate();
			} catch (error) {
				// If any run fails, mark the entire job as failed and stop
				throw error;
			}
		}
	}

	/**
	 * Get the next pending job in the queue that is ready to run
	 * (not scheduled for a future time)
	 */
	private getNextPendingJob(): Job | undefined {
		const now = Date.now();
		return this.jobQueue.find((job) => {
			// Job must be pending
			if (job.status !== 'pending') return false;

			// Check if job has a scheduled time in the future
			if (job.scheduledTime && job.scheduledTime > now) {
				return false;
			}

			// Job is pending and either has no scheduledTime or scheduledTime is in the past
			return true;
		});
	}

	/**
	 * Get the current state of the job queue
	 */
	getQueueState(): Job[] {
		return [...this.jobQueue];
	}

	/**
	 * Cancel a pending job
	 */
	cancelJob(jobId: string): boolean {
		const jobIndex = this.jobQueue.findIndex((job) => job.id === jobId);

		if (jobIndex === -1) {
			return false;
		}

		const job = this.jobQueue[jobIndex];

		if (job.status === 'pending') {
			job.status = 'cancelled';
			this.sendJobQueueUpdate();
			return true;
		} else if (job.status === 'running') {
			// For running jobs, we can't cancel them directly yet
			// In the future, we could implement cancellation for running processes
			return false;
		}

		return false;
	}

	/**
	 * Remove a job from the queue
	 */
	removeJob(jobId: string): boolean {
		const initialLength = this.jobQueue.length;
		this.jobQueue = this.jobQueue.filter((job) => job.id !== jobId);

		if (this.jobQueue.length !== initialLength) {
			this.sendJobQueueUpdate();
			return true;
		}

		return false;
	}

	/**
	 * Send a job queue update to the renderer process
	 */
	private sendJobQueueUpdate(): void {
		if (this.mainWindow && !this.mainWindow.isDestroyed()) {
			this.mainWindow.webContents.send(
				'job-queue-update',
				this.getQueueState()
			);
		}
	}

	/**
	 * Implementation of runQuantumWorkload
	 */
	private async runQuantumWorkload(
		apiToken: string,
		shots: number,
		runOnHardware: boolean,
		plotTheme: 'light' | 'dark'
	): Promise<any> {
		console.log(
			'[JobSchedulerService] Starting quantum Shor workload execution...'
		);

		// Generate unique filenames for outputs using timestamp and random ID
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2, 10);
		const userDataPath = app.getPath('userData');
		const outputPath = path.join(userDataPath, 'quantum_outputs');

		// Ensure the output directory exists
		if (!fs.existsSync(outputPath)) {
			fs.mkdirSync(outputPath, { recursive: true });
		}

		// Generate paths for output files
		const plotFilePath = path.join(
			outputPath,
			`plot_${timestamp}_${randomId}.png`
		);
		const jsonFilePath = path.join(
			outputPath,
			`result_${timestamp}_${randomId}.json`
		);

		// Create a run record in the database
		const runId = await lowdbService.createRun(
			'Quantum_Shor',
			'Shor',
			'N=15', // Fixed for now
			shots
		);

		// Update run status to running
		await lowdbService.updateRunStatus(runId, 'running');

		// Get the path to the quantum script
		const scriptPath = path.join(this.getQuantumScriptPath(), 'shor_n15.py');
		console.log(
			`[JobSchedulerService] Using quantum script path: ${scriptPath}`
		);

		// Verify the script exists
		if (!fs.existsSync(scriptPath)) {
			console.error(
				`[JobSchedulerService] ERROR: Script not found at ${scriptPath}`
			);

			// Update run status to failed
			await lowdbService.updateRunStatus(
				runId,
				'failed',
				`Python script not found at ${scriptPath}`
			);

			return {
				status: 'error',
				error: `Python script not found at ${scriptPath}`,
				logs: [`ERROR: Python script not found at ${scriptPath}`],
			};
		}

		// Determine the Python executable path from virtual environment
		let pythonExecutable = 'python'; // Default fallback
		const projectRoot = getProjectRoot();
		const venvPythonPath = path.join(
			projectRoot,
			'.venv',
			'Scripts',
			'python.exe'
		); // Windows path

		// Check if the venv Python executable exists
		if (fs.existsSync(venvPythonPath)) {
			pythonExecutable = venvPythonPath;
			console.log(
				`[JobSchedulerService] Using Python from virtual environment: ${pythonExecutable}`
			);
		} else {
			console.warn(
				`[JobSchedulerService] Virtual environment Python not found at ${venvPythonPath}, falling back to system Python`
			);
		}

		// Build command arguments
		const args = [
			'--api_token',
			apiToken,
			'--shots',
			shots.toString(),
			'--plot_file',
			plotFilePath,
			'--plot_theme',
			plotTheme,
			'--output_json',
			jsonFilePath,
		];

		// Add run_on_hardware flag if true
		if (runOnHardware) {
			args.push('--run_on_hardware');
		}

		// Store logs
		const logs: string[] = [];

		console.log(
			`[JobSchedulerService] Executing Python script: ${pythonExecutable} ${scriptPath} ${args.join(
				' '
			)}`
		);

		// Execute the script using spawn to capture real-time output
		return new Promise((resolve, reject) => {
			// When using the full path to python.exe, we need to pass the script path as the first argument
			const pythonProcess = spawn(pythonExecutable, [scriptPath, ...args]);

			// Capture stderr output for logs (script logs to stderr)
			pythonProcess.stderr.on('data', (data) => {
				const logLines = data.toString().split('\n').filter(Boolean);
				logs.push(...logLines);
				console.log(`[JobSchedulerService] Log: ${data.toString().trim()}`);

				// Send log update to renderer
				if (this.mainWindow && !this.mainWindow.isDestroyed()) {
					this.mainWindow.webContents.send(
						'quantum-log-update',
						data.toString().trim()
					);
				}
			});

			// Handle process completion
			pythonProcess.on('close', async (code) => {
				console.log(
					`[JobSchedulerService] Python process exited with code ${code}`
				);

				// Check if output JSON exists and is readable
				if (fs.existsSync(jsonFilePath)) {
					try {
						const resultData = JSON.parse(
							fs.readFileSync(jsonFilePath, 'utf8')
						);

						// Check if plot file exists
						const plotExists = fs.existsSync(plotFilePath);
						if (!plotExists) {
							logs.push('WARNING: Plot file was not generated.');
						}

						// Create result object
						const result = {
							status: code === 0 ? 'success' : 'error',
							exitCode: code,
							data: resultData,
							logs: logs,
							plotFilePath: plotExists ? plotFilePath : null,
							jsonFilePath: jsonFilePath,
						};

						// Store result in database if successful
						if (result.status === 'success') {
							await lowdbService.insertQuantumResult(runId, result);
							await lowdbService.updateRunStatus(runId, 'completed');
						} else {
							await lowdbService.updateRunStatus(
								runId,
								'failed',
								'Quantum execution failed with non-zero exit code'
							);
						}

						resolve(result);
					} catch (err: any) {
						console.error(
							'[JobSchedulerService] Error parsing result JSON:',
							err
						);

						// Update run status to failed
						await lowdbService.updateRunStatus(
							runId,
							'failed',
							`Failed to parse result JSON: ${err.message}`
						);

						reject({
							status: 'error',
							error: 'Failed to parse result JSON',
							logs: logs,
							exitCode: code,
						});
					}
				} else {
					console.error('[JobSchedulerService] Result JSON file not found');

					// Update run status to failed
					await lowdbService.updateRunStatus(
						runId,
						'failed',
						'Result file not generated'
					);

					reject({
						status: 'error',
						error: 'Result file not generated',
						logs: logs,
						exitCode: code,
					});
				}
			});

			// Handle process errors
			pythonProcess.on('error', async (err) => {
				console.error(
					'[JobSchedulerService] Failed to start Python process:',
					err
				);

				// Update run status to failed
				await lowdbService.updateRunStatus(
					runId,
					'failed',
					`Failed to start Python process: ${err.message}`
				);

				reject({
					status: 'error',
					error: `Failed to start Python process: ${err.message}`,
					logs: logs,
				});
			});
		});
	}

	/**
	 * Implementation of runGroverSearch
	 */
	private async runGroverSearch(
		apiToken: string,
		markedStates: string,
		shots: number,
		runOnHardware: boolean,
		plotTheme: 'light' | 'dark'
	): Promise<any> {
		console.log(
			'[JobSchedulerService] Starting quantum Grover search execution...'
		);

		// Generate unique filenames for outputs using timestamp and random ID
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2, 10);
		const userDataPath = app.getPath('userData');
		const outputPath = path.join(userDataPath, 'quantum_outputs');

		// Ensure the output directory exists
		if (!fs.existsSync(outputPath)) {
			fs.mkdirSync(outputPath, { recursive: true });
		}

		// Generate paths for output files
		const plotFilePath = path.join(
			outputPath,
			`grover_plot_${timestamp}_${randomId}.png`
		);
		const jsonFilePath = path.join(
			outputPath,
			`grover_result_${timestamp}_${randomId}.json`
		);

		// Create a run record in the database
		const runId = await lowdbService.createRun(
			'Quantum_Grover',
			'Grover',
			markedStates, // Use markedStates as securityParam
			shots
		);

		// Update run status to running
		await lowdbService.updateRunStatus(runId, 'running');

		// Get the path to the quantum script
		const scriptPath = path.join(
			this.getQuantumScriptPath(),
			'grover_search.py'
		);
		console.log(
			`[JobSchedulerService] Using quantum script path: ${scriptPath}`
		);

		// Verify the script exists
		if (!fs.existsSync(scriptPath)) {
			console.error(
				`[JobSchedulerService] ERROR: Script not found at ${scriptPath}`
			);

			// Update run status to failed
			await lowdbService.updateRunStatus(
				runId,
				'failed',
				`Python script not found at ${scriptPath}`
			);

			return {
				status: 'error',
				error: `Python script not found at ${scriptPath}`,
				logs: [`ERROR: Python script not found at ${scriptPath}`],
			};
		}

		// Determine the Python executable path from virtual environment
		let pythonExecutable = 'python'; // Default fallback
		const projectRoot = getProjectRoot();
		const venvPythonPath = path.join(
			projectRoot,
			'.venv',
			'Scripts',
			'python.exe'
		); // Windows path

		// Check if the venv Python executable exists
		if (fs.existsSync(venvPythonPath)) {
			pythonExecutable = venvPythonPath;
			console.log(
				`[JobSchedulerService] Using Python from virtual environment: ${pythonExecutable}`
			);
		} else {
			console.warn(
				`[JobSchedulerService] Virtual environment Python not found at ${venvPythonPath}, falling back to system Python`
			);
		}

		// Build command arguments
		const args = [
			'--api_token',
			apiToken,
			'--marked_states',
			markedStates,
			'--shots',
			shots.toString(),
			'--plot_file',
			plotFilePath,
			'--plot_theme',
			plotTheme,
			'--output_json',
			jsonFilePath,
		];

		// Add run_on_hardware flag if true
		if (runOnHardware) {
			args.push('--run_on_hardware');
		}

		// Store logs
		const logs: string[] = [];

		console.log(
			`[JobSchedulerService] Executing Python script: ${pythonExecutable} ${scriptPath} ${args.join(
				' '
			)}`
		);

		// Execute the script using spawn to capture real-time output
		return new Promise((resolve, reject) => {
			// When using the full path to python.exe, we need to pass the script path as the first argument
			const pythonProcess = spawn(pythonExecutable, [scriptPath, ...args]);

			// Capture stderr output for logs (script logs to stderr)
			pythonProcess.stderr.on('data', (data) => {
				const logLines = data.toString().split('\n').filter(Boolean);
				logs.push(...logLines);
				console.log(`[JobSchedulerService] Log: ${data.toString().trim()}`);

				// Send log update to renderer
				if (this.mainWindow && !this.mainWindow.isDestroyed()) {
					this.mainWindow.webContents.send(
						'quantum-log-update',
						data.toString().trim()
					);
				}
			});

			// Handle process completion
			pythonProcess.on('close', async (code) => {
				console.log(
					`[JobSchedulerService] Python process exited with code ${code}`
				);

				// Check if output JSON exists and is readable
				if (fs.existsSync(jsonFilePath)) {
					try {
						const resultData = JSON.parse(
							fs.readFileSync(jsonFilePath, 'utf8')
						);

						// Check if plot file exists
						const plotExists = fs.existsSync(plotFilePath);
						if (!plotExists) {
							logs.push('WARNING: Plot file was not generated.');
						}

						// For Grover's algorithm, we need to ensure certain fields are set properly for confidence calculation
						const isGroverAlgorithm = runId.includes('Quantum_Grover');
						if (isGroverAlgorithm) {
							// Parse the marked states array
							const markedStatesArray = markedStates
								.split(',')
								.map((s) => s.trim());

							// Ensure the data has found_correct_state property for confidence calculation
							let foundCorrectState = false;

							// If we have raw counts, try to determine if we found a correct state
							if (resultData.raw_counts) {
								// Check if any marked state has a significant count
								for (const state of markedStatesArray) {
									if (
										resultData.raw_counts[state] &&
										resultData.raw_counts[state] > 0
									) {
										foundCorrectState = true;
										break;
									}
								}
							}

							// Create result object with all required fields
							const result = {
								status: code === 0 ? 'success' : 'error',
								exitCode: code,
								data: {
									...resultData,
									input_marked_states: markedStatesArray,
									found_correct_state: foundCorrectState,
									top_measured_state: resultData.top_measured_state || '',
									top_measured_count: resultData.top_measured_count || 0,
								},
								logs: logs,
								plotFilePath: plotExists ? plotFilePath : null,
								jsonFilePath: jsonFilePath,
								// Also set at root level for backward compatibility
								input_marked_states: markedStatesArray,
								found_correct_state: foundCorrectState,
							};

							// Store result in database if successful
							if (result.status === 'success') {
								await lowdbService.insertQuantumResult(runId, result);
								await lowdbService.updateRunStatus(runId, 'completed');
							} else {
								await lowdbService.updateRunStatus(
									runId,
									'failed',
									'Quantum execution failed with non-zero exit code'
								);
							}

							resolve(result);
						} else {
							// Create result object for Shor's algorithm (unchanged)
							const result = {
								status: code === 0 ? 'success' : 'error',
								exitCode: code,
								data: resultData,
								logs: logs,
								plotFilePath: plotExists ? plotFilePath : null,
								jsonFilePath: jsonFilePath,
							};

							// Store result in database if successful
							if (result.status === 'success') {
								await lowdbService.insertQuantumResult(runId, result);
								await lowdbService.updateRunStatus(runId, 'completed');
							} else {
								await lowdbService.updateRunStatus(
									runId,
									'failed',
									'Quantum execution failed with non-zero exit code'
								);
							}

							resolve(result);
						}
					} catch (err: any) {
						console.error(
							'[JobSchedulerService] Error parsing result JSON:',
							err
						);

						// Update run status to failed
						await lowdbService.updateRunStatus(
							runId,
							'failed',
							`Failed to parse result JSON: ${err.message}`
						);

						reject({
							status: 'error',
							error: 'Failed to parse result JSON',
							logs: logs,
							exitCode: code,
						});
					}
				} else {
					console.error('[JobSchedulerService] Result JSON file not found');

					// Update run status to failed
					await lowdbService.updateRunStatus(
						runId,
						'failed',
						'Result file not generated'
					);

					reject({
						status: 'error',
						error: 'Result file not generated',
						logs: logs,
						exitCode: code,
					});
				}
			});

			// Handle process errors
			pythonProcess.on('error', async (err) => {
				console.error(
					'[JobSchedulerService] Failed to start Python process:',
					err
				);

				// Update run status to failed
				await lowdbService.updateRunStatus(
					runId,
					'failed',
					`Failed to start Python process: ${err.message}`
				);

				reject({
					status: 'error',
					error: `Failed to start Python process: ${err.message}`,
					logs: logs,
				});
			});
		});
	}
}

// Create and export singleton instance
export const jobSchedulerService = new JobSchedulerService();
