// kyber_node_addon.cpp
#include <napi.h>    // !!!!!! TODO: npm install --save-dev cmake-js  and build a script in package.json with "build-native": "cmake-js compile"
#include <string>
#include <vector>
#include <cstdlib>
#include <cstring>
#include <iostream>

// The kyber_encrypt library provides these extern "C" functions:
extern "C" {

// Each function allocates memory for output buffers using malloc().
int GenerateKeypair(const char* security_level,
                    uint8_t** public_key, size_t* public_key_len,
                    uint8_t** secret_key, size_t* secret_key_len);

int Encrypt(const char* security_level,
            const uint8_t* recipient_public_key, size_t recipient_public_key_len,
            const uint8_t* plaintext, size_t plaintext_len,
            uint8_t** out_ciphertext, size_t* out_ciphertext_len);

int Decrypt(const char* security_level,
            const uint8_t* recipient_secret_key, size_t recipient_secret_key_len,
            const uint8_t* ciphertext, size_t ciphertext_len,
            uint8_t** out_plaintext, size_t* out_plaintext_len);

} // extern "C"

// Helper to free the memory allocated in C. If you do not free it, you risk leaks.
static inline void free_buffer(uint8_t* ptr) {
    if (ptr) {
        std::free(ptr);
    }
}

// ------------------------------
// 1) GenerateKeypair Wrapper
// ------------------------------
Napi::Value GenerateKeypairWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        // Expect 1 argument: security_level (string: "512", "768", or "1024")
        if (info.Length() < 1 || !info[0].IsString()) {
            throw Napi::TypeError::New(env, "Expected security_level string");
        }
        std::string securityLevel = info[0].As<Napi::String>();

        // Validate security level
        if (securityLevel != "512" && securityLevel != "768" && securityLevel != "1024") {
            throw Napi::TypeError::New(env, "Security level must be one of: 512, 768, 1024");
        }

        // Prepare output buffers for the C function.
        uint8_t* pubKey = nullptr;
        size_t pubLen = 0;
        uint8_t* secKey = nullptr;
        size_t secLen = 0;

        int ret = GenerateKeypair(securityLevel.c_str(), &pubKey, &pubLen, &secKey, &secLen);
        if (ret != 0 || !pubKey || !secKey) {
            std::string errorMsg = "GenerateKeypair failed with code: " + std::to_string(ret);
            throw Napi::Error::New(env, errorMsg);
        }

        // Convert them to Node Buffers.
        Napi::Buffer<uint8_t> jsPubKey = Napi::Buffer<uint8_t>::Copy(env, pubKey, pubLen);
        Napi::Buffer<uint8_t> jsSecKey = Napi::Buffer<uint8_t>::Copy(env, secKey, secLen);

        // The library allocated memory for pubKey & secKey with malloc, so we free them now.
        free_buffer(pubKey);
        free_buffer(secKey);

        // Return an object: { publicKey: Buffer, secretKey: Buffer }
        Napi::Object result = Napi::Object::New(env);
        result.Set("publicKey", jsPubKey);
        result.Set("secretKey", jsSecKey);
        return result;
    } catch (const Napi::Error& e) {
        (void)e; // Suppress unused variable warning
        // Just rethrow Napi errors
        throw;
    } catch (const std::exception& e) {
        (void)e; // Suppress unused variable warning
        // Convert std::exception to Napi::Error
        throw Napi::Error::New(env, "GenerateKeypair exception: " + std::string(e.what()));
    } catch (...) {
        // Handle any other exceptions
        throw Napi::Error::New(env, "Unknown error in GenerateKeypair");
    }
}

// ------------------------------
// 2) Encrypt Wrapper
// ------------------------------
Napi::Value EncryptWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        // Expect 3 arguments: security_level (string), recipient_public_key (Buffer), plaintext (Buffer)
        if (info.Length() < 3) {
            throw Napi::TypeError::New(env, "Expected (securityLevel, publicKey, plaintext) arguments");
        }
        if (!info[0].IsString()) {
            throw Napi::TypeError::New(env, "securityLevel must be a string");
        }
        if (!info[1].IsBuffer() || !info[2].IsBuffer()) {
            throw Napi::TypeError::New(env, "publicKey and plaintext must be Buffers");
        }

        std::string securityLevel = info[0].As<Napi::String>();
        
        // Validate security level
        if (securityLevel != "512" && securityLevel != "768" && securityLevel != "1024") {
            throw Napi::TypeError::New(env, "Security level must be one of: 512, 768, 1024");
        }

        Napi::Buffer<uint8_t> jsPubKey = info[1].As<Napi::Buffer<uint8_t>>();
        Napi::Buffer<uint8_t> jsPlaintext = info[2].As<Napi::Buffer<uint8_t>>();

        // Validate buffer sizes
        if (jsPubKey.Length() == 0) {
            throw Napi::Error::New(env, "Public key buffer is empty");
        }
        
        if (jsPlaintext.Length() == 0) {
            throw Napi::Error::New(env, "Plaintext buffer is empty");
        }
        
        // Check expected public key sizes based on security level
        size_t expectedPubKeySize = 0;
        if (securityLevel == "512") expectedPubKeySize = 800;
        else if (securityLevel == "768") expectedPubKeySize = 1184;
        else if (securityLevel == "1024") expectedPubKeySize = 1568;
        
        if (jsPubKey.Length() != expectedPubKeySize) {
            std::string errorMsg = "Invalid public key size for security level " + securityLevel + 
                                 ". Expected: " + std::to_string(expectedPubKeySize) + 
                                 ", Actual: " + std::to_string(jsPubKey.Length());
            throw Napi::Error::New(env, errorMsg);
        }

        // Prepare output buffer for ciphertext
        uint8_t* outCipher = nullptr;
        size_t outCipherLen = 0;

        int ret = Encrypt(
            securityLevel.c_str(),
            jsPubKey.Data(), jsPubKey.Length(),
            jsPlaintext.Data(), jsPlaintext.Length(),
            &outCipher, &outCipherLen
        );
        
        if (ret != 0 || !outCipher || outCipherLen == 0) {
            std::string errorMsg = "Encrypt failed with code: " + std::to_string(ret);
            throw Napi::Error::New(env, errorMsg);
        }

        // Convert to a Node Buffer
        Napi::Buffer<uint8_t> jsCipher = Napi::Buffer<uint8_t>::Copy(env, outCipher, outCipherLen);

        // Free the allocated memory
        free_buffer(outCipher);

        // Return the ciphertext Buffer
        return jsCipher;
    } catch (const Napi::Error& e) {
        (void)e; // Suppress unused variable warning
        // Just rethrow Napi errors
        throw;
    } catch (const std::exception& e) {
        (void)e; // Suppress unused variable warning
        // Convert std::exception to Napi::Error
        throw Napi::Error::New(env, "Encrypt exception: " + std::string(e.what()));
    } catch (...) {
        // Handle any other exceptions
        throw Napi::Error::New(env, "Unknown error in Encrypt");
    }
}

