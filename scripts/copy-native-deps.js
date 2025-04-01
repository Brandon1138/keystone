// scripts/copy-native-deps.js
const fs = require('fs-extra');
const path = require('path');

// Use current working directory as project root, assuming script is run from project root via npm
const projectRoot = process.cwd();
console.log(`[copy-deps] Using project root: ${projectRoot}`);

const addonBuildDir = path.join(projectRoot, 'addons/build/Release');
console.log(`[copy-deps] Target addon build directory: ${addonBuildDir}`);

// --- Source Paths ---
// Verify these paths point to where oqs.dll and libcrypto-3-x64.dll *actually* exist
// after building/installing OQS and OpenSSL respectively.
const oqsBinDir = path.join(projectRoot, 'external/libs/oqs/install/bin');
const opensslBinDir = path.join(
	projectRoot,
	'external/libs/openssl/openssl-3.0/x64/bin'
);

console.log(`[copy-deps] Expected OQS source directory: ${oqsBinDir}`);
console.log(`[copy-deps] Expected OpenSSL source directory: ${opensslBinDir}`);

const dllsToCopy = [
	{ srcDir: oqsBinDir, name: 'oqs.dll' },
	{ srcDir: opensslBinDir, name: 'libcrypto-3-x64.dll' },
	// { srcDir: opensslBinDir, name: 'libssl-3-x64.dll' }, // Uncomment if needed
];

try {
	// --- Pre-copy Checks ---
	console.log('[copy-deps] Verifying source directories and files exist...');
	let sourcesExist = true;
	if (!fs.existsSync(oqsBinDir)) {
		console.error(
			`[copy-deps] CRITICAL ERROR: OQS source directory NOT FOUND: ${oqsBinDir}`
		);
		sourcesExist = false;
	} else if (!fs.existsSync(path.join(oqsBinDir, 'oqs.dll'))) {
		console.error(
			`[copy-deps] CRITICAL ERROR: oqs.dll NOT FOUND in: ${oqsBinDir}`
		);
		sourcesExist = false;
	}

	if (!fs.existsSync(opensslBinDir)) {
		console.error(
			`[copy-deps] CRITICAL ERROR: OpenSSL source directory NOT FOUND: ${opensslBinDir}`
		);
		sourcesExist = false;
	} else if (!fs.existsSync(path.join(opensslBinDir, 'libcrypto-3-x64.dll'))) {
		console.error(
			`[copy-deps] CRITICAL ERROR: libcrypto-3-x64.dll NOT FOUND in: ${opensslBinDir}`
		);
		sourcesExist = false;
	}

	if (!sourcesExist) {
		console.error(
			'[copy-deps] Cannot proceed with copy due to missing source files/directories. Check library build outputs.'
		);
		process.exit(1);
	}
	console.log('[copy-deps] Source directories and files verified.');

	// --- Ensure Target Directory Exists ---
	fs.ensureDirSync(addonBuildDir);
	console.log(`[copy-deps] Ensured target directory exists: ${addonBuildDir}`);

	// --- Perform Copy ---
	console.log(`[copy-deps] Copying native dependencies to ${addonBuildDir}...`);
	let allCopied = true;
	dllsToCopy.forEach((dll) => {
		const srcPath = path.join(dll.srcDir, dll.name);
		const destPath = path.join(addonBuildDir, dll.name);

		// No need to check fs.existsSync(srcPath) again, done above
		console.log(
			`[copy-deps] Attempting copy: ${dll.name} from ${srcPath} to ${destPath}`
		);
		try {
			// Use overwrite: true just in case there are stale files
			fs.copySync(srcPath, destPath, { overwrite: true });

			// Verify copy immediately
			if (fs.existsSync(destPath)) {
				// Optional: Compare file sizes as a basic sanity check
				const srcStat = fs.statSync(srcPath);
				const destStat = fs.statSync(destPath);
				if (srcStat.size === destStat.size) {
					console.log(
						`[copy-deps]   OK: Copied and verified ${dll.name} (Size: ${destStat.size} bytes)`
					);
				} else {
					console.warn(
						`[copy-deps]   WARN: Copied ${dll.name} but size mismatch! (Src: ${srcStat.size}, Dest: ${destStat.size})`
					);
					// Decide if size mismatch should be fatal - for DLLs it probably should be.
					allCopied = false;
				}
			} else {
				console.error(
					`[copy-deps]   ERROR: Copied ${dll.name} but destination file check failed!`
				);
				allCopied = false;
			}
		} catch (err) {
			console.error(`[copy-deps]   ERROR during copy of ${dll.name}:`, err);
			allCopied = false;
		}
	});

	if (!allCopied) {
		console.error(
			'[copy-deps] ERROR: One or more dependencies failed to copy correctly. Please check logs above.'
		);
		process.exit(1);
	}

	console.log('[copy-deps] Dependency copying complete.');
} catch (error) {
	console.error(`[copy-deps] General error during script execution:`, error);
	process.exit(1);
}
