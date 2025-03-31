// src/main/ipc.ts
import { ipcMain } from 'electron';
import { benchmarkManager } from './benchmarkManager';
import { BenchmarkParams, BenchmarkResult } from '../types/benchmark';
import { benchmarkStore } from './store';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import * as crypto from 'crypto'; // Import Node crypto
import { promisify } from 'util'; // Import promisify

// Load the native addons with robust error handling
let kyberAddon: any;
let dilithiumAddon: any;

function getAddonPaths(addonName: string) {
	const isDevelopment = process.env.NODE_ENV === 'development';
	const appRoot = app.getAppPath();
	const projectRoot = isDevelopment ? path.resolve(appRoot, '..') : appRoot; // Adjust project root detection

	// Define possible paths where the addon might be located
	// Prioritize paths relative to the project structure during development
	return [
		// Development build output (relative to project root)
		path.join(projectRoot, 'addons', 'build', 'Release', `${addonName}.node`),

		// Production paths (packaged with electron-builder, relative to app resources)
		path.join(
			process.resourcesPath,
			'addons',
			'build',
			'Release',
			`${addonName}.node`
		), // Common location

		// Older path structures (keep for compatibility if needed)
		path.join(appRoot, 'build', 'Release', `${addonName}.node`), // Less likely for addons subdir
		path.join(appRoot, 'dist', 'build', 'Release', `${addonName}.node`), // If build happens inside dist

		// Paths relative to __dirname (where ipc.ts might end up after bundling)
		path.join(__dirname, 'build', 'Release', `${addonName}.node`),
		path.join(__dirname, '..', 'build', 'Release', `${addonName}.node`),
		path.join(
			__dirname,
			'..',
			'..',
			'addons',
			'build',
			'Release',
			`${addonName}.node`
		), // Trying relative path upwards

		// Absolute path attempt based on CWD (can be unreliable)
		path.join(process.cwd(), 'addons', 'build', 'Release', `${addonName}.node`),
	];
}

function setupNativeLibraryPaths() {
	// Ensure native libraries are in PATH or accessible
	let opensslBinPath = '';
	let oqsBinPath = '';
	const isDevelopment = process.env.NODE_ENV === 'development';
	const appRoot = app.getAppPath();
	// Adjust base path for finding libs depending on environment
	const libsBasePath = isDevelopment
		? path.resolve(appRoot, '..', 'external', 'libs')
		: path.join(process.resourcesPath, 'libs');

	if (process.platform === 'win32') {
		opensslBinPath = path.join(
			libsBasePath,
			'openssl',
			'openssl-3.0',
			'x64',
			'bin'
		);
		oqsBinPath = path.join(libsBasePath, 'oqs', 'install', 'bin');
		process.env.PATH = `${
			process.env.PATH || ''
		};${opensslBinPath};${oqsBinPath}`;
	} else if (process.platform === 'darwin') {
		// On macOS, LD_LIBRARY_PATH is less common; DYLD_LIBRARY_PATH is used.
		// Often, embedding paths via rpath during linking is preferred.
		// However, we can try setting DYLD_LIBRARY_PATH.
		const opensslLibPath = path.join(
			libsBasePath,
			'openssl',
			'openssl-3.0',
			'lib'
		);
		const oqsLibPath = path.join(libsBasePath, 'oqs', 'install', 'lib');
		process.env.DYLD_LIBRARY_PATH = `${
			process.env.DYLD_LIBRARY_PATH || ''
		}:${opensslLibPath}:${oqsLibPath}`;
		console.log('Setting DYLD_LIBRARY_PATH:', process.env.DYLD_LIBRARY_PATH);
	} else {
		// Linux
		const opensslLibPath = path.join(
			libsBasePath,
			'openssl',
			'openssl-3.0',
			'lib'
		);
		const oqsLibPath = path.join(libsBasePath, 'oqs', 'install', 'lib');
		process.env.LD_LIBRARY_PATH = `${
			process.env.LD_LIBRARY_PATH || ''
		}:${opensslLibPath}:${oqsLibPath}`;
		console.log('Setting LD_LIBRARY_PATH:', process.env.LD_LIBRARY_PATH);
	}

	if (opensslBinPath || oqsBinPath) {
		console.log('Attempted to configure native library paths:', {
			opensslBinPath,
			oqsBinPath,
			dyld: process.env.DYLD_LIBRARY_PATH,
			ld: process.env.LD_LIBRARY_PATH,
		});
	} else {
		console.log(
			'Native library path setup skipped or paths not determined for this platform.'
		);
	}
}

