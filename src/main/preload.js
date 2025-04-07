const { contextBridge, ipcRenderer } = require('electron');
// No longer need path, fs, or direct crypto require here if HKDF/randomBytes are called via IPC
// const crypto = require('crypto');
// const path = require('path');
// const fs = require('fs');

console.log('[preload] Initializing...');

// --- REMOVE Addon Loading Logic from Preload ---
// Addons should be loaded reliably in the main process (ipc.ts)

// --- Expose APIs via contextBridge ---

contextBridge.exposeInMainWorld('electronAPI', {
	// --- Kyber KEM Functions (using IPC) ---
	kyber: {
		generateKeypair: (secLevel) => {
			console.log('[preload] invoking kyber-generate-keypair', secLevel);
			return ipcRenderer.invoke('kyber-generate-keypair', secLevel);
			// Add .then/.catch here for preload-specific logging if needed
		},
		// IMPORTANT: Use the IPC channel names that will correspond to
		// the *new* encapsulate/decapsulate addon functions later.
		// We will need corresponding handlers in ipc.ts for these.
		encapsulate: (secLevel, pubKey) => {
			console.log('[preload] invoking kyber-encapsulate', secLevel);
			// Convert pubKey to Base64 for IPC
			const pubKeyBase64 = Buffer.isBuffer(pubKey)
				? pubKey.toString('base64')
				: Buffer.from(pubKey).toString('base64');
			return ipcRenderer.invoke(
				'kyber-encapsulate', // NEW IPC channel name
				secLevel,
				pubKeyBase64
			);
		},
		decapsulate: (secLevel, secKey, kemCiphertext) => {
			console.log('[preload] invoking kyber-decapsulate', secLevel);
			// Convert Buffers to Base64 for IPC
			const secKeyBase64 = Buffer.isBuffer(secKey)
				? secKey.toString('base64')
				: Buffer.from(secKey).toString('base64');
			const kemCiphertextBase64 = Buffer.isBuffer(kemCiphertext)
				? kemCiphertext.toString('base64')
				: Buffer.from(kemCiphertext).toString('base64');
			return ipcRenderer.invoke(
				'kyber-decapsulate', // NEW IPC channel name
				secLevel,
				secKeyBase64,
				kemCiphertextBase64
			);
		},
	},

	// --- Dilithium Signature Functions (using IPC) ---
	dilithium: {
		generateKeypair: (secLevel) => {
			console.log('[preload] invoking dilithium-generate-keypair', secLevel);
			return ipcRenderer.invoke('dilithium-generate-keypair', secLevel);
		},
		sign: (secLevel, secKey, message) => {
			console.log('[preload] invoking dilithium-sign', secLevel);
			// Convert Buffer args to Base64/UTF8 for IPC
			const secKeyBase64 = Buffer.isBuffer(secKey)
				? secKey.toString('base64')
				: Buffer.from(secKey).toString('base64');
			// Assume message can be string or buffer, send as string
			const messageString = Buffer.isBuffer(message)
				? message.toString('utf8')
				: String(message);
			return ipcRenderer.invoke(
				'dilithium-sign',
				secLevel,
				secKeyBase64,
				messageString
			);
		},
		verify: (secLevel, pubKey, message, signature) => {
			console.log('[preload] invoking dilithium-verify', secLevel);
			// Convert Buffer args to Base64/UTF8 for IPC
			const pubKeyBase64 = Buffer.isBuffer(pubKey)
				? pubKey.toString('base64')
				: Buffer.from(pubKey).toString('base64');
			const messageString = Buffer.isBuffer(message)
				? message.toString('utf8')
				: String(message);
			const signatureBase64 = Buffer.isBuffer(signature)
				? signature.toString('base64')
				: Buffer.from(signature).toString('base64');
			return ipcRenderer.invoke(
				'dilithium-verify',
				secLevel,
				pubKeyBase64,
				messageString,
				signatureBase64
			);
		},
	},

	// --- Node.js Crypto Utilities (using IPC) ---
	// We need corresponding handlers in ipc.ts for these too
	nodeCrypto: {
		hkdf: (ikm, length, salt, info) => {
			console.log('[preload] invoking node-crypto-hkdf');
			// Convert Buffers to Base64/UTF8 for IPC
			const ikmBase64 = Buffer.isBuffer(ikm)
				? ikm.toString('base64')
				: Buffer.from(ikm).toString('base64');
			const saltBase64 = salt
				? Buffer.isBuffer(salt)
					? salt.toString('base64')
					: Buffer.from(salt).toString('base64')
				: undefined; // Handle optional salt
			const infoString = info
				? Buffer.isBuffer(info)
					? info.toString('utf8') // Info often treated as string
					: String(info)
				: undefined; // Handle optional info
			return ipcRenderer.invoke(
				'node-crypto-hkdf', // NEW IPC channel name
				ikmBase64,
				length,
				saltBase64,
				infoString
			);
		},
		getRandomBytes: (length) => {
			console.log('[preload] invoking node-crypto-get-random-bytes', length);
			return ipcRenderer.invoke(
				'node-crypto-get-random-bytes', // NEW IPC channel name
				length
			);
		},
	},

	// --- Utilities (can stay if simple pure JS) ---
	utils: {
		bufferToString: (buf, enc) => buf.toString(enc),
		stringToBuffer: (str, enc) => Buffer.from(str, enc),
	},
});

