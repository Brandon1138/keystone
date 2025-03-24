# Dilithium Digital Signature Implementation

This document describes the post-quantum Dilithium digital signature implementation used in our application.

## Overview

Our implementation uses the ML-DSA (previously known as Dilithium) post-quantum digital signature algorithm from the Open Quantum Safe (OQS) library, providing secure digital signatures that are resistant to quantum computing attacks.

The signature process is implemented in three main components:

1. **Native C++ Implementation** - Uses OQS library
2. **Node.js Native Addon** - Provides JavaScript bindings for the C++ implementation
3. **Electron IPC Layer** - Enables the renderer process to use the signature features

## Security Levels

The implementation supports three security levels defined by NIST:

| Security Level | ML-DSA Variant | Public Key Size | Secret Key Size | Signature Size\* |
| -------------- | -------------- | --------------- | --------------- | ---------------- |
| 2              | ML-DSA-44      | 1312 bytes      | 2560 bytes      | ~2420 bytes      |
| 3              | ML-DSA-65      | 1952 bytes      | 4032 bytes      | ~3293 bytes      |
| 5              | ML-DSA-87      | 2592 bytes      | 4896 bytes      | ~4595 bytes      |

\* Signature size is fixed for each security level

## Digital Signature Process

1. **Key Generation**

   - Generate an ML-DSA keypair for the chosen security level
   - Returns a public key for verification and a secret key for signing

2. **Signing**

   - Takes the signer's secret key and a message to sign
   - Produces a digital signature that can be verified by others
   - The message itself is not encrypted, only signed for authenticity

3. **Verification**
   - Takes the signer's public key, the original message, and the signature
   - Verifies that the signature was created by the corresponding secret key
   - Returns a boolean indicating whether the signature is valid

## Using the Signature API

The signature functionality is exposed through the Electron IPC layer:

```javascript
// Generate a keypair
const keyResult = await window.electron.ipcRenderer.invoke(
	'dilithium-generate-keypair',
	securityLevel // '2', '3', or '5'
);
// Returns: { publicKey, secretKey, publicKeySize, secretKeySize }

// Sign a message
const signResult = await window.electron.ipcRenderer.invoke(
	'dilithium-sign',
	securityLevel,
	secretKeyBase64,
	message
);
// Returns: { signature, signatureSize }

// Verify a signature
const verifyResult = await window.electron.ipcRenderer.invoke(
	'dilithium-verify',
	securityLevel,
	publicKeyBase64,
	message,
	signatureBase64
);
// Returns: { isValid }
```

## Troubleshooting

### Debugging

The C++ implementation includes detailed debug logging which can be enabled by setting `ENABLE_DEBUG_LOGGING` to 1 in `dilithium_encrypt.cpp`.

Common issues to check:

1. **Native Library Path Issues**

   - Ensure the OQS DLLs are properly loaded in the PATH
   - Electron process should add these paths as shown in `main.ts`

2. **Key Size Issues**

   - Ensure the correct security level is used consistently across key generation, signing, and verification
   - Check that keys and signatures are properly Base64 encoded/decoded

3. **Memory Management**
   - The native implementation allocates memory for keys and signatures, which is freed after being copied to JavaScript buffers

### Testing

You can test the digital signature functionality directly from the UI by:

1. Selecting "Dilithium (ML-DSA) - Digital Signature" from the algorithm dropdown
2. Choosing a security level (2, 3, or 5)
3. Generating keys, signing a message, and verifying the signature

## Security Considerations

- Signatures are separate from the message and do not provide confidentiality
- For confidential communication, combine Dilithium with Kyber encryption
- The implementation follows NIST's recommendations for post-quantum digital signatures
- The algorithm provides resilience against both classical and quantum computer attacks

## Use Cases

1. **Document Signing**: Provide authenticity and integrity verification for documents
2. **Software Authentication**: Verify the authenticity of software packages
3. **Secure Communication**: Authenticate messages in communication protocols
4. **Certificate Authorities**: Create quantum-resistant certificates for PKI systems

## Comparison with Classical Signatures

| Feature                  | Dilithium (ML-DSA)     | RSA                   | ECDSA                             |
| ------------------------ | ---------------------- | --------------------- | --------------------------------- |
| Security Foundation      | Lattice-based problems | Integer factorization | Elliptic curve discrete logarithm |
| Quantum Resistance       | Yes                    | No                    | No                                |
| Signature Size           | Larger (2.4KB - 4.6KB) | Medium (256B - 512B)  | Small (64B - 132B)                |
| Key Size                 | Medium                 | Large (public key)    | Small                             |
| Signing Performance      | Fast                   | Slow                  | Fast                              |
| Verification Performance | Fast                   | Fast                  | Medium                            |

## Native Addon Building

The native addon needs to be rebuilt if changes are made to the C++ code:

```bash
npm run rebuild-addon
```

The build process uses the same configuration as the Kyber encryption module, defined in binding.gyp.

## Dependencies

- **liboqs** - For the ML-DSA implementation
- **node-addon-api** - For creating the native Node.js addon
