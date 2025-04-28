import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

interface LightingSwitchEasterEggProps {
	enabled: boolean;
	onDisableButton?: (disabled: boolean) => void;
}

// Message variants
const MESSAGE_VARIANTS = [
	// Variant 1 (Original)
	[
		'Stop that',
		'...',
		'Seriously?',
		"This is why we can't have nice things",
		'sudo rm -rf /home/user',
		'Have it your way',
	],
	// Variant 2 (Passive-aggressive / Sarcastic)
	[
		'Stop that',
		'...',
		'Are you proud of yourself?',
		'Go ahead, break everything',
		'systemctl disable sanity.service',
		"Fine. You're the boss.",
	],
	// Variant 3 (Absurdist / Dark Comedy)
	[
		'Stop that',
		'...',
		'You think this is a game?',
		'Every toggle shortens your lifespan',
		'user.exe has stopped working',
		'All hail the clicker king',
	],
];

// Local storage key for tracking last variant
const LAST_VARIANT_KEY = 'lightingSwitchLastVariant';

const LightingSwitchEasterEgg: React.FC<LightingSwitchEasterEggProps> = ({
	enabled,
	onDisableButton,
}) => {
	const [triggerCount, setTriggerCount] = useState(0);
	const [message, setMessage] = useState('');
	const [showMessage, setShowMessage] = useState(false);
	const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
	const [isAnimating, setIsAnimating] = useState(false);
	const [currentVariant, setCurrentVariant] = useState(0);

	// Refs
	const clicksRef = useRef<Array<number>>([]);
	const animationInProgressRef = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const messageRef = useRef<HTMLDivElement>(null);
	const cursorPositionRef = useRef({ x: 0, y: 0 }); // Use ref to avoid stale closures
	const cycleDoneRef = useRef(false); // Track if the full cycle has been completed

	// Choose a semi-random variant on mount
	useEffect(() => {
		const selectVariant = () => {
			try {
				// Get the last used variant from localStorage
				const lastVariant = localStorage.getItem(LAST_VARIANT_KEY);
				const lastIndex = lastVariant ? parseInt(lastVariant) : -1;

				// Select a random variant that's different from the last one
				let newIndex;
				if (lastIndex === -1) {
					// No previous variant, select any random one
					newIndex = Math.floor(Math.random() * MESSAGE_VARIANTS.length);
				} else {
					// Get available indices excluding the last used one
					const availableIndices = Array.from(
						{ length: MESSAGE_VARIANTS.length },
						(_, i) => i
					).filter((i) => i !== lastIndex);

					// Randomly select from available indices
					newIndex =
						availableIndices[
							Math.floor(Math.random() * availableIndices.length)
						];
				}

				setCurrentVariant(newIndex);

				// Save the new variant to localStorage
				localStorage.setItem(LAST_VARIANT_KEY, newIndex.toString());
			} catch (error) {
				// Fallback to variant 0 if localStorage fails
				console.error('Error accessing localStorage:', error);
				setCurrentVariant(0);
			}
		};

		// Reset cycle completion status on component mount
		cycleDoneRef.current = false;
		setTriggerCount(0);
		selectVariant();
	}, []);

	// Track mouse position
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			const position = { x: e.clientX, y: e.clientY };
			setCursorPosition(position);
			cursorPositionRef.current = position; // Update the ref as well
		};

		window.addEventListener('mousemove', handleMouseMove);
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
		};
	}, []);

	// Handle click counter and trigger detection
	useEffect(() => {
		// Skip if animation is already in progress or cycle is complete
		if (animationInProgressRef.current || cycleDoneRef.current) return;

		// Only track clicks when we're in dark mode (enabled === true)
		if (enabled === true) {
			const now = Date.now();
			clicksRef.current.push(now);
			console.log(
				`Dark mode toggle at ${now}. Total clicks: ${clicksRef.current.length}`
			);

			// Filter clicks to only include those within the last 5 seconds
			const fiveSecondsAgo = now - 5000;
			clicksRef.current = clicksRef.current.filter(
				(time) => time > fiveSecondsAgo
			);

			// Check if we have 10 or more clicks in the 5-second window
			if (clicksRef.current.length >= 10 && !animationInProgressRef.current) {
				console.log('Easter egg triggered in dark mode!');
				clicksRef.current = []; // Reset after trigger

				// Call triggerEasterEgg in setTimeout to ensure state is updated
				setTimeout(() => {
					triggerEasterEgg();
				}, 0);
			}
		}
	}, [enabled]);

	// Trigger the easter egg
	const triggerEasterEgg = useCallback(() => {
		// Stop if animation is already in progress or cycle is done
		if (animationInProgressRef.current || cycleDoneRef.current) return;

		// Set animation flags
		animationInProgressRef.current = true;
		setIsAnimating(true);

		// Disable the button
		if (onDisableButton) {
			onDisableButton(true);
		}

		// Capture the current cursor position to avoid it moving during animation
		const fixedPosition = { ...cursorPositionRef.current };
		console.log('Message will appear at cursor position:', fixedPosition);

		// Get the messages for the current variant
		const messages = MESSAGE_VARIANTS[currentVariant];

		// Increment trigger count and set appropriate message
		setTriggerCount((prev) => {
			const newCount = prev + 1;
			// Get message from current variant based on count
			const messageIndex = Math.min(newCount - 1, messages.length - 1);
			setMessage(messages[messageIndex]);

			// Check if we've reached the end of the cycle
			if (newCount >= messages.length) {
				cycleDoneRef.current = true;
				console.log(
					'Easter egg cycle completed, no more messages will be shown'
				);
			}

			return newCount;
		});

		// Show message and animate
		setShowMessage(true);

		// Hide after 3 seconds and re-enable the button
		setTimeout(() => {
			setShowMessage(false);
			setIsAnimating(false);
			if (onDisableButton) {
				onDisableButton(false);
			}
			animationInProgressRef.current = false;
		}, 3000);
	}, [onDisableButton, currentVariant]);

	// Animate the message appearing
	useEffect(() => {
		if (showMessage && messageRef.current) {
			gsap.fromTo(
				messageRef.current,
				{
					opacity: 0,
					y: -20,
					scale: 0.8,
				},
				{
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 0.4,
					ease: 'back.out(1.7)',
					onComplete: () => {
						gsap.to(messageRef.current, {
							opacity: 0,
							y: -10,
							duration: 0.3,
							delay: 2,
						});
					},
				}
			);
		}
	}, [showMessage]);

	// Export isAnimating state for parent component to know when to disable the button
	useEffect(() => {
		if (onDisableButton) {
			onDisableButton(isAnimating);
		}
	}, [isAnimating, onDisableButton]);

	// Only show the component when triggered
	if (!showMessage) return null;

	return (
		<div
			ref={containerRef}
			className="fixed inset-0 pointer-events-none z-50"
			style={{ pointerEvents: 'none' }}
		>
			{/* Message bubble */}
			<div
				ref={messageRef}
				className="absolute bg-black border border-gray-500 rounded-md text-green-500 p-3 shadow-lg"
				style={{
					left: `${cursorPosition.x + 15}px`,
					top: `${cursorPosition.y - 60}px`,
					fontFamily: 'monospace',
					opacity: 0,
					zIndex: 10000,
					maxWidth: '320px',
				}}
			>
				<div className="flex items-center">
					<div className="mr-2 text-xs opacity-70">root@keystone:~#</div>
					<div className="font-bold">{message}</div>
				</div>
			</div>
		</div>
	);
};

export default LightingSwitchEasterEgg;
