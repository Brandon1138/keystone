// src/main/ipc.ts
// Import Electron using require with type assertion
const electron = require('electron') as any;
const { ipcMain, app, safeStorage } = electron;
type IpcMainInvokeEvent = any; // Define a simple type alias

import { benchmarkManager } from './benchmarkManager';
import { BenchmarkParams, BenchmarkResult } from '../types/benchmark';
import { benchmarkStore } from './store';
import * as path from 'path';
import * as fs from 'fs';
import { access } from 'fs/promises'; // Import for checking if venv Python exists
import * as crypto from 'crypto'; // Import Node crypto
import { promisify } from 'util'; // Import promisify
import * as childProcess from 'child_process'; // Import for spawning the Python script
import { lowdbService } from './db/lowdbService';

// IMPORTANT: Set up native library paths BEFORE loading any modules
// This must happen at the top level, not inside a function

// Load the native addons with robust error handling
// Declare the variables at the top level
let kyberAddon: any = null;
let dilithiumAddon: any = null;

/**
 * Calculates the effective project root directory.
 * In development, it assumes the script is running from somewhere within the project structure
 * (like dist/main) and navigates up to find the directory containing package.json.
 * In production, it uses process.resourcesPath, which points to the app's resources directory.
 */
function getProjectRoot(): string {
	const isDevelopment = process.env.NODE_ENV === 'development';
	if (isDevelopment) {
		// In development, __dirname is likely .../PQCBenchGUI4/dist/main
		// We want to go up two levels to get .../PQCBenchGUI4
		// A more robust way might be to search upwards for package.json
		let currentDir = __dirname;
		while (
			!fs.existsSync(path.join(currentDir, 'package.json')) &&
			currentDir !== path.parse(currentDir).root
		) {
			currentDir = path.dirname(currentDir);
		}
		if (fs.existsSync(path.join(currentDir, 'package.json'))) {
			console.log(
				`[getProjectRoot] Found project root via package.json search: ${currentDir}`
			);
			return currentDir;
		} else {
			// Fallback if package.json not found (less reliable)
			const fallbackPath = path.resolve(__dirname, '..', '..');
			console.warn(
				`[getProjectRoot] Could not find package.json upwards from ${__dirname}. Falling back to ${fallbackPath}`
			);
			return fallbackPath; // Adjust if your structure is different
		}
	} else {
		// In production, resourcesPath is the standard directory containing app assets
		// Type assertion for process to access resourcesPath
		const processAny = process as any;
		const resourcesPath =
			processAny.resourcesPath || path.dirname(app.getAppPath()); // process.resourcesPath is preferred
		console.log(
			`[getProjectRoot] Production mode, using resources path: ${resourcesPath}`
		);
		return resourcesPath;
	}
}

const projectRoot = getProjectRoot(); // Calculate once

// Call setupNativeLibraryPaths immediately to ensure DLL paths are set up early
const addonBuildDir = path.join(projectRoot, 'addons', 'build', 'Release');
setupNativeLibraryPaths(); // Call at the top level to ensure it runs before any require

function getAddonPaths(addonName: string): string[] {
	const isDevelopment = process.env.NODE_ENV === 'development';
	const pathsToSearch: string[] = [];

	// --- Primary Addon Location ---
	// In Dev: <projectRoot>/addons/build/Release/addon.node
	// In Prod: <resourcesPath>/addons/build/Release/addon.node (assuming copied during packaging)
	const primaryAddonDir = path.join(projectRoot, 'addons', 'build', 'Release');
	const primaryAddonPath = path.join(primaryAddonDir, `${addonName}.node`);
	pathsToSearch.push(primaryAddonPath);

	console.log(
		`[getAddonPaths] Primary search path for ${addonName}: ${primaryAddonPath}`
	);
	console.log(`[getAddonPaths] (Derived from projectRoot: ${projectRoot})`);

	// --- Optional: Fallback if packaging structure differs ---
	// if (!isDevelopment) {
	//     // Example: If addons are directly in resources root in production
	//     const altProdPath = path.join(projectRoot, `${addonName}.node`);
	//     if(altProdPath !== primaryAddonPath) pathsToSearch.push(altProdPath);
	// }

	return pathsToSearch;
}

