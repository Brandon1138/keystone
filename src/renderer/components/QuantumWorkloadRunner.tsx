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
import { useTheme } from '@mui/material/styles';
import { Card } from './ui/card';
import { Speedometer } from './Speedometer';

/**
 * Type definitions for the quantum workload result
 */
interface QuantumWorkloadResult {
	status: 'success' | 'error' | 'running' | 'idle';
	data?: {
		n_value: number;
		a_value: number;
		factors: number[] | null;
		execution_time_sec: number | null;
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
	const [apiKey, setApiKey] = useState('');
	const [showApiKey, setShowApiKey] = useState(false);
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
	const [plotFullscreen, setPlotFullscreen] = useState(false);
	const [isRunning, setIsRunning] = useState(false);
	const [workloadResult, setWorkloadResult] = useState<QuantumWorkloadResult>({
		status: 'idle',
		logs: [],
		plotFilePath: null,
		plotDataUrl: null,
	});
	const logsEndRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

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
		setShots(value === 'shors' ? '4096' : '10000');
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
			// Reset state
			setIsRunning(true);
			setWorkloadResult({
				status: 'running',
				logs: [],
				plotFilePath: null,
				plotDataUrl: null,
			});

			// Parse shots and get plot theme
			const shotsNumber = parseInt(shots, 10);
			const plotTheme = isDarkMode ? 'dark' : 'light';

			// Run the workload
			const result = await window.quantumAPI.runQuantumWorkload(
				apiKey,
				shotsNumber,
				useHardware,
				plotTheme
			);

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
			setIsRunning(false);

			// Restore the scroll position after the operation completes
			// Use a small delay to ensure the DOM has updated
			setTimeout(() => {
				window.scrollTo(0, scrollPosition);
			}, 50);
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
							<InputLabel id="algorithm-label">Algorithm</InputLabel>
							<Select
								labelId="algorithm-label"
								id="algorithm"
								value={algorithm}
								onChange={(e) => handleAlgorithmChange(e.target.value)}
								disabled={isRunning}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'.MuiOutlinedInput-notchedOutline': {
										borderColor: 'rgba(0, 0, 0, 0.23)',
									},
								}}
							>
								<MenuItem value="shors">Shor's Algorithm</MenuItem>
								<MenuItem value="grovers" disabled>
									Grover's Algorithm
								</MenuItem>
							</Select>
						</FormControl>
					</div>

					{/* N-Value Field */}
					<div>
						<TextField
							fullWidth
							label="N-value"
							variant="outlined"
							defaultValue="15"
							InputProps={{
								readOnly: true,
							}}
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								borderRadius: '8px',
								overflow: 'visible',
								'& .MuiOutlinedInput-root': {
									borderRadius: '8px',
									overflow: 'hidden',
								},
								'.MuiOutlinedInput-notchedOutline': {
									borderColor: 'rgba(0, 0, 0, 0.23)',
									borderRadius: '8px',
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
								'.MuiOutlinedInput-notchedOutline': {
									borderColor: 'rgba(0, 0, 0, 0.23)',
									borderRadius: '8px',
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

				{/* IBM API Key Field */}
				<div className="mb-6">
					<TextField
						fullWidth
						label="IBM Quantum API Key"
						variant="outlined"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						disabled={isRunning}
						type={showApiKey ? 'text' : 'password'}
						InputProps={{
							endAdornment: (
								<InputAdornment position="end">
									<IconButton
										aria-label="toggle api key visibility"
										onClick={() => setShowApiKey(!showApiKey)}
										edge="end"
									>
										{showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
									</IconButton>
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
							'.MuiOutlinedInput-notchedOutline': {
								borderColor: 'rgba(0, 0, 0, 0.23)',
								borderRadius: '8px',
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
					<Typography
						variant="caption"
						className="mt-1 block"
						style={{ color: isDarkMode ? '#AAAAAA' : '#666666' }}
					>
						Required for both simulation and hardware runs. Get your key from{' '}
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
						disabled={isRunning || !apiKey}
						onClick={() => runQuantumWorkload(false)}
						sx={{
							backgroundColor: isDarkMode
								? 'rgba(255, 255, 255, 0.08)'
								: 'rgba(0, 0, 0, 0.04)',
							color: isDarkMode
								? 'rgba(255, 255, 255, 0.85)'
								: 'rgba(0, 0, 0, 0.75)',
							borderColor: isDarkMode
								? 'rgba(255, 255, 255, 0.23)'
								: 'rgba(0, 0, 0, 0.23)',
							padding: '10px 24px',
							fontSize: '0.9rem',
							fontWeight: 'bold',
							textTransform: 'uppercase',
							borderRadius: '8px',
							'&:hover': {
								backgroundColor: isDarkMode
									? 'rgba(255, 255, 255, 0.12)'
									: 'rgba(0, 0, 0, 0.08)',
								borderColor: isDarkMode
									? 'rgba(255, 255, 255, 0.3)'
									: 'rgba(0, 0, 0, 0.3)',
							},
						}}
						startIcon={isRunning ? <CircularProgress size={20} /> : null}
					>
						{isRunning ? 'Running...' : 'Run Simulation'}
					</Button>
					<Button
						variant="contained"
						disabled={isRunning || !apiKey}
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
							isRunning ? <CircularProgress size={20} color="inherit" /> : null
						}
					>
						{isRunning ? 'Running...' : 'Run on IBM Q'}
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
								Simulation Result
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
								<div className="flex justify-between items-center">
									<div className="text-sm" style={{ color: '#999999' }}>
										Factors Found:
									</div>
									<div
										className="text-lg font-medium"
										style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
									>
										{workloadResult.data?.factors
											? workloadResult.data.factors.join(', ')
											: 'None'}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<div className="text-sm" style={{ color: '#999999' }}>
										Execution Time:
									</div>
									<div
										className="text-lg font-medium"
										style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
									>
										{workloadResult.data?.execution_time_sec
											? `${workloadResult.data.execution_time_sec} s`
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
													{workloadResult.data.job_id}
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
							{workloadResult.logs.length > 0 ? (
								workloadResult.logs.map((log, index) => (
									<div key={index} className="whitespace-pre-wrap mb-1">
										{log}
									</div>
								))
							) : (
								<div className="text-center p-4">
									<Typography variant="body2">
										Logs will appear here during execution
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
					</Card>
				</div>
			)}
		</div>
	);
};

export default QuantumWorkloadRunner;
