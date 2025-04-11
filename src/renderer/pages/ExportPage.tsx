import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
	Button,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	SelectChangeEvent,
	TextField,
	Typography,
	CircularProgress,
	Checkbox,
	FormControlLabel,
	Alert,
	Snackbar,
	Box,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	ListItemButton,
	Divider,
	Skeleton,
	InputAdornment,
} from '@mui/material';
import { Card } from '../components/ui/card';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import ComputerIcon from '@mui/icons-material/Computer';
import MemoryIcon from '@mui/icons-material/Memory';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

// Types for our export data
interface ExportData {
	runs: any[];
	pqcClassicalDetails: any[];
	quantumResults: any[];
}

interface ExportStats {
	runs: number;
	pqc: number;
	quantum: number;
	dataSize: string;
}

/**
 * Export Data Page Component
 */
const ExportPage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [selectedFormat, setSelectedFormat] = useState<string>('csv');
	const [isExporting, setIsExporting] = useState(false);
	const [filename, setFilename] = useState('pqc_benchmark_data');
	const [exportPath, setExportPath] = useState<string>('');
	const [statusMessage, setStatusMessage] = useState<{
		type: 'success' | 'error' | 'info';
		message: string;
	} | null>(null);

	// Data state
	const [exportData, setExportData] = useState<ExportData | null>(null);
	const [exportStats, setExportStats] = useState<ExportStats>({
		runs: 0,
		pqc: 0,
		quantum: 0,
		dataSize: '0 KB',
	});
	const [dataLoading, setDataLoading] = useState(true);

	// Selection state
	const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({
		pqcRuns: true,
		quantumRuns: true,
		includeMetadata: true,
	});

	// Load export data when the component mounts
	useEffect(() => {
		const timer = setTimeout(() => {
			loadExportData();
			loadDefaultExportPath();
		}, 10);
		return () => clearTimeout(timer);
	}, []);

	// Format file size helper
	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	// Load data to export
	const loadExportData = async () => {
		setDataLoading(true);
		try {
			// Get all runs data using IPC
			const runsData = await window.electron.ipcRenderer.invoke('get-all-runs');
			const pqcDetails = await window.electron.ipcRenderer.invoke(
				'get-all-pqc-classical-details'
			);
			const quantumData = await window.electron.ipcRenderer.invoke(
				'get-all-quantum-results'
			);

			setExportData({
				runs: runsData || [],
				pqcClassicalDetails: pqcDetails || [],
				quantumResults: quantumData || [],
			});

			// Calculate stats
			const totalSize = JSON.stringify({
				runs: runsData,
				pqcClassicalDetails: pqcDetails,
				quantumResults: quantumData,
			}).length;

			setExportStats({
				runs: runsData?.length || 0,
				pqc: pqcDetails?.length || 0,
				quantum: quantumData?.length || 0,
				dataSize: formatFileSize(totalSize),
			});

			// Set selection defaults based on available data
			setSelectedItems({
				pqcRuns: pqcDetails?.length > 0,
				quantumRuns: quantumData?.length > 0,
				includeMetadata: true,
			});
		} catch (error) {
			console.error('Error loading export data:', error);
			setStatusMessage({
				type: 'error',
				message: 'Failed to load benchmark data for export',
			});
		} finally {
			setDataLoading(false);
		}
	};

	// Load default export path
	const loadDefaultExportPath = async () => {
		try {
			const defaultPath = await window.electron.ipcRenderer.invoke(
				'get-default-export-path'
			);
			setExportPath(defaultPath || '');
		} catch (error) {
			console.error('Error loading default export path:', error);
		}
	};

	const handleSelectExportPath = async () => {
		try {
			const result = await window.electron.ipcRenderer.invoke(
				'select-export-directory'
			);
			if (result && result.success) {
				setExportPath(result.path);
			}
		} catch (error) {
			console.error('Error selecting export path:', error);
			setStatusMessage({
				type: 'error',
				message: 'Failed to select export directory',
			});
		}
	};

	const handleFormatChange = (event: SelectChangeEvent) => {
		setSelectedFormat(event.target.value);
	};

	const handleFilenameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFilename(event.target.value);
	};

	const handleItemSelectionChange = (item: string) => {
		setSelectedItems((prev) => ({
			...prev,
			[item]: !prev[item],
		}));
	};

	const prepareExportData = (): any => {
		if (!exportData) return {};

		// Filter runs based on selection
		const selectedRuns = exportData.runs.filter((run) => {
			if (run.runType === 'PQC_Classical' && selectedItems.pqcRuns) return true;
			if (
				(run.runType === 'Quantum_Shor' || run.runType === 'Quantum_Grover') &&
				selectedItems.quantumRuns
			)
				return true;
			return false;
		});

		// Get all run IDs that are selected
		const selectedRunIds = selectedRuns.map((run) => run.runId);

		// Filter details based on selected runs
		const filteredPqcDetails = selectedItems.pqcRuns
			? exportData.pqcClassicalDetails.filter((detail) =>
					selectedRunIds.includes(detail.runId)
			  )
			: [];

		const filteredQuantumResults = selectedItems.quantumRuns
			? exportData.quantumResults.filter((result) =>
					selectedRunIds.includes(result.runId)
			  )
			: [];

		return {
			runs: selectedRuns,
			pqcClassicalDetails: filteredPqcDetails,
			quantumResults: filteredQuantumResults,
			metadata: selectedItems.includeMetadata
				? {
						exportDate: new Date().toISOString(),
						systemInfo: {
							os: window.process?.versions || 'Unknown OS',
							appVersion: 'PQC Workbench v1.0',
						},
				  }
				: undefined,
		};
	};

	const handleExport = async () => {
		if (!exportData || (exportStats.pqc === 0 && exportStats.quantum === 0)) {
			setStatusMessage({
				type: 'error',
				message: 'No data available to export',
			});
			return;
		}

		setIsExporting(true);
		setStatusMessage({
			type: 'info',
			message: 'Preparing data for export...',
		});

		try {
			// Prepare data based on selection
			const dataToExport = prepareExportData();

			// Call export function based on format
			const result = await window.electron.ipcRenderer.invoke(
				'export-dataset',
				{
					format: selectedFormat,
					filename: filename || 'pqc_benchmark_data',
					data: dataToExport,
					exportPath: exportPath,
				}
			);

			if (result.success) {
				setStatusMessage({
					type: 'success',
					message: `Data successfully exported to ${result.path}`,
				});
			} else {
				setStatusMessage({
					type: 'error',
					message: result.message || 'Export failed',
				});
			}
		} catch (error) {
			console.error('Export error:', error);
			setStatusMessage({
				type: 'error',
				message: `Export failed: ${
					(error as Error).message || 'Unknown error'
				}`,
			});
		} finally {
			setIsExporting(false);
		}
	};

	// Render a message when no data is available
	const renderNoDataMessage = () => (
		<div className="flex flex-col items-center justify-center h-[200px]">
			<DataUsageIcon
				style={{
					color: isDarkMode ? '#555555' : '#CCCCCC',
					fontSize: '48px',
					marginBottom: '16px',
				}}
			/>
			<Typography
				variant="body1"
				align="center"
				style={{ color: isDarkMode ? '#AAAAAA' : '#888888' }}
			>
				No benchmark data available to export.
				<br />
				Run some benchmarks first.
			</Typography>
		</div>
	);

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

			{/* Main Card */}
			<Card
				className={`p-6 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<FileDownloadIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[20px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Export Data
					</h2>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Export your benchmark results in various formats for analysis,
					sharing, or reporting. Select which data to include and choose from
					CSV, JSON, or PDF formats to best suit your needs and workflow.
				</p>

				{/* Export Format Selection */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
					<div className="space-y-4">
						<FormControl fullWidth variant="outlined">
							<InputLabel
								id="filename-label"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									padding: '0 5px',
									zIndex: 1,
									transform: 'translate(14px, -9px) scale(0.75)',
									'&.MuiInputLabel-shrink': {
										transform: 'translate(14px, -9px) scale(0.75)',
									},
								}}
								shrink
							>
								Filename
							</InputLabel>
							<TextField
								id="filename"
								value={filename}
								onChange={handleFilenameChange}
								placeholder="pqc_benchmark_data"
								variant="outlined"
								disabled={isExporting || dataLoading}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									borderRadius: '8px',
									overflow: 'visible',
									'& .MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
									},
									'& .MuiOutlinedInput-root': {
										borderRadius: '8px',
										overflow: 'hidden',
										'& fieldset': {
											borderColor: 'transparent',
											borderRadius: '8px',
										},
									},
									'&:hover .MuiOutlinedInput-root fieldset': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'& .MuiOutlinedInput-root.Mui-focused fieldset': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								}}
							/>
						</FormControl>

						<FormControl fullWidth variant="outlined">
							<InputLabel
								id="export-path-label"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									padding: '0 5px',
									zIndex: 1,
									transform: 'translate(14px, -9px) scale(0.75)',
									'&.MuiInputLabel-shrink': {
										transform: 'translate(14px, -9px) scale(0.75)',
									},
								}}
								shrink
							>
								Export File Path
							</InputLabel>
							<TextField
								id="export-path"
								value={exportPath}
								placeholder="Select a directory..."
								variant="outlined"
								disabled={isExporting || dataLoading}
								InputProps={{
									readOnly: true,
									endAdornment: (
										<InputAdornment position="end">
											<Button
												onClick={handleSelectExportPath}
												disabled={isExporting || dataLoading}
												sx={{
													minWidth: 'auto',
													padding: '4px',
													color: '#9747FF',
												}}
											>
												<FolderOpenIcon />
											</Button>
										</InputAdornment>
									),
								}}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									borderRadius: '8px',
									overflow: 'visible',
									'& .MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
										cursor: 'default',
										textOverflow: 'ellipsis',
									},
									'& .MuiOutlinedInput-root': {
										borderRadius: '8px',
										overflow: 'hidden',
										'& fieldset': {
											borderColor: 'transparent',
											borderRadius: '8px',
										},
									},
									'&:hover .MuiOutlinedInput-root fieldset': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'& .MuiOutlinedInput-root.Mui-focused fieldset': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								}}
							/>
						</FormControl>
					</div>

					<div>
						{/* Data summary */}
						<Box
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								borderRadius: '8px',
								padding: '10px 16px',
								height: '100%',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'center',
							}}
						>
							{dataLoading ? (
								<div className="flex flex-col space-y-2">
									<Typography
										variant="body2"
										sx={{ color: isDarkMode ? '#AAAAAA' : '#777777', mb: 1 }}
									>
										Available Data:
									</Typography>
									{[1, 2, 3].map((item) => (
										<div
											key={item}
											className="flex items-center justify-between py-1"
										>
											<Skeleton
												variant="text"
												width="40%"
												sx={{
													bgcolor: isDarkMode
														? 'rgba(255, 255, 255, 0.1)'
														: 'rgba(0, 0, 0, 0.08)',
												}}
											/>
											<Skeleton
												variant="text"
												width="20%"
												sx={{
													bgcolor: isDarkMode
														? 'rgba(255, 255, 255, 0.1)'
														: 'rgba(0, 0, 0, 0.08)',
												}}
											/>
										</div>
									))}
								</div>
							) : (
								<>
									<Typography
										variant="body2"
										sx={{ color: isDarkMode ? '#AAAAAA' : '#777777', mb: 1 }}
									>
										Available Data:
									</Typography>
									<div className="flex items-center justify-between">
										<Typography
											sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
										>
											<SpeedIcon
												fontSize="small"
												sx={{
													color: '#9747FF',
													verticalAlign: 'middle',
													mr: 1,
												}}
											/>
											PQC Runs:
										</Typography>
										<Typography
											sx={{
												color: isDarkMode ? '#FFFFFF' : '#000000',
												fontWeight: 'medium',
											}}
										>
											{exportStats.pqc}
										</Typography>
									</div>
									<div className="flex items-center justify-between">
										<Typography
											sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
										>
											<MemoryIcon
												fontSize="small"
												sx={{
													color: '#9747FF',
													verticalAlign: 'middle',
													mr: 1,
												}}
											/>
											Quantum Runs:
										</Typography>
										<Typography
											sx={{
												color: isDarkMode ? '#FFFFFF' : '#000000',
												fontWeight: 'medium',
											}}
										>
											{exportStats.quantum}
										</Typography>
									</div>
									<div className="flex items-center justify-between">
										<Typography
											sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
										>
											<DataUsageIcon
												fontSize="small"
												sx={{
													color: '#9747FF',
													verticalAlign: 'middle',
													mr: 1,
												}}
											/>
											Data Size:
										</Typography>
										<Typography
											sx={{
												color: isDarkMode ? '#FFFFFF' : '#000000',
												fontWeight: 'medium',
											}}
										>
											{exportStats.dataSize}
										</Typography>
									</div>
								</>
							)}
						</Box>
					</div>

					<div className="space-y-4">
						<FormControl fullWidth variant="outlined">
							<InputLabel
								id="format-label"
								sx={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									padding: '0 5px',
									zIndex: 1,
									transform: 'translate(14px, -9px) scale(0.75)',
									'&.MuiInputLabel-shrink': {
										transform: 'translate(14px, -9px) scale(0.75)',
									},
								}}
								shrink
							>
								Export Format
							</InputLabel>
							<Select
								labelId="format-label"
								id="format"
								value={selectedFormat}
								onChange={handleFormatChange}
								disabled={isExporting || dataLoading}
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
										borderWidth: '1px',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								}}
							>
								<MenuItem value="csv">CSV (Comma Separated Values)</MenuItem>
								<MenuItem value="json">
									JSON (JavaScript Object Notation)
								</MenuItem>
								<MenuItem value="pdf">PDF (Portable Document Format)</MenuItem>
							</Select>
						</FormControl>

						<Button
							variant="contained"
							onClick={handleExport}
							disabled={
								isExporting ||
								dataLoading ||
								(exportStats.pqc === 0 && exportStats.quantum === 0)
							}
							startIcon={
								isExporting ? (
									<CircularProgress size={20} color="inherit" />
								) : (
									<FileDownloadIcon />
								)
							}
							sx={{
								backgroundColor: '#9747FF',
								color: '#FFFFFF',
								padding: '10px 20px',
								borderRadius: '8px',
								fontWeight: 'medium',
								width: '100%',
								'&:hover': {
									backgroundColor: '#8035E0',
								},
								'&.Mui-disabled': {
									backgroundColor: isDarkMode
										? 'rgba(255, 255, 255, 0.12)'
										: 'rgba(0, 0, 0, 0.12)',
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.3)'
										: 'rgba(0, 0, 0, 0.3)',
								},
							}}
						>
							{isExporting ? 'Exporting...' : 'Export Data'}
						</Button>
					</div>
				</div>
			</Card>

			{/* Benchmarks Selection Card */}
			<Card
				className={`p-6 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<FormatListBulletedIcon
						style={{ color: '#9747FF' }}
						className="mr-3"
					/>
					<h2
						className="text-[20px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Data to Export
					</h2>
				</div>

				<div
					className={`p-4 rounded-lg mb-6 ${
						isDarkMode ? 'bg-[#2a2a2a]' : 'bg-[#f8f8f8]'
					}`}
					style={{ maxHeight: '300px', overflowY: 'auto', minHeight: '200px' }}
				>
					{dataLoading ? (
						<div className="flex flex-col justify-center space-y-2 py-4">
							<Skeleton
								variant="rectangular"
								width="100%"
								height={60}
								sx={{
									borderRadius: '8px',
									bgcolor: isDarkMode
										? 'rgba(255, 255, 255, 0.1)'
										: 'rgba(0, 0, 0, 0.08)',
								}}
							/>
							<Skeleton
								variant="rectangular"
								width="100%"
								height={60}
								sx={{
									borderRadius: '8px',
									bgcolor: isDarkMode
										? 'rgba(255, 255, 255, 0.1)'
										: 'rgba(0, 0, 0, 0.08)',
								}}
							/>
						</div>
					) : exportStats.pqc === 0 && exportStats.quantum === 0 ? (
						renderNoDataMessage()
					) : (
						<List sx={{ width: '100%' }}>
							{/* PQC/Classical Benchmark Results */}
							{exportStats.pqc > 0 && (
								<>
									<ListItemButton
										onClick={() => handleItemSelectionChange('pqcRuns')}
										sx={{
											backgroundColor: isDarkMode ? '#363636' : '#f0f0f0',
											borderRadius: '8px',
											marginBottom: '8px',
										}}
									>
										<ListItemIcon>
											<SpeedIcon style={{ color: '#9747FF' }} />
										</ListItemIcon>
										<ListItemText
											primary={
												<Typography
													sx={{
														color: isDarkMode ? '#FFFFFF' : '#000000',
														fontWeight: 'medium',
													}}
												>
													PQC & Classical Benchmarks
												</Typography>
											}
											secondary={`${exportStats.pqc} results`}
										/>
										<Checkbox
											edge="end"
											checked={selectedItems.pqcRuns}
											sx={{
												color: isDarkMode ? '#888' : '#555',
												'&.Mui-checked': {
													color: '#9747FF',
												},
											}}
										/>
									</ListItemButton>
								</>
							)}

							{/* Quantum Algorithm Results */}
							{exportStats.quantum > 0 && (
								<>
									<ListItemButton
										onClick={() => handleItemSelectionChange('quantumRuns')}
										sx={{
											backgroundColor: isDarkMode ? '#363636' : '#f0f0f0',
											borderRadius: '8px',
											marginBottom: '8px',
										}}
									>
										<ListItemIcon>
											<MemoryIcon style={{ color: '#9747FF' }} />
										</ListItemIcon>
										<ListItemText
											primary={
												<Typography
													sx={{
														color: isDarkMode ? '#FFFFFF' : '#000000',
														fontWeight: 'medium',
													}}
												>
													Quantum Algorithm Results
												</Typography>
											}
											secondary={`${exportStats.quantum} results`}
										/>
										<Checkbox
											edge="end"
											checked={selectedItems.quantumRuns}
											sx={{
												color: isDarkMode ? '#888' : '#555',
												'&.Mui-checked': {
													color: '#9747FF',
												},
											}}
										/>
									</ListItemButton>
								</>
							)}
						</List>
					)}
				</div>
			</Card>
		</div>
	);
};

export default ExportPage;
