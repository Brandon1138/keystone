import React, { useState } from 'react';
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
} from '@mui/material';
import NetworkPingIcon from '@mui/icons-material/NetworkPing';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ComputerIcon from '@mui/icons-material/Computer';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { useTheme } from '@mui/material/styles';
import { Card } from './ui/card';
import { Speedometer } from './Speedometer';

/**
 * Quantum Workload Runner Component
 */
export const QuantumWorkloadRunner: React.FC = () => {
	const [algorithm, setAlgorithm] = useState('shors');
	const [ibmApiKey, setIbmApiKey] = useState('');
	const [showApiKey, setShowApiKey] = useState(false);
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
	const [plotFullscreen, setPlotFullscreen] = useState(false);
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Mock simulation results
	const simulationResults = {
		factorsFound: '3,5',
		executionTime: '1.32 s',
		circuitDepth: '283',
		gateCount: '1457',
		backendUsed: 'ibmq_quito',
		successProbability: '87%',
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

	return (
		<div className="space-y-5">
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
					<div
						className="w-full h-5/6 flex justify-center items-center"
						style={{
							backgroundImage: "url('/histogram-plot.png')",
							backgroundSize: 'contain',
							backgroundPosition: 'center',
							backgroundRepeat: 'no-repeat',
						}}
					></div>
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
								onChange={(e) => setAlgorithm(e.target.value)}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'.MuiOutlinedInput-notchedOutline': {
										borderColor: 'rgba(0, 0, 0, 0.23)',
									},
								}}
							>
								<MenuItem value="shors">Shor's Algorithm</MenuItem>
								<MenuItem value="grovers">Grover's Algorithm</MenuItem>
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

					{/* IBM Quantum API Key Field */}
					<div>
						<TextField
							fullWidth
							label="IBM Quantum API Key"
							variant="outlined"
							value={ibmApiKey}
							onChange={(e) => setIbmApiKey(e.target.value)}
							type={showApiKey ? 'text' : 'password'}
							InputProps={{
								endAdornment: (
									<InputAdornment position="end">
										<IconButton
											onClick={() => setShowApiKey(!showApiKey)}
											edge="end"
											size="small"
										>
											{showApiKey ? (
												<VisibilityOffIcon fontSize="small" />
											) : (
												<VisibilityIcon fontSize="small" />
											)}
										</IconButton>
										<IconButton
											onClick={() => copyToClipboard(ibmApiKey, 'API Key')}
											edge="end"
											size="small"
											disabled={!ibmApiKey}
										>
											<ContentCopyIcon fontSize="small" />
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
									fontFamily: 'monospace',
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

				{/* Action Buttons */}
				<div className="flex space-x-4">
					<Button
						variant="outlined"
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
					>
						Run Simulation
					</Button>
					<Button
						variant="contained"
						disabled={!ibmApiKey}
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
					>
						Run on IBM Q
					</Button>
				</div>
			</Card>

			{/* Metrics Dashboard - Three Cards */}
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
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<div className="text-sm" style={{ color: '#999999' }}>
								Factors Found:
							</div>
							<div
								className="text-lg font-medium"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								{simulationResults.factorsFound}
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
								{simulationResults.executionTime}
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
								{simulationResults.circuitDepth}
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
								{simulationResults.gateCount}
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
								{simulationResults.backendUsed}
							</div>
						</div>
						<div className="flex justify-between items-center">
							<div className="text-sm" style={{ color: '#999999' }}>
								Success Probability:
							</div>
							<div
								className="text-lg font-medium"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								{simulationResults.successProbability}
							</div>
						</div>
					</div>
				</Card>

				{/* Card 2: Quantum Computer Visualization */}
				<Card
					className={`p-4 h-full rounded-xl shadow-md transition-all ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					}`}
				>
					<div className="flex flex-col items-center justify-center h-full">
						<img
							src="images/quantum_computer.png"
							alt="Quantum Computer Visualization"
							className="max-h-[260px] object-contain"
						/>
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
						<IconButton
							onClick={() => setPlotFullscreen(true)}
							size="small"
							sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							<FullscreenIcon />
						</IconButton>
					</div>
					<div
						className="w-full h-[200px] flex justify-center items-center cursor-pointer"
						onClick={() => setPlotFullscreen(true)}
						style={{
							backgroundImage: "url('/histogram-plot.png')",
							backgroundSize: 'contain',
							backgroundPosition: 'center',
							backgroundRepeat: 'no-repeat',
						}}
					></div>
				</Card>
			</div>
		</div>
	);
};

export default QuantumWorkloadRunner;
