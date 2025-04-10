import React from 'react';
import {
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	Button,
	Chip,
	Divider,
	Box,
	IconButton,
	Tooltip,
	useTheme,
} from '@mui/material';
import {
	Cancel as CancelIcon,
	Delete as DeleteIcon,
	PlayArrow as PlayArrowIcon,
	Done as DoneIcon,
	Error as ErrorIcon,
	Pause as PauseIcon,
	ViewList as ViewListIcon,
	Schedule as ScheduleIcon,
	AccessTime as AccessTimeIcon,
	Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Job } from '../../../types/jobs';
import { formatDistanceToNow, format } from 'date-fns';
import { Card } from './card';

interface JobQueueDisplayProps {
	jobs: Job[];
	onRefresh: () => void;
}

const JobQueueDisplay: React.FC<JobQueueDisplayProps> = ({
	jobs,
	onRefresh,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Function to handle job cancellation
	const handleCancelJob = async (jobId: string) => {
		try {
			const result = await window.jobSchedulerAPI.cancelJob(jobId);
			if (result) {
				onRefresh();
			} else {
				console.error('Failed to cancel job. Job might be already running.');
			}
		} catch (error) {
			console.error('Error cancelling job:', error);
		}
	};

	// Function to handle job removal
	const handleRemoveJob = async (jobId: string) => {
		try {
			const result = await window.jobSchedulerAPI.removeJob(jobId);
			if (result) {
				onRefresh();
			} else {
				console.error('Failed to remove job:', jobId);
			}
		} catch (error) {
			console.error('Error removing job:', error);
		}
	};

	// Function to get status chip
	const getStatusChip = (status: Job['status']) => {
		switch (status) {
			case 'pending':
				return (
					<Chip
						icon={<PauseIcon />}
						label="Pending"
						color="warning"
						size="small"
					/>
				);
			case 'running':
				return (
					<Chip
						icon={<PlayArrowIcon />}
						label="Running"
						color="info"
						size="small"
					/>
				);
			case 'completed':
				return (
					<Chip
						icon={<DoneIcon />}
						label="Completed"
						color="success"
						size="small"
					/>
				);
			case 'failed':
				return (
					<Chip
						icon={<ErrorIcon />}
						label="Failed"
						color="error"
						size="small"
					/>
				);
			case 'cancelled':
				return (
					<Chip
						icon={<CancelIcon />}
						label="Cancelled"
						color="default"
						size="small"
					/>
				);
			default:
				return <Chip label={status} size="small" />;
		}
	};

	// Helper function to format date
	const formatDate = (date: Date | undefined) => {
		if (!date) return 'N/A';
		return formatDistanceToNow(date, { addSuffix: true });
	};

	// Helper function to get key parameters based on job type
	const getKeyParameters = (job: Job) => {
		if (job.type === 'benchmark') {
			return `${job.securityParameter}, ${job.iterations} iterations, ${job.numberOfRuns} runs`;
		} else if (job.type === 'quantum') {
			if (job.algorithm === 'grover') {
				return `${job.shotCount} shots, Target: ${job.target}, States: ${
					job.markedStates || 'N/A'
				}, ${job.numberOfRuns} runs`;
			} else {
				return `${job.shotCount} shots, Target: ${job.target}, ${job.numberOfRuns} runs`;
			}
		}
		return 'N/A';
	};

	// Helper function to format scheduled time
	const formatScheduledTime = (job: Job) => {
		if (job.scheduledTime) {
			const scheduledDate = new Date(job.scheduledTime);
			return (
				<Box sx={{ display: 'flex', alignItems: 'center' }}>
					<ScheduleIcon
						fontSize="small"
						sx={{
							color: '#9747FF',
							mr: 0.5,
							fontSize: '1rem',
						}}
					/>
					{/* @ts-ignore - children prop is provided via JSX children */}
					<Tooltip title={format(scheduledDate, 'PPP p')}>
						<Typography variant="body2">
							{formatDistanceToNow(scheduledDate, { addSuffix: true })}
						</Typography>
					</Tooltip>
				</Box>
			);
		}
		return (
			<Box
				sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}
			>
				<AccessTimeIcon
					fontSize="small"
					sx={{
						mr: 0.5,
						fontSize: '0.9rem',
						opacity: 0.7,
					}}
				/>
				<Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
					Run immediately
				</Typography>
			</Box>
		);
	};

	// Function to handle scheduling all benchmarks
	const handleScheduleAllBenchmarks = () => {
		// Implementation to be added
		console.log('Schedule all benchmarks clicked');
	};

	return (
		<Card
			className={`p-6 rounded-xl shadow-md ${
				isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
			}`}
		>
			<div className="flex items-center mb-4">
				<ViewListIcon style={{ color: '#9747FF' }} className="mr-3" />
				<h2
					className="text-[20px] font-semibold"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Job Queue
				</h2>
			</div>
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'flex-end',
					mb: 2,
				}}
			>
				<Button
					variant="outlined"
					size="small"
					onClick={onRefresh}
					startIcon={<RefreshIcon />}
					sx={{
						borderColor: '#9747FF',
						color: isDarkMode ? '#FFFFFF' : '#000000',
						'&:hover': {
							borderColor: '#8030E0',
							bgcolor: isDarkMode
								? 'rgba(151, 71, 255, 0.1)'
								: 'rgba(151, 71, 255, 0.1)',
						},
					}}
				>
					Refresh
				</Button>
			</Box>
			<Divider sx={{ mb: 2 }} />

			{jobs.length === 0 ? (
				<Typography
					variant="body1"
					sx={{
						textAlign: 'center',
						py: 3,
						color: isDarkMode
							? 'rgba(255, 255, 255, 0.7)'
							: 'rgba(0, 0, 0, 0.7)',
					}}
				>
					No jobs in the queue. Use the form above to schedule jobs.
				</Typography>
			) : (
				<TableContainer
					component={Paper}
					variant="outlined"
					sx={{
						backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
						borderColor: 'transparent',
						borderRadius: '12px',
						overflow: 'hidden',
					}}
				>
					<Table size="small">
						<TableHead
							sx={{
								backgroundColor: isDarkMode ? '#333333' : '#f0f0f0',
							}}
						>
							<TableRow>
								<TableCell
									sx={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										fontWeight: 600,
									}}
								>
									Type
								</TableCell>
								<TableCell
									sx={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										fontWeight: 600,
									}}
								>
									Algorithm
								</TableCell>
								<TableCell
									sx={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										fontWeight: 600,
									}}
								>
									Parameters
								</TableCell>
								<TableCell
									sx={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										fontWeight: 600,
									}}
								>
									Status
								</TableCell>
								<TableCell
									sx={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										fontWeight: 600,
									}}
								>
									Scheduled
								</TableCell>
								<TableCell
									sx={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										fontWeight: 600,
									}}
								>
									Created
								</TableCell>
								<TableCell
									sx={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										fontWeight: 600,
									}}
								>
									Actions
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{jobs.map((job) => (
								<TableRow
									key={job.id}
									sx={{
										'&:nth-of-type(odd)': {
											backgroundColor: isDarkMode
												? 'rgba(255, 255, 255, 0.05)'
												: 'rgba(0, 0, 0, 0.02)',
										},
										'&:last-child td, &:last-child th': { border: 0 },
									}}
								>
									<TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>
										{job.type === 'benchmark' ? 'Benchmark' : 'Quantum'}
									</TableCell>
									<TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>
										{job.type === 'benchmark'
											? job.algorithm.toUpperCase()
											: job.algorithm.charAt(0).toUpperCase() +
											  job.algorithm.slice(1)}
									</TableCell>
									<TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>
										{getKeyParameters(job)}
									</TableCell>
									<TableCell>{getStatusChip(job.status)}</TableCell>
									<TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>
										{formatScheduledTime(job)}
									</TableCell>
									<TableCell sx={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>
										{formatDate(job.createdAt)}
									</TableCell>
									<TableCell>
										{job.status === 'pending' && (
											<IconButton
												size="small"
												title="Cancel Job"
												sx={{
													color: isDarkMode
														? 'rgba(255, 255, 255, 0.6)'
														: 'rgba(0, 0, 0, 0.6)',
												}}
												onClick={() => handleCancelJob(job.id)}
											>
												<CancelIcon />
											</IconButton>
										)}
										{(job.status === 'completed' ||
											job.status === 'failed' ||
											job.status === 'cancelled') && (
											<IconButton
												size="small"
												title="Remove Job"
												sx={{
													color: isDarkMode
														? 'rgba(255, 255, 255, 0.6)'
														: 'rgba(0, 0, 0, 0.6)',
												}}
												onClick={() => handleRemoveJob(job.id)}
											>
												<DeleteIcon />
											</IconButton>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			)}
		</Card>
	);
};

export default JobQueueDisplay;
