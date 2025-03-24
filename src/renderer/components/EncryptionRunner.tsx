import React, { useState } from 'react';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Card } from './ui/card';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import InfoIcon from '@mui/icons-material/Info';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { SUPPORTED_ALGORITHMS, SECURITY_PARAMS } from '../../types/benchmark';
import { getAlgorithmInfo } from '../utils/algorithm-categories';

// Define interfaces for our encryption operations
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

export const EncryptionRunner: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Algorithm and parameter state
	const initialAlgorithm = 'kyber'; // Only using Kyber for now
	const [selectedAlgorithm, setSelectedAlgorithm] =
		useState<string>(initialAlgorithm);
	const [selectedParam, setSelectedParam] = useState<string>(
		SECURITY_PARAMS[initialAlgorithm][0]
	);

	// Loading states
	const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
	const [isEncrypting, setIsEncrypting] = useState(false);
	const [isDecrypting, setIsDecrypting] = useState(false);

	// Error handling
	const [error, setError] = useState<string | null>(null);
	const [showError, setShowError] = useState(false);

	// Key generation state
	const [publicKey, setPublicKey] = useState<string>('');
	const [secretKey, setSecretKey] = useState<string>('');
	const [publicKeySize, setPublicKeySize] = useState<number>(0);
	const [secretKeySize, setSecretKeySize] = useState<number>(0);
	const [keysGenerated, setKeysGenerated] = useState<boolean>(false);

	// Encryption state
	const [plaintext, setPlaintext] = useState<string>('');
	const [publicKeyInput, setPublicKeyInput] = useState<string>('');
	const [ciphertext, setCiphertext] = useState<string>('');
	const [encryptedMessageSize, setEncryptedMessageSize] = useState<number>(0);
	const [messageEncrypted, setMessageEncrypted] = useState<boolean>(false);

	// Decryption state
	const [secretKeyInput, setSecretKeyInput] = useState<string>('');
	const [ciphertextInput, setCiphertextInput] = useState<string>('');
	const [recoveredPlaintext, setRecoveredPlaintext] = useState<string>('');
	const [messageDecrypted, setMessageDecrypted] = useState<boolean>(false);

	// Add copy feedback state
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

		// Reset encryption
		setPublicKeyInput('');
		setCiphertext('');
		setEncryptedMessageSize(0);
		setMessageEncrypted(false);

		// Reset decryption
		setSecretKeyInput('');
		setCiphertextInput('');
		setRecoveredPlaintext('');
		setMessageDecrypted(false);
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

			// Call the IPC function to generate keys
			const result: KeypairResult = await window.electron.ipcRenderer.invoke(
				'kyber-generate-keypair',
				selectedParam
			);

			// Update state with the generated keys
			setPublicKey(result.publicKey);
			setSecretKey(result.secretKey);
			setPublicKeySize(result.publicKeySize);
			setSecretKeySize(result.secretKeySize);

			// Auto-fill the public key input field
			setPublicKeyInput(result.publicKey);

			setKeysGenerated(true);
		} catch (err: any) {
			console.error('Error generating keys:', err);
			showErrorMessage(
				`Failed to generate keys: ${err.message || 'Unknown error'}`
			);
		} finally {
			setIsGeneratingKeys(false);
		}
	};

	const encryptMessage = async () => {
		if (!publicKeyInput || !plaintext) return;

		try {
			setIsEncrypting(true);
			setMessageEncrypted(false);

			// Call the IPC function to encrypt
			const result: EncryptResult = await window.electron.ipcRenderer.invoke(
				'kyber-encrypt',
				selectedParam,
				publicKeyInput,
				plaintext
			);

			// Update state with the encrypted data
			setCiphertext(result.ciphertext);
			// Also set the ciphertext input to allow for immediate decryption
			setCiphertextInput(result.ciphertext);
			setEncryptedMessageSize(result.ciphertextSize);
			setMessageEncrypted(true);
		} catch (err: any) {
			console.error('Error encrypting message:', err);
			showErrorMessage(
				`Failed to encrypt message: ${err.message || 'Unknown error'}`
			);
		} finally {
			setIsEncrypting(false);
		}
	};

	const decryptMessage = async () => {
		if (!secretKeyInput || !ciphertextInput) return;

		try {
			setIsDecrypting(true);
			setMessageDecrypted(false);

			// Call the IPC function to decrypt
			const result: DecryptResult = await window.electron.ipcRenderer.invoke(
				'kyber-decrypt',
				selectedParam,
				secretKeyInput,
				ciphertextInput
			);

			// Update state with the decrypted data
			setRecoveredPlaintext(result.plaintext);
			setMessageDecrypted(true);
		} catch (err: any) {
			console.error('Error decrypting message:', err);
			showErrorMessage(
				`Failed to decrypt message: ${err.message || 'Unknown error'}`
			);
		} finally {
			setIsDecrypting(false);
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
						Run Encryption
					</h2>
				</div>
				<p
					className="mb-5"
					style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
				>
					Configure and run encryption operations using post-quantum Kyber
					algorithm. Generate keys, encrypt and decrypt messages.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
					{/* Algorithm Selection - Only Kyber for now */}
					<div>
						<FormControl fullWidth>
							<InputLabel id="algorithm-label">Algorithm</InputLabel>
							<Select
								labelId="algorithm-label"
								id="algorithm"
								value={selectedAlgorithm}
								onChange={handleAlgorithmChange}
								disabled={true} // Disabled since we're only focusing on Kyber now
								sx={{
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
									color: isDarkMode ? '#ffffff' : '#111111',
									'.MuiOutlinedInput-notchedOutline': {
										borderColor: 'rgba(0, 0, 0, 0.23)',
									},
								}}
							>
								<MenuItem value="kyber">Kyber (Post-Quantum KEM)</MenuItem>
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

			{/* Three Cards for Encryption Operations */}
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
								className="text-xs font-mono overflow-hidden overflow-ellipsis max-h-[80px] overflow-y-auto bg-opacity-50 p-2 rounded"
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
								className="text-xs font-mono overflow-hidden overflow-ellipsis max-h-[80px] overflow-y-auto bg-opacity-50 p-2 rounded"
								style={{
									color: isDarkMode ? '#FFFFFF' : '#000000',
									backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								}}
							>
								{secretKey || 'Not generated'}
							</div>
						</div>

						{keysGenerated && (
							<div>
								<div
									className="text-sm mb-1 flex items-center"
									style={{ color: '#28a745' }}
								>
									Keys generated successfully!
									<Tooltip title="The public key has been automatically filled in the Encryption panel.">
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

				{/* Encryption Card */}
				<Card
					className={`p-6 rounded-xl shadow-md transition-all ${cardStyle} flex flex-col`}
				>
					<div className="flex items-center mb-4">
						<LockIcon style={{ color: '#9747FF' }} className="mr-3" />
						<h3
							className="text-[18px] font-semibold"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							Encryption
						</h3>
					</div>

					<div className="space-y-4 flex-grow">
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
									fontSize: '0.9rem',
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

						<TextField
							label="Plaintext Message"
							multiline
							rows={3}
							fullWidth
							value={plaintext}
							onChange={(e) => setPlaintext(e.target.value)}
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								'& .MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
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

						{messageEncrypted && (
							<>
								<div
									className="text-sm mb-1 flex items-center justify-between"
									style={{ color: '#999999' }}
								>
									<div className="flex items-center">
										Ciphertext
										<Tooltip
											title={`Size: ${formatBytes(encryptedMessageSize)}`}
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
									<Tooltip title="Copy ciphertext">
										<IconButton
											size="small"
											onClick={() => copyToClipboard(ciphertext, 'Ciphertext')}
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
									{ciphertext}
								</div>
							</>
						)}
					</div>

					<div className="mt-auto pt-4">
						<Button
							variant="contained"
							disableElevation
							onClick={encryptMessage}
							disabled={isEncrypting || !publicKeyInput || !plaintext}
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
								opacity: !publicKeyInput || !plaintext ? 0.7 : 1,
							}}
						>
							{isEncrypting ? (
								<CircularProgress size={24} color="inherit" />
							) : (
								'Encrypt Message'
							)}
						</Button>
					</div>
				</Card>

				{/* Decryption Card */}
				<Card
					className={`p-6 rounded-xl shadow-md transition-all ${cardStyle} flex flex-col`}
				>
					<div className="flex items-center mb-4">
						<LockOpenIcon style={{ color: '#9747FF' }} className="mr-3" />
						<h3
							className="text-[18px] font-semibold"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							Decryption
						</h3>
					</div>

					<div className="space-y-4 flex-grow">
						<TextField
							label="Secret Key (Base64)"
							fullWidth
							value={secretKeyInput}
							onChange={(e) => setSecretKeyInput(e.target.value)}
							multiline
							rows={3}
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								'& .MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
									fontSize: '0.9rem',
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

						<TextField
							label="Ciphertext (Base64)"
							fullWidth
							value={ciphertextInput}
							onChange={(e) => setCiphertextInput(e.target.value)}
							multiline
							rows={3}
							sx={{
								backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
								'& .MuiInputBase-input': {
									color: isDarkMode ? '#ffffff' : '#111111',
									fontSize: '0.9rem',
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

						{messageEncrypted && ciphertext && !ciphertextInput && (
							<div
								className="text-sm mb-1 flex items-center justify-between"
								style={{ color: '#999999' }}
							>
								<div className="flex items-center">
									<span>Ciphertext available in the Encryption panel</span>
									<Tooltip title="The encrypted message can be viewed in the Encryption panel">
										<InfoIcon
											style={{
												fontSize: '16px',
												marginLeft: '5px',
												color: '#999999',
											}}
										/>
									</Tooltip>
								</div>
								<Tooltip title="Use ciphertext from encryption">
									<IconButton
										size="small"
										onClick={() => setCiphertextInput(ciphertext)}
										sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}
									>
										<ContentCopyIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							</div>
						)}

						{messageDecrypted && (
							<>
								<div
									className="text-sm mb-1 flex items-center justify-between"
									style={{ color: '#999999' }}
								>
									<span>Recovered Plaintext</span>
									<Tooltip title="Copy plaintext">
										<IconButton
											size="small"
											onClick={() =>
												copyToClipboard(recoveredPlaintext, 'Plaintext')
											}
											sx={{ color: isDarkMode ? '#aaaaaa' : '#666666' }}
										>
											<ContentCopyIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								</div>
								<div
									className="text-base font-mono bg-opacity-50 p-2 rounded overflow-auto max-h-[80px]"
									style={{
										color: isDarkMode ? '#FFFFFF' : '#000000',
										backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
									}}
								>
									{recoveredPlaintext}
								</div>
							</>
						)}
					</div>

					<div className="mt-auto pt-4">
						<Button
							variant="contained"
							disableElevation
							onClick={decryptMessage}
							disabled={isDecrypting || !secretKeyInput || !ciphertextInput}
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
								opacity: !secretKeyInput || !ciphertextInput ? 0.7 : 1,
							}}
						>
							{isDecrypting ? (
								<CircularProgress size={24} color="inherit" />
							) : (
								'Decrypt Message'
							)}
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
};

export default EncryptionRunner;
