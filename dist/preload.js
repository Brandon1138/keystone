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
