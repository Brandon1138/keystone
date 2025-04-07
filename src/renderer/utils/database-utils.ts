/**
 * Utility functions for interacting with the database from the renderer process
 */

export interface Run {
	runId: string;
	timestamp: string;
	runType: 'PQC_Classical' | 'Quantum_Shor' | 'Quantum_Grover';
	status: 'pending' | 'running' | 'completed' | 'failed';
	algorithm?: string;
	securityParam?: string;
	iterations?: number;
	error?: string;
	notes?: string;
}

export interface RunDetails {
	run: Run | undefined;
	details: any[];
}

export const databaseUtils = {
	/**
	 * Create a new run record
	 */
	createRun: async (
		runType: 'PQC_Classical' | 'Quantum_Shor' | 'Quantum_Grover',
		algorithm?: string,
		securityParam?: string,
		iterations?: number,
		notes?: string
	): Promise<string> => {
		return await window.databaseAPI.createRun(
			runType,
			algorithm || '',
			securityParam || '',
			iterations || 0,
			notes
		);
	},

	/**
	 * Update the status of a run
	 */
	updateRunStatus: async (
		runId: string,
		status: 'pending' | 'running' | 'completed' | 'failed',
		error?: string
	): Promise<boolean> => {
		return await window.databaseAPI.updateRunStatus(runId, status, error);
	},

	/**
	 * Get all runs
	 */
	getAllRuns: async (): Promise<Run[]> => {
		return await window.databaseAPI.getAllRuns();
	},

	/**
	 * Get runs by type
	 */
	getRunsByType: async (
		runType: 'PQC_Classical' | 'Quantum_Shor' | 'Quantum_Grover'
	): Promise<Run[]> => {
		return await window.databaseAPI.getRunsByType(runType);
	},

	/**
	 * Get runs by status
	 */
	getRunsByStatus: async (
		status: 'pending' | 'running' | 'completed' | 'failed'
	): Promise<Run[]> => {
		return await window.databaseAPI.getRunsByStatus(status);
	},

	/**
	 * Get runs by algorithm
	 */
	getRunsByAlgorithm: async (algorithm: string): Promise<Run[]> => {
		return await window.databaseAPI.getRunsByAlgorithm(algorithm);
	},

	/**
	 * Get run details
	 */
	getRunDetails: async (runId: string): Promise<RunDetails> => {
		return await window.databaseAPI.getRunDetails(runId);
	},

	/**
	 * Insert quantum result
	 */
	insertQuantumResult: async (
		runId: string,
		resultData: any
	): Promise<string> => {
		return await window.databaseAPI.insertQuantumResult(runId, resultData);
	},

	/**
	 * Insert PQC/Classical result
	 */
	insertPqcClassicalResult: async (
		runId: string,
		benchmarkData: any
	): Promise<string[]> => {
		return await window.databaseAPI.insertPqcClassicalResult(
			runId,
			benchmarkData
		);
	},

	/**
	 * Get all quantum results
	 */
	getAllQuantumResults: async (): Promise<any[]> => {
		return await window.databaseAPI.getAllQuantumResults();
	},

	/**
	 * Get all PQC/Classical details
	 */
	getAllPqcClassicalDetails: async (): Promise<any[]> => {
		return await window.databaseAPI.getAllPqcClassicalDetails();
	},

	/**
	 * Get PQC/Classical details by algorithm
	 */
	getPqcClassicalByAlgorithm: async (algorithm: string): Promise<any[]> => {
		return await window.databaseAPI.getPqcClassicalByAlgorithm(algorithm);
	},

	/**
	 * Delete a run
	 */
	deleteRun: async (runId: string): Promise<boolean> => {
		return await window.databaseAPI.deleteRun(runId);
	},

	/**
	 * Clear all data
	 */
	clearAllData: async (): Promise<boolean> => {
		await window.databaseAPI.clearAllData();
		return true;
	},
};

export default databaseUtils;
