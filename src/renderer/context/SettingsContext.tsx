import React, { createContext, useState, useEffect, useContext } from 'react';

// Define the shape of our settings
interface Settings {
	// Appearance
	animatedBackground: boolean;
	themePreference: 'light' | 'dark' | 'system';
	startupLoader: boolean;
	enableMotionTransitions: boolean;
	disableAnimatedBackgroundOnLightMode: boolean;
	enableBloomEffect: boolean;
	enableParticleSystem: boolean;
	enableDynamicLighting: boolean;
	bloomIntensity: number;
	particleDensity: number;
	particleIntensity: number;

	// UX/Hints/Onboarding
	tooltipsEnabled: boolean;
	showOnboardingAtStartup: boolean;
	confirmBeforeJobDeletion: boolean;
	enableKeyboardShortcuts: boolean;

	// Security & API
	encryptLocalStorage: boolean;
	autoBackupDatasets: boolean;
	promptBeforeOverwriting: boolean;

	// Benchmark Defaults
	defaultIterationCount: number;
	enableSmartMemoryUnits: boolean;
	warnOnLongJobs: boolean;
	longJobThreshold: number;

	// Import/Export Behavior
	defaultImportPath: string;
	switchToNewDatasetAfterImport: boolean;
	askBeforeOverwritingExport: boolean;
}

// Default settings
const defaultSettings: Settings = {
	// Appearance
	animatedBackground: true,
	themePreference: 'dark',
	startupLoader: true,
	enableMotionTransitions: true,
	disableAnimatedBackgroundOnLightMode: true,
	enableBloomEffect: true,
	enableParticleSystem: true,
	enableDynamicLighting: true,
	bloomIntensity: 1.2,
	particleDensity: 0.1,
	particleIntensity: 0.8,

	// UX/Hints/Onboarding
	tooltipsEnabled: true,
	showOnboardingAtStartup: true,
	confirmBeforeJobDeletion: true,
	enableKeyboardShortcuts: true,

	// Security & API
	encryptLocalStorage: false,
	autoBackupDatasets: true,
	promptBeforeOverwriting: true,

	// Benchmark Defaults
	defaultIterationCount: 100,
	enableSmartMemoryUnits: true,
	warnOnLongJobs: true,
	longJobThreshold: 60,

	// Import/Export Behavior
	defaultImportPath: '',
	switchToNewDatasetAfterImport: true,
	askBeforeOverwritingExport: true,
};

// Define the context shape
interface SettingsContextType {
	settings: Settings;
	updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	resetSettings: () => void;
	saveSettings: () => Promise<boolean>;
}

// Create the context
export const SettingsContext = createContext<SettingsContextType>({
	settings: defaultSettings,
	updateSetting: () => {},
	resetSettings: () => {},
	saveSettings: async () => false,
});

// Hook for using settings
export const useSettings = () => useContext(SettingsContext);

// Settings provider component
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [settings, setSettings] = useState<Settings>(defaultSettings);
	const [initialized, setInitialized] = useState(false);

	// Load settings on mount
	useEffect(() => {
		loadSettings();
	}, []);

	// Load settings from localStorage or electron store
	const loadSettings = async () => {
		try {
			// Try to load from localStorage first (for development/testing)
			const savedSettings = localStorage.getItem('pqcbench_settings');

			if (savedSettings) {
				setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
			} else {
				// In production, would load from electron store instead
				// For now, use defaults
				setSettings(defaultSettings);
			}

			setInitialized(true);
		} catch (error) {
			console.error('Failed to load settings:', error);
			setSettings(defaultSettings);
			setInitialized(true);
		}
	};

	// Update a single setting
	const updateSetting = <K extends keyof Settings>(
		key: K,
		value: Settings[K]
	) => {
		const updatedSettings = { ...settings, [key]: value };
		setSettings(updatedSettings);

		// Save to localStorage (for development/testing)
		localStorage.setItem('pqcbench_settings', JSON.stringify(updatedSettings));

		// In production, would also save to electron store
		// window.electron.store.set('settings', updatedSettings);
	};

	// Reset all settings to defaults
	const resetSettings = () => {
		setSettings(defaultSettings);
		localStorage.setItem('pqcbench_settings', JSON.stringify(defaultSettings));

		// In production, would also save to electron store
		// window.electron.store.set('settings', defaultSettings);
	};

	// Save all settings
	const saveSettings = async (): Promise<boolean> => {
		try {
			// Save to localStorage
			localStorage.setItem('pqcbench_settings', JSON.stringify(settings));

			// In production, would also save to electron store
			// await window.electron.store.set('settings', settings);

			return true;
		} catch (error) {
			console.error('Failed to save settings:', error);
			return false;
		}
	};

	return (
		<SettingsContext.Provider
			value={{ settings, updateSetting, resetSettings, saveSettings }}
		>
			{initialized ? children : null}
		</SettingsContext.Provider>
	);
};
