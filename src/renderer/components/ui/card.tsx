import React from 'react';

interface CardProps {
	className?: string;
	children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children }) => {
	return (
		<div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
			{children}
		</div>
	);
};
