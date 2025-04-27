module.exports = {
	content: ['./src/**/*.{js,jsx,ts,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// shadcn-inspired color palette with dark as default
				background: {
					DEFAULT: '#09090b', // slate-950 (dark by default)
					light: '#f8f9fa', // Changed from #ffffff to a softer off-white
				},
				foreground: {
					DEFAULT: '#f1f5f9', // slate-100 (light text on dark background)
					light: '#18181b', // slate-900
				},
				card: {
					DEFAULT: '#212121', // dark card (updated to #212121)
					light: '#ffffff', // Keep white for cards but with softer shadow in CSS
					dark: '#212121', // Added for dark:bg-card-dark variant
				},
				border: {
					DEFAULT: '#2e2e3e', // slate-800 dark borders
					light: '#e2e8f0', // slate-200
				},
				primary: {
					DEFAULT: '#3b82f6', // blue-500
					foreground: '#ffffff',
				},
				muted: {
					DEFAULT: '#1e293b', // slate-800 (dark muted)
					foreground: '#94a3b8', // slate-400 (muted text on dark)
					light: '#f1f5f9', // slate-100
					'foreground-light': '#64748b', // slate-500
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
