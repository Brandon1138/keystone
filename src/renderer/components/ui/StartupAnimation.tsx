import React, { useRef, useEffect, useState } from 'react';
import { THREE } from '../../utils/threeInstance';
import { gsap } from 'gsap';
import { Typography, LinearProgress, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface StartupAnimationProps {
	onComplete?: () => void;
	duration?: number;
}

const StartupAnimation: React.FC<StartupAnimationProps> = ({
	onComplete,
	duration = 3000,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';

	const mountRef = useRef<HTMLDivElement>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const qubit1Ref = useRef<THREE.Mesh | null>(null);
	const qubit2Ref = useRef<THREE.Mesh | null>(null);
	const particlesRef = useRef<THREE.Points | null>(null);
	const frameIdRef = useRef<number>(0);
	const animationTimelineRef = useRef<gsap.core.Timeline | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const [progress, setProgress] = useState(0);
	const [fadeOut, setFadeOut] = useState(false);

	// Initialize Three.js scene
	const initThreeJS = () => {
		if (!mountRef.current) return;

		// Create scene
		const scene = new THREE.Scene();
		sceneRef.current = scene;

		// Create camera with adjusted position to ensure qubits are visible
		const camera = new THREE.PerspectiveCamera(
			60,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		// Move camera back to see the scene better
		camera.position.z = 10; // Increased from 8 to ensure visibility
		camera.position.y = 0; // Reset to center view
		cameraRef.current = camera;

		// Create renderer with preserveDrawingBuffer for better compatibility
		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			preserveDrawingBuffer: true,
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
		renderer.setClearColor(0x000000, 0); // Transparent background

		// Clear any previous content
		if (mountRef.current.firstChild) {
			mountRef.current.removeChild(mountRef.current.firstChild);
		}

		mountRef.current.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		// Create qubits
		createQubits();

		// Create entanglement particles
		createEntanglementParticles();

		// Create GSAP animations
		createAnimations();

		// Create progress animation
		animateProgress();

		// Handle window resize
		const handleResize = () => {
			if (!cameraRef.current || !rendererRef.current) return;

			cameraRef.current.aspect = window.innerWidth / window.innerHeight;
			cameraRef.current.updateProjectionMatrix();
			rendererRef.current.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		// Initial render to ensure content is visible
		if (rendererRef.current && sceneRef.current && cameraRef.current) {
			rendererRef.current.render(sceneRef.current, cameraRef.current);
		}

		// Return cleanup function
		return () => {
			window.removeEventListener('resize', handleResize);
			if (mountRef.current && rendererRef.current) {
				mountRef.current.removeChild(rendererRef.current.domElement);
			}
			cleanupThreeJS();
		};
	};

	// Create qubit meshes
	const createQubits = () => {
		if (!sceneRef.current) return;

		// Create sphere geometry for qubits
		const qubitGeometry = new THREE.SphereGeometry(0.7, 32, 32);

		// Material for qubit 1 - blue with higher emission and no transparency initially
		const qubit1Material = new THREE.MeshPhongMaterial({
			color: new THREE.Color(0x3b82f6),
			emissive: new THREE.Color(0x3b82f6).multiplyScalar(0.6),
			transparent: true,
			opacity: 0.9,
			shininess: 100,
		});

		// Material for qubit 2 - purple with higher emission and no transparency initially
		const qubit2Material = new THREE.MeshPhongMaterial({
			color: new THREE.Color(0x9747ff),
			emissive: new THREE.Color(0x9747ff).multiplyScalar(0.6),
			transparent: true,
			opacity: 0.9,
			shininess: 100,
		});

		// Create the qubit meshes
		const qubit1 = new THREE.Mesh(qubitGeometry, qubit1Material);
		const qubit2 = new THREE.Mesh(qubitGeometry, qubit2Material);

		// Position qubits - moved further downwards to avoid overlapping with text
		qubit1.position.set(-2.5, -2.8, 0); // Moved up from -3.5
		qubit2.position.set(2.5, -2.8, 0); // Moved up from -3.5

		// Add them to the scene
		sceneRef.current.add(qubit1);
		sceneRef.current.add(qubit2);

		// Store references
		qubit1Ref.current = qubit1;
		qubit2Ref.current = qubit2;

		// Add lighting - enhanced for better visibility
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased intensity
		sceneRef.current.add(ambientLight);

		// Directional light for better shadows and highlights
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Increased intensity
		directionalLight.position.set(0, 5, 5);
		sceneRef.current.add(directionalLight);

		// Point lights for each qubit with increased intensity
		const light1 = new THREE.PointLight(0x3b82f6, 3, 15); // Increased intensity and range
		light1.position.set(-2.5, -3.5, 2); // Adjusted to match new qubit position
		sceneRef.current.add(light1);

		const light2 = new THREE.PointLight(0x9747ff, 3, 15); // Increased intensity and range
		light2.position.set(2.5, -3.5, 2); // Adjusted to match new qubit position
		sceneRef.current.add(light2);
	};

	// Create particles between qubits to represent entanglement
	const createEntanglementParticles = () => {
		if (!sceneRef.current) return;

		// Create more particles for better visibility
		const particleCount = 200; // Increased from 150
		const particleGeometry = new THREE.BufferGeometry();
		const positions = new Float32Array(particleCount * 3);

		// Place particles in a line between the qubits - adjusted Y position to match qubits
		for (let i = 0; i < particleCount; i++) {
			const t = i / (particleCount - 1);

			// Linear interpolation between qubit positions with slight curve
			positions[i * 3] = -2.5 + t * 5; // X coordinate (from qubit1 to qubit2)

			// Add slight curve to the particles with adjusted base Y position
			const yOffset = Math.sin(t * Math.PI) * 0.3 - 2.8; // Base Y position matches new qubit position
			positions[i * 3 + 1] = yOffset; // Y coordinate

			// Add depth variation
			const zOffset = (Math.random() - 0.5) * 0.5;
			positions[i * 3 + 2] = zOffset; // Z coordinate
		}

		particleGeometry.setAttribute(
			'position',
			new THREE.BufferAttribute(positions, 3)
		);

		// Create particle material with larger size and glow
		const particleMaterial = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.15, // Increased from 0.12
			transparent: true,
			opacity: 0.8, // Start with some opacity
			blending: THREE.AdditiveBlending,
		});

		// Create particle system
		const particles = new THREE.Points(particleGeometry, particleMaterial);

		// Add to scene
		sceneRef.current.add(particles);

		// Store reference
		particlesRef.current = particles;
	};

	// Create animations using GSAP
	const createAnimations = () => {
		if (!qubit1Ref.current || !qubit2Ref.current || !particlesRef.current)
			return;

		const timeline = gsap.timeline({
			defaults: { ease: 'power2.inOut' },
			paused: false, // Make sure the timeline is not paused
		});

		// Start with visible qubits in initial position
		timeline.set(qubit1Ref.current.position, { x: -6, y: -2.8 }); // Updated Y position
		timeline.set(qubit2Ref.current.position, { x: 6, y: -2.8 }); // Updated Y position

		// Don't start with opacity 0
		// timeline.set([qubit1Ref.current, qubit2Ref.current], { opacity: 0 });

		// Move to positions first, no need for opacity animation
		timeline.to(
			qubit1Ref.current.position,
			{
				x: -2.5,
				y: -2.8, // Updated Y position
				duration: 1.2,
				ease: 'back.out(1.7)',
			},
			0
		);

		timeline.to(
			qubit2Ref.current.position,
			{
				x: 2.5,
				y: -2.8, // Updated Y position
				duration: 1.2,
				ease: 'back.out(1.7)',
			},
			0
		);

		// Start rotation
		timeline.to(
			qubit1Ref.current.rotation,
			{
				y: Math.PI * 2,
				duration: 4,
				repeat: -1,
				ease: 'none',
			},
			0.5
		);

		timeline.to(
			qubit2Ref.current.rotation,
			{
				y: -Math.PI * 2,
				duration: 4,
				repeat: -1,
				ease: 'none',
			},
			0.5
		);

		// Pulse effect for qubits
		timeline.to(
			[qubit1Ref.current.scale, qubit2Ref.current.scale],
			{
				x: 1.1,
				y: 1.1,
				z: 1.1,
				duration: 1.5,
				repeat: -1,
				yoyo: true,
			},
			1
		);

		// Particles already start visible, just add animation
		timeline.to(
			particlesRef.current.material,
			{
				opacity: 0.4,
				duration: 1.5,
				repeat: -1,
				yoyo: true,
			},
			0.5
		);

		// Slight movement toward each other to show attraction
		timeline.to(
			qubit1Ref.current.position,
			{
				x: -2,
				y: -2.8, // Updated Y position
				duration: 2,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			},
			1
		);

		timeline.to(
			qubit2Ref.current.position,
			{
				x: 2,
				y: -2.8, // Updated Y position
				duration: 2,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			},
			1
		);

		// Store timeline reference and play it
		animationTimelineRef.current = timeline;
		timeline.play();
	};

	// Animate progress bar
	const animateProgress = () => {
		gsap.to(
			{},
			{
				duration: duration / 1000,
				onUpdate: function () {
					const progressValue = Math.min(
						100,
						Math.floor(this.progress() * 100)
					);
					setProgress(progressValue);

					// When progress reaches 100%, start fade out after a small delay
					if (progressValue === 100 && !fadeOut) {
						setTimeout(() => {
							setFadeOut(true);
							startFadeOutAnimation();
						}, 500);
					}
				},
			}
		);
	};

	// Start fade out animation
	const startFadeOutAnimation = () => {
		if (!containerRef.current) return;

		const tl = gsap.timeline({
			onComplete: () => {
				// Call onComplete callback after fade out finishes
				if (onComplete) {
					onComplete();
				}

				// Add CSS to remove pointer events from the container to allow clicking through
				if (containerRef.current) {
					containerRef.current.style.pointerEvents = 'none';
					containerRef.current.style.display = 'none'; // Completely hide the element
				}
			},
		});

		// Fade out animation for the entire component
		tl.to(containerRef.current, {
			opacity: 0,
			duration: 0.5, // Reduced from 0.8 for a faster transition
			ease: 'power2.out',
		});

		// Also scale down the qubits for a nice effect
		if (qubit1Ref.current && qubit2Ref.current) {
			tl.to(
				[qubit1Ref.current.scale, qubit2Ref.current.scale],
				{
					x: 0.1,
					y: 0.1,
					z: 0.1,
					duration: 0.5, // Reduced from 0.8 to match container fade duration
				},
				'-=0.5' // Match the duration above
			);
		}
	};

	// Animation loop
	const animate = () => {
		if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

		// Animation logic
		if (particlesRef.current) {
			// Make the particles swirl around the line
			const positions = particlesRef.current.geometry.attributes.position.array;
			const particleCount = positions.length / 3;

			for (let i = 0; i < particleCount; i++) {
				const t = i / (particleCount - 1);
				const time = Date.now() * 0.001;

				// Add more dramatic swirling motion while maintaining baseline Y position
				const swirl = 0.3 * Math.sin(t * 10 + time * 3); // Increased amplitude
				const yOffset = swirl * Math.sin(time * 2 + i) - 2.8; // Updated baseline Y position
				const zOffset = swirl * Math.cos(time * 2 + i);

				positions[i * 3 + 1] = yOffset; // Y
				positions[i * 3 + 2] = zOffset; // Z
			}

			particlesRef.current.geometry.attributes.position.needsUpdate = true;
		}

		// Add a slight camera movement to make scene more dynamic
		if (cameraRef.current) {
			const time = Date.now() * 0.0005;
			cameraRef.current.position.y = Math.sin(time) * 0.2;
			cameraRef.current.lookAt(0, 0, 0);
		}

		// Render scene
		rendererRef.current.render(sceneRef.current, cameraRef.current);

		// Request next frame
		frameIdRef.current = requestAnimationFrame(animate);
	};

	// Clean up Three.js resources
	const cleanupThreeJS = () => {
		// Cancel animation frame
		if (frameIdRef.current) {
			cancelAnimationFrame(frameIdRef.current);
		}

		// Clean up GSAP timeline
		if (animationTimelineRef.current) {
			animationTimelineRef.current.kill();
		}

		// Dispose of Three.js objects
		if (qubit1Ref.current) {
			qubit1Ref.current.geometry.dispose();
			if (qubit1Ref.current.material instanceof THREE.Material) {
				qubit1Ref.current.material.dispose();
			}
		}

		if (qubit2Ref.current) {
			qubit2Ref.current.geometry.dispose();
			if (qubit2Ref.current.material instanceof THREE.Material) {
				qubit2Ref.current.material.dispose();
			}
		}

		if (particlesRef.current) {
			particlesRef.current.geometry.dispose();
			if (particlesRef.current.material instanceof THREE.Material) {
				particlesRef.current.material.dispose();
			}
		}

		// Dispose renderer
		if (rendererRef.current) {
			rendererRef.current.dispose();
		}
	};

	// Initialize Three.js on component mount
	useEffect(() => {
		const cleanup = initThreeJS();

		// Start animation loop - ensure this runs after scene is set up
		if (sceneRef.current && cameraRef.current && rendererRef.current) {
			frameIdRef.current = requestAnimationFrame(animate);
		}

		return () => {
			cleanup && cleanup();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="fixed inset-0 flex flex-col items-center justify-center bg-opacity-90 z-50"
			style={{
				backgroundColor: isDarkMode
					? 'rgba(0, 0, 0, 0.95)'
					: 'rgba(255, 255, 255, 0.95)',
				pointerEvents: fadeOut ? 'none' : 'auto', // Add this to disable pointer events when fading out
			}}
		>
			{/* Three.js canvas with explicit styles to ensure visibility */}
			<div
				ref={mountRef}
				className="w-full h-full absolute inset-0 z-0"
				style={{
					position: 'absolute',
					width: '100%',
					height: '100%',
					overflow: 'hidden',
				}}
			/>

			{/* Content overlay with increased top padding to create more space between text and 3D elements */}
			<div
				className="z-10 relative flex flex-col items-center space-y-8"
				style={{ paddingTop: '3rem' }}
			>
				<Typography
					variant="h3"
					sx={{
						fontWeight: 600,
						color: isDarkMode ? '#ffffff' : '#000000',
						textShadow: isDarkMode
							? '0 0 20px rgba(151, 71, 255, 0.7)'
							: '0 0 10px rgba(151, 71, 255, 0.3)',
					}}
				>
					Keystone
				</Typography>

				<Typography
					variant="h5"
					sx={{
						color: isDarkMode ? '#ffffff' : '#000000',
						opacity: 0.9,
						mb: 2,
					}}
				>
					Loading...
				</Typography>

				<Box sx={{ width: '300px' }}>
					<LinearProgress
						variant="determinate"
						value={progress}
						sx={{
							height: 8,
							borderRadius: 4,
							backgroundColor: isDarkMode
								? 'rgba(255, 255, 255, 0.1)'
								: 'rgba(0, 0, 0, 0.1)',
							'& .MuiLinearProgress-bar': {
								borderRadius: 4,
								background: 'linear-gradient(90deg, #3b82f6 0%, #9747ff 100%)',
								transition: 'transform 0.2s linear',
							},
						}}
					/>
					<Typography
						variant="caption"
						sx={{
							display: 'block',
							textAlign: 'right',
							mt: 1,
							color: isDarkMode ? '#ffffff' : '#000000',
							opacity: 0.7,
						}}
					>
						{progress}%
					</Typography>
				</Box>
			</div>
		</div>
	);
};

export default StartupAnimation;
