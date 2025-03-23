/**
 * Defines algorithm types and their specific operations
 */

export interface AlgorithmDefinition {
	name: string;
	type: 'KEM' | 'Signature' | 'Symmetric';
	operations: string[];
	displayNames: { [key: string]: string };
}

export const ALGORITHM_DEFINITIONS: { [key: string]: AlgorithmDefinition } = {
	// KEMs
	kyber: {
		name: 'Kyber',
		type: 'KEM',
		operations: ['keygen', 'encaps', 'decaps'],
		displayNames: {
			keygen: 'Key Generation',
			encaps: 'Encapsulation',
			decaps: 'Decapsulation',
		},
	},

	mceliece: {
		name: 'Classic McEliece',
		type: 'KEM',
		operations: ['keygen', 'encaps', 'decaps'],
		displayNames: {
			keygen: 'Key Generation',
			encaps: 'Encapsulation',
			decaps: 'Decapsulation',
		},
	},

	// Signatures
	dilithium: {
		name: 'Dilithium',
		type: 'Signature',
		operations: ['keygen', 'sign', 'verify'],
		displayNames: {
			keygen: 'Key Generation',
			sign: 'Signature Generation',
			verify: 'Signature Verification',
		},
	},

	sphincs: {
		name: 'SPHINCS+',
		type: 'Signature',
		operations: ['keygen', 'sign', 'verify'],
		displayNames: {
			keygen: 'Key Generation',
			sign: 'Signature Generation',
			verify: 'Signature Verification',
		},
	},

	falcon: {
		name: 'Falcon',
		type: 'Signature',
		operations: ['keygen', 'sign', 'verify'],
		displayNames: {
			keygen: 'Key Generation',
			sign: 'Signature Generation',
			verify: 'Signature Verification',
		},
	},

	// Symmetric ciphers
	aes: {
		name: 'AES',
		type: 'Symmetric',
		operations: ['encrypt', 'decrypt'],
		displayNames: {
			encrypt: 'Encryption',
			decrypt: 'Decryption',
		},
	},

	// RSA
	rsa: {
		name: 'RSA',
		type: 'Signature',
		operations: ['keygen', 'encrypt', 'decrypt'],
		displayNames: {
			keygen: 'Key Generation',
			encrypt: 'Encryption',
			decrypt: 'Decryption',
		},
	},

	// ECDH
	ecdh: {
		name: 'ECDH',
		type: 'KEM',
		operations: ['keygen', 'shared_secret'],
		displayNames: {
			keygen: 'Key Generation',
			shared_secret: 'Shared Secret Computation',
		},
	},

	// ECDSA
	ecdsa: {
		name: 'ECDSA',
		type: 'Signature',
		operations: ['keygen', 'sign', 'verify'],
		displayNames: {
			keygen: 'Key Generation',
			sign: 'Signature Generation',
			verify: 'Signature Verification',
		},
	},
};

/**
 * Get the algorithm definition
 */
export function getAlgorithmDefinition(algorithm: string): AlgorithmDefinition {
	const key = algorithm.toLowerCase();
	// Return the specific definition if it exists, otherwise return a default
	if (ALGORITHM_DEFINITIONS[key]) {
		return ALGORITHM_DEFINITIONS[key];
	}

	// Try to find a match by algorithm family (e.g., if 'kyber512' is passed, use 'kyber')
	for (const [defKey, definition] of Object.entries(ALGORITHM_DEFINITIONS)) {
		if (key.includes(defKey)) {
			return definition;
		}
	}

	// Default fallback
	return {
		name: algorithm,
		type: 'KEM',
		operations: ['keygen', 'encaps', 'decaps'],
		displayNames: {
			keygen: 'Key Generation',
			encaps: 'Encapsulation',
			decaps: 'Decapsulation',
		},
	};
}

/**
 * Get all operations for an algorithm
 */
export function getAlgorithmOperations(algorithm: string): string[] {
	return getAlgorithmDefinition(algorithm).operations;
}

/**
 * Get display name for an algorithm operation
 */
export function getOperationDisplayName(
	algorithm: string,
	operation: string
): string {
	const definition = getAlgorithmDefinition(algorithm);
	return definition.displayNames[operation] || operation;
}
