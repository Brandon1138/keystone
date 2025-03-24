{
  "targets": [
    {
      "target_name": "kyber_node_addon",
      "sources": [
        "addons/kyber_node_addon.cpp",
        "addons/kyber_encrypt.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "libs/oqs/install/include",
        "libs/openssl/openssl-3.0/x64/include"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "../libs/oqs/install/lib/oqs.lib",
            "../libs/openssl/openssl-3.0/x64/lib/libcrypto.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/EHsc"]
            }
          }
        }],
        ["OS=='linux'", {
          "libraries": [
            "-L../libs/oqs/install/lib",
            "-L../libs/openssl/openssl-3.0/lib",
            "-loqs",
            "-lcrypto"
          ],
          "cflags": ["-fexceptions"],
          "cflags_cc": ["-fexceptions"]
        }],
        ["OS=='mac'", {
          "libraries": [
            "-L../libs/oqs/install/lib",
            "-L../libs/openssl/openssl-3.0/lib",
            "-loqs",
            "-lcrypto"
          ],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
          }
        }]
      ]
    },
    {
      "target_name": "dilithium_node_addon",
      "sources": [
        "addons/dilithium_node_addon.cpp",
        "addons/dilithium_encrypt.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "libs/oqs/install/include",
        "libs/openssl/openssl-3.0/x64/include"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "../libs/oqs/install/lib/oqs.lib",
            "../libs/openssl/openssl-3.0/x64/lib/libcrypto.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/EHsc"]
            }
          }
        }],
        ["OS=='linux'", {
          "libraries": [
            "-L../libs/oqs/install/lib",
            "-L../libs/openssl/openssl-3.0/lib",
            "-loqs",
            "-lcrypto"
          ],
          "cflags": ["-fexceptions"],
          "cflags_cc": ["-fexceptions"]
        }],
        ["OS=='mac'", {
          "libraries": [
            "-L../libs/oqs/install/lib",
            "-L../libs/openssl/openssl-3.0/lib",
            "-loqs",
            "-lcrypto"
          ],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
          }
        }]
      ]
    }
  ]
} 