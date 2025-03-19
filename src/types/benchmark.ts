export interface BenchmarkParams {
	algorithm: string;
	securityParam: string;
}

export interface BenchmarkMetrics {
	keygen?: number;
	encaps?: number;
	decaps?: number;
	sign?: number;
	verify?: number;
}

export interface BenchmarkResult {
	id: string;
	algorithm: string;
	securityParam: string;
	metrics: {
		[key: string]: number;
	};
	timestamp: string;
	status: 'completed' | 'failed';
	error?: string;
}

export const SUPPORTED_ALGORITHMS = [
	// Post-Quantum
	'kyber',
	'dilithium',
	'falcon',
	'mceliece',
	'sphincs',
	// Classical
	'aes',
	'ecdh',
	'ecdsa',
	'rsa',
] as const;

export const SECURITY_PARAMS: { [key: string]: string[] } = {
	// Post-Quantum
	kyber: ['512', '768', '1024'],
	dilithium: ['2', '3', '5'],
	falcon: ['512', '1024', 'padded-512', 'padded-1024'],
	mceliece: ['348864', '460896', '6688128', '8192128f'],
	sphincs: [
		'sha2-128f-simple',
		'sha2-128s-simple',
		'sha2-192f-simple',
		'sha2-192s-simple',
		'sha2-256f-simple',
		'sha2-256s-simple',
		'shake-128f-simple',
		'shake-128s-simple',
		'shake-192f-simple',
		'shake-192s-simple',
		'shake-256f-simple',
		'shake-256s-simple',
	],
	// Classical
	aes: ['128', '192', '256'],
	ecdh: ['secp256r1', 'secp384r1', 'secp521r1'],
	ecdsa: ['secp256r1', 'secp384r1', 'secp521r1'],
	rsa: ['1024', '2048', '3072', '4096'],
};
