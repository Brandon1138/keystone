// Import Electron using require with type assertion
const electron = require('electron') as any;
const { app, BrowserWindow } = electron;
import * as path from 'path';
import {
	setupBenchmarkIPC,
	setupEncryptionIPC,
	setupQuantumWorkloadIPC,
	setupDatabaseIPC,
} from './ipc';
import { lowdbService } from './db/lowdbService';

let mainWindow: any = null;

// Enable live reload in development mode
/* Commenting out electron-reload for now to fix errors
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
*/

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
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

	// Load the index.html file from the dist directory
	const indexPath = path.join(__dirname, 'index.html');
	console.log('Loading index.html from:', indexPath);
	mainWindow.loadFile(indexPath); // Remove hash: 'home' since React Router handles routing

	// Open DevTools in development
	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}

	// Handle window close event
	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	return mainWindow;
}

// Initialize the LowDB database
async function initializeDatabase() {
	try {
		await lowdbService.initialize();
		console.log('Database initialized successfully');
	} catch (error) {
		console.error('Error initializing database:', error);
	}
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
	// Initialize the database first
	await initializeDatabase();

	createWindow();
	setupBenchmarkIPC();
	setupEncryptionIPC(); // Set up both Kyber encryption and Dilithium signature IPC handlers
	setupQuantumWorkloadIPC(); // Set up Quantum Workload IPC handlers
	setupDatabaseIPC(); // Set up Database IPC handlers

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
