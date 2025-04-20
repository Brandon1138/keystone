import React, { useState, useEffect } from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Grid,
	Box,
	Divider,
	Chip,
	Paper,
	CircularProgress,
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
	Modal,
	IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExtensionIcon from '@mui/icons-material/Extension';
import MemoryIcon from '@mui/icons-material/Memory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import StraightenIcon from '@mui/icons-material/Straighten';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import PhotoIcon from '@mui/icons-material/Photo';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { ProcessedQuantumData } from '../../utils/dataProcessingUtils';
// Removed QuantumResultsChart import since distribution plot image is used instead

interface QuantumRunDetailsDialogProps {
	open: boolean;
	onClose: () => void;
	runId: string | null;
	data: ProcessedQuantumData[];
}

const QuantumRunDetailsDialog: React.FC<QuantumRunDetailsDialogProps> = ({
	open,
	onClose,
	runId,
	data,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [loading, setLoading] = useState(true);
	const [run, setRun] = useState<ProcessedQuantumData | null>(null);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imagePath, setImagePath] = useState<string | null>(null);
	const [plotFullscreen, setPlotFullscreen] = useState(false);

	useEffect(() => {
		if (open && runId) {
			// Find the run data
			const foundRun = data.find((item) => item.runId === runId) || null;
			setRun(foundRun);
			setLoading(false);

			// Request plot image via quantumAPI if any plot file path is stored
			if (foundRun && foundRun.plot_file_path) {
				if (window.quantumAPI && window.quantumAPI.getQuantumPlot) {
					window.quantumAPI
						.getQuantumPlot(foundRun.plot_file_path)
						.then((result: any) => {
							if (result.status === 'success' && result.plotBase64) {
								// data URL from base64
								setImagePath(`data:image/png;base64,${result.plotBase64}`);
							} else {
								// fallback to local file path
								setImagePath(foundRun.plot_file_path ?? null);
							}
						})
						.catch((error: any) => {
							console.error('Failed to load quantum plot via API:', error);
							setImagePath(foundRun.plot_file_path ?? null);
						});
				} else {
					// no API, use direct file path
					setImagePath(foundRun.plot_file_path ?? null);
				}
			} else {
				setImagePath(null);
			}
		} else {
			setRun(null);
			setImagePath(null);
			setLoading(true);
		}
	}, [open, runId, data]);

	// Reset image loaded state when dialog closes
	useEffect(() => {
		if (!open) {
			setImageLoaded(false);
			setPlotFullscreen(false);
		}
	}, [open]);

	// Helper function to format algorithm specific data
	const renderAlgorithmSpecificData = () => {
		if (!run) return null;

		if (run.quantum_type === 'Quantum_Shor') {
			// Display Shor's algorithm specific data
			return (
				<Paper
					sx={{
						p: 2,
						mb: 2,
						backgroundColor: isDarkMode ? '#212121' : '#E9E9E9',
						borderRadius: '8px',
					}}
				>
					<Typography variant="subtitle1" gutterBottom>
						Shor's Algorithm Results
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<ListItem>
								<ListItemIcon>
									<StraightenIcon sx={{ color: '#9747FF' }} />
								</ListItemIcon>
								<ListItemText
									primary="Target Number (N)"
									secondary={
										run.algorithm.includes('N=')
											? run.algorithm.split('N=')[1].split(' ')[0]
											: '15'
									}
								/>
							</ListItem>
						</Grid>
						<Grid item xs={6}>
							<ListItem>
								<ListItemIcon>
									<DeviceHubIcon sx={{ color: '#9747FF' }} />
								</ListItemIcon>
								<ListItemText
									primary="Success"
									secondary={
										run.success_rate && run.success_rate > 0
											? 'Factors found successfully'
											: 'Failed to find factors'
									}
								/>
							</ListItem>
						</Grid>
					</Grid>
				</Paper>
			);
		} else if (run.quantum_type === 'Quantum_Grover') {
			// Display Grover's algorithm specific data
			return (
				<Paper
					sx={{
						p: 2,
						mb: 2,
						backgroundColor: isDarkMode ? '#212121' : '#E9E9E9',
						borderRadius: '8px',
					}}
				>
					<Typography variant="subtitle1" gutterBottom>
						Grover's Algorithm Results
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<ListItem>
								<ListItemIcon>
									<DeviceHubIcon sx={{ color: '#9747FF' }} />
								</ListItemIcon>
								<ListItemText
									primary="Qubits"
									secondary={
										run.algorithm.includes('qubits=')
											? run.algorithm.split('qubits=')[1].split(' ')[0]
											: '?'
									}
								/>
							</ListItem>
						</Grid>
						<Grid item xs={6}>
							<ListItem>
								<ListItemIcon>
									<CheckCircleIcon
										sx={{
											color:
												(run.success_rate && run.success_rate > 0) ||
												(run.confidence && run.confidence >= 0.4)
													? '#4caf50'
													: '#f44336',
										}}
									/>
								</ListItemIcon>
								<ListItemText
									primary="Target Found"
									secondary={
										(run.success_rate && run.success_rate > 0) ||
										(run.confidence && run.confidence >= 0.4)
											? 'Marked state found successfully'
											: 'Failed to find marked state'
									}
								/>
							</ListItem>
						</Grid>
					</Grid>
				</Paper>
			);
		}

		return null;
	};

	if (!open) return null;

	return (
		<>
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
					<Box className="flex justify-between items-center mb-3">
						<Typography id="plot-modal-title" variant="h6" component="h2">
							Quantum Circuit Execution Histogram
						</Typography>
						<IconButton onClick={() => setPlotFullscreen(false)}>
							<FullscreenExitIcon />
						</IconButton>
					</Box>
					{imagePath ? (
						<Box className="w-full h-5/6 flex justify-center items-center">
							<img
								src={
									imagePath.startsWith('data:')
										? imagePath
										: `file:///${imagePath.replace(/\\/g, '/')}`
								}
								alt="Distribution plot"
								style={{
									maxWidth: '100%',
									maxHeight: '100%',
									objectFit: 'contain',
								}}
							/>
						</Box>
					) : (
						<Box className="w-full h-5/6 flex justify-center items-center">
							<Typography variant="body1">No plot data available</Typography>
						</Box>
					)}
				</Box>
			</Modal>

			<Dialog
				open={open}
				onClose={onClose}
				maxWidth="lg"
				fullWidth
				PaperProps={{
					sx: {
						backgroundColor: isDarkMode ? '#212121' : '#f5f5f5',
						borderRadius: '12px',
						boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
					},
				}}
			>
				<DialogTitle sx={{ pb: 1 }}>
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<Typography variant="h6" component="div">
							Quantum Run Details
						</Typography>
						<Button
							size="small"
							onClick={onClose}
							startIcon={<CloseIcon />}
							sx={{ color: isDarkMode ? '#fff' : '#000' }}
						>
							Close
						</Button>
					</Box>
				</DialogTitle>

				<Divider />

				<DialogContent>
					{loading ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
							<CircularProgress />
						</Box>
					) : run ? (
						<Grid container spacing={3}>
							{/* Header section with key information */}
							<Grid item xs={12}>
								<Paper sx={{ p: 2, borderRadius: '8px' }}>
									<Box sx={{ mb: 2 }}>
										<Typography variant="h5" gutterBottom>
											{run.algorithm}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Run ID: {run.runId}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Timestamp: {new Date(run.timestamp).toLocaleString()}
										</Typography>
									</Box>

									<Box
										sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}
									>
										<Chip
											label={`Backend: ${run.backend_used || 'Unknown'}`}
											color="primary"
											size="small"
											icon={<MemoryIcon />}
										/>
										<Chip
											label={`Shots: ${run.shots}`}
											color="secondary"
											size="small"
											icon={<ExtensionIcon />}
										/>
										<Chip
											label={
												(run.success_rate && run.success_rate > 0) ||
												(run.quantum_type === 'Quantum_Grover' &&
													run.confidence &&
													run.confidence >= 0.4)
													? 'Success'
													: 'Failed'
											}
											color={
												(run.success_rate && run.success_rate > 0) ||
												(run.quantum_type === 'Quantum_Grover' &&
													run.confidence &&
													run.confidence >= 0.4)
													? 'success'
													: 'error'
											}
											size="small"
											icon={
												(run.success_rate && run.success_rate > 0) ||
												(run.quantum_type === 'Quantum_Grover' &&
													run.confidence &&
													run.confidence >= 0.4) ? (
													<CheckCircleIcon />
												) : (
													<ErrorOutlineIcon />
												)
											}
										/>
									</Box>
								</Paper>
							</Grid>

							{/* Algorithm-specific section */}
							<Grid item xs={12}>
								{renderAlgorithmSpecificData()}
							</Grid>

							{/* Distribution and Results */}
							<Grid item xs={12}>
								<Grid container spacing={3}>
									<Grid item xs={12} md={6}>
										<Paper
											className={`p-4 h-full rounded-xl shadow-md transition-all ${
												isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
											}`}
										>
											<div className="flex items-center mb-3">
												<AssessmentIcon
													sx={{ color: '#9747FF' }}
													className="mr-2"
												/>
												<Typography variant="subtitle1">Results</Typography>
											</div>
											<Box
												sx={{
													display: 'flex',
													flexDirection: 'column',
													gap: 1,
												}}
											>
												{run!.quantum_type === 'Quantum_Shor' && (
													<>
														{' '}
														<Box
															sx={{
																display: 'flex',
																justifyContent: 'space-between',
															}}
														>
															<Typography variant="body2">
																Target Number (N)
															</Typography>
															<Typography variant="body2">
																{run!.algorithm.includes('N=')
																	? run!.algorithm.split('N=')[1].split(' ')[0]
																	: 'N/A'}
															</Typography>
														</Box>
														<Box
															sx={{
																display: 'flex',
																justifyContent: 'space-between',
															}}
														>
															<Typography variant="body2">Success</Typography>
															<Typography variant="body2">
																{run!.success_rate && run!.success_rate > 0
																	? 'Factors found successfully'
																	: 'Failed to find factors'}
															</Typography>
														</Box>{' '}
													</>
												)}
												{run!.quantum_type === 'Quantum_Grover' && (
													<>
														{' '}
														<Box
															sx={{
																display: 'flex',
																justifyContent: 'space-between',
															}}
														>
															<Typography variant="body2">Qubits</Typography>
															<Typography variant="body2">
																{run!.algorithm.includes('qubits=')
																	? run!.algorithm
																			.split('qubits=')[1]
																			.split(' ')[0]
																	: 'N/A'}
															</Typography>
														</Box>
														<Box
															sx={{
																display: 'flex',
																justifyContent: 'space-between',
															}}
														>
															<Typography variant="body2">
																Target Found
															</Typography>
															<Typography variant="body2">
																{(run!.success_rate && run!.success_rate > 0) ||
																(run!.confidence && run!.confidence >= 0.4)
																	? 'Marked state found successfully'
																	: 'Failed to find marked state'}
															</Typography>
														</Box>{' '}
													</>
												)}
												<Divider sx={{ my: 1 }} />
												<Box
													sx={{
														display: 'flex',
														justifyContent: 'space-between',
													}}
												>
													<Typography variant="body2">
														Execution Time
													</Typography>
													<Typography variant="body2">
														{run!.execution_time_sec !== null
															? `${run!.execution_time_sec!.toFixed(2)} s`
															: 'N/A'}
													</Typography>
												</Box>
												<Box
													sx={{
														display: 'flex',
														justifyContent: 'space-between',
													}}
												>
													<Typography variant="body2">QPU Time</Typography>
													<Typography variant="body2">
														{run!.qpu_time_sec !== null
															? `${run!.qpu_time_sec!.toFixed(2)} s`
															: 'N/A'}
													</Typography>
												</Box>
												<Box
													sx={{
														display: 'flex',
														justifyContent: 'space-between',
													}}
												>
													<Typography variant="body2">
														Total Gate Count
													</Typography>
													<Typography variant="body2">
														{run!.total_gate_count !== null
															? run!.total_gate_count
															: 'N/A'}
													</Typography>
												</Box>
												<Box
													sx={{
														display: 'flex',
														justifyContent: 'space-between',
													}}
												>
													<Typography variant="body2">Backend</Typography>
													<Typography variant="body2">
														{run!.backend_used || 'N/A'}
													</Typography>
												</Box>
											</Box>
										</Paper>
									</Grid>
									<Grid item xs={12} md={6}>
										<Paper
											className={`p-4 h-full rounded-xl shadow-md transition-all ${
												isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
											}`}
										>
											<div className="flex items-center justify-between mb-3">
												<div className="flex items-center">
													<AssessmentIcon
														sx={{ color: '#9747FF' }}
														className="mr-2"
													/>
													<h3
														className="text-xl font-medium"
														style={{
															color: isDarkMode ? '#FFFFFF' : '#000000',
														}}
													>
														Distribution Plot
													</h3>
												</div>
												{imagePath && (
													<IconButton
														onClick={() => setPlotFullscreen(true)}
														size="small"
														sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
													>
														<FullscreenIcon />
													</IconButton>
												)}
											</div>
											{imagePath ? (
												<div
													className="w-full h-[200px] flex justify-center items-center cursor-pointer"
													onClick={() => setPlotFullscreen(true)}
												>
													{!imageLoaded && <CircularProgress size={40} />}
													<img
														src={
															imagePath.startsWith('data:')
																? imagePath
																: `file:///${imagePath.replace(/\\/g, '/')}`
														}
														alt="Distribution plot"
														style={{
															maxWidth: '100%',
															maxHeight: '200px',
															objectFit: 'contain',
															transition: 'opacity 0.3s ease-in-out',
														}}
														onLoad={() => setImageLoaded(true)}
														onError={(e) => {
															console.error('Failed to load plot:', e);
															setImageLoaded(true);
														}}
													/>
												</div>
											) : (
												<div className="w-full h-[200px] flex justify-center items-center flex-col">
													<PhotoIcon
														sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }}
													/>
													<Typography variant="body2" color="text.secondary">
														No distribution plot available for this run
													</Typography>
												</div>
											)}
										</Paper>
									</Grid>
								</Grid>
							</Grid>
						</Grid>
					) : (
						<Box sx={{ p: 4, textAlign: 'center' }}>
							<Typography variant="body1" color="text.secondary">
								No run data found for the specified ID
							</Typography>
						</Box>
					)}
				</DialogContent>

				<DialogActions sx={{ p: 2 }}>
					<Button onClick={onClose} color="primary">
						Close
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default QuantumRunDetailsDialog;
