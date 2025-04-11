import { ipcMain, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { lowdbService } from './db/lowdbService';

// Get the default dataset path
const defaultDatasetPath = path.join(
	app.getPath('userData'),
	'pqc-workbench-results.json'
);

// Create a settings file path for storing dataset history
const settingsPath = path.join(app.getPath('userData'), 'pqc-settings.json');

// Track the current dataset path
let currentDatasetPath = defaultDatasetPath;

// Track imported datasets history
let datasetHistory: { path: string; lastUsed?: boolean }[] = [];

/**
 * Load settings from disk
 */
function loadSettings() {
	try {
		if (fs.existsSync(settingsPath)) {
			const settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
			datasetHistory = settingsData.datasetHistory || [];

			// Find the last used dataset
			const lastUsedDataset = datasetHistory.find((d) => d.lastUsed);
			if (lastUsedDataset) {
				// Verify the file still exists
				if (fs.existsSync(lastUsedDataset.path)) {
					currentDatasetPath = lastUsedDataset.path;
				}
			}
		}
	} catch (error) {
		console.error('Error loading settings:', error);
		// If there's an error, we'll just use the defaults
	}
}

/**
 * Save settings to disk
 */
function saveSettings() {
	try {
		// Update the lastUsed flag
		datasetHistory = datasetHistory.map((dataset) => ({
			...dataset,
			lastUsed: dataset.path === currentDatasetPath,
		}));

		const settingsData = {
			datasetHistory,
		};

		fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
	} catch (error) {
		console.error('Error saving settings:', error);
	}
}

/**
 * Add a dataset to history if it doesn't exist
 */
function addToDatasetHistory(datasetPath: string) {
	if (!datasetHistory.some((d) => d.path === datasetPath)) {
		datasetHistory.push({
			path: datasetPath,
			lastUsed: datasetPath === currentDatasetPath,
		});
		saveSettings();
	} else {
		// Update lastUsed flag
		datasetHistory = datasetHistory.map((dataset) => ({
			...dataset,
			lastUsed: dataset.path === currentDatasetPath,
		}));
		saveSettings();
	}
}

/**
 * Initialize the dataset manager
 */
export function initDatasetManager() {
	// Load settings when the app starts
	loadSettings();

	// Apply the loaded settings to the lowdbService
	lowdbService.switchDatabase(currentDatasetPath);

	// Handler to get the current dataset path
	ipcMain.handle('get-dataset-path', async () => {
		return lowdbService.getDbPath();
	});

	// Handler to get the dataset history
	ipcMain.handle('get-dataset-history', async () => {
		// Filter history to only include datasets that still exist
		datasetHistory = datasetHistory.filter((dataset) => {
			try {
				return fs.existsSync(dataset.path);
			} catch {
				return false;
			}
		});
		saveSettings();
		return datasetHistory;
	});

	// Handler to get stats about a dataset
	ipcMain.handle('get-dataset-stats', async (_, datasetPath) => {
		try {
			// First check if this is the current database path
			if (datasetPath === lowdbService.getDbPath()) {
				// Get stats from the current database
				await lowdbService.ensureLoaded();
				const runs = await lowdbService.getAllRuns();
				const quantumResults = await lowdbService.getAllQuantumResults();
				const pqcClassicalDetails =
					await lowdbService.getAllPqcClassicalDetails();

				return {
					runs: runs.length || 0,
					quantum: quantumResults.length || 0,
					pqcClassical: pqcClassicalDetails.length || 0,
				};
			} else {
				// Otherwise, read directly from the file
				const content = fs.readFileSync(datasetPath, 'utf8');
				const data = JSON.parse(content);

				return {
					runs: data.runs?.length || 0,
					quantum: data.quantumResults?.length || 0,
					pqcClassical: data.pqcClassicalDetails?.length || 0,
				};
			}
		} catch (error) {
			console.error('Error reading dataset stats:', error);
			return {
				runs: 0,
				quantum: 0,
				pqcClassical: 0,
			};
		}
	});

	// Handler to import a dataset
	ipcMain.handle('import-dataset', async () => {
		try {
			const { canceled, filePaths } = await dialog.showOpenDialog({
				title: 'Import Dataset',
				filters: [{ name: 'JSON Files', extensions: ['json'] }],
				properties: ['openFile'],
			});

			if (canceled || filePaths.length === 0) {
				return { success: false, message: 'Import cancelled' };
			}

			const importedPath = filePaths[0];

			// Validate the file exists and is a valid JSON
			if (!fs.existsSync(importedPath)) {
				return { success: false, message: 'Selected file does not exist' };
			}

			try {
				const content = fs.readFileSync(importedPath, 'utf8');
				JSON.parse(content); // Just to validate it's proper JSON
			} catch (error) {
				return {
					success: false,
					message: 'Selected file is not a valid JSON dataset',
				};
			}

			// Switch the lowdbService to use this database
			const success = await lowdbService.switchDatabase(importedPath);

			if (!success) {
				return {
					success: false,
					message: 'Failed to switch to the imported dataset',
				};
			}

			// Update the current dataset path
			currentDatasetPath = importedPath;

			// Add to dataset history
			addToDatasetHistory(importedPath);

			// Get stats for the imported dataset
			const runs = await lowdbService.getAllRuns();
			const quantumResults = await lowdbService.getAllQuantumResults();
			const pqcClassicalDetails =
				await lowdbService.getAllPqcClassicalDetails();

			const stats = {
				runs: runs.length || 0,
				quantum: quantumResults.length || 0,
				pqcClassical: pqcClassicalDetails.length || 0,
			};

			return {
				success: true,
				path: importedPath,
				stats,
			};
		} catch (error: any) {
			console.error('Error importing dataset:', error);
			return {
				success: false,
				message: 'Error importing dataset: ' + error.message,
			};
		}
	});

	// Handler to import a JSON file from a specific path (for drag and drop)
	ipcMain.handle('import-json-from-path', async (_, filePath) => {
		try {
			// Validate the file exists
			if (!fs.existsSync(filePath)) {
				return { success: false, message: 'File does not exist' };
			}

			// Validate it's a JSON file by extension
			if (!filePath.toLowerCase().endsWith('.json')) {
				return { success: false, message: 'File is not a JSON file' };
			}

			// Validate the file is a valid JSON and has the expected structure
			try {
				const content = fs.readFileSync(filePath, 'utf8');
				const jsonData = JSON.parse(content);

				// More comprehensive structure validation
				if (!jsonData || typeof jsonData !== 'object') {
					return {
						success: false,
						message: 'Invalid dataset format: Not a JSON object',
					};
				}

				// Check for required dataset structure
				// Expect runs, quantumResults, and pqcClassicalDetails to be arrays
				if (
					!Array.isArray(jsonData.runs) &&
					!Array.isArray(jsonData.quantumResults) &&
					!Array.isArray(jsonData.pqcClassicalDetails)
				) {
					return {
						success: false,
						message: 'Invalid dataset format: Missing required data structures',
					};
				}
			} catch (error: any) {
				return {
					success: false,
					message: `Invalid JSON file: ${error.message}`,
				};
			}

			// Switch the lowdbService to use this database
			const success = await lowdbService.switchDatabase(filePath);

			if (!success) {
				return {
					success: false,
					message: 'Failed to use the imported dataset',
				};
			}

			// Update the current dataset path
			currentDatasetPath = filePath;

			// Add to dataset history
			addToDatasetHistory(filePath);

			// Get stats for the imported dataset
			const runs = await lowdbService.getAllRuns();
			const quantumResults = await lowdbService.getAllQuantumResults();
			const pqcClassicalDetails =
				await lowdbService.getAllPqcClassicalDetails();

			const stats = {
				runs: runs.length || 0,
				quantum: quantumResults.length || 0,
				pqcClassical: pqcClassicalDetails.length || 0,
			};

			return {
				success: true,
				path: filePath,
				stats,
			};
		} catch (error: any) {
			console.error('Error importing JSON from path:', error);
			return {
				success: false,
				message: 'Error importing dataset: ' + error.message,
			};
		}
	});

	// Handler to save a dataset
	ipcMain.handle('save-dataset', async () => {
		try {
			const { canceled, filePath } = await dialog.showSaveDialog({
				title: 'Save Dataset',
				defaultPath: path.join(app.getPath('documents'), 'dataset.json'),
				filters: [{ name: 'JSON Files', extensions: ['json'] }],
			});

			if (canceled || !filePath) {
				return { success: false, message: 'Save cancelled' };
			}

			// Make sure the current database is saved
			await lowdbService.ensureLoaded();

			// Read the current database file
			const currentData = fs.readFileSync(lowdbService.getDbPath(), 'utf8');

			// Write to the new location
			fs.writeFileSync(filePath, currentData);

			// Add to dataset history
			addToDatasetHistory(filePath);

			return { success: true, path: filePath };
		} catch (error: any) {
			console.error('Error saving dataset:', error);
			return {
				success: false,
				message: 'Error saving dataset: ' + error.message,
			};
		}
	});

	// Handler to switch to a different dataset
	ipcMain.handle('switch-dataset', async (_, datasetPath) => {
		try {
			// Validate the file exists and is a valid JSON
			if (!fs.existsSync(datasetPath)) {
				return { success: false, message: 'Dataset file does not exist' };
			}

			try {
				const content = fs.readFileSync(datasetPath, 'utf8');
				JSON.parse(content); // Just to validate it's proper JSON
			} catch (error) {
				return {
					success: false,
					message: 'Selected file is not a valid JSON dataset',
				};
			}

			// Switch the lowdbService to use this database
			const success = await lowdbService.switchDatabase(datasetPath);

			if (!success) {
				return {
					success: false,
					message: 'Failed to switch to the selected dataset',
				};
			}

			// Update the current dataset path
			currentDatasetPath = datasetPath;

			// Update dataset history
			addToDatasetHistory(datasetPath);

			// Get stats for the dataset using the lowdbService
			const runs = await lowdbService.getAllRuns();
			const quantumResults = await lowdbService.getAllQuantumResults();
			const pqcClassicalDetails =
				await lowdbService.getAllPqcClassicalDetails();

			const stats = {
				runs: runs.length || 0,
				quantum: quantumResults.length || 0,
				pqcClassical: pqcClassicalDetails.length || 0,
			};

			return {
				success: true,
				stats,
			};
		} catch (error: any) {
			console.error('Error switching dataset:', error);
			return {
				success: false,
				message: 'Error switching dataset: ' + error.message,
			};
		}
	});

	// Handler to create a new empty dataset
	ipcMain.handle('create-new-dataset', async () => {
		try {
			// Create a new dataset file path
			const newDatasetPath = path.join(
				app.getPath('temp'),
				`new-dataset-${Date.now()}.json`
			);

			// Create a new empty database using lowdbService
			const success = await lowdbService.createNewDatabase(newDatasetPath);

			if (!success) {
				return {
					success: false,
					message: 'Failed to create new dataset',
				};
			}

			// Update the current dataset path
			currentDatasetPath = newDatasetPath;

			// Add to dataset history
			addToDatasetHistory(newDatasetPath);

			// Get stats for the empty dataset (should be all zeros)
			const stats = {
				runs: 0,
				quantum: 0,
				pqcClassical: 0,
			};

			return {
				success: true,
				path: newDatasetPath,
				stats,
			};
		} catch (error: any) {
			console.error('Error creating new dataset:', error);
			return {
				success: false,
				message: 'Error creating new dataset: ' + error.message,
			};
		}
	});

	// Handler to remove a dataset from history
	ipcMain.handle('remove-dataset-from-history', async (_, datasetPath) => {
		try {
			// Remove the dataset from history
			datasetHistory = datasetHistory.filter(
				(dataset) => dataset.path !== datasetPath
			);

			// Save updated history
			saveSettings();

			// If we removed the current dataset, switch to the first available one or use default
			if (datasetPath === currentDatasetPath) {
				// Find the first dataset in history that exists
				const firstValidDataset = datasetHistory.find((dataset) =>
					fs.existsSync(dataset.path)
				);

				if (firstValidDataset) {
					// Switch to this dataset
					currentDatasetPath = firstValidDataset.path;
					await lowdbService.switchDatabase(currentDatasetPath);

					// Update the lastUsed flags
					datasetHistory = datasetHistory.map((dataset) => ({
						...dataset,
						lastUsed: dataset.path === currentDatasetPath,
					}));
					saveSettings();

					return {
						success: true,
						newCurrentPath: currentDatasetPath,
					};
				} else {
					// Switch to default dataset
					currentDatasetPath = defaultDatasetPath;
					await lowdbService.switchDatabase(currentDatasetPath);

					return {
						success: true,
						newCurrentPath: currentDatasetPath,
					};
				}
			}

			return { success: true };
		} catch (error: any) {
			console.error('Error removing dataset from history:', error);
			return {
				success: false,
				message: 'Error removing dataset from history: ' + error.message,
			};
		}
	});

	// Handler to save a temporary JSON file (for drag and drop operations)
	ipcMain.handle('save-temp-json', async (_, jsonContent, fileName) => {
		try {
			// Create a temporary file name
			const tempDir = path.join(app.getPath('temp'), 'pqcbench');

			// Ensure temp directory exists
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, { recursive: true });
			}

			// Create temp file path with original filename
			const baseName = path.basename(fileName, '.json');
			const tempFilePath = path.join(tempDir, `${baseName}-${Date.now()}.json`);

			// Write the JSON content to the file
			fs.writeFileSync(tempFilePath, jsonContent);

			return {
				success: true,
				path: tempFilePath,
			};
		} catch (error: any) {
			console.error('Error saving temporary JSON file:', error);
			return {
				success: false,
				message: 'Error saving temporary file: ' + error.message,
			};
		}
	});
}
