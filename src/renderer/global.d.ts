import { Job } from '../types/jobs';

declare global {
	interface Window {
		jobSchedulerAPI: {
			scheduleJob: (jobDefinition: any) => Promise<Job>;
			getJobQueue: () => Promise<Job[]>;
			cancelJob: (jobId: string) => Promise<boolean>;
			removeJob: (jobId: string) => Promise<boolean>;
			clearQueue?: () => Promise<boolean>;
			onJobQueueUpdate: (callback: (jobs: Job[]) => void) => () => void;
			onJobComplete?: (callback: (job: any) => void) => () => void;
			onJobError?: (callback: (job: any, error: string) => void) => () => void;
		};
		quantumAPI: {
			runQuantumWorkload: (
				apiToken: string,
				shots: number,
				runOnHardware: boolean,
				plotTheme: 'light' | 'dark'
			) => Promise<any>;
			runGroverSearch: (
				apiToken: string,
				markedStates: string,
				shots: number,
				runOnHardware: boolean,
				plotTheme: 'light' | 'dark'
			) => Promise<any>;
			getQuantumPlot: (plotFilePath: string) => Promise<any>;
			saveApiToken: (apiToken: string) => Promise<boolean>;
			loadApiToken: () => Promise<string | null>;
			deleteApiToken: () => Promise<boolean>;
			onLogUpdate: (callback: (log: string) => void) => () => void;
		};
		electron: {
			ipcRenderer: {
				invoke: (channel: string, ...args: any[]) => Promise<any>;
				on: (channel: string, func: (...args: any[]) => void) => void;
				once: (channel: string, func: (...args: any[]) => void) => void;
				removeListener: (
					channel: string,
					func: (...args: any[]) => void
				) => void;
				removeAllListeners: (channel: string) => void;
			};
		};
		process: {
			versions: Record<string, string>;
		};
		electronAPI: {
			kyber: {
				generateKeypair: (secLevel: string) => Promise<any>;
				encapsulate: (secLevel: string, pubKey: any) => Promise<any>;
				decapsulate: (
					secLevel: string,
					secKey: any,
					kemCiphertext: any
				) => Promise<any>;
			};
			dilithium: {
				generateKeypair: (secLevel: string) => Promise<any>;
				sign: (secLevel: string, secKey: any, message: any) => Promise<any>;
				verify: (
					secLevel: string,
					pubKey: any,
					message: any,
					signature: any
				) => Promise<any>;
			};
			nodeCrypto: {
				hkdf: (
					ikm: any,
					length: number,
					salt?: any,
					info?: any
				) => Promise<any>;
				getRandomBytes: (length: number) => Promise<any>;
			};
			utils: {
				bufferToString: (buf: Buffer, enc: BufferEncoding) => string;
				stringToBuffer: (str: string, enc: BufferEncoding) => Buffer;
			};
		};
		databaseAPI: {
			createRun: (
				runType: string,
				algorithm: string,
				securityParam: string,
				iterations: number,
				notes?: string
			) => Promise<string>;
			updateRunStatus: (
				runId: string,
				status: string,
				error?: string
			) => Promise<boolean>;
			getAllRuns: () => Promise<any[]>;
			getRunsByType: (runType: string) => Promise<any[]>;
			getRunsByStatus: (status: string) => Promise<any[]>;
			getRunsByAlgorithm: (algorithm: string) => Promise<any[]>;
			getRunDetails: (runId: string) => Promise<any>;
			insertQuantumResult: (runId: string, resultData: any) => Promise<string>;
			insertPqcClassicalResult: (
				runId: string,
				benchmarkData: any
			) => Promise<string[]>;
			getAllQuantumResults: () => Promise<any[]>;
			getAllPqcClassicalDetails: () => Promise<any[]>;
			getPqcClassicalByAlgorithm: (algorithm: string) => Promise<any[]>;
			deleteRun: (runId: string) => Promise<boolean>;
			clearAllData: () => Promise<void>;
		};
	}
}

export {};
