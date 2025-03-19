/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/uuid/dist/cjs/index.js":
/*!*********************************************!*\
  !*** ./node_modules/uuid/dist/cjs/index.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.version = exports.validate = exports.v7 = exports.v6ToV1 = exports.v6 = exports.v5 = exports.v4 = exports.v3 = exports.v1ToV6 = exports.v1 = exports.stringify = exports.parse = exports.NIL = exports.MAX = void 0;\nvar max_js_1 = __webpack_require__(/*! ./max.js */ \"./node_modules/uuid/dist/cjs/max.js\");\nObject.defineProperty(exports, \"MAX\", ({ enumerable: true, get: function () { return max_js_1.default; } }));\nvar nil_js_1 = __webpack_require__(/*! ./nil.js */ \"./node_modules/uuid/dist/cjs/nil.js\");\nObject.defineProperty(exports, \"NIL\", ({ enumerable: true, get: function () { return nil_js_1.default; } }));\nvar parse_js_1 = __webpack_require__(/*! ./parse.js */ \"./node_modules/uuid/dist/cjs/parse.js\");\nObject.defineProperty(exports, \"parse\", ({ enumerable: true, get: function () { return parse_js_1.default; } }));\nvar stringify_js_1 = __webpack_require__(/*! ./stringify.js */ \"./node_modules/uuid/dist/cjs/stringify.js\");\nObject.defineProperty(exports, \"stringify\", ({ enumerable: true, get: function () { return stringify_js_1.default; } }));\nvar v1_js_1 = __webpack_require__(/*! ./v1.js */ \"./node_modules/uuid/dist/cjs/v1.js\");\nObject.defineProperty(exports, \"v1\", ({ enumerable: true, get: function () { return v1_js_1.default; } }));\nvar v1ToV6_js_1 = __webpack_require__(/*! ./v1ToV6.js */ \"./node_modules/uuid/dist/cjs/v1ToV6.js\");\nObject.defineProperty(exports, \"v1ToV6\", ({ enumerable: true, get: function () { return v1ToV6_js_1.default; } }));\nvar v3_js_1 = __webpack_require__(/*! ./v3.js */ \"./node_modules/uuid/dist/cjs/v3.js\");\nObject.defineProperty(exports, \"v3\", ({ enumerable: true, get: function () { return v3_js_1.default; } }));\nvar v4_js_1 = __webpack_require__(/*! ./v4.js */ \"./node_modules/uuid/dist/cjs/v4.js\");\nObject.defineProperty(exports, \"v4\", ({ enumerable: true, get: function () { return v4_js_1.default; } }));\nvar v5_js_1 = __webpack_require__(/*! ./v5.js */ \"./node_modules/uuid/dist/cjs/v5.js\");\nObject.defineProperty(exports, \"v5\", ({ enumerable: true, get: function () { return v5_js_1.default; } }));\nvar v6_js_1 = __webpack_require__(/*! ./v6.js */ \"./node_modules/uuid/dist/cjs/v6.js\");\nObject.defineProperty(exports, \"v6\", ({ enumerable: true, get: function () { return v6_js_1.default; } }));\nvar v6ToV1_js_1 = __webpack_require__(/*! ./v6ToV1.js */ \"./node_modules/uuid/dist/cjs/v6ToV1.js\");\nObject.defineProperty(exports, \"v6ToV1\", ({ enumerable: true, get: function () { return v6ToV1_js_1.default; } }));\nvar v7_js_1 = __webpack_require__(/*! ./v7.js */ \"./node_modules/uuid/dist/cjs/v7.js\");\nObject.defineProperty(exports, \"v7\", ({ enumerable: true, get: function () { return v7_js_1.default; } }));\nvar validate_js_1 = __webpack_require__(/*! ./validate.js */ \"./node_modules/uuid/dist/cjs/validate.js\");\nObject.defineProperty(exports, \"validate\", ({ enumerable: true, get: function () { return validate_js_1.default; } }));\nvar version_js_1 = __webpack_require__(/*! ./version.js */ \"./node_modules/uuid/dist/cjs/version.js\");\nObject.defineProperty(exports, \"version\", ({ enumerable: true, get: function () { return version_js_1.default; } }));\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/index.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/max.js":
/*!*******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/max.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports[\"default\"] = 'ffffffff-ffff-ffff-ffff-ffffffffffff';\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/max.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/md5.js":
/*!*******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/md5.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst crypto_1 = __webpack_require__(/*! crypto */ \"crypto\");\nfunction md5(bytes) {\n    if (Array.isArray(bytes)) {\n        bytes = Buffer.from(bytes);\n    }\n    else if (typeof bytes === 'string') {\n        bytes = Buffer.from(bytes, 'utf8');\n    }\n    return (0, crypto_1.createHash)('md5').update(bytes).digest();\n}\nexports[\"default\"] = md5;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/md5.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/native.js":
/*!**********************************************!*\
  !*** ./node_modules/uuid/dist/cjs/native.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst crypto_1 = __webpack_require__(/*! crypto */ \"crypto\");\nexports[\"default\"] = { randomUUID: crypto_1.randomUUID };\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/native.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/nil.js":
