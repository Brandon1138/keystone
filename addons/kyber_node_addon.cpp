#include <napi.h>
#include <string>
#include <vector>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <stdexcept> // Include for std::runtime_error

// Extern "C" declarations for the C++ functions in kyber_encrypt.cpp
extern "C" {

int GenerateKeypair(const char* security_level,
                    uint8_t** public_key, size_t* public_key_len,
                    uint8_t** secret_key, size_t* secret_key_len);

// Updated function names
int Encapsulate(const char* security_level,
                const uint8_t* recipient_public_key, size_t recipient_public_key_len,
                uint8_t** out_kem_ciphertext, size_t* out_kem_ciphertext_len,
                uint8_t** out_shared_secret, size_t* out_shared_secret_len);

int Decapsulate(const char* security_level,
                const uint8_t* recipient_secret_key, size_t recipient_secret_key_len,
                const uint8_t* kem_ciphertext, size_t kem_ciphertext_len,
                uint8_t** out_shared_secret, size_t* out_shared_secret_len);

} // extern "C"

// Helper to free memory allocated by C++ functions (Unchanged)
static inline void free_buffer(uint8_t* ptr) {
    if (ptr) {
        std::free(ptr);
    }
}

// Helper to map C++ return codes to error messages
static std::string getErrorMessage(int ret, const std::string& funcName) {
    std::string baseMsg = funcName + " failed with code " + std::to_string(ret);
    switch (ret) {
        case -1: return baseMsg + ": Invalid arguments (null, bad sec level, or wrong key/ct length)";
        case -2: return baseMsg + ": KEM algorithm initialization failed";
        case -3: return baseMsg + ": Memory allocation failed";
        case -4: return baseMsg + ": OQS operation failed (keypair/encaps/decaps)";
        default: return baseMsg + ": Unknown error";
    }
}

// --- N-API Wrappers ---

// 1) GenerateKeypair Wrapper (Mostly Unchanged, added error mapping)
Napi::Value GenerateKeypairWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        if (info.Length() < 1 || !info[0].IsString()) {
            throw Napi::TypeError::New(env, "Expected security_level string (512, 768, 1024)");
        }
        std::string securityLevel = info[0].As<Napi::String>();

        // Validate security level (more robust)
        if (securityLevel != "512" && securityLevel != "768" && securityLevel != "1024") {
            throw Napi::TypeError::New(env, "Security level must be one of: 512, 768, 1024");
        }

        uint8_t* pubKey = nullptr; size_t pubLen = 0;
        uint8_t* secKey = nullptr; size_t secLen = 0;

        int ret = GenerateKeypair(securityLevel.c_str(), &pubKey, &pubLen, &secKey, &secLen);

        // Use helper for error messages
        if (ret != 0 || !pubKey || !secKey) {
            // Clean up potentially allocated memory even on failure before throwing
             free_buffer(pubKey);
             free_buffer(secKey);
            throw Napi::Error::New(env, getErrorMessage(ret, "GenerateKeypair"));
        }

        // Create Buffers *before* freeing C++ memory
        Napi::Buffer<uint8_t> jsPubKey = Napi::Buffer<uint8_t>::Copy(env, pubKey, pubLen);
        Napi::Buffer<uint8_t> jsSecKey = Napi::Buffer<uint8_t>::Copy(env, secKey, secLen);

        // Free C++ memory
        free_buffer(pubKey);
        free_buffer(secKey);

        Napi::Object result = Napi::Object::New(env);
        result.Set("publicKey", jsPubKey);
        result.Set("secretKey", jsSecKey);
        return result;

    } catch (const Napi::Error& e) { throw e; } // Re-throw Napi errors
      catch (const std::exception& e) { throw Napi::Error::New(env, "GenerateKeypairWrapped C++ exception: " + std::string(e.what())); }
      catch (...) { throw Napi::Error::New(env, "Unknown error in GenerateKeypairWrapped"); }
}