// --- Keep existing generic IPC exposure ---
contextBridge.exposeInMainWorld('electron', {
	ipcRenderer: {
		invoke: ipcRenderer.invoke, // Direct passthrough
		on: (channel, func) => {
			const subscription = (event, ...args) => func(...args);
			ipcRenderer.on(channel, subscription);
			return () => ipcRenderer.removeListener(channel, subscription); // Return unsubscriber
		},
		once: (channel, func) => {
			ipcRenderer.once(channel, (event, ...args) => func(...args));
		},
		removeListener: ipcRenderer.removeListener, // Direct passthrough
		removeAllListeners: ipcRenderer.removeAllListeners, // Direct passthrough
	},
});

// --- Keep existing process version exposure ---
contextBridge.exposeInMainWorld('process', {
	versions: process.versions,
});

console.log('[preload] Context bridge APIs exposed using IPC.');

// --- Add Quantum Workload API ---
contextBridge.exposeInMainWorld('quantumAPI', {
	runQuantumWorkload: (apiToken, shots, runOnHardware, plotTheme) => {
		console.log('[preload] invoking run-quantum-workload');
		return ipcRenderer.invoke(
			'run-quantum-workload',
			apiToken,
			shots,
			runOnHardware,
			plotTheme
		);
	},
	runGroverSearch: (
		apiToken,
		markedStates,
		shots,
		runOnHardware,
		plotTheme
	) => {
		console.log('[preload] invoking run-grover-search');
		return ipcRenderer.invoke(
			'run-grover-search',
			apiToken,
			markedStates,
			shots,
			runOnHardware,
			plotTheme
		);
	},
	getQuantumPlot: (plotFilePath) => {
		console.log('[preload] invoking get-quantum-plot');
		return ipcRenderer.invoke('get-quantum-plot', plotFilePath);
	},
	// Token management
	saveApiToken: (apiToken) => {
		console.log('[preload] invoking save-quantum-api-token');
		return ipcRenderer.invoke('save-quantum-api-token', apiToken);
	},
	loadApiToken: () => {
		console.log('[preload] invoking load-quantum-api-token');
		return ipcRenderer.invoke('load-quantum-api-token');
	},
	deleteApiToken: () => {
		console.log('[preload] invoking delete-quantum-api-token');
		return ipcRenderer.invoke('delete-quantum-api-token');
	},
	// Allow subscribing to log events (like progress updates)
	onLogUpdate: (callback) => {
		const subscription = (_event, ...args) => callback(...args);
		ipcRenderer.on('quantum-log-update', subscription);
		return () => ipcRenderer.removeListener('quantum-log-update', subscription);
	},
});

