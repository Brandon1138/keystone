import React, { useState, useEffect, ChangeEvent } from 'react';
import {
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TextField,
	Button,
	FormControlLabel,
	Radio,
	RadioGroup,
	FormLabel,
	Grid,
	Typography,
	Divider,
	Box,
	useTheme,
	CircularProgress,
	SelectChangeEvent,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Switch,
	IconButton,
	Checkbox,
	List,
	ListItem,
	ListItemText,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
	SUPPORTED_ALGORITHMS,
	SECURITY_PARAMS,
} from '../../../types/benchmark';
import { getAlgorithmInfo } from '../../utils/algorithm-categories';
import { Card } from './card';
import AddTaskIcon from '@mui/icons-material/AddTask';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowAllIcon from '@mui/icons-material/PlaylistPlay';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Define default iterations based on algorithm type
const getDefaultIterations = (algorithm: string): number => {
	// 10000 for Kyber and AES
	if (['kyber', 'aes'].includes(algorithm.toLowerCase())) {
		return 10000;
	}
	// 1000 for Dilithium, Falcon, ECDH, ECDSA
	if (
		['dilithium', 'falcon', 'ecdh', 'ecdsa'].includes(algorithm.toLowerCase())
	) {
		return 1000;
	}
	// 100 for McEliece, SPHINCS+ and RSA
	if (['mceliece', 'sphincs', 'rsa'].includes(algorithm.toLowerCase())) {
		return 100;
	}
	// Default fallback
	return 1000;
};

// Default shot counts for quantum algorithms
const DEFAULT_SHOR_SHOTS = 4096;
const DEFAULT_GROVER_SHOTS = 8196;

// Interface for batch job settings
interface BatchJobSettings {
	[algorithm: string]: {
		securityParameter: string;
		iterations: number;
	};
}

interface JobSchedulerFormProps {
	onJobScheduled: () => void;
}

