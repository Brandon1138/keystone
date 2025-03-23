import React, { useState } from 'react';
import {
	Button,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	TextField,
	SelectChangeEvent,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Card } from './ui/card';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { SUPPORTED_ALGORITHMS, SECURITY_PARAMS } from '../../types/benchmark';
import { getAlgorithmInfo } from '../utils/algorithm-categories';

export const EncryptionRunner: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	// Algorithm and parameter state
	const initialAlgorithm = SUPPORTED_ALGORITHMS[0];
	const [selectedAlgorithm, setSelectedAlgorithm] =
		useState<string>(initialAlgorithm);
	const [selectedParam, setSelectedParam] = useState<string>(
		SECURITY_PARAMS[initialAlgorithm][0]
	);

	// Key generation state
	const [publicKeySize, setPublicKeySize] = useState<string>('0 KB');
	const [secretKeySize, setSecretKeySize] = useState<string>('0 KB');
	const [keysGenerated, setKeysGenerated] = useState<boolean>(false);

	// Encryption state
	const [plaintext, setPlaintext] = useState<string>('');
	const [publicKeyInput, setPublicKeyInput] = useState<string>('');
	const [ciphertext, setCiphertext] = useState<string>('');
	const [encryptedMessageSize, setEncryptedMessageSize] =
		useState<string>('0 KB');
	const [messageEncrypted, setMessageEncrypted] = useState<boolean>(false);

	// Decryption state
	const [secretKeyInput, setSecretKeyInput] = useState<string>('');
	const [recoveredPlaintext, setRecoveredPlaintext] = useState<string>('');
	const [messageDecrypted, setMessageDecrypted] = useState<boolean>(false);

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
		setPublicKeySize('0 KB');
		setSecretKeySize('0 KB');
		setKeysGenerated(false);

		// Reset encryption
		setPublicKeyInput('');
		setCiphertext('');
		setEncryptedMessageSize('0 KB');
		setMessageEncrypted(false);

		// Reset decryption
		setSecretKeyInput('');
		setRecoveredPlaintext('');
		setMessageDecrypted(false);
	};

	const generateKeys = () => {
		// Simulate key generation with random sizes
		const pubKeySize = Math.floor(Math.random() * 10) + 1;
		const secKeySize = Math.floor(Math.random() * 20) + 5;

		setPublicKeySize(`${pubKeySize} KB`);
		setSecretKeySize(`${secKeySize} KB`);
		setKeysGenerated(true);
	};

	const encryptMessage = () => {
		if (!publicKeyInput || !plaintext) return;

		// Simulate encryption
		const encrypted = btoa(plaintext); // Simple base64 encoding for demo
		setCiphertext(encrypted);
		setEncryptedMessageSize(`${Math.ceil(encrypted.length / 1024)} KB`);
		setMessageEncrypted(true);
	};

	const decryptMessage = () => {
		if (!secretKeyInput || !messageEncrypted) return;

		// Simulate decryption
		try {
			const decrypted = atob(ciphertext); // Simple base64 decoding for demo
			setRecoveredPlaintext(decrypted);
			setMessageDecrypted(true);
		} catch (error) {
			console.error('Decryption failed:', error);
			setRecoveredPlaintext('Decryption failed');
		}
	};

	// Get algorithm display name
	const algorithmInfo = getAlgorithmInfo(selectedAlgorithm);
	const algorithmDisplayName = algorithmInfo.displayName;

	// Common card style
	const cardStyle = isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]';

	return (
		<div className="space-y-6">
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
					Configure and run encryption operations using post-quantum and
					classical cryptography algorithms. Generate keys, encrypt and decrypt
					messages using the selected algorithm.
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
								{SUPPORTED_ALGORITHMS.map((algo) => {
									const { displayName, category } = getAlgorithmInfo(algo);
									return (
										<MenuItem key={algo} value={algo}>
											{displayName} ({category})
										</MenuItem>
									);
								})}
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
							<div className="text-sm mb-1" style={{ color: '#999999' }}>
								Public Key
							</div>
							<div
								className="text-lg font-medium"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								{publicKeySize}
							</div>
						</div>

						<div>
							<div className="text-sm mb-1" style={{ color: '#999999' }}>
								Secret Key
							</div>
							<div
								className="text-lg font-medium"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								{secretKeySize}
							</div>
						</div>
					</div>

					<div className="mt-auto pt-4">
						<Button
							variant="contained"
							disableElevation
							onClick={generateKeys}
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
							Generate Keys
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
							label="Public Key"
							fullWidth
							value={publicKeyInput}
							onChange={(e) => setPublicKeyInput(e.target.value)}
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
								<div className="text-sm mb-1" style={{ color: '#999999' }}>
									Ciphertext (Encrypted Message)
								</div>
								<div
									className="text-sm font-medium bg-opacity-50 p-2 rounded overflow-hidden overflow-ellipsis"
									style={{
										color: isDarkMode ? '#AAAAAA' : '#444444',
										backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
										maxHeight: '80px',
									}}
								>
									{ciphertext}
								</div>
								<div className="text-sm" style={{ color: '#999999' }}>
									Encrypted Size: {encryptedMessageSize}
								</div>
							</>
						)}
					</div>

					<div className="mt-auto pt-4">
						<Button
							variant="contained"
							disableElevation
							onClick={encryptMessage}
							disabled={!publicKeyInput || !plaintext}
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
							Encrypt Message
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
							label="Secret Key"
							fullWidth
							value={secretKeyInput}
							onChange={(e) => setSecretKeyInput(e.target.value)}
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
								<div className="text-sm mb-1" style={{ color: '#999999' }}>
									Ciphertext
								</div>
								<div
									className="text-sm font-medium bg-opacity-50 p-2 rounded overflow-hidden overflow-ellipsis"
									style={{
										color: isDarkMode ? '#AAAAAA' : '#444444',
										backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
										maxHeight: '80px',
									}}
								>
									{ciphertext}
								</div>
							</>
						)}

						{messageDecrypted && (
							<>
								<div className="text-sm mb-1" style={{ color: '#999999' }}>
									Recovered Plaintext
								</div>
								<div
									className="text-base font-medium bg-opacity-50 p-2 rounded"
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
							disabled={!secretKeyInput || !messageEncrypted}
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
								opacity: !secretKeyInput || !messageEncrypted ? 0.7 : 1,
							}}
						>
							Decrypt Message
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
};

export default EncryptionRunner;