// 2) Encapsulate Wrapper (Replaces EncryptWrapped)
Napi::Value EncapsulateWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        if (info.Length() < 2) {
            throw Napi::TypeError::New(env, "Expected (securityLevel, publicKey) arguments");
        }
        if (!info[0].IsString()) {
            throw Napi::TypeError::New(env, "securityLevel must be a string (512, 768, 1024)");
        }
        if (!info[1].IsBuffer()) {
            throw Napi::TypeError::New(env, "publicKey must be a Buffer");
        }

        std::string securityLevel = info[0].As<Napi::String>();
        if (securityLevel != "512" && securityLevel != "768" && securityLevel != "1024") {
            throw Napi::TypeError::New(env, "Security level must be one of: 512, 768, 1024");
        }

        Napi::Buffer<uint8_t> jsPubKey = info[1].As<Napi::Buffer<uint8_t>>();
        if (jsPubKey.Length() == 0) {
            throw Napi::Error::New(env, "Public key buffer cannot be empty");
        }

        // Output pointers for C++ function
        uint8_t* kemCiphertext = nullptr; size_t kemCiphertextLen = 0;
        uint8_t* sharedSecret = nullptr; size_t sharedSecretLen = 0;

        int ret = Encapsulate(
            securityLevel.c_str(),
            jsPubKey.Data(), jsPubKey.Length(),
            &kemCiphertext, &kemCiphertextLen,
            &sharedSecret, &sharedSecretLen
        );

        // Use helper for error messages
        if (ret != 0 || !kemCiphertext || !sharedSecret) {
            // Clean up potentially allocated memory even on failure before throwing
             free_buffer(kemCiphertext);
             free_buffer(sharedSecret);
            throw Napi::Error::New(env, getErrorMessage(ret, "Encapsulate"));
        }

        // Create Buffers *before* freeing C++ memory
        Napi::Buffer<uint8_t> jsKemCiphertext = Napi::Buffer<uint8_t>::Copy(env, kemCiphertext, kemCiphertextLen);
        Napi::Buffer<uint8_t> jsSharedSecret = Napi::Buffer<uint8_t>::Copy(env, sharedSecret, sharedSecretLen);

        // Free C++ memory
        free_buffer(kemCiphertext);
        free_buffer(sharedSecret);

        // Return an object containing both results
        Napi::Object result = Napi::Object::New(env);
        result.Set("kemCiphertext", jsKemCiphertext);
        result.Set("sharedSecret", jsSharedSecret);
        return result;

    } catch (const Napi::Error& e) { throw e; } // Re-throw Napi errors
      catch (const std::exception& e) { throw Napi::Error::New(env, "EncapsulateWrapped C++ exception: " + std::string(e.what())); }
      catch (...) { throw Napi::Error::New(env, "Unknown error in EncapsulateWrapped"); }
}


// 3) Decapsulate Wrapper (Replaces DecryptWrapped)
Napi::Value DecapsulateWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        if (info.Length() < 3) {
            throw Napi::TypeError::New(env, "Expected (securityLevel, secretKey, kemCiphertext)");
        }
        if (!info[0].IsString()) {
            throw Napi::TypeError::New(env, "securityLevel must be a string (512, 768, 1024)");
        }
        if (!info[1].IsBuffer() || !info[2].IsBuffer()) {
            throw Napi::TypeError::New(env, "secretKey and kemCiphertext must be Buffers");
        }

        std::string securityLevel = info[0].As<Napi::String>();
        if (securityLevel != "512" && securityLevel != "768" && securityLevel != "1024") {
            throw Napi::TypeError::New(env, "Security level must be one of: 512, 768, 1024");
        }

        Napi::Buffer<uint8_t> jsSecKey = info[1].As<Napi::Buffer<uint8_t>>();
        Napi::Buffer<uint8_t> jsKemCiphertext = info[2].As<Napi::Buffer<uint8_t>>();

        if (jsSecKey.Length() == 0) { throw Napi::Error::New(env, "Secret key buffer cannot be empty"); }
        if (jsKemCiphertext.Length() == 0) { throw Napi::Error::New(env, "KEM ciphertext buffer cannot be empty"); }

        // Output pointer for C++ function
        uint8_t* sharedSecret = nullptr; size_t sharedSecretLen = 0;

        int ret = Decapsulate(
            securityLevel.c_str(),
            jsSecKey.Data(), jsSecKey.Length(),
            jsKemCiphertext.Data(), jsKemCiphertext.Length(),
            &sharedSecret, &sharedSecretLen
        );

        // Use helper for error messages
        if (ret != 0 || !sharedSecret) {
             // Clean up potentially allocated memory even on failure before throwing
             free_buffer(sharedSecret);
             // Note: ret=0 is success, but a negative value indicates an error.
             // Decapsulation failure due to bad key/ciphertext doesn't return error code here,
             // it relies on subsequent AEAD check failure.
            if (ret != 0) { // Only throw if OQS itself reported an error (ret < 0)
                 throw Napi::Error::New(env, getErrorMessage(ret, "Decapsulate"));
            } else if (!sharedSecret) {
                // Should not happen if ret=0, but as a safeguard
                 throw Napi::Error::New(env, "Decapsulate failed: Shared secret pointer is null despite success code.");
            }
             // If ret == 0 and sharedSecret is valid, proceed even if crypto might fail later.
        }

        // Create Buffer *before* freeing C++ memory
        Napi::Buffer<uint8_t> jsSharedSecret = Napi::Buffer<uint8_t>::Copy(env, sharedSecret, sharedSecretLen);

        // Free C++ memory
        free_buffer(sharedSecret);

        // Return the shared secret Buffer directly
        return jsSharedSecret;

    } catch (const Napi::Error& e) { throw e; } // Re-throw Napi errors
      catch (const std::exception& e) { throw Napi::Error::New(env, "DecapsulateWrapped C++ exception: " + std::string(e.what())); }
      catch (...) { throw Napi::Error::New(env, "Unknown error in DecapsulateWrapped"); }
}


// 4) Module Initialization (Updated Export Names)
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    exports.Set("generateKeypair", Napi::Function::New(env, GenerateKeypairWrapped));
    exports.Set("encapsulate", Napi::Function::New(env, EncapsulateWrapped)); // Changed name
    exports.Set("decapsulate", Napi::Function::New(env, DecapsulateWrapped)); // Changed name
    return exports;
}

// Register the addon
NODE_API_MODULE(kyber_node_addon, InitAll)