/*!*******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/nil.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports[\"default\"] = '00000000-0000-0000-0000-000000000000';\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/nil.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/parse.js":
/*!*********************************************!*\
  !*** ./node_modules/uuid/dist/cjs/parse.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst validate_js_1 = __webpack_require__(/*! ./validate.js */ \"./node_modules/uuid/dist/cjs/validate.js\");\nfunction parse(uuid) {\n    if (!(0, validate_js_1.default)(uuid)) {\n        throw TypeError('Invalid UUID');\n    }\n    let v;\n    return Uint8Array.of((v = parseInt(uuid.slice(0, 8), 16)) >>> 24, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff, (v = parseInt(uuid.slice(9, 13), 16)) >>> 8, v & 0xff, (v = parseInt(uuid.slice(14, 18), 16)) >>> 8, v & 0xff, (v = parseInt(uuid.slice(19, 23), 16)) >>> 8, v & 0xff, ((v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000) & 0xff, (v / 0x100000000) & 0xff, (v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);\n}\nexports[\"default\"] = parse;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/parse.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/regex.js":
/*!*********************************************!*\
  !*** ./node_modules/uuid/dist/cjs/regex.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports[\"default\"] = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/regex.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/rng.js":
/*!*******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/rng.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst crypto_1 = __webpack_require__(/*! crypto */ \"crypto\");\nconst rnds8Pool = new Uint8Array(256);\nlet poolPtr = rnds8Pool.length;\nfunction rng() {\n    if (poolPtr > rnds8Pool.length - 16) {\n        (0, crypto_1.randomFillSync)(rnds8Pool);\n        poolPtr = 0;\n    }\n    return rnds8Pool.slice(poolPtr, (poolPtr += 16));\n}\nexports[\"default\"] = rng;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/rng.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/sha1.js":
/*!********************************************!*\
  !*** ./node_modules/uuid/dist/cjs/sha1.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst crypto_1 = __webpack_require__(/*! crypto */ \"crypto\");\nfunction sha1(bytes) {\n    if (Array.isArray(bytes)) {\n        bytes = Buffer.from(bytes);\n    }\n    else if (typeof bytes === 'string') {\n        bytes = Buffer.from(bytes, 'utf8');\n    }\n    return (0, crypto_1.createHash)('sha1').update(bytes).digest();\n}\nexports[\"default\"] = sha1;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/sha1.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/stringify.js":
/*!*************************************************!*\
  !*** ./node_modules/uuid/dist/cjs/stringify.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.unsafeStringify = void 0;\nconst validate_js_1 = __webpack_require__(/*! ./validate.js */ \"./node_modules/uuid/dist/cjs/validate.js\");\nconst byteToHex = [];\nfor (let i = 0; i < 256; ++i) {\n    byteToHex.push((i + 0x100).toString(16).slice(1));\n}\nfunction unsafeStringify(arr, offset = 0) {\n    return (byteToHex[arr[offset + 0]] +\n        byteToHex[arr[offset + 1]] +\n        byteToHex[arr[offset + 2]] +\n        byteToHex[arr[offset + 3]] +\n        '-' +\n        byteToHex[arr[offset + 4]] +\n        byteToHex[arr[offset + 5]] +\n        '-' +\n        byteToHex[arr[offset + 6]] +\n        byteToHex[arr[offset + 7]] +\n        '-' +\n        byteToHex[arr[offset + 8]] +\n        byteToHex[arr[offset + 9]] +\n        '-' +\n        byteToHex[arr[offset + 10]] +\n        byteToHex[arr[offset + 11]] +\n        byteToHex[arr[offset + 12]] +\n        byteToHex[arr[offset + 13]] +\n        byteToHex[arr[offset + 14]] +\n        byteToHex[arr[offset + 15]]).toLowerCase();\n}\nexports.unsafeStringify = unsafeStringify;\nfunction stringify(arr, offset = 0) {\n    const uuid = unsafeStringify(arr, offset);\n    if (!(0, validate_js_1.default)(uuid)) {\n        throw TypeError('Stringified UUID is invalid');\n    }\n    return uuid;\n}\nexports[\"default\"] = stringify;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/stringify.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v1.js":
