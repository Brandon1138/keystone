import { ipcMain } from 'electron';
import { benchmarkManager } from './benchmarkManager';
import { BenchmarkParams, BenchmarkResult } from '../types/benchmark';
import { benchmarkStore } from './store';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

// Load the native addon with robust error handling
let kyberAddon: any;

function getAddonPaths() {
	const isDevelopment = process.env.NODE_ENV === 'development';
	const appRoot = app.getAppPath();

	// Define possible paths where the addon might be located
	return [
		// Development paths
		path.join(appRoot, 'build', 'Release', 'kyber_node_addon.node'),
		path.join(appRoot, '..', 'build', 'Release', 'kyber_node_addon.node'),

		// Production paths (packaged with electron-builder)
		path.join(appRoot, 'dist', 'build', 'Release', 'kyber_node_addon.node'),
		path.join(__dirname, 'build', 'Release', 'kyber_node_addon.node'),
		path.join(__dirname, '..', 'build', 'Release', 'kyber_node_addon.node'),

		// Relative paths - for development
		path.join(process.cwd(), 'build', 'Release', 'kyber_node_addon.node'),
		path.join(
			process.cwd(),
			'dist',
			'build',
			'Release',
			'kyber_node_addon.node'
		),
	];
}

function loadKyberAddon() {
	// Ensure native libraries are in PATH
	if (process.platform === 'win32') {
		const appPath = app.getAppPath();
		const opensslBinPath = path.join(
			appPath,
			'libs',
			'openssl',
			'openssl-3.0',
			'x64',
			'bin'
		);
		const oqsBinPath = path.join(appPath, 'libs', 'oqs', 'install', 'bin');

		// Add these paths to the PATH environment variable
		process.env.PATH = `${process.env.PATH};${opensslBinPath};${oqsBinPath}`;
		console.log(
			'Added native library paths to PATH:',
			opensslBinPath,
			oqsBinPath
		);
	}

	const possiblePaths = getAddonPaths();
	let foundPath = '';

	for (const addonPath of possiblePaths) {
		try {
			// Check if file exists before trying to require it
			if (fs.existsSync(addonPath)) {
				console.log(`Found Kyber addon at: ${addonPath}`);
				foundPath = addonPath;

				// First try normal require
				try {
					const addon = require(addonPath);
					if (
						typeof addon.generateKeypair === 'function' &&
						typeof addon.encrypt === 'function' &&
						typeof addon.decrypt === 'function'
					) {
						console.log('Successfully loaded Kyber addon with require()');
						return addon;
					}
				} catch (requireError) {
					console.log(`Failed to load addon with require: ${requireError}`);
				}

				// Fallback to process.dlopen
				try {
					// Use process.dlopen to load the module directly
					// This bypasses webpack's module system
					const module: { exports: any } = { exports: {} };
					process.dlopen(module, addonPath);

					// Test if it's a valid module by checking if it has the expected functions
					if (
						typeof module.exports.generateKeypair === 'function' &&
						typeof module.exports.encrypt === 'function' &&
						typeof module.exports.decrypt === 'function'
					) {
						console.log('Successfully loaded Kyber addon with process.dlopen');
						return module.exports;
					} else {
						console.log(
							'Found module but it does not have the required functions:',
							Object.keys(module.exports)
						);
					}
				} catch (dlopenError) {
					console.log(`Failed to load addon with dlopen: ${dlopenError}`);
				}
			}
		} catch (error) {
			console.log(`Failed to load addon from ${addonPath}:`, error);
		}
	}

	if (foundPath) {
		console.error(`Found addon at ${foundPath} but failed to load it properly`);
	} else {
		console.error('Failed to find Kyber addon in any location');
	}

	return null;
}

// Try to load the addon
try {
	kyberAddon = loadKyberAddon();
	if (kyberAddon) {
		console.log('Kyber encryption module loaded successfully');
		console.log('Available functions:', Object.keys(kyberAddon));
	} else {
		console.error('Could not load Kyber encryption module');
	}
} catch (error) {
	console.error('Error initializing Kyber encryption module:', error);
}

