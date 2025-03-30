// dilithium_node_addon.cpp
#include <napi.h>
#include <string>
#include <vector>
#include <cstdlib>
#include <cstring>
#include <iostream>

// The dilithium_encrypt library provides these extern "C" functions:
extern "C" {

// Each function allocates memory for output buffers using malloc().
int GenerateKeypair(const char* security_level,
                    uint8_t** public_key, size_t* public_key_len,
                    uint8_t** secret_key, size_t* secret_key_len);

int Sign(const char* security_level,
         const uint8_t* secret_key, size_t secret_key_len,
         const uint8_t* message, size_t message_len,
         uint8_t** signature, size_t* signature_len);

int Verify(const char* security_level,
           const uint8_t* public_key, size_t public_key_len,
           const uint8_t* message, size_t message_len,
           const uint8_t* signature, size_t signature_len);

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
        // Expect 1 argument: security_level (string: "2", "3", or "5")
        if (info.Length() < 1 || !info[0].IsString()) {
            throw Napi::TypeError::New(env, "Expected security_level string");
        }
        std::string securityLevel = info[0].As<Napi::String>();

        // Validate security level
        if (securityLevel != "2" && securityLevel != "3" && securityLevel != "5") {
            throw Napi::TypeError::New(env, "Security level must be one of: 2, 3, 5");
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
// 2) Sign Wrapper
// ------------------------------
Napi::Value SignWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        // Expect 3 arguments: security_level (string), secret_key (Buffer), message (Buffer)
        if (info.Length() < 3) {
            throw Napi::TypeError::New(env, "Expected (securityLevel, secretKey, message) arguments");
        }
        if (!info[0].IsString()) {
            throw Napi::TypeError::New(env, "securityLevel must be a string");
        }
        if (!info[1].IsBuffer() || !info[2].IsBuffer()) {
            throw Napi::TypeError::New(env, "secretKey and message must be Buffers");
        }

        std::string securityLevel = info[0].As<Napi::String>();
        
        // Validate security level
        if (securityLevel != "2" && securityLevel != "3" && securityLevel != "5") {
            throw Napi::TypeError::New(env, "Security level must be one of: 2, 3, 5");
        }

        Napi::Buffer<uint8_t> jsSecKey = info[1].As<Napi::Buffer<uint8_t>>();
        Napi::Buffer<uint8_t> jsMessage = info[2].As<Napi::Buffer<uint8_t>>();

        // Validate buffer sizes
        if (jsSecKey.Length() == 0) {
            throw Napi::Error::New(env, "Secret key buffer is empty");
        }
        
        if (jsMessage.Length() == 0) {
            throw Napi::Error::New(env, "Message buffer is empty");
        }
        
        // Check expected secret key sizes based on security level
        size_t expectedSecKeySize = 0;
        if (securityLevel == "2") expectedSecKeySize = 2560;      // ML-DSA-44 secret key size
        else if (securityLevel == "3") expectedSecKeySize = 4032; // ML-DSA-65 secret key size
        else if (securityLevel == "5") expectedSecKeySize = 4896; // ML-DSA-87 secret key size
        
        if (jsSecKey.Length() != expectedSecKeySize) {
            std::string errorMsg = "Invalid secret key size for security level " + securityLevel + 
                                 ". Expected: " + std::to_string(expectedSecKeySize) + 
                                 ", Actual: " + std::to_string(jsSecKey.Length());
            throw Napi::Error::New(env, errorMsg);
        }

        // Prepare output buffer for signature
        uint8_t* outSignature = nullptr;
        size_t outSignatureLen = 0;

        int ret = Sign(
            securityLevel.c_str(),
            jsSecKey.Data(), jsSecKey.Length(),
            jsMessage.Data(), jsMessage.Length(),
            &outSignature, &outSignatureLen
        );
        
        if (ret != 0 || !outSignature || outSignatureLen == 0) {
            std::string errorMsg = "Sign failed with code: " + std::to_string(ret);
            throw Napi::Error::New(env, errorMsg);
        }

        // Convert to a Node Buffer
        Napi::Buffer<uint8_t> jsSignature = Napi::Buffer<uint8_t>::Copy(env, outSignature, outSignatureLen);

        // Free the allocated memory
        free_buffer(outSignature);

        // Return the signature Buffer
        return jsSignature;
    } catch (const Napi::Error& e) {
        (void)e; // Suppress unused variable warning
        // Just rethrow Napi errors
        throw;
    } catch (const std::exception& e) {
        (void)e; // Suppress unused variable warning
        // Convert std::exception to Napi::Error
        throw Napi::Error::New(env, "Sign exception: " + std::string(e.what()));
    } catch (...) {
        // Handle any other exceptions
        throw Napi::Error::New(env, "Unknown error in Sign");
    }
}

