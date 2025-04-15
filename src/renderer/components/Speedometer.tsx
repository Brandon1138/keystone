import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useTheme } from '@mui/material/styles';

interface SpeedometerProps {
	value: number; // 0–100 progress
	isRunning: boolean;
	label: string;
	algorithm?: string;
	securityParam?: string;
	justCompleted?: boolean; // New prop to indicate benchmark just completed
}

export const Speedometer: React.FC<SpeedometerProps> = ({
	value = 0,
	isRunning = false,
	label = 'Ready',
	algorithm,
	securityParam,
	justCompleted = false,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const needleRef = useRef<HTMLDivElement>(null);
	const backgroundRef = useRef<HTMLImageElement>(null);
	const gaugeRef = useRef<HTMLImageElement>(null);
	const glowRef = useRef<HTMLDivElement>(null);
	const glowTimelineRef = useRef<gsap.core.Timeline | null>(null);
	const initializedRef = useRef<boolean>(false);

	// Example: from -210° to +30° for a 240° sweep
	const startAngle = -210;
	const endAngle = +30;
	const angle = startAngle + (value / 100) * (endAngle - startAngle);

	// Get appropriate background and gauge images based on theme
	const backgroundImage = isDarkMode
		? 'gauge_background_dark.svg'
		: 'gauge_background_light.svg';
	const gaugeImage = isDarkMode ? 'gauge_dark.svg' : 'gauge_light.svg';

	// Start needle at the startAngle on mount, but only if it hasn't been initialized
	// and value is not already at 100%
	useEffect(() => {
		if (needleRef.current && !initializedRef.current) {
			// Set the initial position if value is not already 100
			if (value < 100) {
				gsap.set(needleRef.current, { rotation: startAngle });
			} else {
				gsap.set(needleRef.current, { rotation: angle });
			}
			initializedRef.current = true;
		}
	}, [startAngle, angle, value]);

	// Animate needle whenever `value` changes, but only if value is changing significantly
	// or the component is running
	useEffect(() => {
		if (needleRef.current && initializedRef.current) {
			gsap.to(needleRef.current, {
				rotation: angle,
				duration: 0.8,
				ease: 'elastic.out(0.5, 0.3)',
			});
		}
	}, [angle, isRunning]);

	// Handle glow animation based on isRunning state
	useEffect(() => {
		// Kill any existing timeline to prevent memory leaks
		if (glowTimelineRef.current) {
			glowTimelineRef.current.kill();
		}

		// Create a new GSAP timeline for glow animation
		const tl = gsap.timeline({
			paused: true,
			defaults: { ease: 'power2.inOut' },
		});

		if ((isRunning || justCompleted) && glowRef.current) {
			// Initial fade in
			tl.to(glowRef.current, {
				opacity: 1,
				duration: 0.6,
				ease: 'power2.out',
			});

			// Add subtle pulse animation - if justCompleted, only pulse once
			tl.to(
				glowRef.current,
				{
					scale: 1.05,
					opacity: 0.95,
					duration: 1.2,
					repeat: justCompleted ? 0 : -1, // Only pulse once if justCompleted
					yoyo: true,
					ease: 'sine.inOut',
				},
				'<'
			);

			// If justCompleted, add fade out after the single pulse
			if (justCompleted) {
				tl.to(glowRef.current, {
					opacity: 0,
					scale: 0.95,
					duration: 1.2,
					ease: 'power2.out',
				});
			}

			// Play the timeline
			tl.play();
		} else if (glowRef.current) {
			// Fade out if not running
			tl.to(glowRef.current, {
				opacity: 0,
				scale: 1,
				duration: 0.5,
			});
			tl.play();
		}

		glowTimelineRef.current = tl;

		// Clean up timeline on unmount
		return () => {
			if (glowTimelineRef.current) {
				glowTimelineRef.current.kill();
			}
		};
	}, [isRunning, justCompleted]);

	return (
		<div className="flex flex-col items-center justify-center relative">
			<div className="relative w-[220px] h-[220px]">
				{/* Background layer */}
				<img
					ref={backgroundRef}
					src={backgroundImage}
					alt="Gauge background"
					className="absolute top-0 left-0 w-full h-full"
				/>

				{/* Glow layer with custom wrapper for better animation control */}
				<div
					ref={glowRef}
					className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]"
					style={{
						opacity: 0,
						zIndex: 10,
						transformOrigin: 'center center',
					}}
				>
					<img
						src="gauge_glow.svg"
						alt="Gauge glow"
						className="w-full h-full"
					/>
				</div>

				{/* Gauge layer */}
				<img
					ref={gaugeRef}
					src={gaugeImage}
					alt="Gauge"
					className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px]"
					style={{ zIndex: 20 }}
				/>

				{/* Needle container */}
				<div
					ref={needleRef}
					style={{
						position: 'absolute',
						width: '100px',
						height: 'auto',
						left: '50%',
						top: '50%',
						transform: 'translate(0, -50%)',
						transformOrigin: 'left center',
						zIndex: 30,
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
				<div
					className="absolute inset-0 flex items-center justify-center"
					style={{ zIndex: 40 }}
				>
					<div className="text-center translate-y-[60px]">
						<div
							className="text-base font-medium italic"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							{label}
						</div>
						{algorithm && securityParam && (
							<div className="text-xs" style={{ color: '#999999' }}>
								{`${algorithm}-${securityParam}`}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
