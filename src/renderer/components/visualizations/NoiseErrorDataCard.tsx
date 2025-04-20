import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { ProcessedQuantumData } from '../../utils/dataProcessingUtils';
import { useTheme } from '@mui/material/styles';
import {
	Skeleton,
	Box,
	Typography,
	Paper,
	Tooltip,
	Card,
	CardContent,
	Grid,
	FormControl,
	Select,
	MenuItem,
	InputLabel,
	ToggleButton,
	ToggleButtonGroup,
	Chip,
} from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import CompareIcon from '@mui/icons-material/Compare';
import { SelectChangeEvent } from '@mui/material';
import { Data, Layout } from 'plotly.js';

// Conditional logging helper
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

interface NoiseErrorDataCardProps {
	data: ProcessedQuantumData[];
	loading?: boolean;
	height?: number;
	onViewDetails?: (runId: string) => void;
	chartRef?: React.RefObject<any>;
}

// Define tooltips for quantum noise metrics
const NoiseTooltips = {
	gateError:
		'Average 2-qubit gate error rate for the backend. Lower values indicate better quantum hardware performance.',
	readoutError:
		'Average error rate when measuring qubit states. Represents the probability of incorrectly reading a qubit state.',
	t1Time:
		'T₁ relaxation time - how long a qubit stays in the |1⟩ state before decaying to |0⟩. Longer times are better.',
	t2Time:
		'T₂ coherence time - how long a qubit maintains superposition. Critical for algorithm performance. Longer times are better.',
	quantumVolume:
		'Quantum Volume - a holistic metric that represents the largest random circuit a quantum computer can successfully implement.',
};

type ViewType = 'chart' | 'comparison';

// Helper function to check if a backend is a hardware backend (not a simulator)
const isHardwareBackend = (backend: string | null): boolean => {
	if (!backend) return false;
	const lowerBackend = backend.toLowerCase();
	// Check if backend name contains simulator-related terms
	return !(
		lowerBackend.includes('simulator') ||
		lowerBackend.includes('sim') ||
		lowerBackend.includes('aer') ||
		lowerBackend.includes('qasm')
	);
};

