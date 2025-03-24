const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
	ipcRenderer: {
		invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
		on: (channel, func) => {
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		},
		once: (channel, func) => {
			ipcRenderer.once(channel, (event, ...args) => func(...args));
		},
		removeListener: (channel, func) => {
			ipcRenderer.removeListener(channel, func);
		},
	},
});

// Expose the process.versions to the renderer
contextBridge.exposeInMainWorld('process', {
	versions: process.versions,
});

// Preload script
window.addEventListener('DOMContentLoaded', () => {
	const replaceText = (selector, text) => {
		const element = document.getElementById(selector);
		if (element) element.innerText = text;
	};

	for (const type of ['chrome', 'node', 'electron']) {
		replaceText(`${type}-version`, process.versions[type]);
	}
});

// Note: The Dilithium signature API is exposed through the existing ipcRenderer.invoke method
// The following IPC channels are available:
// - 'dilithium-generate-keypair' - Generate a Dilithium keypair
// - 'dilithium-sign' - Sign a message with Dilithium
// - 'dilithium-verify' - Verify a Dilithium signature
//
// And the existing Kyber channels:
// - 'kyber-generate-keypair' - Generate a Kyber keypair
// - 'kyber-encrypt' - Encrypt a message with Kyber
// - 'kyber-decrypt' - Decrypt a Kyber-encrypted message
