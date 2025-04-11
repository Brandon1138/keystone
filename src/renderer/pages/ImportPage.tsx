import React, { useState, useRef, DragEvent } from 'react';
import { DatasetManager } from '../components';
import { Alert, Snackbar } from '@mui/material';

// Custom event for dataset refresh
const DATASET_IMPORTED_EVENT = 'dataset-imported';

/**
 * Import Page Component
 */
export const ImportPage: React.FC = () => {
	const [isDragging, setIsDragging] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const dragCounterRef = useRef(0);

	// Handle drag events
	const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current++;
		if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current--;
		if (dragCounterRef.current === 0) {
			setIsDragging(false);
		}
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		dragCounterRef.current = 0;
		setImportError(null);
		setSuccessMessage(null);

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			const file = e.dataTransfer.files[0];
			// Check if file is a JSON file
			if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
				setImportError('Please drop a valid JSON file.');
				return;
			}

			try {
				// Try different methods to access the file path
				// 1. Direct path property (works in some Electron environments)
				let filePath = (file as any).path;

				// 2. Use Electron-specific properties if available
				if (!filePath) {
					// Try to get file from original event
					const item = e.dataTransfer.items[0];
					if (item?.kind === 'file') {
						const electronFile = item.getAsFile();
						filePath = (electronFile as any)?.path;
					}
				}

				// 3. If we still can't get the path, read the file and save it temporarily
				if (!filePath) {
					// Read the file and create a temporary file
					const reader = new FileReader();

					try {
						const fileContent = await new Promise<string>((resolve, reject) => {
							reader.onload = () => resolve(reader.result as string);
							reader.onerror = reject;
							reader.readAsText(file);
						});

						// Save the file content to a temporary location via IPC
						const tempResult = await window.electron.ipcRenderer.invoke(
							'save-temp-json',
							fileContent,
							file.name
						);

						if (tempResult && tempResult.success) {
							filePath = tempResult.path;
						} else {
							throw new Error(
								tempResult.message || 'Failed to create temporary file'
							);
						}
					} catch (readError) {
						console.error('Error reading file:', readError);
						setImportError(
							'Error reading file: ' + (readError as Error).message
						);
						return;
					}
				}

				if (!filePath) {
					setImportError(
						'Unable to access file path. Please try importing through the Import button instead.'
					);
					return;
				}

				const result = await window.datasetAPI.importJsonFromPath(filePath);
				if (!result.success) {
					setImportError(result.message || 'Failed to import dataset');
				} else {
					setSuccessMessage('Dataset imported successfully!');

					// Dispatch a custom event to notify any listeners (like DatasetManager) that a dataset has been imported
					window.dispatchEvent(
						new CustomEvent(DATASET_IMPORTED_EVENT, { detail: result })
					);
				}
			} catch (error) {
				console.error('Error importing dropped file:', error);
				setImportError('Failed to import dataset: ' + (error as Error).message);
			}
		}
	};

	const handleCloseSuccess = () => {
		setSuccessMessage(null);
	};

	return (
		<div
			className="container relative z-10 px-6 py-4 min-h-[600px]"
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			{importError && (
				<Alert
					severity="error"
					className="mb-4"
					onClose={() => setImportError(null)}
				>
					{importError}
				</Alert>
			)}
			<DatasetManager />
			{isDragging && (
				<div className="absolute inset-0 bg-blue-100 bg-opacity-50 dark:bg-blue-900 dark:bg-opacity-20 z-20 flex items-center justify-center border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-lg">
					<div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
						Drop JSON file to import
					</div>
				</div>
			)}
			<Snackbar
				open={!!successMessage}
				autoHideDuration={5000}
				onClose={handleCloseSuccess}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert onClose={handleCloseSuccess} severity="success">
					{successMessage}
				</Alert>
			</Snackbar>
		</div>
	);
};

export default ImportPage;
