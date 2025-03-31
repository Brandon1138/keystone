// src/renderer/types/renderer.d.ts
import { BenchmarkProgressData } from '../../main/benchmarkManager';

// --- Define structures for the OBJECTS returned by IPC for keygen/sign ---
// These contain Base64 strings and sizes
interface KeypairIPCResult {
	publicKey: string; // Base64
	secretKey: string; // Base64
	publicKeySize: number;
	secretKeySize: number;
}

interface SignIPCResult {
	signature: string; // Base64
	signatureSize: number;
}

interface VerifyIPCResult {
	isValid: boolean;
}

// --- Define structures for the OBJECTS returned by IPC for KEM ---
interface EncapsulateIPCResult {
	kemCiphertext: string; // Base64
	sharedSecret: string; // Base64
}

// --- Define the specific Crypto API exposed via preload ---
// *** Return types updated to match IPC handler outputs ***
export interface ICryptoAPI {
	kyber: {
		generateKeypair: (
			secLevel: '512' | '768' | '1024'
		) => Promise<KeypairIPCResult>; // Returns object with base64 keys
		encapsulate: (
			secLevel: '512' | '768' | '1024',
			pubKey: Buffer | Uint8Array
		) => Promise<EncapsulateIPCResult>; // Returns object with base64 ct/ss
		decapsulate: (
			secLevel: '512' | '768' | '1024',
			secKey: Buffer | Uint8Array,
			kemCiphertext: Buffer | Uint8Array
		) => Promise<string>; // Returns base64 sharedSecret directly
	};
	dilithium: {
		generateKeypair: (secLevel: '2' | '3' | '5') => Promise<KeypairIPCResult>; // Returns object with base64 keys
		sign: (
			secLevel: '2' | '3' | '5',
			secKey: Buffer | Uint8Array,
			message: Buffer | Uint8Array | string
		) => Promise<SignIPCResult>; // Returns object with base64 signature
		verify: (
			secLevel: '2' | '3' | '5',
			pubKey: Buffer | Uint8Array,
			message: Buffer | Uint8Array | string,
			signature: Buffer | Uint8Array
		) => Promise<VerifyIPCResult>; // Returns object with boolean
	};
	nodeCrypto: {
		hkdf: (
			ikm: Buffer | Uint8Array,
			length: number,
			salt?: Buffer | Uint8Array,
			info?: Buffer | Uint8Array | string
		) => Promise<string>; // Returns base64 derived key
		getRandomBytes: (length: number) => Promise<string>; // Returns base64 random bytes
	};
	utils: {
		bufferToString: (buf: Buffer, enc: BufferEncoding) => string;
		stringToBuffer: (str: string, enc: BufferEncoding) => Buffer;
	};
}

// --- Define the generic Electron IPC methods ---
export interface IIpcRenderer {
	invoke(channel: string, ...args: any[]): Promise<any>;
	on(channel: string, listener: (...args: any[]) => void): () => void;
	once(channel: string, listener: (...args: any[]) => void): void;
	removeListener(channel: string, listener: (...args: any[]) => void): void;
	removeAllListeners(channel: string): void;
}

// --- Augment the global Window interface ---
declare global {
	interface Window {
		electronAPI: ICryptoAPI;
		electron: {
			ipcRenderer: IIpcRenderer;
		};
		process: {
			versions: {
				chrome: string;
				node: string;
				electron: string;
			};
		};
	}
}

export {};