/*!******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v1.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.updateV1State = void 0;\nconst rng_js_1 = __webpack_require__(/*! ./rng.js */ \"./node_modules/uuid/dist/cjs/rng.js\");\nconst stringify_js_1 = __webpack_require__(/*! ./stringify.js */ \"./node_modules/uuid/dist/cjs/stringify.js\");\nconst _state = {};\nfunction v1(options, buf, offset) {\n    let bytes;\n    const isV6 = options?._v6 ?? false;\n    if (options) {\n        const optionsKeys = Object.keys(options);\n        if (optionsKeys.length === 1 && optionsKeys[0] === '_v6') {\n            options = undefined;\n        }\n    }\n    if (options) {\n        bytes = v1Bytes(options.random ?? options.rng?.() ?? (0, rng_js_1.default)(), options.msecs, options.nsecs, options.clockseq, options.node, buf, offset);\n    }\n    else {\n        const now = Date.now();\n        const rnds = (0, rng_js_1.default)();\n        updateV1State(_state, now, rnds);\n        bytes = v1Bytes(rnds, _state.msecs, _state.nsecs, isV6 ? undefined : _state.clockseq, isV6 ? undefined : _state.node, buf, offset);\n    }\n    return buf ?? (0, stringify_js_1.unsafeStringify)(bytes);\n}\nfunction updateV1State(state, now, rnds) {\n    state.msecs ??= -Infinity;\n    state.nsecs ??= 0;\n    if (now === state.msecs) {\n        state.nsecs++;\n        if (state.nsecs >= 10000) {\n            state.node = undefined;\n            state.nsecs = 0;\n        }\n    }\n    else if (now > state.msecs) {\n        state.nsecs = 0;\n    }\n    else if (now < state.msecs) {\n        state.node = undefined;\n    }\n    if (!state.node) {\n        state.node = rnds.slice(10, 16);\n        state.node[0] |= 0x01;\n        state.clockseq = ((rnds[8] << 8) | rnds[9]) & 0x3fff;\n    }\n    state.msecs = now;\n    return state;\n}\nexports.updateV1State = updateV1State;\nfunction v1Bytes(rnds, msecs, nsecs, clockseq, node, buf, offset = 0) {\n    if (rnds.length < 16) {\n        throw new Error('Random bytes length must be >= 16');\n    }\n    if (!buf) {\n        buf = new Uint8Array(16);\n        offset = 0;\n    }\n    else {\n        if (offset < 0 || offset + 16 > buf.length) {\n            throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);\n        }\n    }\n    msecs ??= Date.now();\n    nsecs ??= 0;\n    clockseq ??= ((rnds[8] << 8) | rnds[9]) & 0x3fff;\n    node ??= rnds.slice(10, 16);\n    msecs += 12219292800000;\n    const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;\n    buf[offset++] = (tl >>> 24) & 0xff;\n    buf[offset++] = (tl >>> 16) & 0xff;\n    buf[offset++] = (tl >>> 8) & 0xff;\n    buf[offset++] = tl & 0xff;\n    const tmh = ((msecs / 0x100000000) * 10000) & 0xfffffff;\n    buf[offset++] = (tmh >>> 8) & 0xff;\n    buf[offset++] = tmh & 0xff;\n    buf[offset++] = ((tmh >>> 24) & 0xf) | 0x10;\n    buf[offset++] = (tmh >>> 16) & 0xff;\n    buf[offset++] = (clockseq >>> 8) | 0x80;\n    buf[offset++] = clockseq & 0xff;\n    for (let n = 0; n < 6; ++n) {\n        buf[offset++] = node[n];\n    }\n    return buf;\n}\nexports[\"default\"] = v1;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v1.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v1ToV6.js":
/*!**********************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v1ToV6.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst parse_js_1 = __webpack_require__(/*! ./parse.js */ \"./node_modules/uuid/dist/cjs/parse.js\");\nconst stringify_js_1 = __webpack_require__(/*! ./stringify.js */ \"./node_modules/uuid/dist/cjs/stringify.js\");\nfunction v1ToV6(uuid) {\n    const v1Bytes = typeof uuid === 'string' ? (0, parse_js_1.default)(uuid) : uuid;\n    const v6Bytes = _v1ToV6(v1Bytes);\n    return typeof uuid === 'string' ? (0, stringify_js_1.unsafeStringify)(v6Bytes) : v6Bytes;\n}\nexports[\"default\"] = v1ToV6;\nfunction _v1ToV6(v1Bytes) {\n    return Uint8Array.of(((v1Bytes[6] & 0x0f) << 4) | ((v1Bytes[7] >> 4) & 0x0f), ((v1Bytes[7] & 0x0f) << 4) | ((v1Bytes[4] & 0xf0) >> 4), ((v1Bytes[4] & 0x0f) << 4) | ((v1Bytes[5] & 0xf0) >> 4), ((v1Bytes[5] & 0x0f) << 4) | ((v1Bytes[0] & 0xf0) >> 4), ((v1Bytes[0] & 0x0f) << 4) | ((v1Bytes[1] & 0xf0) >> 4), ((v1Bytes[1] & 0x0f) << 4) | ((v1Bytes[2] & 0xf0) >> 4), 0x60 | (v1Bytes[2] & 0x0f), v1Bytes[3], v1Bytes[8], v1Bytes[9], v1Bytes[10], v1Bytes[11], v1Bytes[12], v1Bytes[13], v1Bytes[14], v1Bytes[15]);\n}\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v1ToV6.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v3.js":
/*!******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v3.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.URL = exports.DNS = void 0;\nconst md5_js_1 = __webpack_require__(/*! ./md5.js */ \"./node_modules/uuid/dist/cjs/md5.js\");\nconst v35_js_1 = __webpack_require__(/*! ./v35.js */ \"./node_modules/uuid/dist/cjs/v35.js\");\nvar v35_js_2 = __webpack_require__(/*! ./v35.js */ \"./node_modules/uuid/dist/cjs/v35.js\");\nObject.defineProperty(exports, \"DNS\", ({ enumerable: true, get: function () { return v35_js_2.DNS; } }));\nObject.defineProperty(exports, \"URL\", ({ enumerable: true, get: function () { return v35_js_2.URL; } }));\nfunction v3(value, namespace, buf, offset) {\n    return (0, v35_js_1.default)(0x30, md5_js_1.default, value, namespace, buf, offset);\n}\nv3.DNS = v35_js_1.DNS;\nv3.URL = v35_js_1.URL;\nexports[\"default\"] = v3;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v3.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v35.js":
/*!*******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v35.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.URL = exports.DNS = exports.stringToBytes = void 0;\nconst parse_js_1 = __webpack_require__(/*! ./parse.js */ \"./node_modules/uuid/dist/cjs/parse.js\");\nconst stringify_js_1 = __webpack_require__(/*! ./stringify.js */ \"./node_modules/uuid/dist/cjs/stringify.js\");\nfunction stringToBytes(str) {\n    str = unescape(encodeURIComponent(str));\n    const bytes = new Uint8Array(str.length);\n    for (let i = 0; i < str.length; ++i) {\n        bytes[i] = str.charCodeAt(i);\n    }\n    return bytes;\n}\nexports.stringToBytes = stringToBytes;\nexports.DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';\nexports.URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';\nfunction v35(version, hash, value, namespace, buf, offset) {\n    const valueBytes = typeof value === 'string' ? stringToBytes(value) : value;\n    const namespaceBytes = typeof namespace === 'string' ? (0, parse_js_1.default)(namespace) : namespace;\n    if (typeof namespace === 'string') {\n        namespace = (0, parse_js_1.default)(namespace);\n    }\n    if (namespace?.length !== 16) {\n        throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');\n    }\n    let bytes = new Uint8Array(16 + valueBytes.length);\n    bytes.set(namespaceBytes);\n    bytes.set(valueBytes, namespaceBytes.length);\n    bytes = hash(bytes);\n    bytes[6] = (bytes[6] & 0x0f) | version;\n    bytes[8] = (bytes[8] & 0x3f) | 0x80;\n    if (buf) {\n        offset = offset || 0;\n        for (let i = 0; i < 16; ++i) {\n            buf[offset + i] = bytes[i];\n        }\n        return buf;\n    }\n    return (0, stringify_js_1.unsafeStringify)(bytes);\n}\nexports[\"default\"] = v35;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v35.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v4.js":
/*!******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v4.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst native_js_1 = __webpack_require__(/*! ./native.js */ \"./node_modules/uuid/dist/cjs/native.js\");\nconst rng_js_1 = __webpack_require__(/*! ./rng.js */ \"./node_modules/uuid/dist/cjs/rng.js\");\nconst stringify_js_1 = __webpack_require__(/*! ./stringify.js */ \"./node_modules/uuid/dist/cjs/stringify.js\");\nfunction v4(options, buf, offset) {\n    if (native_js_1.default.randomUUID && !buf && !options) {\n        return native_js_1.default.randomUUID();\n    }\n    options = options || {};\n    const rnds = options.random ?? options.rng?.() ?? (0, rng_js_1.default)();\n    if (rnds.length < 16) {\n        throw new Error('Random bytes length must be >= 16');\n    }\n    rnds[6] = (rnds[6] & 0x0f) | 0x40;\n    rnds[8] = (rnds[8] & 0x3f) | 0x80;\n    if (buf) {\n        offset = offset || 0;\n        if (offset < 0 || offset + 16 > buf.length) {\n            throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);\n        }\n        for (let i = 0; i < 16; ++i) {\n            buf[offset + i] = rnds[i];\n        }\n        return buf;\n    }\n    return (0, stringify_js_1.unsafeStringify)(rnds);\n}\nexports[\"default\"] = v4;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v4.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v5.js":
/*!******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v5.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.URL = exports.DNS = void 0;\nconst sha1_js_1 = __webpack_require__(/*! ./sha1.js */ \"./node_modules/uuid/dist/cjs/sha1.js\");\nconst v35_js_1 = __webpack_require__(/*! ./v35.js */ \"./node_modules/uuid/dist/cjs/v35.js\");\nvar v35_js_2 = __webpack_require__(/*! ./v35.js */ \"./node_modules/uuid/dist/cjs/v35.js\");\nObject.defineProperty(exports, \"DNS\", ({ enumerable: true, get: function () { return v35_js_2.DNS; } }));\nObject.defineProperty(exports, \"URL\", ({ enumerable: true, get: function () { return v35_js_2.URL; } }));\nfunction v5(value, namespace, buf, offset) {\n    return (0, v35_js_1.default)(0x50, sha1_js_1.default, value, namespace, buf, offset);\n}\nv5.DNS = v35_js_1.DNS;\nv5.URL = v35_js_1.URL;\nexports[\"default\"] = v5;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v5.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v6.js":
/*!******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v6.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst stringify_js_1 = __webpack_require__(/*! ./stringify.js */ \"./node_modules/uuid/dist/cjs/stringify.js\");\nconst v1_js_1 = __webpack_require__(/*! ./v1.js */ \"./node_modules/uuid/dist/cjs/v1.js\");\nconst v1ToV6_js_1 = __webpack_require__(/*! ./v1ToV6.js */ \"./node_modules/uuid/dist/cjs/v1ToV6.js\");\nfunction v6(options, buf, offset) {\n    options ??= {};\n    offset ??= 0;\n    let bytes = (0, v1_js_1.default)({ ...options, _v6: true }, new Uint8Array(16));\n    bytes = (0, v1ToV6_js_1.default)(bytes);\n    if (buf) {\n        for (let i = 0; i < 16; i++) {\n            buf[offset + i] = bytes[i];\n        }\n        return buf;\n    }\n    return (0, stringify_js_1.unsafeStringify)(bytes);\n}\nexports[\"default\"] = v6;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v6.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v6ToV1.js":
/*!**********************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v6ToV1.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst parse_js_1 = __webpack_require__(/*! ./parse.js */ \"./node_modules/uuid/dist/cjs/parse.js\");\nconst stringify_js_1 = __webpack_require__(/*! ./stringify.js */ \"./node_modules/uuid/dist/cjs/stringify.js\");\nfunction v6ToV1(uuid) {\n    const v6Bytes = typeof uuid === 'string' ? (0, parse_js_1.default)(uuid) : uuid;\n    const v1Bytes = _v6ToV1(v6Bytes);\n    return typeof uuid === 'string' ? (0, stringify_js_1.unsafeStringify)(v1Bytes) : v1Bytes;\n}\nexports[\"default\"] = v6ToV1;\nfunction _v6ToV1(v6Bytes) {\n    return Uint8Array.of(((v6Bytes[3] & 0x0f) << 4) | ((v6Bytes[4] >> 4) & 0x0f), ((v6Bytes[4] & 0x0f) << 4) | ((v6Bytes[5] & 0xf0) >> 4), ((v6Bytes[5] & 0x0f) << 4) | (v6Bytes[6] & 0x0f), v6Bytes[7], ((v6Bytes[1] & 0x0f) << 4) | ((v6Bytes[2] & 0xf0) >> 4), ((v6Bytes[2] & 0x0f) << 4) | ((v6Bytes[3] & 0xf0) >> 4), 0x10 | ((v6Bytes[0] & 0xf0) >> 4), ((v6Bytes[0] & 0x0f) << 4) | ((v6Bytes[1] & 0xf0) >> 4), v6Bytes[8], v6Bytes[9], v6Bytes[10], v6Bytes[11], v6Bytes[12], v6Bytes[13], v6Bytes[14], v6Bytes[15]);\n}\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v6ToV1.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/v7.js":
/*!******************************************!*\
  !*** ./node_modules/uuid/dist/cjs/v7.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.updateV7State = void 0;\nconst rng_js_1 = __webpack_require__(/*! ./rng.js */ \"./node_modules/uuid/dist/cjs/rng.js\");\nconst stringify_js_1 = __webpack_require__(/*! ./stringify.js */ \"./node_modules/uuid/dist/cjs/stringify.js\");\nconst _state = {};\nfunction v7(options, buf, offset) {\n    let bytes;\n    if (options) {\n        bytes = v7Bytes(options.random ?? options.rng?.() ?? (0, rng_js_1.default)(), options.msecs, options.seq, buf, offset);\n    }\n    else {\n        const now = Date.now();\n        const rnds = (0, rng_js_1.default)();\n        updateV7State(_state, now, rnds);\n        bytes = v7Bytes(rnds, _state.msecs, _state.seq, buf, offset);\n    }\n    return buf ?? (0, stringify_js_1.unsafeStringify)(bytes);\n}\nfunction updateV7State(state, now, rnds) {\n    state.msecs ??= -Infinity;\n    state.seq ??= 0;\n    if (now > state.msecs) {\n        state.seq = (rnds[6] << 23) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9];\n        state.msecs = now;\n    }\n    else {\n        state.seq = (state.seq + 1) | 0;\n        if (state.seq === 0) {\n            state.msecs++;\n        }\n    }\n    return state;\n}\nexports.updateV7State = updateV7State;\nfunction v7Bytes(rnds, msecs, seq, buf, offset = 0) {\n    if (rnds.length < 16) {\n        throw new Error('Random bytes length must be >= 16');\n    }\n    if (!buf) {\n        buf = new Uint8Array(16);\n        offset = 0;\n    }\n    else {\n        if (offset < 0 || offset + 16 > buf.length) {\n            throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);\n        }\n    }\n    msecs ??= Date.now();\n    seq ??= ((rnds[6] * 0x7f) << 24) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9];\n    buf[offset++] = (msecs / 0x10000000000) & 0xff;\n    buf[offset++] = (msecs / 0x100000000) & 0xff;\n    buf[offset++] = (msecs / 0x1000000) & 0xff;\n    buf[offset++] = (msecs / 0x10000) & 0xff;\n    buf[offset++] = (msecs / 0x100) & 0xff;\n    buf[offset++] = msecs & 0xff;\n    buf[offset++] = 0x70 | ((seq >>> 28) & 0x0f);\n    buf[offset++] = (seq >>> 20) & 0xff;\n    buf[offset++] = 0x80 | ((seq >>> 14) & 0x3f);\n    buf[offset++] = (seq >>> 6) & 0xff;\n    buf[offset++] = ((seq << 2) & 0xff) | (rnds[10] & 0x03);\n    buf[offset++] = rnds[11];\n    buf[offset++] = rnds[12];\n    buf[offset++] = rnds[13];\n    buf[offset++] = rnds[14];\n    buf[offset++] = rnds[15];\n    return buf;\n}\nexports[\"default\"] = v7;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/v7.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/validate.js":
