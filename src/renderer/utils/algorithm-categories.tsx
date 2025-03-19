import React from 'react';
// Material UI icons
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CreateIcon from '@mui/icons-material/Create';
import SecurityIcon from '@mui/icons-material/Security';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
import KeyIcon from '@mui/icons-material/Key';

export type AlgorithmCategory =
	| 'KEM'
	| 'Signature'
	| 'Symmetric'
	| 'ClassicalPublicKey';

export interface AlgorithmInfo {
	category: AlgorithmCategory;
	displayName: string;
	icon: React.ReactNode;
}

/**
 * Maps algorithm names to their categories and appropriate icons
 */
export const getAlgorithmInfo = (algorithm: string): AlgorithmInfo => {
	const normalizedAlgo = algorithm.toLowerCase();

	// KEM algorithms
	if (normalizedAlgo === 'kyber' || normalizedAlgo === 'mceliece') {
		return {
			category: 'KEM',
			displayName: algorithm.charAt(0).toUpperCase() + algorithm.slice(1),
			icon: <VpnKeyIcon />,
		};
	}

	// Signature algorithms
	if (
		normalizedAlgo === 'dilithium' ||
		normalizedAlgo === 'falcon' ||
		normalizedAlgo === 'sphincs'
	) {
		return {
			category: 'Signature',
			displayName: algorithm.charAt(0).toUpperCase() + algorithm.slice(1),
			icon: <CreateIcon />,
		};
	}

	// Symmetric algorithms
	if (normalizedAlgo === 'aes') {
		return {
			category: 'Symmetric',
			displayName: normalizedAlgo.toUpperCase(),
			icon: <EnhancedEncryptionIcon />,
		};
	}

	// Classical public key algorithms
	if (
		normalizedAlgo === 'rsa' ||
		normalizedAlgo === 'ecdh' ||
		normalizedAlgo === 'ecdsa'
	) {
		return {
			category: 'ClassicalPublicKey',
			displayName: normalizedAlgo.toUpperCase(),
			icon: <KeyIcon />,
		};
	}

	// Default fallback
	return {
		category: 'KEM',
		displayName: algorithm.charAt(0).toUpperCase() + algorithm.slice(1),
		icon: <SecurityIcon />,
	};
};

/**
 * Returns a color class based on algorithm category for consistent styling
 */
export const getCategoryColorClass = (category: AlgorithmCategory): string => {
	switch (category) {
		case 'KEM':
			return 'text-blue-600 dark:text-blue-400';
		case 'Signature':
			return 'text-green-600 dark:text-green-400';
		case 'Symmetric':
			return 'text-purple-600 dark:text-purple-400';
		case 'ClassicalPublicKey':
			return 'text-amber-600 dark:text-amber-400';
		default:
			return 'text-gray-600 dark:text-gray-400';
	}
};