// --- Add Database API ---
contextBridge.exposeInMainWorld('databaseAPI', {
	// Run-related functions
	createRun: (runType, algorithm, securityParam, iterations, notes) => {
		console.log('[preload] invoking db:create-run');
		return ipcRenderer.invoke(
			'db:create-run',
			runType,
			algorithm,
			securityParam,
			iterations,
			notes
		);
	},
	updateRunStatus: (runId, status, error) => {
		console.log('[preload] invoking db:update-run-status');
		return ipcRenderer.invoke('db:update-run-status', runId, status, error);
	},
	getAllRuns: () => {
		console.log('[preload] invoking db:get-all-runs');
		return ipcRenderer.invoke('db:get-all-runs');
	},
	getRunsByType: (runType) => {
		console.log('[preload] invoking db:get-runs-by-type');
		return ipcRenderer.invoke('db:get-runs-by-type', runType);
	},
	getRunsByStatus: (status) => {
		console.log('[preload] invoking db:get-runs-by-status');
		return ipcRenderer.invoke('db:get-runs-by-status', status);
	},
	getRunsByAlgorithm: (algorithm) => {
		console.log('[preload] invoking db:get-runs-by-algorithm');
		return ipcRenderer.invoke('db:get-runs-by-algorithm', algorithm);
	},
	getRunDetails: (runId) => {
		console.log('[preload] invoking db:get-run-details');
		return ipcRenderer.invoke('db:get-run-details', runId);
	},

	// Result-related functions
	insertQuantumResult: (runId, resultData) => {
		console.log('[preload] invoking db:insert-quantum-result');
		return ipcRenderer.invoke('db:insert-quantum-result', runId, resultData);
	},
	insertPqcClassicalResult: (runId, benchmarkData) => {
		console.log('[preload] invoking db:insert-pqc-classical-result');
		return ipcRenderer.invoke(
			'db:insert-pqc-classical-result',
			runId,
			benchmarkData
		);
	},
	getAllQuantumResults: () => {
		console.log('[preload] invoking db:get-all-quantum-results');
		return ipcRenderer.invoke('db:get-all-quantum-results');
	},
	getAllPqcClassicalDetails: () => {
		console.log('[preload] invoking db:get-all-pqc-classical-details');
		return ipcRenderer.invoke('db:get-all-pqc-classical-details');
	},
	getPqcClassicalByAlgorithm: (algorithm) => {
		console.log('[preload] invoking db:get-pqc-classical-by-algorithm');
		return ipcRenderer.invoke('db:get-pqc-classical-by-algorithm', algorithm);
	},

	// Delete operations
	deleteRun: (runId) => {
		console.log('[preload] invoking db:delete-run');
		return ipcRenderer.invoke('db:delete-run', runId);
	},
	clearAllData: () => {
		console.log('[preload] invoking db:clear-all-data');
		return ipcRenderer.invoke('db:clear-all-data');
	},
});

// --- Add Job Scheduler API ---
contextBridge.exposeInMainWorld('jobSchedulerAPI', {
	// Job scheduling functions
	scheduleJob: (jobDefinition) => {
		console.log('[preload] invoking schedule-job');
		return ipcRenderer.invoke('schedule-job', jobDefinition);
	},
	getJobQueue: () => {
		console.log('[preload] invoking get-job-queue');
		return ipcRenderer.invoke('get-job-queue');
	},
	cancelJob: (jobId) => {
		console.log('[preload] invoking cancel-job');
		return ipcRenderer.invoke('cancel-job', jobId);
	},
	removeJob: (jobId) => {
		console.log('[preload] invoking remove-job');
		return ipcRenderer.invoke('remove-job', jobId);
	},
	// Allow subscribing to job queue updates
	onJobQueueUpdate: (callback) => {
		const subscription = (_event, ...args) => callback(...args);
		ipcRenderer.on('job-queue-update', subscription);
		return () => ipcRenderer.removeListener('job-queue-update', subscription);
	},
});
