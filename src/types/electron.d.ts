// Type definitions for Electron IPC
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
		process: {
			versions: {
				chrome: string;
				node: string;
				electron: string;
			};
		};

		// Quantum API for Shor's algorithm
		quantumAPI: {
			runQuantumWorkload(
				apiToken: string,
				shots: number,
				runOnHardware: boolean,
				plotTheme: 'light' | 'dark'
			): Promise<{
				status: 'success' | 'error';
				exitCode?: number;
				data?: any;
				logs?: string[];
				plotFilePath?: string | null;
				jsonFilePath?: string;
				error?: string;
			}>;

			runGroverSearch(
				apiToken: string,
				markedStates: string,
				shots: number,
				runOnHardware: boolean,
				plotTheme: 'light' | 'dark'
			): Promise<{
				status: 'success' | 'error';
				exitCode?: number;
				data?: any;
				logs?: string[];
				plotFilePath?: string | null;
				jsonFilePath?: string;
				error?: string;
			}>;

			getQuantumPlot(plotFilePath: string): Promise<{
				status: 'success' | 'error';
				plotBase64?: string;
				error?: string;
			}>;

			onLogUpdate(callback: (logMessage: string) => void): () => void;

			// API Token management
			saveApiToken(apiToken: string): Promise<boolean>;
			loadApiToken(): Promise<string | null>;
			deleteApiToken(): Promise<boolean>;
		};

		// Job Scheduler API
		jobSchedulerAPI: {
			scheduleJob(job: any): Promise<boolean>;
			getJobQueue(): Promise<any[]>;
			cancelJob(jobId: string): Promise<boolean>;
			clearQueue(): Promise<boolean>;
			removeJob(jobId: string): Promise<boolean>;
			onJobQueueUpdate(callback: (jobs: any[]) => void): () => void;
			onJobComplete(callback: (job: any) => void): () => void;
			onJobError(callback: (job: any, error: string) => void): () => void;
		};

		// Database API for benchmark storage
		databaseAPI: {
			// Run-related functions
			createRun(
				runType: 'PQC_Classical' | 'Quantum_Shor' | 'Quantum_Grover',
				algorithm?: string,
				securityParam?: string,
				iterations?: number,
				notes?: string
			): Promise<string>;

			updateRunStatus(
				runId: string,
				status: 'pending' | 'running' | 'completed' | 'failed',
				error?: string
			): Promise<boolean>;

			getAllRuns(): Promise<
				Array<{
					runId: string;
					timestamp: string;
					runType: 'PQC_Classical' | 'Quantum_Shor' | 'Quantum_Grover';
					status: 'pending' | 'running' | 'completed' | 'failed';
					algorithm?: string;
					securityParam?: string;
					iterations?: number;
					error?: string;
					notes?: string;
				}>
			>;

			getRunsByType(
				runType: 'PQC_Classical' | 'Quantum_Shor' | 'Quantum_Grover'
			): Promise<Array<any>>;

			getRunsByStatus(
				status: 'pending' | 'running' | 'completed' | 'failed'
			): Promise<Array<any>>;

			getRunsByAlgorithm(algorithm: string): Promise<Array<any>>;

			getRunDetails(runId: string): Promise<{
				run: any;
				details: Array<any>;
			}>;

			// Result-related functions
			insertQuantumResult(runId: string, resultData: any): Promise<string>;

			insertPqcClassicalResult(
				runId: string,
				benchmarkData: any
			): Promise<string[]>;

			getAllQuantumResults(): Promise<Array<any>>;

			getAllPqcClassicalDetails(): Promise<Array<any>>;

			getPqcClassicalByAlgorithm(algorithm: string): Promise<Array<any>>;

			// Delete operations
			deleteRun(runId: string): Promise<boolean>;

			clearAllData(): Promise<boolean>;
		};
	}
}

export {}; // This is necessary to make this a module