/*!************************************************!*\
  !*** ./node_modules/uuid/dist/cjs/validate.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst regex_js_1 = __webpack_require__(/*! ./regex.js */ \"./node_modules/uuid/dist/cjs/regex.js\");\nfunction validate(uuid) {\n    return typeof uuid === 'string' && regex_js_1.default.test(uuid);\n}\nexports[\"default\"] = validate;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/validate.js?");

/***/ }),

/***/ "./node_modules/uuid/dist/cjs/version.js":
/*!***********************************************!*\
  !*** ./node_modules/uuid/dist/cjs/version.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst validate_js_1 = __webpack_require__(/*! ./validate.js */ \"./node_modules/uuid/dist/cjs/validate.js\");\nfunction version(uuid) {\n    if (!(0, validate_js_1.default)(uuid)) {\n        throw TypeError('Invalid UUID');\n    }\n    return parseInt(uuid.slice(14, 15), 16);\n}\nexports[\"default\"] = version;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./node_modules/uuid/dist/cjs/version.js?");

/***/ }),

/***/ "./src/main/benchmarkManager.ts":
/*!**************************************!*\
  !*** ./src/main/benchmarkManager.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("\nvar __importDefault = (this && this.__importDefault) || function (mod) {\n    return (mod && mod.__esModule) ? mod : { \"default\": mod };\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.benchmarkManager = void 0;\nconst child_process_1 = __webpack_require__(/*! child_process */ \"child_process\");\nconst path_1 = __importDefault(__webpack_require__(/*! path */ \"path\"));\nconst uuid_1 = __webpack_require__(/*! uuid */ \"./node_modules/uuid/dist/cjs/index.js\");\nclass BenchmarkManager {\n    constructor() {\n        this.activeProcesses = new Map();\n        this.executablesPath = 'C:\\\\Users\\\\brand\\\\executables';\n    }\n    runBenchmark(params) {\n        const benchmarkId = (0, uuid_1.v4)();\n        const executablePath = path_1.default.join(this.executablesPath, `benchmark_${params.algorithm}.exe`);\n        return new Promise((resolve, reject) => {\n            const metrics = {};\n            const process = (0, child_process_1.spawn)(executablePath, [params.securityParam]);\n            this.activeProcesses.set(benchmarkId, process);\n            // Handle process output - extract metrics\n            process.stdout.on('data', (data) => {\n                const output = data.toString();\n                const lines = output.split('\\n');\n                for (const line of lines) {\n                    // Try different regex patterns for metric extraction\n                    // Pattern 1: Metric (unit): value\n                    let match = line.match(/(\\w+)\\s*\\((?:\\w+|ms)\\):\\s*([\\d.]+)/i);\n                    if (match) {\n                        const [, metric, value] = match;\n                        metrics[metric.toLowerCase()] = parseFloat(value);\n                        continue;\n                    }\n                    // Pattern 2: Metric: value ms\n                    match = line.match(/(\\w+):\\s*([\\d.]+)\\s*ms/i);\n                    if (match) {\n                        const [, metric, value] = match;\n                        metrics[metric.toLowerCase()] = parseFloat(value);\n                        continue;\n                    }\n                    // Pattern 3: Metric = value\n                    match = line.match(/(\\w+)\\s*=\\s*([\\d.]+)/i);\n                    if (match) {\n                        const [, metric, value] = match;\n                        metrics[metric.toLowerCase()] = parseFloat(value);\n                        continue;\n                    }\n                }\n            });\n            // Handle stderr output for better error reporting\n            let errorOutput = '';\n            process.stderr.on('data', (data) => {\n                errorOutput += data.toString();\n            });\n            process.on('error', (error) => {\n                this.activeProcesses.delete(benchmarkId);\n                reject({\n                    id: benchmarkId,\n                    algorithm: params.algorithm,\n                    securityParam: params.securityParam,\n                    metrics: {},\n                    timestamp: new Date().toISOString(),\n                    status: 'failed',\n                    error: error.message || 'Unknown error occurred',\n                });\n            });\n            process.on('close', (code) => {\n                this.activeProcesses.delete(benchmarkId);\n                // Check if we actually got any metrics\n                const hasMetrics = Object.keys(metrics).length > 0;\n                if (code === 0 && hasMetrics) {\n                    resolve({\n                        id: benchmarkId,\n                        algorithm: params.algorithm,\n                        securityParam: params.securityParam,\n                        metrics,\n                        timestamp: new Date().toISOString(),\n                        status: 'completed',\n                    });\n                }\n                else {\n                    // If process exited with code 0 but no metrics were found, it's still an error\n                    const errorMessage = errorOutput ||\n                        (code !== 0\n                            ? `Process exited with code ${code}`\n                            : 'No metrics found in benchmark output');\n                    reject({\n                        id: benchmarkId,\n                        algorithm: params.algorithm,\n                        securityParam: params.securityParam,\n                        metrics: hasMetrics ? metrics : {}, // Include any metrics we did find\n                        timestamp: new Date().toISOString(),\n                        status: 'failed',\n                        error: errorMessage,\n                    });\n                }\n            });\n        });\n    }\n    stopBenchmark(benchmarkId) {\n        const process = this.activeProcesses.get(benchmarkId);\n        if (process) {\n            process.kill();\n            this.activeProcesses.delete(benchmarkId);\n            return true;\n        }\n        return false;\n    }\n}\nexports.benchmarkManager = new BenchmarkManager();\n\n\n//# sourceURL=webpack://pqcbenchgui4/./src/main/benchmarkManager.ts?");

