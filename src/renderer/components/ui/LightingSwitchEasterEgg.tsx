import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { THREE } from '../../utils/threeInstance';

interface LightingSwitchEasterEggProps {
	enabled: boolean;
	onDisableButton?: (disabled: boolean) => void;
}

const LightingSwitchEasterEgg: React.FC<LightingSwitchEasterEggProps> = ({
	enabled,
	onDisableButton,
}) => {
	const [triggerCount, setTriggerCount] = useState(0);
	const [message, setMessage] = useState('');
	const [showMessage, setShowMessage] = useState(false);
	const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
	const [isAnimating, setIsAnimating] = useState(false);

	// Refs
	const clicksRef = useRef<Array<number>>([]);
	const animationInProgressRef = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const messageRef = useRef<HTMLDivElement>(null);
	const cursorPositionRef = useRef({ x: 0, y: 0 }); // Use ref to avoid stale closures
	const lightningContainerRef = useRef<HTMLDivElement>(null);
	const threeSceneRef = useRef<{
		scene: THREE.Scene | null;
		camera: THREE.OrthographicCamera | null;
		renderer: THREE.WebGLRenderer | null;
		lightning: THREE.Group | null;
	}>({
		scene: null,
		camera: null,
		renderer: null,
		lightning: null,
	});

	// Initialize Three.js scene
	useEffect(() => {
		if (!lightningContainerRef.current) return;

		const container = lightningContainerRef.current;
		const width = window.innerWidth;
		const height = window.innerHeight;

		// Create scene
		const scene = new THREE.Scene();

		// Create orthographic camera
		const camera = new THREE.OrthographicCamera(
			-width / 2,
			width / 2,
			height / 2,
			-height / 2,
			0.1,
			1000
		);
		camera.position.z = 10;

		// Create renderer
		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setSize(width, height);
		renderer.setClearColor(0x000000, 0);
		container.appendChild(renderer.domElement);

		// Store references
		threeSceneRef.current = {
			scene,
			camera,
			renderer,
			lightning: null,
		};

		// Handle resize
		const handleResize = () => {
			if (!threeSceneRef.current.camera || !threeSceneRef.current.renderer)
				return;

			const width = window.innerWidth;
			const height = window.innerHeight;

			threeSceneRef.current.camera.left = -width / 2;
			threeSceneRef.current.camera.right = width / 2;
			threeSceneRef.current.camera.top = height / 2;
			threeSceneRef.current.camera.bottom = -height / 2;
			threeSceneRef.current.camera.updateProjectionMatrix();

			threeSceneRef.current.renderer.setSize(width, height);
		};

		window.addEventListener('resize', handleResize);

		// Cleanup
		return () => {
			window.removeEventListener('resize', handleResize);
			if (threeSceneRef.current.renderer) {
				if (container.contains(threeSceneRef.current.renderer.domElement)) {
					container.removeChild(threeSceneRef.current.renderer.domElement);
				}
				threeSceneRef.current.renderer.dispose();
			}
		};
	}, []);

	// Helper function to create lightning bolt
	const createLightning = (startX: number, startY: number) => {
		if (!threeSceneRef.current.scene) return null;

		// Remove any existing lightning
		if (threeSceneRef.current.lightning) {
			threeSceneRef.current.scene.remove(threeSceneRef.current.lightning);
		}

		const group = new THREE.Group();
		const blueColor = new THREE.Color(0x00bfff); // Bright blue color

		// Create lightning segments
		const createSegment = (
			start: THREE.Vector3,
			end: THREE.Vector3,
			thickness: number,
			segments: number
		) => {
			if (segments <= 0) return;

			// Add random displacement to middle point
			const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
			const jitterAmount = Math.min(thickness * 3, start.distanceTo(end) * 0.4);
			mid.x += (Math.random() - 0.5) * jitterAmount;
			mid.y += (Math.random() - 0.5) * jitterAmount;

			// Create main bolt
			const material = new THREE.LineBasicMaterial({
				color: blueColor,
				transparent: true,
				opacity: 0.8 + Math.random() * 0.2,
				linewidth: thickness,
			});

			const geometry = new THREE.BufferGeometry().setFromPoints([
				start,
				mid,
				end,
			]);
			const line = new THREE.Line(geometry, material);
			group.add(line);

			// Create glow effect
			const glowMaterial = new THREE.LineBasicMaterial({
				color: blueColor,
				transparent: true,
				opacity: 0.3,
				linewidth: thickness * 2.5,
			});
			const glowLine = new THREE.Line(geometry, glowMaterial);
			group.add(glowLine);

			// Recursively create branches
			if (segments > 0) {
				createSegment(start, mid, thickness * 0.8, segments - 1);
				createSegment(mid, end, thickness * 0.8, segments - 1);

				// Add random branches with some probability
				if (Math.random() < 0.5 && segments > 1) {
					const branchEnd = new THREE.Vector3(
						mid.x + (Math.random() - 0.5) * jitterAmount * 1.5,
						mid.y + (Math.random() - 0.5) * jitterAmount * 1.5,
						mid.z
					);
					createSegment(mid, branchEnd, thickness * 0.6, segments - 2);
				}
			}
		};

		// Create main lightning bolt from top to cursor position
		const lightningStart = new THREE.Vector3(
			startX,
			-window.innerHeight / 2,
			0
		);
		const lightningEnd = new THREE.Vector3(startX, startY, 0);

		createSegment(lightningStart, lightningEnd, 3, 4);
		threeSceneRef.current.lightning = group;
		threeSceneRef.current.scene.add(group);

		return group;
	};

	// Function to animate the lightning
	const animateLightning = (lightning: THREE.Group) => {
		// Flash effect
		const flashIntensity = (time: number): number => {
			return Math.pow(Math.sin(time * Math.PI), 2);
		};

		const startTime = Date.now();
		const duration = 800; // ms

		// Animation loop
		const animate = () => {
			if (
				!threeSceneRef.current.renderer ||
				!threeSceneRef.current.scene ||
				!threeSceneRef.current.camera
			) {
				return;
			}

			const elapsed = Date.now() - startTime;
			const normalizedTime = Math.min(elapsed / duration, 1);

			// Update opacity based on time
			lightning.traverse((child) => {
				if (child instanceof THREE.Line) {
					const material = child.material as THREE.LineBasicMaterial;
					const baseOpacity = material.opacity;
					// Flash effect plus fade out
					material.opacity =
						baseOpacity *
						flashIntensity(normalizedTime * 5) *
						(1 - normalizedTime);
				}
			});

			threeSceneRef.current.renderer.render(
				threeSceneRef.current.scene,
				threeSceneRef.current.camera
			);

			if (normalizedTime < 1) {
				requestAnimationFrame(animate);
			} else {
				// Clean up when animation is complete
				if (threeSceneRef.current.scene && lightning) {
					threeSceneRef.current.scene.remove(lightning);
					threeSceneRef.current.lightning = null;
				}
			}
		};

		// Start animation
		animate();
	};

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
		// Skip if animation is already in progress
		if (animationInProgressRef.current) return;

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
		// Stop if animation is already in progress
		if (animationInProgressRef.current) return;

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

		// Create and animate lightning at cursor position
		if (
			threeSceneRef.current.scene &&
			threeSceneRef.current.camera &&
			threeSceneRef.current.renderer
		) {
			// Convert screen coordinates to Three.js coordinates
			const screenX = fixedPosition.x - window.innerWidth / 2;
			const screenY = -(fixedPosition.y - window.innerHeight / 2);

			// Create and animate lightning
			const lightning = createLightning(screenX, screenY);
			if (lightning) {
				animateLightning(lightning);
			}

			// Trigger a screen flash effect with GSAP
			if (lightningContainerRef.current) {
				const flash = document.createElement('div');
				flash.style.position = 'absolute';
				flash.style.top = '0';
				flash.style.left = '0';
				flash.style.width = '100%';
				flash.style.height = '100%';
				flash.style.backgroundColor = 'rgba(0, 191, 255, 0.2)';
				flash.style.pointerEvents = 'none';
				flash.style.zIndex = '9999';
				lightningContainerRef.current.appendChild(flash);

				gsap.to(flash, {
					opacity: 0,
					duration: 0.3,
					ease: 'power2.out',
					onComplete: () => {
						if (
							lightningContainerRef.current &&
							lightningContainerRef.current.contains(flash)
						) {
							lightningContainerRef.current.removeChild(flash);
						}
					},
				});
			}
		}

		// Increment trigger count and set appropriate message
		setTriggerCount((prev) => {
			const newCount = prev + 1;
			if (newCount === 1) {
				setMessage('Stop That');
			} else if (newCount === 2) {
				setMessage('Quit playing with the lights');
			} else {
				setMessage('Have it your way');
			}
			return newCount > 3 ? 3 : newCount;
		});

		// Show message and animate
		setShowMessage(true);

		// Try to play thunder sound effect if available
		try {
			const thunder = new Audio('./thunder.mp3');
			thunder.volume = 0.3;
			thunder.play().catch((err) => console.log('Audio play failed:', err));
		} catch (error) {
			console.log('Thunder sound effect not available:', error);
		}

		// Hide after 3 seconds and re-enable the button
		setTimeout(() => {
			setShowMessage(false);
			setIsAnimating(false);
			if (onDisableButton) {
				onDisableButton(false);
			}
			animationInProgressRef.current = false;
		}, 3000);
	}, [onDisableButton]);

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
			{/* Lightning container for Three.js */}
			<div
				ref={lightningContainerRef}
				className="fixed inset-0 pointer-events-none"
				style={{
					zIndex: 9999,
					pointerEvents: 'none',
				}}
			/>

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
					maxWidth: '250px',
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
