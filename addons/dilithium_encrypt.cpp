#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <iostream>
#include <vector>

#include "../libs/oqs/install/include/oqs/oqs.h"     
#include <openssl/evp.h>
#include <openssl/err.h>
#include <openssl/rand.h>

// Enable detailed debugging
#define ENABLE_DEBUG_LOGGING 1

// Debug logging macro
#if ENABLE_DEBUG_LOGGING
    #define DEBUG_LOG(msg) std::cerr << "DEBUG: " << msg << std::endl
#else
    #define DEBUG_LOG(msg)
#endif

// Helper: Print OpenSSL errors.
static void printOpenSSLErrors() {
    unsigned long err;
    char err_buf[256];
    
    while ((err = ERR_get_error())) {
        ERR_error_string_n(err, err_buf, sizeof(err_buf));
        std::cerr << "OpenSSL Error: " << err_buf << std::endl;
    }
}

// Helper: Map a security level string to the corresponding ML-DSA algorithm.
static const char* select_dilithium_alg(const char* security_level) {
    if (std::strcmp(security_level, "2") == 0) {
        return OQS_SIG_alg_ml_dsa_44;  // ML-DSA-44 (previously Dilithium2)
    } else if (std::strcmp(security_level, "3") == 0) {
        return OQS_SIG_alg_ml_dsa_65;  // ML-DSA-65 (previously Dilithium3)
    } else if (std::strcmp(security_level, "5") == 0) {
        return OQS_SIG_alg_ml_dsa_87;  // ML-DSA-87 (previously Dilithium5)
    } else {
        return nullptr;
    }
}

// ==================== Key Generation ====================
extern "C" int GenerateKeypair(const char* security_level,
                               uint8_t** public_key, size_t* public_key_len,
                               uint8_t** secret_key, size_t* secret_key_len) {
    DEBUG_LOG("GenerateKeypair with security_level: " << security_level);
    
    const char* alg = select_dilithium_alg(security_level);
    if (alg == nullptr) {
        std::cerr << "GenerateKeypair: Invalid security level: " << security_level << std::endl;
        return -1;
    }
    
    DEBUG_LOG("Using algorithm: " << alg);
    
    OQS_SIG* sig = OQS_SIG_new(alg);
    if (sig == nullptr) {
        std::cerr << "GenerateKeypair: Failed to initialize ML-DSA-" << security_level << " signature." << std::endl;
        return -1;
    }
    
    DEBUG_LOG("OQS_SIG initialized. Public key length: " << sig->length_public_key 
          << ", Secret key length: " << sig->length_secret_key);
    
    *public_key_len = sig->length_public_key;
    *secret_key_len = sig->length_secret_key;
    *public_key = (uint8_t*) std::malloc(*public_key_len);
    *secret_key = (uint8_t*) std::malloc(*secret_key_len);
    
    if (!*public_key || !*secret_key) {
        std::cerr << "GenerateKeypair: Memory allocation failed." << std::endl;
        OQS_SIG_free(sig);
        return -1;
    }
    
    DEBUG_LOG("Memory allocated for keys. Generating keypair...");
    
    if (OQS_SIG_keypair(sig, *public_key, *secret_key) != OQS_SUCCESS) {
        std::cerr << "GenerateKeypair: Keypair generation failed." << std::endl;
        std::free(*public_key);
        std::free(*secret_key);
        OQS_SIG_free(sig);
        return -1;
    }
    
    DEBUG_LOG("Keypair generation successful!");
    OQS_SIG_free(sig);
    return 0; // success
}