/***/ }),

/***/ "./src/main/ipc.ts":
/*!*************************!*\
  !*** ./src/main/ipc.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.setupBenchmarkIPC = setupBenchmarkIPC;\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\nconst benchmarkManager_1 = __webpack_require__(/*! ./benchmarkManager */ \"./src/main/benchmarkManager.ts\");\nconst store_1 = __webpack_require__(/*! ./store */ \"./src/main/store/index.ts\");\nfunction setupBenchmarkIPC() {\n    electron_1.ipcMain.handle('run-benchmark', async (_, params) => {\n        try {\n            const result = await benchmarkManager_1.benchmarkManager.runBenchmark(params);\n            // Save the benchmark result to the store\n            const savedResult = store_1.benchmarkStore.saveBenchmarkResult(result);\n            return savedResult;\n        }\n        catch (error) {\n            // We'll still save failed benchmarks but mark them as failed\n            if (error &&\n                typeof error === 'object' &&\n                error.id &&\n                error.status === 'failed') {\n                return store_1.benchmarkStore.saveBenchmarkResult(error);\n            }\n            return error;\n        }\n    });\n    electron_1.ipcMain.handle('stop-benchmark', async (_, benchmarkId) => {\n        return benchmarkManager_1.benchmarkManager.stopBenchmark(benchmarkId);\n    });\n    // New IPC handlers for benchmark data operations\n    electron_1.ipcMain.handle('get-all-benchmarks', async () => {\n        return store_1.benchmarkStore.getAllBenchmarkResults();\n    });\n    electron_1.ipcMain.handle('get-benchmarks-by-algorithm', async (_, algorithm) => {\n        return store_1.benchmarkStore.getBenchmarksByAlgorithm(algorithm);\n    });\n    electron_1.ipcMain.handle('get-benchmarks-by-security-param', async (_, securityParam) => {\n        return store_1.benchmarkStore.getBenchmarksBySecurityParam(securityParam);\n    });\n    electron_1.ipcMain.handle('get-benchmarks-by-algorithm-and-param', async (_, algorithm, securityParam) => {\n        return store_1.benchmarkStore.getBenchmarksByAlgorithmAndParam(algorithm, securityParam);\n    });\n    electron_1.ipcMain.handle('get-benchmarks-by-date-range', async (_, startDate, endDate) => {\n        return store_1.benchmarkStore.getBenchmarksByDateRange(new Date(startDate), new Date(endDate));\n    });\n    electron_1.ipcMain.handle('get-benchmarks-by-status', async (_, status) => {\n        return store_1.benchmarkStore.getBenchmarksByStatus(status);\n    });\n    electron_1.ipcMain.handle('get-benchmark-by-id', async (_, id) => {\n        return store_1.benchmarkStore.getBenchmarkById(id);\n    });\n    electron_1.ipcMain.handle('delete-benchmark', async (_, id) => {\n        return store_1.benchmarkStore.deleteBenchmark(id);\n    });\n    electron_1.ipcMain.handle('clear-all-benchmarks', async () => {\n        store_1.benchmarkStore.clearAllBenchmarks();\n        return true;\n    });\n}\n\n\n//# sourceURL=webpack://pqcbenchgui4/./src/main/ipc.ts?");

