export interface BaseJob {
	id: string; // Unique identifier (using UUID)
	type: 'benchmark' | 'quantum';
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	createdAt: Date;
	startedAt?: Date;
	completedAt?: Date;
	result?: any; // Store results (will be typed based on job type)
	error?: string; // Store error messages
	numberOfRuns: number; // How many times to repeat this exact config
	runCount?: number; // Current run number
	scheduledTime?: number; // Optional timestamp for scheduled execution
}

export interface BenchmarkJob extends BaseJob {
	type: 'benchmark';
	algorithm: string; // Specific algorithm name
	securityParameter: string; // Specific security parameter
	iterations: number;
}

export interface QuantumJob extends BaseJob {
	type: 'quantum';
	algorithm: 'shor' | 'grover';
	shotCount: number;
	target: 'simulation' | 'real_hardware';
	apiToken?: string; // API token for IBM Quantum
	markedStates?: string; // For Grover's algorithm only
	plotTheme?: 'light' | 'dark'; // Theme for plotting results
}

export type Job = BenchmarkJob | QuantumJob;
