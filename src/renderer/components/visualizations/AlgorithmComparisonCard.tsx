import React from 'react';
import {
	Card,
	CardContent,
	Typography,
	Grid,
	Box,
	Skeleton,
	Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import EngineeringIcon from '@mui/icons-material/Engineering';
import StorageIcon from '@mui/icons-material/Storage';
import {
	ProcessedBenchmarkData,
	calculateStatistics,
} from '../../utils/dataProcessingUtils';

interface AlgorithmComparisonCardProps {
	data: ProcessedBenchmarkData[];
	title: string;
	titleIcon?: string;
	loading?: boolean;
	comparisonType?: 'performance' | 'memory' | 'size';
}

// Define tooltips for comparison metrics
const ComparisonTooltips = {
	fastest:
		'Algorithm with the lowest average execution time for this operation',
	slowest:
		'Algorithm with the highest average execution time for this operation',
	mostEfficient:
		'Algorithm with the lowest memory consumption for this operation',
	leastEfficient:
		'Algorithm with the highest memory consumption for this operation',
	smallestKey: 'Algorithm with the smallest key size',
	largestKey: 'Algorithm with the largest key size',
	bestThroughput: 'Algorithm with the highest operations per second',
	worstThroughput: 'Algorithm with the lowest operations per second',
};

const AlgorithmComparisonCard: React.FC<AlgorithmComparisonCardProps> = ({
	data,
	title,
	titleIcon,
	loading = false,
	comparisonType = 'performance',
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Helper function to find fastest/slowest algorithms for specific operations
	const findExtremeAlgorithm = (
		operation: string,
		metric: 'avg_ms' | 'ops_per_sec' | 'mem_peak_kb',
		extreme: 'min' | 'max'
	): { algorithm: string; value: number } | null => {
		// Filter algorithms having this operation
		const algorithmsWithOperation = data.filter((item) =>
			item.operations.some((op) => op.operation === operation)
		);

		if (algorithmsWithOperation.length === 0) return null;

		// Find min/max based on the metric
		let extremeAlgo: ProcessedBenchmarkData | undefined;
		let extremeValue = extreme === 'min' ? Number.MAX_VALUE : Number.MIN_VALUE;

		algorithmsWithOperation.forEach((item) => {
			const operation_data = item.operations.find(
				(op) => op.operation === operation
			);
			if (!operation_data) return;

			const value = operation_data[metric];

			// For avg_ms and mem_peak_kb, lower is better (use min)
			// For ops_per_sec, higher is better (use max)
			const isNewExtreme =
				(extreme === 'min' &&
					metric !== 'ops_per_sec' &&
					value < extremeValue) ||
				(extreme === 'max' &&
					metric !== 'ops_per_sec' &&
					value > extremeValue) ||
				(extreme === 'min' &&
					metric === 'ops_per_sec' &&
					value > extremeValue) ||
				(extreme === 'max' && metric === 'ops_per_sec' && value < extremeValue);

			if (isNewExtreme) {
				extremeAlgo = item;
				extremeValue = value;
			}
		});

		if (!extremeAlgo) return null;

		return {
			algorithm: `${extremeAlgo.algorithm} (${extremeAlgo.variant})`,
			value: extremeValue,
		};
	};

	// Find algorithms with extreme key sizes
	const findExtremeKeySize = (
		sizeType:
			| 'public_key_bytes'
			| 'secret_key_bytes'
			| 'signature_bytes'
			| 'ciphertext_bytes',
		extreme: 'min' | 'max'
	): { algorithm: string; value: number } | null => {
		// Filter algorithms that have the specified size
		const algorithmsWithSize = data.filter(
			(item) => item.sizes && item.sizes[sizeType] !== undefined
		);

		if (algorithmsWithSize.length === 0) return null;

		// Find min/max based on the size
		let extremeAlgo: ProcessedBenchmarkData | undefined;
		let extremeValue = extreme === 'min' ? Number.MAX_VALUE : Number.MIN_VALUE;

		algorithmsWithSize.forEach((item) => {
			if (!item.sizes || item.sizes[sizeType] === undefined) return;

			const value = item.sizes[sizeType] as number;

			const isNewExtreme =
				(extreme === 'min' && value < extremeValue) ||
				(extreme === 'max' && value > extremeValue);

			if (isNewExtreme) {
				extremeAlgo = item;
				extremeValue = value;
			}
		});

		if (!extremeAlgo) return null;

		return {
			algorithm: `${extremeAlgo.algorithm} (${extremeAlgo.variant})`,
			value: extremeValue,
		};
	};

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

	// Get operation metrics
	const fastestKeygen = findExtremeAlgorithm('keygen', 'avg_ms', 'min');
	const slowestKeygen = findExtremeAlgorithm('keygen', 'avg_ms', 'max');
	const fastestSign = findExtremeAlgorithm('sign', 'avg_ms', 'min');
	const fastestVerify = findExtremeAlgorithm('verify', 'avg_ms', 'min');
	const fastestEncapsulate = findExtremeAlgorithm(
		'encapsulate',
		'avg_ms',
		'min'
	);
	const fastestDecapsulate = findExtremeAlgorithm(
		'decapsulate',
		'avg_ms',
		'min'
	);

	// Get memory metrics
	const mostMemoryEfficientKeygen = findExtremeAlgorithm(
		'keygen',
		'mem_peak_kb',
		'min'
	);
	const leastMemoryEfficientKeygen = findExtremeAlgorithm(
		'keygen',
		'mem_peak_kb',
		'max'
	);
	const mostMemoryEfficientSign = findExtremeAlgorithm(
		'sign',
		'mem_peak_kb',
		'min'
	);
	const mostMemoryEfficientVerify = findExtremeAlgorithm(
		'verify',
		'mem_peak_kb',
		'min'
	);

	// Get throughput metrics
	const bestThroughputKeygen = findExtremeAlgorithm(
		'keygen',
		'ops_per_sec',
		'min'
	); // min because we reverse the comparison
	const worstThroughputKeygen = findExtremeAlgorithm(
		'keygen',
		'ops_per_sec',
		'max'
	); // max because we reverse the comparison

	// Get size metrics
	const smallestPublicKey = findExtremeKeySize('public_key_bytes', 'min');
	const largestPublicKey = findExtremeKeySize('public_key_bytes', 'max');
	const smallestSecretKey = findExtremeKeySize('secret_key_bytes', 'min');
	const smallestSignature = findExtremeKeySize('signature_bytes', 'min');
	const smallestCiphertext = findExtremeKeySize('ciphertext_bytes', 'min');
	const largestCiphertext = findExtremeKeySize('ciphertext_bytes', 'max');

	// Helper to render a comparison row with an icon
	const renderComparison = (
		label: string,
		result: { algorithm: string; value: number } | null,
		unit: string,
		icon: React.ReactNode,
		tooltipText?: string
	) => {
		if (!result) return null;

		return (
			<Grid
				container
				sx={{
					mb: 2,
					p: 1,
					backgroundColor: isDarkMode
						? 'rgba(255,255,255,0.05)'
						: 'rgba(0,0,0,0.03)',
					borderRadius: '8px',
				}}
			>
				<Grid
					item
					xs={12}
					sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}
				>
					{icon}
					<Typography
						variant="body2"
						fontWeight="medium"
						sx={{
							ml: 1,
							display: 'flex',
							alignItems: 'center',
							color: isDarkMode ? '#ddd' : '#333',
						}}
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
				<Grid item xs={12}>
					<Typography
						variant="body1"
						fontWeight="bold"
						sx={{ color: '#9747FF' }}
					>
						{result.algorithm}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{unit === 'bytes'
							? formatBytes(result.value)
							: `${formatNumber(result.value)} ${unit}`}
					</Typography>
				</Grid>
			</Grid>
		);
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
						{titleIcon === 'Speed' && <SpeedIcon sx={{ color: '#9747FF' }} />}
						{titleIcon === 'Memory' && <MemoryIcon sx={{ color: '#9747FF' }} />}
						{titleIcon === 'Storage' && (
							<StorageIcon sx={{ color: '#9747FF' }} />
						)}
					</Box>
				)}
				{title}
			</Typography>

			{data.length === 0 ? (
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
						No data available for comparison. Run benchmarks to generate data.
					</Typography>
				</Box>
			) : (
				<>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Based on {data.length} benchmark runs across multiple algorithms
					</Typography>

					{comparisonType === 'performance' && (
						<>
							{renderComparison(
								'Fastest Algorithm in Key Generation',
								fastestKeygen,
								'ms',
								<SpeedIcon sx={{ color: '#4CAF50' }} />,
								ComparisonTooltips.fastest
							)}

							{renderComparison(
								'Slowest Algorithm in Key Generation',
								slowestKeygen,
								'ms',
								<SpeedIcon sx={{ color: '#F44336' }} />,
								ComparisonTooltips.slowest
							)}

							{fastestSign &&
								renderComparison(
									'Fastest Algorithm in Signing',
									fastestSign,
									'ms',
									<SpeedIcon sx={{ color: '#4CAF50' }} />,
									ComparisonTooltips.fastest
								)}

							{fastestVerify &&
								renderComparison(
									'Fastest Algorithm in Verification',
									fastestVerify,
									'ms',
									<SpeedIcon sx={{ color: '#4CAF50' }} />,
									ComparisonTooltips.fastest
								)}

							{bestThroughputKeygen &&
								renderComparison(
									'Best Throughput in Key Generation',
									bestThroughputKeygen,
									'ops/sec',
									<AllInclusiveIcon sx={{ color: '#2196F3' }} />,
									ComparisonTooltips.bestThroughput
								)}
						</>
					)}

					{comparisonType === 'memory' && (
						<>
							{renderComparison(
								'Most Memory Efficient in Key Generation',
								mostMemoryEfficientKeygen,
								'KB',
								<MemoryIcon sx={{ color: '#4CAF50' }} />,
								ComparisonTooltips.mostEfficient
							)}

							{renderComparison(
								'Least Memory Efficient in Key Generation',
								leastMemoryEfficientKeygen,
								'KB',
								<MemoryIcon sx={{ color: '#F44336' }} />,
								ComparisonTooltips.leastEfficient
							)}

							{renderComparison(
								'Most Memory Efficient in Signing',
								mostMemoryEfficientSign,
								'KB',
								<MemoryIcon sx={{ color: '#4CAF50' }} />,
								ComparisonTooltips.mostEfficient
							)}

							{renderComparison(
								'Most Memory Efficient in Verification',
								mostMemoryEfficientVerify,
								'KB',
								<MemoryIcon sx={{ color: '#4CAF50' }} />,
								ComparisonTooltips.mostEfficient
							)}
						</>
					)}

					{comparisonType === 'size' && (
						<>
							{renderComparison(
								'Smallest Public Key',
								smallestPublicKey,
								'bytes',
								<EngineeringIcon sx={{ color: '#4CAF50' }} />,
								ComparisonTooltips.smallestKey
							)}

							{renderComparison(
								'Largest Public Key',
								largestPublicKey,
								'bytes',
								<EngineeringIcon sx={{ color: '#F44336' }} />,
								ComparisonTooltips.largestKey
							)}

							{renderComparison(
								'Smallest Secret Key',
								smallestSecretKey,
								'bytes',
								<EngineeringIcon sx={{ color: '#4CAF50' }} />,
								ComparisonTooltips.smallestKey
							)}

							{smallestSignature &&
								renderComparison(
									'Smallest Signature',
									smallestSignature,
									'bytes',
									<EngineeringIcon sx={{ color: '#4CAF50' }} />,
									ComparisonTooltips.smallestKey
								)}

							{smallestCiphertext &&
								renderComparison(
									'Smallest Ciphertext',
									smallestCiphertext,
									'bytes',
									<EngineeringIcon sx={{ color: '#4CAF50' }} />,
									ComparisonTooltips.smallestKey
								)}

							{largestCiphertext &&
								renderComparison(
									'Largest Ciphertext',
									largestCiphertext,
									'bytes',
									<EngineeringIcon sx={{ color: '#F44336' }} />,
									ComparisonTooltips.largestKey
								)}
						</>
					)}
				</>
			)}
		</>
	);
};

export default AlgorithmComparisonCard;
