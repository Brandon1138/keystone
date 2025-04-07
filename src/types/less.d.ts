// Type declaration for less modules
// This adds support for importing .less files
declare module '*.less' {
	const content: { [className: string]: string };
	export default content;
}

// Type declaration for the less library itself
declare module 'less' {
	export interface Less {
		render: (input: string, options?: any) => Promise<{ css: string }>;
	}

	const less: Less;
	export default less;
}
