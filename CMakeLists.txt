cmake_minimum_required(VERSION 3.15)
project(crypto_node_addons)

# Set C++ standard
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include Node-API CMake module
include(${CMAKE_JS_INC})

# Add include directories for headers
include_directories(
  ${CMAKE_SOURCE_DIR}/libs/oqs/install/include
  ${CMAKE_SOURCE_DIR}/libs/openssl/openssl-3.0/x64/include
  ${CMAKE_JS_INC}
)

# Define the kyber addon source files
set(KYBER_SOURCE_FILES
  addons/kyber_node_addon.cpp
  addons/kyber_encrypt.cpp
)

# Define the dilithium addon source files
set(DILITHIUM_SOURCE_FILES
  addons/dilithium_node_addon.cpp
  addons/dilithium_encrypt.cpp
)

# Create the Kyber Node.js addon
add_library(kyber_node_addon SHARED ${KYBER_SOURCE_FILES})
set_target_properties(kyber_node_addon PROPERTIES PREFIX "" SUFFIX ".node")

# Create the Dilithium Node.js addon
add_library(dilithium_node_addon SHARED ${DILITHIUM_SOURCE_FILES})
set_target_properties(dilithium_node_addon PROPERTIES PREFIX "" SUFFIX ".node")

# Define outputs for Kyber
if(WIN32)
  set_target_properties(kyber_node_addon PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
  set_target_properties(kyber_node_addon PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
else()
  set_target_properties(kyber_node_addon PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
endif()

# Define outputs for Dilithium
if(WIN32)
  set_target_properties(dilithium_node_addon PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
  set_target_properties(dilithium_node_addon PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
else()
  set_target_properties(dilithium_node_addon PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
endif()

# Link Kyber to required libraries
target_link_libraries(kyber_node_addon
  ${CMAKE_JS_LIB}
  ${CMAKE_SOURCE_DIR}/libs/openssl/openssl-3.0/x64/lib/libcrypto.lib
  ${CMAKE_SOURCE_DIR}/libs/openssl/openssl-3.0/x64/lib/libssl.lib
  ${CMAKE_SOURCE_DIR}/libs/oqs/install/lib/oqs.lib
)

# Link Dilithium to required libraries
target_link_libraries(dilithium_node_addon
  ${CMAKE_JS_LIB}
  ${CMAKE_SOURCE_DIR}/libs/openssl/openssl-3.0/x64/lib/libcrypto.lib
  ${CMAKE_SOURCE_DIR}/libs/openssl/openssl-3.0/x64/lib/libssl.lib
  ${CMAKE_SOURCE_DIR}/libs/oqs/install/lib/oqs.lib
)

# Install rules
install(TARGETS kyber_node_addon dilithium_node_addon DESTINATION ${CMAKE_SOURCE_DIR}/addons) 