/***/ }),

/***/ "./src/main/main.ts":
/*!**************************!*\
  !*** ./src/main/main.ts ***!
  \**************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("\nvar __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    var desc = Object.getOwnPropertyDescriptor(m, k);\n    if (!desc || (\"get\" in desc ? !m.__esModule : desc.writable || desc.configurable)) {\n      desc = { enumerable: true, get: function() { return m[k]; } };\n    }\n    Object.defineProperty(o, k2, desc);\n}) : (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    o[k2] = m[k];\n}));\nvar __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {\n    Object.defineProperty(o, \"default\", { enumerable: true, value: v });\n}) : function(o, v) {\n    o[\"default\"] = v;\n});\nvar __importStar = (this && this.__importStar) || (function () {\n    var ownKeys = function(o) {\n        ownKeys = Object.getOwnPropertyNames || function (o) {\n            var ar = [];\n            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;\n            return ar;\n        };\n        return ownKeys(o);\n    };\n    return function (mod) {\n        if (mod && mod.__esModule) return mod;\n        var result = {};\n        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== \"default\") __createBinding(result, mod, k[i]);\n        __setModuleDefault(result, mod);\n        return result;\n    };\n})();\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\nconst path = __importStar(__webpack_require__(/*! path */ \"path\"));\nconst ipc_1 = __webpack_require__(/*! ./ipc */ \"./src/main/ipc.ts\");\nlet mainWindow = null;\n// Enable live reload in development mode\n/* Commenting out electron-reload for now to fix errors\nif (process.env.NODE_ENV === 'development') {\n    try {\n        require('electron-reload')(__dirname, {\n            electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),\n            hardResetMethod: 'exit',\n        });\n        console.log('Electron reload enabled for development');\n    } catch (err) {\n        console.error('Failed to setup electron-reload:', err);\n    }\n}\n*/\nfunction createWindow() {\n    mainWindow = new electron_1.BrowserWindow({\n        width: 1200,\n        height: 800,\n        webPreferences: {\n            nodeIntegration: true,\n            contextIsolation: true,\n            preload: path.join(__dirname, 'preload.js'),\n        },\n        // Modern UI touches\n        titleBarStyle: 'hidden',\n        titleBarOverlay: {\n            color: '#1f2937',\n            symbolColor: '#f9fafb',\n            height: 40,\n        },\n        backgroundColor: '#111827', // Dark background color\n    });\n    // Load the index.html file from the dist directory\n    const indexPath = path.join(__dirname, 'index.html');\n    console.log('Loading index.html from:', indexPath);\n    mainWindow.loadFile(indexPath); // Remove hash: 'home' since React Router handles routing\n    // Open DevTools in development\n    if (true) {\n        mainWindow.webContents.openDevTools();\n    }\n    // Handle window close event\n    mainWindow.on('closed', () => {\n        mainWindow = null;\n    });\n    return mainWindow;\n}\n// This method will be called when Electron has finished initialization\nelectron_1.app.whenReady().then(() => {\n    createWindow();\n    (0, ipc_1.setupBenchmarkIPC)();\n    electron_1.app.on('activate', () => {\n        // On macOS, re-create a window when the dock icon is clicked and no other windows are open\n        if (electron_1.BrowserWindow.getAllWindows().length === 0) {\n            createWindow();\n        }\n    });\n});\n// Quit when all windows are closed, except on macOS\nelectron_1.app.on('window-all-closed', () => {\n    if (process.platform !== 'darwin') {\n        electron_1.app.quit();\n    }\n});\n\n\n//# sourceURL=webpack://pqcbenchgui4/./src/main/main.ts?");

