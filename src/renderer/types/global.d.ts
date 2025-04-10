// src/renderer/types/global.d.ts

interface Window {
	electron: {
		ipcRenderer: {
			invoke: (channel: string, ...args: any[]) => Promise<any>;
			on: (channel: string, func: (...args: any[]) => void) => void;
			once: (channel: string, func: (...args: any[]) => void) => void;
			removeListener: (
				channel: string,
				listener: (...args: any[]) => void
			) => void;
			removeAllListeners: (channel: string) => void;
		};
	};

	// Interface for the dataset API
	datasetAPI: {
		getDatasetPath: () => Promise<string>;
		getDatasetHistory: () => Promise<
			Array<{
				path: string;
				lastUsed?: boolean;
			}>
		>;
		getDatasetStats: (datasetPath: string) => Promise<{
			runs: number;
			quantum: number;
			pqcClassical: number;
		}>;
		importDataset: () => Promise<
			| {
					success: true;
					path: string;
					stats?: {
						runs: number;
						quantum: number;
						pqcClassical: number;
					};
			  }
			| {
					success: false;
					message?: string;
			  }
		>;
		importJsonFromPath: (filePath: string) => Promise<
			| {
					success: true;
					path: string;
					stats?: {
						runs: number;
						quantum: number;
						pqcClassical: number;
					};
			  }
			| {
					success: false;
					message?: string;
			  }
		>;
		saveDataset: () => Promise<{
			success: boolean;
			message?: string;
			path?: string;
		}>;
		switchDataset: (datasetPath: string) => Promise<{
			success: boolean;
			message?: string;
			stats?: {
				runs: number;
				quantum: number;
				pqcClassical: number;
			};
		}>;
		createNewDataset: () => Promise<
			| {
					success: true;
					path: string;
					stats: {
						runs: number;
						quantum: number;
						pqcClassical: number;
					};
			  }
			| {
					success: false;
					message: string;
			  }
		>;
	};

	// Existing APIs
	electronAPI: any;
	quantumAPI: any;
	databaseAPI: any;
}
