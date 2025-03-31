#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <iostream>
#include <vector>
#include <stdexcept> // Include for std::runtime_error

#include <oqs/oqs.h>
// OpenSSL headers are not strictly needed anymore in this file
// if we remove the symmetric encryption part, but keep for potential future use
// or if other parts of your project rely on them being included implicitly.
// #include <openssl/evp.h>
// #include <openssl/err.h>
// #include <openssl/rand.h>
// #include <openssl/conf.h>
// #include <openssl/hmac.h>

// Enable detailed debugging (keep if useful)
#define ENABLE_DEBUG_LOGGING 1

// Debug logging macro
#if ENABLE_DEBUG_LOGGING
    #define DEBUG_LOG(msg) std::cerr << "DEBUG (kyber_encrypt.cpp): " << msg << std::endl
#else
    #define DEBUG_LOG(msg)
#endif

// Helper: Select ML-KEM algorithm (Unchanged)
static const char* select_kyber_alg(const char* security_level) {
    if (std::strcmp(security_level, "512") == 0) {
        return OQS_KEM_alg_ml_kem_512;
    } else if (std::strcmp(security_level, "768") == 0) {
        return OQS_KEM_alg_ml_kem_768;
    } else if (std::strcmp(security_level, "1024") == 0) {
        return OQS_KEM_alg_ml_kem_1024;
    } else {
        return nullptr;
    }
}

// ==================== Key Generation (Unchanged) ====================
extern "C" int GenerateKeypair(const char* security_level,
                               uint8_t** public_key, size_t* public_key_len,
                               uint8_t** secret_key, size_t* secret_key_len) {
    DEBUG_LOG("GenerateKeypair with security_level: " << security_level);

    const char* alg = select_kyber_alg(security_level);
    if (alg == nullptr) {
        std::cerr << "GenerateKeypair Error: Invalid security level: " << security_level << std::endl;
        return -1; // Invalid argument
    }

    DEBUG_LOG("Using algorithm: " << alg);

    OQS_KEM* kem = OQS_KEM_new(alg);
    if (kem == nullptr) {
        std::cerr << "GenerateKeypair Error: Failed to initialize ML-KEM-" << security_level << " KEM." << std::endl;
        return -2; // KEM initialization failed
    }

    DEBUG_LOG("OQS_KEM initialized. PK len: " << kem->length_public_key << ", SK len: " << kem->length_secret_key);

    // Allocate memory using malloc as expected by the addon wrapper's free_buffer
    *public_key_len = kem->length_public_key;
    *secret_key_len = kem->length_secret_key;
    *public_key = (uint8_t*) std::malloc(*public_key_len);
    *secret_key = (uint8_t*) std::malloc(*secret_key_len);

    if (!*public_key || !*secret_key) {
        std::cerr << "GenerateKeypair Error: Memory allocation failed." << std::endl;
        std::free(*public_key); // Free if one allocation succeeded but the other failed
        std::free(*secret_key);
        *public_key = nullptr;
        *secret_key = nullptr;
        OQS_KEM_free(kem);
        return -3; // Memory allocation failure
    }

    DEBUG_LOG("Memory allocated. Generating keypair...");

    if (OQS_KEM_keypair(kem, *public_key, *secret_key) != OQS_SUCCESS) {
        std::cerr << "GenerateKeypair Error: Keypair generation failed." << std::endl;
        std::free(*public_key);
        std::free(*secret_key);
        *public_key = nullptr;
        *secret_key = nullptr;
        OQS_KEM_free(kem);
        return -4; // OQS keypair generation failed
    }

    DEBUG_LOG("Keypair generation successful!");
    OQS_KEM_free(kem);
    return 0; // Success
}

// ==================== Encapsulate Function (Replaces Encrypt) ====================
// Performs KEM encapsulation only. Returns KEM ciphertext and shared secret.
extern "C" int Encapsulate(const char* security_level,
                           const uint8_t* recipient_public_key, size_t recipient_public_key_len,
                           uint8_t** out_kem_ciphertext, size_t* out_kem_ciphertext_len,
                           uint8_t** out_shared_secret, size_t* out_shared_secret_len) {

    DEBUG_LOG("Encapsulate with security_level: " << security_level);
    if (!security_level || !recipient_public_key || !out_kem_ciphertext || !out_kem_ciphertext_len || !out_shared_secret || !out_shared_secret_len) {
        std::cerr << "Encapsulate Error: Null input parameter(s)." << std::endl;
        return -1; // Invalid arguments
    }

    // Initialize outputs to safe values
    *out_kem_ciphertext = nullptr;
    *out_kem_ciphertext_len = 0;
    *out_shared_secret = nullptr;
    *out_shared_secret_len = 0;

    const char* alg = select_kyber_alg(security_level);
    if (alg == nullptr) {
        std::cerr << "Encapsulate Error: Invalid security level: " << security_level << std::endl;
        return -1; // Invalid arguments (security level)
    }

    DEBUG_LOG("Using algorithm: " << alg);

    OQS_KEM* kem = OQS_KEM_new(alg);
    if (kem == nullptr) {
        std::cerr << "Encapsulate Error: Failed to initialize ML-KEM-" << security_level << " KEM." << std::endl;
        return -2; // KEM initialization failed
    }

    // Validate public key length
    if (recipient_public_key_len != kem->length_public_key) {
        std::cerr << "Encapsulate Error: Invalid recipient public key length." << std::endl;
        std::cerr << "  Expected: " << kem->length_public_key << ", Received: " << recipient_public_key_len << std::endl;
        OQS_KEM_free(kem);
        return -1; // Invalid arguments (key length)
    }

    DEBUG_LOG("KEM details - Ciphertext len: " << kem->length_ciphertext << ", Shared secret len: " << kem->length_shared_secret);

    // Allocate memory for outputs using malloc
    *out_kem_ciphertext_len = kem->length_ciphertext;
    *out_shared_secret_len = kem->length_shared_secret;
    *out_kem_ciphertext = (uint8_t*) std::malloc(*out_kem_ciphertext_len);
    *out_shared_secret = (uint8_t*) std::malloc(*out_shared_secret_len);

    if (!*out_kem_ciphertext || !*out_shared_secret) {
        std::cerr << "Encapsulate Error: Memory allocation failed." << std::endl;
        std::free(*out_kem_ciphertext);
        std::free(*out_shared_secret);
        *out_kem_ciphertext = nullptr;
        *out_shared_secret = nullptr;
        OQS_KEM_free(kem);
        return -3; // Memory allocation failure
    }

    DEBUG_LOG("Memory allocated. Performing KEM encapsulation...");

    // Perform KEM Encapsulation
    if (OQS_KEM_encaps(kem, *out_kem_ciphertext, *out_shared_secret, recipient_public_key) != OQS_SUCCESS) {
        std::cerr << "Encapsulate Error: OQS_KEM_encaps failed." << std::endl;
        std::free(*out_kem_ciphertext);
        std::free(*out_shared_secret);
        *out_kem_ciphertext = nullptr;
        *out_shared_secret = nullptr;
        OQS_KEM_free(kem);
        return -4; // OQS encapsulation failed
    }

    DEBUG_LOG("KEM encapsulation successful!");
    OQS_KEM_free(kem);
    return 0; // Success
}


