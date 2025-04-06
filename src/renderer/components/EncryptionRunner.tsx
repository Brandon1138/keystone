import React, { useState, useEffect, useCallback } from 'react';
import {
	Button,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	TextField,
	SelectChangeEvent,
	CircularProgress,
	Typography,
	Box,
	Alert,
	Snackbar,
	Tooltip,
	IconButton,
	InputAdornment,
	Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Card } from './ui/card';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import InfoIcon from '@mui/icons-material/Info';
import CreateIcon from '@mui/icons-material/Create';
import VerifiedIcon from '@mui/icons-material/Verified';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { SECURITY_PARAMS } from '../../types/benchmark';

// Define valid security levels explicitly
type KyberSecLevel = '512' | '768' | '1024';
type DilithiumSecLevel = '2' | '3' | '5';

// --- Interface for Stored Keys ---
interface CryptoKeys {
	senderDilithiumSk: Uint8Array | null; // ML-DSA Secret Key (Signer)
	senderDilithiumPk: Uint8Array | null; // ML-DSA Public Key (Signer)
	receiverKyberSk: Uint8Array | null; // ML-KEM Secret Key (Receiver)
	receiverKyberPk: Uint8Array | null; // ML-KEM Public Key (Receiver)
}

// --- Interface for Encrypted Package ---
// Structure to hold the output of encryption/signing
interface EncryptedPackage {
	kemCiphertext: Uint8Array | null;
	iv: Uint8Array | null;
	aesCiphertextWithTag: Uint8Array | null;
	signature: Uint8Array | null;
	salt: Uint8Array | null;
	kemLevel: KyberSecLevel;
	sigLevel: DilithiumSecLevel;
}