function loadNativeAddon(addonName: string) {
	setupNativeLibraryPaths(); // Ensure paths are set before trying to load

	const possiblePaths = getAddonPaths(addonName);
	let foundPath = '';
	let lastError: Error | null = null;

	console.log(`Searching for ${addonName} in:`, possiblePaths);

	for (const addonPath of possiblePaths) {
		try {
			if (fs.existsSync(addonPath)) {
				console.log(`Attempting to load ${addonName} from: ${addonPath}`);
				foundPath = addonPath;
				const addon = require(addonPath); // Use require primarily

				// *** UPDATED Validation Logic ***
				let isValid = false;
				if (addonName === 'kyber_node_addon') {
					isValid =
						typeof addon.generateKeypair === 'function' &&
						typeof addon.encapsulate === 'function' && // <-- CORRECT CHECK
						typeof addon.decapsulate === 'function'; // <-- CORRECT CHECK
				} else if (addonName === 'dilithium_node_addon') {
					isValid =
						typeof addon.generateKeypair === 'function' &&
						typeof addon.sign === 'function' &&
						typeof addon.verify === 'function';
				}

				if (isValid) {
					console.log(
						`Successfully loaded and validated ${addonName} addon from ${addonPath}`
					);
					return addon;
				} else {
					console.warn(
						`Loaded ${addonName} from ${addonPath}, but it did not pass validation (missing expected functions).`
					);
					lastError = new Error(
						`Addon ${addonName} loaded but failed validation.`
					);
					// Continue searching other paths if validation fails
				}
			} else {
				// console.log(`Path does not exist: ${addonPath}`); // Optional: verbose logging
			}
		} catch (error: any) {
			console.warn(
				`Failed to load ${addonName} from ${addonPath}:`,
				error.message
			);
			lastError = error; // Store the last error encountered
			// Continue searching other paths if loading fails
		}
	}

	// If loop completes without returning an addon
	if (foundPath) {
		console.error(
			`Found ${addonName} at ${foundPath} but failed to load or validate it properly. Last error:`,
			lastError?.message
		);
	} else {
		console.error(
			`Failed to find ${addonName} addon in any of the searched locations.`
		);
		if (lastError) {
			console.error('Last error during load attempts:', lastError);
		}
	}

	return null; // Return null if not found or loaded correctly
}

// Try to load the addons
try {
	// No changes needed here, the loading logic is inside the function
	kyberAddon = loadNativeAddon('kyber_node_addon');
	if (kyberAddon) {
		console.log('Kyber encryption module loaded successfully');
		console.log('Available Kyber functions:', Object.keys(kyberAddon));
	} else {
		console.error(
			'Could not load Kyber encryption module after searching paths.'
		);
	}

	dilithiumAddon = loadNativeAddon('dilithium_node_addon');
	if (dilithiumAddon) {
		console.log('Dilithium signature module loaded successfully');
		console.log('Available Dilithium functions:', Object.keys(dilithiumAddon));
	} else {
		console.error(
			'Could not load Dilithium signature module after searching paths.'
		);
	}
} catch (error: any) {
	console.error(
		'Error initializing crypto modules during load attempt:',
		error
	);
}

