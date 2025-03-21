import React from 'react';

interface IconProps {
	className?: string;
}

export const KeygenIcon: React.FC<IconProps> = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M15 7.5V7a4 4 0 0 0-8 0v0.5M10 15H8a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2h-2" />
		<path d="M12 7.5v7" />
		<path d="M20.5 12.5 22 14l-2 2h-3l-2-2v-4l2-2h3l1.44 1.44" />
		<path d="M12.5 7.5h-1" />
	</svg>
);

export const EncapsIcon: React.FC<IconProps> = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
		<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		<line x1="8" y1="15" x2="10" y2="15" />
		<line x1="14" y1="15" x2="16" y2="15" />
	</svg>
);

export const DecapsIcon: React.FC<IconProps> = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
		<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		<path d="M12 14v3" />
		<path d="M10 17h4" />
	</svg>
);

export const SpeedIcon: React.FC<IconProps> = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="m8 13.5 4-8 4 8" />
		<path d="M15 13.5a2.5 2.5 0 0 1-5 0" />
		<circle cx="12" cy="12" r="10" />
	</svg>
);

export const PerformanceIcon: React.FC<IconProps> = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M12 9a4 4 0 0 0-2 7.5" />
		<path d="M12 3v2" />
		<path d="m6.6 18.4-1.4 1.4" />
		<path d="M20 12h-2" />
		<path d="M6.6 5.6 5.2 4.2" />
		<path d="M12 21v-2" />
		<path d="m18.4 18.4 1.4 1.4" />
		<path d="M4 12h2" />
		<path d="m18.4 5.6 1.4-1.4" />
		<path d="M16 12h-2" />
		<polyline points="12 10 12 12 13 13" />
	</svg>
);

export const ComputerIcon: React.FC<IconProps> = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="2" y="4" width="20" height="12" rx="2" ry="2" />
		<path d="M8 20h8" />
		<path d="M12 16v4" />
		<path d="M17 9.5V8a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1.5" />
	</svg>
);
