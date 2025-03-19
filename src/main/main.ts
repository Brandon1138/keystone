import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as childProcess from 'child_process';

// Enable live reload in development mode
if (process.env.NODE_ENV === 'development') {
	try {
		require('electron-reload')(__dirname, {
			electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
			hardResetMethod: 'exit',
		});
		console.log('Electron reload enabled for development');
	} catch (err) {
		console.error('Failed to setup electron-reload:', err);
	}
}

let mainWindow: BrowserWindow | null;
let currentBenchmarkProcess: childProcess.ChildProcess | null = null;

function createWindow() {
	// Create the browser window
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			preload: path.join(__dirname, 'preload.js'),
		},
		// Modern UI touches
		titleBarStyle: 'hidden',
		titleBarOverlay: {
			color: '#1f2937',
			symbolColor: '#f9fafb',
			height: 40,
		},
		backgroundColor: '#111827', // Dark background color
	});

	// Load the index.html file
	mainWindow.loadFile(path.join(__dirname, 'index.html'));

	// Open DevTools in development mode
	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}

	// Handle window close event
	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		// On macOS, re-create a window when the dock icon is clicked and no other windows are open
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// Setup IPC handlers for benchmark execution
ipcMain.handle('run-benchmark', async (event, { algorithm, params }) => {
	console.log(`Running benchmark for ${algorithm} with params: ${params}`);

	try {
		// Path to executables - this will be replaced with actual implementation in Phase 3
		const executablePath = path.join(
			'C:\\Users\\brand\\executables',
			`benchmark_${algorithm}.exe`
		);

		// Spawn the child process
		currentBenchmarkProcess = childProcess.spawn(executablePath, [params], {
			windowsHide: true,
		});

		// This is a placeholder for now
		// In Phase 3, we'll implement proper stdout/stderr handling and parsing
		return {
			success: true,
			message: 'Benchmark execution placeholder',
			algorithm,
			params,
		};
	} catch (error: any) {
		console.error('Error running benchmark:', error);
		return {
			success: false,
			message: 'Failed to run benchmark',
			error: error.toString(),
		};
	}
});

// Handler to stop a running benchmark
ipcMain.handle('stop-benchmark', async (event) => {
	if (currentBenchmarkProcess) {
		// Kill the process in Windows
		try {
			currentBenchmarkProcess.kill();
			currentBenchmarkProcess = null;
			return { success: true, message: 'Benchmark stopped' };
		} catch (error: any) {
			console.error('Error stopping benchmark:', error);
			return {
				success: false,
				message: 'Failed to stop benchmark',
				error: error.toString(),
			};
		}
	} else {
		return { success: false, message: 'No benchmark running' };
	}
});
