import React, { forwardRef } from 'react';

interface CardProps {
	className?: string;
	children?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
	({ className = '', children }, ref) => {
		return (
			<div
				ref={ref}
				className={`
					backdrop-filter backdrop-blur-md
					bg-white/20 dark:bg-[#212121]/30
					border border-white/20 dark:border-white/10
					rounded-xl
					shadow-lg
					${className}
				`}
			>
				{children}
			</div>
		);
	}
);

Card.displayName = 'Card';