function setupNativeLibraryPaths() {
	const isDevelopment = process.env.NODE_ENV === 'development';
	console.log(
		`[setupNativeLibraryPaths] Setting up paths. isDev: ${isDevelopment}`
	);

	// --- Determine Expected Paths ---
	// Directory where addons (.node files) and copied DLLs reside
	const addonBuildDir = path.join(projectRoot, 'addons', 'build', 'Release');
	// Source directories of the original DLLs (within external/libs)
	// ** IMPORTANT: Verify these paths match your OQS build output **
	const oqsSourceBinDir = path.join(
		projectRoot,
		'external',
		'libs',
		'oqs',
		'install',
		'bin'
	); // Use 'install/bin' as per copy-deps script
	const opensslSourceBinDir = path.join(
		projectRoot,
		'external',
		'libs',
		'openssl',
		'openssl-3.0',
		'x64',
		'bin'
	);
	const oqsSourceLibDir = path.join(
		projectRoot,
		'external',
		'libs',
		'oqs',
		'install',
		'lib'
	); // For Linux/macOS .so/.dylib
	const opensslSourceLibDir = path.join(
		projectRoot,
		'external',
		'libs',
		'openssl',
		'openssl-3.0',
		'x64',
		'lib'
	); // For Linux/macOS .so/.dylib

	console.log(`[setupNativeLibraryPaths] Addon Build Dir: ${addonBuildDir}`);
	console.log(
		`[setupNativeLibraryPaths] OQS Source Bin Dir: ${oqsSourceBinDir}`
	);
	console.log(
		`[setupNativeLibraryPaths] OpenSSL Source Bin Dir: ${opensslSourceBinDir}`
	);

	// Verify the DLLs are physically present in addonBuildDir
	const requiredDlls = ['oqs.dll', 'libcrypto-3-x64.dll'];
	let missingDlls = false;
	for (const dll of requiredDlls) {
		const dllPath = path.join(addonBuildDir, dll);
		if (fs.existsSync(dllPath)) {
			console.log(`[setupNativeLibraryPaths] Found DLL: ${dllPath}`);
		} else {
			console.error(`[setupNativeLibraryPaths] MISSING DLL: ${dllPath}`);
			missingDlls = true;
		}
	}

	if (missingDlls) {
		console.warn(
			`[setupNativeLibraryPaths] Some required DLLs are missing from ${addonBuildDir}`
		);
		console.warn(
			'[setupNativeLibraryPaths] Running copy-deps script to ensure DLLs are present...'
		);

		// Try to run the copy-deps script synchronously to ensure DLLs are copied
		try {
			const copyDepsPath = path.join(
				projectRoot,
				'scripts',
				'copy-native-deps.js'
			);
			if (fs.existsSync(copyDepsPath)) {
				const childProcess = require('child_process');
				childProcess.execSync(`node "${copyDepsPath}"`, {
					cwd: projectRoot,
					stdio: 'inherit', // show output
				});
				console.log(
					'[setupNativeLibraryPaths] Successfully ran copy-deps script'
				);
			} else {
				console.error(
					`[setupNativeLibraryPaths] copy-deps script not found at ${copyDepsPath}`
				);
			}
		} catch (err) {
			console.error(
				'[setupNativeLibraryPaths] Error running copy-deps script:',
				err
			);
		}
	}

	// --- Configure Environment Variables ---
	if (process.platform === 'win32') {
		// On Windows, PATH is crucial for finding DLLs.
		// Prepend the directory containing the addons AND the copied DLLs.
		// This ensures the loader finds the adjacent DLLs first.
		const currentPath = process.env.PATH || '';

		// Create a new PATH with addonBuildDir at the beginning, followed by the source dirs, then the original PATH
		// This maximizes the chance of finding the DLLs
		const newPath = [
			addonBuildDir, // Most important - should be found first
			oqsSourceBinDir,
			opensslSourceBinDir,
			currentPath,
		]
			.filter(Boolean)
			.join(path.delimiter);

		process.env.PATH = newPath;

		console.log(
			`[setupNativeLibraryPaths] Set PATH to prioritize addon build dir.`
		);
		console.log(`[setupNativeLibraryPaths] New PATH: ${process.env.PATH}`);

		// Special case for process.dlopen on Windows
		// Node.js v14+ has process.setDLLDirectory() but it's not commonly available
		// As a workaround, we rely heavily on the PATH environment variable
	} else if (process.platform === 'darwin') {
		// On macOS, DYLD_LIBRARY_PATH or rpath is used.
		// Setting DYLD_LIBRARY_PATH: Prepend addon dir, append source lib dirs.
		const currentDyldPath = process.env.DYLD_LIBRARY_PATH || '';
		process.env.DYLD_LIBRARY_PATH = [
			addonBuildDir,
			oqsSourceLibDir,
			opensslSourceLibDir,
			currentDyldPath,
		]
			.filter(Boolean)
			.join(path.delimiter); // Filter avoids empty strings if vars unset
		console.log(
			'[setupNativeLibraryPaths] Setting DYLD_LIBRARY_PATH:',
			process.env.DYLD_LIBRARY_PATH
		);
	} else {
		// Linux
		// On Linux, LD_LIBRARY_PATH or rpath is used.
		// Setting LD_LIBRARY_PATH: Prepend addon dir, append source lib dirs.
		const currentLdPath = process.env.LD_LIBRARY_PATH || '';
		process.env.LD_LIBRARY_PATH = [
			addonBuildDir,
			oqsSourceLibDir,
			opensslSourceLibDir,
			currentLdPath,
		]
			.filter(Boolean)
			.join(path.delimiter); // Filter avoids empty strings
		console.log(
			'[setupNativeLibraryPaths] Setting LD_LIBRARY_PATH:',
			process.env.LD_LIBRARY_PATH
		);
	}
	console.log('[setupNativeLibraryPaths] Path setup complete.');
}

