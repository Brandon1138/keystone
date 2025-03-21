import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface SpeedometerProps {
	value: number; // 0-100 progress value
	isRunning: boolean;
	label: string; // Label to display (e.g., "Ready", "Key Generation", etc.)
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
	// Refs for GSAP animations
	const needleRef = useRef<HTMLDivElement>(null);
	const dialRef = useRef<HTMLImageElement>(null);

	// Calculate rotation angle for the needle (from -150 to 30 degrees)
	// -150 is 8 o'clock, 30 is 4 o'clock
	const angle = -150 + (value / 100) * 180;

	// Choose the appropriate dial image based on running state
	// Fix paths - use just the filename, no paths
	const dialImage = isRunning ? 'dial_on.svg' : 'dial_off.svg';

	// Set initial rotation to -150 degrees (8 o'clock) on mount
	useEffect(() => {
		if (needleRef.current) {
			gsap.set(needleRef.current, {
				rotation: -150, // Start at 8 o'clock position
			});
		}
	}, []);

	// Use GSAP to animate the needle rotation
	useEffect(() => {
		if (needleRef.current) {
			gsap.to(needleRef.current, {
				rotation: angle,
				duration: 0.8,
				ease: 'elastic.out(0.5, 0.3)',
			});
		}
	}, [angle]);

	// Use GSAP to animate between dial states
	useEffect(() => {
		if (dialRef.current) {
			gsap.to(dialRef.current, {
				opacity: 0,
				duration: 0.3,
				onComplete: () => {
					dialRef.current!.src = dialImage;
					gsap.to(dialRef.current, {
						opacity: 1,
						duration: 0.3,
					});
				},
			});
		}
	}, [dialImage]);

	return (
		<div className="flex flex-col items-center justify-center relative">
			{/* Algorithm and security param info if provided */}
			{algorithm && securityParam && (
				<div className="text-center mb-2">
					<div className="font-medium">{algorithm}</div>
					<div className="text-sm text-muted-foreground">{securityParam}</div>
				</div>
			)}

			<div className="relative w-[220px] h-[220px]">
				{/* Dial background */}
				<img
					ref={dialRef}
					src={dialImage}
					alt="Speedometer dial"
					className="absolute top-0 left-0 w-full h-full"
				/>

				{/* Needle - positioned with butt at center and head pointing at 8 o'clock when at rest */}
				<div
					ref={needleRef}
					className="absolute top-0 left-0 w-full h-full"
					style={{
						transformOrigin: 'center center',
					}}
				>
					<img
						src="needle.svg"
						alt="Needle"
						style={{
							position: 'absolute',
							width: '110px',
							height: 'auto',
							left: '50%',
							top: '50%',
							transform: 'translateY(-50%)', // Center vertically only
							transformOrigin: '0 50%', // Rotate from left center (butt of needle)
						}}
					/>
				</div>

				{/* Central label */}
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
