import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useTheme } from '@mui/material/styles';
import { useSettings } from '../../context/SettingsContext';
import { useQuantumHardware } from '../../context/QuantumHardwareContext';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

interface QuantumLatticeBackgroundProps {
	enabled?: boolean;
	intensity?: number; // Optional intensity prop for benchmarks
	algorithmType?: 'shors' | 'grovers' | null; // New prop to specify algorithm type
}

const QuantumLatticeBackground: React.FC<QuantumLatticeBackgroundProps> = ({
	enabled = true,
	intensity = 1,
	algorithmType = null,
}) => {
	const theme = useTheme();
	const { settings } = useSettings();
	const { isRunningOnHardware, jobId } = useQuantumHardware();
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
	const composerRef = useRef<EffectComposer | null>(null);
	const particlesRef = useRef<THREE.Points | null>(null);
	const pointLightsRef = useRef<THREE.PointLight[]>([]);
	const frameIdRef = useRef<number>(0);
	const lastTimeRef = useRef<number>(0);
	const fpsRef = useRef<number[]>([]);
	const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
	const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
	const coherenceTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
	const coheredNodesRef = useRef<Set<number>>(new Set());
	const visitedNodesRef = useRef<Set<number>>(new Set());
	const algorithmAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [lastDecoherenceCheck, setLastDecoherenceCheck] = useState<number>(0);

	const [isThrottled, setIsThrottled] = useState(false);
	const [activeNode, setActiveNode] = useState<number | null>(null);
	const [entangledNodes, setEntangledNodes] = useState<number[]>([]);
	const [isAnimating, setIsAnimating] = useState(false);

	// Clean up function to dispose Three.js resources
	const cleanupThreeJS = () => {
		if (frameIdRef.current) {
			cancelAnimationFrame(frameIdRef.current);
		}

		// Clear all coherence timeouts
		coherenceTimeoutsRef.current.forEach((timeout) => {
			clearTimeout(timeout);
		});
		coherenceTimeoutsRef.current.clear();

		// Clear the cohered and visited nodes sets
		coheredNodesRef.current.clear();
		visitedNodesRef.current.clear();

		// Clear algorithm animation timer
		if (algorithmAnimationTimerRef.current) {
			clearInterval(algorithmAnimationTimerRef.current);
			algorithmAnimationTimerRef.current = null;
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

		// Dispose particle system
		if (particlesRef.current) {
			particlesRef.current.geometry.dispose();
			if (Array.isArray(particlesRef.current.material)) {
				particlesRef.current.material.forEach((mat) => mat.dispose());
			} else {
				particlesRef.current.material.dispose();
			}
		}

		// Dispose point lights
		if (pointLightsRef.current.length > 0) {
			pointLightsRef.current.forEach((light) => {
				if (light.parent) {
					light.parent.remove(light);
				}
			});
			pointLightsRef.current = [];
		}

		// Dispose composer
		if (composerRef.current) {
			composerRef.current.renderTarget1.dispose();
			composerRef.current.renderTarget2.dispose();
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

		// Create renderer with higher quality settings
		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true, // Transparent background
			powerPreference: 'high-performance',
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
		renderer.setClearColor(0x000000, 0); // Transparent background
		renderer.outputColorSpace = THREE.SRGBColorSpace; // Better color encoding
		renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better tone mapping
		renderer.toneMappingExposure = 1.0;
		mountRef.current.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		// Add ambient light for overall scene illumination
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
		scene.add(ambientLight);

		// Add directional light to create highlights
		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		directionalLight.position.set(5, 10, 7);
		scene.add(directionalLight);

		// Create simple environment map for reflections
		// We'll use a simple cube texture to simulate an environment
		const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128);
		const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
		scene.add(cubeCamera);

		// Create a simple gradient environment
		const envScene = new THREE.Scene();
		const envGeometry = new THREE.SphereGeometry(100, 32, 32);
		const envMaterial = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			uniforms: {
				topColor: { value: new THREE.Color(0x222266) },
				bottomColor: { value: new THREE.Color(0x111122) },
			},
			vertexShader: `
				varying vec3 vWorldPosition;
				void main() {
					vec4 worldPosition = modelMatrix * vec4(position, 1.0);
					vWorldPosition = worldPosition.xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform vec3 topColor;
				uniform vec3 bottomColor;
				varying vec3 vWorldPosition;
				void main() {
					float h = normalize(vWorldPosition).y;
					gl_FragColor = vec4(mix(bottomColor, topColor, max(0.0, h)), 1.0);
				}
			`,
		});
		const envMesh = new THREE.Mesh(envGeometry, envMaterial);
		envScene.add(envMesh);

		// Render the cubemap once
		cubeCamera.update(renderer, envScene);

		// Set the environment map for the scene
		scene.environment = cubeRenderTarget.texture;

		// Set up post-processing with bloom effect if enabled
		if (settings.enableBloomEffect && isDarkMode) {
			const renderScene = new RenderPass(scene, camera);

			// Set up bloom pass with adjusted parameters
			const bloomPass = new UnrealBloomPass(
				new THREE.Vector2(window.innerWidth, window.innerHeight),
				settings.bloomIntensity, // Bloom intensity
				0.4, // Radius
				0.85 // Threshold
			);

			// Create composer
			const composer = new EffectComposer(renderer);
			composer.addPass(renderScene);
			composer.addPass(bloomPass);
			composerRef.current = composer;
		}

		// Style the canvas element
		const canvas = renderer.domElement;
		canvas.style.position = 'fixed';
		canvas.style.top = '0';
		canvas.style.left = '0';
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		canvas.style.zIndex = '0';
		canvas.style.pointerEvents = 'auto'; // Ensure clicks are captured

		// Setup click event listener
		canvas.addEventListener('click', handleCanvasClick);

		// Create quantum lattice
		createQuantumLattice();

		// Handle window resize
		const handleResize = () => {
			if (cameraRef.current && rendererRef.current) {
				cameraRef.current.aspect = window.innerWidth / window.innerHeight;
				cameraRef.current.updateProjectionMatrix();
				rendererRef.current.setSize(window.innerWidth, window.innerHeight);

				// Also resize composer if it exists
				if (composerRef.current && settings.enableBloomEffect) {
					composerRef.current.setSize(window.innerWidth, window.innerHeight);
				}
			}
		};

		window.addEventListener('resize', handleResize);

		// Cleanup on return
		return () => {
			window.removeEventListener('resize', handleResize);
			if (mountRef.current && rendererRef.current) {
				rendererRef.current.domElement.removeEventListener(
					'click',
					handleCanvasClick
				);
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
		const pointLights: THREE.PointLight[] = [];

		// Increased node count for better coverage
		const nodeCount = 45 + Math.floor(intensity * 15);

		// Create nodes with varying sizes
		for (let i = 0; i < nodeCount; i++) {
			// Vary node sizes slightly for visual interest
			const nodeSize = 0.06 + Math.random() * 0.08;
			// Increase geometry detail for better spheres (more segments)
			const nodeGeometry = new THREE.SphereGeometry(nodeSize, 24, 24);

			// Create node with glow effect - switch to MeshStandardMaterial for better lighting
			const nodeMaterial = settings.enableDynamicLighting
				? new THREE.MeshStandardMaterial({
						// Vary the color slightly for visual interest
						color: new THREE.Color(0x9747ff).offsetHSL(
							0,
							0,
							(Math.random() - 0.5) * 0.2
						),
						emissive: new THREE.Color(0x9747ff).offsetHSL(
							0,
							0,
							(Math.random() - 0.5) * 0.2
						),
						emissiveIntensity: 0.4,
						metalness: 0.5,
						roughness: 0.5,
						transparent: true,
						opacity: 0.7 + Math.random() * 0.3,
						envMapIntensity: 0.8,
				  })
				: new THREE.MeshBasicMaterial({
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

			// Add dynamic lighting to some nodes
			if (settings.enableDynamicLighting && Math.random() < 0.15) {
				// Add lights to ~15% of nodes
				const lightColor = new THREE.Color(0x9747ff).offsetHSL(
					0,
					0,
					(Math.random() - 0.5) * 0.3
				);
				const pointLight = new THREE.PointLight(lightColor, 0.6, 4.5, 1.5);
				pointLight.position.copy(node.position);
				scene.add(pointLight);
				pointLights.push(pointLight);

				// Add metadata for animation
				pointLight.userData = {
					baseIntensity: 0.6,
					pulseSpeed: 0.3 + Math.random() * 1.2,
					baseNode: node,
				};
			}

			// Add subtle rim lighting effect for some nodes
			if (settings.enableDynamicLighting && Math.random() < 0.1) {
				// Create a small bright point light that sits opposite to the main directional light
				// to create a rim lighting effect on some spheres
				const rimLightColor = new THREE.Color(0xc4a0ff);
				const rimLight = new THREE.PointLight(rimLightColor, 0.4, 2.2, 1.5);

				// Position the rim light opposite to the directional light
				rimLight.position.set(
					node.position.x - 0.5,
					node.position.y - 1,
					node.position.z + 0.5
				);

				scene.add(rimLight);
				pointLights.push(rimLight);

				// Add metadata for animation
				rimLight.userData = {
					baseIntensity: 0.4,
					pulseSpeed: 0.5 + Math.random() * 0.8,
					baseNode: node,
					isRimLight: true,
				};
			}
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

		// Create particle system if enabled
		if (
			settings.enableParticleSystem &&
			(isDarkMode || !settings.disableParticleSystemOnLightMode)
		) {
			// Create particle geometry with many more vertices
			const particlesCount = Math.floor(
				2000 * Math.max(0.1, settings.particleDensity)
			);
			const particlesGeometry = new THREE.BufferGeometry();
			const particlesPositions = new Float32Array(particlesCount * 3);
			const particlesSizes = new Float32Array(particlesCount);

			// Create particle material with custom texture
			const particleTexture = new THREE.TextureLoader().load(
				'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmFkaWFsR3JhZGllbnQgaWQ9ImdyYWQiIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTQiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4='
			);
			const particlesMaterial = new THREE.PointsMaterial({
				size: 0.1,
				map: particleTexture,
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				vertexColors: true,
				opacity: settings.particleIntensity,
			});

			// Create particles with varied positions, sizes, and colors
			const colors = new Float32Array(particlesCount * 3);

			for (let i = 0; i < particlesCount; i++) {
				const i3 = i * 3;

				// Position particles in a wider spherical distribution
				const radius = 3 + Math.random() * 10;
				const theta = Math.random() * Math.PI * 2;
				const phi = Math.acos(2 * Math.random() - 1);

				particlesPositions[i3] = radius * Math.sin(phi) * Math.cos(theta) * 1.8;
				particlesPositions[i3 + 1] =
					radius * Math.sin(phi) * Math.sin(theta) * 0.8;
				particlesPositions[i3 + 2] = radius * Math.cos(phi);

				// Vary particle sizes
				particlesSizes[i] = Math.random() * 0.1 + 0.05;

				// Vary particle colors between blue and purple
				const color = new THREE.Color().lerpColors(
					new THREE.Color(0x3b82f6),
					new THREE.Color(0x9747ff),
					Math.random()
				);

				colors[i3] = color.r;
				colors[i3 + 1] = color.g;
				colors[i3 + 2] = color.b;
			}

			particlesGeometry.setAttribute(
				'position',
				new THREE.BufferAttribute(particlesPositions, 3)
			);
			particlesGeometry.setAttribute(
				'size',
				new THREE.BufferAttribute(particlesSizes, 1)
			);
			particlesGeometry.setAttribute(
				'color',
				new THREE.BufferAttribute(colors, 3)
			);

			// Create the points system
			const particleSystem = new THREE.Points(
				particlesGeometry,
				particlesMaterial
			);
			scene.add(particleSystem);
			particlesRef.current = particleSystem;
		}

		nodesRef.current = nodes;
		linesRef.current = lines;
		pointLightsRef.current = pointLights;

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

		// Animate point lights if enabled
		if (settings.enableDynamicLighting && pointLightsRef.current.length > 0) {
			pointLightsRef.current.forEach((light) => {
				// Animate light intensity
				gsap.to(light, {
					intensity: light.userData.baseIntensity * 1.5,
					duration: 1 / light.userData.pulseSpeed,
					repeat: -1,
					yoyo: true,
					ease: 'sine.inOut',
				});
			});
		}

		// Animate particle system if enabled
		if (
			settings.enableParticleSystem &&
			particlesRef.current &&
			(isDarkMode || !settings.disableParticleSystemOnLightMode)
		) {
			// Animate the particle system overall rotation
			gsap.to(particlesRef.current.rotation, {
				y: Math.PI * 2,
				duration: 120,
				repeat: -1,
				ease: 'none',
			});
		}
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

		// Periodically check for nodes that should have decohered but didn't
		if (!isRunningOnHardware && time - lastDecoherenceCheck > 5000) {
			// Find any nodes that appear to be cohered but aren't in our tracking set
			nodesRef.current.forEach((node, index) => {
				const nodeMaterial = node.material as
					| THREE.MeshStandardMaterial
					| THREE.MeshBasicMaterial;

				// Check if node appears blue (coherent) but isn't tracked in our cohered set
				if (!coheredNodesRef.current.has(index)) {
					// Check if the color is blue-ish (coherent state)
					const isBlueish =
						nodeMaterial.color.b > 0.8 && nodeMaterial.color.r < 0.4;

					if (isBlueish) {
						// Force decohere this node
						const originalColor = new THREE.Color(0x9747ff).offsetHSL(
							0,
							0,
							(Math.random() - 0.5) * 0.2
						);

						// Smoothly transition back to original color
						gsap.to(nodeMaterial.color, {
							r: originalColor.r,
							g: originalColor.g,
							b: originalColor.b,
							duration: 0.5,
							ease: 'power2.out',
						});

						// Reset opacity
						gsap.to(nodeMaterial, {
							opacity: 0.7 + Math.random() * 0.3,
							duration: 0.5,
							ease: 'power2.out',
						});

						// Reset emissive properties if standard material
						if (nodeMaterial instanceof THREE.MeshStandardMaterial) {
							const originalEmissive = new THREE.Color(0x9747ff).offsetHSL(
								0,
								0,
								(Math.random() - 0.5) * 0.2
							);

							gsap.to(nodeMaterial.emissive, {
								r: originalEmissive.r,
								g: originalEmissive.g,
								b: originalEmissive.b,
								duration: 0.5,
								ease: 'power2.out',
							});

							gsap.to(nodeMaterial, {
								emissiveIntensity: 0.4,
								duration: 0.5,
								ease: 'power2.out',
							});
						}

						// Remove any blue glow lights around this node
						sceneRef.current?.children.forEach((child) => {
							if (
								child instanceof THREE.PointLight &&
								child.position.distanceTo(node.position) < 0.5 &&
								child.color.b > 0.9 &&
								child.color.r < 0.1
							) {
								// This appears to be a coherence glow light, remove it
								sceneRef.current?.remove(child);
							}
						});
					}
				}
			});

			// Check for lines that remained colored from entanglement animations
			linesRef.current.forEach((line) => {
				const lineMaterial = line.material as THREE.LineBasicMaterial;

				// Check if line appears bright purple (entangled state)
				// Entangled lines have high opacity and strong purple color
				const isPurplish =
					lineMaterial.color.b > 0.9 &&
					lineMaterial.color.r > 0.4 &&
					lineMaterial.opacity > 0.7;

				if (isPurplish) {
					// Reset to normal pulsing animation using the line's stored userData values
					// This preserves the original pulsing behavior

					// Restore normal opacity range
					gsap.killTweensOf(lineMaterial); // Kill any existing animations

					gsap.to(lineMaterial, {
						opacity: line.userData.minOpacity || 0.1,
						duration: 0.5,
						ease: 'power2.out',
						onComplete: () => {
							// Restart normal pulsing animation
							gsap.to(lineMaterial, {
								opacity: line.userData.maxOpacity || 0.2,
								duration: 1 / (line.userData.pulseSpeed || 1),
								repeat: -1,
								yoyo: true,
								ease: 'sine.inOut',
							});
						},
					});

					// Reset the color
					// Use base colors from the original creation pattern
					const baseBlue = new THREE.Color(0x3b82f6);
					const basePurple = new THREE.Color(0x9747ff);

					// Use a pseudorandom but deterministic mix based on the line's nodes
					// This ensures the same line gets the same color each time
					const nodeIndices = line.userData.nodes || [0, 0];
					const mixFactor =
						((nodeIndices[0] * 13 + nodeIndices[1] * 17) % 100) / 250; // 0-0.4 range

					const resetColor = new THREE.Color().lerpColors(
						baseBlue,
						basePurple,
						mixFactor
					);

					gsap.to(lineMaterial.color, {
						r: resetColor.r,
						g: resetColor.g,
						b: resetColor.b,
						duration: 0.5,
						ease: 'power2.out',
					});
				}
			});

			// Also check for any coherence timeouts that might have been interrupted
			coheredNodesRef.current.forEach((nodeIndex) => {
				const node = nodesRef.current[nodeIndex];
				if (!node) return;

				// If no timeout exists for this node (but it's tracked as cohered), recreate it
				if (!coherenceTimeoutsRef.current.has(nodeIndex)) {
					const timeoutId = setTimeout(() => {
						// Standard decoherence logic (copied from animateCoherenceAndEntanglement)
						const nodeMaterial = node.material as
							| THREE.MeshStandardMaterial
							| THREE.MeshBasicMaterial;
						const originalColor = new THREE.Color(0x9747ff).offsetHSL(
							0,
							0,
							(Math.random() - 0.5) * 0.2
						);
						const originalEmissive =
							nodeMaterial instanceof THREE.MeshStandardMaterial
								? new THREE.Color(0x9747ff).offsetHSL(
										0,
										0,
										(Math.random() - 0.5) * 0.2
								  )
								: new THREE.Color(0x000000);

						// Reset node appearance
						gsap.to(node.scale, {
							x: 1,
							y: 1,
							z: 1,
							duration: 0.5,
							ease: 'elastic.out(1, 0.3)',
						});

						gsap.to(nodeMaterial, {
							opacity: 0.7 + Math.random() * 0.3,
							duration: 0.5,
							ease: 'power2.out',
						});

						gsap.to(nodeMaterial.color, {
							r: originalColor.r,
							g: originalColor.g,
							b: originalColor.b,
							duration: 0.5,
							ease: 'power2.out',
						});

						if (nodeMaterial instanceof THREE.MeshStandardMaterial) {
							gsap.to(nodeMaterial.emissive, {
								r: originalEmissive.r,
								g: originalEmissive.g,
								b: originalEmissive.b,
								duration: 0.5,
								ease: 'power2.out',
							});

							gsap.to(nodeMaterial, {
								emissiveIntensity: 0.4,
								duration: 0.5,
								ease: 'power2.out',
							});
						}

						// Remove any coherence glow light
						sceneRef.current?.children.forEach((child) => {
							if (
								child instanceof THREE.PointLight &&
								child.position.distanceTo(node.position) < 0.5 &&
								child.color.b > 0.9 &&
								child.color.r < 0.1
							) {
								sceneRef.current?.remove(child);
							}
						});

						// Remove tracking references
						coheredNodesRef.current.delete(nodeIndex);
						coherenceTimeoutsRef.current.delete(nodeIndex);
					}, 10000); // 10 seconds decoherence time

					coherenceTimeoutsRef.current.set(nodeIndex, timeoutId);
				}
			});

			setLastDecoherenceCheck(time);
		}

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

		// Update point lights to follow nodes as they move (if enabled)
		if (settings.enableDynamicLighting && pointLightsRef.current.length > 0) {
			pointLightsRef.current.forEach((light, index) => {
				const baseNode = light.userData.baseNode;

				if (baseNode) {
					// Make regular lights follow their nodes closely
					if (!light.userData.isRimLight) {
						light.position.copy(baseNode.position);
						// Add slight offset for visual interest
						light.position.x += Math.sin(time * 0.001 + index) * 0.1;
						light.position.y += Math.cos(time * 0.001 + index) * 0.1;
						light.position.z += Math.sin(time * 0.0015 + index) * 0.1;
					} else {
						// For rim lights, maintain position opposite to main light
						light.position.set(
							baseNode.position.x - 0.5 + Math.sin(time * 0.0008) * 0.1,
							baseNode.position.y - 1 + Math.cos(time * 0.0012) * 0.1,
							baseNode.position.z + 0.5 + Math.sin(time * 0.001) * 0.1
						);
					}
				} else {
					// Legacy behavior for lights without associated nodes
					light.position.x += Math.sin(time * 0.001 + index) * 0.01;
					light.position.y += Math.cos(time * 0.001 + index) * 0.01;
					light.position.z += Math.sin(time * 0.0015 + index) * 0.01;
				}

				// Add subtle flickering to lights for more realistic effect
				if (Math.random() > 0.92) {
					light.intensity =
						light.userData.baseIntensity * (0.8 + Math.random() * 0.4);
				}
			});
		}

		// Update coherence glow lights for cohered nodes
		if (settings.enableDynamicLighting && sceneRef.current) {
			// For each node with an active coherence timeout, update the glow light position if it exists
			coherenceTimeoutsRef.current.forEach((_, nodeIndex) => {
				const node = nodesRef.current[nodeIndex];
				if (!node) return;

				// Find a point light that might be the glow for this node
				// We can check if it has the same position as the node and a blue color
				sceneRef.current?.children.forEach((child) => {
					if (
						child instanceof THREE.PointLight &&
						child.position.distanceTo(node.position) < 0.5 &&
						child.color.b > 0.9 &&
						child.color.r < 0.1
					) {
						// This appears to be a coherence glow light, update its position
						child.position.copy(node.position);
					}
				});
			});
		}

		// Update particle system if enabled
		if (
			settings.enableParticleSystem &&
			particlesRef.current &&
			(isDarkMode || !settings.disableParticleSystemOnLightMode)
		) {
			// Add some subtle movement to the particles
			particlesRef.current.rotation.y += 0.0005;

			// Pulsate the particle size
			const particlesMaterial = particlesRef.current
				.material as THREE.PointsMaterial;
			particlesMaterial.size = 0.1 + Math.sin(time * 0.001) * 0.02;
		}

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

		// Render scene with bloom if enabled, otherwise use standard renderer
		if (settings.enableBloomEffect && composerRef.current && isDarkMode) {
			composerRef.current.render();
		} else {
			rendererRef.current.render(sceneRef.current, cameraRef.current);
		}

		// Request next frame
		frameIdRef.current = requestAnimationFrame(update);
	};

	// Initialize Three.js on component mount or when key settings change
	useEffect(() => {
		if (!shouldShowAnimation) return;

		const cleanup = initThreeJS();
		frameIdRef.current = requestAnimationFrame(update);

		return () => {
			cleanup && cleanup();
		};
	}, [
		shouldShowAnimation,
		settings.enableBloomEffect,
		settings.bloomIntensity,
		settings.particleDensity,
		settings.particleIntensity,
		isDarkMode,
	]);

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

	// Update bloom effect when bloomIntensity changes
	useEffect(() => {
		if (
			!shouldShowAnimation ||
			!composerRef.current ||
			!settings.enableBloomEffect ||
			!isDarkMode
		)
			return;

		// Update bloom pass strength
		const bloomPass = composerRef.current.passes.find(
			(pass) => pass instanceof UnrealBloomPass
		) as UnrealBloomPass | undefined;

		if (bloomPass) {
			bloomPass.strength = settings.bloomIntensity;
		}
	}, [
		settings.bloomIntensity,
		settings.enableBloomEffect,
		shouldShowAnimation,
		isDarkMode,
	]);

	// Update particle system when density changes
	useEffect(() => {
		// Only recreate if the particle system exists and animation is showing
		if (
			!shouldShowAnimation ||
			!settings.enableParticleSystem ||
			!sceneRef.current ||
			(!isDarkMode && settings.disableParticleSystemOnLightMode)
		)
			return;

		// Remove existing particle system
		if (particlesRef.current && particlesRef.current.parent) {
			particlesRef.current.parent.remove(particlesRef.current);
			particlesRef.current.geometry.dispose();
			if (Array.isArray(particlesRef.current.material)) {
				particlesRef.current.material.forEach((mat) => mat.dispose());
			} else {
				particlesRef.current.material.dispose();
			}
		}

		// Create a new particle system with updated density
		const particlesCount = Math.floor(
			2000 * Math.max(0.1, settings.particleDensity)
		);
		const particlesGeometry = new THREE.BufferGeometry();
		const particlesPositions = new Float32Array(particlesCount * 3);
		const particlesSizes = new Float32Array(particlesCount);

		// Create particles with varied positions, sizes, and colors
		const colors = new Float32Array(particlesCount * 3);

		for (let i = 0; i < particlesCount; i++) {
			const i3 = i * 3;

			// Position particles in a wider spherical distribution
			const radius = 3 + Math.random() * 10;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);

			particlesPositions[i3] = radius * Math.sin(phi) * Math.cos(theta) * 1.8;
			particlesPositions[i3 + 1] =
				radius * Math.sin(phi) * Math.sin(theta) * 0.8;
			particlesPositions[i3 + 2] = radius * Math.cos(phi);

			// Vary particle sizes
			particlesSizes[i] = Math.random() * 0.1 + 0.05;

			// Vary particle colors between blue and purple
			const color = new THREE.Color().lerpColors(
				new THREE.Color(0x3b82f6),
				new THREE.Color(0x9747ff),
				Math.random()
			);

			colors[i3] = color.r;
			colors[i3 + 1] = color.g;
			colors[i3 + 2] = color.b;
		}

		particlesGeometry.setAttribute(
			'position',
			new THREE.BufferAttribute(particlesPositions, 3)
		);
		particlesGeometry.setAttribute(
			'size',
			new THREE.BufferAttribute(particlesSizes, 1)
		);
		particlesGeometry.setAttribute(
			'color',
			new THREE.BufferAttribute(colors, 3)
		);

		// Create particle material with custom texture
		const particleTexture = new THREE.TextureLoader().load(
			'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmFkaWFsR3JhZGllbnQgaWQ9ImdyYWQiIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTQiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4='
		);
		const particlesMaterial = new THREE.PointsMaterial({
			size: 0.1,
			map: particleTexture,
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			vertexColors: true,
			opacity: settings.particleIntensity,
		});

		// Create the points system
		const particleSystem = new THREE.Points(
			particlesGeometry,
			particlesMaterial
		);
		sceneRef.current.add(particleSystem);
		particlesRef.current = particleSystem;

		// Animate the particle system overall rotation
		gsap.to(particleSystem.rotation, {
			y: Math.PI * 2,
			duration: 120,
			repeat: -1,
			ease: 'none',
		});
	}, [
		settings.particleDensity,
		settings.enableParticleSystem,
		shouldShowAnimation,
		settings.particleIntensity,
		isDarkMode,
		settings.disableParticleSystemOnLightMode,
	]);

	// Update particle system visibility when enableParticleSystem changes
	useEffect(() => {
		if (!shouldShowAnimation || !particlesRef.current || !sceneRef.current)
			return;

		// Check if particles should be shown based on enableParticleSystem and theme mode
		const shouldShowParticles =
			settings.enableParticleSystem &&
			(isDarkMode || !settings.disableParticleSystemOnLightMode);

		if (shouldShowParticles) {
			// Make sure it's added to the scene if not already
			if (!particlesRef.current.parent) {
				sceneRef.current.add(particlesRef.current);
			}
		} else {
			// Remove from scene if setting is disabled or in light mode with disableParticleSystemOnLightMode enabled
			if (particlesRef.current.parent) {
				particlesRef.current.parent.remove(particlesRef.current);
			}
		}
	}, [
		settings.enableParticleSystem,
		shouldShowAnimation,
		isDarkMode,
		settings.disableParticleSystemOnLightMode,
	]);

	// Update point lights visibility when enableDynamicLighting changes
	useEffect(() => {
		if (
			!shouldShowAnimation ||
			!pointLightsRef.current.length ||
			!sceneRef.current
		)
			return;

		pointLightsRef.current.forEach((light) => {
			if (settings.enableDynamicLighting) {
				// Make sure it's added to the scene if not already
				if (!light.parent) {
					sceneRef.current?.add(light);
				}
			} else {
				// Remove from scene if setting is disabled
				if (light.parent) {
					light.parent.remove(light);
				}
			}
		});
	}, [settings.enableDynamicLighting, shouldShowAnimation]);

	// Handle canvas click
	const handleCanvasClick = (event: MouseEvent) => {
		if (
			!shouldShowAnimation ||
			!sceneRef.current ||
			!cameraRef.current ||
			isAnimating
		)
			return;

		// Calculate mouse position in normalized device coordinates (-1 to +1)
		const rect = (event.target as HTMLElement).getBoundingClientRect();
		mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		// Update the raycaster with the camera and mouse position
		raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

		// Check for intersections with nodes
		const intersects = raycasterRef.current.intersectObjects(nodesRef.current);

		if (intersects.length > 0) {
			// Find the index of the clicked node
			const clickedNodeIndex = nodesRef.current.findIndex(
				(node) => node.uuid === intersects[0].object.uuid
			);

			// Check if the node is already cohered
			if (coheredNodesRef.current.has(clickedNodeIndex)) {
				// Node is already cohered, ignore the click
				return;
			}

			// Reset visited nodes for a new propagation chain
			visitedNodesRef.current.clear();

			// Set active node and find entangled nodes (neighbors)
			setActiveNode(clickedNodeIndex);
			const neighbors = findNodeNeighbors(clickedNodeIndex);
			setEntangledNodes(neighbors);

			// Trigger coherence and entanglement animations
			animateCoherenceAndEntanglement(clickedNodeIndex, neighbors);
		}
	};

	// Find neighboring nodes (connected by lines)
	const findNodeNeighbors = (nodeIndex: number): number[] => {
		const neighbors: number[] = [];

		// Look through lines to find connections
		linesRef.current.forEach((line) => {
			const lineNodes = line.userData.nodes;
			if (lineNodes && lineNodes.length === 2) {
				if (lineNodes[0] === nodeIndex) {
					neighbors.push(lineNodes[1]);
				} else if (lineNodes[1] === nodeIndex) {
					neighbors.push(lineNodes[0]);
				}
			}
		});

		return neighbors;
	};

	// Animate coherence (for clicked node) and entanglement (with neighbors)
	const animateCoherenceAndEntanglement = (
		nodeIndex: number,
		neighbors: number[]
	) => {
		if (!nodesRef.current[nodeIndex]) return;

		setIsAnimating(true);

		// Add this node to the cohered and visited nodes sets
		coheredNodesRef.current.add(nodeIndex);
		visitedNodesRef.current.add(nodeIndex);

		// Get the clicked node and its material
		const node = nodesRef.current[nodeIndex];
		const nodeMaterial = node.material as
			| THREE.MeshStandardMaterial
			| THREE.MeshBasicMaterial;

		// Original values to revert to after animation
		const originalColor = (nodeMaterial as any).color.clone();
		const originalEmissive = settings.enableDynamicLighting
			? (nodeMaterial as THREE.MeshStandardMaterial).emissive.clone()
			: new THREE.Color(0x000000);
		const originalScale = node.scale.clone();

		// Clear any existing timeout for this node
		if (coherenceTimeoutsRef.current.has(nodeIndex)) {
			clearTimeout(coherenceTimeoutsRef.current.get(nodeIndex));
			coherenceTimeoutsRef.current.delete(nodeIndex);
		}

		// Create a glow effect light for the cohered node
		let coherenceGlow: THREE.PointLight | null = null;
		if (settings.enableDynamicLighting && sceneRef.current) {
			coherenceGlow = new THREE.PointLight(
				new THREE.Color(0x3b82f6), // Blue glow matching app theme
				1.2,
				1.8,
				1.5
			);
			coherenceGlow.position.copy(node.position);
			sceneRef.current.add(coherenceGlow);

			// Add subtle pulsating animation to the glow light
			gsap.to(coherenceGlow, {
				intensity: 1.8,
				duration: 1.2,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			});
		}

		// Timeline for coherence animation
		const timeline = gsap.timeline({
			onComplete: () => {
				// Reset is managed by timeout, just need to handle animation state
				setIsAnimating(false);

				// Find unvisited neighbors to continue the cascade
				const unvisitedNeighbors = neighbors.filter(
					(neighborIndex) =>
						!visitedNodesRef.current.has(neighborIndex) &&
						!coheredNodesRef.current.has(neighborIndex)
				);

				// If there are unvisited neighbors, continue the cascade after a short delay
				if (unvisitedNeighbors.length > 0) {
					const nextNodeIndex = unvisitedNeighbors[0]; // Pick the first unvisited neighbor

					// Start coherence cascade after a short delay
					setTimeout(() => {
						const nextNeighbors = findNodeNeighbors(nextNodeIndex);
						animateCoherenceAndEntanglement(nextNodeIndex, nextNeighbors);
					}, 500); // 500ms delay before next coherence
				}
			},
		});

		// Coherence animation for the clicked node
		timeline.to(node.scale, {
			x: originalScale.x * 1.3,
			y: originalScale.y * 1.3,
			z: originalScale.z * 1.3,
			duration: 0.3,
			ease: 'power2.out',
		});

		timeline.to(
			nodeMaterial,
			{
				opacity: 1,
				duration: 0.3,
				ease: 'power2.out',
			},
			'<'
		);

		// Change color to blue for coherence, matching the app's toggle color
		timeline.to(
			nodeMaterial.color,
			{
				r: 0.231,
				g: 0.51,
				b: 0.965,
				duration: 0.3,
				ease: 'power2.out',
			},
			'<'
		);

		if (nodeMaterial instanceof THREE.MeshStandardMaterial) {
			timeline.to(
				nodeMaterial.emissive,
				{
					r: 0.1,
					g: 0.3,
					b: 0.9,
					duration: 0.3,
					ease: 'power2.out',
				},
				'<'
			);

			timeline.to(
				nodeMaterial,
				{
					emissiveIntensity: 1.5, // Increased for stronger glow
					duration: 0.3,
					ease: 'power2.out',
				},
				'<'
			);
		}

		// Add pause for visual effect
		timeline.to({}, { duration: 0.2 });

		// Entanglement animations with neighbors
		if (neighbors.length > 0) {
			// Animate each neighbor for entanglement effect
			neighbors.forEach((neighborIndex) => {
				const neighborNode = nodesRef.current[neighborIndex];
				if (!neighborNode) return;

				const neighborMaterial = neighborNode.material as
					| THREE.MeshStandardMaterial
					| THREE.MeshBasicMaterial;
				const neighborOriginalScale = neighborNode.scale.clone();

				// Animate neighbor scale
				timeline.to(
					neighborNode.scale,
					{
						x: neighborOriginalScale.x * 1.2,
						y: neighborOriginalScale.y * 1.2,
						z: neighborOriginalScale.z * 1.2,
						duration: 0.3,
						ease: 'power2.out',
					},
					'-=0.1'
				);

				// Change neighbor color to entangled purple
				timeline.to(
					neighborMaterial.color,
					{
						r: 0.6,
						g: 0.2,
						b: 1,
						duration: 0.3,
						ease: 'power2.out',
					},
					'<'
				);

				timeline.to(
					neighborMaterial,
					{
						opacity: 1,
						duration: 0.3,
						ease: 'power2.out',
					},
					'<'
				);

				if (neighborMaterial instanceof THREE.MeshStandardMaterial) {
					timeline.to(
						neighborMaterial.emissive,
						{
							r: 0.3,
							g: 0.1,
							b: 0.7,
							duration: 0.3,
							ease: 'power2.out',
						},
						'<'
					);

					timeline.to(
						neighborMaterial,
						{
							emissiveIntensity: 1,
							duration: 0.3,
							ease: 'power2.out',
						},
						'<'
					);
				}

				// Find connecting lines between active node and this neighbor
				linesRef.current.forEach((line) => {
					const lineNodes = line.userData.nodes;
					if (!lineNodes) return;

					if (
						(lineNodes[0] === nodeIndex && lineNodes[1] === neighborIndex) ||
						(lineNodes[0] === neighborIndex && lineNodes[1] === nodeIndex)
					) {
						const lineMaterial = line.material as THREE.LineBasicMaterial;
						const originalLineColor = lineMaterial.color.clone();
						const originalLineOpacity = lineMaterial.opacity;

						// Animate the connecting line to show entanglement
						timeline.to(
							lineMaterial,
							{
								opacity: 1,
								duration: 0.3,
								ease: 'power2.out',
							},
							'<'
						);

						timeline.to(
							lineMaterial.color,
							{
								r: 0.6,
								g: 0.3,
								b: 1,
								duration: 0.3,
								ease: 'power2.out',
							},
							'<'
						);

						// Add a delay and then revert the line
						timeline.to({}, { duration: 0.5 });

						timeline.to(lineMaterial, {
							opacity: originalLineOpacity,
							duration: 0.5,
							ease: 'power2.out',
						});

						timeline.to(
							lineMaterial.color,
							{
								r: originalLineColor.r,
								g: originalLineColor.g,
								b: originalLineColor.b,
								duration: 0.5,
								ease: 'power2.out',
							},
							'<'
						);
					}
				});

				// Reset neighbor node
				timeline.to(neighborNode.scale, {
					x: neighborOriginalScale.x,
					y: neighborOriginalScale.y,
					z: neighborOriginalScale.z,
					duration: 0.5,
					ease: 'elastic.out(1, 0.3)',
				});

				const neighborOriginalColor = (neighborMaterial as any).color.clone();
				const neighborOriginalEmissive =
					neighborMaterial instanceof THREE.MeshStandardMaterial
						? neighborMaterial.emissive.clone()
						: new THREE.Color(0x000000);

				timeline.to(
					neighborMaterial.color,
					{
						r: neighborOriginalColor.r,
						g: neighborOriginalColor.g,
						b: neighborOriginalColor.b,
						duration: 0.5,
						ease: 'power2.out',
					},
					'<'
				);

				if (neighborMaterial instanceof THREE.MeshStandardMaterial) {
					timeline.to(
						neighborMaterial.emissive,
						{
							r: neighborOriginalEmissive.r,
							g: neighborOriginalEmissive.g,
							b: neighborOriginalEmissive.b,
							duration: 0.5,
							ease: 'power2.out',
						},
						'<'
					);
				}
			});
		}

		// Play the animation
		timeline.play();

		// Set a timeout to revert the node to its original state after 10 seconds
		const timeoutId = setTimeout(() => {
			// Reset to original state when timeout expires
			gsap.to(node.scale, {
				x: originalScale.x,
				y: originalScale.y,
				z: originalScale.z,
				duration: 0.5,
				ease: 'elastic.out(1, 0.3)',
			});

			gsap.to(nodeMaterial, {
				opacity: 0.7 + Math.random() * 0.3,
				duration: 0.5,
				ease: 'power2.out',
			});

			// Reset colors
			if (nodeMaterial instanceof THREE.MeshStandardMaterial) {
				gsap.to(nodeMaterial.emissive, {
					r: originalEmissive.r,
					g: originalEmissive.g,
					b: originalEmissive.b,
					duration: 0.5,
					ease: 'power2.out',
				});

				gsap.to(nodeMaterial, {
					emissiveIntensity: 0.5, // Reset to original value
					duration: 0.5,
					ease: 'power2.out',
				});
			}

			gsap.to(nodeMaterial.color, {
				r: originalColor.r,
				g: originalColor.g,
				b: originalColor.b,
				duration: 0.5,
				ease: 'power2.out',
			});

			// Remove the glow light if it exists
			if (coherenceGlow && sceneRef.current) {
				sceneRef.current.remove(coherenceGlow);
				coherenceGlow = null;
			}

			// Remove from the cohered nodes and timeouts maps
			coheredNodesRef.current.delete(nodeIndex);
			coherenceTimeoutsRef.current.delete(nodeIndex);
		}, 10000); // 10 seconds timeout

		// Store the timeout ID
		coherenceTimeoutsRef.current.set(nodeIndex, timeoutId);
	};

	// Hardware execution effect - trigger automatic node coherence for quantum hardware runs
	useEffect(() => {
		// Skip if animation shouldn't be shown or hardware isn't running
		if (!shouldShowAnimation) return;

		// Clear any existing algorithm animation timer
		if (algorithmAnimationTimerRef.current) {
			clearInterval(algorithmAnimationTimerRef.current);
			algorithmAnimationTimerRef.current = null;
		}

		// Reset all current node effects
		coheredNodesRef.current.forEach((nodeIndex) => {
			if (coherenceTimeoutsRef.current.has(nodeIndex)) {
				clearTimeout(coherenceTimeoutsRef.current.get(nodeIndex));
				coherenceTimeoutsRef.current.delete(nodeIndex);
			}
		});
		coheredNodesRef.current.clear();
		visitedNodesRef.current.clear();

		// Force decoherence of all nodes when hardware state changes and not running
		if (!isRunningOnHardware) {
			resetAllQubits();
		}

		// Setup variables for node activation
		let nodesToActivate: number[] = [];
		let currentIndex = 0;

		// Configure animation parameters based on algorithm type
		if (isRunningOnHardware) {
			const totalNodes = nodesRef.current.length;
			let nodesToSelect = 0;
			let activationPattern = 'random';

			// Configure based on algorithm type
			if (algorithmType === 'shors') {
				// Shor's algorithm works with factoring, so we'll create a factoring pattern
				nodesToSelect = Math.floor(totalNodes * 0.3); // 30% of nodes for Shor's
				activationPattern = 'factoring';
			} else if (algorithmType === 'grovers') {
				// Grover's algorithm is a search, so use a wider spreading pattern
				nodesToSelect = Math.floor(totalNodes * 0.4); // 40% of nodes for Grover's
				activationPattern = 'search';
			} else {
				// Default pattern for other algorithms or when algorithm not specified
				nodesToSelect = Math.floor(totalNodes * 0.25); // 25% as default
				activationPattern = 'random';
			}

			// Create a balanced selection of nodes
			let possibleNodes = Array.from({ length: totalNodes }, (_, i) => i);

			// Apply different node selection strategies based on pattern
			if (activationPattern === 'factoring') {
				// For Shor's: Create linear chains of nodes to simulate factorization
				// Start with some "seed" nodes
				const seedCount = Math.min(3, Math.floor(nodesToSelect * 0.2));

				for (let i = 0; i < seedCount; i++) {
					if (possibleNodes.length === 0) break;

					// Select a random node as seed
					const randomIndex = Math.floor(Math.random() * possibleNodes.length);
					const seedNodeIndex = possibleNodes[randomIndex];
					nodesToActivate.push(seedNodeIndex);
					possibleNodes.splice(randomIndex, 1);

					// Build a chain from this seed
					let lastNodeIndex = seedNodeIndex;
					const chainLength = Math.floor(nodesToSelect / seedCount);

					for (let j = 0; j < chainLength; j++) {
						// Find nodes that could connect to the last node
						const neighbors = findNodeNeighbors(lastNodeIndex);
						const validNeighbors = neighbors.filter((n) =>
							possibleNodes.includes(n)
						);

						if (validNeighbors.length > 0) {
							// Choose a random neighbor
							const nextNodeIndex =
								validNeighbors[
									Math.floor(Math.random() * validNeighbors.length)
								];
							nodesToActivate.push(nextNodeIndex);

							// Remove from possible nodes
							const nextNodePos = possibleNodes.indexOf(nextNodeIndex);
							if (nextNodePos !== -1) {
								possibleNodes.splice(nextNodePos, 1);
							}

							lastNodeIndex = nextNodeIndex;
						} else {
							// If no valid neighbors, pick a random node
							if (possibleNodes.length > 0) {
								const randomIndex = Math.floor(
									Math.random() * possibleNodes.length
								);
								const randomNode = possibleNodes[randomIndex];
								nodesToActivate.push(randomNode);
								possibleNodes.splice(randomIndex, 1);
								lastNodeIndex = randomNode;
							} else {
								break;
							}
						}
					}
				}
			} else if (activationPattern === 'search') {
				// For Grover's: Create a radiating pattern from a central point

				// First choose a central node
				const randomIndex = Math.floor(Math.random() * possibleNodes.length);
				const centralNodeIndex = possibleNodes[randomIndex];
				nodesToActivate.push(centralNodeIndex);
				possibleNodes.splice(randomIndex, 1);

				// Find its neighbors and neighbors of neighbors in waves
				let currentWave = [centralNodeIndex];
				let nextWave = [];
				let wavesCount = 0;

				while (nodesToActivate.length < nodesToSelect && wavesCount < 5) {
					// Process current wave
					for (const nodeIdx of currentWave) {
						// Get neighbors
						const neighbors = findNodeNeighbors(nodeIdx);

						// Filter to only include unused nodes
						const validNeighbors = neighbors.filter(
							(n) => possibleNodes.includes(n) && !nodesToActivate.includes(n)
						);

						// Sample some neighbors randomly (to avoid taking all neighbors)
						const sampleSize = Math.min(validNeighbors.length, 3);
						for (let i = 0; i < sampleSize; i++) {
							if (validNeighbors.length === 0) break;

							const randomNeighborIdx = Math.floor(
								Math.random() * validNeighbors.length
							);
							const neighbor = validNeighbors[randomNeighborIdx];

							// Add to next wave and to nodes to activate
							nextWave.push(neighbor);
							nodesToActivate.push(neighbor);

							// Remove from possible nodes
							const neighborPos = possibleNodes.indexOf(neighbor);
							if (neighborPos !== -1) {
								possibleNodes.splice(neighborPos, 1);
							}

							// Remove from valid neighbors to avoid duplicates
							validNeighbors.splice(randomNeighborIdx, 1);

							// Break if we reached our target
							if (nodesToActivate.length >= nodesToSelect) break;
						}
					}

					// Move to next wave
					currentWave = [...nextWave];
					nextWave = [];
					wavesCount++;
				}

				// If we didn't get enough nodes with the wave approach, add some random ones
				while (
					nodesToActivate.length < nodesToSelect &&
					possibleNodes.length > 0
				) {
					const randomIdx = Math.floor(Math.random() * possibleNodes.length);
					nodesToActivate.push(possibleNodes[randomIdx]);
					possibleNodes.splice(randomIdx, 1);
				}
			} else {
				// Default random pattern with some minimum spacing
				for (let i = 0; i < nodesToSelect; i++) {
					if (possibleNodes.length === 0) break;

					// Select a random node from remaining possibilities
					const randomIndex = Math.floor(Math.random() * possibleNodes.length);
					const selectedNodeIndex = possibleNodes[randomIndex];

					// Add to activation list
					nodesToActivate.push(selectedNodeIndex);
					possibleNodes.splice(randomIndex, 1);

					// Filter out nodes that are too close to the selected node
					const selectedNode = nodesRef.current[selectedNodeIndex];
					if (selectedNode) {
						// Create a new filtered array instead of reassigning
						possibleNodes = possibleNodes.filter((nodeIdx) => {
							const node = nodesRef.current[nodeIdx];
							if (!node) return false;

							// Keep nodes that are at least a minimum distance away
							const distance = selectedNode.position.distanceTo(node.position);
							return distance > 2.0; // Minimum distance between activated nodes
						});
					}
				}
			}

			// Start cascading activation - different timing based on algorithm
			currentIndex = 0;
			const activationDelay =
				algorithmType === 'shors'
					? 850 // Slightly faster for Shor's
					: algorithmType === 'grovers'
					? 650 // Faster for Grover's search
					: 1000; // Default delay

			// Activate nodes one by one with delay
			algorithmAnimationTimerRef.current = setInterval(() => {
				if (currentIndex >= nodesToActivate.length) {
					if (algorithmAnimationTimerRef.current) {
						clearInterval(algorithmAnimationTimerRef.current);
						algorithmAnimationTimerRef.current = null;
					}
					return;
				}

				const nodeIndex = nodesToActivate[currentIndex];
				const neighbors = findNodeNeighbors(nodeIndex);

				// Only activate if not already active
				if (!coheredNodesRef.current.has(nodeIndex)) {
					animateCoherenceAndEntanglement(nodeIndex, neighbors);
				}

				currentIndex++;
			}, activationDelay);
		}

		return () => {
			// Clean up interval on dismount or when hardware execution stops
			if (algorithmAnimationTimerRef.current) {
				clearInterval(algorithmAnimationTimerRef.current);
				algorithmAnimationTimerRef.current = null;
			}
		};
	}, [isRunningOnHardware, shouldShowAnimation, algorithmType]);

	// Update particle intensity when setting changes
	useEffect(() => {
		if (
			!shouldShowAnimation ||
			!settings.enableParticleSystem ||
			!particlesRef.current
		)
			return;

		// Update particle intensity/opacity
		const particlesMaterial = particlesRef.current
			.material as THREE.PointsMaterial;
		particlesMaterial.opacity = settings.particleIntensity;
		particlesMaterial.needsUpdate = true;
	}, [
		settings.particleIntensity,
		shouldShowAnimation,
		settings.enableParticleSystem,
	]);

	// Function to reset all qubits to their natural state, used when hardware state changes
	const resetAllQubits = () => {
		if (!shouldShowAnimation || !nodesRef.current.length || !sceneRef.current)
			return;

		// Loop through all nodes and reset their appearance
		nodesRef.current.forEach((node) => {
			const nodeMaterial = node.material as
				| THREE.MeshStandardMaterial
				| THREE.MeshBasicMaterial;

			// Generate original colors similar to how they're created initially
			const originalColor = new THREE.Color(0x9747ff).offsetHSL(
				0,
				0,
				(Math.random() - 0.5) * 0.2
			);

			const originalEmissive =
				nodeMaterial instanceof THREE.MeshStandardMaterial
					? new THREE.Color(0x9747ff).offsetHSL(
							0,
							0,
							(Math.random() - 0.5) * 0.2
					  )
					: new THREE.Color(0x000000);

			// Animate back to original appearance
			gsap.to(node.scale, {
				x: 1,
				y: 1,
				z: 1,
				duration: 0.5,
				ease: 'elastic.out(1, 0.3)',
			});

			gsap.to(nodeMaterial, {
				opacity: 0.7 + Math.random() * 0.3,
				duration: 0.5,
				ease: 'power2.out',
			});

			gsap.to(nodeMaterial.color, {
				r: originalColor.r,
				g: originalColor.g,
				b: originalColor.b,
				duration: 0.5,
				ease: 'power2.out',
			});

			if (nodeMaterial instanceof THREE.MeshStandardMaterial) {
				gsap.to(nodeMaterial.emissive, {
					r: originalEmissive.r,
					g: originalEmissive.g,
					b: originalEmissive.b,
					duration: 0.5,
					ease: 'power2.out',
				});

				gsap.to(nodeMaterial, {
					emissiveIntensity: 0.4,
					duration: 0.5,
					ease: 'power2.out',
				});
			}
		});

		// Reset all connecting lines to their original state
		linesRef.current.forEach((line) => {
			const lineMaterial = line.material as THREE.LineBasicMaterial;

			// Get node indices for deterministic color generation
			const nodeIndices = line.userData.nodes || [0, 0];

			// Generate a deterministic color mix based on node indices
			// This ensures the same line always gets the same color after reset
			const baseBlue = new THREE.Color(0x3b82f6);
			const basePurple = new THREE.Color(0x9747ff);
			const mixFactor =
				((nodeIndices[0] * 13 + nodeIndices[1] * 17) % 100) / 250; // 0-0.4 range

			const resetColor = new THREE.Color().lerpColors(
				baseBlue,
				basePurple,
				mixFactor
			);

			// Kill any existing animations
			gsap.killTweensOf(lineMaterial);
			gsap.killTweensOf(lineMaterial.color);

			// Animate back to original appearance
			gsap.to(lineMaterial.color, {
				r: resetColor.r,
				g: resetColor.g,
				b: resetColor.b,
				duration: 0.5,
				ease: 'power2.out',
			});

			// First set a base opacity
			gsap.to(lineMaterial, {
				opacity: line.userData.minOpacity || 0.1,
				duration: 0.5,
				ease: 'power2.out',
				onComplete: () => {
					// Then restart the pulsing animation with the line's own values
					gsap.to(lineMaterial, {
						opacity: line.userData.maxOpacity || 0.2,
						duration: 1 / (line.userData.pulseSpeed || 1),
						repeat: -1,
						yoyo: true,
						ease: 'sine.inOut',
						delay: Math.random() * 0.5, // Small random delay to avoid synchronized pulsing
					});
				},
			});
		});

		// Remove all coherence glow lights
		sceneRef.current.children.forEach((child) => {
			if (
				child instanceof THREE.PointLight &&
				child.color.b > 0.9 &&
				child.color.r < 0.1
			) {
				// This appears to be a coherence glow light
				sceneRef.current?.remove(child);
			}
		});

		// Reset all tracking data
		coheredNodesRef.current.clear();
		visitedNodesRef.current.clear();

		// Clear all coherence timeouts
		coherenceTimeoutsRef.current.forEach((timeout) => {
			clearTimeout(timeout);
		});
		coherenceTimeoutsRef.current.clear();
	};

	// Reset qubits when job or algorithm changes and no hardware is running
	useEffect(() => {
		// When job or algorithm changes but not running on hardware,
		// ensure all qubits return to natural state
		if (!isRunningOnHardware) {
			resetAllQubits();
		}
	}, [jobId, algorithmType, isRunningOnHardware]);

	// Reset qubits when animation becomes visible
	useEffect(() => {
		if (shouldShowAnimation) {
			// Give a small delay to ensure nodes are initialized properly
			const timer = setTimeout(() => {
				resetAllQubits();
			}, 100);

			return () => clearTimeout(timer);
		}
	}, [shouldShowAnimation]);

	// Don't render anything if animation shouldn't be shown
	if (!shouldShowAnimation) {
		return null;
	}

	return (
		<div
			ref={mountRef}
			className="fixed inset-0 w-full h-full z-0"
			aria-label="Interactive Quantum Lattice Visualization"
		/>
	);
};

export default QuantumLatticeBackground;