const JobSchedulerForm: React.FC<JobSchedulerFormProps> = ({
	onJobScheduled,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// State for form fields
	const [jobType, setJobType] = useState<'benchmark' | 'quantum'>('benchmark');
	const [algorithm, setAlgorithm] = useState<string>(SUPPORTED_ALGORITHMS[0]);
	const [securityParameter, setSecurityParameter] = useState<string>('');
	const [iterations, setIterations] = useState<number>(
		getDefaultIterations(SUPPORTED_ALGORITHMS[0])
	);
	const [quantumAlgorithm, setQuantumAlgorithm] = useState<'shor' | 'grover'>(
		'shor'
	);
	const [shotCount, setShotCount] = useState<number>(DEFAULT_SHOR_SHOTS);
	const [target, setTarget] = useState<'simulation' | 'real_hardware'>(
		'simulation'
	);
	const [markedStates, setMarkedStates] = useState<string>('101, 010');
	const [numberOfRuns, setNumberOfRuns] = useState<number>(1);
	const [apiToken, setApiToken] = useState<string>('');
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [isSchedulingAll, setIsSchedulingAll] = useState<boolean>(false);

	// State for scheduling
	const [scheduleDialogOpen, setScheduleDialogOpen] = useState<boolean>(false);
	const [batchDialogOpen, setBatchDialogOpen] = useState<boolean>(false);
	const [schedulingEnabled, setSchedulingEnabled] = useState<boolean>(false);
	const [scheduleTime, setScheduleTime] = useState<Date | null>(new Date());

	// State for batch settings
	const [batchSettings, setBatchSettings] = useState<BatchJobSettings>({});
	const [commonIterations, setCommonIterations] = useState<number>(1000);
	const [commonRuns, setCommonRuns] = useState<number>(1);
	const [applyCommonIterations, setApplyCommonIterations] =
		useState<boolean>(false);
	const [applyCommonRuns, setApplyCommonRuns] = useState<boolean>(false);
	const [settingsModified, setSettingsModified] = useState<boolean>(false);
	const [selectedAlgorithms, setSelectedAlgorithms] = useState<{
		[key: string]: boolean;
	}>(
		SUPPORTED_ALGORITHMS.reduce((acc, algo) => ({ ...acc, [algo]: true }), {})
	);

	// Initialize batch settings
	useEffect(() => {
		// Initialize batch settings with default values for each algorithm
		const initialSettings: BatchJobSettings = {};
		SUPPORTED_ALGORITHMS.forEach((algo) => {
			if (SECURITY_PARAMS[algo] && SECURITY_PARAMS[algo].length > 0) {
				initialSettings[algo] = {
					securityParameter: SECURITY_PARAMS[algo][0],
					iterations: getDefaultIterations(algo),
				};
			}
		});
		setBatchSettings(initialSettings);
	}, []);

	// Load saved API token on component mount
	useEffect(() => {
		const loadToken = async () => {
			try {
				const token = await window.quantumAPI.loadApiToken();
				if (token) {
					setApiToken(token);
				}
			} catch (error) {
				console.error('Failed to load API token:', error);
			}
		};

		loadToken();
	}, []);

	// Update security parameter options and default iterations when algorithm changes
	useEffect(() => {
		if (SECURITY_PARAMS[algorithm] && SECURITY_PARAMS[algorithm].length > 0) {
			setSecurityParameter(SECURITY_PARAMS[algorithm][0]);
		} else {
			setSecurityParameter('');
		}

		// Update iterations based on the selected algorithm
		setIterations(getDefaultIterations(algorithm));
	}, [algorithm]);

	// Update shot count when quantum algorithm changes
	useEffect(() => {
		if (quantumAlgorithm === 'shor') {
			setShotCount(DEFAULT_SHOR_SHOTS);
		} else {
			setShotCount(DEFAULT_GROVER_SHOTS);
		}
	}, [quantumAlgorithm]);

	// Handle single job form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Open scheduling dialog if not already submitting
		if (!isSubmitting) {
			setScheduleDialogOpen(true);
		}
	};

	// Actually submit the job with optional scheduling
	const submitJob = async () => {
		setIsSubmitting(true);
		setScheduleDialogOpen(false);

		try {
			const scheduledTime =
				schedulingEnabled && scheduleTime ? scheduleTime.getTime() : null;

			if (jobType === 'benchmark') {
				// Create benchmark job
				const benchmarkJob = {
					type: 'benchmark',
					algorithm,
					securityParameter,
					iterations,
					numberOfRuns,
					scheduledTime,
				};

				await window.jobSchedulerAPI.scheduleJob(benchmarkJob);
			} else {
				// Create quantum job
				const quantumJob = {
					type: 'quantum',
					algorithm: quantumAlgorithm,
					shotCount,
					target,
					apiToken,
					numberOfRuns,
					markedStates:
						quantumAlgorithm === 'grover' ? markedStates : undefined,
					plotTheme: 'dark', // Default to dark theme
					scheduledTime,
				};

				await window.jobSchedulerAPI.scheduleJob(quantumJob);
			}

			// Call the callback function
			onJobScheduled();

			// Reset some fields
			setNumberOfRuns(1);
			setSchedulingEnabled(false);
			setScheduleTime(new Date());
		} catch (error) {
			console.error('Failed to schedule job:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle the "Schedule All Benchmarks" initial click
	const handleBatchScheduleClick = () => {
		setBatchDialogOpen(true);
	};

	// Handle closing the batch dialog
	const handleCloseBatchDialog = () => {
		setBatchDialogOpen(false);
		setSchedulingEnabled(false);
		setScheduleTime(new Date());
		setApplyCommonIterations(false);
		setApplyCommonRuns(false);
		setCommonIterations(1000); // Set to a reasonable default
		setCommonRuns(1);
		setSettingsModified(false);
	};

	// Handle algorithm selection in batch dialog
	const handleAlgorithmSelect = (algo: string) => {
		setSelectedAlgorithms({
			...selectedAlgorithms,
			[algo]: !selectedAlgorithms[algo],
		});
	};

	// Handle common iterations change
	const handleCommonIterationsChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setCommonIterations(parseInt(e.target.value) || 0);
		if (applyCommonIterations) {
			setSettingsModified(true);
		}
	};

	// Handle common runs change
	const handleCommonRunsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setCommonRuns(parseInt(e.target.value) || 1);
		if (applyCommonRuns) {
			setSettingsModified(true);
		}
	};

	// Handle checkbox change for applying common iterations
	const handleApplyCommonIterationsChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setApplyCommonIterations(e.target.checked);
		setSettingsModified(e.target.checked);
	};

	// Handle checkbox change for applying common runs
	const handleApplyCommonRunsChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setApplyCommonRuns(e.target.checked);
		setSettingsModified(e.target.checked);
	};

	// Apply common settings to all selected algorithms
	const applyCommonSettings = () => {
		const newSettings = { ...batchSettings };

		SUPPORTED_ALGORITHMS.forEach((algo) => {
			if (selectedAlgorithms[algo]) {
				if (applyCommonIterations && newSettings[algo]) {
					newSettings[algo] = {
						...newSettings[algo],
						iterations: commonIterations,
					};
				}
				if (applyCommonRuns) {
					// Only for internal tracking - the actual job will use this value later
					console.log(`Setting ${algo} to use ${commonRuns} runs`);
				}
			}
		});

		setBatchSettings(newSettings);

		// Reset settingsModified flag since changes have been applied
		setSettingsModified(false);

		// Debug log - remove in production
		console.log(
			'Applied common settings:',
			applyCommonIterations
				? `Iterations: ${commonIterations}`
				: 'No common iterations',
			applyCommonRuns ? `Runs: ${commonRuns}` : 'No common runs'
		);
		console.log('Updated batch settings:', newSettings);
	};

	// Update batch settings for a specific algorithm
	const updateBatchSetting = (
		algo: string,
		field: 'securityParameter' | 'iterations',
		value: string | number
	) => {
		setBatchSettings({
			...batchSettings,
			[algo]: {
				...batchSettings[algo],
				[field]: value,
			},
		});
	};

	// Handle the "Schedule All Benchmarks" final submission
	const handleScheduleAllBenchmarks = async () => {
		setIsSchedulingAll(true);
		setBatchDialogOpen(false);

		try {
			const scheduledTime =
				schedulingEnabled && scheduleTime ? scheduleTime.getTime() : null;

			// Always apply common settings before scheduling if they are enabled
			if (applyCommonIterations || applyCommonRuns) {
				applyCommonSettings();
			}

			// Show what we're about to schedule
			console.log('Scheduling with settings:', {
				scheduledTime,
				selectedAlgorithms,
				batchSettings,
			});

			for (const algo of SUPPORTED_ALGORITHMS) {
				// Skip if algorithm is not selected
				if (!selectedAlgorithms[algo]) continue;

				// Get settings for this algorithm
				if (
					batchSettings[algo] &&
					SECURITY_PARAMS[algo] &&
					SECURITY_PARAMS[algo].length > 0
				) {
					const { securityParameter, iterations } = batchSettings[algo];
					const runs = applyCommonRuns ? commonRuns : numberOfRuns;

					// Make sure iterations is a valid number (never 0)
					const actualIterations =
						iterations > 0 ? iterations : getDefaultIterations(algo);

					const benchmarkJob = {
						type: 'benchmark' as const,
						algorithm: algo,
						securityParameter,
						iterations: actualIterations, // Ensure we have valid iterations
						numberOfRuns: runs,
						scheduledTime,
					};

					console.log(
						`Scheduling job for ${algo} with ${actualIterations} iterations`
					);
					await window.jobSchedulerAPI.scheduleJob(benchmarkJob);
				}
			}

			// Call the callback function
			onJobScheduled();

			// Reset scheduling
			setSchedulingEnabled(false);
			setScheduleTime(new Date());
		} catch (error) {
			console.error('Failed to schedule all benchmarks:', error);
		} finally {
			setIsSchedulingAll(false);
		}
	};

	// Render scheduling dialog
	const renderScheduleDialog = () => (
		<Dialog
			open={scheduleDialogOpen}
			onClose={() => setScheduleDialogOpen(false)}
		>
			<DialogTitle
				sx={{
					bgcolor: isDarkMode ? '#333' : '#f5f5f5',
					color: isDarkMode ? '#fff' : '#333',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<AccessTimeIcon sx={{ mr: 1 }} />
					Schedule Execution Time
				</div>
				<IconButton
					edge="end"
					onClick={() => setScheduleDialogOpen(false)}
					sx={{ color: isDarkMode ? '#fff' : '#333' }}
				>
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent sx={{ bgcolor: isDarkMode ? '#212121' : '#fff', pt: 2 }}>
				<FormControlLabel
					control={
						<Switch
							checked={schedulingEnabled}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setSchedulingEnabled(e.target.checked)
							}
							color="primary"
						/>
					}
					label={
						schedulingEnabled ? 'Run at scheduled time' : 'Run immediately'
					}
					sx={{ mb: 2, color: isDarkMode ? '#fff' : '#333' }}
				/>

				{schedulingEnabled && (
					<LocalizationProvider dateAdapter={AdapterDateFns}>
						<DateTimePicker
							label="Execution Time"
							value={scheduleTime}
							onChange={(newValue) => setScheduleTime(newValue)}
							minDateTime={new Date()}
							sx={{
								width: '100%',
								'& .MuiInputBase-root': {
									bgcolor: isDarkMode ? '#333' : '#f5f5f5',
									color: isDarkMode ? '#fff' : '#333',
								},
							}}
						/>
					</LocalizationProvider>
				)}
			</DialogContent>
			<DialogActions sx={{ bgcolor: isDarkMode ? '#212121' : '#fff' }}>
				<Button
					onClick={() => setScheduleDialogOpen(false)}
					sx={{ color: isDarkMode ? '#aaa' : '#666' }}
				>
					Cancel
				</Button>
				<Button
					onClick={submitJob}
					variant="contained"
					sx={{
						bgcolor: '#9747FF',
						'&:hover': { bgcolor: '#8030E0' },
					}}
				>
					{schedulingEnabled ? 'Schedule' : 'Run Now'}
				</Button>
			</DialogActions>
		</Dialog>
	);

	// Add the batch settings dialog
	const renderBatchDialog = () => (
		<Dialog
			open={batchDialogOpen}
			onClose={handleCloseBatchDialog}
			fullWidth
			maxWidth="md"
		>
			<DialogTitle
				sx={{
					bgcolor: isDarkMode ? '#333' : '#f5f5f5',
					color: isDarkMode ? '#fff' : '#333',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<PlayArrowAllIcon sx={{ mr: 1 }} />
					Configure Batch Benchmarks
				</div>
				<IconButton
					edge="end"
					onClick={handleCloseBatchDialog}
					sx={{ color: isDarkMode ? '#fff' : '#333' }}
				>
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent sx={{ bgcolor: isDarkMode ? '#212121' : '#fff', pt: 2 }}>
				{/* Common settings */}
				<Typography
					variant="subtitle1"
					gutterBottom
					sx={{ mt: 2, color: isDarkMode ? '#fff' : '#333' }}
				>
					Common Settings
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={4}>
						<FormControlLabel
							control={
								<Checkbox
									checked={applyCommonIterations}
									onChange={handleApplyCommonIterationsChange}
									sx={{
										color: isDarkMode ? '#9747FF80' : '#9747FF80',
										'&.Mui-checked': {
											color: '#9747FF',
										},
									}}
								/>
							}
							label="Set common iterations"
							sx={{ color: isDarkMode ? '#fff' : '#333' }}
						/>
						<TextField
							disabled={!applyCommonIterations}
							fullWidth
							type="number"
							label="Common Iterations"
							value={commonIterations}
							onChange={handleCommonIterationsChange}
							sx={{
								mt: 1,
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								borderRadius: '8px',
								'& .MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
								},
								'& .MuiInputLabel-root': {
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.7)'
										: 'rgba(0, 0, 0, 0.7)',
								},
								'& .MuiOutlinedInput-root': {
									'& fieldset': {
										borderColor: 'transparent',
									},
									'&:hover fieldset': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
									},
									'&.Mui-focused fieldset': {
										borderColor: '#9747FF',
									},
								},
							}}
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<FormControlLabel
							control={
								<Checkbox
									checked={applyCommonRuns}
									onChange={handleApplyCommonRunsChange}
									sx={{
										color: isDarkMode ? '#9747FF80' : '#9747FF80',
										'&.Mui-checked': {
											color: '#9747FF',
										},
									}}
								/>
							}
							label="Set common runs"
							sx={{ color: isDarkMode ? '#fff' : '#333' }}
						/>
						<TextField
							disabled={!applyCommonRuns}
							fullWidth
							type="number"
							label="Common Runs"
							value={commonRuns}
							onChange={handleCommonRunsChange}
							sx={{
								mt: 1,
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								borderRadius: '8px',
								'& .MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
								},
								'& .MuiInputLabel-root': {
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.7)'
										: 'rgba(0, 0, 0, 0.7)',
								},
								'& .MuiOutlinedInput-root': {
									'& fieldset': {
										borderColor: 'transparent',
									},
									'&:hover fieldset': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
									},
									'&.Mui-focused fieldset': {
										borderColor: '#9747FF',
									},
								},
							}}
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<FormControlLabel
							control={
								<Switch
									checked={schedulingEnabled}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setSchedulingEnabled(e.target.checked)
									}
									color="primary"
								/>
							}
							label={
								schedulingEnabled ? 'Run at scheduled time' : 'Run immediately'
							}
							sx={{ color: isDarkMode ? '#fff' : '#333' }}
						/>

						{schedulingEnabled && (
							<LocalizationProvider dateAdapter={AdapterDateFns}>
								<DateTimePicker
									label="Execution Time"
									value={scheduleTime}
									onChange={(newValue) => setScheduleTime(newValue)}
									minDateTime={new Date()}
									sx={{
										width: '100%',
										mt: 1,
										'& .MuiInputBase-root': {
											bgcolor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
											color: isDarkMode ? '#fff' : '#333',
										},
									}}
								/>
							</LocalizationProvider>
						)}
					</Grid>
				</Grid>

				{/* Apply Settings Button */}
				<Box
					sx={{
						mt: 2,
						mb: 2,
						display: 'flex',
						justifyContent: 'center',
						flexDirection: 'column',
						alignItems: 'center',
					}}
				>
					<Typography
						variant="body2"
						sx={{
							mb: 1,
							color: isDarkMode
								? 'rgba(255, 255, 255, 0.7)'
								: 'rgba(0, 0, 0, 0.6)',
							fontStyle: 'italic',
							textAlign: 'center',
						}}
					>
						Click the button below to apply common settings to all selected
						algorithms
					</Typography>
					<Button
						variant="contained"
						size="large"
						startIcon={<AddTaskIcon />}
						onClick={applyCommonSettings}
						disabled={!applyCommonIterations && !applyCommonRuns}
						sx={{
							bgcolor: '#9747FF',
							color: '#fff',
							'&:hover': {
								bgcolor: '#8030E0',
							},
							'&:disabled': {
								bgcolor: isDarkMode
									? 'rgba(255, 255, 255, 0.12)'
									: 'rgba(0, 0, 0, 0.12)',
								color: isDarkMode
									? 'rgba(255, 255, 255, 0.3)'
									: 'rgba(0, 0, 0, 0.26)',
							},
							fontWeight: 'bold',
							px: 3,
							py: 1,
							boxShadow: '0 4px 8px rgba(151, 71, 255, 0.3)',
							animation:
								(applyCommonIterations || applyCommonRuns) && settingsModified
									? 'pulse 2s infinite'
									: 'none',
							'@keyframes pulse': {
								'0%': { boxShadow: '0 0 0 0 rgba(151, 71, 255, 0.4)' },
								'70%': { boxShadow: '0 0 0 10px rgba(151, 71, 255, 0)' },
								'100%': { boxShadow: '0 0 0 0 rgba(151, 71, 255, 0)' },
							},
						}}
					>
						Apply Common Settings
					</Button>
				</Box>

				{/* Algorithm selection */}
				<Typography
					variant="subtitle1"
					gutterBottom
					sx={{ mt: 3, color: isDarkMode ? '#fff' : '#333' }}
				>
					Select Algorithms to Run
				</Typography>
				<TableContainer
					component={Paper}
					sx={{ mt: 1, bgcolor: isDarkMode ? '#2a2a2a' : '#f8f8f8' }}
				>
					<Table size="small">
						<TableHead sx={{ bgcolor: isDarkMode ? '#333' : '#ddd' }}>
							<TableRow>
								<TableCell sx={{ color: isDarkMode ? '#fff' : '#333' }}>
									<FormControlLabel
										control={
											<Checkbox
												checked={Object.values(selectedAlgorithms).every(
													(val) => val
												)}
												indeterminate={
													!Object.values(selectedAlgorithms).every(
														(val) => val
													) &&
													Object.values(selectedAlgorithms).some((val) => val)
												}
												onChange={() => {
													const allSelected = Object.values(
														selectedAlgorithms
													).every((val) => val);
													const newValue = !allSelected;
													setSelectedAlgorithms(
														SUPPORTED_ALGORITHMS.reduce(
															(acc, algo) => ({ ...acc, [algo]: newValue }),
															{}
														)
													);
												}}
												sx={{
													color: isDarkMode ? '#9747FF80' : '#9747FF80',
													'&.Mui-checked': {
														color: '#9747FF',
													},
												}}
											/>
										}
										label="Select All"
										sx={{ color: isDarkMode ? '#fff' : '#333' }}
									/>
								</TableCell>
								<TableCell sx={{ color: isDarkMode ? '#fff' : '#333' }}>
									Algorithm
								</TableCell>
								<TableCell sx={{ color: isDarkMode ? '#fff' : '#333' }}>
									Security Parameter
								</TableCell>
								<TableCell sx={{ color: isDarkMode ? '#fff' : '#333' }}>
									Iterations
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{SUPPORTED_ALGORITHMS.map((algo) => {
								const { displayName, category } = getAlgorithmInfo(algo);
								const settings = batchSettings[algo] || {
									securityParameter: '',
									iterations: 0,
								};

								return (
									<TableRow
										key={algo}
										sx={{
											bgcolor: selectedAlgorithms[algo]
												? isDarkMode
													? 'rgba(151, 71, 255, 0.1)'
													: 'rgba(151, 71, 255, 0.05)'
												: 'transparent',
										}}
									>
										<TableCell>
											<Checkbox
												checked={!!selectedAlgorithms[algo]}
												onChange={() => handleAlgorithmSelect(algo)}
												sx={{
													color: isDarkMode ? '#9747FF80' : '#9747FF80',
													'&.Mui-checked': {
														color: '#9747FF',
													},
												}}
											/>
										</TableCell>
										<TableCell sx={{ color: isDarkMode ? '#fff' : '#333' }}>
											{displayName} ({category})
										</TableCell>
										<TableCell>
											<Select
												size="small"
												value={
													settings.securityParameter ||
													(SECURITY_PARAMS[algo] && SECURITY_PARAMS[algo][0]) ||
													''
												}
												onChange={(e) =>
													updateBatchSetting(
														algo,
														'securityParameter',
														e.target.value
													)
												}
												disabled={!selectedAlgorithms[algo]}
												sx={{
													minWidth: 100,
													bgcolor: isDarkMode ? '#333' : '#fff',
													color: isDarkMode ? '#fff' : '#333',
												}}
											>
												{SECURITY_PARAMS[algo]?.map((param) => (
													<MenuItem key={param} value={param}>
														{param}
													</MenuItem>
												))}
											</Select>
										</TableCell>
										<TableCell>
											<TextField
												size="small"
												type="number"
												value={
													applyCommonIterations
														? commonIterations
														: settings.iterations
												}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													updateBatchSetting(
														algo,
														'iterations',
														parseInt(e.target.value) || 0
													)
												}
												disabled={
													!selectedAlgorithms[algo] || applyCommonIterations
												}
												sx={{
													width: 100,
													bgcolor: isDarkMode ? '#333' : '#fff',
													'& .MuiInputBase-input': {
														color: isDarkMode ? '#fff' : '#333',
													},
												}}
											/>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>
			</DialogContent>
			<DialogActions sx={{ bgcolor: isDarkMode ? '#212121' : '#fff' }}>
				<Button
					onClick={handleCloseBatchDialog}
					sx={{ color: isDarkMode ? '#aaa' : '#666' }}
				>
					Cancel
				</Button>
				<Button
					onClick={handleScheduleAllBenchmarks}
					variant="contained"
					disabled={!Object.values(selectedAlgorithms).some((val) => val)}
					sx={{
						bgcolor: '#9747FF',
						'&:hover': { bgcolor: '#8030E0' },
					}}
				>
					{schedulingEnabled
						? 'Schedule Selected Benchmarks'
						: 'Run Selected Benchmarks'}
				</Button>
			</DialogActions>
		</Dialog>
	);

	return (
		<Card
			className={`p-6 rounded-xl shadow-md ${
				isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
			}`}
		>
			<div className="flex items-center mb-4">
				<ScheduleIcon style={{ color: '#9747FF' }} className="mr-3" />
				<h2
					className="text-[20px] font-semibold"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Schedule New Job
				</h2>
			</div>
			<p className="mb-5" style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>
				Configure and schedule new cryptographic benchmark jobs or quantum
				computing workloads to run in the background.
			</p>
			<Divider sx={{ mb: 3 }} />

			<form onSubmit={handleSubmit}>
				<Grid container spacing={3}>
					{/* Job Type Selection */}
					<Grid item xs={12} md={12}>
						<FormControl component="fieldset">
							<FormLabel
								component="legend"
								sx={{
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.7)'
										: 'rgba(0, 0, 0, 0.7)',
									'&.Mui-focused': {
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.7)',
									},
								}}
							>
								Job Type
							</FormLabel>
							<RadioGroup
								row
								value={jobType}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setJobType(e.target.value as 'benchmark' | 'quantum')
								}
							>
								<FormControlLabel
									value="benchmark"
									control={
										<Radio
											sx={{
												color: isDarkMode
													? 'rgba(255, 255, 255, 0.7)'
													: 'rgba(0, 0, 0, 0.7)',
												'&.Mui-checked': {
													color: '#9747FF',
												},
											}}
										/>
									}
									label="Benchmark (C++ Executables)"
									sx={{
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.9)'
											: 'rgba(0, 0, 0, 0.9)',
									}}
								/>
								<FormControlLabel
									value="quantum"
									control={
										<Radio
											sx={{
												color: isDarkMode
													? 'rgba(255, 255, 255, 0.7)'
													: 'rgba(0, 0, 0, 0.7)',
												'&.Mui-checked': {
													color: '#9747FF',
												},
											}}
										/>
									}
									label="Quantum Workload (IBM Quantum)"
									sx={{
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.9)'
											: 'rgba(0, 0, 0, 0.9)',
									}}
								/>
							</RadioGroup>
						</FormControl>
					</Grid>

					{/* Benchmark-specific fields */}
					{jobType === 'benchmark' && (
						<>
							<Grid item xs={12} md={6}>
								<FormControl fullWidth>
									<Select
										labelId="algorithm-label"
										value={algorithm}
										label="Algorithm"
										onChange={(e: SelectChangeEvent) =>
											setAlgorithm(e.target.value)
										}
										required
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
										{SUPPORTED_ALGORITHMS.map((algo) => {
											const { displayName, category } = getAlgorithmInfo(algo);
											return (
												<MenuItem key={algo} value={algo}>
													{displayName} ({category})
												</MenuItem>
											);
										})}
									</Select>
								</FormControl>
							</Grid>

							<Grid item xs={12} md={6}>
								<FormControl fullWidth>
									<Select
										labelId="security-param-label"
										value={securityParameter}
										label="Security Parameter"
										onChange={(e: SelectChangeEvent) =>
											setSecurityParameter(e.target.value)
										}
										required
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
										{SECURITY_PARAMS[algorithm]?.map((param) => (
											<MenuItem key={param} value={param}>
												{param}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									type="number"
									label="Iterations"
									value={iterations}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setIterations(parseInt(e.target.value))
									}
									InputProps={{ inputProps: { min: 1 } }}
									required
									helperText={`Default iterations for ${algorithm}: ${getDefaultIterations(
										algorithm
									)}`}
									sx={{
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
										borderRadius: '8px',
										'& .MuiInputBase-input': {
											color: isDarkMode ? '#ffffff' : '#111111',
										},
										'& .MuiInputLabel-root': {
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.7)'
												: 'rgba(0, 0, 0, 0.7)',
											'&.Mui-focused': {
												color: '#9747FF',
											},
										},
										'& .MuiOutlinedInput-root': {
											'& fieldset': {
												borderColor: 'transparent',
											},
											'&:hover fieldset': {
												borderColor: isDarkMode
													? 'rgba(255, 255, 255, 0.6)'
													: 'rgba(0, 0, 0, 0.5)',
												borderWidth: '1px',
											},
											'&.Mui-focused fieldset': {
												borderColor: '#9747FF',
												borderWidth: '1px',
											},
										},
										'& .MuiFormHelperText-root': {
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.5)'
												: 'rgba(0, 0, 0, 0.5)',
										},
									}}
								/>
							</Grid>
						</>
					)}

					{/* Quantum-specific fields */}
					{jobType === 'quantum' && (
						<>
							<Grid item xs={12} md={6}>
								<FormControl fullWidth>
									<Select
										labelId="quantum-algorithm-label"
										value={quantumAlgorithm}
										label="Quantum Algorithm"
										onChange={(e: SelectChangeEvent) =>
											setQuantumAlgorithm(e.target.value as 'shor' | 'grover')
										}
										required
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
										<MenuItem value="shor">Shor's Algorithm (N=15)</MenuItem>
										<MenuItem value="grover">Grover's Search</MenuItem>
									</Select>
								</FormControl>
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									type="number"
									label="Shot Count"
									value={shotCount}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setShotCount(parseInt(e.target.value))
									}
									InputProps={{ inputProps: { min: 1 } }}
									required
									sx={{
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
										borderRadius: '8px',
										'& .MuiInputBase-input': {
											color: isDarkMode ? '#ffffff' : '#111111',
										},
										'& .MuiInputLabel-root': {
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.7)'
												: 'rgba(0, 0, 0, 0.7)',
											'&.Mui-focused': {
												color: '#9747FF',
											},
										},
										'& .MuiOutlinedInput-root': {
											'& fieldset': {
												borderColor: 'transparent',
											},
											'&:hover fieldset': {
												borderColor: isDarkMode
													? 'rgba(255, 255, 255, 0.6)'
													: 'rgba(0, 0, 0, 0.5)',
												borderWidth: '1px',
											},
											'&.Mui-focused fieldset': {
												borderColor: '#9747FF',
												borderWidth: '1px',
											},
										},
									}}
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<FormControl fullWidth>
									<Select
										labelId="target-label"
										value={target}
										label="Target"
										onChange={(e: SelectChangeEvent) =>
											setTarget(
												e.target.value as 'simulation' | 'real_hardware'
											)
										}
										required
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
										<MenuItem value="simulation">Simulation</MenuItem>
										<MenuItem value="real_hardware">
											Real Quantum Hardware
										</MenuItem>
									</Select>
								</FormControl>
							</Grid>

							{quantumAlgorithm === 'grover' && (
								<Grid item xs={12} md={6}>
									<TextField
										fullWidth
										label="Marked States (e.g., 101, 010)"
										value={markedStates}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											setMarkedStates(e.target.value)
										}
										required
										sx={{
											backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
											borderRadius: '8px',
											'& .MuiInputBase-input': {
												color: isDarkMode ? '#ffffff' : '#111111',
											},
											'& .MuiInputLabel-root': {
												color: isDarkMode
													? 'rgba(255, 255, 255, 0.7)'
													: 'rgba(0, 0, 0, 0.7)',
												'&.Mui-focused': {
													color: '#9747FF',
												},
											},
											'& .MuiOutlinedInput-root': {
												'& fieldset': {
													borderColor: 'transparent',
												},
												'&:hover fieldset': {
													borderColor: isDarkMode
														? 'rgba(255, 255, 255, 0.6)'
														: 'rgba(0, 0, 0, 0.5)',
													borderWidth: '1px',
												},
												'&.Mui-focused fieldset': {
													borderColor: '#9747FF',
													borderWidth: '1px',
												},
											},
										}}
									/>
								</Grid>
							)}

							<Grid item xs={12}>
								<TextField
									fullWidth
									label="IBM Quantum API Token"
									value={apiToken}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setApiToken(e.target.value)
									}
									required
									type="password"
									sx={{
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
										borderRadius: '8px',
										'& .MuiInputBase-input': {
											color: isDarkMode ? '#ffffff' : '#111111',
										},
										'& .MuiInputLabel-root': {
											color: isDarkMode
												? 'rgba(255, 255, 255, 0.7)'
												: 'rgba(0, 0, 0, 0.7)',
											'&.Mui-focused': {
												color: '#9747FF',
											},
										},
										'& .MuiOutlinedInput-root': {
											'& fieldset': {
												borderColor: 'transparent',
											},
											'&:hover fieldset': {
												borderColor: isDarkMode
													? 'rgba(255, 255, 255, 0.6)'
													: 'rgba(0, 0, 0, 0.5)',
												borderWidth: '1px',
											},
											'&.Mui-focused fieldset': {
												borderColor: '#9747FF',
												borderWidth: '1px',
											},
										},
									}}
								/>
							</Grid>
						</>
					)}

					{/* Common fields */}
					<Grid item xs={12} md={6}>
						<TextField
							fullWidth
							type="number"
							label="Number of Runs"
							value={numberOfRuns}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setNumberOfRuns(parseInt(e.target.value))
							}
							InputProps={{ inputProps: { min: 1 } }}
							required
							helperText="How many times to repeat this job"
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								borderRadius: '8px',
								'& .MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
								},
								'& .MuiInputLabel-root': {
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.7)'
										: 'rgba(0, 0, 0, 0.7)',
									'&.Mui-focused': {
										color: '#9747FF',
									},
								},
								'& .MuiOutlinedInput-root': {
									'& fieldset': {
										borderColor: 'transparent',
									},
									'&:hover fieldset': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'&.Mui-focused fieldset': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								},
								'& .MuiFormHelperText-root': {
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.5)'
										: 'rgba(0, 0, 0, 0.5)',
								},
							}}
						/>
					</Grid>

					{/* Submit buttons */}
					<Grid item xs={12}>
						<Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
							<Button
								type="submit"
								variant="contained"
								disabled={isSubmitting}
								startIcon={
									isSubmitting ? (
										<CircularProgress size={20} color="inherit" />
									) : (
										<AddTaskIcon />
									)
								}
								sx={{
									bgcolor: '#9747FF',
									'&:hover': { bgcolor: '#8030E0' },
									textTransform: 'uppercase',
									fontWeight: 'bold',
									padding: '10px 24px',
									fontSize: '0.9rem',
									borderRadius: '8px',
								}}
							>
								{isSubmitting ? 'Adding...' : 'Add to Queue'}
							</Button>

							{jobType === 'benchmark' && (
								<Button
									type="button"
									variant="outlined"
									disabled={isSchedulingAll}
									startIcon={
										isSchedulingAll ? (
											<CircularProgress size={20} color="inherit" />
										) : (
											<PlayArrowAllIcon />
										)
									}
									onClick={handleBatchScheduleClick}
									sx={{
										borderColor: '#9747FF',
										color: '#9747FF',
										'&:hover': {
											borderColor: '#8030E0',
											backgroundColor: 'rgba(151, 71, 255, 0.04)',
										},
										textTransform: 'uppercase',
										fontWeight: 'bold',
										padding: '10px 24px',
										fontSize: '0.9rem',
										borderRadius: '8px',
									}}
								>
									{isSchedulingAll
										? 'Scheduling...'
										: 'Schedule All Benchmarks'}
								</Button>
							)}
						</Box>
					</Grid>
				</Grid>
			</form>

			{/* Scheduling Dialogs */}
			{renderScheduleDialog()}
			{renderBatchDialog()}
		</Card>
	);
};

export default JobSchedulerForm;
