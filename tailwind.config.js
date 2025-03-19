module.exports = {
	content: ['./src/**/*.{js,jsx,ts,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// shadcn-inspired color palette
				background: {
					DEFAULT: '#ffffff',
					dark: '#09090b', // slate-950
				},
				foreground: {
					DEFAULT: '#18181b', // slate-900
					dark: '#e2e8f0', // slate-200
				},
				card: {
					DEFAULT: '#ffffff',
					dark: '#1e1e2e', // slate-900
				},
				border: {
					DEFAULT: '#e2e8f0', // slate-200
					dark: '#2e2e3e', // slate-800
				},
				primary: {
					DEFAULT: '#3b82f6', // blue-500
					foreground: '#ffffff',
				},
				muted: {
					DEFAULT: '#f1f5f9', // slate-100
					foreground: '#64748b', // slate-500
					dark: '#1e293b', // slate-800
					'foreground-dark': '#94a3b8', // slate-400
				},
			},
			borderRadius: {
				lg: '0.5rem',
				md: '0.375rem',
				sm: '0.25rem',
			},
			boxShadow: {
				sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
				DEFAULT:
					'0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
			},
		},
	},
	plugins: [],
};
