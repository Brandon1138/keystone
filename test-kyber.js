const path = require('path');
const fs = require('fs');

// Configure environment
if (process.platform === 'win32') {
	// For Windows, we need to add the OpenSSL and liboqs DLLs to the PATH
	const opensslBinPath = path.join(
		__dirname,
		'libs',
		'openssl',
		'openssl-3.0',
		'x64',
		'bin'
	);
	const oqsBinPath = path.join(__dirname, 'libs', 'oqs', 'install', 'bin');

	// Add these paths to the PATH environment variable
	process.env.PATH = `${process.env.PATH};${opensslBinPath};${oqsBinPath}`;
	console.log('Added native library paths to PATH:');
	console.log('- OpenSSL:', opensslBinPath);
	console.log('- OQS:', oqsBinPath);
}

// Load the addon
const addonPath = path.join(
	__dirname,
	'build',
	'Release',
	'kyber_node_addon.node'
);
if (!fs.existsSync(addonPath)) {
	console.error(`Addon not found at ${addonPath}`);
	process.exit(1);
}

const kyberAddon = require(addonPath);
console.log('Kyber addon loaded successfully');
console.log('Available functions:', Object.keys(kyberAddon));

// Run tests for all security parameters
async function runTests() {
	const securityLevels = ['512', '768', '1024'];

	for (const securityLevel of securityLevels) {
		console.log(`\n==== Testing Kyber-${securityLevel} ====`);

		try {
			// Step 1: Generate keypair
			console.log(`\nGenerating keys for Kyber-${securityLevel}...`);
			const keys = kyberAddon.generateKeypair(securityLevel);
			console.log('Key generation successful!');
			console.log(`- Public key size: ${keys.publicKey.length} bytes`);
			console.log(`- Secret key size: ${keys.secretKey.length} bytes`);

			// Step 2: Encrypt a message
			const plaintext = Buffer.from(
				`This is a test message for Kyber-${securityLevel}`,
				'utf8'
			);
			console.log(`\nEncrypting message: "${plaintext.toString('utf8')}"`);

			const ciphertext = kyberAddon.encrypt(
				securityLevel,
				keys.publicKey,
				plaintext
			);
			console.log('Encryption successful!');
			console.log(`- Ciphertext size: ${ciphertext.length} bytes`);

			// Step 3: Decrypt the message
			console.log('\nDecrypting message...');
			const decrypted = kyberAddon.decrypt(
				securityLevel,
				keys.secretKey,
				ciphertext
			);
			console.log('Decryption successful!');
			console.log(`- Decrypted text: "${decrypted.toString('utf8')}"`);

			// Verify the decrypted message matches the original
			if (plaintext.toString('utf8') === decrypted.toString('utf8')) {
				console.log('✅ PASS: Decrypted text matches original');
			} else {
				console.log('❌ FAIL: Decrypted text does not match original');
				console.log(`  Original: "${plaintext.toString('utf8')}"`);
				console.log(`  Decrypted: "${decrypted.toString('utf8')}"`);
			}
		} catch (err) {
			console.error(`Error testing Kyber-${securityLevel}:`, err);
		}
	}
}

// Run the tests
runTests().then(() => {
	console.log('\nAll tests completed.');
});
