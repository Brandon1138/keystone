import React, { useState, useEffect } from 'react';
import {
	Card,
	CardContent,
	Typography,
	Grid,
	Divider,
	Box,
	Skeleton,
	Tooltip,
	FormControl,
	Select,
	MenuItem,
	SelectChangeEvent,
	InputLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import {
	ProcessedBenchmarkData,
	calculateStatistics,
} from '../../utils/dataProcessingUtils';
import { getAlgorithmDefinition } from '../../../types/algorithm-types';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CreateIcon from '@mui/icons-material/Create';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';

interface StatisticsCardProps {
	data: ProcessedBenchmarkData[];
	title: string;
	titleIcon?: string;
	algorithm?: string;
	loading?: boolean;
	metricType?: 'performance' | 'memory' | 'size';
	operation?: string;
}

// Define tooltips for statistical terms
const StatTooltips = {
	average:
		'Mean value calculated as the sum of all values divided by the count of values',
	min: 'Minimum (lowest) value observed across all measurements',
	max: 'Maximum (highest) value observed across all measurements',
	stdDev:
		'Standard deviation measures how spread out the values are. Lower values indicate more consistent performance',
	opsPerSec:
		'Operations per second - higher values indicate better performance',
	peak: 'Maximum memory used during operation execution',
	memoryRange:
		'The difference between maximum and minimum memory usage, indicating volatility',
	publicKey: 'Size of the public key in bytes',
	secretKey: 'Size of the secret key in bytes',
	signature: 'Size of the signature in bytes',
	ciphertext: 'Size of the ciphertext in bytes',
};

// Operation display names mapping
const OperationDisplayNames: { [key: string]: string } = {
	keygen: 'Key Generation',
	sign: 'Sign',
	verify: 'Verify',
	encapsulate: 'Encapsulation',
	decapsulate: 'Decapsulation',
	encryption: 'Encryption',
	decryption: 'Decryption',
	shared_secret: 'Shared Secret',
};

const StatisticsCard: React.FC<StatisticsCardProps> = ({
	data,
	title,
	titleIcon,
	algorithm,
	loading = false,
	metricType = 'performance',
	operation: initialOperation,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [selectedOperation, setSelectedOperation] = useState<string>('');

	// Filter data by algorithm if specified
	const filteredData =
		algorithm && algorithm !== 'all'
			? data.filter(
					(item) => item.algorithm.toLowerCase() === algorithm.toLowerCase()
			  )
			: data;

	// Get all available operations across all data
	const availableOperations = React.useMemo(() => {
		const operations = new Set<string>();
		filteredData.forEach((item) => {
			item.operations.forEach((op) => {
				operations.add(op.operation);
			});
		});
		return Array.from(operations);
	}, [filteredData]);

	// Determine which operation to display based on title, algorithm, and provided operation
	useEffect(() => {
		if (!availableOperations.length) return;

		// If an operation was explicitly provided via props, use it if available
		if (initialOperation && availableOperations.includes(initialOperation)) {
			setSelectedOperation(initialOperation);
			return;
		}

		if (algorithm && algorithm !== 'all') {
			// Get the algorithm type from its name
			const algDef = getAlgorithmDefinition(algorithm);
			let operationToSelect = '';

			if (title.toLowerCase().includes('key generation')) {
				operationToSelect = 'keygen';
			} else if (title.toLowerCase().includes('signature')) {
				operationToSelect = 'sign';
			} else if (title.toLowerCase().includes('verification')) {
				operationToSelect = 'verify';
			} else if (
				title.toLowerCase().includes('encapsulation') &&
				!title.toLowerCase().includes('de')
			) {
				operationToSelect = 'encaps';
			} else if (title.toLowerCase().includes('decapsulation')) {
				operationToSelect = 'decaps';
			} else if (title.toLowerCase().includes('encryption')) {
				operationToSelect = 'encrypt';
			} else if (title.toLowerCase().includes('decryption')) {
				operationToSelect = 'decrypt';
			} else {
				// Fallback
				operationToSelect = availableOperations.includes('keygen')
					? 'keygen'
					: availableOperations[0];
			}

			// Check if the operation exists in available operations
			if (availableOperations.includes(operationToSelect)) {
				setSelectedOperation(operationToSelect);
			} else {
				// Fallback to first available operation
				setSelectedOperation(availableOperations[0]);
			}
		} else {
			// For 'All algorithms' view, prefer keygen if available
			const preferredOperation = availableOperations.includes('keygen')
				? 'keygen'
				: availableOperations[0];
			setSelectedOperation(preferredOperation);
		}
	}, [availableOperations, title, algorithm, initialOperation]);

	// Extract metrics for the selected operation
	const getMetricsForOperation = (operationType: string) => {
		const metrics = {
			avg_ms: [] as number[],
			ops_per_sec: [] as number[],
			mem_peak_kb: [] as number[],
			mem_avg_kb: [] as number[],
			min_ms: [] as number[],
			max_ms: [] as number[],
		};

		let keyMetrics = {
			public_key_bytes: [] as number[],
			secret_key_bytes: [] as number[],
			signature_bytes: [] as number[],
			ciphertext_bytes: [] as number[],
		};

		filteredData.forEach((item) => {
			const operation = item.operations.find(
				(op) => op.operation === operationType
			);

			if (operation) {
				metrics.avg_ms.push(operation.avg_ms);
				metrics.ops_per_sec.push(operation.ops_per_sec);
				metrics.mem_peak_kb.push(operation.mem_peak_kb);
				metrics.mem_avg_kb.push(operation.mem_avg_kb || operation.mem_peak_kb);
				metrics.min_ms.push(operation.min_ms);
				metrics.max_ms.push(operation.max_ms);
			}

			// Collect size metrics if available
			if (item.sizes) {
				if (item.sizes.public_key_bytes) {
					keyMetrics.public_key_bytes.push(item.sizes.public_key_bytes);
				}
				if (item.sizes.secret_key_bytes) {
					keyMetrics.secret_key_bytes.push(item.sizes.secret_key_bytes);
				}
				if (item.sizes.signature_bytes) {
					keyMetrics.signature_bytes.push(item.sizes.signature_bytes);
				}
				if (item.sizes.ciphertext_bytes) {
					keyMetrics.ciphertext_bytes.push(item.sizes.ciphertext_bytes);
				}
			}
		});

		return { metrics, keyMetrics };
	};

	const { metrics, keyMetrics } = React.useMemo(
		() =>
			selectedOperation
				? getMetricsForOperation(selectedOperation)
				: {
						metrics: {
							avg_ms: [] as number[],
							ops_per_sec: [] as number[],
							mem_peak_kb: [] as number[],
							mem_avg_kb: [] as number[],
							min_ms: [] as number[],
							max_ms: [] as number[],
						},
						keyMetrics: {
							public_key_bytes: [] as number[],
							secret_key_bytes: [] as number[],
							signature_bytes: [] as number[],
							ciphertext_bytes: [] as number[],
						},
				  },
		[selectedOperation, filteredData]
	);

	// Calculate statistics
	const timeStats = calculateStatistics(metrics.avg_ms || []);
	const opsStats = calculateStatistics(metrics.ops_per_sec || []);
	const memPeakStats = calculateStatistics(metrics.mem_peak_kb || []);
	const memAvgStats = calculateStatistics(metrics.mem_avg_kb || []);
	const minTimeStats = calculateStatistics(metrics.min_ms || []);
	const maxTimeStats = calculateStatistics(metrics.max_ms || []);

	// Calculate statistics for key metrics
	const publicKeyStats = calculateStatistics(keyMetrics.public_key_bytes || []);
	const secretKeyStats = calculateStatistics(keyMetrics.secret_key_bytes || []);
	const signatureStats = calculateStatistics(keyMetrics.signature_bytes || []);
	const ciphertextStats = calculateStatistics(
		keyMetrics.ciphertext_bytes || []
	);

	// Helper to format numbers
	const formatNumber = (num: number, decimals: number = 2) => {
		return num.toLocaleString(undefined, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		});
	};

	// Format bytes to appropriate unit
	const formatBytes = (bytes: number) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	// Helper to render a metric row with tooltip
	const renderMetric = (
		label: string,
		value: number,
		unit: string,
		tooltipText?: string
	) => (
		<Grid container item spacing={1} alignItems="center">
			<Grid item xs={7}>
				<Typography
					variant="body2"
					color={isDarkMode ? 'text.secondary' : 'text.primary'}
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					{label}
					{tooltipText && (
						<Tooltip title={tooltipText} arrow>
							<InfoOutlined
								sx={{ fontSize: '0.8rem', ml: 0.5, opacity: 0.7 }}
							/>
						</Tooltip>
					)}
				</Typography>
			</Grid>
			<Grid item xs={5}>
				<Typography variant="body2" fontWeight="medium" align="right">
					{unit === 'bytes'
						? formatBytes(value)
						: `${formatNumber(value)} ${unit}`}
				</Typography>
			</Grid>
		</Grid>
	);

	// Handle operation change
	const handleOperationChange = (event: SelectChangeEvent) => {
		setSelectedOperation(event.target.value);
	};

	if (loading) {
		return (
			<>
				<Skeleton variant="text" width="60%" height={30} />
				<Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
				<Skeleton
					variant="rectangular"
					height={180}
					sx={{ borderRadius: '8px', mb: 2 }}
				/>
				<Skeleton variant="text" width="80%" height={24} />
				<Skeleton variant="text" width="70%" height={24} />
				<Skeleton variant="text" width="75%" height={24} />
			</>
		);
	}

	return (
		<>
			<Typography
				variant="h6"
				sx={{
					color: isDarkMode ? '#fff' : '#000',
					mb: 0.5,
					display: 'flex',
					alignItems: 'center',
				}}
			>
				{titleIcon && (
					<Box
						component="span"
						sx={{ mr: 1, display: 'flex', alignItems: 'center' }}
					>
						{titleIcon === 'VpnKey' && <VpnKeyIcon sx={{ color: '#9747FF' }} />}
						{titleIcon === 'Create' && <CreateIcon sx={{ color: '#9747FF' }} />}
						{titleIcon === 'VerifiedUser' && (
							<VerifiedUserIcon sx={{ color: '#9747FF' }} />
						)}
						{titleIcon === 'LockOpen' && (
							<LockOpenIcon sx={{ color: '#9747FF' }} />
						)}
						{titleIcon === 'Lock' && <LockIcon sx={{ color: '#9747FF' }} />}
					</Box>
				)}
				{title}
			</Typography>

			{filteredData.length === 0 ? (
				<Box
					sx={{
						py: 8,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
						borderRadius: '8px',
						mt: 2,
					}}
				>
					<Typography
						variant="body1"
						color={isDarkMode ? 'text.secondary' : 'text.primary'}
					>
						No data available for statistics. Run benchmarks to generate data.
					</Typography>
				</Box>
			) : (
				<>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Based on {filteredData.length} benchmark runs
						{algorithm && algorithm !== 'all' ? ` for ${algorithm}` : ''}
					</Typography>

					{/* Operation Selector - Only show for 'all algorithms' case */}
					{(!algorithm || algorithm === 'all') && (
						<FormControl
							fullWidth
							size="small"
							sx={{
								mb: 2,
								backgroundColor: isDarkMode
									? 'rgba(255,255,255,0.05)'
									: 'rgba(0,0,0,0.05)',
								borderRadius: '8px',
							}}
						>
							<InputLabel id="operation-select-label">Operation</InputLabel>
							<Select
								labelId="operation-select-label"
								id="operation-select"
								value={selectedOperation}
								label="Operation"
								onChange={handleOperationChange}
								sx={{
									borderRadius: '8px',
									'.MuiOutlinedInput-notchedOutline': {
										borderColor: isDarkMode
											? 'rgba(255,255,255,0.1)'
											: 'rgba(0,0,0,0.1)',
									},
								}}
							>
								{availableOperations.map((op) => (
									<MenuItem key={op} value={op}>
										{OperationDisplayNames[op] || op}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}

					{/* Performance Metrics */}
					<Typography
						variant="subtitle2"
						sx={{
							color: '#9747FF',
							mb: 1,
							textTransform: 'uppercase',
							fontWeight: 'bold',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						{OperationDisplayNames[selectedOperation] || selectedOperation}{' '}
						Performance
					</Typography>

					<Grid container spacing={1.5} sx={{ mb: 3 }}>
						{renderMetric(
							'Average Time',
							timeStats.mean,
							'ms',
							StatTooltips.average
						)}
						{renderMetric(
							'Min. Time',
							minTimeStats.mean,
							'ms',
							StatTooltips.min
						)}
						{renderMetric(
							'Max Time',
							maxTimeStats.mean,
							'ms',
							StatTooltips.max
						)}
						{renderMetric(
							'Operations/sec',
							opsStats.mean,
							'',
							StatTooltips.opsPerSec
						)}
					</Grid>

					{/* Memory Metrics */}
					<Typography
						variant="subtitle2"
						sx={{
							color: '#9747FF',
							mb: 1,
							textTransform: 'uppercase',
							fontWeight: 'bold',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						Memory Usage
					</Typography>

					<Grid container spacing={1.5} sx={{ mb: 3 }}>
						{renderMetric(
							'Memory Average',
							memAvgStats.mean,
							'KB',
							StatTooltips.average
						)}
						{renderMetric(
							'Memory Peak',
							memPeakStats.mean,
							'KB',
							StatTooltips.peak
						)}
					</Grid>

					{/* Size Metrics, only shown when there's data */}
					{(keyMetrics.public_key_bytes?.length > 0 ||
						keyMetrics.secret_key_bytes?.length > 0 ||
						keyMetrics.signature_bytes?.length > 0 ||
						keyMetrics.ciphertext_bytes?.length > 0) && (
						<>
							<Typography
								variant="subtitle2"
								sx={{
									color: '#9747FF',
									mb: 1,
									textTransform: 'uppercase',
									fontWeight: 'bold',
									display: 'flex',
									alignItems: 'center',
								}}
							>
								Key & Data Sizes
							</Typography>

							<Grid container spacing={1.5}>
								{keyMetrics.public_key_bytes?.length > 0 &&
									renderMetric(
										'Public Key Size',
										publicKeyStats.mean,
										'bytes',
										StatTooltips.publicKey
									)}
								{keyMetrics.secret_key_bytes?.length > 0 &&
									renderMetric(
										'Secret Key Size',
										secretKeyStats.mean,
										'bytes',
										StatTooltips.secretKey
									)}
								{keyMetrics.signature_bytes?.length > 0 &&
									renderMetric(
										'Signature Size',
										signatureStats.mean,
										'bytes',
										StatTooltips.signature
									)}
								{keyMetrics.ciphertext_bytes?.length > 0 &&
									renderMetric(
										'Ciphertext Size',
										ciphertextStats.mean,
										'bytes',
										StatTooltips.ciphertext
									)}
							</Grid>
						</>
					)}
				</>
			)}
		</>
	);
};

export default StatisticsCard;