/***/ }),

/***/ "./src/main/store/benchmark-store.ts":
/*!*******************************************!*\
  !*** ./src/main/store/benchmark-store.ts ***!
  \*******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("\nvar __importDefault = (this && this.__importDefault) || function (mod) {\n    return (mod && mod.__esModule) ? mod : { \"default\": mod };\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.BenchmarkStore = void 0;\nconst fs_1 = __importDefault(__webpack_require__(/*! fs */ \"fs\"));\nconst path_1 = __importDefault(__webpack_require__(/*! path */ \"path\"));\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\nconst uuid_1 = __webpack_require__(/*! uuid */ \"./node_modules/uuid/dist/cjs/index.js\");\nclass BenchmarkStore {\n    constructor() {\n        // Store data in the app's user data directory\n        this.storePath = path_1.default.join(electron_1.app.getPath('userData'), 'benchmark-data.json');\n        this.data = { benchmarks: [] };\n        this.loadData();\n    }\n    /**\n     * Load benchmark data from the JSON file\n     */\n    loadData() {\n        try {\n            if (fs_1.default.existsSync(this.storePath)) {\n                const fileContent = fs_1.default.readFileSync(this.storePath, 'utf-8');\n                this.data = JSON.parse(fileContent);\n            }\n            else {\n                // Initialize with empty data and create the file\n                this.saveData();\n            }\n        }\n        catch (error) {\n            console.error('Error loading benchmark data:', error);\n            // Initialize with empty data if there's an error\n            this.data = { benchmarks: [] };\n        }\n    }\n    /**\n     * Save the current data to the JSON file\n     */\n    saveData() {\n        try {\n            fs_1.default.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2), 'utf-8');\n        }\n        catch (error) {\n            console.error('Error saving benchmark data:', error);\n        }\n    }\n    /**\n     * Save a new benchmark result\n     */\n    saveBenchmarkResult(result) {\n        const benchmarkWithId = {\n            ...result,\n            id: (0, uuid_1.v4)(),\n        };\n        this.data.benchmarks.push(benchmarkWithId);\n        this.saveData();\n        return benchmarkWithId;\n    }\n    /**\n     * Get all benchmark results\n     */\n    getAllBenchmarkResults() {\n        return [...this.data.benchmarks];\n    }\n    /**\n     * Get benchmark results filtered by algorithm\n     */\n    getBenchmarksByAlgorithm(algorithm) {\n        return this.data.benchmarks.filter((benchmark) => benchmark.algorithm.toLowerCase() === algorithm.toLowerCase());\n    }\n    /**\n     * Get benchmark results filtered by security parameter\n     */\n    getBenchmarksBySecurityParam(securityParam) {\n        return this.data.benchmarks.filter((benchmark) => benchmark.securityParam === securityParam);\n    }\n    /**\n     * Get benchmark results filtered by algorithm and security parameter\n     */\n    getBenchmarksByAlgorithmAndParam(algorithm, securityParam) {\n        return this.data.benchmarks.filter((benchmark) => benchmark.algorithm.toLowerCase() === algorithm.toLowerCase() &&\n            benchmark.securityParam === securityParam);\n    }\n    /**\n     * Get benchmarks within a date range\n     */\n    getBenchmarksByDateRange(startDate, endDate) {\n        return this.data.benchmarks.filter((benchmark) => {\n            const benchmarkDate = new Date(benchmark.timestamp);\n            return benchmarkDate >= startDate && benchmarkDate <= endDate;\n        });\n    }\n    /**\n     * Get benchmarks by completion status\n     */\n    getBenchmarksByStatus(status) {\n        return this.data.benchmarks.filter((benchmark) => benchmark.status === status);\n    }\n    /**\n     * Delete a benchmark by ID\n     */\n    deleteBenchmark(id) {\n        const initialLength = this.data.benchmarks.length;\n        this.data.benchmarks = this.data.benchmarks.filter((benchmark) => benchmark.id !== id);\n        if (initialLength !== this.data.benchmarks.length) {\n            this.saveData();\n            return true;\n        }\n        return false;\n    }\n    /**\n     * Clear all benchmarks\n     */\n    clearAllBenchmarks() {\n        this.data.benchmarks = [];\n        this.saveData();\n    }\n    /**\n     * Get benchmark by ID\n     */\n    getBenchmarkById(id) {\n        return this.data.benchmarks.find((benchmark) => benchmark.id === id);\n    }\n    /**\n     * Custom query function for more complex filtering\n     */\n    queryBenchmarks(filterFn) {\n        return this.data.benchmarks.filter(filterFn);\n    }\n}\nexports.BenchmarkStore = BenchmarkStore;\n\n\n//# sourceURL=webpack://pqcbenchgui4/./src/main/store/benchmark-store.ts?");

/***/ }),

/***/ "./src/main/store/index.ts":
/*!*********************************!*\
  !*** ./src/main/store/index.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.BenchmarkStore = exports.benchmarkStore = void 0;\nconst benchmark_store_1 = __webpack_require__(/*! ./benchmark-store */ \"./src/main/store/benchmark-store.ts\");\nObject.defineProperty(exports, \"BenchmarkStore\", ({ enumerable: true, get: function () { return benchmark_store_1.BenchmarkStore; } }));\n// Create a singleton instance of the BenchmarkStore\nexports.benchmarkStore = new benchmark_store_1.BenchmarkStore();\n\n\n//# sourceURL=webpack://pqcbenchgui4/./src/main/store/index.ts?");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

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
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main/main.ts");
/******/ 	
/******/ })()
;