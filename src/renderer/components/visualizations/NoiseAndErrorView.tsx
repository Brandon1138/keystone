import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from '@mui/material/styles';
import {
	Box,
	Typography,
	Paper,
	Grid,
	Card,
	CardContent,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	SelectChangeEvent,
	Tooltip,
	CircularProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ProcessedQuantumData } from '../../utils/dataProcessingUtils';

interface NoiseAndErrorViewProps {
	data: ProcessedQuantumData[];
	loading?: boolean;
	height?: number;
}

export const NoiseAndErrorView: React.FC<NoiseAndErrorViewProps> = ({
	data,
	loading = false,
	height = 600,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const containerRef = useRef<HTMLDivElement>(null);
	const [chartWidth, setChartWidth] = useState<number>(0);
	const [backendFilter, setBackendFilter] = useState<string>('all');

	// Extract unique backends for filtering
	const uniqueBackends = Array.from(
		new Set(data.map((item) => item.backend_used || 'Unknown'))
	)
		.filter((backend) => backend !== null)
		.sort();

	// Update chart dimensions on resize
	useEffect(() => {
		const updateDimensions = () => {
			if (containerRef.current) {
				setChartWidth(containerRef.current.clientWidth);
			}
		};

		updateDimensions();
		window.addEventListener('resize', updateDimensions);
		return () => window.removeEventListener('resize', updateDimensions);
	}, []);

	// Handle backend filter change
	const handleBackendChange = (event: SelectChangeEvent) => {
		setBackendFilter(event.target.value);
	};

	// Filter data based on selected backend
	const filteredData =
		backendFilter === 'all'
			? data
			: data.filter((item) => item.backend_used === backendFilter);

	// Sort data by timestamp for temporal charts
	const sortedData = [...filteredData].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	);

	// Prepare data for Temporal Noise Trend chart
	const temporalNoiseData = [
		{
			x: sortedData.map((item) => new Date(item.timestamp)),
			y: sortedData.map((item) => {
				const error = item.gate_error;
				return error != null ? error * 100 : null;
			}),
			type: 'scatter' as const,
			mode: 'lines+markers' as const,
			name: 'Gate Error (%)',
			line: { color: '#E91E63', width: 2 },
			marker: { size: 8, symbol: 'circle' },
		},
		{
			x: sortedData.map((item) => new Date(item.timestamp)),
			y: sortedData.map((item) => {
				const error = item.readout_error;
				return error != null ? error * 100 : null;
			}),
			type: 'scatter' as const,
			mode: 'lines+markers' as const,
			name: 'Readout Error (%)',
			line: { color: '#3F51B5', width: 2 },
			marker: { size: 8, symbol: 'square' },
		},
	];

	// Prepare data for Error-Composition Stacked Bar chart
	const errorComponentsData = sortedData.map((item) => {
		// Extract or default error values
		const gateError = item.gate_error != null ? item.gate_error : 0;
		const readoutError = item.readout_error != null ? item.readout_error : 0;

		// Extract coherence times
		const t1 = item.t1_time != null ? item.t1_time : 0;
		const t2 = item.t2_time != null ? item.t2_time : 0;

		// Calculate decoherence contribution
		let decoherence = 0;
		if (t1 > 0 || t2 > 0) {
			const avgTime = (t1 + t2) / (t1 > 0 && t2 > 0 ? 2 : 1);
			decoherence = avgTime > 0 ? 1 / (100 * avgTime) : 0;
		}

		// Estimate error components
		const singleQubitError = gateError * 0.25;
		const twoQubitError = gateError * 0.75;

		// Format date for labels
		const date = new Date(item.timestamp);
		const dateLabel = `${date.toLocaleString()} (${
			item.backend_used || 'Unknown'
		})`;

		return {
			dateLabel,
			singleQubitError: Math.max(0, singleQubitError * 100),
			twoQubitError: Math.max(0, twoQubitError * 100),
			readoutError: Math.max(0, readoutError * 100),
			decoherence: Math.max(0, decoherence * 100),
		};
	});

	// Prepare stack bar data
	const errorStackData = [
		{
			x: errorComponentsData.map((d) => d.dateLabel),
			y: errorComponentsData.map((d) => d.singleQubitError),
			name: 'Single-Qubit Gates',
			type: 'bar' as const,
			marker: { color: '#4CAF50' },
		},
		{
			x: errorComponentsData.map((d) => d.dateLabel),
			y: errorComponentsData.map((d) => d.twoQubitError),
			name: 'Two-Qubit Gates',
			type: 'bar' as const,
			marker: { color: '#2196F3' },
		},
		{
			x: errorComponentsData.map((d) => d.dateLabel),
			y: errorComponentsData.map((d) => d.readoutError),
			name: 'Readout',
			type: 'bar' as const,
			marker: { color: '#FF9800' },
		},
		{
			x: errorComponentsData.map((d) => d.dateLabel),
			y: errorComponentsData.map((d) => d.decoherence),
			name: 'Decoherence',
			type: 'bar' as const,
			marker: { color: '#F44336' },
		},
	];

	// Prepare T1 vs T2 scatter plot data
	const t1vsT2Data = [
		{
			x: sortedData.map((item) => (item.t1_time != null ? item.t1_time : 0)),
			y: sortedData.map((item) => (item.t2_time != null ? item.t2_time : 0)),
			mode: 'markers' as const,
			type: 'scatter' as const,
			name: 'T1 vs T2',
			text: sortedData.map((item) => {
				const backend = item.backend_used || 'Unknown';
				const qv = item.quantum_volume != null ? item.quantum_volume : 'N/A';
				const gateErr =
					item.gate_error != null
						? `${(item.gate_error * 100).toFixed(2)}%`
						: 'N/A';
				const readoutErr =
					item.readout_error != null
						? `${(item.readout_error * 100).toFixed(2)}%`
						: 'N/A';

				return `Backend: ${backend}<br>Quantum Volume: ${qv}<br>Gate Error: ${gateErr}<br>Readout Error: ${readoutErr}`;
			}),
			marker: {
				size: sortedData.map((item) => {
					const qv = item.quantum_volume != null ? item.quantum_volume : 0;
					return qv > 0 ? Math.min(Math.log2(qv) * 10, 50) : 10;
				}),
				color: sortedData.map((item) => {
					const backend = (item.backend_used || '').toLowerCase();
					if (backend.includes('sim') || backend.includes('simulator')) {
						return '#9C27B0'; // Purple for simulators
					} else if (backend.includes('ibm') || backend.includes('quantum')) {
						return '#2196F3'; // Blue for IBM Quantum
					} else {
						return '#FF9800'; // Orange for other backends
					}
				}),
				opacity: 0.7,
				line: {
					color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
					width: 1,
				},
			},
			hoverinfo: 'text' as const,
		},
	];

	// Common layout settings for all charts
	const commonLayout = {
		autosize: true,
		font: {
			family: 'Arial, sans-serif',
			size: 12,
			color: isDarkMode ? '#ffffff' : '#333333',
		},
		paper_bgcolor: 'transparent',
		plot_bgcolor: isDarkMode
			? 'rgba(40, 40, 40, 0.8)'
			: 'rgba(240, 240, 240, 0.8)',
		margin: {
			l: 65,
			r: 50,
			t: 30,
			b: 90,
		},
		xaxis: {
			gridcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
			zerolinecolor: isDarkMode
				? 'rgba(255, 255, 255, 0.3)'
				: 'rgba(0, 0, 0, 0.3)',
		},
		yaxis: {
			gridcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
			zerolinecolor: isDarkMode
				? 'rgba(255, 255, 255, 0.3)'
				: 'rgba(0, 0, 0, 0.3)',
		},
	};

	// Plot configuration
	const config = {
		responsive: true,
		displayModeBar: true,
		modeBarButtonsToRemove: ['lasso2d', 'select2d'] as (
			| 'lasso2d'
			| 'select2d'
		)[],
		displaylogo: false,
	};

	if (loading) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: height,
				}}
			>
				<CircularProgress sx={{ color: '#9747FF' }} />
			</Box>
		);
	}

	if (data.length === 0) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: height,
					bgcolor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
					borderRadius: '8px',
					border: '1px dashed',
					borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
				}}
			>
				<Typography variant="body1" color="textSecondary">
					No quantum noise or error data available. Run quantum workloads to see
					metrics.
				</Typography>
			</Box>
		);
	}

	return (
		<Box ref={containerRef} sx={{ width: '100%', minHeight: height }}>
			{/* Filter Controls */}
			<Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
				<FormControl size="small" sx={{ width: 200 }}>
					<InputLabel id="backend-filter-label">Backend</InputLabel>
					<Select
						labelId="backend-filter-label"
						id="backend-filter"
						value={backendFilter}
						label="Backend"
						onChange={handleBackendChange}
					>
						<MenuItem value="all">All Backends</MenuItem>
						{uniqueBackends.map((backend) => (
							<MenuItem key={backend} value={backend}>
								{backend}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>

			<Grid container spacing={3}>
				{/* Temporal Noise Trend Chart */}
				<Grid item xs={12}>
					<Paper
						elevation={3}
						sx={{
							p: 2,
							borderRadius: 2,
							bgcolor: isDarkMode ? 'rgba(30,30,30,0.9)' : '#fff',
						}}
					>
						<Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
							<Typography
								variant="h6"
								sx={{ flexGrow: 1, color: isDarkMode ? '#fff' : '#333' }}
							>
								Temporal Noise Trend
							</Typography>
							<Tooltip title="Shows how gate and readout error rates change over time across different quantum runs">
								<InfoOutlinedIcon
									fontSize="small"
									sx={{ color: isDarkMode ? '#aaa' : '#777' }}
								/>
							</Tooltip>
						</Box>
						<Plot
							data={temporalNoiseData}
							layout={{
								...commonLayout,
								height: 320,
								width: chartWidth || undefined,
								xaxis: {
									...commonLayout.xaxis,
									title: 'Run Date',
									type: 'date',
								},
								yaxis: {
									...commonLayout.yaxis,
									title: 'Error Rate (%)',
									rangemode: 'tozero' as const,
								},
							}}
							config={config}
							style={{ width: '100%', height: '100%' }}
						/>
					</Paper>
				</Grid>

				{/* Error-Composition Stacked Bar */}
				<Grid item xs={12} md={6}>
					<Paper
						elevation={3}
						sx={{
							p: 2,
							borderRadius: 2,
							bgcolor: isDarkMode ? 'rgba(30,30,30,0.9)' : '#fff',
							height: '100%',
						}}
					>
						<Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
							<Typography
								variant="h6"
								sx={{ flexGrow: 1, color: isDarkMode ? '#fff' : '#333' }}
							>
								Error Composition
							</Typography>
							<Tooltip title="Breakdown of error contributions from different sources in quantum computations">
								<InfoOutlinedIcon
									fontSize="small"
									sx={{ color: isDarkMode ? '#aaa' : '#777' }}
								/>
							</Tooltip>
						</Box>
						<Plot
							data={errorStackData}
							layout={{
								...commonLayout,
								height: 380,
								width: chartWidth / 2 || undefined,
								barmode: 'stack' as const,
								xaxis: {
									...commonLayout.xaxis,
									title: 'Run (Date & Backend)',
									tickangle: -45,
								},
								yaxis: {
									...commonLayout.yaxis,
									title: 'Error Contribution (%)',
								},
								showlegend: true,
								legend: {
									orientation: 'h' as const,
									y: -0.2,
									x: 0.5,
									xanchor: 'center' as const,
								},
							}}
							config={config}
							style={{ width: '100%', height: '100%' }}
						/>
					</Paper>
				</Grid>

				{/* T₁ vs T₂ Scatter (Bubble) */}
				<Grid item xs={12} md={6}>
					<Paper
						elevation={3}
						sx={{
							p: 2,
							borderRadius: 2,
							bgcolor: isDarkMode ? 'rgba(30,30,30,0.9)' : '#fff',
							height: '100%',
						}}
					>
						<Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
							<Typography
								variant="h6"
								sx={{ flexGrow: 1, color: isDarkMode ? '#fff' : '#333' }}
							>
								T₁ vs T₂ Coherence Times
							</Typography>
							<Tooltip title="Comparison of T₁ (energy relaxation) and T₂ (dephasing) coherence times. Bubble size represents quantum volume.">
								<InfoOutlinedIcon
									fontSize="small"
									sx={{ color: isDarkMode ? '#aaa' : '#777' }}
								/>
							</Tooltip>
						</Box>
						<Plot
							data={t1vsT2Data}
							layout={{
								...commonLayout,
								height: 380,
								width: chartWidth / 2 || undefined,
								xaxis: {
									...commonLayout.xaxis,
									title: 'T₁ (μs)',
									zeroline: true,
									showgrid: true,
								},
								yaxis: {
									...commonLayout.yaxis,
									title: 'T₂ (μs)',
									zeroline: true,
									showgrid: true,
								},
								showlegend: false,
							}}
							config={config}
							style={{ width: '100%', height: '100%' }}
						/>
					</Paper>
				</Grid>

				{/* Legend Card */}
				<Grid item xs={12}>
					<Card
						elevation={3}
						sx={{
							borderRadius: 2,
							bgcolor: isDarkMode ? 'rgba(30,30,30,0.9)' : '#fff',
						}}
					>
						<CardContent>
							<Typography
								variant="h6"
								gutterBottom
								sx={{ color: isDarkMode ? '#fff' : '#333' }}
							>
								Noise & Error Metrics Explained
							</Typography>
							<Grid container spacing={2}>
								<Grid item xs={12} md={4}>
									<Typography
										variant="subtitle2"
										sx={{
											color: isDarkMode ? '#fff' : '#333',
											fontWeight: 'bold',
										}}
									>
										Gate Error Rate
									</Typography>
									<Typography
										variant="body2"
										sx={{ color: isDarkMode ? '#ddd' : '#555' }}
									>
										The probability that a quantum gate operation results in an
										incorrect state. Lower values indicate better gate fidelity.
									</Typography>
								</Grid>
								<Grid item xs={12} md={4}>
									<Typography
										variant="subtitle2"
										sx={{
											color: isDarkMode ? '#fff' : '#333',
											fontWeight: 'bold',
										}}
									>
										Readout Error Rate
									</Typography>
									<Typography
										variant="body2"
										sx={{ color: isDarkMode ? '#ddd' : '#555' }}
									>
										The probability of incorrectly reading the state of a qubit
										after measurement. Lower values indicate more reliable
										measurements.
									</Typography>
								</Grid>
								<Grid item xs={12} md={4}>
									<Typography
										variant="subtitle2"
										sx={{
											color: isDarkMode ? '#fff' : '#333',
											fontWeight: 'bold',
										}}
									>
										T₁ & T₂ Coherence Times
									</Typography>
									<Typography
										variant="body2"
										sx={{ color: isDarkMode ? '#ddd' : '#555' }}
									>
										T₁ represents energy relaxation time and T₂ represents phase
										coherence time. Longer times (higher values) indicate better
										quantum coherence.
									</Typography>
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</Box>
	);
};

export default NoiseAndErrorView;