export const EncryptionRunner: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// State for selected levels
	const [kemLevel, setKemLevel] = useState<KyberSecLevel>('512');
	const [sigLevel, setSigLevel] = useState<DilithiumSecLevel>('2');

	// State for keys (store raw Buffers)
	const [keys, setKeys] = useState<CryptoKeys>({
		senderDilithiumSk: null,
		senderDilithiumPk: null,
		receiverKyberSk: null,
		receiverKyberPk: null,
	});
	const [showSenderSk, setShowSenderSk] = useState(false);
	const [showReceiverSk, setShowReceiverSk] = useState(false);

	// State for message input
	const [plaintext, setPlaintext] = useState<string>('');

	// State for encrypted package (store raw Buffers)
	const [encryptedPackage, setEncryptedPackage] =
		useState<EncryptedPackage | null>(null);

	// State for decrypted output
	const [decryptedPlaintext, setDecryptedPlaintext] = useState<string>('');
	const [verificationStatus, setVerificationStatus] = useState<
		'idle' | 'valid' | 'invalid'
	>('idle');

	// Loading states
	const [isLoadingKeys, setIsLoadingKeys] = useState(false);
	const [isLoadingEncrypt, setIsLoadingEncrypt] = useState(false);
	const [isLoadingDecrypt, setIsLoadingDecrypt] = useState(false);

	// UI Feedback
	const [statusMessage, setStatusMessage] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

	// --- Helper Functions ---
	const clearStatus = () => {
		setStatusMessage('');
		setErrorMessage('');
	};

	const handleError = (message: string, error?: any) => {
		console.error(message, error);
		const errMsg = error instanceof Error ? error.message : String(error);
		setErrorMessage(`${message}: ${errMsg || 'Unknown error'}`);
		setStatusMessage(''); // Clear success message if error occurs
	};

	const handleSuccess = (message: string) => {
		setStatusMessage(message);
		setErrorMessage('');
	};

	const bufferToBase64 = (buf: Uint8Array | null): string => {
		if (!buf) return '';
		// Convert Uint8Array to base64 string
		let binary = '';
		const bytes = new Uint8Array(buf);
		const len = bytes.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return window.btoa(binary);
	};

	const base64ToBuffer = (str: string | null | undefined): Uint8Array => {
		if (!str) return new Uint8Array(0);
		// Convert base64 string to Uint8Array
		const binary = window.atob(str);
		const len = binary.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	};

	const formatBytes = (bytes: number | undefined): string => {
		if (bytes === undefined || bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	const copyToClipboard = (text: string | null, description: string) => {
		if (!text) return;
		navigator.clipboard.writeText(text).then(
			() => {
				setCopyFeedback(`${description} copied!`);
				setTimeout(() => setCopyFeedback(null), 2000);
			},
			(err) => {
				console.error('Copy failed: ', err);
				setCopyFeedback(`Failed to copy ${description}`);
				setTimeout(() => setCopyFeedback(null), 2000);
			}
		);
	};

	// --- Core Crypto Logic ---

	const generateAllKeys = useCallback(async () => {
		setIsLoadingKeys(true);
		clearStatus();
		setKeys({
			senderDilithiumSk: null,
			senderDilithiumPk: null,
			receiverKyberSk: null,
			receiverKyberPk: null,
		}); // Clear previous keys

		try {
			// Generate Dilithium keypair (Sender) - IPC returns { publicKey: Base64, secretKey: Base64 }
			const dilithiumResult =
				await window.electronAPI.dilithium.generateKeypair(sigLevel);
			// Generate Kyber keypair (Receiver) - IPC returns { publicKey: Base64, secretKey: Base64 }
			const kyberResult = await window.electronAPI.kyber.generateKeypair(
				kemLevel
			);

			try {
				// Decode Base64 strings to Uint8Arrays for state storage
				setKeys({
					senderDilithiumSk: base64ToBuffer(dilithiumResult.secretKey),
					senderDilithiumPk: base64ToBuffer(dilithiumResult.publicKey),
					receiverKyberSk: base64ToBuffer(kyberResult.secretKey),
					receiverKyberPk: base64ToBuffer(kyberResult.publicKey),
				});
				handleSuccess('Sender (ML-DSA) and Receiver (ML-KEM) keys generated.');
			} catch (bufferError) {
				console.error('Error during base64 conversion:', bufferError);
				handleError(
					'Error processing keys',
					'Failed to convert key data. If this persists, please report the issue.'
				);
			}
		} catch (error: any) {
			handleError('Key generation failed', error);
		} finally {
			setIsLoadingKeys(false);
		}
	}, [kemLevel, sigLevel]);

	const encryptAndSign = useCallback(async () => {
		if (!keys.receiverKyberPk || !keys.senderDilithiumSk || !plaintext) {
			handleError(
				'Missing keys or plaintext for encryption.',
				'Ensure keys are generated and plaintext is entered.'
			);
			return;
		}

		setIsLoadingEncrypt(true);
		clearStatus();
		setEncryptedPackage(null); // Clear previous result

		try {
			// 1. KEM Encapsulation (IPC returns { kemCiphertext: Base64, sharedSecret: Base64 })
			setStatusMessage('Step 1/5: Running ML-KEM Encapsulation...');
			// Pass receiver PK buffer directly to preload, which handles conversion for IPC
			const encapsResult = await window.electronAPI.kyber.encapsulate(
				kemLevel,
				keys.receiverKyberPk! // Pass Uint8Array
			);
			// Decode Base64 results from IPC immediately
			const kemCiphertext = base64ToBuffer(encapsResult.kemCiphertext);
			const sharedSecret = base64ToBuffer(encapsResult.sharedSecret); // Buffer for HKDF

			if (!kemCiphertext.length || !sharedSecret.length)
				// Check decoded buffers have length
				throw new Error('KEM encapsulation failed to return expected data.');
			console.log('KEM Shared Secret Size:', sharedSecret.length);

			// 2. Derive AES Key using HKDF (IPC returns derivedKey: Base64)
			setStatusMessage('Step 2/5: Deriving AES-256 key (HKDF-SHA256)...');
			// Generate random salt (IPC returns salt: Base64)
			const saltBase64 = await window.electronAPI.nodeCrypto.getRandomBytes(16);
			const salt = base64ToBuffer(saltBase64); // Decode salt Uint8Array for storage
			const info = 'hybrid-aes-256-gcm-key'; // Info can be string for IPC

			// Pass Uint8Arrays directly to preload wrapper, info as string
			const derivedKeyBase64 = await window.electronAPI.nodeCrypto.hkdf(
				sharedSecret, // Pass Uint8Array
				32,
				salt, // Pass Uint8Array
				info
			);
			// Decode derived key Uint8Array for Web Crypto use
			const derivedKey = base64ToBuffer(derivedKeyBase64);
			if (!derivedKey.length) throw new Error('AES Key derivation failed.'); // Check decoded buffer
			console.log('Derived AES Key Size:', derivedKey.length);

			// 3. AES-GCM Encryption (Uses Web Crypto API directly - needs Uint8Arrays)
			setStatusMessage('Step 3/5: Encrypting plaintext (AES-256-GCM)...');
			const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
			const ivBuffer = iv; // Already a Uint8Array
			const plaintextBuffer = new TextEncoder().encode(plaintext);

			// Use the decoded derivedKey Uint8Array
			const aesKey = await window.crypto.subtle.importKey(
				'raw',
				derivedKey,
				{ name: 'AES-GCM' },
				true, // extractable = true
				['encrypt']
			);

			const encryptedArrayBuffer = await window.crypto.subtle.encrypt(
				{ name: 'AES-GCM', iv: iv }, // Pass IV here
				aesKey,
				plaintextBuffer
			);
			const aesCiphertextWithTag = new Uint8Array(encryptedArrayBuffer);
			console.log(
				'AES Ciphertext Size (incl. tag):',
				aesCiphertextWithTag.length
			);

			// 4. Prepare Data for Signing
			setStatusMessage('Step 4/5: Preparing data for signing...');
			// Sign KEM Ciphertext || IV || AES Ciphertext (including Tag)
			// Concatenate Uint8Arrays
			const dataToSign = new Uint8Array(
				kemCiphertext.length + ivBuffer.length + aesCiphertextWithTag.length
			);
			dataToSign.set(kemCiphertext, 0);
			dataToSign.set(ivBuffer, kemCiphertext.length);
			dataToSign.set(
				aesCiphertextWithTag,
				kemCiphertext.length + ivBuffer.length
			);
			console.log('Data to Sign Size:', dataToSign.length);

			// 5. ML-DSA Signing (IPC returns { signature: Base64 })
			setStatusMessage('Step 5/5: Signing package (ML-DSA)...');
			// Pass Uint8Arrays directly to preload wrapper
			const signResult = await window.electronAPI.dilithium.sign(
				sigLevel,
				keys.senderDilithiumSk!, // Pass Uint8Array
				dataToSign // Pass Uint8Array
			);
			// Decode signature Uint8Array for storage
			const signature = base64ToBuffer(signResult.signature);
			if (!signature.length)
				throw new Error('Signing failed to return signature.'); // Check decoded buffer
			console.log('Signature Size:', signature.length);

			// Store the complete package (with Uint8Arrays, including salt)
			setEncryptedPackage({
				kemCiphertext, // Stored as Uint8Array
				iv: ivBuffer, // Stored as Uint8Array
				aesCiphertextWithTag, // Stored as Uint8Array
				signature, // Stored as Uint8Array
				salt: salt, // <<< Store the salt Uint8Array used for HKDF
				kemLevel, // Store levels used
				sigLevel,
			});

			handleSuccess('Encryption and signing successful!');
		} catch (error) {
			handleError('Encryption/Signing process failed', error);
			setEncryptedPackage(null); // Clear package on error
		} finally {
			setIsLoadingEncrypt(false);
		}
	}, [keys, plaintext, kemLevel, sigLevel, base64ToBuffer]); // Added base64ToBuffer dependency

	const decryptAndVerify = useCallback(async () => {
		if (!encryptedPackage || !keys.receiverKyberSk || !keys.senderDilithiumPk) {
			handleError(
				'Missing encrypted data or keys for decryption.',
				'Ensure message is encrypted and keys are available.'
			);
			return;
		}

		setIsLoadingDecrypt(true);
		clearStatus();
		setDecryptedPlaintext('');
		setVerificationStatus('idle');

		const {
			kemCiphertext, // Uint8Array
			iv, // Uint8Array
			aesCiphertextWithTag, // Uint8Array
			signature, // Uint8Array
			salt, // *** Retrieve the salt Uint8Array from the package ***
			kemLevel: pkgKemLevel, // Use levels from package
			sigLevel: pkgSigLevel,
		} = encryptedPackage; // No need for assertion due to check above

		// Basic check including salt
		if (
			!kemCiphertext?.length ||
			!iv?.length ||
			!aesCiphertextWithTag?.length ||
			!signature?.length ||
			!salt?.length
		) {
			setIsLoadingDecrypt(false);
			handleError(
				'Encrypted package is incomplete (missing components or salt).'
			);
			return;
		}

		try {
			// 1. Prepare Data for Verification
			setStatusMessage('Step 1/5: Preparing data for verification...');
			// Reconstruct data using the stored Uint8Arrays
			const dataToVerify = new Uint8Array(
				kemCiphertext.length + iv.length + aesCiphertextWithTag.length
			);
			dataToVerify.set(kemCiphertext, 0);
			dataToVerify.set(iv, kemCiphertext.length);
			dataToVerify.set(aesCiphertextWithTag, kemCiphertext.length + iv.length);

			// 2. Verify Signature (IPC returns { isValid: boolean })
			setStatusMessage('Step 2/5: Verifying signature (ML-DSA)...');
			// Pass Uint8Arrays directly to preload wrapper
			const verifyResult = await window.electronAPI.dilithium.verify(
				pkgSigLevel,
				keys.senderDilithiumPk!, // Pass Uint8Array
				dataToVerify, // Pass Uint8Array
				signature // Pass Uint8Array
			);
			const isValid = verifyResult.isValid; // Directly get boolean

			setVerificationStatus(isValid ? 'valid' : 'invalid');
			if (!isValid) {
				throw new Error('Signature verification failed!');
			}
			setStatusMessage('Step 2/5: Signature VALID.');

			// 3. KEM Decapsulation (IPC returns ss: Base64)
			setStatusMessage('Step 3/5: Running ML-KEM Decapsulation...');
			// Pass Uint8Arrays directly to preload wrapper
			const sharedSecretBase64 = await window.electronAPI.kyber.decapsulate(
				pkgKemLevel,
				keys.receiverKyberSk!, // Pass Uint8Array
				kemCiphertext // Pass Uint8Array
			);
			// Decode shared secret Uint8Array for HKDF use
			const sharedSecret = base64ToBuffer(sharedSecretBase64);
			if (!sharedSecret.length) throw new Error('KEM decapsulation failed.'); // Check decoded buffer

			// 4. Derive AES Key (IPC returns derivedKey: Base64)
			setStatusMessage('Step 4/5: Deriving AES-256 key (HKDF-SHA256)...');
			const info = 'hybrid-aes-256-gcm-key'; // Must match info used in encryption
			// Pass Uint8Arrays directly to preload wrapper, use retrieved salt Uint8Array
			const derivedKeyBase64 = await window.electronAPI.nodeCrypto.hkdf(
				sharedSecret, // Pass Uint8Array
				32,
				salt, // <<< Use the salt Uint8Array retrieved from the package
				info
			);
			// Decode derived key Uint8Array for Web Crypto use
			const derivedKey = base64ToBuffer(derivedKeyBase64);
			if (!derivedKey.length) throw new Error('AES key derivation failed.'); // Check decoded buffer

			// 5. AES-GCM Decryption (Uses Web Crypto API directly)
			setStatusMessage('Step 5/5: Decrypting ciphertext (AES-256-GCM)...');
			// Use the decoded derivedKey Uint8Array
			const aesKey = await window.crypto.subtle.importKey(
				'raw',
				derivedKey,
				{ name: 'AES-GCM' },
				true, // extractable = true
				['decrypt']
			);

			// The decrypt function will throw if the tag verification fails
			const decryptedArrayBuffer = await window.crypto.subtle.decrypt(
				{ name: 'AES-GCM', iv: iv }, // Pass IV Uint8Array
				aesKey,
				aesCiphertextWithTag // Pass ciphertext WITH tag Uint8Array
			);

			const finalPlaintext = new TextDecoder().decode(decryptedArrayBuffer);
			setDecryptedPlaintext(finalPlaintext);
			handleSuccess('Decryption and verification successful!');
		} catch (error) {
			// Error could be from signature verification OR AES decryption (tag mismatch)
			handleError('Decryption/Verification process failed', error);
			setDecryptedPlaintext(''); // Clear plaintext on error
			// Keep verification status if it was already set to invalid
			if (verificationStatus === 'idle') {
				setVerificationStatus('invalid'); // Mark as invalid if decryption failed
			}
		} finally {
			setIsLoadingDecrypt(false);
		}
	}, [encryptedPackage, keys, verificationStatus, base64ToBuffer]); // Added verificationStatus and base64ToBuffer to dependencies

	return (
		<div className="space-y-5">
			{/* Status/Error Display */}
			{errorMessage && (
				<Alert severity="error" onClose={() => setErrorMessage('')}>
					{errorMessage}
				</Alert>
			)}
			{statusMessage && !errorMessage && (
				<Alert severity="info" onClose={() => setStatusMessage('')}>
					{statusMessage}
				</Alert>
			)}

			{/* Copy Feedback Snackbar */}
			<Snackbar
				open={copyFeedback !== null}
				autoHideDuration={2000}
				onClose={() => setCopyFeedback(null)}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				message={copyFeedback || ''}
			/>

			{/* Configuration Card */}
			<Card
				className={`p-6 rounded-xl shadow-md ${
					isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
				}`}
			>
				<div className="flex items-center mb-4">
					<EnhancedEncryptionIcon
						style={{ color: '#9747FF' }}
						className="mr-3"
					/>
					<h2
						className="text-[20px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Run Encryption Demo
					</h2>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Generate keys, encrypt a message using ML-KEM (Kyber) for key exchange
					and AES-256-GCM for bulk encryption, sign the result using ML-DSA
					(Dilithium), then verify and decrypt.
				</p>
				<Grid container spacing={3} alignItems="center">
					<Grid item xs={12} sm={4}>
						<FormControl fullWidth>
							<InputLabel id="kem-level-label">ML-KEM Level</InputLabel>
							<Select
								labelId="kem-level-label"
								value={kemLevel}
								label="ML-KEM Level"
								onChange={(e) => setKemLevel(e.target.value as KyberSecLevel)}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: 'transparent',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								}}
							>
								<MenuItem value="512">512 (Level 1)</MenuItem>
								<MenuItem value="768">768 (Level 3)</MenuItem>
								<MenuItem value="1024">1024 (Level 5)</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} sm={4}>
						<FormControl fullWidth>
							<InputLabel id="sig-level-label">ML-DSA Level</InputLabel>
							<Select
								labelId="sig-level-label"
								value={sigLevel}
								label="ML-DSA Level"
								onChange={(e) =>
									setSigLevel(e.target.value as DilithiumSecLevel)
								}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: 'transparent',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: isDarkMode
											? 'rgba(255, 255, 255, 0.6)'
											: 'rgba(0, 0, 0, 0.5)',
										borderWidth: '1px',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#9747FF',
										borderWidth: '1px',
									},
								}}
							>
								<MenuItem value="2">2 (Level 2)</MenuItem>
								<MenuItem value="3">3 (Level 3)</MenuItem>
								<MenuItem value="5">5 (Level 5)</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} sm={4}>
						<Button
							variant="contained"
							fullWidth
							onClick={generateAllKeys}
							disabled={isLoadingKeys}
							startIcon={<VpnKeyIcon />}
							sx={{
								bgcolor: '#9747FF',
								'&:hover': { bgcolor: '#8030E0' },
								textTransform: 'uppercase',
								fontWeight: 'bold',
								padding: '10px 24px',
								fontSize: '0.9rem',
								borderRadius: '8px',
							}}
						>
							{isLoadingKeys ? (
								<CircularProgress size={24} color="inherit" />
							) : (
								'Generate All Keys'
							)}
						</Button>
					</Grid>
				</Grid>
			</Card>

			{/* Key Display Area */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				{/* Sender Keys */}
				<Card
					className={`p-6 rounded-xl shadow-md ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					}`}
				>
					<Typography
						variant="h6"
						gutterBottom
						className="mb-4"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Sender Keys
					</Typography>
					{renderKeyField(
						'Public Key (ML-KEM Encrypt)',
						keys.receiverKyberPk,
						false, // Not secret
						() => {},
						false // Not toggleable
					)}
					{renderKeyField(
						'Public Key (ML-DSA Sign)',
						keys.senderDilithiumPk,
						false, // Not secret
						() => {},
						false // Not toggleable
					)}
				</Card>

				{/* Receiver Keys */}
				<Card
					className={`p-6 rounded-xl shadow-md ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					}`}
				>
					<Typography
						variant="h6"
						gutterBottom
						className="mb-4"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Receiver Keys
					</Typography>
					{renderKeyField(
						'Secret Key (ML-KEM Decrypt)',
						keys.receiverKyberSk,
						showReceiverSk,
						() => setShowReceiverSk(!showReceiverSk),
						true // Toggleable
					)}
					{renderKeyField(
						'Secret Key (ML-DSA Verify)',
						keys.senderDilithiumSk,
						showSenderSk,
						() => setShowSenderSk(!showSenderSk),
						true // Toggleable
					)}
				</Card>
			</div>

			{/* Main Action Area */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				{/* Encrypt & Sign */}
				<Card
					className={`p-6 rounded-xl shadow-md ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					} h-full flex flex-col`}
				>
					<Typography
						variant="h6"
						gutterBottom
						className="mb-4"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						1. Encrypt & Sign Message
					</Typography>
					<TextField
						label="Plaintext Message"
						multiline
						rows={4}
						fullWidth
						value={plaintext}
						onChange={(e) => setPlaintext(e.target.value)}
						disabled={isLoadingEncrypt || isLoadingDecrypt}
						sx={{
							mb: 3,
							backgroundColor: 'transparent',
							'& .MuiOutlinedInput-root': {
								borderRadius: '12px',
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								overflow: 'hidden',
							},
							'& .MuiInputBase-input': {
								color: isDarkMode ? '#ffffff' : '#111111',
							},
							'& .MuiOutlinedInput-notchedOutline': {
								borderColor: 'transparent',
							},
							'&:hover .MuiOutlinedInput-notchedOutline': {
								borderColor: isDarkMode
									? 'rgba(255, 255, 255, 0.6)'
									: 'rgba(0, 0, 0, 0.5)',
								borderWidth: '1px',
							},
							'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
								borderColor: '#9747FF',
								borderWidth: '1px',
							},
							'& .MuiInputLabel-root': {
								color: isDarkMode
									? 'rgba(255, 255, 255, 0.7)'
									: 'rgba(0, 0, 0, 0.6)',
							},
						}}
					/>
					<Button
						variant="contained"
						fullWidth
						onClick={encryptAndSign}
						disabled={
							isLoadingEncrypt ||
							isLoadingKeys ||
							!keys.receiverKyberPk ||
							!keys.senderDilithiumSk ||
							!plaintext
						}
						startIcon={<LockIcon />}
						sx={{
							bgcolor: '#5a67d8', // Indigo-like color
							'&:hover': { bgcolor: '#4c51bf' },
							textTransform: 'uppercase',
							fontWeight: 'bold',
							padding: '10px 24px',
							fontSize: '0.9rem',
							borderRadius: '8px',
							mt: 'auto', // Push button to bottom
						}}
					>
						{isLoadingEncrypt ? (
							<CircularProgress size={24} color="inherit" />
						) : (
							'Encrypt & Sign'
						)}
					</Button>
					{encryptedPackage && !isLoadingEncrypt && (
						<Box mt={3}>
							<Typography
								variant="body2"
								gutterBottom
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								Encrypted Package Details:
							</Typography>
							{renderResultField(
								'KEM Ciphertext',
								encryptedPackage.kemCiphertext
							)}
							{renderResultField('AES IV', encryptedPackage.iv)}
							{renderResultField(
								'AES Ciphertext + Tag',
								encryptedPackage.aesCiphertextWithTag
							)}
							{renderResultField(
								'ML-DSA Signature',
								encryptedPackage.signature
							)}
						</Box>
					)}
				</Card>

				{/* Decrypt & Verify */}
				<Card
					className={`p-6 rounded-xl shadow-md ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					} h-full flex flex-col`}
				>
					<Typography
						variant="h6"
						gutterBottom
						className="mb-4"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						2. Decrypt & Verify Package
					</Typography>
					<Button
						variant="contained"
						fullWidth
						onClick={decryptAndVerify}
						disabled={
							isLoadingDecrypt ||
							isLoadingKeys ||
							!keys.senderDilithiumPk ||
							!keys.receiverKyberSk ||
							!encryptedPackage
						}
						startIcon={<LockOpenIcon />}
						sx={{
							bgcolor: '#38a169', // Green-like color
							'&:hover': { bgcolor: '#2f855a' },
							textTransform: 'uppercase',
							fontWeight: 'bold',
							padding: '10px 24px',
							fontSize: '0.9rem',
							borderRadius: '8px',
							mb: 3, // Margin bottom before results
						}}
					>
						{isLoadingDecrypt ? (
							<CircularProgress size={24} color="inherit" />
						) : (
							'Decrypt & Verify'
						)}
					</Button>

					{/* Verification Status */}
					{verificationStatus !== 'idle' && (
						<Alert
							severity={verificationStatus === 'valid' ? 'success' : 'error'}
							icon={
								verificationStatus === 'valid' ? (
									<CheckCircleIcon fontSize="inherit" />
								) : (
									<ErrorIcon fontSize="inherit" />
								)
							}
							sx={{ mb: 3 }}
						>
							Signature Verification:{' '}
							{verificationStatus === 'valid' ? 'Valid' : 'INVALID'}
						</Alert>
					)}

					{/* Decrypted Result */}
					<TextField
						label="Decrypted Plaintext"
						multiline
						rows={4}
						fullWidth
						value={decryptedPlaintext}
						InputProps={{
							readOnly: true,
						}}
						sx={{
							backgroundColor: 'transparent',
							'& .MuiOutlinedInput-root': {
								borderRadius: '12px',
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								overflow: 'hidden',
							},
							'& .MuiInputBase-input': {
								color:
									verificationStatus === 'invalid' && !isLoadingDecrypt
										? theme.palette.error.main // Show error color if invalid
										: isDarkMode
										? '#ffffff'
										: '#000000',
							},
							'& .MuiOutlinedInput-notchedOutline': {
								borderColor: 'transparent',
							},
							'&:hover .MuiOutlinedInput-notchedOutline': {
								borderColor: isDarkMode
									? 'rgba(255, 255, 255, 0.6)'
									: 'rgba(0, 0, 0, 0.5)',
								borderWidth: '1px',
							},
							'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
								borderColor: '#9747FF',
								borderWidth: '1px',
							},
							'& .MuiInputLabel-root': {
								color: isDarkMode
									? 'rgba(255, 255, 255, 0.7)'
									: 'rgba(0, 0, 0, 0.6)',
							},
						}}
					/>
					{decryptedPlaintext && verificationStatus === 'valid' && (
						<Button
							size="small"
							variant="outlined"
							startIcon={<ContentCopyIcon />}
							onClick={() =>
								copyToClipboard(decryptedPlaintext, 'Decrypted plaintext')
							}
							sx={{
								alignSelf: 'flex-end',
								mt: 3,
								textTransform: 'uppercase',
								backgroundColor: isDarkMode
									? 'rgba(255, 255, 255, 0.08)'
									: 'rgba(0, 0, 0, 0.04)',
								color: isDarkMode
									? 'rgba(255, 255, 255, 0.85)'
									: 'rgba(0, 0, 0, 0.75)',
								borderColor: isDarkMode
									? 'rgba(255, 255, 255, 0.23)'
									: 'rgba(0, 0, 0, 0.23)',
								fontSize: '0.8rem',
								'&:hover': {
									backgroundColor: isDarkMode
										? 'rgba(255, 255, 255, 0.12)'
										: 'rgba(0, 0, 0, 0.08)',
									borderColor: isDarkMode
										? 'rgba(255, 255, 255, 0.3)'
										: 'rgba(0, 0, 0, 0.3)',
								},
							}}
						>
							Copy Decrypted Text
						</Button>
					)}
				</Card>
			</div>
		</div>
	);

	// Helper component to render Key fields consistently
	function renderKeyField(
		label: string,
		keyBuffer: Uint8Array | null,
		isSecretVisible: boolean,
		toggleVisibility: () => void,
		isToggleable: boolean
	) {
		const keyBase64 = bufferToBase64(keyBuffer);
		const displayValue = keyBase64
			? isToggleable && !isSecretVisible
				? '•'.repeat(Math.min(keyBase64.length, 60))
				: keyBase64
			: 'N/A';

		return (
			<div className="mb-2">
				<Typography
					variant="body2"
					color="textSecondary"
					gutterBottom
					style={{
						color: isDarkMode
							? 'rgba(255, 255, 255, 0.7)'
							: 'rgba(0, 0, 0, 0.7)',
					}}
				>
					{label}{' '}
					{keyBuffer && (
						<Tooltip title={`Size: ${formatBytes(keyBuffer.length)}`}>
							<InfoIcon style={{ fontSize: '14px', verticalAlign: 'middle' }} />
						</Tooltip>
					)}
				</Typography>
				<TextField
					fullWidth
					variant="outlined"
					size="small"
					value={displayValue}
					InputProps={{
						readOnly: true,
						style: {
							fontFamily: 'monospace',
							fontSize: '0.75rem',
							color: isDarkMode ? '#ccc' : '#333',
						},
						endAdornment: keyBuffer && (
							<InputAdornment position="end">
								{isToggleable && (
									<IconButton
										onClick={toggleVisibility}
										edge="end"
										size="small"
									>
										{isSecretVisible ? (
											<VisibilityOffIcon fontSize="small" />
										) : (
											<VisibilityIcon fontSize="small" />
										)}
									</IconButton>
								)}
								<IconButton
									onClick={() => copyToClipboard(keyBase64, label)}
									edge="end"
									size="small"
								>
									<ContentCopyIcon fontSize="small" />
								</IconButton>
							</InputAdornment>
						),
					}}
					sx={{
						'& .MuiOutlinedInput-root': {
							borderRadius: '8px',
							backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
							overflow: 'hidden',
						},
						'& .MuiOutlinedInput-notchedOutline': {
							borderColor: 'transparent',
						},
						'&:hover .MuiOutlinedInput-notchedOutline': {
							borderColor: isDarkMode
								? 'rgba(255, 255, 255, 0.6)'
								: 'rgba(0, 0, 0, 0.5)',
							borderWidth: '1px',
						},
						'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
							borderColor: '#9747FF',
							borderWidth: '1px',
						},
					}}
				/>
			</div>
		);
	}

	// Helper component to render result fields (like ciphertext, signature, salt)
	function renderResultField(label: string, dataBuffer: Uint8Array | null) {
		const dataBase64 = bufferToBase64(dataBuffer);
		return (
			<div className="mb-2">
				<Typography
					variant="caption"
					color="textSecondary"
					gutterBottom
					style={{
						color: isDarkMode
							? 'rgba(255, 255, 255, 0.7)'
							: 'rgba(0, 0, 0, 0.7)',
					}}
				>
					{label} ({formatBytes(dataBuffer?.length)})
				</Typography>
				<TextField
					fullWidth
					variant="outlined"
					size="small"
					multiline
					maxRows={3} // Limit height
					value={dataBase64 || 'N/A'}
					InputProps={{
						readOnly: true,
						style: {
							fontFamily: 'monospace',
							fontSize: '0.70rem', // Smaller font for dense data
							color: isDarkMode ? '#ccc' : '#333',
						},
						endAdornment: dataBuffer && (
							<InputAdornment position="end">
								<IconButton
									onClick={() => copyToClipboard(dataBase64, label)}
									edge="end"
									size="small"
									sx={{ alignSelf: 'flex-start' }} // Align top right
								>
									<ContentCopyIcon fontSize="small" />
								</IconButton>
							</InputAdornment>
						),
					}}
					sx={{
						'& .MuiOutlinedInput-root': {
							borderRadius: '8px',
							backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
							overflow: 'hidden',
						},
						'& .MuiOutlinedInput-notchedOutline': {
							borderColor: 'transparent',
						},
						'&:hover .MuiOutlinedInput-notchedOutline': {
							borderColor: isDarkMode
								? 'rgba(255, 255, 255, 0.6)'
								: 'rgba(0, 0, 0, 0.5)',
							borderWidth: '1px',
						},
						'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
							borderColor: '#9747FF',
							borderWidth: '1px',
						},
					}}
				/>
			</div>
		);
	}
};

export default EncryptionRunner;
