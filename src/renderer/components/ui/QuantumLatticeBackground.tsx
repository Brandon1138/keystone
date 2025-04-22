import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useTheme } from '@mui/material/styles';
import { useSettings } from '../../context/SettingsContext';

interface QuantumLatticeBackgroundProps {
	enabled?: boolean;
	intensity?: number; // Optional intensity prop for benchmarks
}

const QuantumLatticeBackground: React.FC<QuantumLatticeBackgroundProps> = ({
	enabled = true,
	intensity = 1,
}) => {
	const theme = useTheme();
	const { settings } = useSettings();
	const isDarkMode = theme.palette.mode === 'dark';

	// Determine if animation should be shown based on settings and theme
	const shouldShowAnimation =
		enabled &&
		settings.animatedBackground &&
		(isDarkMode || !settings.disableAnimatedBackgroundOnLightMode);

	const mountRef = useRef<HTMLDivElement>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const nodesRef = useRef<THREE.Mesh[]>([]);
	const linesRef = useRef<THREE.Line[]>([]);
	const frameIdRef = useRef<number>(0);
	const lastTimeRef = useRef<number>(0);
	const fpsRef = useRef<number[]>([]);

	const [isThrottled, setIsThrottled] = useState(false);

	// Clean up function to dispose Three.js resources
	const cleanupThreeJS = () => {
		if (frameIdRef.current) {
			cancelAnimationFrame(frameIdRef.current);
		}

		// Dispose geometries and materials
		if (nodesRef.current.length > 0) {
			nodesRef.current.forEach((node) => {
				node.geometry.dispose();
				if (Array.isArray(node.material)) {
					node.material.forEach((mat) => mat.dispose());
				} else {
					node.material.dispose();
				}
			});
		}

		if (linesRef.current.length > 0) {
			linesRef.current.forEach((line) => {
				line.geometry.dispose();
				if (Array.isArray(line.material)) {
					line.material.forEach((mat) => mat.dispose());
				} else {
					line.material.dispose();
				}
			});
		}

		// Dispose renderer
		if (rendererRef.current) {
			rendererRef.current.dispose();
		}
	};

	// Initialize Three.js scene
	const initThreeJS = () => {
		if (!mountRef.current || !shouldShowAnimation) return;

		// Create scene
		const scene = new THREE.Scene();
		sceneRef.current = scene;

		// Create camera with adjusted field of view and position
		const camera = new THREE.PerspectiveCamera(
			70, // Wider field of view (was 75)
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		// Position camera farther back to see more of the wider distribution
		camera.position.z = 10;
		cameraRef.current = camera;

		// Create renderer
		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true, // Transparent background
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000, 0); // Transparent background
		mountRef.current.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		// Style the canvas element
		const canvas = renderer.domElement;
		canvas.style.position = 'fixed';
		canvas.style.top = '0';
		canvas.style.left = '0';
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		canvas.style.pointerEvents = 'none';
		canvas.style.zIndex = '0';

		// Create quantum lattice
		createQuantumLattice();

		// Handle window resize
		const handleResize = () => {
			if (cameraRef.current && rendererRef.current) {
				cameraRef.current.aspect = window.innerWidth / window.innerHeight;
				cameraRef.current.updateProjectionMatrix();
				rendererRef.current.setSize(window.innerWidth, window.innerHeight);
			}
		};

		window.addEventListener('resize', handleResize);

		// Cleanup on return
		return () => {
			window.removeEventListener('resize', handleResize);
			if (mountRef.current && rendererRef.current) {
				mountRef.current.removeChild(rendererRef.current.domElement);
			}
			cleanupThreeJS();
		};
	};

	// Create quantum lattice nodes and connections
	const createQuantumLattice = () => {
		if (!sceneRef.current) return;

		const scene = sceneRef.current;
		const nodes: THREE.Mesh[] = [];
		const lines: THREE.Line[] = [];

		// Increased node count for better coverage
		const nodeCount = 45 + Math.floor(intensity * 15);

		// Create nodes with varying sizes
		for (let i = 0; i < nodeCount; i++) {
			// Vary node sizes slightly for visual interest
			const nodeSize = 0.06 + Math.random() * 0.08;
			const nodeGeometry = new THREE.SphereGeometry(nodeSize, 16, 16);

			// Create node with glow effect
			const nodeMaterial = new THREE.MeshBasicMaterial({
				// Vary the color slightly for visual interest
				color: new THREE.Color(0x9747ff).offsetHSL(
					0,
					0,
					(Math.random() - 0.5) * 0.2
				),
				transparent: true,
				opacity: 0.7 + Math.random() * 0.3,
			});

			const node = new THREE.Mesh(nodeGeometry, nodeMaterial);

			// Modified position distribution to create a wider, more elliptical pattern
			// that extends further on the horizontal plane
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);

			// Base radius is now larger
			const radius = 5 + Math.random() * 4;

			// Apply a horizontal stretching factor to create a wider distribution
			const horizontalStretch = 1.8; // X-axis stretch factor
			const verticalCompress = 0.8; // Y-axis compression factor

			// Position with horizontal stretching to fill side spaces
			node.position.x =
				radius * Math.sin(phi) * Math.cos(theta) * horizontalStretch;
			node.position.y =
				radius * Math.sin(phi) * Math.sin(theta) * verticalCompress;
			node.position.z = radius * Math.cos(phi);

			// Add some extra random offset to X position to ensure lateral spread
			// This will push some nodes beyond the viewport edges
			node.position.x += (Math.random() - 0.5) * 8;

			// Add metadata for animation
			node.userData = {
				originalPosition: node.position.clone(),
				jitterAmplitude: 0.02 + Math.random() * 0.05,
				jitterFrequency: 0.5 + Math.random() * 1.5,
			};

			scene.add(node);
			nodes.push(node);
		}

		// Increased connection distance to ensure nodes at the edges still connect
		const maxDistance = 3.2;

		// Create connections between nodes with varying opacity and width
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const distance = nodes[i].position.distanceTo(nodes[j].position);

				if (distance < maxDistance) {
					const lineGeometry = new THREE.BufferGeometry().setFromPoints([
						nodes[i].position,
						nodes[j].position,
					]);

					// Vary line opacity based on distance for depth effect
					const opacityFactor = 1 - (distance / maxDistance) * 0.7;
					const linesMaterial = new THREE.LineBasicMaterial({
						// Vary between blue and purple based on distance
						color: new THREE.Color().lerpColors(
							new THREE.Color(0x3b82f6), // Blue
							new THREE.Color(0x9747ff), // Purple
							Math.random() * 0.4 // Random mix
						),
						transparent: true,
						opacity: 0.2 * opacityFactor,
					});

					const line = new THREE.Line(lineGeometry, linesMaterial);

					// Add metadata for pulsing
					line.userData = {
						pulseSpeed: 0.5 + Math.random() * 1.5,
						minOpacity: 0.05,
						maxOpacity: 0.4 * opacityFactor,
						nodes: [i, j], // Store indices of connected nodes
					};

					scene.add(line);
					lines.push(line);
				}
			}
		}

		nodesRef.current = nodes;
		linesRef.current = lines;

		// Create GSAP animations
		createAnimations();
	};

	// Create GSAP animations for nodes and lines
	const createAnimations = () => {
		if (!nodesRef.current.length) return;

		// Animate each node
		nodesRef.current.forEach((node) => {
			// Create a repeating animation that jitters the node
			gsap.to(node.position, {
				x: `+=${node.userData.jitterAmplitude}`,
				y: `+=${node.userData.jitterAmplitude}`,
				z: `+=${node.userData.jitterAmplitude}`,
				duration: 1 / node.userData.jitterFrequency,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			});

			// Animate node opacity for subtle pulsing
			gsap.to(node.material, {
				opacity: 0.5,
				duration: 1 + Math.random() * 2,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			});
		});

		// Animate lines opacity for energy pulsing effect
		linesRef.current.forEach((line) => {
			gsap.to(line.material, {
				opacity: line.userData.maxOpacity,
				duration: 1 / line.userData.pulseSpeed,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			});
		});
	};

	// Update function that runs on each animation frame
	const update = (time: number) => {
		if (
			!shouldShowAnimation ||
			!sceneRef.current ||
			!cameraRef.current ||
			!rendererRef.current
		) {
			return;
		}

		// Calculate FPS
		if (lastTimeRef.current !== 0) {
			const delta = time - lastTimeRef.current;
			const fps = 1000 / delta;

			// Keep a rolling average of FPS
			fpsRef.current.push(fps);
			if (fpsRef.current.length > 10) {
				fpsRef.current.shift();
			}

			// Calculate average FPS
			const avgFps =
				fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length;

			// Throttle if FPS is too low
			if (avgFps < 30 && !isThrottled) {
				setIsThrottled(true);
			} else if (avgFps > 40 && isThrottled) {
				setIsThrottled(false);
			}
		}
		lastTimeRef.current = time;

		// Add a very subtle rotation to the entire scene for better visual interest
		if (sceneRef.current) {
			sceneRef.current.rotation.y = Math.sin(time * 0.00005) * 0.1;
			sceneRef.current.rotation.x = Math.sin(time * 0.00003) * 0.05;
		}

		// Update lines to follow nodes as they move
		linesRef.current.forEach((line) => {
			const lineGeo = line.geometry as THREE.BufferGeometry;
			const nodeIndices = line.userData.nodes;

			if (nodeIndices && nodeIndices.length === 2) {
				const startNode = nodesRef.current[nodeIndices[0]];
				const endNode = nodesRef.current[nodeIndices[1]];

				const points = [startNode.position, endNode.position];
				lineGeo.setFromPoints(points);
			}
		});

		// Enhanced camera movement for a more dynamic view
		if (cameraRef.current) {
			// Add slight rotation to better show the side elements
			// Use slower rotation for X to focus on horizontal movement
			cameraRef.current.position.x = Math.sin(time * 0.00008) * 2.5;
			cameraRef.current.position.y = Math.sin(time * 0.00012) * 0.8;
			// Small Z-axis breathing effect
			cameraRef.current.position.z = 10 + Math.sin(time * 0.00015) * 0.5;
			cameraRef.current.lookAt(0, 0, 0);
		}

		// Render scene
		rendererRef.current.render(sceneRef.current, cameraRef.current);

		// Request next frame
		frameIdRef.current = requestAnimationFrame(update);
	};

	// Initialize Three.js on component mount
	useEffect(() => {
		if (!shouldShowAnimation) return;

		const cleanup = initThreeJS();
		frameIdRef.current = requestAnimationFrame(update);

		return () => {
			cleanup && cleanup();
		};
	}, [shouldShowAnimation]);

	// Handle intensity changes
	useEffect(() => {
		if (!shouldShowAnimation || !nodesRef.current.length) return;

		// Adjust animation intensity based on prop
		nodesRef.current.forEach((node) => {
			gsap.to(node.userData, {
				jitterAmplitude: (0.02 + Math.random() * 0.05) * intensity,
				duration: 1,
				ease: 'power2.inOut',
			});
		});

		linesRef.current.forEach((line) => {
			gsap.to(line.userData, {
				maxOpacity: Math.min(0.3 + intensity * 0.2, 0.7), // Cap at 0.7 opacity
				duration: 1,
				ease: 'power2.inOut',
			});
		});
	}, [intensity, shouldShowAnimation]);

	// Don't render anything if animation shouldn't be shown
	if (!shouldShowAnimation) {
		return null;
	}

	return (
		<div
			ref={mountRef}
			className="fixed inset-0 w-full h-full z-0 pointer-events-none"
			aria-hidden="true"
		/>
	);
};

export default QuantumLatticeBackground;
