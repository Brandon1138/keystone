import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { useTheme } from '@mui/material/styles';
import {
	Button,
	TextField,
	CircularProgress,
	Snackbar,
	Alert,
	Typography,
	Divider,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Skeleton,
	Box,
	IconButton,
	Tooltip,
} from '@mui/material';
import ImportIcon from '@mui/icons-material/Upload';
import SaveIcon from '@mui/icons-material/Save';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteIcon from '@mui/icons-material/Delete';

interface DatasetInfo {
	path: string;
	lastUsed?: boolean;
	stats?: {
		runs: number;
		quantum: number;
		pqcClassical: number;
	};
}

export const DatasetManager: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// State for the current dataset and any imported datasets
	const [currentDataset, setCurrentDataset] = useState<DatasetInfo | null>(
		null
	);
	const [importedDatasets, setImportedDatasets] = useState<DatasetInfo[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true
	const [isInitialized, setIsInitialized] = useState<boolean>(false);

	// Dialog state
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

	// Dialog state for delete confirmation
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);

	// State for notifications
	const [notification, setNotification] = useState<{
		open: boolean;
		message: string;
		severity: 'success' | 'error' | 'info' | 'warning';
	}>({
		open: false,
		message: '',
		severity: 'info',
	});

	// Load the dataset history and current dataset on component mount
	useEffect(() => {
		const initializeDataManager = async () => {
			try {
				// We'll keep isLoading as true at the start

				// Use Promise.all to load current path and history in parallel
				const [currentPath, history] = await Promise.all([
					window.datasetAPI.getDatasetPath(),
					window.datasetAPI.getDatasetHistory() as Promise<
						Array<{ path: string; lastUsed?: boolean }>
					>,
				]);

				// Filter out datasets that no longer exist and load stats for all datasets
				const validDatasets: DatasetInfo[] = [];

				// Load stats for all datasets in parallel
				const datasetPromises = history.map(async (dataset) => {
					try {
						const stats = await window.datasetAPI.getDatasetStats(dataset.path);
						const datasetInfo: DatasetInfo = {
							...dataset,
							stats,
						};

						// If this is the current dataset, update currentDataset state
						if (dataset.path === currentPath) {
							setCurrentDataset(datasetInfo);
						}

						return datasetInfo;
					} catch (error) {
						console.warn(`Failed to load stats for dataset: ${dataset.path}`);
						return null; // Skip invalid datasets
					}
				});

				// Wait for all dataset stats to load
				const loadedDatasetResults = await Promise.all(datasetPromises);
				// Filter out null results and cast to DatasetInfo[]
				const loadedDatasets: DatasetInfo[] = loadedDatasetResults
					.filter((result): result is DatasetInfo => result !== null)
					.map((result) => result as DatasetInfo);

				setImportedDatasets(loadedDatasets);
				setIsInitialized(true);
			} catch (error) {
				console.error('Failed to initialize dataset manager:', error);
				showNotification('Failed to initialize dataset manager', 'error');
			} finally {
				// Only set loading to false after everything is done
				setIsLoading(false);
			}
		};

		initializeDataManager();
	}, []);

	// Listen for dataset import events (from drag and drop)
	useEffect(() => {
		// Define the type for our custom event
		type DatasetImportedEvent = CustomEvent<{
			success: boolean;
			path: string;
			stats?: {
				runs: number;
				quantum: number;
				pqcClassical: number;
			};
		}>;

		// Handler for dataset imported event
		const handleDatasetImported = async (event: Event) => {
			// Cast to our custom event type
			const customEvent = event as DatasetImportedEvent;
			if (customEvent.detail && customEvent.detail.success) {
				try {
					// Get updated dataset history
					const history: Array<{ path: string; lastUsed?: boolean }> =
						await window.datasetAPI.getDatasetHistory();

					// Refresh imported datasets with the updated history
					const updatedDatasets = await Promise.all(
						history.map(async (dataset) => {
							const stats = await window.datasetAPI.getDatasetStats(
								dataset.path
							);
							return { ...dataset, stats };
						})
					);

					setImportedDatasets(updatedDatasets);

					// Update current dataset
					if (customEvent.detail.path) {
						setCurrentDataset({
							path: customEvent.detail.path,
							lastUsed: true,
							stats: customEvent.detail.stats,
						});
					}
				} catch (error) {
					console.error('Failed to refresh after dataset import:', error);
				}
			}
		};

		// Add event listener - the function takes an Event parameter which matches EventListener
		window.addEventListener('dataset-imported', handleDatasetImported);

		// Cleanup
		return () => {
			window.removeEventListener('dataset-imported', handleDatasetImported);
		};
	}, []);

	// Function to refresh dataset stats when needed
	const refreshDatasetStats = async (datasetPath: string) => {
		try {
			const stats = await window.datasetAPI.getDatasetStats(datasetPath);

			// Update the current dataset if it matches
			if (currentDataset && currentDataset.path === datasetPath) {
				setCurrentDataset((prev) => (prev ? { ...prev, stats } : null));
			}

			// Update in the imported datasets list
			setImportedDatasets((prev) =>
				prev.map((dataset) =>
					dataset.path === datasetPath ? { ...dataset, stats } : dataset
				)
			);

			return stats;
		} catch (error) {
			console.error(
				`Failed to refresh stats for dataset: ${datasetPath}`,
				error
			);
			return null;
		}
	};

	const showNotification = (
		message: string,
		severity: 'success' | 'error' | 'info' | 'warning' = 'info'
	) => {
		setNotification({
			open: true,
			message,
			severity,
		});
	};

	const handleCloseNotification = () => {
		setNotification((prev) => ({ ...prev, open: false }));
	};

	const handleImportDataset = async () => {
		try {
			setIsLoading(true);
			const result = await window.datasetAPI.importDataset();

			if (result.success) {
				showNotification('Dataset imported successfully!', 'success');

				// Get updated dataset history
				const history: Array<{ path: string; lastUsed?: boolean }> =
					await window.datasetAPI.getDatasetHistory();

				// Refresh imported datasets with the updated history
				const updatedDatasets = await Promise.all(
					history.map(async (dataset) => {
						const stats = await window.datasetAPI.getDatasetStats(dataset.path);
						return { ...dataset, stats };
					})
				);

				setImportedDatasets(updatedDatasets);

				// Update current dataset
				setCurrentDataset({
					path: result.path,
					lastUsed: true,
					stats: result.stats,
				});
			} else {
				showNotification(result.message || 'Failed to import dataset', 'error');
			}
		} catch (error) {
			console.error('Failed to import dataset:', error);
			showNotification('Failed to import dataset', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveDataset = async () => {
		try {
			setIsLoading(true);
			const result = await window.datasetAPI.saveDataset();

			if (result.success) {
				showNotification('Dataset saved successfully!', 'success');

				// Get updated dataset history after save
				const history: Array<{ path: string; lastUsed?: boolean }> =
					await window.datasetAPI.getDatasetHistory();

				// Refresh imported datasets with the updated history
				const updatedDatasets = await Promise.all(
					history.map(async (dataset) => {
						const stats = await window.datasetAPI.getDatasetStats(dataset.path);
						return { ...dataset, stats };
					})
				);

				setImportedDatasets(updatedDatasets);
			} else {
				showNotification(result.message || 'Failed to save dataset', 'error');
			}
		} catch (error) {
			console.error('Failed to save dataset:', error);
			showNotification('Failed to save dataset', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const handleSwitchToDataset = async (datasetPath: string) => {
		try {
			setIsLoading(true);
			const result = await window.datasetAPI.switchDataset(datasetPath);

			if (result.success) {
				showNotification('Switched to dataset successfully!', 'success');

				// Get updated dataset history after switch
				const history: Array<{ path: string; lastUsed?: boolean }> =
					await window.datasetAPI.getDatasetHistory();

				// Find the new current dataset in history
				const newCurrentDataset = history.find((d) => d.path === datasetPath);

				if (newCurrentDataset) {
					// Update current dataset
					setCurrentDataset({
						path: datasetPath,
						lastUsed: true,
						stats: result.stats,
					});

					// Refresh imported datasets with updated lastUsed flags
					const updatedDatasets = history.map((dataset) => ({
						...dataset,
						stats: importedDatasets.find((d) => d.path === dataset.path)?.stats,
					}));

					setImportedDatasets(updatedDatasets);
				}
			} else {
				showNotification(result.message || 'Failed to switch dataset', 'error');
			}
		} catch (error) {
			console.error('Failed to switch dataset:', error);
			showNotification('Failed to switch dataset', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	// Add a new handler for creating a new dataset
	const handleCreateNewDataset = async () => {
		try {
			// Check if current dataset has data
			if (
				currentDataset?.stats &&
				(currentDataset.stats.runs > 0 ||
					currentDataset.stats.quantum > 0 ||
					currentDataset.stats.pqcClassical > 0)
			) {
				// Show styled dialog instead of window.confirm
				setConfirmDialogOpen(true);
			} else {
				// Current dataset is empty or null, proceed directly
				await createNewDataset();
			}
		} catch (error) {
			console.error('Error handling new dataset creation:', error);
			showNotification('Failed to create new dataset', 'error');
		}
	};

	// Handle dialog confirmation (Save and Create New)
	const handleSaveAndCreateNew = async () => {
		setConfirmDialogOpen(false);
		try {
			setIsLoading(true);
			// First save the current dataset
			const saveResult = await window.datasetAPI.saveDataset();
			if (saveResult.success) {
				showNotification('Current dataset saved successfully', 'success');
				// Then create new dataset
				await createNewDataset();
			} else {
				showNotification(
					saveResult.message || 'Failed to save current dataset',
					'error'
				);
			}
		} catch (error) {
			console.error('Error saving and creating new dataset:', error);
			showNotification('Failed to complete operation', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	// Handle dialog rejection (Don't Save, Just Create New)
	const handleJustCreateNew = () => {
		setConfirmDialogOpen(false);
		createNewDataset();
	};

	// Handle dialog cancellation (Cancel the whole operation)
	const handleCancelOperation = () => {
		setConfirmDialogOpen(false);
		// Do nothing else - operation is cancelled
	};

	// Helper to create a new dataset
	const createNewDataset = async () => {
		try {
			setIsLoading(true);
			const result = await window.datasetAPI.createNewDataset();

			if (result.success) {
				showNotification('New dataset created successfully!', 'success');

				// Get updated dataset history
				const history: Array<{ path: string; lastUsed?: boolean }> =
					await window.datasetAPI.getDatasetHistory();

				// Refresh imported datasets with the updated history
				const updatedDatasets = await Promise.all(
					history.map(async (dataset) => {
						// Reuse existing stats if available, otherwise get new stats
						const existingDataset = importedDatasets.find(
							(d) => d.path === dataset.path
						);
						const stats =
							existingDataset?.stats ||
							(await window.datasetAPI.getDatasetStats(dataset.path));
						return { ...dataset, stats };
					})
				);

				setImportedDatasets(updatedDatasets);

				// Update current dataset
				setCurrentDataset({
					path: result.path,
					lastUsed: true,
					stats: result.stats,
				});
			} else {
				showNotification(
					result.message || 'Failed to create new dataset',
					'error'
				);
			}
		} catch (error) {
			console.error('Failed to create new dataset:', error);
			showNotification('Failed to create new dataset', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	// Function to format the file path for display
	const formatPath = (path: string) => {
		const maxLength = 60;
		if (path.length <= maxLength) return path;

		const start = path.substring(0, 20);
		const end = path.substring(path.length - 30);
		return `${start}...${end}`;
	};

	// Handler to remove a dataset from history
	const handleRemoveDataset = async (datasetPath: string) => {
		try {
			setDatasetToDelete(datasetPath);
			setDeleteDialogOpen(true);
		} catch (error) {
			console.error('Error preparing to delete dataset:', error);
			showNotification('Error preparing to delete dataset', 'error');
		}
	};

	// Handler to confirm dataset deletion
	const handleConfirmDelete = async () => {
		if (!datasetToDelete) return;

		try {
			setIsLoading(true);
			setDeleteDialogOpen(false);

			// Use the API method if available, otherwise fallback to direct IPC
			let result;
			if (window.datasetAPI.removeDatasetFromHistory) {
				result = await window.datasetAPI.removeDatasetFromHistory(
					datasetToDelete
				);
			} else {
				// Fallback to direct IPC if API method is not defined
				result = await window.electron.ipcRenderer.invoke(
					'remove-dataset-from-history',
					datasetToDelete
				);
			}

			if (result.success) {
				showNotification('Dataset removed from history', 'success');

				// Get updated dataset history
				const history: Array<{ path: string; lastUsed?: boolean }> =
					await window.datasetAPI.getDatasetHistory();

				// Refresh imported datasets with the updated history
				const updatedDatasets = await Promise.all(
					history.map(async (dataset) => {
						const stats = await window.datasetAPI.getDatasetStats(dataset.path);
						return { ...dataset, stats };
					})
				);

				setImportedDatasets(updatedDatasets);

				// If the current dataset was changed, update it
				if (result.newCurrentPath) {
					const stats = await window.datasetAPI.getDatasetStats(
						result.newCurrentPath
					);
					setCurrentDataset({
						path: result.newCurrentPath,
						lastUsed: true,
						stats,
					});
				}
			} else {
				showNotification(result.message || 'Failed to remove dataset', 'error');
			}
		} catch (error) {
			console.error('Error removing dataset:', error);
			showNotification('Failed to remove dataset', 'error');
		} finally {
			setIsLoading(false);
			setDatasetToDelete(null);
		}
	};

	// Handler to cancel dataset deletion
	const handleCancelDelete = () => {
		setDeleteDialogOpen(false);
		setDatasetToDelete(null);
	};

	return (
		<div className="space-y-5">
			{/* Header Card */}
			<Card
				className={`p-6 mb-5 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<ImportIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[20px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Import & Manage Datasets
					</h2>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Import, save, and switch between different benchmark datasets. This
					allows you to work with multiple datasets simultaneously.
				</p>

				{/* Action Buttons */}
				<div className="flex space-x-4">
					<Button
						variant="contained"
						disableElevation
						onClick={handleImportDataset}
						disabled={isLoading}
						sx={{
							bgcolor: '#9747FF',
							'&:hover': {
								bgcolor: '#8030E0',
							},
							fontSize: '0.9rem',
							padding: '10px 24px',
							textTransform: 'uppercase',
							fontWeight: 'bold',
							borderRadius: '8px',
							opacity: isLoading ? 0.7 : 1,
							cursor: isLoading ? 'not-allowed' : 'pointer',
						}}
						startIcon={
							isLoading ? (
								<CircularProgress size={20} color="inherit" />
							) : (
								<ImportIcon />
							)
						}
					>
						IMPORT DATASET
					</Button>
					<Button
						variant="outlined"
						disableElevation
						onClick={handleSaveDataset}
						disabled={isLoading}
						sx={{
							color: isDarkMode ? '#FFFFFF' : '#000000',
							borderColor: isDarkMode
								? 'rgba(255, 255, 255, 0.3)'
								: 'rgba(0, 0, 0, 0.23)',
							'&:hover': {
								borderColor: '#9747FF',
								bgcolor: 'rgba(151, 71, 255, 0.04)',
							},
							fontSize: '0.9rem',
							padding: '10px 24px',
							textTransform: 'uppercase',
							fontWeight: 'bold',
							borderRadius: '8px',
						}}
						startIcon={<SaveIcon />}
					>
						SAVE DATASET
					</Button>
					<Button
						variant="outlined"
						disableElevation
						onClick={handleCreateNewDataset}
						disabled={isLoading}
						sx={{
							color: isDarkMode ? '#FFFFFF' : '#000000',
							borderColor: isDarkMode
								? 'rgba(255, 255, 255, 0.3)'
								: 'rgba(0, 0, 0, 0.23)',
							'&:hover': {
								borderColor: '#9747FF',
								bgcolor: 'rgba(151, 71, 255, 0.04)',
							},
							fontSize: '0.9rem',
							padding: '10px 24px',
							textTransform: 'uppercase',
							fontWeight: 'bold',
							borderRadius: '8px',
						}}
						startIcon={<AddIcon />}
					>
						NEW DATASET
					</Button>
				</div>
			</Card>

			{/* Current Dataset Card */}
			<Card
				className={`p-6 mb-5 rounded-xl shadow-md transition-all min-h-[220px] ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<InfoIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h3
						className="text-[18px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Current Dataset
					</h3>
				</div>

				{isLoading ? (
					<div className="space-y-4">
						{/* Skeleton for the text field */}
						<Skeleton
							variant="rectangular"
							height={56}
							sx={{
								bgcolor: isDarkMode
									? 'rgba(255, 255, 255, 0.1)'
									: 'rgba(0, 0, 0, 0.05)',
								borderRadius: '8px',
								marginBottom: '12px',
							}}
						/>

						{/* Skeletons for the stats boxes */}
						<div className="grid grid-cols-3 gap-4">
							{[1, 2, 3].map((i) => (
								<Skeleton
									key={i}
									variant="rectangular"
									height={80}
									sx={{
										bgcolor: isDarkMode
											? 'rgba(255, 255, 255, 0.1)'
											: 'rgba(0, 0, 0, 0.05)',
										borderRadius: '8px',
									}}
								/>
							))}
						</div>
					</div>
				) : (
					<div className="transition-opacity duration-300">
						<TextField
							fullWidth
							variant="outlined"
							value={currentDataset?.path || 'No dataset loaded'}
							InputProps={{
								readOnly: true,
								sx: {
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#FFFFFF' : '#000000',
									borderRadius: '8px',
								},
							}}
							sx={{
								mb: 3,
								'& .MuiOutlinedInput-notchedOutline': {
									borderColor: 'transparent',
								},
								'&:hover .MuiOutlinedInput-notchedOutline': {
									borderColor: isDarkMode
										? 'rgba(255, 255, 255, 0.6)'
										: 'rgba(0, 0, 0, 0.5)',
									borderWidth: '1px',
								},
							}}
						/>

						{currentDataset?.stats && (
							<div className="grid grid-cols-3 gap-4 mb-4">
								<div
									className="text-center p-3 rounded-lg"
									style={{
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
										minHeight: '80px',
									}}
								>
									<Typography
										variant="h5"
										sx={{ color: '#9747FF', fontWeight: 'bold' }}
									>
										{currentDataset.stats.runs}
									</Typography>
									<Typography
										variant="body2"
										sx={{ color: isDarkMode ? '#CCCCCC' : '#666666' }}
									>
										Total Runs
									</Typography>
								</div>
								<div
									className="text-center p-3 rounded-lg"
									style={{
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
										minHeight: '80px',
									}}
								>
									<Typography
										variant="h5"
										sx={{ color: '#9747FF', fontWeight: 'bold' }}
									>
										{currentDataset.stats.quantum}
									</Typography>
									<Typography
										variant="body2"
										sx={{ color: isDarkMode ? '#CCCCCC' : '#666666' }}
									>
										Quantum Results
									</Typography>
								</div>
								<div
									className="text-center p-3 rounded-lg"
									style={{
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
										minHeight: '80px',
									}}
								>
									<Typography
										variant="h5"
										sx={{ color: '#9747FF', fontWeight: 'bold' }}
									>
										{currentDataset.stats.pqcClassical}
									</Typography>
									<Typography
										variant="body2"
										sx={{ color: isDarkMode ? '#CCCCCC' : '#666666' }}
									>
										PQC/Classical Results
									</Typography>
								</div>
							</div>
						)}
					</div>
				)}
			</Card>

			{/* Imported Datasets Card */}
			<Card
				className={`p-6 mb-5 rounded-xl shadow-md transition-all min-h-[200px] ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<SwapHorizIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h3
						className="text-[18px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Available Datasets
					</h3>
				</div>

				{isLoading ? (
					<div className="space-y-3">
						{/* Skeleton loaders for available datasets */}
						{[1, 2, 3].map((i) => (
							<Skeleton
								key={i}
								variant="rectangular"
								height={72}
								sx={{
									bgcolor: isDarkMode
										? 'rgba(255, 255, 255, 0.1)'
										: 'rgba(0, 0, 0, 0.05)',
									borderRadius: '8px',
								}}
							/>
						))}
					</div>
				) : importedDatasets.length === 0 ? (
					<div className="flex items-center justify-center h-[120px]">
						<p
							className="text-center"
							style={{ color: isDarkMode ? '#AAAAAA' : '#666666' }}
						>
							No datasets have been imported. Import a dataset to get started.
						</p>
					</div>
				) : (
					<div className="space-y-3 transition-opacity duration-300">
						{importedDatasets.map((dataset, index) => (
							<div
								key={index}
								className={`p-4 rounded-lg flex items-center justify-between ${
									isDarkMode ? 'bg-[#2a2a2a]' : 'bg-[#f8f8f8]'
								} ${dataset.lastUsed ? 'border-l-4 border-[#9747FF]' : ''}`}
							>
								<div className="flex-1 mr-4 truncate">
									<Typography
										variant="body2"
										sx={{
											color: isDarkMode ? '#FFFFFF' : '#000000',
											fontWeight: dataset.lastUsed ? 'bold' : 'medium',
										}}
									>
										{formatPath(dataset.path)}
									</Typography>
									{dataset.stats && (
										<Typography
											variant="caption"
											sx={{ color: isDarkMode ? '#AAAAAA' : '#666666' }}
										>
											{dataset.stats.runs} runs, {dataset.stats.quantum}{' '}
											quantum, {dataset.stats.pqcClassical} PQC/classical
										</Typography>
									)}
								</div>
								<div className="flex items-center space-x-2">
									<Tooltip title="Remove from history">
										<IconButton
											size="small"
											onClick={() => handleRemoveDataset(dataset.path)}
											sx={{
												color: isDarkMode ? '#AAAAAA' : '#666666',
												'&:hover': {
													color: '#F44336',
												},
											}}
										>
											<DeleteIcon fontSize="small" />
										</IconButton>
									</Tooltip>
									<Button
										variant="contained"
										size="small"
										disableElevation
										onClick={() => handleSwitchToDataset(dataset.path)}
										disabled={
											isLoading || currentDataset?.path === dataset.path
										}
										sx={{
											bgcolor:
												currentDataset?.path === dataset.path
													? '#6C757D'
													: '#9747FF',
											'&:hover': {
												bgcolor:
													currentDataset?.path === dataset.path
														? '#6C757D'
														: '#8030E0',
											},
											fontSize: '0.7rem',
											borderRadius: '6px',
										}}
									>
										{currentDataset?.path === dataset.path
											? 'ACTIVE'
											: 'SWITCH'}
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</Card>

			{/* Confirmation Dialog */}
			<Dialog
				open={confirmDialogOpen}
				onClose={handleCancelOperation}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
				PaperProps={{
					style: {
						backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
						color: isDarkMode ? '#FFFFFF' : '#000000',
						borderRadius: '8px',
					},
				}}
			>
				<DialogTitle
					id="alert-dialog-title"
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						color: isDarkMode ? '#FFFFFF' : '#000000',
					}}
				>
					<WarningIcon sx={{ color: '#9747FF' }} />
					Unsaved Dataset
				</DialogTitle>
				<DialogContent>
					<DialogContentText
						id="alert-dialog-description"
						sx={{ color: isDarkMode ? '#CCCCCC' : '#666666' }}
					>
						The current dataset contains data that may be lost. Would you like
						to save it first?
					</DialogContentText>
				</DialogContent>
				<DialogActions sx={{ padding: '16px' }}>
					<Button
						onClick={handleCancelOperation}
						sx={{
							color: isDarkMode ? '#FFFFFF' : '#000000',
							borderColor: isDarkMode
								? 'rgba(255, 255, 255, 0.3)'
								: 'rgba(0, 0, 0, 0.23)',
							'&:hover': {
								borderColor: '#9747FF',
								bgcolor: 'rgba(151, 71, 255, 0.04)',
							},
						}}
					>
						Cancel
					</Button>
					<Button
						onClick={handleJustCreateNew}
						sx={{
							color: isDarkMode ? '#FFFFFF' : '#000000',
							borderColor: isDarkMode
								? 'rgba(255, 255, 255, 0.3)'
								: 'rgba(0, 0, 0, 0.23)',
							'&:hover': {
								borderColor: '#9747FF',
								bgcolor: 'rgba(151, 71, 255, 0.04)',
							},
						}}
					>
						Don't Save
					</Button>
					<Button
						onClick={handleSaveAndCreateNew}
						variant="contained"
						disableElevation
						sx={{
							bgcolor: '#9747FF',
							'&:hover': {
								bgcolor: '#8030E0',
							},
						}}
					>
						Save & Continue
					</Button>
				</DialogActions>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={deleteDialogOpen}
				onClose={handleCancelDelete}
				aria-labelledby="delete-dialog-title"
				aria-describedby="delete-dialog-description"
				PaperProps={{
					style: {
						backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
						color: isDarkMode ? '#FFFFFF' : '#000000',
						borderRadius: '8px',
					},
				}}
			>
				<DialogTitle
					id="delete-dialog-title"
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						color: isDarkMode ? '#FFFFFF' : '#000000',
					}}
				>
					<DeleteIcon sx={{ color: '#F44336' }} />
					Remove Dataset
				</DialogTitle>
				<DialogContent>
					<DialogContentText
						id="delete-dialog-description"
						sx={{ color: isDarkMode ? '#CCCCCC' : '#666666' }}
					>
						Are you sure you want to remove this dataset from your history? This
						will not delete the file from your system, but it will no longer
						appear in the list.
					</DialogContentText>
				</DialogContent>
				<DialogActions sx={{ padding: '16px' }}>
					<Button
						onClick={handleCancelDelete}
						sx={{
							color: isDarkMode ? '#FFFFFF' : '#000000',
							borderColor: isDarkMode
								? 'rgba(255, 255, 255, 0.3)'
								: 'rgba(0, 0, 0, 0.23)',
							'&:hover': {
								borderColor: '#9747FF',
								bgcolor: 'rgba(151, 71, 255, 0.04)',
							},
						}}
					>
						Cancel
					</Button>
					<Button
						onClick={handleConfirmDelete}
						variant="contained"
						disableElevation
						sx={{
							bgcolor: '#F44336',
							'&:hover': {
								bgcolor: '#D32F2F',
							},
						}}
					>
						Remove
					</Button>
				</DialogActions>
			</Dialog>

			{/* Notification Snackbar */}
			<Snackbar
				open={notification.open}
				autoHideDuration={6000}
				onClose={handleCloseNotification}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
			>
				<Alert
					onClose={handleCloseNotification}
					severity={notification.severity}
					variant="filled"
					sx={{ width: '100%' }}
				>
					{notification.message}
				</Alert>
			</Snackbar>
		</div>
	);
};

export default DatasetManager;