// ------------------------------
// 3) Verify Wrapper
// ------------------------------
Napi::Value VerifyWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        // Expect 4 arguments: security_level (string), publicKey (Buffer), message (Buffer), signature (Buffer)
        if (info.Length() < 4) {
            throw Napi::TypeError::New(env, "Expected (securityLevel, publicKey, message, signature)");
        }
        
        if (!info[0].IsString()) {
            throw Napi::TypeError::New(env, "securityLevel must be a string");
        }
        
        if (!info[1].IsBuffer() || !info[2].IsBuffer() || !info[3].IsBuffer()) {
            throw Napi::TypeError::New(env, "publicKey, message, and signature must be Buffers");
        }

        std::string securityLevel = info[0].As<Napi::String>();
        
        // Validate security level
        if (securityLevel != "2" && securityLevel != "3" && securityLevel != "5") {
            throw Napi::TypeError::New(env, "Security level must be one of: 2, 3, 5");
        }
        
        Napi::Buffer<uint8_t> jsPubKey = info[1].As<Napi::Buffer<uint8_t>>();
        Napi::Buffer<uint8_t> jsMessage = info[2].As<Napi::Buffer<uint8_t>>();
        Napi::Buffer<uint8_t> jsSignature = info[3].As<Napi::Buffer<uint8_t>>();

        // Validate buffer sizes
        if (jsPubKey.Length() == 0) {
            throw Napi::Error::New(env, "Public key buffer is empty");
        }
        
        if (jsMessage.Length() == 0) {
            throw Napi::Error::New(env, "Message buffer is empty");
        }
        
        if (jsSignature.Length() == 0) {
            throw Napi::Error::New(env, "Signature buffer is empty");
        }
        
        // Check expected public key sizes based on security level
        size_t expectedPubKeySize = 0;
        if (securityLevel == "2") expectedPubKeySize = 1312;      // ML-DSA-44 public key size
        else if (securityLevel == "3") expectedPubKeySize = 1952; // ML-DSA-65 public key size
        else if (securityLevel == "5") expectedPubKeySize = 2592; // ML-DSA-87 public key size
        
        if (jsPubKey.Length() != expectedPubKeySize) {
            std::string errorMsg = "Invalid public key size for security level " + securityLevel + 
                                 ". Expected: " + std::to_string(expectedPubKeySize) + 
                                 ", Actual: " + std::to_string(jsPubKey.Length());
            throw Napi::Error::New(env, errorMsg);
        }

        int ret = Verify(
            securityLevel.c_str(),
            jsPubKey.Data(), jsPubKey.Length(),
            jsMessage.Data(), jsMessage.Length(),
            jsSignature.Data(), jsSignature.Length()
        );
        
        // Return a boolean indicating if verification was successful
        // ret == 0: Valid signature
        // ret == 1: Invalid signature (not an error)
        // ret < 0: Error occurred during verification
        if (ret < 0) {
            std::string errorMsg = "Verify failed with code: " + std::to_string(ret);
            throw Napi::Error::New(env, errorMsg);
        }
        
        // Return a boolean (true = valid signature, false = invalid signature)
        return Napi::Boolean::New(env, ret == 0);
    } catch (const Napi::Error& e) {
        (void)e; // Suppress unused variable warning
        // Just rethrow Napi errors
        throw;
    } catch (const std::exception& e) {
        (void)e; // Suppress unused variable warning
        // Convert std::exception to Napi::Error
        throw Napi::Error::New(env, "Verify exception: " + std::string(e.what()));
    } catch (...) {
        // Handle any other exceptions
        throw Napi::Error::New(env, "Unknown error in Verify");
    }
}

// ------------------------------
// Module Initialization
// ------------------------------
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    exports.Set("generateKeypair", Napi::Function::New(env, GenerateKeypairWrapped));
    exports.Set("sign",           Napi::Function::New(env, SignWrapped));
    exports.Set("verify",         Napi::Function::New(env, VerifyWrapped));
    return exports;
}

// This macro is required to register the addon
NODE_API_MODULE(dilithium_node_addon, InitAll) 