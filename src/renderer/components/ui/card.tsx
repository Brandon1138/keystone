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
				className={`bg-white dark:bg-[#212121] rounded-xl shadow ${className}`}
			>
				{children}
			</div>
		);
	}
);

Card.displayName = 'Card';