export function setupBenchmarkIPC() {
	ipcMain.handle('run-benchmark', async (event, params: BenchmarkParams) => {
		try {
			// Set up progress reporting
			benchmarkManager.onProgress((progressData) => {
				// Send progress updates to renderer
				event.sender.send('benchmark-progress', progressData);
			});

			const result = await benchmarkManager.runBenchmark(params);
			// Save the benchmark result to the store
			const savedResult = benchmarkStore.saveBenchmarkResult(result);
			return savedResult;
		} catch (error: any) {
			// We'll still save failed benchmarks but mark them as failed
			if (
				error &&
				typeof error === 'object' &&
				error.id &&
				error.status === 'failed'
			) {
				return benchmarkStore.saveBenchmarkResult(
					error as Omit<BenchmarkResult, 'id'>
				);
			}
			return error;
		}
	});

	ipcMain.handle('stop-benchmark', async (_, benchmarkId: string) => {
		return benchmarkManager.stopBenchmark(benchmarkId);
	});

	// New IPC handlers for benchmark data operations
	ipcMain.handle('get-all-benchmarks', async () => {
		return benchmarkStore.getAllBenchmarkResults();
	});

	ipcMain.handle(
		'get-benchmarks-by-algorithm',
		async (_, algorithm: string) => {
			return benchmarkStore.getBenchmarksByAlgorithm(algorithm);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-security-param',
		async (_, securityParam: string) => {
			return benchmarkStore.getBenchmarksBySecurityParam(securityParam);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-algorithm-and-param',
		async (_, algorithm: string, securityParam: string) => {
			return benchmarkStore.getBenchmarksByAlgorithmAndParam(
				algorithm,
				securityParam
			);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-date-range',
		async (_, startDate: string, endDate: string) => {
			return benchmarkStore.getBenchmarksByDateRange(
				new Date(startDate),
				new Date(endDate)
			);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-status',
		async (_, status: 'completed' | 'failed') => {
			return benchmarkStore.getBenchmarksByStatus(status);
		}
	);

	ipcMain.handle('get-benchmark-by-id', async (_, id: string) => {
		return benchmarkStore.getBenchmarkById(id);
	});

	ipcMain.handle('delete-benchmark', async (_, id: string) => {
		return benchmarkStore.deleteBenchmark(id);
	});

	ipcMain.handle('clear-all-benchmarks', async () => {
		benchmarkStore.clearAllBenchmarks();
		return true;
	});
}

// Set up IPC handlers for Kyber encryption operations
export function setupEncryptionIPC() {
	// Check if the kyberAddon was loaded successfully
	if (!kyberAddon) {
		console.error(
			'Kyber addon not loaded. Encryption functionality will not be available.'
		);

		// Set up error handlers for all Kyber IPC methods
		ipcMain.handle('kyber-generate-keypair', async () => {
			throw new Error('Kyber encryption module not available');
		});

		ipcMain.handle('kyber-encrypt', async () => {
			throw new Error('Kyber encryption module not available');
		});

		ipcMain.handle('kyber-decrypt', async () => {
			throw new Error('Kyber encryption module not available');
		});

		return;
	}

	// Generate keypair
	ipcMain.handle('kyber-generate-keypair', async (_, securityLevel: string) => {
		try {
			console.log(`Generating keys with security level: ${securityLevel}`);
			const result = kyberAddon.generateKeypair(securityLevel);

			if (!result || !result.publicKey || !result.secretKey) {
				console.error('Keypair generation returned invalid result:', result);
				throw new Error('Invalid keypair generation result');
			}

			console.log('Key generation successful:');
			console.log(`- Public key size: ${result.publicKey.length} bytes`);
			console.log(`- Secret key size: ${result.secretKey.length} bytes`);

			return {
				publicKey: result.publicKey.toString('base64'),
				secretKey: result.secretKey.toString('base64'),
				publicKeySize: result.publicKey.length,
				secretKeySize: result.secretKey.length,
			};
		} catch (error: any) {
			console.error('Error generating Kyber keypair:', error);
			throw new Error(
				`Failed to generate keypair: ${error.message || 'Unknown error'}`
			);
		}
	});

	// Encrypt message
	ipcMain.handle(
		'kyber-encrypt',
		async (
			_,
			securityLevel: string,
			publicKeyBase64: string,
			plaintext: string
		) => {
			try {
				if (!publicKeyBase64) {
					throw new Error('Public key is required');
				}

				if (!plaintext) {
					throw new Error('Plaintext is required');
				}

				console.log(`Encrypting with security level: ${securityLevel}`);
				console.log(
					`- Public key length: ${publicKeyBase64.length} chars (base64)`
				);
				console.log(`- Plaintext length: ${plaintext.length} chars`);

				// Convert base64 public key to Buffer
				const publicKey = Buffer.from(publicKeyBase64, 'base64');
				// Convert plaintext to Buffer
				const plaintextBuffer = Buffer.from(plaintext, 'utf8');

				console.log(`- Decoded public key length: ${publicKey.length} bytes`);
				console.log(
					`- Plaintext buffer length: ${plaintextBuffer.length} bytes`
				);

				// Enhanced error handling and debugging
				if (!kyberAddon) {
					console.error('Encryption failed: Kyber addon not loaded');
					throw new Error('Encryption module not available');
				}

				if (!kyberAddon.encrypt) {
					console.error('Encryption failed: encrypt function not available');
					throw new Error('Encryption function not available');
				}

				console.log('About to call native encrypt function');

				try {
					// Call the native addon to encrypt
					const ciphertext = kyberAddon.encrypt(
						securityLevel,
						publicKey,
						plaintextBuffer
					);

					if (!ciphertext || !Buffer.isBuffer(ciphertext)) {
						console.error(
							'Encryption returned invalid ciphertext:',
							ciphertext
						);
						throw new Error('Invalid encryption result');
					}

					console.log('Encryption successful:');
					console.log(`- Ciphertext size: ${ciphertext.length} bytes`);

					return {
						ciphertext: ciphertext.toString('base64'),
						ciphertextSize: ciphertext.length,
					};
				} catch (innerError: any) {
					console.error('Error in native encrypt function:', innerError);
					console.error(
						'Error details:',
						innerError.message || 'No message',
						innerError.stack || 'No stack'
					);
					throw new Error(
						`Failed to encrypt: ${innerError.message || 'Unknown native error'}`
					);
				}
			} catch (error: any) {
				console.error('Error encrypting with Kyber:', error);
				throw new Error(
					`Failed to encrypt: ${error.message || 'Unknown error'}`
				);
			}
		}
	);

	// Decrypt message
	ipcMain.handle(
		'kyber-decrypt',
		async (
			_,
			securityLevel: string,
			secretKeyBase64: string,
			ciphertextBase64: string
		) => {
			try {
				if (!secretKeyBase64) {
					throw new Error('Secret key is required');
				}

				if (!ciphertextBase64) {
					throw new Error('Ciphertext is required');
				}

				console.log(`Decrypting with security level: ${securityLevel}`);
				console.log(
					`- Secret key length: ${secretKeyBase64.length} chars (base64)`
				);
				console.log(
					`- Ciphertext length: ${ciphertextBase64.length} chars (base64)`
				);

				// Convert base64 strings to Buffers
				const secretKey = Buffer.from(secretKeyBase64, 'base64');
				const ciphertext = Buffer.from(ciphertextBase64, 'base64');

				console.log(`- Decoded secret key length: ${secretKey.length} bytes`);
				console.log(`- Decoded ciphertext length: ${ciphertext.length} bytes`);

				// Call the native addon to decrypt
				const plaintext = kyberAddon.decrypt(
					securityLevel,
					secretKey,
					ciphertext
				);

				if (!plaintext || !Buffer.isBuffer(plaintext)) {
					console.error('Decryption returned invalid plaintext:', plaintext);
					throw new Error('Invalid decryption result');
				}

				console.log('Decryption successful:');
				console.log(`- Plaintext size: ${plaintext.length} bytes`);
				console.log(
					`- Decrypted message: "${plaintext
						.toString('utf8')
						.substring(0, 30)}..."`
				);

				// Convert the decrypted data to a string
				return {
					plaintext: plaintext.toString('utf8'),
				};
			} catch (error: any) {
				console.error('Error decrypting with Kyber:', error);
				throw new Error(
					`Failed to decrypt: ${error.message || 'Unknown error'}`
				);
			}
		}
	);
}
