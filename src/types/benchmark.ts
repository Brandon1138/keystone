export interface BenchmarkParams {
	algorithm: string;
	securityParam: string;
	iterations?: number;
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
	falcon: [
		'Falcon-512',
		'Falcon-1024',
		'Falcon-padded-512',
		'Falcon-padded-1024',
	],
	mceliece: ['348864', '460896', '6688128', '8192128f'],
	sphincs: [
		'SPHINCS+-SHA2-128f-simple',
		'SPHINCS+-SHA2-128s-simple',
		'SPHINCS+-SHA2-192f-simple',
		'SPHINCS+-SHA2-192s-simple',
		'SPHINCS+-SHA2-256f-simple',
		'SPHINCS+-SHA2-256s-simple',
		'SPHINCS+-SHAKE-128f-simple',
		'SPHINCS+-SHAKE-128s-simple',
		'SPHINCS+-SHAKE-192f-simple',
		'SPHINCS+-SHAKE-192s-simple',
		'SPHINCS+-SHAKE-256f-simple',
		'SPHINCS+-SHAKE-256s-simple',
	],
	// Classical
	aes: ['128', '192', '256'],
	ecdh: ['secp256r1', 'secp384r1', 'secp521r1'],
	ecdsa: ['secp256r1', 'secp384r1', 'secp521r1'],
	rsa: ['1024', '2048', '3072', '4096'],
};