export function setupBenchmarkIPC() {
	// No changes needed here
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
			// Log the error before potentially saving
			console.error('Error during benchmark run:', error);
			// Rethrow or return a structured error for the renderer
			throw new Error(`Benchmark failed: ${error?.message || 'Unknown error'}`);
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

// Setup Encryption/Signature IPC (No changes needed here, the handlers call the addon variable)
export function setupEncryptionIPC() {
	console.log('[IPC] Setting up Encryption/Signature IPC handlers...');

	// --- Node Crypto Helpers ---
	const hkdfAsync: (
		digest: string,
		ikm: crypto.BinaryLike | crypto.KeyObject,
		salt: crypto.BinaryLike,
		info: crypto.BinaryLike,
		keylen: number
	) => Promise<ArrayBuffer> = promisify(crypto.hkdf);

	ipcMain.handle(
		'node-crypto-hkdf',
		async (
			_,
			ikmBase64: string,
			length: number,
			saltBase64?: string,
			infoString?: string
		) => {
			console.log(`[IPC] Handling 'node-crypto-hkdf'`);
			try {
				const ikm = Buffer.from(ikmBase64, 'base64');
				const salt = saltBase64
					? Buffer.from(saltBase64, 'base64')
					: Buffer.alloc(0); // Use empty buffer if no salt provided
				// Ensure info is a buffer, even if empty
				const info = infoString
					? Buffer.from(infoString, 'utf8')
					: Buffer.alloc(0);

				// Use the promisified version with await
				const derivedKeyArrayBuffer = await hkdfAsync(
					'sha256',
					ikm,
					salt,
					info,
					length
				);
				const derivedKeyBuffer = Buffer.from(derivedKeyArrayBuffer);
				return derivedKeyBuffer.toString('base64');
			} catch (error: any) {
				console.error('[IPC Error] node-crypto-hkdf:', error);
				throw new Error(`HKDF operation failed: ${error.message}`);
			}
		}
	);

	const randomBytesAsync: (size: number) => Promise<Buffer> = promisify(
		crypto.randomBytes
	);

	ipcMain.handle('node-crypto-get-random-bytes', async (_, length: number) => {
		console.log(`[IPC] Handling 'node-crypto-get-random-bytes'`);
		try {
			const buf = await randomBytesAsync(length);
			return buf.toString('base64');
		} catch (error: any) {
			console.error('[IPC Error] node-crypto-get-random-bytes:', error);
			throw new Error(`randomBytes operation failed: ${error.message}`);
		}
	});

	// --- Kyber Handlers ---
	const createKyberErrorHandler = (channel: string) => {
		return async (...args: any[]) => {
			// Use rest parameter
			console.error(
				`[IPC] Attempted to call ${channel} but Kyber addon is not loaded.`
			);
			// Include arguments for better debugging context if needed
			// console.error(`Arguments:`, args.slice(1)); // Exclude event object
			throw new Error(`Kyber addon is not loaded. Cannot execute ${channel}.`);
		};
	};

	ipcMain.handle(
		'kyber-generate-keypair',
		kyberAddon
			? async (_, securityLevel: string) => {
					console.log(
						`[IPC] Handling 'kyber-generate-keypair' (${securityLevel})`
					);
					try {
						// Check addon one last time before calling
						if (!kyberAddon) throw new Error('Kyber addon became unavailable.');
						const result = kyberAddon.generateKeypair(securityLevel);
						if (!result || !result.publicKey || !result.secretKey) {
							throw new Error(
								'Kyber generateKeypair addon returned invalid result'
							);
						}
						return {
							publicKey: result.publicKey.toString('base64'),
							secretKey: result.secretKey.toString('base64'),
							publicKeySize: result.publicKey.length,
							secretKeySize: result.secretKey.length,
						};
					} catch (error: any) {
						console.error('[IPC Error] kyber-generate-keypair:', error);
						throw new Error(
							`Kyber generateKeypair failed: ${
								error.message || 'Unknown native error'
							}`
						);
					}
			  }
			: createKyberErrorHandler('kyber-generate-keypair')
	);

	ipcMain.handle(
		'kyber-encapsulate',
		kyberAddon
			? async (_, securityLevel: string, publicKeyBase64: string) => {
					console.log(`[IPC] Handling 'kyber-encapsulate' (${securityLevel})`);
					try {
						if (!kyberAddon) throw new Error('Kyber addon became unavailable.');
						const publicKey = Buffer.from(publicKeyBase64, 'base64');
						const result = kyberAddon.encapsulate(securityLevel, publicKey);
						if (!result || !result.kemCiphertext || !result.sharedSecret) {
							throw new Error(
								'Kyber encapsulate addon returned invalid result'
							);
						}
						return {
							kemCiphertext: result.kemCiphertext.toString('base64'),
							sharedSecret: result.sharedSecret.toString('base64'),
						};
					} catch (error: any) {
						console.error('[IPC Error] kyber-encapsulate:', error);
						throw new Error(
							`Kyber encapsulate failed: ${
								error.message || 'Unknown native error'
							}`
						);
					}
			  }
			: createKyberErrorHandler('kyber-encapsulate')
	);

	ipcMain.handle(
		'kyber-decapsulate',
		kyberAddon
			? async (
					_,
					securityLevel: string,
					secretKeyBase64: string,
					kemCiphertextBase64: string
			  ) => {
					console.log(`[IPC] Handling 'kyber-decapsulate' (${securityLevel})`);
					try {
						if (!kyberAddon) throw new Error('Kyber addon became unavailable.');
						const secretKey = Buffer.from(secretKeyBase64, 'base64');
						const kemCiphertext = Buffer.from(kemCiphertextBase64, 'base64');
						const sharedSecret = kyberAddon.decapsulate(
							securityLevel,
							secretKey,
							kemCiphertext
						);
						// Decapsulate should return a buffer directly
						if (!sharedSecret || !Buffer.isBuffer(sharedSecret)) {
							// Check if it's falsy or null explicitly
							if (!sharedSecret && sharedSecret !== null) {
								console.error(
									'Decapsulate returned undefined or unexpected falsy value.'
								);
							} else if (sharedSecret === null) {
								// This *could* happen if malloc failed inside C++, but the addon should throw
								console.error(
									'Decapsulate returned null, potentially indicating internal allocation failure.'
								);
							} else {
								console.error(
									'Decapsulate did not return a Buffer. Type:',
									typeof sharedSecret,
									'Value:',
									sharedSecret
								);
							}
							throw new Error(
								'Kyber decapsulate addon returned invalid result (expected Buffer)'
							);
						}
						return sharedSecret.toString('base64');
					} catch (error: any) {
						console.error('[IPC Error] kyber-decapsulate:', error);
						// Add more specific error checking if possible
						if (error.message && error.message.includes('invalid result')) {
							// Potentially handle specific addon errors differently if needed
						}
						throw new Error(
							`Kyber decapsulate failed: ${
								error.message || 'Unknown native error'
							}`
						);
					}
			  }
			: createKyberErrorHandler('kyber-decapsulate')
	);

	// Ensure old handlers are definitely removed if they were ever registered
	ipcMain.removeHandler('kyber-encrypt');
	ipcMain.removeHandler('kyber-decrypt');

	// --- Dilithium Handlers ---
	const createDilithiumErrorHandler = (channel: string) => {
		return async (...args: any[]) => {
			// Use rest parameter
			console.error(
				`[IPC] Attempted to call ${channel} but Dilithium addon is not loaded.`
			);
			throw new Error(
				`Dilithium addon is not loaded. Cannot execute ${channel}.`
			);
		};
	};

	ipcMain.handle(
		'dilithium-generate-keypair',
		dilithiumAddon
			? async (_, securityLevel: string) => {
					console.log(
						`[IPC] Handling 'dilithium-generate-keypair' (${securityLevel})`
					);
					try {
						if (!dilithiumAddon)
							throw new Error('Dilithium addon became unavailable.');
						const result = dilithiumAddon.generateKeypair(securityLevel);
						if (!result || !result.publicKey || !result.secretKey) {
							throw new Error(
								'Dilithium generateKeypair addon returned invalid result'
							);
						}
						return {
							publicKey: result.publicKey.toString('base64'),
							secretKey: result.secretKey.toString('base64'),
							publicKeySize: result.publicKey.length,
							secretKeySize: result.secretKey.length,
						};
					} catch (error: any) {
						console.error('[IPC Error] dilithium-generate-keypair:', error);
						throw new Error(
							`Dilithium generateKeypair failed: ${
								error.message || 'Unknown native error'
							}`
						);
					}
			  }
			: createDilithiumErrorHandler('dilithium-generate-keypair')
	);

	ipcMain.handle(
		'dilithium-sign',
		dilithiumAddon
			? async (
					_,
					securityLevel: string,
					secretKeyBase64: string,
					// Message can be buffer or string from preload, handle as buffer here
					messageInput: string | Buffer // Accept both potential inputs
			  ) => {
					console.log(`[IPC] Handling 'dilithium-sign' (${securityLevel})`);
					try {
						if (!dilithiumAddon)
							throw new Error('Dilithium addon became unavailable.');
						const secretKey = Buffer.from(secretKeyBase64, 'base64');
						// Ensure message is a Buffer for the addon
						const messageBuffer = Buffer.isBuffer(messageInput)
							? messageInput
							: Buffer.from(messageInput, 'utf8'); // Assume utf8 if string

						// The addon's sign function expects (level, skBuffer, msgBuffer)
						const signature = dilithiumAddon.sign(
							securityLevel,
							secretKey,
							messageBuffer
						);
						if (!signature || !Buffer.isBuffer(signature)) {
							throw new Error(
								'Dilithium sign addon returned invalid result (expected Buffer)'
							);
						}
						return {
							signature: signature.toString('base64'),
							signatureSize: signature.length,
						};
					} catch (error: any) {
						console.error(`[IPC Error] dilithium-sign:`, error);
						throw new Error(
							`Dilithium sign failed: ${
								error.message || 'Unknown native error'
							}`
						);
					}
			  }
			: createDilithiumErrorHandler('dilithium-sign')
	);

	ipcMain.handle(
		'dilithium-verify',
		dilithiumAddon
			? async (
					_,
					securityLevel: string,
					publicKeyBase64: string,
					// Message can be buffer or string from preload, handle as buffer here
					messageInput: string | Buffer,
					signatureBase64: string
			  ) => {
					console.log(`[IPC] Handling 'dilithium-verify' (${securityLevel})`);
					try {
						if (!dilithiumAddon)
							throw new Error('Dilithium addon became unavailable.');
						const publicKey = Buffer.from(publicKeyBase64, 'base64');
						const signature = Buffer.from(signatureBase64, 'base64');
						// Ensure message is a Buffer for the addon
						const messageBuffer = Buffer.isBuffer(messageInput)
							? messageInput
							: Buffer.from(messageInput, 'utf8'); // Assume utf8 if string

						// The addon's verify function expects (level, pkBuffer, msgBuffer, sigBuffer)
						const isValid = dilithiumAddon.verify(
							securityLevel,
							publicKey,
							messageBuffer,
							signature
						);
						// The addon wrapper returns boolean directly
						if (typeof isValid !== 'boolean') {
							console.error(
								'Verify addon returned non-boolean type:',
								typeof isValid
							);
							throw new Error(
								'Dilithium verify addon returned invalid result type (expected boolean)'
							);
						}
						return { isValid: isValid }; // Return object as defined in renderer.d.ts
					} catch (error: any) {
						console.error(`[IPC Error] dilithium-verify:`, error);
						// Check if the error indicates verification failure vs internal error
						// Note: The current C++ wrapper returns 0 for valid, 1 for invalid, -1 for error.
						// The NAPI wrapper converts 0 to true, 1 to false, and throws for < 0.
						// So an error here *should* mean an internal issue, not just an invalid signature.
						throw new Error(
							`Dilithium verify failed: ${
								error.message || 'Unknown native error'
							}`
						);
					}
			  }
			: createDilithiumErrorHandler('dilithium-verify')
	);

	console.log('[IPC] Encryption/Signature IPC handlers registration complete.');
}