function loadNativeAddon(addonName: string): any | null {
	const possiblePaths = getAddonPaths(addonName);
	let foundPath = '';
	let lastError: Error | null = null;

	console.log(`Searching for ${addonName} in:`, possiblePaths);

	// Verify the native addon (.node file) exists
	const addonExistsAtPath = (path: string): boolean => {
		if (fs.existsSync(path)) {
			console.log(`[loadNativeAddon] Found addon file: ${path}`);
			return true;
		}
		console.log(`[loadNativeAddon] Addon file NOT found: ${path}`);
		return false;
	};

	for (const addonPath of possiblePaths) {
		try {
			// 1. Check if the .node file itself exists
			if (addonExistsAtPath(addonPath)) {
				console.log(
					`[loadNativeAddon] Attempting to load module from '${addonPath}'...`
				);

				// 2. Use process.dlopen to load the addon directly instead of require
				// This bypasses webpack's module system which can interfere with native modules
				let addon: any;
				try {
					// First try with require - this might work for some configurations
					addon = require(addonPath);
					console.log(
						`[loadNativeAddon] Successfully loaded with require: ${addonPath}`
					);
				} catch (err: any) {
					// Cast the unknown error to any to access message property safely
					const reqError = err as Error;
					console.log(
						`[loadNativeAddon] require() failed, trying alternate methods (${reqError.message})`
					);

					// If require fails, we'll try alternate approaches
					// This needs to be carefully handled since we're using internal APIs
					try {
						// Attempt to use node-bindings if available
						try {
							// Try node-bindings package if available (dynamically)
							const bindings = require('bindings');
							addon = bindings(path.basename(addonPath, '.node'));
							console.log(
								`[loadNativeAddon] Successfully loaded using bindings: ${addonPath}`
							);
						} catch (bindingError) {
							// Bindings not available, try direct process.dlopen
							// as a last resort (but this is risky)

							// Note: process.dlopen is not in the TypeScript defs but is available at runtime
							// We need to use any type to bypass TypeScript's type checking
							const proc = process as any;
							if (typeof proc.dlopen === 'function') {
								let moduleObject = { exports: {} };
								proc.dlopen(moduleObject, addonPath);
								addon = moduleObject.exports;
								console.log(
									`[loadNativeAddon] Successfully loaded using process.dlopen: ${addonPath}`
								);
							} else {
								throw new Error('No available method to load native addon');
							}
						}
					} catch (dlopenError: any) {
						// All attempts failed
						throw new Error(
							`All module loading approaches failed: ${dlopenError.message}`
						);
					}
				}

				// 3. Validate exported functions
				let isValid = false;
				if (addonName === 'kyber_node_addon') {
					isValid =
						typeof addon.generateKeypair === 'function' &&
						typeof addon.encapsulate === 'function' &&
						typeof addon.decapsulate === 'function';
				} else if (addonName === 'dilithium_node_addon') {
					isValid =
						typeof addon.generateKeypair === 'function' &&
						typeof addon.sign === 'function' &&
						typeof addon.verify === 'function';
				}

				if (isValid) {
					console.log(
						`[loadNativeAddon] Successfully validated ${addonName} from ${addonPath}`
					);
					return addon; // Success!
				} else {
					foundPath = addonPath; // Mark as found but invalid
					const msg = `Loaded ${addonName} from ${addonPath}, but validation failed (missing expected functions). Exports: ${Object.keys(
						addon || {}
					)}`;
					console.warn(`[loadNativeAddon] ${msg}`);
					lastError = new Error(msg);
					// Don't continue searching if validation fails - the loaded module is wrong.
					break;
				}
			}
		} catch (error: any) {
			// This catch block handles errors during the `require(addonPath)` call
			// Most likely "Cannot find module" or dependency loading errors (DLL not found)
			console.warn(
				`[loadNativeAddon] Failed to load ${addonName} from ${addonPath}: ${error.message}`
			);
			console.warn(
				`[loadNativeAddon] Error code: ${error.code}, Error details: `,
				error
			);

			if (error.code === 'MODULE_NOT_FOUND') {
				console.warn(
					`[loadNativeAddon] Hint: If the file exists, this often means a required DLL dependency (like oqs.dll or libcrypto) was not found by the OS loader.`
				);
				console.warn(
					`[loadNativeAddon] Verify DLLs are present in ${path.dirname(
						addonPath
					)} and PATH/LD_LIBRARY_PATH/DYLD_LIBRARY_PATH includes necessary directories.`
				);

				// On Windows, let's check for the presence of our DLLs again
				if (process.platform === 'win32') {
					const addonDir = path.dirname(addonPath);
					const dllsToCheck = ['oqs.dll', 'libcrypto-3-x64.dll'];

					console.warn(
						'[loadNativeAddon] Checking for DLLs in addon directory...'
					);
					for (const dll of dllsToCheck) {
						const dllPath = path.join(addonDir, dll);
						console.warn(
							`[loadNativeAddon] ${dll} exists: ${fs.existsSync(dllPath)}`
						);
					}
				}
			}

			lastError = error;
			// If require fails for one path, continue searching other potential paths
			if (fs.existsSync(addonPath)) {
				foundPath = addonPath; // Mark as found but failed to load
			}
		}
	}

	// If loop completes without returning an addon
	if (foundPath) {
		// If we found the file but loading/validation failed
		console.error(
			`[loadNativeAddon] Found ${addonName} at ${foundPath} but failed to load or validate it. Last error: ${lastError?.message}`
		);
	} else {
		// If the file wasn't found in any searched path
		console.error(
			`[loadNativeAddon] Failed to find ${addonName} addon in any of the searched locations: ${possiblePaths.join(
				', '
			)}`
		);
		if (lastError) {
			console.error(
				'[loadNativeAddon] Last error during load attempts:',
				lastError
			);
		}
	}

	return null; // Return null if not found or loaded correctly
}

// --- Initialize Addons Once on Startup ---
// IMPORTANT: Path setup must happen before we try to load the native addons!

// Initialize DLL paths first, at the top level
// setupNativeLibraryPaths(); // Already called at the top level

// Try to load the addons - use the already declared variables
try {
	console.log('[IPC Init] Attempting to load Kyber encryption module...');
	kyberAddon = loadNativeAddon('kyber_node_addon');
	if (kyberAddon) {
		console.log('[IPC Init] Kyber encryption module loaded successfully.');
		// console.log('Available Kyber functions:', Object.keys(kyberAddon)); // Optional verbose
	} else {
		console.error('[IPC Init] Could not load Kyber encryption module.');
	}

	console.log('[IPC Init] Attempting to load Dilithium signature module...');
	dilithiumAddon = loadNativeAddon('dilithium_node_addon');
	if (dilithiumAddon) {
		console.log('[IPC Init] Dilithium signature module loaded successfully.');
		// console.log('Available Dilithium functions:', Object.keys(dilithiumAddon)); // Optional verbose
	} else {
		console.error('[IPC Init] Could not load Dilithium signature module.');
	}
} catch (error: any) {
	console.error('[IPC Init] Fatal error during addon initialization:', error);
	// Consider exiting or disabling features if addons are critical
}

// ==========================================================================
// IPC Handlers (No changes needed below this line from previous version)
// ==========================================================================

