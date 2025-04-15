import React from 'react';
import { Card } from './ui/card';

interface MetricItem {
	label: string;
	value: string;
	unit?: string;
}

interface MetricsCardProps {
	title: string;
	icon: React.ReactNode;
	metrics: MetricItem[];
	iconColor?: string;
	animateMetrics?: boolean;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
	title,
	icon,
	metrics,
	iconColor = '#9747FF',
	animateMetrics = false,
}) => {
	return (
		<Card className="p-4 h-full">
			<div className="flex items-center mb-3">
				<div
					className="mr-2 rounded-full p-2"
					style={{ backgroundColor: `${iconColor}20` }} // 20 is hex for 12% opacity
				>
					<div style={{ color: iconColor }}>{icon}</div>
				</div>
				<h3 className="text-xl font-medium">{title}</h3>
			</div>

			<div className="space-y-3">
				{metrics.map((metric, index) => (
					<div
						key={index}
						className={`metric-update ${
							animateMetrics ? 'animate-metric' : ''
						}`}
					>
						<div className="text-sm text-muted-foreground">{metric.label}</div>
						<div className="text-lg font-medium">
							{metric.value} {metric.unit}
						</div>
					</div>
				))}
			</div>
		</Card>
	);
};
