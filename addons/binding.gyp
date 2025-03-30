{
  "targets": [
    {
      "target_name": "kyber_node_addon",
      "sources": [
        "kyber_node_addon.cpp",
        "kyber_encrypt.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "../../external/libs/oqs/install/include",
        "../../external/libs/oqs/install/include/oqs",
        "../../external/libs/openssl/openssl-3.0/x64/include"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "../../external/libs/oqs/install/lib/oqs.lib",
            "../../external/libs/openssl/openssl-3.0/x64/lib/libcrypto.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/EHsc"],
              "AdditionalIncludeDirectories": [
                "<!@(node -p \"require('node-addon-api').include\")",
                "../../external/libs/oqs/install/include",
                "../../external/libs/oqs/install/include/oqs",
                "../../external/libs/openssl/openssl-3.0/x64/include"
              ]
            }
          }
        }],
        ["OS=='linux'", {
          "libraries": [
            "-L../../external/libs/oqs/install/lib",
            "-L../../external/libs/openssl/openssl-3.0/lib",
            "-loqs",
            "-lcrypto"
          ],
          "cflags": ["-fexceptions"],
          "cflags_cc": ["-fexceptions"]
        }],
        ["OS=='mac'", {
          "libraries": [
            "-L../../external/libs/oqs/install/lib",
            "-L../../external/libs/openssl/openssl-3.0/lib",
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
        "dilithium_node_addon.cpp",
        "dilithium_encrypt.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "../../external/libs/oqs/install/include",
        "../../external/libs/oqs/install/include/oqs",
        "../../external/libs/openssl/openssl-3.0/x64/include"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "../../external/libs/oqs/install/lib/oqs.lib",
            "../../external/libs/openssl/openssl-3.0/x64/lib/libcrypto.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/EHsc"],
              "AdditionalIncludeDirectories": [
                "<!@(node -p \"require('node-addon-api').include\")",
                "../../external/libs/oqs/install/include",
                "../../external/libs/oqs/install/include/oqs",
                "../../external/libs/openssl/openssl-3.0/x64/include"
              ]
            }
          }
        }],
        ["OS=='linux'", {
          "libraries": [
            "-L../../external/libs/oqs/install/lib",
            "-L../../external/libs/openssl/openssl-3.0/lib",
            "-loqs",
            "-lcrypto"
          ],
          "cflags": ["-fexceptions"],
          "cflags_cc": ["-fexceptions"]
        }],
        ["OS=='mac'", {
          "libraries": [
            "-L../../external/libs/oqs/install/lib",
            "-L../../external/libs/openssl/openssl-3.0/lib",
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