export function setupBenchmarkIPC() {
	// No changes needed here
	ipcMain.handle(
		'run-benchmark',
		async (event: IpcMainInvokeEvent, params: BenchmarkParams) => {
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
				throw new Error(
					`Benchmark failed: ${error?.message || 'Unknown error'}`
				);
			}
		}
	);

	ipcMain.handle(
		'stop-benchmark',
		async (_event: IpcMainInvokeEvent, benchmarkId: string) => {
			return benchmarkManager.stopBenchmark(benchmarkId);
		}
	);

	// New IPC handlers for benchmark data operations
	ipcMain.handle('get-all-benchmarks', async () => {
		return benchmarkStore.getAllBenchmarkResults();
	});

	ipcMain.handle(
		'get-benchmarks-by-algorithm',
		async (_event: IpcMainInvokeEvent, algorithm: string) => {
			return benchmarkStore.getBenchmarksByAlgorithm(algorithm);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-security-param',
		async (_event: IpcMainInvokeEvent, securityParam: string) => {
			return benchmarkStore.getBenchmarksBySecurityParam(securityParam);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-algorithm-and-param',
		async (
			_event: IpcMainInvokeEvent,
			algorithm: string,
			securityParam: string
		) => {
			return benchmarkStore.getBenchmarksByAlgorithmAndParam(
				algorithm,
				securityParam
			);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-date-range',
		async (_event: IpcMainInvokeEvent, startDate: string, endDate: string) => {
			return benchmarkStore.getBenchmarksByDateRange(
				new Date(startDate),
				new Date(endDate)
			);
		}
	);

	ipcMain.handle(
		'get-benchmarks-by-status',
		async (_event: IpcMainInvokeEvent, status: 'completed' | 'failed') => {
			return benchmarkStore.getBenchmarksByStatus(status);
		}
	);

	ipcMain.handle(
		'get-benchmark-by-id',
		async (_event: IpcMainInvokeEvent, id: string) => {
			return benchmarkStore.getBenchmarkById(id);
		}
	);

	ipcMain.handle(
		'delete-benchmark',
		async (_event: IpcMainInvokeEvent, id: string) => {
			return benchmarkStore.deleteBenchmark(id);
		}
	);

	ipcMain.handle('clear-all- benchmarks', async () => {
		benchmarkStore.clearAllBenchmarks();
		return true;
	});
}

// Setup Encryption/Signature IPC
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
			_event: IpcMainInvokeEvent,
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

	ipcMain.handle(
		'node-crypto-get-random-bytes',
		async (_event: IpcMainInvokeEvent, length: number) => {
			console.log(`[IPC] Handling 'node-crypto-get-random-bytes'`);
			try {
				const buf = await randomBytesAsync(length);
				return buf.toString('base64');
			} catch (error: any) {
				console.error('[IPC Error] node-crypto-get-random-bytes:', error);
				throw new Error(`randomBytes operation failed: ${error.message}`);
			}
		}
	);

	// --- Kyber Handlers ---
	const createKyberErrorHandler = (channel: string) => {
		return async (_event: IpcMainInvokeEvent, ...args: any[]) => {
			console.error(
				`[IPC Error] Attempted to call ${channel} but Kyber addon is not loaded.`
			);
			throw new Error(`Kyber addon is not loaded. Cannot execute ${channel}.`);
		};
	};

	ipcMain.handle(
		'kyber-generate-keypair',
		kyberAddon
			? async (_event: IpcMainInvokeEvent, securityLevel: string) => {
					console.log(
						`[IPC] Handling 'kyber-generate-keypair' (${securityLevel})`
					);
					try {
						if (!kyberAddon) throw new Error('Kyber addon became unavailable.'); // Re-check before use
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
			? async (
					_event: IpcMainInvokeEvent,
					securityLevel: string,
					publicKeyBase64: string
			  ) => {
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
					_event: IpcMainInvokeEvent,
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
						if (!sharedSecret || !Buffer.isBuffer(sharedSecret)) {
							console.error(
								'Kyber decapsulate did not return a Buffer. Type:',
								typeof sharedSecret
							);
							throw new Error(
								'Kyber decapsulate addon returned invalid result (expected Buffer)'
							);
						}
						return sharedSecret.toString('base64');
					} catch (error: any) {
						console.error('[IPC Error] kyber-decapsulate:', error);
						throw new Error(
							`Kyber decapsulate failed: ${
								error.message || 'Unknown native error'
							}`
						);
					}
			  }
			: createKyberErrorHandler('kyber-decapsulate')
	);

	ipcMain.removeHandler('kyber-encrypt');
	ipcMain.removeHandler('kyber-decrypt');

	// --- Dilithium Handlers ---
	const createDilithiumErrorHandler = (channel: string) => {
		return async (_event: IpcMainInvokeEvent, ...args: any[]) => {
			console.error(
				`[IPC Error] Attempted to call ${channel} but Dilithium addon is not loaded.`
			);
			throw new Error(
				`Dilithium addon is not loaded. Cannot execute ${channel}.`
			);
		};
	};

	ipcMain.handle(
		'dilithium-generate-keypair',
		dilithiumAddon
			? async (_event: IpcMainInvokeEvent, securityLevel: string) => {
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
					_event: IpcMainInvokeEvent,
					securityLevel: string,
					secretKeyBase64: string,
					messageInput: string | Buffer
			  ) => {
					console.log(`[IPC] Handling 'dilithium-sign' (${securityLevel})`);
					try {
						if (!dilithiumAddon)
							throw new Error('Dilithium addon became unavailable.');
						const secretKey = Buffer.from(secretKeyBase64, 'base64');
						const messageBuffer = Buffer.isBuffer(messageInput)
							? messageInput
							: Buffer.from(messageInput, 'utf8');

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
					_event: IpcMainInvokeEvent,
					securityLevel: string,
					publicKeyBase64: string,
					messageInput: string | Buffer,
					signatureBase64: string
			  ) => {
					console.log(`[IPC] Handling 'dilithium-verify' (${securityLevel})`);
					try {
						if (!dilithiumAddon)
							throw new Error('Dilithium addon became unavailable.');
						const publicKey = Buffer.from(publicKeyBase64, 'base64');
						const signature = Buffer.from(signatureBase64, 'base64');
						const messageBuffer = Buffer.isBuffer(messageInput)
							? messageInput
							: Buffer.from(messageInput, 'utf8');

						const isValid = dilithiumAddon.verify(
							securityLevel,
							publicKey,
							messageBuffer,
							signature
						);
						if (typeof isValid !== 'boolean') {
							console.error(
								'Verify addon returned non-boolean type:',
								typeof isValid
							);
							throw new Error(
								'Dilithium verify addon returned invalid result type (expected boolean)'
							);
						}
						return { isValid: isValid };
					} catch (error: any) {
						console.error(`[IPC Error] dilithium-verify:`, error);
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

// --- Quantum Workload Functions ---
/**
 * Runs the Shor's algorithm quantum workload using the Python script
 * @param {string} apiToken - IBM Quantum API token (required for hardware runs)
 * @param {number} shots - Number of shots to run
 * @param {boolean} runOnHardware - Whether to run on real quantum hardware
 * @param {string} plotTheme - Plot theme (light or dark)
 * @returns {Promise<Object>} Result object with status, output data, logs, and plot path
 */
async function runQuantumWorkload(
	apiToken: string,
	shots: number,
	runOnHardware: boolean,
	plotTheme: 'light' | 'dark'
): Promise<any> {
	console.log('[Quantum Workload] Starting quantum workload execution...');

	// Generate unique filenames for outputs using timestamp and random ID
	const timestamp = Date.now();
	const randomId = Math.random().toString(36).substring(2, 10);
	const userDataPath = app.getPath('userData');
	const outputPath = path.join(userDataPath, 'quantum_outputs');

	// Ensure the output directory exists
	if (!fs.existsSync(outputPath)) {
		fs.mkdirSync(outputPath, { recursive: true });
	}

	// Generate paths for output files
	const plotFilePath = path.join(
		outputPath,
		`plot_${timestamp}_${randomId}.png`
	);
	const jsonFilePath = path.join(
		outputPath,
		`result_${timestamp}_${randomId}.json`
	);

	// Determine the path to the Python script
	const isDevelopment = process.env.NODE_ENV === 'development';
	const projectRoot = getProjectRoot();

	// In development, use the script in the project directory
	// In production, the script should be in resources/quantum
	let scriptPath = '';
	if (isDevelopment) {
		scriptPath = path.join(projectRoot, 'quantum', 'shor_n15.py');
	} else {
		// In production, resources folder contains our extra resources
		const processAny = process as any;
		scriptPath = path.join(processAny.resourcesPath, 'quantum', 'shor_n15.py');
	}

	// Verify the script exists
	if (!fs.existsSync(scriptPath)) {
		console.error(
			`[Quantum Workload] ERROR: Script not found at ${scriptPath}`
		);
		return {
			status: 'error',
			error: `Python script not found at ${scriptPath}`,
			logs: [`ERROR: Python script not found at ${scriptPath}`],
		};
	}

	// Determine the Python executable path from virtual environment
	let pythonExecutable = 'python'; // Default fallback
	const venvPythonPath = path.join(
		projectRoot,
		'.venv',
		'Scripts',
		'python.exe'
	); // Windows path

	// Check if the venv Python executable exists and is accessible
	try {
		await access(venvPythonPath);
		pythonExecutable = venvPythonPath;
		console.log(
			`[Quantum Workload] Using Python from virtual environment: ${pythonExecutable}`
		);
	} catch (err) {
		console.warn(
			`[Quantum Workload] Virtual environment Python not found at ${venvPythonPath}, falling back to system Python`
		);
	}

	// Build command arguments
	const args = [
		'--api_token',
		apiToken,
		'--shots',
		shots.toString(),
		'--plot_file',
		plotFilePath,
		'--plot_theme',
		plotTheme,
		'--output_json',
		jsonFilePath,
	];

	// Add run_on_hardware flag if true
	if (runOnHardware) {
		args.push('--run_on_hardware');
	}

	// Store logs
	const logs: string[] = [];

	console.log(
		`[Quantum Workload] Executing Python script: ${pythonExecutable} ${scriptPath} ${args.join(
			' '
		)}`
	);

	// Execute the script using spawn to capture real-time output
	return new Promise((resolve, reject) => {
		// When using the full path to python.exe, we need to pass the script path as the first argument
		const pythonProcess = childProcess.spawn(pythonExecutable, [
			scriptPath,
			...args,
		]);

		// Capture stderr output for logs (script logs to stderr)
		pythonProcess.stderr.on('data', (data) => {
			const logLines = data.toString().split('\n').filter(Boolean);
			logs.push(...logLines);
			console.log(`[Quantum Workload Log] ${data.toString().trim()}`);
		});

		// Handle process completion
		pythonProcess.on('close', (code) => {
			console.log(`[Quantum Workload] Python process exited with code ${code}`);

			// Check if output JSON exists and is readable
			if (fs.existsSync(jsonFilePath)) {
				try {
					const resultData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

					// Check if plot file exists
					const plotExists = fs.existsSync(plotFilePath);
					if (!plotExists) {
						logs.push('WARNING: Plot file was not generated.');
					}

					// Return comprehensive result object
					resolve({
						status: code === 0 ? 'success' : 'error',
						exitCode: code,
						data: resultData,
						logs: logs,
						plotFilePath: plotExists ? plotFilePath : null,
						jsonFilePath: jsonFilePath,
					});
				} catch (err) {
					console.error('[Quantum Workload] Error parsing result JSON:', err);
					reject({
						status: 'error',
						error: 'Failed to parse result JSON',
						logs: logs,
						exitCode: code,
					});
				}
			} else {
				console.error('[Quantum Workload] Result JSON file not found');
				reject({
					status: 'error',
					error: 'Result file not generated',
					logs: logs,
					exitCode: code,
				});
			}
		});

		// Handle process errors
		pythonProcess.on('error', (err) => {
			console.error('[Quantum Workload] Failed to start Python process:', err);
			reject({
				status: 'error',
				error: `Failed to start Python process: ${err.message}`,
				logs: logs,
			});
		});
	});
}

/**
 * Runs Grover's search algorithm quantum workload using the Python script
 * @param {string} apiToken - IBM Quantum API token (required for hardware runs)
 * @param {string} markedStates - Comma-separated list of binary strings to mark
 * @param {number} shots - Number of shots to run
 * @param {boolean} runOnHardware - Whether to run on real quantum hardware
 * @param {string} plotTheme - Plot theme (light or dark)
 * @returns {Promise<Object>} Result object with status, output data, logs, and plot path
 */
async function runGroverSearch(
	apiToken: string,
	markedStates: string,
	shots: number,
	runOnHardware: boolean,
	plotTheme: 'light' | 'dark'
): Promise<any> {
	console.log('[Grover Search] Starting Grover search execution...');

	// Generate unique filenames for outputs using timestamp and random ID
	const timestamp = Date.now();
	const randomId = Math.random().toString(36).substring(2, 10);
	const userDataPath = app.getPath('userData');
	const outputPath = path.join(userDataPath, 'quantum_outputs');

	// Ensure the output directory exists
	if (!fs.existsSync(outputPath)) {
		fs.mkdirSync(outputPath, { recursive: true });
	}

	// Generate paths for output files
	const plotFilePath = path.join(
		outputPath,
		`grover_plot_${timestamp}_${randomId}.png`
	);
	const jsonFilePath = path.join(
		outputPath,
		`grover_result_${timestamp}_${randomId}.json`
	);

	// Determine the path to the Python script
	const isDevelopment = process.env.NODE_ENV === 'development';
	const projectRoot = getProjectRoot();

	// In development, use the script in the project directory
	// In production, the script should be in resources/quantum
	let scriptPath = '';
	if (isDevelopment) {
		scriptPath = path.join(projectRoot, 'quantum', 'grover_search.py');
	} else {
		// In production, resources folder contains our extra resources
		const processAny = process as any;
		scriptPath = path.join(
			processAny.resourcesPath,
			'quantum',
			'grover_search.py'
		);
	}

	// Verify the script exists
	if (!fs.existsSync(scriptPath)) {
		console.error(`[Grover Search] ERROR: Script not found at ${scriptPath}`);
		return {
			status: 'error',
			error: `Python script not found at ${scriptPath}`,
			logs: [`ERROR: Python script not found at ${scriptPath}`],
		};
	}

	// Determine the Python executable path from virtual environment
	let pythonExecutable = 'python'; // Default fallback
	const venvPythonPath = path.join(
		projectRoot,
		'.venv',
		'Scripts',
		'python.exe'
	); // Windows path

	// Check if the venv Python executable exists and is accessible
	try {
		await access(venvPythonPath);
		pythonExecutable = venvPythonPath;
		console.log(
			`[Grover Search] Using Python from virtual environment: ${pythonExecutable}`
		);
	} catch (err) {
		console.warn(
			`[Grover Search] Virtual environment Python not found at ${venvPythonPath}, falling back to system Python`
		);
	}

	// Build command arguments
	const args = [
		'--api_token',
		apiToken,
		'--marked_states',
		markedStates,
		'--shots',
		shots.toString(),
		'--plot_file',
		plotFilePath,
		'--plot_theme',
		plotTheme,
		'--output_json',
		jsonFilePath,
	];

	// Add run_on_hardware flag if true
	if (runOnHardware) {
		args.push('--run_on_hardware');
	}

	// Store logs
	const logs: string[] = [];

	console.log(
		`[Grover Search] Executing Python script: ${pythonExecutable} ${scriptPath} ${args.join(
			' '
		)}`
	);

	// Execute the script using spawn to capture real-time output
	return new Promise((resolve, reject) => {
		// When using the full path to python.exe, we need to pass the script path as the first argument
		const pythonProcess = childProcess.spawn(pythonExecutable, [
			scriptPath,
			...args,
		]);

		// Capture stderr output for logs (script logs to stderr)
		pythonProcess.stderr.on('data', (data) => {
			const logLines = data.toString().split('\n').filter(Boolean);
			logs.push(...logLines);
			console.log(`[Grover Search Log] ${data.toString().trim()}`);
		});

		// Handle process completion
		pythonProcess.on('close', (code) => {
			console.log(`[Grover Search] Python process exited with code ${code}`);

			// Check if output JSON exists and is readable
			if (fs.existsSync(jsonFilePath)) {
				try {
					const resultData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

					// Check if plot file exists
					const plotExists = fs.existsSync(plotFilePath);
					if (!plotExists) {
						logs.push('WARNING: Plot file was not generated.');
					}

					// Return comprehensive result object
					resolve({
						status: code === 0 ? 'success' : 'error',
						exitCode: code,
						data: resultData,
						logs: logs,
						plotFilePath: plotExists ? plotFilePath : null,
						jsonFilePath: jsonFilePath,
					});
				} catch (err) {
					console.error('[Grover Search] Error parsing result JSON:', err);
					reject({
						status: 'error',
						error: 'Failed to parse result JSON',
						logs: logs,
						exitCode: code,
					});
				}
			} else {
				console.error('[Grover Search] Result JSON file not found');
				reject({
					status: 'error',
					error: 'Result file not generated',
					logs: logs,
					exitCode: code,
				});
			}
		});

		// Handle process errors
		pythonProcess.on('error', (err) => {
			console.error('[Grover Search] Failed to start Python process:', err);
			reject({
				status: 'error',
				error: `Failed to start Python process: ${err.message}`,
				logs: logs,
			});
		});
	});
}

// --- Quantum API Token Storage ---
/**
 * Saves the IBM Quantum API token securely using Electron's safeStorage
 * @param apiToken The API token to encrypt and save
 * @returns Success status
 */
async function saveQuantumApiToken(apiToken: string): Promise<boolean> {
	try {
		// First, encrypt the token using Electron's safeStorage
		const encryptedToken = safeStorage.encryptString(apiToken);

		// Save to a file in the app's user data directory
		const tokenFilePath = path.join(
			app.getPath('userData'),
			'quantum_api_token.enc'
		);
		fs.writeFileSync(tokenFilePath, encryptedToken);

		console.log('[Quantum API] Token saved successfully');
		return true;
	} catch (error: any) {
		console.error('[Quantum API] Error saving token:', error);
		return false;
	}
}

/**
 * Loads the encrypted IBM Quantum API token from storage and decrypts it
 * @returns The decrypted API token, or null if not found or error
 */
async function loadQuantumApiToken(): Promise<string | null> {
	try {
		const tokenFilePath = path.join(
			app.getPath('userData'),
			'quantum_api_token.enc'
		);

		// Check if token file exists
		if (!fs.existsSync(tokenFilePath)) {
			console.log('[Quantum API] No saved token found');
			return null;
		}

		// Read and decrypt the token
		const encryptedToken = fs.readFileSync(tokenFilePath);
		const decryptedToken = safeStorage.decryptString(encryptedToken);

		console.log('[Quantum API] Token loaded successfully');
		return decryptedToken;
	} catch (error: any) {
		console.error('[Quantum API] Error loading token:', error);
		return null;
	}
}

/**
 * Deletes the stored API token
 * @returns Success status
 */
async function deleteQuantumApiToken(): Promise<boolean> {
	try {
		const tokenFilePath = path.join(
			app.getPath('userData'),
			'quantum_api_token.enc'
		);

		// Check if token file exists
		if (!fs.existsSync(tokenFilePath)) {
			console.log('[Quantum API] No token to delete');
			return true;
		}

		// Delete the token file
		fs.unlinkSync(tokenFilePath);
		console.log('[Quantum API] Token deleted successfully');
		return true;
	} catch (error: any) {
		console.error('[Quantum API] Error deleting token:', error);
		return false;
	}
}

// Setup Quantum Workload IPC Handlers
export function setupQuantumWorkloadIPC() {
	console.log('[IPC] Setting up Quantum Workload IPC handlers...');

	// Add handlers for API token storage
	ipcMain.handle(
		'save-quantum-api-token',
		async (_event: IpcMainInvokeEvent, apiToken: string) => {
			return saveQuantumApiToken(apiToken);
		}
	);

	ipcMain.handle('load-quantum-api-token', async () => {
		return loadQuantumApiToken();
	});

	ipcMain.handle('delete-quantum-api-token', async () => {
		return deleteQuantumApiToken();
	});

	// Existing handlers
	ipcMain.handle(
		'run-quantum-workload',
		async (
			_event: IpcMainInvokeEvent,
			apiToken: string,
			shots: number,
			runOnHardware: boolean,
			plotTheme: 'light' | 'dark'
		) => {
			try {
				// Create a run record in the database
				const runId = await lowdbService.createRun(
					'Quantum_Shor',
					'Shor',
					'N=15', // Fixed for now
					shots
				);

				// Update run status to running
				await lowdbService.updateRunStatus(runId, 'running');

				// Run the quantum workload
				const result = await runQuantumWorkload(
					apiToken,
					shots,
					runOnHardware,
					plotTheme
				);

				if (result.status === 'success') {
					// Store the result in the database
					await lowdbService.insertQuantumResult(runId, result);

					// Update run status to completed
					await lowdbService.updateRunStatus(runId, 'completed');
				} else {
					// Update run status to failed
					await lowdbService.updateRunStatus(
						runId,
						'failed',
						result.error || 'Unknown error during quantum workload execution'
					);
				}

				return result;
			} catch (error: any) {
				console.error('[IPC Error] run-quantum-workload:', error);
				return {
					status: 'error',
					error:
						error.message || 'Unknown error during quantum workload execution',
					logs: error.logs || [],
				};
			}
		}
	);

	// Add handler for Grover's search algorithm
	ipcMain.handle(
		'run-grover-search',
		async (
			_event: IpcMainInvokeEvent,
			apiToken: string,
			markedStates: string,
			shots: number,
			runOnHardware: boolean,
			plotTheme: 'light' | 'dark'
		) => {
			try {
				// Create a run record in the database
				const runId = await lowdbService.createRun(
					'Quantum_Grover',
					'Grover',
					markedStates, // Use markedStates as securityParam
					shots
				);

				// Update run status to running
				await lowdbService.updateRunStatus(runId, 'running');

				// Run the Grover search
				const result = await runGroverSearch(
					apiToken,
					markedStates,
					shots,
					runOnHardware,
					plotTheme
				);

				if (result.status === 'success') {
					// Store the result in the database
					await lowdbService.insertQuantumResult(runId, result);

					// Update run status to completed
					await lowdbService.updateRunStatus(runId, 'completed');
				} else {
					// Update run status to failed
					await lowdbService.updateRunStatus(
						runId,
						'failed',
						result.error || 'Unknown error during Grover search execution'
					);
				}

				return result;
			} catch (error: any) {
				console.error('[IPC Error] run-grover-search:', error);
				return {
					status: 'error',
					error:
						error.message || 'Unknown error during Grover search execution',
					logs: error.logs || [],
				};
			}
		}
	);

	ipcMain.handle(
		'get-quantum-plot',
		async (_event: IpcMainInvokeEvent, plotFilePath: string) => {
			try {
				if (fs.existsSync(plotFilePath)) {
					// Read the file as a base64 string
					const plotData = fs.readFileSync(plotFilePath);
					return {
						status: 'success',
						plotBase64: plotData.toString('base64'),
					};
				} else {
					return {
						status: 'error',
						error: 'Plot file not found',
					};
				}
			} catch (error: any) {
				console.error('[IPC Error] get-quantum-plot:', error);
				return {
					status: 'error',
					error: error.message || 'Unknown error when retrieving plot',
				};
			}
		}
	);

	console.log('[IPC] Quantum Workload IPC handlers registration complete.');
}

// Setup Database IPC handlers
export function setupDatabaseIPC() {
	console.log('[IPC] Setting up Database IPC handlers...');

	// Import the lowdbService here to avoid circular dependencies
	const { lowdbService } = require('./db/lowdbService');

	// Run-related handlers
	ipcMain.handle(
		'db:create-run',
		async (
			_event: IpcMainInvokeEvent,
			runType: string,
			algorithm?: string,
			securityParam?: string,
			iterations?: number,
			notes?: string
		) => {
			try {
				return await lowdbService.createRun(
					runType,
					algorithm,
					securityParam,
					iterations,
					notes
				);
			} catch (error: any) {
				console.error('[IPC Error] db:create-run:', error);
				throw new Error(`Failed to create run: ${error.message}`);
			}
		}
	);

	ipcMain.handle(
		'db:update-run-status',
		async (
			_event: IpcMainInvokeEvent,
			runId: string,
			status: string,
			error?: string
		) => {
			try {
				return await lowdbService.updateRunStatus(runId, status, error);
			} catch (error: any) {
				console.error('[IPC Error] db:update-run-status:', error);
				throw new Error(`Failed to update run status: ${error.message}`);
			}
		}
	);

	ipcMain.handle('db:get-all-runs', async () => {
		try {
			return await lowdbService.getAllRuns();
		} catch (error: any) {
			console.error('[IPC Error] db:get-all-runs:', error);
			throw new Error(`Failed to get all runs: ${error.message}`);
		}
	});

	ipcMain.handle(
		'db:get-runs-by-type',
		async (_event: IpcMainInvokeEvent, runType: string) => {
			try {
				return await lowdbService.getRunsByType(runType);
			} catch (error: any) {
				console.error('[IPC Error] db:get-runs-by-type:', error);
				throw new Error(`Failed to get runs by type: ${error.message}`);
			}
		}
	);

	ipcMain.handle(
		'db:get-runs-by-status',
		async (_event: IpcMainInvokeEvent, status: string) => {
			try {
				return await lowdbService.getRunsByStatus(status);
			} catch (error: any) {
				console.error('[IPC Error] db:get-runs-by-status:', error);
				throw new Error(`Failed to get runs by status: ${error.message}`);
			}
		}
	);

	ipcMain.handle(
		'db:get-runs-by-algorithm',
		async (_event: IpcMainInvokeEvent, algorithm: string) => {
			try {
				return await lowdbService.getRunsByAlgorithm(algorithm);
			} catch (error: any) {
				console.error('[IPC Error] db:get-runs-by-algorithm:', error);
				throw new Error(`Failed to get runs by algorithm: ${error.message}`);
			}
		}
	);

	ipcMain.handle(
		'db:get-run-details',
		async (_event: IpcMainInvokeEvent, runId: string) => {
			try {
				return await lowdbService.getFullRunDetails(runId);
			} catch (error: any) {
				console.error('[IPC Error] db:get-run-details:', error);
				throw new Error(`Failed to get run details: ${error.message}`);
			}
		}
	);

	// Result-related handlers
	ipcMain.handle(
		'db:insert-quantum-result',
		async (_event: IpcMainInvokeEvent, runId: string, resultData: any) => {
			try {
				return await lowdbService.insertQuantumResult(runId, resultData);
			} catch (error: any) {
				console.error('[IPC Error] db:insert-quantum-result:', error);
				throw new Error(`Failed to insert quantum result: ${error.message}`);
			}
		}
	);

	ipcMain.handle(
		'db:insert-pqc-classical-result',
		async (_event: IpcMainInvokeEvent, runId: string, benchmarkData: any) => {
			try {
				return await lowdbService.insertPqcClassicalResult(
					runId,
					benchmarkData
				);
			} catch (error: any) {
				console.error('[IPC Error] db:insert-pqc-classical-result:', error);
				throw new Error(
					`Failed to insert PQC/Classical result: ${error.message}`
				);
			}
		}
	);

	ipcMain.handle('db:get-all-quantum-results', async () => {
		try {
			return await lowdbService.getAllQuantumResults();
		} catch (error: any) {
			console.error('[IPC Error] db:get-all-quantum-results:', error);
			throw new Error(`Failed to get all quantum results: ${error.message}`);
		}
	});

	ipcMain.handle('db:get-all-pqc-classical-details', async () => {
		try {
			return await lowdbService.getAllPqcClassicalDetails();
		} catch (error: any) {
			console.error('[IPC Error] db:get-all-pqc-classical-details:', error);
			throw new Error(
				`Failed to get all PQC/Classical details: ${error.message}`
			);
		}
	});

	ipcMain.handle(
		'db:get-pqc-classical-by-algorithm',
		async (_event: IpcMainInvokeEvent, algorithm: string) => {
			try {
				return await lowdbService.getPqcClassicalDetailsByAlgorithm(algorithm);
			} catch (error: any) {
				console.error('[IPC Error] db:get-pqc-classical-by-algorithm:', error);
				throw new Error(
					`Failed to get PQC/Classical details by algorithm: ${error.message}`
				);
			}
		}
	);

	// Delete operations
	ipcMain.handle(
		'db:delete-run',
		async (_event: IpcMainInvokeEvent, runId: string) => {
			try {
				return await lowdbService.deleteRun(runId);
			} catch (error: any) {
				console.error('[IPC Error] db:delete-run:', error);
				throw new Error(`Failed to delete run: ${error.message}`);
			}
		}
	);

	ipcMain.handle('db:clear-all-data', async () => {
		try {
			await lowdbService.clearAllData();
			return true;
		} catch (error: any) {
			console.error('[IPC Error] db:clear-all-data:', error);
			throw new Error(`Failed to clear all data: ${error.message}`);
		}
	});

	console.log('[IPC] Database IPC handlers registration complete.');
}
