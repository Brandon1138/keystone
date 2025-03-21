import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface SpeedometerProps {
	value: number; // 0–100 progress
	isRunning: boolean;
	label: string;
	algorithm?: string;
	securityParam?: string;
}

export const Speedometer: React.FC<SpeedometerProps> = ({
	value = 0,
	isRunning = false,
	label = 'Ready',
	algorithm,
	securityParam,
}) => {
	const needleRef = useRef<HTMLDivElement>(null);
	const dialRef = useRef<HTMLImageElement>(null);

	// Example: from -210° to +30° for a 240° sweep
	const startAngle = -210;
	const endAngle = +30;
	const angle = startAngle + (value / 100) * (endAngle - startAngle);

	// Swap dial images if needed
	const dialImage = isRunning ? 'dial_on.svg' : 'dial_off.svg';

	// Start needle at the startAngle on mount
	useEffect(() => {
		if (needleRef.current) {
			gsap.set(needleRef.current, { rotation: startAngle });
		}
	}, [startAngle]);

	// Animate needle whenever `value` changes
	useEffect(() => {
		if (needleRef.current) {
			gsap.to(needleRef.current, {
				rotation: angle,
				duration: 0.8,
				ease: 'elastic.out(0.5, 0.3)',
			});
		}
	}, [angle]);

	// Fade out dial, swap src, fade in
	useEffect(() => {
		if (dialRef.current) {
			gsap.to(dialRef.current, {
				opacity: 0,
				duration: 0.3,
				onComplete: () => {
					if (dialRef.current) {
						dialRef.current.src = dialImage;
						gsap.to(dialRef.current, { opacity: 1, duration: 0.3 });
					}
				},
			});
		}
	}, [dialImage]);

	return (
		<div className="flex flex-col items-center justify-center relative">
			{/* Show chosen algorithm & param above */}
			{algorithm && securityParam && (
				<div className="text-center mb-2">
					<div className="font-medium">{algorithm}</div>
					<div className="text-sm text-muted-foreground">{securityParam}</div>
				</div>
			)}

			<div className="relative w-[220px] h-[220px]">
				{/* Debug dot at bounding-box center */}
				<div
					className="absolute bg-red-500 w-2 h-2 rounded-full"
					style={{
						left: '50%',
						top: '50%',
						transform: 'translate(-50%, -50%)',
					}}
				/>

				{/* Dial */}
				<img
					ref={dialRef}
					src={dialImage}
					alt="Speedometer dial"
					className="absolute top-0 left-0 w-full h-full"
				/>

				{/* Needle container */}
				<div
					ref={needleRef}
					style={{
						position: 'absolute',
						width: '110px',
						height: 'auto',
						left: 'calc(50% + 0px)',
						// Move the needle container 1px lower:
						top: 'calc(50% + 1px)',
						transform: 'translate(0, -50%)',
						transformOrigin: '0 50%',
					}}
				>
					<img
						src="needle.svg"
						alt="Needle"
						style={{
							position: 'absolute',
							width: '100%',
							height: 'auto',
							top: 0,
							left: 0,
						}}
					/>
				</div>

				{/* Center label */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="text-center translate-y-[40px]">
						<div className="text-lg font-medium">{label}</div>
						{algorithm && securityParam && (
							<div className="text-sm text-muted-foreground">
								{`${algorithm}-${securityParam}`}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