// ==================== Sign Function ====================
extern "C" int Sign(const char* security_level,
                    const uint8_t* secret_key, size_t secret_key_len,
                    const uint8_t* message, size_t message_len,
                    uint8_t** signature, size_t* signature_len) {
    if (!security_level || !secret_key || !message || !signature || !signature_len) {
        std::cerr << "Sign: Null input parameters" << std::endl;
        return -1;
    }

    DEBUG_LOG("Starting Sign function with security_level: " << security_level);

    // Validate message length
    if (message_len == 0) {
        std::cerr << "Sign: Empty message" << std::endl;
        return -1;
    }

    // Initialize output parameters
    *signature = nullptr;
    *signature_len = 0;

    DEBUG_LOG("Input parameters validated");
    DEBUG_LOG("security_level=" << security_level
              << ", secret_key_len=" << secret_key_len
              << ", message_len=" << message_len);
    
    const char* alg = select_dilithium_alg(security_level);
    if (alg == nullptr) {
        std::cerr << "Sign: Invalid security level: " << security_level << std::endl;
        return -1;
    }
    
    DEBUG_LOG("Selected algorithm: " << alg);

    DEBUG_LOG("Initializing SIG");
    OQS_SIG* sig = OQS_SIG_new(alg);
    if (sig == nullptr) {
        std::cerr << "Sign: Failed to initialize ML-DSA-" << security_level << " signature." << std::endl;
        return -1;
    }
    
    DEBUG_LOG("SIG initialized, secret key length: " << sig->length_secret_key);
    
    if (secret_key_len != sig->length_secret_key) {
        std::cerr << "Sign: Invalid secret key length." << std::endl;
        std::cerr << "  Expected: " << sig->length_secret_key << " bytes" << std::endl;
        std::cerr << "  Received: " << secret_key_len << " bytes" << std::endl;
        OQS_SIG_free(sig);
        return -1;
    }
    
    DEBUG_LOG("Secret key length verified, preparing for signing");
    
    try {
        // Allocate memory for signature
        size_t max_sig_len = sig->length_signature;
        *signature = (uint8_t*) std::malloc(max_sig_len);
        if (!*signature) {
            std::cerr << "Sign: Memory allocation for signature failed." << std::endl;
            OQS_SIG_free(sig);
            return -1;
        }
        
        DEBUG_LOG("Memory allocated for signature, calling OQS_SIG_sign");
        
        // Sign the message
        if (OQS_SIG_sign(sig, *signature, signature_len, message, message_len, secret_key) != OQS_SUCCESS) {
            std::cerr << "Sign: Signature generation failed." << std::endl;
            std::free(*signature);
            *signature = nullptr;
            OQS_SIG_free(sig);
            return -1;
        }
        
        DEBUG_LOG("Signature generation successful!");
        DEBUG_LOG("Signature size: " << *signature_len << " bytes");
        
        OQS_SIG_free(sig);
        return 0; // success
    } catch (const std::exception& e) {
        std::cerr << "Exception caught in Sign: " << e.what() << std::endl;
        if (*signature) {
            std::free(*signature);
            *signature = nullptr;
        }
        OQS_SIG_free(sig);
        return -1;
    } catch (...) {
        std::cerr << "Unknown exception caught in Sign" << std::endl;
        if (*signature) {
            std::free(*signature);
            *signature = nullptr;
        }
        OQS_SIG_free(sig);
        return -1;
    }
}

// ==================== Verify Function ====================
extern "C" int Verify(const char* security_level,
                      const uint8_t* public_key, size_t public_key_len,
                      const uint8_t* message, size_t message_len,
                      const uint8_t* signature, size_t signature_len) {
    if (!security_level || !public_key || !message || !signature) {
        std::cerr << "Verify: Null input parameters" << std::endl;
        return -1;
    }

    DEBUG_LOG("Starting Verify function with security_level: " << security_level);

    // Validate lengths
    if (message_len == 0) {
        std::cerr << "Verify: Empty message" << std::endl;
        return -1;
    }
    
    if (signature_len == 0) {
        std::cerr << "Verify: Empty signature" << std::endl;
        return -1;
    }

    DEBUG_LOG("Input parameters validated");
    DEBUG_LOG("security_level=" << security_level
              << ", public_key_len=" << public_key_len
              << ", message_len=" << message_len
              << ", signature_len=" << signature_len);
    
    const char* alg = select_dilithium_alg(security_level);
    if (alg == nullptr) {
        std::cerr << "Verify: Invalid security level: " << security_level << std::endl;
        return -1;
    }
    
    DEBUG_LOG("Selected algorithm: " << alg);

    DEBUG_LOG("Initializing SIG");
    OQS_SIG* sig = OQS_SIG_new(alg);
    if (sig == nullptr) {
        std::cerr << "Verify: Failed to initialize ML-DSA-" << security_level << " signature." << std::endl;
        return -1;
    }
    
    DEBUG_LOG("SIG initialized, public key length: " << sig->length_public_key);
    
    if (public_key_len != sig->length_public_key) {
        std::cerr << "Verify: Invalid public key length." << std::endl;
        std::cerr << "  Expected: " << sig->length_public_key << " bytes" << std::endl;
        std::cerr << "  Received: " << public_key_len << " bytes" << std::endl;
        OQS_SIG_free(sig);
        return -1;
    }
    
    DEBUG_LOG("Public key length verified, preparing for verification");
    
    try {
        // Verify the signature
        int result = OQS_SIG_verify(sig, message, message_len, signature, signature_len, public_key);
        
        OQS_SIG_free(sig);
        
        if (result != OQS_SUCCESS) {
            DEBUG_LOG("Signature verification failed!");
            return 1; // Invalid signature (but not an error in the verification process)
        }
        
        DEBUG_LOG("Signature verification successful!");
        return 0; // Valid signature
    } catch (const std::exception& e) {
        std::cerr << "Exception caught in Verify: " << e.what() << std::endl;
        OQS_SIG_free(sig);
        return -1;
    } catch (...) {
        std::cerr << "Unknown exception caught in Verify" << std::endl;
        OQS_SIG_free(sig);
        return -1;
    }
} 