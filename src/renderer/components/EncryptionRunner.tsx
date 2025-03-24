import React, { useState, useEffect } from 'react';
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
import { SUPPORTED_ALGORITHMS, SECURITY_PARAMS } from '../../types/benchmark';
import { getAlgorithmInfo } from '../utils/algorithm-categories';

// Define interfaces for our encryption/signature operations
interface KeypairResult {
	publicKey: string;
	secretKey: string;
	publicKeySize: number;
	secretKeySize: number;
}

interface EncryptResult {
	ciphertext: string;
	ciphertextSize: number;
}

interface DecryptResult {
	plaintext: string;
}

interface SignResult {
	signature: string;
	signatureSize: number;
}

interface VerifyResult {
	isValid: boolean;
}

export const EncryptionRunner: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Algorithm and parameter state
	const initialAlgorithm = 'kyber';
	const [selectedAlgorithm, setSelectedAlgorithm] =
		useState<string>(initialAlgorithm);
	const [selectedParam, setSelectedParam] = useState<string>(
		SECURITY_PARAMS[initialAlgorithm][0]
	);

	// Loading states
	const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
	const [isEncryptingSigning, setIsEncryptingSigning] = useState(false);
	const [isDecryptingVerifying, setIsDecryptingVerifying] = useState(false);

	// Error handling
	const [error, setError] = useState<string | null>(null);
	const [showError, setShowError] = useState(false);

	// Key generation state
	const [publicKey, setPublicKey] = useState<string>('');
	const [secretKey, setSecretKey] = useState<string>('');
	const [publicKeySize, setPublicKeySize] = useState<number>(0);
	const [secretKeySize, setSecretKeySize] = useState<number>(0);
	const [keysGenerated, setKeysGenerated] = useState<boolean>(false);

	// Encryption/Signing state
	const [message, setMessage] = useState<string>('');
	const [publicKeyInput, setPublicKeyInput] = useState<string>('');
	const [ciphertextOrSignature, setCiphertextOrSignature] =
		useState<string>('');
	const [resultSize, setResultSize] = useState<number>(0);
	const [operationComplete, setOperationComplete] = useState<boolean>(false);

	// Decryption/Verification state
	const [secretKeyInput, setSecretKeyInput] = useState<string>('');
	const [ciphertextOrSignatureInput, setCiphertextOrSignatureInput] =
		useState<string>('');
	const [messageInput, setMessageInput] = useState<string>('');
	const [operationResult, setOperationResult] = useState<string>('');
	const [isValid, setIsValid] = useState<boolean | null>(null);
	const [verificationComplete, setVerificationComplete] =
		useState<boolean>(false);

	// Add copy feedback state
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

	// Secret key visibility toggles
	const [showSecretKey, setShowSecretKey] = useState(false);
	const [showSignSecretKeyInput, setShowSignSecretKeyInput] = useState(false);
	const [showDecryptSecretKeyInput, setShowDecryptSecretKeyInput] =
		useState(false);

	// Update message placeholder based on algorithm
	const messagePlaceholder =
		selectedAlgorithm === 'kyber' ? 'Plaintext Message' : 'Message to Sign';

	// Update input and result labels based on algorithm
	const outputLabel =
		selectedAlgorithm === 'kyber' ? 'Ciphertext' : 'Signature';
	const actionButtonText =
		selectedAlgorithm === 'kyber' ? 'Encrypt Message' : 'Sign Message';
	const secondActionButtonText =
		selectedAlgorithm === 'kyber' ? 'Decrypt Message' : 'Verify Signature';
	const secondCardTitle =
		selectedAlgorithm === 'kyber' ? 'Encryption' : 'Signing';
	const thirdCardTitle =
		selectedAlgorithm === 'kyber' ? 'Decryption' : 'Verification';
	const secondCardIcon =
		selectedAlgorithm === 'kyber' ? (
			<LockIcon style={{ color: '#9747FF' }} className="mr-3" />
		) : (
			<CreateIcon style={{ color: '#9747FF' }} className="mr-3" />
		);
	const thirdCardIcon =
		selectedAlgorithm === 'kyber' ? (
			<LockOpenIcon style={{ color: '#9747FF' }} className="mr-3" />
		) : (
			<VerifiedIcon style={{ color: '#9747FF' }} className="mr-3" />
		);

	// Update UI if selected algorithm changes
	useEffect(() => {
		// Setup appropriate UI state for the selected algorithm
		const isKyber = selectedAlgorithm === 'kyber';

		if (!isKyber) {
			// For Dilithium, we need to show the message input in verification section
			setMessageInput('');
		}

		// Reset operation states
		setCiphertextOrSignature('');
		setOperationComplete(false);
		setOperationResult('');
		setIsValid(null);
		setVerificationComplete(false);
	}, [selectedAlgorithm]);

	const handleAlgorithmChange = (event: SelectChangeEvent) => {
		const algorithm = event.target.value;
		setSelectedAlgorithm(algorithm);
		setSelectedParam(SECURITY_PARAMS[algorithm][0]);

		// Reset all state when algorithm changes
		resetState();
	};

	const handleParamChange = (event: SelectChangeEvent) => {
		setSelectedParam(event.target.value);

		// Reset all state when parameter changes
		resetState();
	};

	const resetState = () => {
		// Reset key generation
		setPublicKey('');
		setSecretKey('');
		setPublicKeySize(0);
		setSecretKeySize(0);
		setKeysGenerated(false);

		// Reset encryption/signing
		setPublicKeyInput('');
		setCiphertextOrSignature('');
		setResultSize(0);
		setOperationComplete(false);
		setMessage('');

		// Reset decryption/verification
		setSecretKeyInput('');
		setCiphertextOrSignatureInput('');
		setMessageInput('');
		setOperationResult('');
		setIsValid(null);
		setVerificationComplete(false);

		// Reset visibility toggles
		setShowSecretKey(false);
		setShowSignSecretKeyInput(false);
		setShowDecryptSecretKeyInput(false);
	};

	const handleErrorClose = () => {
		setShowError(false);
	};

	const showErrorMessage = (message: string) => {
		setError(message);
		setShowError(true);
	};

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	const generateKeys = async () => {
		try {
			setIsGeneratingKeys(true);
			setKeysGenerated(false);

			// Call the IPC function to generate keys for the selected algorithm
			const ipcChannel =
				selectedAlgorithm === 'kyber'
					? 'kyber-generate-keypair'
					: 'dilithium-generate-keypair';

			const result: KeypairResult = await window.electron.ipcRenderer.invoke(
				ipcChannel,
				selectedParam
			);

			// Update state with the generated keys
			setPublicKey(result.publicKey);
			setSecretKey(result.secretKey);
			setPublicKeySize(result.publicKeySize);
			setSecretKeySize(result.secretKeySize);

			// Auto-fill the public key input field
			setPublicKeyInput(result.publicKey);

			// Auto-fill the secret key for verification
			setSecretKeyInput(result.secretKey);

			setKeysGenerated(true);
		} catch (err: any) {
			console.error(`Error generating ${selectedAlgorithm} keys:`, err);
			showErrorMessage(
				`Failed to generate keys: ${err.message || 'Unknown error'}`
			);
		} finally {
			setIsGeneratingKeys(false);
		}
	};

	const encryptOrSign = async () => {
		if (!publicKeyInput || !message) return;

		try {
			setIsEncryptingSigning(true);
			setOperationComplete(false);

			if (selectedAlgorithm === 'kyber') {
				// Encrypt
				const result: EncryptResult = await window.electron.ipcRenderer.invoke(
					'kyber-encrypt',
					selectedParam,
					publicKeyInput,
					message
				);

				// Update state with the encrypted data
				setCiphertextOrSignature(result.ciphertext);
				// Also set the ciphertext input to allow for immediate decryption
				setCiphertextOrSignatureInput(result.ciphertext);
				setResultSize(result.ciphertextSize);
			} else {
				// Sign with Dilithium
				const result: SignResult = await window.electron.ipcRenderer.invoke(
					'dilithium-sign',
					selectedParam,
					secretKeyInput, // For signing we use the secret key, not public
					message
				);

				// Update state with the signature
				setCiphertextOrSignature(result.signature);
				setCiphertextOrSignatureInput(result.signature);
				setResultSize(result.signatureSize);

				// For Dilithium, also set message input for verification
				setMessageInput(message);
			}

			setOperationComplete(true);
		} catch (err: any) {
			console.error(`Error in ${selectedAlgorithm} operation:`, err);
			showErrorMessage(`Operation failed: ${err.message || 'Unknown error'}`);
		} finally {
			setIsEncryptingSigning(false);
		}
	};

	const decryptOrVerify = async () => {
		if (
			selectedAlgorithm === 'kyber' &&
			(!secretKeyInput || !ciphertextOrSignatureInput)
		)
			return;
		if (
			selectedAlgorithm === 'dilithium' &&
			(!publicKeyInput || !messageInput || !ciphertextOrSignatureInput)
		)
			return;

		try {
			setIsDecryptingVerifying(true);
			setVerificationComplete(false);
			setIsValid(null);

			if (selectedAlgorithm === 'kyber') {
				// Decrypt
				const result: DecryptResult = await window.electron.ipcRenderer.invoke(
					'kyber-decrypt',
					selectedParam,
					secretKeyInput,
					ciphertextOrSignatureInput
				);

				// Update state with the decrypted data
				setOperationResult(result.plaintext);
				setIsValid(true); // Decryption successful = valid
			} else {
				// Verify with Dilithium
				const result: VerifyResult = await window.electron.ipcRenderer.invoke(
					'dilithium-verify',
					selectedParam,
					publicKeyInput,
					messageInput,
					ciphertextOrSignatureInput
				);

				// Update state with verification result
				setIsValid(result.isValid);
				// For dilithium, we'll show the message in the button itself
				if (!result.isValid) {
					setOperationResult('Invalid signature!');
				}
			}

			setVerificationComplete(true);
		} catch (err: any) {
			console.error(
				`Error in ${selectedAlgorithm} verification/decryption:`,
				err
			);
			showErrorMessage(`Operation failed: ${err.message || 'Unknown error'}`);
			setIsValid(false);
		} finally {
			setIsDecryptingVerifying(false);
		}
	};

	// Get algorithm display name
	const algorithmInfo = getAlgorithmInfo(selectedAlgorithm);
	const algorithmDisplayName = algorithmInfo.displayName;

	// Common card style
	const cardStyle = isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]';

	// Function to copy text to clipboard
	const copyToClipboard = (text: string, description: string) => {
		navigator.clipboard.writeText(text).then(
			() => {
				setCopyFeedback(`${description} copied to clipboard`);
				setTimeout(() => setCopyFeedback(null), 2000);
			},
			(err) => {
				console.error('Could not copy text: ', err);
			}
		);
	};

	return (
		<div className="space-y-6">
			{/* Error Snackbar */}
			<Snackbar
				open={showError}
				autoHideDuration={6000}
				onClose={handleErrorClose}
				anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
			>
				<Alert onClose={handleErrorClose} severity="error">
					{error}
				</Alert>
			</Snackbar>

			{/* Copy Feedback Snackbar */}
			<Snackbar
				open={copyFeedback !== null}
				autoHideDuration={2000}
				onClose={() => setCopyFeedback(null)}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert severity="success" onClose={() => setCopyFeedback(null)}>
					{copyFeedback}
				</Alert>
			</Snackbar>

			{/* Algorithm Configuration Card */}
			<Card className={`p-6 rounded-xl shadow-md transition-all ${cardStyle}`}>
				<div className="flex items-center mb-4">
					<VpnKeyIcon style={{ color: '#9747FF' }} className="mr-3" />
					<h2
						className="text-[20px] font-semibold"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Run{' '}
						{selectedAlgorithm === 'kyber' ? 'Encryption' : 'Digital Signature'}
					</h2>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					{selectedAlgorithm === 'kyber'
						? 'Configure and run encryption operations using post-quantum Kyber algorithm. Generate keys, encrypt and decrypt messages.'
						: 'Configure and run digital signature operations using post-quantum Dilithium algorithm. Generate keys, sign messages, and verify signatures.'}
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
					{/* Algorithm Selection */}
					<div>
						<FormControl fullWidth>
							<InputLabel id="algorithm-label">Algorithm</InputLabel>
							<Select
								labelId="algorithm-label"
								id="algorithm"
								value={selectedAlgorithm}
								onChange={handleAlgorithmChange}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'.MuiOutlinedInput-notchedOutline': {
										borderColor: 'rgba(0, 0, 0, 0.23)',
									},
								}}
							>
								<MenuItem value="kyber">Kyber (ML-KEM) - Encryption</MenuItem>
								<MenuItem value="dilithium">
									Dilithium (ML-DSA) - Digital Signature
								</MenuItem>
							</Select>
						</FormControl>
					</div>

					{/* Security Parameter Selection */}
					<div>
						<FormControl fullWidth>
							<InputLabel id="security-param-label">
								Security Parameter
							</InputLabel>
							<Select
								labelId="security-param-label"
								id="security-param"
								value={selectedParam}
								onChange={handleParamChange}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'.MuiOutlinedInput-notchedOutline': {
										borderColor: 'rgba(0, 0, 0, 0.23)',
									},
								}}
							>
								{SECURITY_PARAMS[selectedAlgorithm]?.map((param) => (
									<MenuItem key={param} value={param}>
										{param}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</div>
				</div>
			</Card>

			{/* Three Cards for Cryptographic Operations */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Generate Key Card */}
				<Card
					className={`p-6 rounded-xl shadow-md transition-all ${cardStyle} flex flex-col`}
				>
					<div className="flex items-center mb-4">
						<VpnKeyIcon style={{ color: '#9747FF' }} className="mr-3" />
						<h3
							className="text-[18px] font-semibold"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							Generate Key
						</h3>
					</div>

					<div className="space-y-4 flex-grow">
						<div>
							<div
								className="text-sm mb-1 flex items-center justify-between"
								style={{ color: '#999999' }}
							>
								<div className="flex items-center">
									Public Key
									{publicKeySize > 0 && (
										<Tooltip title={`Size: ${formatBytes(publicKeySize)}`}>
											<InfoIcon
												style={{
													fontSize: '16px',
													marginLeft: '5px',
													color: '#999999',
												}}
											/>
										</Tooltip>
									)}
								</div>
								{publicKey && (
									<Tooltip title="Copy public key">
										<IconButton
											size="small"
											onClick={() => copyToClipboard(publicKey, 'Public key')}
											sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}
										>
											<ContentCopyIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								)}
							</div>
							<div
								className="text-xs font-mono overflow-hidden max-h-[80px] overflow-y-auto bg-opacity-50 p-2 rounded"
								style={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								}}
							>
								{publicKey || 'Not generated'}
							</div>
						</div>

						<div>
							<div
								className="text-sm mb-1 flex items-center justify-between"
								style={{ color: '#999999' }}
							>
								<div className="flex items-center">
									Secret Key
									{secretKeySize > 0 && (
										<Tooltip title={`Size: ${formatBytes(secretKeySize)}`}>
											<InfoIcon
												style={{
													fontSize: '16px',
													marginLeft: '5px',
													color: '#999999',
												}}
											/>
										</Tooltip>
									)}
								</div>
								{secretKey && (
									<Tooltip title="Copy secret key">
										<IconButton
											size="small"
											onClick={() => copyToClipboard(secretKey, 'Secret key')}
											sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}
										>
											<ContentCopyIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								)}
							</div>
							<div
								className="text-xs font-mono overflow-hidden max-h-[80px] overflow-y-auto bg-opacity-50 p-2 rounded flex items-center"
								style={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									border: '1px solid rgba(0, 0, 0, 0.23)',
								}}
							>
								<div className="flex-grow overflow-hidden">
									{secretKey
										? showSecretKey
											? secretKey
											: '•'.repeat(Math.min(secretKey.length, 50))
										: 'Not generated'}
								</div>
								{secretKey && (
									<div className="flex-shrink-0 pr-2">
										<IconButton
											size="small"
											onClick={() => setShowSecretKey(!showSecretKey)}
											sx={{
												color: isDarkMode ? '#aaaaaa' : '#666666',
											}}
										>
											{showSecretKey ? (
												<VisibilityOffIcon sx={{ fontSize: '1.2rem' }} />
											) : (
												<VisibilityIcon sx={{ fontSize: '1.2rem' }} />
											)}
										</IconButton>
									</div>
								)}
							</div>
						</div>

						{keysGenerated && (
							<div>
								<div
									className="text-sm mb-1 flex items-center"
									style={{ color: '#28a745' }}
								>
									Keys generated successfully!
									<Tooltip
										title={
											selectedAlgorithm === 'kyber'
												? 'The public key has been automatically filled in the Encryption panel.'
												: 'Both keys have been automatically filled in the appropriate panels.'
										}
									>
										<InfoIcon
											style={{
												fontSize: '16px',
												marginLeft: '5px',
												color: '#28a745',
											}}
										/>
									</Tooltip>
								</div>
							</div>
						)}
					</div>

					<div className="mt-auto pt-4">
						<Button
							variant="contained"
							disableElevation
							onClick={generateKeys}
							disabled={isGeneratingKeys}
							sx={{
								bgcolor: '#9747FF',
								'&:hover': {
									bgcolor: '#8030E0',
								},
								fontSize: '0.9rem',
								padding: '8px 16px',
								textTransform: 'none',
								fontWeight: 'bold',
								borderRadius: '8px !important',
							}}
						>
							{isGeneratingKeys ? (
								<CircularProgress size={24} color="inherit" />
							) : (
								'Generate Keys'
							)}
						</Button>
					</div>
				</Card>

				{/* Encryption/Signing Card */}
				<Card
					className={`p-6 rounded-xl shadow-md transition-all ${cardStyle} flex flex-col`}
				>
					<div className="flex items-center mb-4">
						{secondCardIcon}
						<h3
							className="text-[18px] font-semibold"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							{secondCardTitle}
						</h3>
					</div>

					<div className="space-y-4 flex-grow">
						{selectedAlgorithm === 'kyber' ? (
							<TextField
								label="Public Key (Base64)"
								fullWidth
								value={publicKeyInput}
								onChange={(e) => setPublicKeyInput(e.target.value)}
								multiline
								rows={3}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									'& .MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
										fontSize: '0.75rem',
										fontFamily: '"Roboto Mono", monospace',
									},
									'& .MuiOutlinedInput-root': {
										'& fieldset': {
											borderColor: 'rgba(0, 0, 0, 0.23)',
										},
									},
									'& .MuiInputLabel-root': {
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.6)',
									},
								}}
							/>
						) : (
							<div>
								<label
									className="text-sm mb-1 block"
									style={{
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.6)',
									}}
								>
									Secret Key (Base64)
								</label>
								<div
									className="relative flex items-center bg-opacity-50 rounded"
									style={{
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
										border: '1px solid rgba(0, 0, 0, 0.23)',
									}}
								>
									<input
										className="flex-grow p-2 rounded font-mono text-xs bg-transparent border-0 outline-none w-[calc(100%-40px)]"
										style={{
											color: isDarkMode ? '#ffffff' : '#111111',
										}}
										type={showSignSecretKeyInput ? 'text' : 'password'}
										value={secretKeyInput}
										onChange={(e) => setSecretKeyInput(e.target.value)}
									/>
									<div className="flex-shrink-0 pr-2">
										<IconButton
											onClick={() =>
												setShowSignSecretKeyInput(!showSignSecretKeyInput)
											}
											size="small"
											sx={{
												color: isDarkMode ? '#aaaaaa' : '#666666',
											}}
										>
											{showSignSecretKeyInput ? (
												<VisibilityOffIcon sx={{ fontSize: '1.2rem' }} />
											) : (
												<VisibilityIcon sx={{ fontSize: '1.2rem' }} />
											)}
										</IconButton>
									</div>
								</div>
							</div>
						)}

						<TextField
							label={messagePlaceholder}
							multiline
							rows={3}
							fullWidth
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								'& .MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
									fontSize: '0.75rem',
									fontFamily: '"Roboto Mono", monospace',
								},
								'& .MuiOutlinedInput-root': {
									'& fieldset': {
										borderColor: 'rgba(0, 0, 0, 0.23)',
									},
								},
								'& .MuiInputLabel-root': {
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.7)'
										: 'rgba(0, 0, 0, 0.6)',
								},
							}}
						/>

						{operationComplete && (
							<>
								<div
									className="text-sm mb-1 flex items-center justify-between"
									style={{ color: '#999999' }}
								>
									<div className="flex items-center">
										{outputLabel}
										<Tooltip title={`Size: ${formatBytes(resultSize)}`}>
											<InfoIcon
												style={{
													fontSize: '16px',
													marginLeft: '5px',
													color: '#999999',
												}}
											/>
										</Tooltip>
									</div>
									<Tooltip title={`Copy ${outputLabel.toLowerCase()}`}>
										<IconButton
											size="small"
											onClick={() =>
												copyToClipboard(ciphertextOrSignature, outputLabel)
											}
											sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}
										>
											<ContentCopyIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								</div>
								<div
									className="text-xs font-mono overflow-hidden max-h-[100px] overflow-y-auto bg-opacity-50 p-2 rounded"
									style={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									}}
								>
									{ciphertextOrSignature}
								</div>
							</>
						)}
					</div>

					<div className="mt-auto pt-4">
						<Button
							variant="contained"
							disableElevation
							onClick={encryptOrSign}
							disabled={
								isEncryptingSigning ||
								(selectedAlgorithm === 'kyber' &&
									(!publicKeyInput || !message)) ||
								(selectedAlgorithm === 'dilithium' &&
									(!secretKeyInput || !message))
							}
							sx={{
								bgcolor: '#9747FF',
								'&:hover': {
									bgcolor: '#8030E0',
								},
								fontSize: '0.9rem',
								padding: '8px 16px',
								textTransform: 'none',
								fontWeight: 'bold',
								borderRadius: '8px !important',
								opacity:
									(selectedAlgorithm === 'kyber' &&
										(!publicKeyInput || !message)) ||
									(selectedAlgorithm === 'dilithium' &&
										(!secretKeyInput || !message))
										? 0.7
										: 1,
							}}
						>
							{isEncryptingSigning ? (
								<CircularProgress size={24} color="inherit" />
							) : (
								actionButtonText
							)}
						</Button>
					</div>
				</Card>

				{/* Decryption/Verification Card */}
				<Card
					className={`p-6 rounded-xl shadow-md transition-all ${cardStyle} flex flex-col`}
				>
					<div className="flex items-center mb-4">
						{thirdCardIcon}
						<h3
							className="text-[18px] font-semibold"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							{thirdCardTitle}
						</h3>
					</div>

					<div className="space-y-4 flex-grow">
						{selectedAlgorithm === 'kyber' ? (
							<div>
								<label
									className="text-sm mb-1 block"
									style={{
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.6)',
									}}
								>
									Secret Key (Base64)
								</label>
								<div
									className="relative flex items-center bg-opacity-50 rounded"
									style={{
										backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
										border: '1px solid rgba(0, 0, 0, 0.23)',
									}}
								>
									<input
										className="flex-grow p-2 rounded font-mono text-xs bg-transparent border-0 outline-none w-[calc(100%-40px)]"
										style={{
											color: isDarkMode ? '#ffffff' : '#111111',
										}}
										type={showDecryptSecretKeyInput ? 'text' : 'password'}
										value={secretKeyInput}
										onChange={(e) => setSecretKeyInput(e.target.value)}
									/>
									<div className="flex-shrink-0 pr-2">
										<IconButton
											onClick={() =>
												setShowDecryptSecretKeyInput(!showDecryptSecretKeyInput)
											}
											size="small"
											sx={{
												color: isDarkMode ? '#aaaaaa' : '#666666',
											}}
										>
											{showDecryptSecretKeyInput ? (
												<VisibilityOffIcon sx={{ fontSize: '1.2rem' }} />
											) : (
												<VisibilityIcon sx={{ fontSize: '1.2rem' }} />
											)}
										</IconButton>
									</div>
								</div>
							</div>
						) : (
							<TextField
								label="Public Key (Base64)"
								fullWidth
								value={publicKeyInput}
								onChange={(e) => setPublicKeyInput(e.target.value)}
								multiline
								rows={2}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									'& .MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
										fontSize: '0.75rem',
										fontFamily: '"Roboto Mono", monospace',
									},
									'& .MuiOutlinedInput-root': {
										'& fieldset': {
											borderColor: 'rgba(0, 0, 0, 0.23)',
										},
									},
									'& .MuiInputLabel-root': {
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.6)',
									},
								}}
							/>
						)}

						{selectedAlgorithm === 'dilithium' && (
							<TextField
								label="Message"
								fullWidth
								value={messageInput}
								onChange={(e) => setMessageInput(e.target.value)}
								multiline
								rows={2}
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									'& .MuiInputBase-input': {
										color: isDarkMode ? '#ffffff' : '#111111',
										fontSize: '0.75rem',
										fontFamily: '"Roboto Mono", monospace',
									},
									'& .MuiOutlinedInput-root': {
										'& fieldset': {
											borderColor: 'rgba(0, 0, 0, 0.23)',
										},
									},
									'& .MuiInputLabel-root': {
										color: isDarkMode
											? 'rgba(255, 255, 255, 0.7)'
											: 'rgba(0, 0, 0, 0.6)',
									},
								}}
							/>
						)}

						<TextField
							label={outputLabel + ' (Base64)'}
							fullWidth
							value={ciphertextOrSignatureInput}
							onChange={(e) => setCiphertextOrSignatureInput(e.target.value)}
							multiline
							rows={selectedAlgorithm === 'kyber' ? 3 : 2}
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								'& .MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
									fontSize: '0.75rem',
									fontFamily: '"Roboto Mono", monospace',
								},
								'& .MuiOutlinedInput-root': {
									'& fieldset': {
										borderColor: 'rgba(0, 0, 0, 0.23)',
									},
								},
								'& .MuiInputLabel-root': {
									color: isDarkMode
										? 'rgba(255, 255, 255, 0.7)'
										: 'rgba(0, 0, 0, 0.6)',
								},
							}}
						/>

						{operationComplete &&
							ciphertextOrSignature &&
							!ciphertextOrSignatureInput && (
								<div
									className="text-sm mb-1 flex items-center justify-between"
									style={{ color: '#999999' }}
								>
									<div className="flex items-center">
										<span>
											{outputLabel} available in the {secondCardTitle} panel
										</span>
										<Tooltip
											title={`The ${outputLabel.toLowerCase()} can be viewed in the ${secondCardTitle} panel`}
										>
											<InfoIcon
												style={{
													fontSize: '16px',
													marginLeft: '5px',
													color: '#999999',
												}}
											/>
										</Tooltip>
									</div>
									<Tooltip
										title={`Use ${outputLabel.toLowerCase()} from ${secondCardTitle}`}
									>
										<IconButton
											size="small"
											onClick={() =>
												setCiphertextOrSignatureInput(ciphertextOrSignature)
											}
											sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}
										>
											<ContentCopyIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								</div>
							)}

						{verificationComplete && (
							<div>
								{selectedAlgorithm === 'kyber' ? (
									<>
										<div
											className="text-sm mb-1 flex items-center justify-between"
											style={{ color: '#999999' }}
										>
											<span>Decrypted Message</span>
											<Tooltip title="Copy message">
												<IconButton
													size="small"
													onClick={() =>
														copyToClipboard(
															operationResult,
															'Decrypted message'
														)
													}
													sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}
												>
													<ContentCopyIcon fontSize="small" />
												</IconButton>
											</Tooltip>
										</div>
										<div
											className="text-xs font-mono bg-opacity-50 p-2 rounded overflow-auto max-h-[80px]"
											style={{
												color: isDarkMode ? '#FFFFFF' : '#000000',
												backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
											}}
										>
											{operationResult}
										</div>
									</>
								) : (
									// For Dilithium, only show error message for invalid signatures
									// Valid signatures will be shown in the button itself
									isValid === false && (
										<div className="text-base font-semibold p-2 rounded text-center text-red-500 bg-red-900 bg-opacity-20">
											{operationResult}
										</div>
									)
								)}
							</div>
						)}
					</div>

					<div className="mt-auto pt-4">
						<Button
							variant="contained"
							disableElevation
							onClick={decryptOrVerify}
							disabled={
								isDecryptingVerifying ||
								(selectedAlgorithm === 'kyber' &&
									(!secretKeyInput || !ciphertextOrSignatureInput)) ||
								(selectedAlgorithm === 'dilithium' &&
									(!publicKeyInput ||
										!messageInput ||
										!ciphertextOrSignatureInput))
							}
							sx={{
								bgcolor:
									selectedAlgorithm === 'dilithium' &&
									verificationComplete &&
									isValid
										? '#28a745' // Green for valid signature
										: '#9747FF', // Default purple
								'&:hover': {
									bgcolor:
										selectedAlgorithm === 'dilithium' &&
										verificationComplete &&
										isValid
											? '#218838' // Darker green for hover
											: '#8030E0', // Default darker purple
								},
								fontSize: '0.9rem',
								padding: '8px 16px',
								textTransform: 'none',
								fontWeight: 'bold',
								borderRadius: '8px !important',
								opacity:
									(selectedAlgorithm === 'kyber' &&
										(!secretKeyInput || !ciphertextOrSignatureInput)) ||
									(selectedAlgorithm === 'dilithium' &&
										(!publicKeyInput ||
											!messageInput ||
											!ciphertextOrSignatureInput))
										? 0.7
										: 1,
							}}
						>
							{isDecryptingVerifying ? (
								<CircularProgress size={24} color="inherit" />
							) : selectedAlgorithm === 'dilithium' &&
							  verificationComplete &&
							  isValid ? (
								'Signature is valid!'
							) : (
								secondActionButtonText
							)}
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
};

export default EncryptionRunner;
