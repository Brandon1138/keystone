import React, { useState, useEffect } from 'react';
import JobSchedulerForm from '../components/ui/JobSchedulerForm';
import JobQueueDisplay from '../components/ui/JobQueueDisplay';
import { Job } from '../../types/jobs';
import { useTheme } from '@mui/material/styles';

const ScheduleJobsPage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [jobs, setJobs] = useState<Job[]>([]);

	// Load jobs on initial render and set up subscription
	useEffect(() => {
		// Initial load
		loadJobs();

		// Subscribe to updates
		const unsubscribe = window.jobSchedulerAPI.onJobQueueUpdate(
			(updatedJobs) => {
				setJobs(updatedJobs);
			}
		);

		// Clean up subscription on unmount
		return () => {
			unsubscribe();
		};
	}, []);

	// Function to load jobs from the database
	const loadJobs = async () => {
		try {
			const loadedJobs = await window.jobSchedulerAPI.getJobQueue();
			setJobs(loadedJobs);
		} catch (error) {
			console.error('Failed to load jobs:', error);
		}
	};

	return (
		<div className="container mx-auto py-4 space-y-5">
			<JobSchedulerForm onJobScheduled={loadJobs} />
			<JobQueueDisplay jobs={jobs} onRefresh={loadJobs} />
		</div>
	);
};

export default ScheduleJobsPage;
