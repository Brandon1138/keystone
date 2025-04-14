import React, { useState, useEffect, useRef } from 'react';
import {
	Typography,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TextField,
	Button,
	Box,
	Paper,
	IconButton,
	InputAdornment,
	Tooltip,
	Snackbar,
	Modal,
	CircularProgress,
	Alert,
	LinearProgress,
	Fab,
	Checkbox,
	FormControlLabel,
} from '@mui/material';
import NetworkPingIcon from '@mui/icons-material/NetworkPing';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ComputerIcon from '@mui/icons-material/Computer';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTheme } from '@mui/material/styles';
import { Card } from './ui/card';
import { Speedometer } from './Speedometer';

/**
 * Type definitions for the quantum workload result
 */
interface QuantumWorkloadResult {
	status: 'success' | 'error' | 'running' | 'idle';
	data?: {
		// Shor's algorithm fields
		n_value?: number;
		a_value?: number;
		factors?: number[] | null;
		// Grover's algorithm fields
		input_marked_states?: string[];
		top_measured_state?: string;
		top_measured_count?: number;
		found_correct_state?: boolean;
		// Common fields
		execution_time_sec: number | null;
		qpu_time_sec: number | null;
		circuit_depth: number | null;
		cx_gate_count: number | null;
		total_gate_count: number | null;
		backend_used: string | null;
		job_id: string | null;
		shots: number;
		ran_on_hardware: boolean;
		plot_file_path: string | null;
		error_message: string | null;
	};
	logs: string[];
	plotFilePath: string | null;
	plotDataUrl: string | null;
	error?: string;
}

/**
 * Quantum Workload Runner Component
 */
