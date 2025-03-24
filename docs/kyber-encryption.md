# Kyber Encryption Implementation

This document describes the post-quantum Kyber encryption implementation used in our application.

## Overview

Our implementation uses the ML-KEM (previously known as Kyber) post-quantum key encapsulation mechanism from the Open Quantum Safe (OQS) library along with OpenSSL for AES-GCM encryption of the actual message data.

The encryption process is implemented in three main components:

1. **Native C++ Implementation** - Uses OQS and OpenSSL libraries
2. **Node.js Native Addon** - Provides JavaScript bindings for the C++ implementation
3. **Electron IPC Layer** - Enables the renderer process to use the encryption features

## Security Levels

The implementation supports three security levels:

| Security Level | ML-KEM Variant | Public Key Size | Secret Key Size | Ciphertext Size\* |
| -------------- | -------------- | --------------- | --------------- | ----------------- |
| 512            | ML-KEM-512     | 800 bytes       | 1632 bytes      | ~800 bytes        |
| 768            | ML-KEM-768     | 1184 bytes      | 2400 bytes      | ~1150 bytes       |
| 1024           | ML-KEM-1024    | 1568 bytes      | 3168 bytes      | ~1630 bytes       |

\* Ciphertext size varies based on the message size (adds ~800-1600 bytes of overhead)

## Encryption Process

1. **Key Generation**

   - Generate an ML-KEM keypair for the chosen security level
   - Returns a public key for encryption and a secret key for decryption

2. **Encryption**

   - Takes the recipient's public key and a plaintext message
   - Uses ML-KEM to encapsulate a shared secret using the public key
   - Uses the shared secret as an AES-256-GCM key to encrypt the plaintext
   - Combines the ML-KEM ciphertext, IV, authentication tag, and AES ciphertext

3. **Decryption**
   - Takes the recipient's secret key and the ciphertext
   - Extracts the ML-KEM ciphertext and uses the secret key to recover the shared secret
   - Uses the shared secret as an AES-256-GCM key to decrypt the AES ciphertext

## Using the Encryption API

The encryption functionality is exposed through the Electron IPC layer:

```javascript
// Generate a keypair
const keyResult = await window.electron.ipcRenderer.invoke(
	'kyber-generate-keypair',
	securityLevel // '512', '768', or '1024'
);
// Returns: { publicKey, secretKey, publicKeySize, secretKeySize }

// Encrypt a message
const encryptResult = await window.electron.ipcRenderer.invoke(
	'kyber-encrypt',
	securityLevel,
	publicKeyBase64,
	plaintext
);
// Returns: { ciphertext, ciphertextSize }

// Decrypt a message
const decryptResult = await window.electron.ipcRenderer.invoke(
	'kyber-decrypt',
	securityLevel,
	secretKeyBase64,
	ciphertextBase64
);
// Returns: { plaintext }
```

## Troubleshooting

### Debugging

The C++ implementation includes detailed debug logging which can be enabled by setting `ENABLE_DEBUG_LOGGING` to 1 in `kyber_encrypt.cpp`.

Common issues to check:

1. **Native Library Path Issues**

   - Ensure the OpenSSL DLLs and OQS DLLs are properly loaded in the PATH
   - Electron process should add these paths as shown in `main.ts`

2. **Key Size Issues**

   - Ensure the correct security level is used consistently across key generation, encryption, and decryption
   - Check that keys and ciphertext are properly Base64 encoded/decoded

3. **Memory Management**
   - The native implementation allocates memory for keys and ciphertext, which is freed after being copied to JavaScript buffers

### Testing

Use the provided test scripts to verify encryption functionality:

- `test-kyber-debug.js` - Tests basic functionality with standalone Node.js
- `test-kyber.js` - Tests all security levels and provides detailed output

## Native Addon Building

The native addon needs to be rebuilt if changes are made to the C++ code:

```bash
npm run rebuild-addon
```

The build process includes:

1. Compiling the C++ code with node-gyp
2. Copying the built addon to the appropriate location for Electron

## Dependencies

- **liboqs** - For the ML-KEM implementation
- **OpenSSL** - For AES-GCM encryption
- **node-addon-api** - For creating the native Node.js addon

## Security Considerations

- Keys are exchanged as Base64 strings between renderer and main process
- The C++ implementation uses cryptographically secure random number generation for IVs
- The implementation follows recommended practices for AES-GCM
- OQS provides constant-time implementations to prevent timing attacks
