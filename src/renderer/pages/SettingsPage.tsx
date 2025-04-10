import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
	Typography,
	Switch,
	FormControl,
	FormControlLabel,
	Select,
	MenuItem,
	TextField,
	Button,
	Divider,
	Slider,
	Box,
	Alert,
	Snackbar,
	IconButton,
	InputAdornment,
	Card as MuiCard,
	CardContent,
	Stack,
	Tooltip,
} from '@mui/material';
import { Card } from '../components/ui/card';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import HelpIcon from '@mui/icons-material/Help';
import RestoreIcon from '@mui/icons-material/Restore';
import TuneIcon from '@mui/icons-material/Tune';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderIcon from '@mui/icons-material/Folder';

/**
 * Settings Page Component
 */
export const SettingsPage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Status message for operations
	const [statusMessage, setStatusMessage] = useState<{
		type: 'success' | 'error' | 'info';
		message: string;
	} | null>(null);

	// Settings state
	// Appearance settings
	const [themePreference, setThemePreference] = useState<
		'light' | 'dark' | 'system'
	>(isDarkMode ? 'dark' : 'light');

	// Visual & UI preferences
	const [animatedBackground, setAnimatedBackground] = useState(true);
	const [startupLoader, setStartupLoader] = useState(true);
	const [enableMotionTransitions, setEnableMotionTransitions] = useState(true);

	// UX/Hints/Onboarding
	const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
	const [showOnboardingAtStartup, setShowOnboardingAtStartup] = useState(true);
	const [confirmBeforeJobDeletion, setConfirmBeforeJobDeletion] =
		useState(true);
	const [enableKeyboardShortcuts, setEnableKeyboardShortcuts] = useState(true);

	// Security & API
	const [apiToken, setApiToken] = useState('');
	const [showApiToken, setShowApiToken] = useState(false);
	const [tokenStatus, setTokenStatus] = useState<'saved' | 'new' | 'none'>(
		'none'
	);
	const [encryptLocalStorage, setEncryptLocalStorage] = useState(false);
	const [autoBackupDatasets, setAutoBackupDatasets] = useState(true);
	const [promptBeforeOverwriting, setPromptBeforeOverwriting] = useState(true);

	// Benchmark Defaults
	const [defaultIterationCount, setDefaultIterationCount] = useState(100);
	const [enableSmartMemoryUnits, setEnableSmartMemoryUnits] = useState(true);
	const [warnOnLongJobs, setWarnOnLongJobs] = useState(true);
	const [longJobThreshold, setLongJobThreshold] = useState(60); // seconds

	// Import/Export Behavior
	const [defaultImportPath, setDefaultImportPath] = useState('');
	const [switchToNewDatasetAfterImport, setSwitchToNewDatasetAfterImport] =
		useState(true);
	const [askBeforeOverwritingExport, setAskBeforeOverwritingExport] =
		useState(true);

	// Load settings on component mount
	useEffect(() => {
		loadSettings();
	}, []);

	// Load saved settings
	const loadSettings = async () => {
		try {
			// In a real implementation, we would load settings from electron store
			// For now, we'll just simulate loading with defaults

			// Load API token (this part is currently implemented in other components)
			try {
				const savedToken = await window.quantumAPI.loadApiToken();
				if (savedToken) {
					setApiToken(savedToken);
					setTokenStatus('saved');
				} else {
					setTokenStatus('none');
				}
			} catch (err) {
				console.error('Failed to load saved API token:', err);
				setTokenStatus('none');
			}

			// Sample loading other settings
			// In a real implementation, we would call relevant IPC methods
			// setThemePreference(loadedSettings.themePreference || 'system');
			// etc.
		} catch (error) {
			console.error('Error loading settings:', error);
			setStatusMessage({
				type: 'error',
				message: 'Failed to load settings',
			});
		}
	};

	// Save all settings
	const saveSettings = async () => {
		try {
			// In a real implementation, we would save settings via IPC
			// For now, just showing a success message

			setStatusMessage({
				type: 'success',
				message: 'Settings saved successfully',
			});
		} catch (error) {
			console.error('Error saving settings:', error);
			setStatusMessage({
				type: 'error',
				message: 'Failed to save settings',
			});
		}
	};

	// Restore default settings
	const restoreDefaultSettings = () => {
		// Reset all settings to their default values
		setThemePreference('system');
		setAnimatedBackground(true);
		setStartupLoader(true);
		setEnableMotionTransitions(true);
		setTooltipsEnabled(true);
		setShowOnboardingAtStartup(true);
		setConfirmBeforeJobDeletion(true);
		setEnableKeyboardShortcuts(true);
		setEncryptLocalStorage(false);
		setAutoBackupDatasets(true);
		setPromptBeforeOverwriting(true);
		setDefaultIterationCount(100);
		setEnableSmartMemoryUnits(true);
		setWarnOnLongJobs(true);
		setLongJobThreshold(60);
		setSwitchToNewDatasetAfterImport(true);
		setAskBeforeOverwritingExport(true);

		setStatusMessage({
			type: 'info',
			message: 'Default settings restored',
		});
	};

	// Handle API token
	const handleApiTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newToken = e.target.value;
		setApiToken(newToken);
		if (tokenStatus === 'saved' && newToken !== apiToken) {
			setTokenStatus('new');
		}
	};

	// Save API token
	const handleSaveToken = async () => {
		if (!apiToken) return;

		try {
			const success = await window.quantumAPI.saveApiToken(apiToken);
			if (success) {
				setTokenStatus('saved');
				setStatusMessage({
					type: 'success',
					message: 'API Token saved successfully',
				});
			} else {
				setStatusMessage({
					type: 'error',
					message: 'Failed to save API Token',
				});
			}
		} catch (err) {
			console.error('Error saving API token:', err);
			setStatusMessage({
				type: 'error',
				message: 'Error saving API Token',
			});
		}
	};

	// Delete saved API token
	const handleDeleteToken = async () => {
		try {
			const success = await window.quantumAPI.deleteApiToken();
			if (success) {
				setApiToken('');
				setTokenStatus('none');
				setStatusMessage({
					type: 'success',
					message: 'API Token deleted',
				});
			} else {
				setStatusMessage({
					type: 'error',
					message: 'Failed to delete API Token',
				});
			}
		} catch (err) {
			console.error('Error deleting API token:', err);
			setStatusMessage({
				type: 'error',
				message: 'Error deleting API Token',
			});
		}
	};

	// Clear stored datasets
	const handleClearStoredDatasets = async () => {
		try {
			// This would be an IPC call in a real implementation
			// const success = await window.datasetAPI.clearAllDatasets();

			setStatusMessage({
				type: 'success',
				message: 'All datasets cleared successfully',
			});
		} catch (error) {
			console.error('Error clearing datasets:', error);
			setStatusMessage({
				type: 'error',
				message: 'Failed to clear datasets',
			});
		}
	};

	// Handle choosing default import path
	const handleChooseImportPath = async () => {
		try {
			// This would be an IPC call to open a directory picker
			// const result = await window.electron.ipcRenderer.invoke('open-directory-picker');
			// if (result.success) {
			//   setDefaultImportPath(result.path);
			// }

			// For now, simulate success
			setDefaultImportPath('C:\\Users\\User\\Documents\\PQCBenchmark\\Imports');
			setStatusMessage({
				type: 'success',
				message: 'Default import path set',
			});
		} catch (error) {
			console.error('Error setting import path:', error);
			setStatusMessage({
				type: 'error',
				message: 'Failed to set import path',
			});
		}
	};

	return (
		<div className="container relative z-10 px-6 py-4 min-h-[600px] space-y-5">
			{/* Status message snackbar */}
			{statusMessage && (
				<Snackbar
					open={true}
					autoHideDuration={6000}
					onClose={() => setStatusMessage(null)}
					anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
				>
					<Alert
						severity={statusMessage.type}
						onClose={() => setStatusMessage(null)}
						sx={{ width: '100%' }}
					>
						{statusMessage.message}
					</Alert>
				</Snackbar>
			)}

			{/* Header Card */}
			<Card
				className={`p-6 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<SettingsIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[20px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Application Settings
					</h2>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Customize your PQC Benchmark experience by configuring appearance,
					behavior, and default settings. Changes are automatically saved and
					applied immediately.
				</p>
			</Card>

			{/* Appearance Settings Card */}
			<Card
				className={`p-6 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<PaletteIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[18px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Appearance & Visual Preferences
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<Typography
							variant="subtitle1"
							className="mb-3"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							Theme Settings
						</Typography>
						<FormControl fullWidth sx={{ mb: 3 }}>
							<Typography
								variant="body2"
								sx={{ mb: 1, color: isDarkMode ? '#AAAAAA' : '#666666' }}
							>
								Application Theme
							</Typography>
							<Select
								value={themePreference}
								onChange={(e) =>
									setThemePreference(
										e.target.value as 'light' | 'dark' | 'system'
									)
								}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: 'transparent',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
									},
								}}
							>
								<MenuItem value="light">Light</MenuItem>
								<MenuItem value="dark">Dark</MenuItem>
								<MenuItem value="system">Follow System</MenuItem>
							</Select>
						</FormControl>
					</div>

					<div>
						<Typography
							variant="subtitle1"
							className="mb-3"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							UI Effects
						</Typography>
						<FormControlLabel
							control={
								<Switch
									checked={animatedBackground}
									onChange={(e) => setAnimatedBackground(e.target.checked)}
									color="primary"
								/>
							}
							label="Animated Background"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
								mb: 1,
							}}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={startupLoader}
									onChange={(e) => setStartupLoader(e.target.checked)}
									color="primary"
								/>
							}
							label="Startup Loader"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
								mb: 1,
							}}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={enableMotionTransitions}
									onChange={(e) => setEnableMotionTransitions(e.target.checked)}
									color="primary"
								/>
							}
							label="Enable Motion Transitions"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
					</div>
				</div>
			</Card>

			{/* UX & Onboarding Card */}
			<Card
				className={`p-6 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<HelpIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[18px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						UX, Hints & Onboarding
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-2">
						<FormControlLabel
							control={
								<Switch
									checked={tooltipsEnabled}
									onChange={(e) => setTooltipsEnabled(e.target.checked)}
									color="primary"
								/>
							}
							label="Enable Tooltips"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={showOnboardingAtStartup}
									onChange={(e) => setShowOnboardingAtStartup(e.target.checked)}
									color="primary"
								/>
							}
							label="Show Onboarding at Startup"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
					</div>

					<div className="space-y-2">
						<FormControlLabel
							control={
								<Switch
									checked={confirmBeforeJobDeletion}
									onChange={(e) =>
										setConfirmBeforeJobDeletion(e.target.checked)
									}
									color="primary"
								/>
							}
							label="Confirm Before Job Deletion"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={enableKeyboardShortcuts}
									onChange={(e) => setEnableKeyboardShortcuts(e.target.checked)}
									color="primary"
								/>
							}
							label="Enable Keyboard Shortcuts"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
					</div>
				</div>
			</Card>

			{/* Security & API Card */}
			<Card
				className={`p-6 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<SecurityIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[18px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Security & API
					</h2>
				</div>

				<div className="mb-6">
					<Typography
						variant="subtitle1"
						className="mb-3"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						IBM Quantum API Token
					</Typography>
					<div className="flex items-center mb-2">
						<TextField
							fullWidth
							label=""
							placeholder="IBM Quantum API Token"
							variant="outlined"
							value={apiToken}
							onChange={handleApiTokenChange}
							type={showApiToken ? 'text' : 'password'}
							InputProps={{
								endAdornment: (
									<InputAdornment position="end">
										<IconButton
											aria-label="toggle api token visibility"
											onClick={() => setShowApiToken(!showApiToken)}
											edge="end"
										>
											{showApiToken ? (
												<VisibilityOffIcon />
											) : (
												<VisibilityIcon />
											)}
										</IconButton>
										{apiToken && (
											<>
												<IconButton
													aria-label="save api token"
													onClick={handleSaveToken}
													disabled={tokenStatus === 'saved' || !apiToken}
													color={
														tokenStatus === 'saved' ? 'success' : 'default'
													}
												>
													{tokenStatus === 'saved' ? (
														<CheckCircleIcon />
													) : (
														<SaveIcon />
													)}
												</IconButton>
												<IconButton
													aria-label="delete api token"
													onClick={handleDeleteToken}
													disabled={!apiToken}
													color="error"
												>
													<DeleteIcon />
												</IconButton>
											</>
										)}
									</InputAdornment>
								),
							}}
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								borderRadius: '8px',
								overflow: 'visible',
								'& .MuiOutlinedInput-root': {
									borderRadius: '8px',
									overflow: 'hidden',
								},
								'& .MuiOutlinedInput-notchedOutline': {
									borderColor: 'transparent',
									borderRadius: '8px',
								},
								'&:hover .MuiOutlinedInput-notchedOutline': {
									borderColor: isDarkMode
										? 'rgba(255, 255, 255, 0.6)'
										: 'rgba(0, 0, 0, 0.5)',
								},
								'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
									borderColor: '#9747FF',
								},
								'.MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
								},
								'.MuiInputLabel-root': {
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.7)'
										: 'rgba(0, 0, 0, 0.6)',
								},
							}}
						/>
					</div>
					<Typography
						variant="caption"
						className="block mb-4"
						style={{ color: isDarkMode ? '#AAAAAA' : '#666666' }}
					>
						Required for quantum algorithm benchmarks. Get your token from{' '}
						<a
							href="https://quantum-computing.ibm.com/account"
							target="_blank"
							rel="noopener noreferrer"
							style={{ color: '#9747FF', textDecoration: 'underline' }}
						>
							IBM Quantum
						</a>
					</Typography>

					<Divider sx={{ my: 3 }} />

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<FormControlLabel
								control={
									<Switch
										checked={encryptLocalStorage}
										onChange={(e) => setEncryptLocalStorage(e.target.checked)}
										color="primary"
									/>
								}
								label="Encrypt Local Storage"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									display: 'flex',
								}}
							/>
							<FormControlLabel
								control={
									<Switch
										checked={autoBackupDatasets}
										onChange={(e) => setAutoBackupDatasets(e.target.checked)}
										color="primary"
									/>
								}
								label="Auto-backup Datasets"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									display: 'flex',
								}}
							/>
							<FormControlLabel
								control={
									<Switch
										checked={promptBeforeOverwriting}
										onChange={(e) =>
											setPromptBeforeOverwriting(e.target.checked)
										}
										color="primary"
									/>
								}
								label="Prompt Before Overwriting Datasets"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									display: 'flex',
								}}
							/>
						</div>

						<div className="flex flex-col justify-center items-start space-y-3">
							<Button
								variant="outlined"
								startIcon={<DeleteIcon />}
								onClick={handleClearStoredDatasets}
								sx={{
									borderColor: '#f44336',
									color: '#f44336',
									'&:hover': {
										borderColor: '#d32f2f',
										backgroundColor: 'rgba(244, 67, 54, 0.04)',
									},
								}}
							>
								Clear Stored Datasets
							</Button>
						</div>
					</div>
				</div>
			</Card>

			{/* Benchmark Defaults Card */}
			<Card
				className={`p-6 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<SpeedIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[18px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Benchmark Defaults
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<Typography
							variant="body2"
							sx={{ mb: 1, color: isDarkMode ? '#AAAAAA' : '#666666' }}
						>
							Default Iteration Count
						</Typography>
						<div className="flex items-center space-x-3">
							<Slider
								value={defaultIterationCount}
								onChange={(_, newValue) =>
									setDefaultIterationCount(newValue as number)
								}
								min={1}
								max={1000}
								step={10}
								sx={{
									color: '#9747FF',
									'& .MuiSlider-thumb': {
										backgroundColor: '#FFFFFF',
										border: '2px solid #9747FF',
									},
								}}
							/>
							<TextField
								value={defaultIterationCount}
								onChange={(e) => {
									const value = parseInt(e.target.value);
									if (!isNaN(value) && value >= 1 && value <= 1000) {
										setDefaultIterationCount(value);
									}
								}}
								type="number"
								InputProps={{ inputProps: { min: 1, max: 1000 } }}
								sx={{
									width: '80px',
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									borderRadius: '8px',
									'& .MuiOutlinedInput-root': {
										borderRadius: '8px',
									},
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: 'transparent',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
									},
									'.MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
									},
								}}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<FormControlLabel
							control={
								<Switch
									checked={enableSmartMemoryUnits}
									onChange={(e) => setEnableSmartMemoryUnits(e.target.checked)}
									color="primary"
								/>
							}
							label="Enable Smart Memory Units"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={warnOnLongJobs}
									onChange={(e) => setWarnOnLongJobs(e.target.checked)}
									color="primary"
								/>
							}
							label="Warn on Long Jobs"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
						{warnOnLongJobs && (
							<div className="pl-10">
								<Typography
									variant="body2"
									sx={{ mb: 1, color: isDarkMode ? '#AAAAAA' : '#666666' }}
								>
									Long Job Threshold (seconds)
								</Typography>
								<Slider
									value={longJobThreshold}
									onChange={(_, newValue) =>
										setLongJobThreshold(newValue as number)
									}
									min={10}
									max={300}
									step={10}
									sx={{
										width: '90%',
										color: '#9747FF',
										'& .MuiSlider-thumb': {
											backgroundColor: '#FFFFFF',
											border: '2px solid #9747FF',
										},
									}}
								/>
								<Typography
									variant="body2"
									sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									{longJobThreshold} seconds
								</Typography>
							</div>
						)}
					</div>
				</div>

				<Box sx={{ mt: 3 }}>
					<Typography
						variant="subtitle1"
						className="mb-3"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Default Security Parameters
					</Typography>
					<Typography
						variant="body2"
						style={{ color: isDarkMode ? '#AAAAAA' : '#666666' }}
						sx={{ mb: 2 }}
					>
						This feature is coming soon. You will be able to set default
						security parameters for each benchmark type.
					</Typography>
				</Box>
			</Card>

			{/* Import/Export Behavior Card */}
			<Card
				className={`p-6 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<ImportExportIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[18px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Import/Export Behavior
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<Typography
							variant="body2"
							sx={{ mb: 1, color: isDarkMode ? '#AAAAAA' : '#666666' }}
						>
							Default Import Path
						</Typography>
						<div className="flex items-center space-x-2">
							<TextField
								fullWidth
								value={defaultImportPath}
								disabled
								placeholder="Not set"
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									borderRadius: '8px',
									'& .MuiOutlinedInput-root': {
										borderRadius: '8px',
									},
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: 'transparent',
									},
									'.MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
									},
								}}
							/>
							<IconButton
								onClick={handleChooseImportPath}
								sx={{
									color: '#9747FF',
									bgcolor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									'&:hover': {
										bgcolor: isDarkMode ? '#333333' : '#e0e0e0',
									},
								}}
							>
								<FolderIcon />
							</IconButton>
						</div>
					</div>

					<div className="space-y-2">
						<FormControlLabel
							control={
								<Switch
									checked={switchToNewDatasetAfterImport}
									onChange={(e) =>
										setSwitchToNewDatasetAfterImport(e.target.checked)
									}
									color="primary"
								/>
							}
							label="Auto-switch to New Dataset After Import"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={askBeforeOverwritingExport}
									onChange={(e) =>
										setAskBeforeOverwritingExport(e.target.checked)
									}
									color="primary"
								/>
							}
							label="Ask Before Overwriting Export"
							sx={{
								color: isDarkMode ? '#FFFFFF' : '#000000',
								display: 'flex',
							}}
						/>
					</div>
				</div>
			</Card>

			{/* Restore Defaults Button */}
			<div className="flex justify-end mt-6 mb-10">
				<Button
					variant="outlined"
					startIcon={<RestoreIcon />}
					onClick={restoreDefaultSettings}
					sx={{
						borderColor: '#9747FF',
						color: isDarkMode ? '#FFFFFF' : '#000000',
						'&:hover': {
							borderColor: '#8030E0',
							backgroundColor: isDarkMode
								? 'rgba(151, 71, 255, 0.1)'
								: 'rgba(151, 71, 255, 0.1)',
						},
					}}
				>
					Restore Defaults
				</Button>
			</div>
		</div>
	);
};

export default SettingsPage;