export const QuantumWorkloadRunner: React.FC = () => {
	const [algorithm, setAlgorithm] = useState('shors');
	const [shots, setShots] = useState('4096');
	const [markedStates, setMarkedStates] = useState('101,010');
	const [nValue, setNValue] = useState('15');
	const [apiToken, setApiToken] = useState('');
	const [showApiToken, setShowApiToken] = useState(false);
	const [tokenStatus, setTokenStatus] = useState<'saved' | 'new' | 'none'>(
		'none'
	);
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
	const [plotFullscreen, setPlotFullscreen] = useState(false);
	const [runningMode, setRunningMode] = useState<
		'simulation' | 'hardware' | null
	>(null);
	const [workloadResult, setWorkloadResult] = useState<QuantumWorkloadResult>({
		status: 'idle',
		logs: [],
		plotFilePath: null,
		plotDataUrl: null,
	});
	const logsEndRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [currentStage, setCurrentStage] = useState<number>(0);

	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Derived state - true if any mode is running
	const isRunning = runningMode !== null;

	// Load saved API token on component mount
	useEffect(() => {
		const loadSavedToken = async () => {
			try {
				const savedToken = await window.quantumAPI.loadApiToken();
				if (savedToken) {
					setApiToken(savedToken);
					setTokenStatus('saved');
					console.log('Loaded saved API token');
				} else {
					setTokenStatus('none');
				}
			} catch (err) {
				console.error('Failed to load saved API token:', err);
				setTokenStatus('none');
			}
		};

		loadSavedToken();
	}, []);

	// Update token status when API token changes
	useEffect(() => {
		if (apiToken) {
			setTokenStatus((prev) => (prev === 'saved' ? 'saved' : 'new'));
		} else {
			setTokenStatus('none');
		}
	}, [apiToken]);

	// Scroll logs to bottom when new logs are added, but don't affect the page scroll position
	useEffect(() => {
		if (logsEndRef.current) {
			// Only scroll the logs element itself, not the entire page
			const logsContainer = logsEndRef.current.parentElement;
			if (logsContainer) {
				logsContainer.scrollTop = logsContainer.scrollHeight;
			}
		}
	}, [workloadResult.logs]);

	// Update shots when algorithm changes
	const handleAlgorithmChange = (value: string) => {
		setAlgorithm(value);
		setShots(value === 'shors' ? '4096' : '8196');
		// Ensure nValue is always set to default '15' for Shor's algorithm
		if (value === 'shors') {
			setNValue('15');
		}
	};

	// Handle API token change
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
				setCopyFeedback('API Token saved successfully!');
				setTimeout(() => setCopyFeedback(null), 2000);
			} else {
				setCopyFeedback('Failed to save API Token');
				setTimeout(() => setCopyFeedback(null), 2000);
			}
		} catch (err) {
			console.error('Error saving API token:', err);
			setCopyFeedback('Error saving API Token');
			setTimeout(() => setCopyFeedback(null), 2000);
		}
	};

	// Delete saved API token
	const handleDeleteToken = async () => {
		try {
			const success = await window.quantumAPI.deleteApiToken();
			if (success) {
				setApiToken('');
				setTokenStatus('none');
				setCopyFeedback('API Token deleted');
				setTimeout(() => setCopyFeedback(null), 2000);
			} else {
				setCopyFeedback('Failed to delete API Token');
				setTimeout(() => setCopyFeedback(null), 2000);
			}
		} catch (err) {
			console.error('Error deleting API token:', err);
			setCopyFeedback('Error deleting API Token');
			setTimeout(() => setCopyFeedback(null), 2000);
		}
	};

	// Validate marked states input (for Grover's algorithm)
	const validateMarkedStates = (input: string): boolean => {
		if (!input.trim()) return false;

		const states = input.split(',').map((s) => s.trim());
		if (states.length === 0) return false;

		// Check if all states are binary strings
		const allBinary = states.every((state) => /^[01]+$/.test(state));
		if (!allBinary) return false;

		// Check if all states have the same length
		const firstLength = states[0].length;
		return states.every((state) => state.length === firstLength);
	};

	const copyToClipboard = (text: string, description: string) => {
		if (!text) return;
		navigator.clipboard.writeText(text).then(
			() => {
				setCopyFeedback(`${description} copied!`);
				setTimeout(() => setCopyFeedback(null), 2000);
			},
			(err) => {
				console.error('Copy failed: ', err);
				setCopyFeedback(`Failed to copy ${description}`);
				setTimeout(() => setCopyFeedback(null), 2000);
			}
		);
	};

	// Run the quantum workload
	const runQuantumWorkload = async (useHardware: boolean) => {
		if (isRunning) return;

		// Store the current scroll position before running the workload
		const scrollPosition = window.scrollY;

		try {
			// Reset state and set which mode is running
			setRunningMode(useHardware ? 'hardware' : 'simulation');
			setCurrentStage(0); // Reset the stage counter
			setWorkloadResult({
				status: 'running',
				logs: [],
				plotFilePath: null,
				plotDataUrl: null,
			});

			// Parse shots and get plot theme
			const shotsNumber = parseInt(shots, 10);
			const plotTheme = isDarkMode ? 'dark' : 'light';

			// Save token if token is new
			if (tokenStatus === 'new') {
				await handleSaveToken();
			}

			// Run the workload based on selected algorithm
			let result;
			if (algorithm === 'grovers') {
				// Validate marked states input
				if (!validateMarkedStates(markedStates)) {
					throw new Error(
						'Invalid marked states. Please enter valid comma-separated binary strings (e.g., 101,010).'
					);
				}

				result = await window.quantumAPI.runGroverSearch(
					apiToken,
					markedStates,
					shotsNumber,
					useHardware,
					plotTheme
				);
			} else {
				// Run Shor's algorithm
				result = await window.quantumAPI.runQuantumWorkload(
					apiToken,
					shotsNumber,
					useHardware,
					plotTheme
				);
			}

			console.log('Workload result:', result);

			// Update state with the result
			if (result.status === 'success') {
				// If success, try to get the plot
				let plotDataUrl = null;
				if (result.plotFilePath) {
					try {
						const plotResult = await window.quantumAPI.getQuantumPlot(
							result.plotFilePath
						);
						if (plotResult.status === 'success' && plotResult.plotBase64) {
							plotDataUrl = `data:image/png;base64,${plotResult.plotBase64}`;
						}
					} catch (err) {
						console.error('Failed to load plot:', err);
					}
				}

				setWorkloadResult({
					status: result.status,
					data: result.data,
					logs: result.logs || [],
					plotFilePath: result.plotFilePath || null,
					plotDataUrl,
					error: result.error,
				});
			} else {
				// Handle error
				setWorkloadResult({
					status: 'error',
					error: result.error || 'Unknown error occurred',
					logs: result.logs || [],
					plotFilePath: null,
					plotDataUrl: null,
				});
			}
		} catch (error: any) {
			console.error('Error running quantum workload:', error);
			setWorkloadResult({
				status: 'error',
				error: error.message || 'Failed to run quantum workload',
				logs: workloadResult.logs,
				plotFilePath: null,
				plotDataUrl: null,
			});
		} finally {
			setRunningMode(null);

			// Restore the scroll position after the operation completes
			// Use a small delay to ensure the DOM has updated
			setTimeout(() => {
				window.scrollTo(0, scrollPosition);
			}, 50);
		}
	};

	// Stage progression effect
	useEffect(() => {
		let stageTimer: NodeJS.Timeout | null = null;
		const maxStages = runningMode === 'hardware' ? 5 : 3;

		if (workloadResult.status === 'running' && currentStage < maxStages - 1) {
			// Set timer to advance stages - hardware runs take longer so use longer intervals
			const interval = runningMode === 'hardware' ? 5000 : 3000;
			stageTimer = setTimeout(() => {
				setCurrentStage((prev) => prev + 1);
			}, interval);
		}

		return () => {
			if (stageTimer) clearTimeout(stageTimer);
		};
	}, [workloadResult.status, currentStage, runningMode]);

	// Reset stage when workload completes or errors
	useEffect(() => {
		if (workloadResult.status !== 'running') {
			setCurrentStage(0);
		}
	}, [workloadResult.status]);

	// Get the current status message based on stage and mode
	const getCurrentStatusMessage = () => {
		if (runningMode === 'hardware') {
			const hardwareStages = [
				'Initializing hardware connection...',
				'Connecting to IBM Quantum...',
				'Preparing quantum circuit...',
				'Waiting in queue for quantum hardware access...',
				'Job running on quantum hardware...',
			];
			return hardwareStages[currentStage] || hardwareStages[0];
		} else {
			const simulationStages = [
				'Initializing quantum simulator...',
				'Preparing quantum circuit...',
				'Running quantum simulation...',
			];
			return simulationStages[currentStage] || simulationStages[0];
		}
	};

	// Render different result fields based on algorithm
	const renderAlgorithmResults = () => {
		if (!workloadResult.data) return null;

		// Use the algorithm that was used for the current results,
		// not the currently selected algorithm
		const resultAlgorithm = workloadResult.data.input_marked_states
			? 'grovers'
			: 'shors';

		if (resultAlgorithm === 'grovers') {
			return (
				<>
					<div className="flex justify-between items-center">
						<div className="text-sm" style={{ color: '#999999' }}>
							Marked States:
						</div>
						<div
							className="text-lg font-medium"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							{workloadResult.data.input_marked_states
								? workloadResult.data.input_marked_states.join(', ')
								: 'None'}
						</div>
					</div>
					<div className="flex justify-between items-center">
						<div className="text-sm" style={{ color: '#999999' }}>
							Top State Count:
						</div>
						<div
							className="text-lg font-medium"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							{workloadResult.data.top_measured_count || 'N/A'}
						</div>
					</div>
				</>
			);
		} else {
			// Shor's algorithm results
			return (
				<div className="flex justify-between items-center">
					<div className="text-sm" style={{ color: '#999999' }}>
						Factors Found:
					</div>
					<div
						className="text-lg font-medium"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						{workloadResult.data.factors
							? workloadResult.data.factors.join(', ')
							: 'None'}
					</div>
				</div>
			);
		}
	};

	return (
		<div className="space-y-5" ref={containerRef}>
			{/* Copy Feedback Snackbar */}
			<Snackbar
				open={copyFeedback !== null}
				autoHideDuration={2000}
				onClose={() => setCopyFeedback(null)}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				message={copyFeedback || ''}
			/>

			{/* Plot Fullscreen Modal */}
			<Modal
				open={plotFullscreen}
				onClose={() => setPlotFullscreen(false)}
				aria-labelledby="plot-modal-title"
				aria-describedby="plot-modal-description"
			>
				<Box
					sx={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						width: '80%',
						height: '80%',
						bgcolor: isDarkMode ? '#212121' : '#f0f0f0',
						boxShadow: 24,
						p: 4,
						borderRadius: 2,
					}}
				>
					<div className="flex justify-between items-center mb-3">
						<Typography id="plot-modal-title" variant="h6" component="h2">
							Quantum Circuit Execution Histogram
						</Typography>
						<IconButton onClick={() => setPlotFullscreen(false)}>
							<FullscreenExitIcon />
						</IconButton>
					</div>
					{workloadResult.plotDataUrl ? (
						<div
							className="w-full h-5/6 flex justify-center items-center"
							style={{
								backgroundImage: `url('${workloadResult.plotDataUrl}')`,
								backgroundSize: 'contain',
								backgroundPosition: 'center',
								backgroundRepeat: 'no-repeat',
							}}
						></div>
					) : (
						<div className="w-full h-5/6 flex justify-center items-center">
							<Typography variant="body1">No plot data available</Typography>
						</div>
					)}
				</Box>
			</Modal>

			{/* Configuration Card with header and description */}
			<Card
				className={`p-6 mb-5 rounded-xl shadow-md transition-all ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<NetworkPingIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[20px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Run Quantum Workloads
					</h2>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Run Shor's and Grover's algorithms via IBM Quantum Cloud. These
					quantum algorithms demonstrate the potential threat to classical
					cryptography and the need for post-quantum solutions.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
					{/* Algorithm Selection */}
					<div>
						<FormControl fullWidth>
							<InputLabel
								id="algorithm-label"
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
								Algorithm
							</InputLabel>
							<Select
								labelId="algorithm-label"
								id="algorithm"
								value={algorithm}
								onChange={(e) => handleAlgorithmChange(e.target.value)}
								disabled={isRunning}
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
								<MenuItem value="shors">Shor's Algorithm</MenuItem>
								<MenuItem value="grovers">Grover's Algorithm</MenuItem>
							</Select>
						</FormControl>
					</div>

					{/* N-Value or Marked States Field (conditional) */}
					<div>
						{algorithm === 'shors' ? (
							<TextField
								fullWidth
								label="N-value"
								variant="outlined"
								value={nValue}
								onChange={(e) => setNValue(e.target.value)}
								disabled={true}
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
										borderWidth: '1px',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
									'.MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
									},
									'.MuiInputLabel-root': {
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.6)',
										transform: 'translate(14px, -9px) scale(0.75)',
										'&.MuiInputLabel-shrink': {
											transform: 'translate(14px, -9px) scale(0.75)',
										},
									},
								}}
							/>
						) : (
							<TextField
								fullWidth
								label="Marked States"
								variant="outlined"
								placeholder="e.g. 101,010"
								value={markedStates}
								onChange={(e) => setMarkedStates(e.target.value)}
								disabled={isRunning}
								error={
									markedStates !== '' && !validateMarkedStates(markedStates)
								}
								helperText={
									markedStates !== '' && !validateMarkedStates(markedStates)
										? 'Enter comma-separated binary strings of equal length'
										: ''
								}
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
										borderWidth: '1px',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
										borderWidth: '1px',
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
						)}
					</div>

					{/* Shots Field */}
					<div>
						<TextField
							fullWidth
							label="Shots"
							variant="outlined"
							value={shots}
							onChange={(e) => setShots(e.target.value)}
							type="number"
							disabled={isRunning}
							InputProps={{
								inputProps: { min: 1 },
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
									borderWidth: '1px',
								},
								'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
									borderColor: '#9747FF',
									borderWidth: '1px',
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
				</div>

				{/* IBM API Token Field */}
				<div className="mb-6">
					<div className="flex items-center mb-2">
						<TextField
							fullWidth
							label="IBM Quantum API Token"
							variant="outlined"
							value={apiToken}
							onChange={handleApiTokenChange}
							disabled={isRunning}
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
									borderWidth: '1px',
								},
								'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
									borderColor: '#9747FF',
									borderWidth: '1px',
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
					<div className="flex justify-between items-center">
						{tokenStatus === 'saved' && (
							<Typography variant="caption" style={{ color: '#4caf50' }}>
								Using saved API Token
							</Typography>
						)}
					</div>
					<Typography
						variant="caption"
						className="mt-1 block"
						style={{ color: isDarkMode ? '#AAAAAA' : '#666666' }}
					>
						Required for both simulation and hardware runs. Get your token from{' '}
						<a
							href="https://quantum-computing.ibm.com/account"
							target="_blank"
							rel="noopener noreferrer"
							style={{ color: '#9747FF', textDecoration: 'underline' }}
						>
							IBM Quantum
						</a>
					</Typography>
				</div>

				{/* Action Buttons */}
				<div className="flex space-x-4">
					<Button
						variant="outlined"
						disabled={
							isRunning ||
							!apiToken ||
							(algorithm === 'grovers' && !validateMarkedStates(markedStates))
						}
						onClick={() => runQuantumWorkload(false)}
						sx={{
							borderColor: '#9747FF',
							color: isDarkMode ? '#FFFFFF' : '#000000',
							fontWeight: 'bold',
							textTransform: 'uppercase',
							'&:hover': {
								borderColor: '#8030E0',
								bgcolor: isDarkMode
									? 'rgba(151, 71, 255, 0.1)'
									: 'rgba(151, 71, 255, 0.1)',
							},
						}}
						startIcon={
							runningMode === 'simulation' ? (
								<CircularProgress size={20} />
							) : null
						}
					>
						{runningMode === 'simulation' ? 'Running...' : 'Run Simulation'}
					</Button>
					<Button
						variant="contained"
						disabled={
							isRunning ||
							!apiToken ||
							(algorithm === 'grovers' && !validateMarkedStates(markedStates))
						}
						onClick={() => runQuantumWorkload(true)}
						sx={{
							backgroundColor: '#9747FF',
							padding: '10px 24px',
							fontSize: '0.9rem',
							fontWeight: 'bold',
							textTransform: 'uppercase',
							borderRadius: '8px',
							'&:hover': {
								backgroundColor: '#8030E0',
							},
							'&.Mui-disabled': {
								backgroundColor: isDarkMode
									? 'rgba(151, 71, 255, 0.3)'
									: 'rgba(151, 71, 255, 0.5)',
								color: isDarkMode
									? 'rgba(255, 255, 255, 0.4)'
									: 'rgba(255, 255, 255, 0.7)',
							},
						}}
						startIcon={
							runningMode === 'hardware' ? (
								<CircularProgress size={20} color="inherit" />
							) : null
						}
					>
						{runningMode === 'hardware' ? 'Running...' : 'Run on IBM Q'}
					</Button>
				</div>

				{/* Status and Progress */}
				{isRunning && (
					<div className="mt-4">
						<LinearProgress color="secondary" />
						<Typography
							variant="body2"
							className="mt-2"
							style={{ color: isDarkMode ? '#AAAAAA' : '#666666' }}
						>
							Running quantum workload... This may take a few minutes.
						</Typography>
					</div>
				)}

				{/* Error Display */}
				{workloadResult.status === 'error' && workloadResult.error && (
					<Alert severity="error" className="mt-4">
						{workloadResult.error}
					</Alert>
				)}
			</Card>

			{/* Results and Logs Section */}
			{workloadResult.status !== 'idle' && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
					{/* Card 1: Simulation Results */}
					<Card
						className={`p-4 h-full rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<div className="flex items-center mb-3">
							<AssessmentIcon style={{ color: '#9747FF' }} className="mr-2" />
							<h3
								className="text-xl font-medium"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								{workloadResult.data?.ran_on_hardware
									? 'Workload Result'
									: 'Simulation Result'}
							</h3>
						</div>
						{workloadResult.status === 'running' ? (
							<div className="flex justify-center items-center h-56">
								<CircularProgress color="secondary" />
							</div>
						) : workloadResult.status === 'error' ? (
							<div className="p-4 text-center">
								<Typography variant="body1" color="error">
									Failed to complete workload
								</Typography>
							</div>
						) : (
							<div className="space-y-2">
								{/* Algorithm-specific result fields */}
								{renderAlgorithmResults()}

								{/* Common result fields */}
								<div className="flex justify-between items-center">
									<div className="text-sm" style={{ color: '#999999' }}>
										Execution Time:
									</div>
									<div
										className="text-lg font-medium"
										style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
										title={
											workloadResult.data?.execution_time_sec
												? `${workloadResult.data.execution_time_sec} seconds`
												: ''
										}
									>
										{workloadResult.data?.execution_time_sec !== null &&
										workloadResult.data?.execution_time_sec !== undefined
											? `${workloadResult.data.execution_time_sec.toFixed(2)} s`
											: 'N/A'}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<div className="text-sm" style={{ color: '#999999' }}>
										QPU Time:
									</div>
									<div
										className="text-lg font-medium"
										style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
										title={
											workloadResult.data?.qpu_time_sec
												? `${workloadResult.data.qpu_time_sec} seconds`
												: ''
										}
									>
										{workloadResult.data?.qpu_time_sec !== null &&
										workloadResult.data?.qpu_time_sec !== undefined
											? `${workloadResult.data.qpu_time_sec.toFixed(2)} s`
											: 'N/A'}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<div className="text-sm" style={{ color: '#999999' }}>
										Circuit Depth:
									</div>
									<div
										className="text-lg font-medium"
										style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
									>
										{workloadResult.data?.circuit_depth || 'N/A'}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<div className="text-sm" style={{ color: '#999999' }}>
										Gate Count:
									</div>
									<div
										className="text-lg font-medium"
										style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
									>
										{workloadResult.data?.total_gate_count || 'N/A'}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<div className="text-sm" style={{ color: '#999999' }}>
										Backend Used:
									</div>
									<div
										className="text-lg font-medium"
										style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
									>
										{workloadResult.data?.backend_used || 'N/A'}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<div className="text-sm" style={{ color: '#999999' }}>
										Job ID:
									</div>
									<div
										className="text-lg font-medium flex items-center"
										style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
									>
										{workloadResult.data?.job_id ? (
											<>
												<span className="truncate max-w-32">
													{workloadResult.data.job_id.length > 15
														? `${workloadResult.data.job_id.substring(
																0,
																15
														  )}...`
														: workloadResult.data.job_id}
												</span>
												<IconButton
													size="small"
													onClick={() =>
														copyToClipboard(
															workloadResult.data!.job_id!,
															'Job ID'
														)
													}
												>
													<ContentCopyIcon fontSize="small" />
												</IconButton>
											</>
										) : (
											'N/A'
										)}
									</div>
								</div>
							</div>
						)}
					</Card>

					{/* Card 2: Execution Logs */}
					<Card
						className={`p-4 h-full rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<div className="flex items-center mb-3">
							<ComputerIcon style={{ color: '#9747FF' }} className="mr-2" />
							<h3
								className="text-xl font-medium"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								Execution Logs
							</h3>
						</div>
						<div
							className="overflow-auto p-2 font-mono text-xs"
							style={{
								backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
								color: isDarkMode ? '#c0c0c0' : '#333333',
								height: '250px',
								borderRadius: '8px',
							}}
						>
							{workloadResult.status === 'running' ? (
								<div className="p-4">
									<div className="flex items-center mb-2">
										<CircularProgress
											size={16}
											color="secondary"
											className="mr-2"
										/>
										<Typography
											variant="body2"
											style={{ color: isDarkMode ? '#c0c0c0' : '#333333' }}
										>
											{getCurrentStatusMessage()}
										</Typography>
									</div>
									<div
										className="mt-4 text-center"
										style={{ color: isDarkMode ? '#999999' : '#666666' }}
									>
										<Typography variant="caption">
											{runningMode === 'hardware'
												? 'Hardware execution may take several minutes to complete'
												: 'Simulation is running, please wait...'}
										</Typography>
									</div>
								</div>
							) : workloadResult.logs.length > 0 ? (
								workloadResult.logs.map((log, index) => (
									<div key={index} className="whitespace-pre-wrap mb-1">
										{log}
									</div>
								))
							) : (
								<div className="text-center p-4">
									<Typography variant="body2">
										Logs will appear here after execution
									</Typography>
								</div>
							)}
							<div ref={logsEndRef} />
						</div>
					</Card>

					{/* Card 3: Plot Data with Fullscreen Capability */}
					<Card
						className={`p-4 h-full rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center">
								<AssessmentIcon style={{ color: '#9747FF' }} className="mr-2" />
								<h3
									className="text-xl font-medium"
									style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									Distribution Plot
								</h3>
							</div>
							{workloadResult.plotDataUrl && (
								<IconButton
									onClick={() => setPlotFullscreen(true)}
									size="small"
									sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
								>
									<FullscreenIcon />
								</IconButton>
							)}
						</div>
						{workloadResult.status === 'running' ? (
							<div className="w-full h-[200px] flex justify-center items-center">
								<CircularProgress color="secondary" />
							</div>
						) : workloadResult.plotDataUrl ? (
							<div
								className="w-full h-[200px] flex justify-center items-center cursor-pointer"
								onClick={() => setPlotFullscreen(true)}
								style={{
									backgroundImage: `url('${workloadResult.plotDataUrl}')`,
									backgroundSize: 'contain',
									backgroundPosition: 'center',
									backgroundRepeat: 'no-repeat',
								}}
							></div>
						) : (
							<div className="w-full h-[200px] flex justify-center items-center">
								<Typography variant="body2">No plot available</Typography>
							</div>
						)}
						{workloadResult.data?.input_marked_states &&
							workloadResult.plotDataUrl && (
								<div
									className="mt-2 text-xs text-center"
									style={{ color: isDarkMode ? '#999999' : '#666666' }}
								>
									Highlighted bars represent marked states being searched for
								</div>
							)}
					</Card>
				</div>
			)}
		</div>
	);
};

export default QuantumWorkloadRunner;
