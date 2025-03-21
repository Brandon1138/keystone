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

eval("const { contextBridge, ipcRenderer } = __webpack_require__(/*! electron */ \"electron\");\n\n// Expose protected methods that allow the renderer process to use\n// the ipcRenderer without exposing the entire object\ncontextBridge.exposeInMainWorld('electron', {\n\tipcRenderer: {\n\t\tinvoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),\n\t\ton: (channel, func) => {\n\t\t\tipcRenderer.on(channel, (event, ...args) => func(...args));\n\t\t},\n\t\tonce: (channel, func) => {\n\t\t\tipcRenderer.once(channel, (event, ...args) => func(...args));\n\t\t},\n\t\tremoveListener: (channel, func) => {\n\t\t\tipcRenderer.removeListener(channel, func);\n\t\t},\n\t},\n});\n\n// Expose the process.versions to the renderer\ncontextBridge.exposeInMainWorld('process', {\n\tversions: process.versions,\n});\n\n// Preload script\nwindow.addEventListener('DOMContentLoaded', () => {\n\tconst replaceText = (selector, text) => {\n\t\tconst element = document.getElementById(selector);\n\t\tif (element) element.innerText = text;\n\t};\n\n\tfor (const type of ['chrome', 'node', 'electron']) {\n\t\treplaceText(`${type}-version`, process.versions[type]);\n\t}\n});\n\n\n//# sourceURL=webpack://pqcbenchgui4/./src/main/preload.js?");

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