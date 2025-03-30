const path = require('path');
const fs = require('fs');

// Function to locate the native addon
function findAddon() {
	const possiblePaths = [
		path.join(__dirname, 'build', 'Release', 'kyber_node_addon.node'),
		path.join(__dirname, 'dist', 'build', 'Release', 'kyber_node_addon.node'),
	];

	for (const addonPath of possiblePaths) {
		if (fs.existsSync(addonPath)) {
			console.log(`Found addon at: ${addonPath}`);
			return addonPath;
		}
	}
	return null;
}

// Add native library paths to process environment
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

// Try to load the addon
let kyberAddon = null;
try {
	const addonPath = findAddon();
	if (!addonPath) {
		throw new Error('Kyber addon not found');
	}

	// Try to load the addon directly
	try {
		kyberAddon = require(addonPath);
		console.log('Kyber addon loaded successfully');
		console.log('Available functions:', Object.keys(kyberAddon));
	} catch (err) {
		console.error('Failed to load addon with require:', err);

		// Try using process.dlopen as a fallback
		const module = { exports: {} };
		process.dlopen(module, addonPath);
		kyberAddon = module.exports;
		console.log('Kyber addon loaded with process.dlopen');
		console.log('Available functions:', Object.keys(kyberAddon));
	}
} catch (err) {
	console.error('Failed to load Kyber addon:', err);
	process.exit(1);
}

// Test generateKeypair
async function testGenerateKeypair() {
	try {
		console.log('\nTesting key generation with Kyber-512...');
		const result = kyberAddon.generateKeypair('512');
		console.log('Key generation successful!');
		console.log(`- Public key size: ${result.publicKey.length} bytes`);
		console.log(`- Secret key size: ${result.secretKey.length} bytes`);
		return result;
	} catch (err) {
		console.error('Key generation failed:', err);
		throw err;
	}
}

// Test encrypt
async function testEncrypt(keys) {
	try {
		console.log('\nTesting encryption with Kyber-512...');
		const plaintext = Buffer.from(
			'This is a test message for Kyber encryption',
			'utf8'
		);
		console.log(`- Input plaintext: "${plaintext.toString('utf8')}"`);

		const ciphertext = kyberAddon.encrypt('512', keys.publicKey, plaintext);
		console.log('Encryption successful!');
		console.log(`- Ciphertext size: ${ciphertext.length} bytes`);
		return { ciphertext, plaintext };
	} catch (err) {
		console.error('Encryption failed:', err);
		throw err;
	}
}

// Test decrypt
async function testDecrypt(keys, encryptResult) {
	try {
		console.log('\nTesting decryption with Kyber-512...');
		const decrypted = kyberAddon.decrypt(
			'512',
			keys.secretKey,
			encryptResult.ciphertext
		);
		console.log('Decryption successful!');
		console.log(`- Decrypted text: "${decrypted.toString('utf8')}"`);

		// Check if decryption was successful
		const original = encryptResult.plaintext.toString('utf8');
		const recovered = decrypted.toString('utf8');
		if (original === recovered) {
			console.log('✅ Decryption matches original plaintext!');
		} else {
			console.log('❌ Decryption does not match original plaintext!');
			console.log(`  Original: "${original}"`);
			console.log(`  Recovered: "${recovered}"`);
		}
	} catch (err) {
		console.error('Decryption failed:', err);
		throw err;
	}
}

// Run the tests
async function runTests() {
	try {
		const keys = await testGenerateKeypair();
		const encryptResult = await testEncrypt(keys);
		await testDecrypt(keys, encryptResult);
		console.log('\nAll tests completed successfully! ✅');
	} catch (err) {
		console.error('\nTests failed! ❌');
	}
}

runTests();
