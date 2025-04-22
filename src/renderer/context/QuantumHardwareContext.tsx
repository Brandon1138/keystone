import React, { createContext, useState, useContext, useEffect } from 'react';

// Define the context shape
interface QuantumHardwareContextType {
	isRunningOnHardware: boolean;
	startHardwareExecution: (algorithmType?: 'shors' | 'grovers') => void;
	stopHardwareExecution: () => void;
	jobId: string | null;
	setJobId: (id: string | null) => void;
	algorithmType: 'shors' | 'grovers' | null;
}

// Create context with default values
const QuantumHardwareContext = createContext<QuantumHardwareContextType>({
	isRunningOnHardware: false,
	startHardwareExecution: () => {},
	stopHardwareExecution: () => {},
	jobId: null,
	setJobId: () => {},
	algorithmType: null,
});

// Custom hook to use the context
export const useQuantumHardware = () => useContext(QuantumHardwareContext);

// Provider component
export const QuantumHardwareProvider: React.FC<{
	children: React.ReactNode;
}> = ({ children }) => {
	const [isRunningOnHardware, setIsRunningOnHardware] = useState(false);
	const [jobId, setJobId] = useState<string | null>(null);
	const [algorithmType, setAlgorithmType] = useState<
		'shors' | 'grovers' | null
	>(null);

	// Start hardware execution
	const startHardwareExecution = (algorithm?: 'shors' | 'grovers') => {
		setIsRunningOnHardware(true);
		setAlgorithmType(algorithm || null);
	};

	// Stop hardware execution
	const stopHardwareExecution = () => {
		setIsRunningOnHardware(false);
		setJobId(null);
		setAlgorithmType(null);
	};

	// Log state changes for debugging
	useEffect(() => {
		console.log(
			`Quantum hardware execution state: ${
				isRunningOnHardware ? 'Running' : 'Stopped'
			}`
		);
		if (jobId) {
			console.log(`Current job ID: ${jobId}`);
		}
		if (algorithmType) {
			console.log(`Running algorithm: ${algorithmType}`);
		}
	}, [isRunningOnHardware, jobId, algorithmType]);

	return (
		<QuantumHardwareContext.Provider
			value={{
				isRunningOnHardware,
				startHardwareExecution,
				stopHardwareExecution,
				jobId,
				setJobId,
				algorithmType,
			}}
		>
			{children}
		</QuantumHardwareContext.Provider>
	);
};
