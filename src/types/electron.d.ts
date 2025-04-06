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
	}
}

export {}; // This is necessary to make this a module
