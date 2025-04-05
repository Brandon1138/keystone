/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/main/preload.js":
/*!*****************************!*\
  !*** ./src/main/preload.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

eval("const { contextBridge, ipcRenderer } = __webpack_require__(/*! electron */ \"electron\");\n// No longer need path, fs, or direct crypto require here if HKDF/randomBytes are called via IPC\n// const crypto = require('crypto');\n// const path = require('path');\n// const fs = require('fs');\n\nconsole.log('[preload] Initializing...');\n\n// --- REMOVE Addon Loading Logic from Preload ---\n// Addons should be loaded reliably in the main process (ipc.ts)\n\n// --- Expose APIs via contextBridge ---\n\ncontextBridge.exposeInMainWorld('electronAPI', {\n\t// --- Kyber KEM Functions (using IPC) ---\n\tkyber: {\n\t\tgenerateKeypair: (secLevel) => {\n\t\t\tconsole.log('[preload] invoking kyber-generate-keypair', secLevel);\n\t\t\treturn ipcRenderer.invoke('kyber-generate-keypair', secLevel);\n\t\t\t// Add .then/.catch here for preload-specific logging if needed\n\t\t},\n\t\t// IMPORTANT: Use the IPC channel names that will correspond to\n\t\t// the *new* encapsulate/decapsulate addon functions later.\n\t\t// We will need corresponding handlers in ipc.ts for these.\n\t\tencapsulate: (secLevel, pubKey) => {\n\t\t\tconsole.log('[preload] invoking kyber-encapsulate', secLevel);\n\t\t\t// Convert pubKey to Base64 for IPC\n\t\t\tconst pubKeyBase64 = Buffer.isBuffer(pubKey)\n\t\t\t\t? pubKey.toString('base64')\n\t\t\t\t: Buffer.from(pubKey).toString('base64');\n\t\t\treturn ipcRenderer.invoke(\n\t\t\t\t'kyber-encapsulate', // NEW IPC channel name\n\t\t\t\tsecLevel,\n\t\t\t\tpubKeyBase64\n\t\t\t);\n\t\t},\n\t\tdecapsulate: (secLevel, secKey, kemCiphertext) => {\n\t\t\tconsole.log('[preload] invoking kyber-decapsulate', secLevel);\n\t\t\t// Convert Buffers to Base64 for IPC\n\t\t\tconst secKeyBase64 = Buffer.isBuffer(secKey)\n\t\t\t\t? secKey.toString('base64')\n\t\t\t\t: Buffer.from(secKey).toString('base64');\n\t\t\tconst kemCiphertextBase64 = Buffer.isBuffer(kemCiphertext)\n\t\t\t\t? kemCiphertext.toString('base64')\n\t\t\t\t: Buffer.from(kemCiphertext).toString('base64');\n\t\t\treturn ipcRenderer.invoke(\n\t\t\t\t'kyber-decapsulate', // NEW IPC channel name\n\t\t\t\tsecLevel,\n\t\t\t\tsecKeyBase64,\n\t\t\t\tkemCiphertextBase64\n\t\t\t);\n\t\t},\n\t},\n\n\t// --- Dilithium Signature Functions (using IPC) ---\n\tdilithium: {\n\t\tgenerateKeypair: (secLevel) => {\n\t\t\tconsole.log('[preload] invoking dilithium-generate-keypair', secLevel);\n\t\t\treturn ipcRenderer.invoke('dilithium-generate-keypair', secLevel);\n\t\t},\n\t\tsign: (secLevel, secKey, message) => {\n\t\t\tconsole.log('[preload] invoking dilithium-sign', secLevel);\n\t\t\t// Convert Buffer args to Base64/UTF8 for IPC\n\t\t\tconst secKeyBase64 = Buffer.isBuffer(secKey)\n\t\t\t\t? secKey.toString('base64')\n\t\t\t\t: Buffer.from(secKey).toString('base64');\n\t\t\t// Assume message can be string or buffer, send as string\n\t\t\tconst messageString = Buffer.isBuffer(message)\n\t\t\t\t? message.toString('utf8')\n\t\t\t\t: String(message);\n\t\t\treturn ipcRenderer.invoke(\n\t\t\t\t'dilithium-sign',\n\t\t\t\tsecLevel,\n\t\t\t\tsecKeyBase64,\n\t\t\t\tmessageString\n\t\t\t);\n\t\t},\n\t\tverify: (secLevel, pubKey, message, signature) => {\n\t\t\tconsole.log('[preload] invoking dilithium-verify', secLevel);\n\t\t\t// Convert Buffer args to Base64/UTF8 for IPC\n\t\t\tconst pubKeyBase64 = Buffer.isBuffer(pubKey)\n\t\t\t\t? pubKey.toString('base64')\n\t\t\t\t: Buffer.from(pubKey).toString('base64');\n\t\t\tconst messageString = Buffer.isBuffer(message)\n\t\t\t\t? message.toString('utf8')\n\t\t\t\t: String(message);\n\t\t\tconst signatureBase64 = Buffer.isBuffer(signature)\n\t\t\t\t? signature.toString('base64')\n\t\t\t\t: Buffer.from(signature).toString('base64');\n\t\t\treturn ipcRenderer.invoke(\n\t\t\t\t'dilithium-verify',\n\t\t\t\tsecLevel,\n\t\t\t\tpubKeyBase64,\n\t\t\t\tmessageString,\n\t\t\t\tsignatureBase64\n\t\t\t);\n\t\t},\n\t},\n\n\t// --- Node.js Crypto Utilities (using IPC) ---\n\t// We need corresponding handlers in ipc.ts for these too\n\tnodeCrypto: {\n\t\thkdf: (ikm, length, salt, info) => {\n\t\t\tconsole.log('[preload] invoking node-crypto-hkdf');\n\t\t\t// Convert Buffers to Base64/UTF8 for IPC\n\t\t\tconst ikmBase64 = Buffer.isBuffer(ikm)\n\t\t\t\t? ikm.toString('base64')\n\t\t\t\t: Buffer.from(ikm).toString('base64');\n\t\t\tconst saltBase64 = salt\n\t\t\t\t? Buffer.isBuffer(salt)\n\t\t\t\t\t? salt.toString('base64')\n\t\t\t\t\t: Buffer.from(salt).toString('base64')\n\t\t\t\t: undefined; // Handle optional salt\n\t\t\tconst infoString = info\n\t\t\t\t? Buffer.isBuffer(info)\n\t\t\t\t\t? info.toString('utf8') // Info often treated as string\n\t\t\t\t\t: String(info)\n\t\t\t\t: undefined; // Handle optional info\n\t\t\treturn ipcRenderer.invoke(\n\t\t\t\t'node-crypto-hkdf', // NEW IPC channel name\n\t\t\t\tikmBase64,\n\t\t\t\tlength,\n\t\t\t\tsaltBase64,\n\t\t\t\tinfoString\n\t\t\t);\n\t\t},\n\t\tgetRandomBytes: (length) => {\n\t\t\tconsole.log('[preload] invoking node-crypto-get-random-bytes', length);\n\t\t\treturn ipcRenderer.invoke(\n\t\t\t\t'node-crypto-get-random-bytes', // NEW IPC channel name\n\t\t\t\tlength\n\t\t\t);\n\t\t},\n\t},\n\n\t// --- Utilities (can stay if simple pure JS) ---\n\tutils: {\n\t\tbufferToString: (buf, enc) => buf.toString(enc),\n\t\tstringToBuffer: (str, enc) => Buffer.from(str, enc),\n\t},\n});\n\n// --- Keep existing generic IPC exposure ---\ncontextBridge.exposeInMainWorld('electron', {\n\tipcRenderer: {\n\t\tinvoke: ipcRenderer.invoke, // Direct passthrough\n\t\ton: (channel, func) => {\n\t\t\tconst subscription = (event, ...args) => func(...args);\n\t\t\tipcRenderer.on(channel, subscription);\n\t\t\treturn () => ipcRenderer.removeListener(channel, subscription); // Return unsubscriber\n\t\t},\n\t\tonce: (channel, func) => {\n\t\t\tipcRenderer.once(channel, (event, ...args) => func(...args));\n\t\t},\n\t\tremoveListener: ipcRenderer.removeListener, // Direct passthrough\n\t\tremoveAllListeners: ipcRenderer.removeAllListeners, // Direct passthrough\n\t},\n});\n\n// --- Keep existing process version exposure ---\ncontextBridge.exposeInMainWorld('process', {\n\tversions: process.versions,\n});\n\nconsole.log('[preload] Context bridge APIs exposed using IPC.');\n\n// --- Add Quantum Workload API ---\ncontextBridge.exposeInMainWorld('quantumAPI', {\n\trunQuantumWorkload: (apiToken, shots, runOnHardware, plotTheme) => {\n\t\tconsole.log('[preload] invoking run-quantum-workload');\n\t\treturn ipcRenderer.invoke(\n\t\t\t'run-quantum-workload',\n\t\t\tapiToken,\n\t\t\tshots,\n\t\t\trunOnHardware,\n\t\t\tplotTheme\n\t\t);\n\t},\n\tgetQuantumPlot: (plotFilePath) => {\n\t\tconsole.log('[preload] invoking get-quantum-plot');\n\t\treturn ipcRenderer.invoke('get-quantum-plot', plotFilePath);\n\t},\n\t// Allow subscribing to log events (like progress updates)\n\tonLogUpdate: (callback) => {\n\t\tconst subscription = (_event, ...args) => callback(...args);\n\t\tipcRenderer.on('quantum-log-update', subscription);\n\t\treturn () => ipcRenderer.removeListener('quantum-log-update', subscription);\n\t},\n});\n\n\n//# sourceURL=webpack://pqcbenchgui4/./src/main/preload.js?");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main/preload.js");
/******/ 	
/******/ })()
;