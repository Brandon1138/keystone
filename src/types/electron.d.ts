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
	}
}

export {}; // This is necessary to make this a module