// ==================== Decapsulate Function (Replaces Decrypt) ====================
// Performs KEM decapsulation only. Returns shared secret.
extern "C" int Decapsulate(const char* security_level,
                           const uint8_t* recipient_secret_key, size_t recipient_secret_key_len,
                           const uint8_t* kem_ciphertext, size_t kem_ciphertext_len,
                           uint8_t** out_shared_secret, size_t* out_shared_secret_len) {

    DEBUG_LOG("Decapsulate with security_level: " << security_level);
    if (!security_level || !recipient_secret_key || !kem_ciphertext || !out_shared_secret || !out_shared_secret_len) {
        std::cerr << "Decapsulate Error: Null input parameter(s)." << std::endl;
        return -1; // Invalid arguments
    }

    // Initialize output
    *out_shared_secret = nullptr;
    *out_shared_secret_len = 0;

    const char* alg = select_kyber_alg(security_level);
    if (alg == nullptr) {
        std::cerr << "Decapsulate Error: Invalid security level: " << security_level << std::endl;
        return -1; // Invalid arguments (security level)
    }

    DEBUG_LOG("Using algorithm: " << alg);

    OQS_KEM* kem = OQS_KEM_new(alg);
    if (kem == nullptr) {
        std::cerr << "Decapsulate Error: Failed to initialize ML-KEM-" << security_level << " KEM." << std::endl;
        return -2; // KEM initialization failed
    }

    // Validate secret key length
    if (recipient_secret_key_len != kem->length_secret_key) {
        std::cerr << "Decapsulate Error: Invalid recipient secret key length." << std::endl;
        std::cerr << "  Expected: " << kem->length_secret_key << ", Received: " << recipient_secret_key_len << std::endl;
        OQS_KEM_free(kem);
        return -1; // Invalid arguments (secret key length)
    }

    // Validate KEM ciphertext length
    if (kem_ciphertext_len != kem->length_ciphertext) {
        std::cerr << "Decapsulate Error: Invalid KEM ciphertext length." << std::endl;
        std::cerr << "  Expected: " << kem->length_ciphertext << ", Received: " << kem_ciphertext_len << std::endl;
        OQS_KEM_free(kem);
        return -1; // Invalid arguments (ciphertext length)
    }

     DEBUG_LOG("KEM details - Shared secret len: " << kem->length_shared_secret);

    // Allocate memory for output using malloc
    *out_shared_secret_len = kem->length_shared_secret;
    *out_shared_secret = (uint8_t*) std::malloc(*out_shared_secret_len);

    if (!*out_shared_secret) {
        std::cerr << "Decapsulate Error: Memory allocation failed." << std::endl;
        OQS_KEM_free(kem);
        return -3; // Memory allocation failure
    }

    DEBUG_LOG("Memory allocated. Performing KEM decapsulation...");

    // Perform KEM Decapsulation
    // Note: OQS_KEM_decaps returns OQS_SUCCESS even if the decapsulation fails
    // cryptographically (i.e., wrong key or modified ciphertext). It produces *a* shared
    // secret, but it will likely be incorrect. Robust implementations often involve
    // comparing the re-encapsulated ciphertext or using authenticated encryption.
    // For this hybrid scheme, the subsequent AES-GCM decryption failure will catch issues.
    if (OQS_KEM_decaps(kem, *out_shared_secret, kem_ciphertext, recipient_secret_key) != OQS_SUCCESS) {
        // This path might indicate a more fundamental error in OQS or inputs,
        // not just a crypto failure.
        std::cerr << "Decapsulate Error: OQS_KEM_decaps failed (non-crypto error)." << std::endl;
        std::free(*out_shared_secret);
        *out_shared_secret = nullptr;
        OQS_KEM_free(kem);
        return -4; // OQS decapsulation failed (potentially non-crypto reason)
    }

    DEBUG_LOG("KEM decapsulation successful (crypto result validity depends on subsequent AEAD check)!");
    OQS_KEM_free(kem);
    return 0; // Success (function executed, crypto result needs AEAD check later)
}