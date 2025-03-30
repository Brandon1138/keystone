# PowerShell script to set up the PQC libraries for PQCBenchGUI4

# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "Setting up PQC libraries for PQCBenchGUI4..." -ForegroundColor Green

# Create directories
Write-Host "Creating directories..." -ForegroundColor Cyan
if (-not (Test-Path -Path "libs")) {
    New-Item -Path "libs" -ItemType Directory | Out-Null
}

# Clone and build liboqs
Write-Host "Setting up liboqs..." -ForegroundColor Cyan
if (-not (Test-Path -Path "libs/oqs")) {
    Write-Host "Cloning liboqs..." -ForegroundColor Yellow
    git clone --depth 1 https://github.com/open-quantum-safe/liboqs.git libs/oqs
} else {
    Write-Host "liboqs already exists, skipping clone..." -ForegroundColor Yellow
}

# Create build directory for liboqs
if (-not (Test-Path -Path "libs/oqs/build")) {
    New-Item -Path "libs/oqs/build" -ItemType Directory | Out-Null
}

# Build liboqs
Write-Host "Building liboqs..." -ForegroundColor Yellow
Push-Location -Path "libs/oqs/build"
cmake -G "Visual Studio 17 2022" -A x64 -DBUILD_SHARED_LIBS=ON -DOQS_ALGS=NIST_R3 ..
if ($LASTEXITCODE -ne 0) {
    Write-Host "CMake configuration failed!" -ForegroundColor Red
    exit 1
}

cmake --build . --config Release
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Install liboqs
Write-Host "Installing liboqs..." -ForegroundColor Yellow
cmake --install . --prefix ../install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installation failed!" -ForegroundColor Red
    exit 1
}
Pop-Location

# Download and extract OpenSSL
Write-Host "Setting up OpenSSL..." -ForegroundColor Cyan
if (-not (Test-Path -Path "libs/openssl")) {
    New-Item -Path "libs/openssl" -ItemType Directory | Out-Null
}

if (-not (Test-Path -Path "libs/openssl/openssl-3.0.16.zip")) {
    Write-Host "Downloading OpenSSL..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://download.firedaemon.com/FireDaemon-OpenSSL/openssl-3.0.16.zip" -OutFile "libs/openssl/openssl-3.0.16.zip"
} else {
    Write-Host "OpenSSL archive already exists, skipping download..." -ForegroundColor Yellow
}

if (-not (Test-Path -Path "libs/openssl/openssl-3.0")) {
    Write-Host "Extracting OpenSSL..." -ForegroundColor Yellow
    Expand-Archive -Path "libs/openssl/openssl-3.0.16.zip" -DestinationPath "libs/openssl/" -Force
} else {
    Write-Host "OpenSSL already extracted, skipping extraction..." -ForegroundColor Yellow
}

# Create build/Release directory
Write-Host "Setting up build directories..." -ForegroundColor Cyan
if (-not (Test-Path -Path "build/Release")) {
    New-Item -Path "build/Release" -ItemType Directory -Force | Out-Null
}

# Copy DLLs
Write-Host "Copying DLLs to build directory..." -ForegroundColor Yellow
Copy-Item -Path "libs/openssl/openssl-3.0/x64/bin/libcrypto-3-x64.dll" -Destination "build/Release/" -Force
Copy-Item -Path "libs/openssl/openssl-3.0/x64/bin/libssl-3-x64.dll" -Destination "build/Release/" -Force
Copy-Item -Path "libs/oqs/install/bin/oqs.dll" -Destination "build/Release/" -Force

# Build the Node.js addon
Write-Host "Building Node.js addon..." -ForegroundColor Cyan
npm run build:addon
if ($LASTEXITCODE -ne 0) {
    Write-Host "Node.js addon build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "You can now build and run the application with: npm run dev" -ForegroundColor Green 