// ------------------------------
// 3) Decrypt Wrapper
// ------------------------------
Napi::Value DecryptWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        // Expect 3 arguments: security_level (string), secretKey (Buffer), ciphertext (Buffer)
        if (info.Length() < 3) {
            throw Napi::TypeError::New(env, "Expected (securityLevel, secretKey, ciphertext)");
        }
        if (!info[0].IsString()) {
            throw Napi::TypeError::New(env, "securityLevel must be a string");
        }
        if (!info[1].IsBuffer() || !info[2].IsBuffer()) {
            throw Napi::TypeError::New(env, "secretKey and ciphertext must be Buffers");
        }

        std::string securityLevel = info[0].As<Napi::String>();
        
        // Validate security level
        if (securityLevel != "512" && securityLevel != "768" && securityLevel != "1024") {
            throw Napi::TypeError::New(env, "Security level must be one of: 512, 768, 1024");
        }
        
        Napi::Buffer<uint8_t> jsSecKey = info[1].As<Napi::Buffer<uint8_t>>();
        Napi::Buffer<uint8_t> jsCipher = info[2].As<Napi::Buffer<uint8_t>>();

        // Validate buffer sizes
        if (jsSecKey.Length() == 0) {
            throw Napi::Error::New(env, "Secret key buffer is empty");
        }
        
        if (jsCipher.Length() == 0) {
            throw Napi::Error::New(env, "Ciphertext buffer is empty");
        }
        
        // Check expected secret key sizes based on security level
        size_t expectedSecKeySize = 0;
        if (securityLevel == "512") expectedSecKeySize = 1632;
        else if (securityLevel == "768") expectedSecKeySize = 2400;
        else if (securityLevel == "1024") expectedSecKeySize = 3168;
        
        if (jsSecKey.Length() != expectedSecKeySize) {
            std::string errorMsg = "Invalid secret key size for security level " + securityLevel + 
                                 ". Expected: " + std::to_string(expectedSecKeySize) + 
                                 ", Actual: " + std::to_string(jsSecKey.Length());
            throw Napi::Error::New(env, errorMsg);
        }

        uint8_t* outPlain = nullptr;
        size_t outPlainLen = 0;

        int ret = Decrypt(
            securityLevel.c_str(),
            jsSecKey.Data(), jsSecKey.Length(),
            jsCipher.Data(), jsCipher.Length(),
            &outPlain, &outPlainLen
        );
        
        if (ret != 0 || !outPlain) {
            std::string errorMsg = "Decrypt failed with code: " + std::to_string(ret);
            throw Napi::Error::New(env, errorMsg);
        }

        // Convert to Node Buffer
        Napi::Buffer<uint8_t> jsPlain = Napi::Buffer<uint8_t>::Copy(env, outPlain, outPlainLen);

        // Free the allocated memory
        free_buffer(outPlain);

        // Return the plaintext Buffer
        return jsPlain;
    } catch (const Napi::Error& e) {
        (void)e; // Suppress unused variable warning
        // Just rethrow Napi errors
        throw;
    } catch (const std::exception& e) {
        (void)e; // Suppress unused variable warning
        // Convert std::exception to Napi::Error
        throw Napi::Error::New(env, "Decrypt exception: " + std::string(e.what()));
    } catch (...) {
        // Handle any other exceptions
        throw Napi::Error::New(env, "Unknown error in Decrypt");
    }
}

// ------------------------------
// Module Initialization
// ------------------------------
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    exports.Set("generateKeypair", Napi::Function::New(env, GenerateKeypairWrapped));
    exports.Set("encrypt",        Napi::Function::New(env, EncryptWrapped));
    exports.Set("decrypt",        Napi::Function::New(env, DecryptWrapped));
    return exports;
}

// This macro is required to register the addon
NODE_API_MODULE(kyber_node_addon, InitAll)