const NoiseErrorDataCard: React.FC<NoiseErrorDataCardProps> = ({
	data,
	loading = false,
	height = 600,
	onViewDetails,
	chartRef,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [viewType, setViewType] = useState<ViewType>('chart');
	const [selectedMetric, setSelectedMetric] = useState<string>('gate_error');
	const localChartRef = useRef<any>(null);
	const plotRef = chartRef || localChartRef;
	const [chartWidth, setChartWidth] = useState<number>(0);
	const chartHeight = height - 100;

	// Filter to only include hardware backends
	const hardwareData = data.filter((item) =>
		isHardwareBackend(item.backend_used)
	);

	// Log the filtering process
	if (process.env.NODE_ENV === 'development') {
		console.log(
			`Filtered ${data.length} quantum results to ${hardwareData.length} hardware backends`
		);

		// Log which backends were excluded and included
		const allBackends = [...new Set(data.map((item) => item.backend_used))];
		console.log('All backends:', allBackends);

		const includedBackends = [
			...new Set(hardwareData.map((item) => item.backend_used)),
		];
		console.log('Hardware backends included:', includedBackends);

		const excludedBackends = allBackends.filter(
			(b) => !includedBackends.includes(b)
		);
		console.log('Simulator backends excluded:', excludedBackends);
	}

	// Extract backend types from hardware data only
	const allBackends = hardwareData
		.map((item) => item.backend_used || 'unknown')
		.filter(
			(value, index, self) => value !== null && self.indexOf(value) === index
		);

	// Group data by backend type (hardware only)
	const backendData = new Map<string, ProcessedQuantumData[]>();
	allBackends.forEach((backend) => {
		backendData.set(
			backend,
			hardwareData.filter((item) => item.backend_used === backend)
		);
	});

	// Handle view type change
	const handleViewTypeChange = (
		event: React.MouseEvent<HTMLElement>,
		newType: ViewType | null
	) => {
		if (newType !== null) {
			setViewType(newType);
		}
	};

	// Handle metric selection change
	const handleMetricChange = (event: SelectChangeEvent) => {
		setSelectedMetric(event.target.value);
	};

	// Prepare data for the chart based on selected metric
	const prepareChartData = (): Data[] => {
		const plotData: Data[] = [];

		// Map metric names to their property names in the data
		const metricToProperty: { [key: string]: string } = {
			gate_error: 'gate_error',
			readout_error: 'readout_error',
			t1_time: 't1_time',
			t2_time: 't2_time',
			quantum_volume: 'quantum_volume',
		};

		// Map metric names to their display units
		const metricUnits: { [key: string]: string } = {
			gate_error: '%',
			readout_error: '%',
			t1_time: 'μs',
			t2_time: 'μs',
			quantum_volume: '',
		};

		// Create trace for each backend
		backendData.forEach((backendItems, backend) => {
			const property = metricToProperty[selectedMetric];
			const values = backendItems
				.map(
					(item) =>
						item[property as keyof ProcessedQuantumData] as number | null
				)
				.filter((val) => val !== null) as number[];

			if (values.length > 0) {
				if (viewType === 'chart') {
					// For chart view, create bar chart
					plotData.push({
						x: [backend],
						y: [values.reduce((acc, val) => acc + val, 0) / values.length],
						error_y: {
							type: 'data',
							array: [
								Math.sqrt(
									values.reduce(
										(acc, val) =>
											acc +
											Math.pow(
												val - values.reduce((a, b) => a + b, 0) / values.length,
												2
											),
										0
									) / values.length
								),
							],
							visible: true,
						},
						name: backend,
						type: 'bar',
						marker: {
							color: getBackendColor(backend),
							opacity: 0.8,
						},
						hovertemplate: `<b>${backend}</b><br>Average: %{y:.2f}${metricUnits[selectedMetric]}<br>Samples: ${values.length}<extra></extra>`,
					});
				} else {
					// For comparison view, create box plot
					plotData.push({
						y: values,
						name: backend,
						type: 'box',
						boxpoints: 'all',
						jitter: 0.3,
						pointpos: -1.8,
						marker: {
							color: getBackendColor(backend),
							opacity: 0.8,
						},
						hoverinfo: 'y+name',
						hovertemplate: `<b>${backend}</b><br>Value: %{y:.2f}${metricUnits[selectedMetric]}<extra></extra>`,
					});
				}
			}
		});

		return plotData;
	};

	// Get color for a backend (consistent coloring)
	const getBackendColor = (backend: string) => {
		// Extract name pattern from backend string
		const lowerBackend = backend.toLowerCase();

		if (lowerBackend.includes('simulator') || lowerBackend.includes('sim')) {
			return '#4CAF50'; // Green for simulators
		} else if (lowerBackend.includes('ibm')) {
			return '#2196F3'; // Blue for IBM hardware
		} else if (lowerBackend.includes('ionq')) {
			return '#FF9800'; // Orange for IonQ
		} else if (lowerBackend.includes('rigetti')) {
			return '#E91E63'; // Pink for Rigetti
		} else {
			return '#9747FF'; // Default purple
		}
	};

	// Prepare chart layout
	const getChartLayout = (): Partial<Layout> => {
		// Map metric names to their axis titles
		const metricTitles: { [key: string]: string } = {
			gate_error: 'Gate Error Rate (%)',
			readout_error: 'Readout Error Rate (%)',
			t1_time: 'T₁ Relaxation Time (μs)',
			t2_time: 'T₂ Coherence Time (μs)',
			quantum_volume: 'Quantum Volume',
		};

		return {
			title: metricTitles[selectedMetric] || selectedMetric,
			height: chartHeight,
			width: chartWidth || undefined,
			paper_bgcolor: 'transparent',
			plot_bgcolor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
			font: {
				family: 'Arial, sans-serif',
				size: 12,
				color: isDarkMode ? '#ffffff' : '#333333',
			},
			margin: { l: 60, r: 30, t: 50, b: 120 },
			xaxis: {
				title: viewType === 'chart' ? 'Quantum Backend' : '',
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
				tickangle: -45,
			},
			yaxis: {
				title: metricTitles[selectedMetric] || selectedMetric,
				gridcolor: isDarkMode
					? 'rgba(255, 255, 255, 0.1)'
					: 'rgba(0, 0, 0, 0.1)',
				zeroline: true,
				zerolinecolor: isDarkMode
					? 'rgba(255, 255, 255, 0.2)'
					: 'rgba(0, 0, 0, 0.2)',
			},
			boxmode: 'group' as const,
		};
	};

	// Handle resize
	const handleResize = () => {
		if (plotRef.current && plotRef.current.el) {
			const containerWidth = plotRef.current.el.parentElement.clientWidth;
			setChartWidth(containerWidth - 40); // Adjust for padding
		}
	};

	// Initialize chart sizing
	useEffect(() => {
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	// Show loading state
	if (loading) {
		return (
			<Box sx={{ width: '100%', height: height }}>
				<Skeleton
					variant="rectangular"
					width="100%"
					height={height}
					animation="wave"
					sx={{
						bgcolor: isDarkMode
							? 'rgba(255, 255, 255, 0.1)'
							: 'rgba(0, 0, 0, 0.1)',
						borderRadius: '8px',
					}}
				/>
			</Box>
		);
	}

	// Show empty state if no data
	if (hardwareData.length === 0) {
		return (
			<Box
				sx={{
					width: '100%',
					height: height,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
					borderRadius: '8px',
					border: '1px dashed',
					borderColor: isDarkMode
						? 'rgba(255, 255, 255, 0.2)'
						: 'rgba(0, 0, 0, 0.2)',
				}}
			>
				<WarningIcon
					sx={{
						fontSize: 60,
						mb: 2,
						color: isDarkMode
							? 'rgba(255, 255, 255, 0.3)'
							: 'rgba(0, 0, 0, 0.3)',
					}}
				/>
				<Typography variant="h6" color="text.secondary">
					No hardware quantum data available
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
					Run quantum algorithms on hardware backends to see noise and error
					metrics.
				</Typography>
			</Box>
		);
	}

	// Check if we have any noise data in hardware backends
	const hasNoiseData = hardwareData.some(
		(item) =>
			item.gate_error !== null ||
			item.readout_error !== null ||
			item.t1_time !== null ||
			item.t2_time !== null ||
			item.quantum_volume !== null
	);

	if (!hasNoiseData) {
		return (
			<Box sx={{ width: '100%', height: height - 20 }}>
				<Card
					sx={{
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
						bgcolor: isDarkMode
							? 'rgba(0, 0, 0, 0.2)'
							: 'rgba(255, 255, 255, 0.7)',
						boxShadow: 2,
						borderRadius: 2,
					}}
				>
					<CardContent
						sx={{
							flexGrow: 1,
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<ErrorIcon
							sx={{
								fontSize: 60,
								color: 'warning.main',
								mb: 2,
							}}
						/>
						<Typography
							variant="h5"
							component="div"
							align="center"
							gutterBottom
						>
							No Noise & Error Data Available
						</Typography>
						<Typography
							variant="body1"
							color="text.secondary"
							align="center"
							sx={{ maxWidth: 600, mb: 3 }}
						>
							Your quantum hardware workloads don't have noise and error metrics
							recorded. This could be because:
						</Typography>
						<Box sx={{ width: '100%', maxWidth: 500 }}>
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<Paper
										sx={{
											p: 2,
											bgcolor: isDarkMode
												? 'rgba(30, 30, 30, 0.8)'
												: 'rgba(250, 250, 250, 0.9)',
											boxShadow: 1,
										}}
									>
										<Typography variant="body2">
											• Your quantum provider doesn't expose these metrics
											through their API
										</Typography>
									</Paper>
								</Grid>
								<Grid item xs={12}>
									<Paper
										sx={{
											p: 2,
											bgcolor: isDarkMode
												? 'rgba(30, 30, 30, 0.8)'
												: 'rgba(250, 250, 250, 0.9)',
											boxShadow: 1,
										}}
									>
										<Typography variant="body2">
											• You're using an older version of the quantum backend
											that doesn't report noise characteristics
										</Typography>
									</Paper>
								</Grid>
								<Grid item xs={12}>
									<Paper
										sx={{
											p: 2,
											bgcolor: isDarkMode
												? 'rgba(30, 30, 30, 0.8)'
												: 'rgba(250, 250, 250, 0.9)',
											boxShadow: 1,
										}}
									>
										<Typography variant="body2">
											• Run your quantum algorithms on real quantum hardware to
											get noise metrics
										</Typography>
									</Paper>
								</Grid>
							</Grid>
						</Box>
					</CardContent>
				</Card>
			</Box>
		);
	}

	return (
		<Box sx={{ width: '100%', height: height }}>
			<Box
				sx={{
					mb: 2,
					display: 'flex',
					justifyContent: 'space-between',
					flexWrap: 'wrap',
					gap: 2,
				}}
			>
				{/* View Type Selector */}
				<ToggleButtonGroup
					value={viewType}
					exclusive
					onChange={handleViewTypeChange}
					aria-label="view type"
					size="small"
					sx={{
						bgcolor: isDarkMode
							? 'rgba(0, 0, 0, 0.2)'
							: 'rgba(255, 255, 255, 0.7)',
					}}
				>
					<ToggleButton value="chart" aria-label="chart view">
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<SpeedIcon fontSize="small" />
							<Typography variant="body2">Average View</Typography>
						</Box>
					</ToggleButton>
					<ToggleButton value="comparison" aria-label="comparison view">
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<CompareIcon fontSize="small" />
							<Typography variant="body2">Distribution View</Typography>
						</Box>
					</ToggleButton>
				</ToggleButtonGroup>

				{/* Metric Selector */}
				<FormControl
					size="small"
					sx={{
						minWidth: 200,
						bgcolor: isDarkMode
							? 'rgba(0, 0, 0, 0.2)'
							: 'rgba(255, 255, 255, 0.7)',
					}}
				>
					<InputLabel id="noise-metric-label">Noise Metric</InputLabel>
					<Select
						labelId="noise-metric-label"
						id="noise-metric-select"
						value={selectedMetric}
						label="Noise Metric"
						onChange={handleMetricChange}
					>
						<MenuItem value="gate_error">
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<ErrorIcon fontSize="small" color="error" />
								<Typography>Gate Error Rate</Typography>
							</Box>
						</MenuItem>
						<MenuItem value="readout_error">
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<ErrorIcon fontSize="small" color="error" />
								<Typography>Readout Error Rate</Typography>
							</Box>
						</MenuItem>
						<MenuItem value="t1_time">
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<AccessTimeIcon fontSize="small" color="primary" />
								<Typography>T₁ Relaxation Time</Typography>
							</Box>
						</MenuItem>
						<MenuItem value="t2_time">
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<AccessTimeIcon fontSize="small" color="primary" />
								<Typography>T₂ Coherence Time</Typography>
							</Box>
						</MenuItem>
						<MenuItem value="quantum_volume">
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<SpeedIcon fontSize="small" color="success" />
								<Typography>Quantum Volume</Typography>
							</Box>
						</MenuItem>
					</Select>
				</FormControl>
			</Box>

			{/* Tooltip for the selected metric */}
			<Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
				<InfoOutlined
					fontSize="small"
					sx={{ mr: 1, color: 'text.secondary' }}
				/>
				<Typography variant="body2" color="text.secondary">
					{NoiseTooltips[selectedMetric as keyof typeof NoiseTooltips] ||
						'Select a noise metric to see detailed information about quantum hardware performance.'}
				</Typography>
			</Box>

			{/* Chart */}
			<Box
				sx={{
					height: chartHeight,
					width: '100%',
					bgcolor: isDarkMode
						? 'rgba(0, 0, 0, 0.1)'
						: 'rgba(255, 255, 255, 0.5)',
					borderRadius: 2,
					overflow: 'hidden',
					boxShadow: 1,
				}}
			>
				<Plot
					data={prepareChartData()}
					layout={getChartLayout()}
					config={{
						responsive: true,
						displayModeBar: true,
						modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
						displaylogo: false,
					}}
					style={{ width: '100%', height: '100%' }}
					useResizeHandler={true}
					ref={plotRef}
					onInitialized={() => handleResize()}
				/>
			</Box>

			{/* Key Insights */}
			<Box sx={{ mt: 3 }}>
				<Typography variant="subtitle1" gutterBottom>
					Key Insights
				</Typography>
				<Grid container spacing={2}>
					{/* Gate Error Rate Insight */}
					{selectedMetric === 'gate_error' && (
						<Grid item xs={12} md={6}>
							<Paper
								sx={{
									p: 2,
									bgcolor: isDarkMode
										? 'rgba(30, 30, 30, 0.8)'
										: 'rgba(250, 250, 250, 0.9)',
									boxShadow: 1,
								}}
							>
								<Typography variant="body2">
									Lower gate error rates enable longer and more complex quantum
									circuits to run successfully. Hardware with gate error rates
									&lt;1% can support deeper circuits with more qubits.
								</Typography>
							</Paper>
						</Grid>
					)}

					{/* Readout Error Rate Insight */}
					{selectedMetric === 'readout_error' && (
						<Grid item xs={12} md={6}>
							<Paper
								sx={{
									p: 2,
									bgcolor: isDarkMode
										? 'rgba(30, 30, 30, 0.8)'
										: 'rgba(250, 250, 250, 0.9)',
									boxShadow: 1,
								}}
							>
								<Typography variant="body2">
									Readout errors directly impact the final measurement results
									of quantum algorithms. Error mitigation techniques are
									essential when readout error rates exceed 1%.
								</Typography>
							</Paper>
						</Grid>
					)}

					{/* T1 Time Insight */}
					{selectedMetric === 't1_time' && (
						<Grid item xs={12} md={6}>
							<Paper
								sx={{
									p: 2,
									bgcolor: isDarkMode
										? 'rgba(30, 30, 30, 0.8)'
										: 'rgba(250, 250, 250, 0.9)',
									boxShadow: 1,
								}}
							>
								<Typography variant="body2">
									T₁ times represent how long a qubit can stay in the excited
									state. Circuits with execution times exceeding the T₁ time
									will lose information due to qubit relaxation.
								</Typography>
							</Paper>
						</Grid>
					)}

					{/* T2 Time Insight */}
					{selectedMetric === 't2_time' && (
						<Grid item xs={12} md={6}>
							<Paper
								sx={{
									p: 2,
									bgcolor: isDarkMode
										? 'rgba(30, 30, 30, 0.8)'
										: 'rgba(250, 250, 250, 0.9)',
									boxShadow: 1,
								}}
							>
								<Typography variant="body2">
									T₂ coherence time limits how long qubits can maintain
									superposition states. Algorithms requiring long phase
									coherence (like Shor's algorithm) are particularly sensitive
									to T₂ limitations.
								</Typography>
							</Paper>
						</Grid>
					)}

					{/* Quantum Volume Insight */}
					{selectedMetric === 'quantum_volume' && (
						<Grid item xs={12} md={6}>
							<Paper
								sx={{
									p: 2,
									bgcolor: isDarkMode
										? 'rgba(30, 30, 30, 0.8)'
										: 'rgba(250, 250, 250, 0.9)',
									boxShadow: 1,
								}}
							>
								<Typography variant="body2">
									Quantum Volume is a holistic metric that accounts for both
									qubit count and error rates. Higher Quantum Volume indicates
									greater computational power for handling complex quantum
									tasks.
								</Typography>
							</Paper>
						</Grid>
					)}

					{/* General Insight */}
					<Grid item xs={12} md={6}>
						<Paper
							sx={{
								p: 2,
								bgcolor: isDarkMode
									? 'rgba(30, 30, 30, 0.8)'
									: 'rgba(250, 250, 250, 0.9)',
								boxShadow: 1,
							}}
						>
							<Typography variant="body2">
								Quantum algorithms that use fewer two-qubit gates and have
								shorter depth will generally perform better on noisy hardware.
								Compare the noise profile with your circuit requirements to
								select the optimal quantum backend.
							</Typography>
						</Paper>
					</Grid>
				</Grid>
			</Box>
		</Box>
	);
};

export default NoiseErrorDataCard;
