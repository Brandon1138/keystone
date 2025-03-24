cmake_minimum_required(VERSION 3.15)
project(kyber_node_addon)

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

# Define the main addon source files
set(SOURCE_FILES
  addons/kyber_node_addon.cpp
  addons/kyber_encrypt.cpp
)

# Create the Node.js addon
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Define outputs
if(WIN32)
  set_target_properties(${PROJECT_NAME} PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
  set_target_properties(${PROJECT_NAME} PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
else()
  set_target_properties(${PROJECT_NAME} PROPERTIES LIBRARY_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/build/Release")
endif()

# Link to required libraries
target_link_libraries(${PROJECT_NAME}
  ${CMAKE_JS_LIB}
  ${CMAKE_SOURCE_DIR}/libs/openssl/openssl-3.0/x64/lib/libcrypto.lib
  ${CMAKE_SOURCE_DIR}/libs/openssl/openssl-3.0/x64/lib/libssl.lib
  ${CMAKE_SOURCE_DIR}/libs/oqs/install/lib/oqs.lib
)

# Install rules
install(TARGETS ${PROJECT_NAME} DESTINATION ${CMAKE_SOURCE_DIR}/addons) 