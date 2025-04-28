import React, { useRef, useEffect, useState } from 'react';
import { THREE } from '../../utils/threeInstance';
import { gsap } from 'gsap';
import { useTheme } from '@mui/material/styles';

// If needed, import specific THREE.js types not included in the main import
// Note: This is a workaround as the ThreeJS instance might not include FontLoader and TextGeometry
// import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
// import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

interface PeoEasterEggProps {
	enabled?: boolean;
	scene?: THREE.Scene | null;
}

const PeoEasterEgg: React.FC<PeoEasterEggProps> = ({
	enabled = true,
	scene = null,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const sphereRef = useRef<THREE.Mesh | null>(null);
	const heartRef = useRef<THREE.Group | null>(null);
	const [evolutionLevel, setEvolutionLevel] = useState<number>(0); // 0-9 representing 10%-100%
	const [isAnimating, setIsAnimating] = useState<boolean>(false);
	const [isHatched, setIsHatched] = useState<boolean>(false);
	const [heartClickCount, setHeartClickCount] = useState<number>(0);
	const [isHeartbeating, setIsHeartbeating] = useState<boolean>(false);
	const heartbeatTimelineRef = useRef<gsap.core.Timeline | null>(null);
	const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
	const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
	const clickAreaRef = useRef<HTMLDivElement>(null);
	const animationFrameRef = useRef<number>(0);
	const feathersRef = useRef<THREE.Mesh[]>([]);
	const maxFeathers = 50; // Limit number of feathers for performance

	// Calculate egg color based on evolution level
	const calculateEggColor = (level: number) => {
		// Warm cream color matching a natural egg
		const eggColor = new THREE.Color(0xfffaf0); // Lighter floral white color
		const result = new THREE.Color(eggColor);

		// Minimal brightness reduction even at low levels to maintain egg color
		if (level < 9) {
			// Much higher minimum brightness to preserve the egg color
			const brightness = 0.95 + (level / 9) * 0.05;
			result.multiplyScalar(brightness);
		}

		return result;
	};

	// Calculate egg opacity based on evolution level
	const calculateEggOpacity = (level: number) => {
		// Start much more transparent, increase by smaller steps
		return 0.05 + level * 0.1;
	};

	// Handle direct click on the overlay div
	const handleOverlayClick = () => {
		if (isAnimating) return;

		if (isHatched) {
			// Heart is already visible, add some interaction if desired
			handleHeartClick();
			return;
		}

		if (evolutionLevel >= 9 && !isHatched) {
			// Egg is fully evolved, hatch it
			hatchEgg();
			return;
		}

		if (!sphereRef.current) return;

		// Direct click on overlay - evolve the egg immediately
		console.log(
			'Overlay clicked! Evolving directly to level:',
			evolutionLevel + 1
		);
		evolveEgg();
	};

	// Handle heart click with counter
	const handleHeartClick = () => {
		if (!heartRef.current || isAnimating) return;

		// If heartbeat should be active but timeline is null or not active,
		// we need to restart the heartbeat (likely due to remount)
		if (
			isHeartbeating &&
			(!heartbeatTimelineRef.current ||
				!heartbeatTimelineRef.current.isActive())
		) {
			console.log('Heartbeat animation stopped - restarting');
			startRealisticHeartbeat();
			return; // Don't count this click, just restart the heartbeat
		}

		// If already heartbeating, just register the click
		if (isHeartbeating) {
			setHeartClickCount((prevCount) => prevCount + 1);

			// Add a feather when clicking the heart after heartbeat is active
			if (scene) {
				createFeather(scene);
			}
			return;
		}

		// Increment click count
		const newClickCount = heartClickCount + 1;
		setHeartClickCount(newClickCount);

		if (newClickCount === 10) {
			// Start realistic heartbeat after 10 clicks
			startRealisticHeartbeat();
		} else {
			// Regular heartbeat animation for clicks 1-9
			animateHeartBeat();
		}
	};

	// Create a feather and add it to the scene
	const createFeather = (scene: THREE.Scene) => {
		if (!heartRef.current) return;

		// Remove oldest feather if we have too many
		if (feathersRef.current.length >= maxFeathers) {
			const oldestFeather = feathersRef.current.shift();
			if (oldestFeather && oldestFeather.parent) {
				oldestFeather.parent.remove(oldestFeather);
				if (oldestFeather.geometry) oldestFeather.geometry.dispose();
				if (oldestFeather.material) {
					if (Array.isArray(oldestFeather.material)) {
						oldestFeather.material.forEach((m) => m.dispose());
					} else {
						oldestFeather.material.dispose();
					}
				}
			}
		}

		// Create a more distinct feather shape using a custom geometry
		const featherShape = new THREE.Shape();

		// Draw a more pronounced feather shape
		featherShape.moveTo(0, 0);
		featherShape.bezierCurveTo(0.05, 0.2, 0.1, 0.4, 0, 0.8); // Main shaft (longer)

		// Left side barbs
		featherShape.bezierCurveTo(-0.1, 0.7, -0.25, 0.6, -0.3, 0.5);
		featherShape.bezierCurveTo(-0.25, 0.4, -0.2, 0.3, -0.15, 0.2);

		// Right side barbs
		featherShape.bezierCurveTo(0.15, 0.3, 0.3, 0.4, 0.35, 0.5);
		featherShape.bezierCurveTo(0.3, 0.6, 0.2, 0.7, 0.1, 0.75);

		// Back to center and down to start
		featherShape.bezierCurveTo(0.05, 0.4, 0.02, 0.2, 0, 0);

		const featherGeometry = new THREE.ShapeGeometry(featherShape, 16);

		// Brighter yellow material with slight transparency and emissive properties
		const featherMaterial = new THREE.MeshStandardMaterial({
			color: 0xffff00,
			emissive: 0xffff99,
			emissiveIntensity: 0.5,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.95,
		});

		const feather = new THREE.Mesh(featherGeometry, featherMaterial);

		// Get heart position for spawn location
		const heartPosition = new THREE.Vector3();
		heartRef.current.getWorldPosition(heartPosition);

		// Position feather near the heart with slight randomness
		feather.position.set(
			heartPosition.x + (Math.random() * 0.4 - 0.2),
			heartPosition.y + Math.random() * 0.2,
			heartPosition.z + (Math.random() * 0.4 - 0.2)
		);

		// Random rotation
		feather.rotation.set(
			Math.random() * Math.PI,
			Math.random() * Math.PI,
			Math.random() * Math.PI
		);

		// Scale the feather - moderate size between original and very large
		feather.scale.set(0.35, 0.35, 0.35);

		// Add to scene
		scene.add(feather);
		feathersRef.current.push(feather);

		// Animate the feather falling and fading
		animateFeather(feather);
	};

	// Animate a feather falling and fading
	const animateFeather = (feather: THREE.Mesh) => {
		// Random fall duration between 3-6 seconds
		const fallDuration = 3 + Math.random() * 3;

		// Random horizontal drift as it falls
		const driftX = Math.random() * 0.8 - 0.4;
		const driftZ = Math.random() * 0.8 - 0.4;

		// Fall distance
		const fallDistance = -0.8 - Math.random() * 0.8;

		// Start with a slight bounce/puff up animation
		gsap.to(feather.scale, {
			x: feather.scale.x * 1.2,
			y: feather.scale.y * 1.2,
			z: feather.scale.z * 1.2,
			duration: 0.2,
			ease: 'power2.out',
			onComplete: () => {
				// Return to normal size
				gsap.to(feather.scale, {
					x: feather.scale.x / 1.2,
					y: feather.scale.y / 1.2,
					z: feather.scale.z / 1.2,
					duration: 0.3,
					ease: 'power2.in',
				});
			},
		});

		// Create gentle floating animation
		gsap.to(feather.position, {
			y: feather.position.y + fallDistance, // Fall down
			x: feather.position.x + driftX, // Drift randomly
			z: feather.position.z + driftZ,
			duration: fallDuration,
			ease: 'power1.inOut',
		});

		// Add gentle rotation as it falls - more dramatic now
		gsap.to(feather.rotation, {
			x: feather.rotation.x + Math.PI * (Math.random() * 4 - 2),
			y: feather.rotation.y + Math.PI * (Math.random() * 4 - 2),
			z: feather.rotation.z + Math.PI * (Math.random() * 4 - 2),
			duration: fallDuration,
			ease: 'sine.inOut',
		});

		// Fade out the feather
		gsap.to(feather.material as THREE.MeshStandardMaterial, {
			opacity: 0,
			duration: fallDuration * 0.8,
			delay: fallDuration * 0.2, // Start fading after a short delay
			ease: 'power1.in',
			onComplete: () => {
				// Remove feather from scene
				if (feather.parent) {
					feather.parent.remove(feather);
				}

				// Clean up resources
				if (feather.geometry) feather.geometry.dispose();
				if (feather.material) {
					if (Array.isArray(feather.material)) {
						feather.material.forEach((m) => m.dispose());
					} else {
						feather.material.dispose();
					}
				}

				// Remove from our tracking array
				const index = feathersRef.current.indexOf(feather);
				if (index !== -1) {
					feathersRef.current.splice(index, 1);
				}
			},
		});
	};

	// Start realistic heartbeat that increases from 80 to 100 bpm
	const startRealisticHeartbeat = () => {
		if (!heartRef.current) return;

		// If there's an existing animation, kill it first
		if (heartbeatTimelineRef.current) {
			heartbeatTimelineRef.current.kill();
			heartbeatTimelineRef.current = null;
		}

		setIsHeartbeating(true);
		console.log('Starting realistic heartbeat simulation');

		// Calculate timings for realistic heartbeat
		const startBPM = 80;
		const endBPM = 100;

		// Create a realistic heartbeat pattern with systole and diastole
		const createHeartbeatCycle = (bpm: number) => {
			// Calculate timing based on BPM
			const beatInterval = 60 / bpm; // seconds per beat

			// Create a timeline for one complete heartbeat
			const timeline = gsap.timeline({
				repeat: -1,
				onRepeat: () => {
					// Gradually increase BPM over time
					if (timeline.data && timeline.data.currentBPM < endBPM) {
						const newBPM = Math.min(timeline.data.currentBPM + 0.1, endBPM);

						// Add small random jitter (±3ms) to make heartbeat feel natural
						// Real hearts don't beat with perfect timing
						const jitter = Math.random() * 0.006 - 0.003; // ±3ms in seconds
						const newInterval = 60 / newBPM + jitter;

						// Update timeline timing
						timeline.data.currentBPM = newBPM;
						timeline.duration(newInterval);

						// Log BPM change occasionally (every 5 BPM)
						if (
							Math.floor(newBPM) % 5 === 0 &&
							Math.floor(newBPM) !== Math.floor(newBPM - 0.1)
						) {
							console.log(`Heart rate increased to: ${Math.floor(newBPM)} bpm`);
						}
					} else if (timeline.data) {
						// Still add jitter even at max BPM
						const jitter = Math.random() * 0.006 - 0.003; // ±3ms in seconds
						const newInterval = 60 / timeline.data.currentBPM + jitter;
						timeline.duration(newInterval);
					}
				},
			});

			// Store current BPM for gradual increase
			timeline.data = { currentBPM: bpm };

			// Systole (contraction) - quick and strong
			timeline.to(heartRef.current!.scale, {
				x: 1.25,
				y: 1.25,
				z: 1.25,
				duration: beatInterval * 0.15, // Quick expansion
				ease: 'power2.out',
			});

			// First relaxation - quick
			timeline.to(heartRef.current!.scale, {
				x: 0.95,
				y: 0.95,
				z: 0.95,
				duration: beatInterval * 0.15,
				ease: 'power2.in',
			});

			// Second contraction (smaller)
			timeline.to(heartRef.current!.scale, {
				x: 1.1,
				y: 1.1,
				z: 1.1,
				duration: beatInterval * 0.1,
				ease: 'power2.out',
			});

			// Final relaxation and rest period (diastole)
			timeline.to(heartRef.current!.scale, {
				x: 1,
				y: 1,
				z: 1,
				duration: beatInterval * 0.6, // Longer rest period
				ease: 'power1.inOut',
			});

			return timeline;
		};

		// Create and start the heartbeat timeline
		heartbeatTimelineRef.current = createHeartbeatCycle(startBPM);
	};

	// Handle canvas click for 3D raycasting
	const handleCanvasClick = (event: MouseEvent) => {
		if (!scene || isAnimating) {
			console.log(
				'Click ignored: animation in progress or prerequisites not met'
			);
			return;
		}

		// If already hatched and heart exists, handle heart click
		if (isHatched && heartRef.current) {
			handleHeartClick();
			return;
		}

		// If egg is fully evolved, hatch it
		if (evolutionLevel >= 9 && !isHatched && sphereRef.current) {
			hatchEgg();
			return;
		}

		if (!sphereRef.current) {
			return;
		}

		// Get canvas element
		const canvas = event.target as HTMLCanvasElement;
		if (!canvas || !canvas.getBoundingClientRect) {
			console.log('Invalid canvas element');
			return;
		}

		const rect = canvas.getBoundingClientRect();

		// Calculate mouse position in normalized device coordinates (-1 to +1)
		mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		console.log('Mouse position:', mouseRef.current);

		// Find camera in the scene
		let camera: THREE.Camera | null = null;
		scene.traverse((object) => {
			if (
				object instanceof THREE.PerspectiveCamera ||
				object instanceof THREE.OrthographicCamera
			) {
				camera = object;
			}
		});

		if (!camera) {
			console.log('No camera found in scene');
			return;
		}

		// Update the picking ray with the camera and mouse position
		raycasterRef.current.setFromCamera(mouseRef.current, camera);

		// Check for intersections with the egg
		const intersects = raycasterRef.current.intersectObject(sphereRef.current);

		console.log('Raycaster intersections:', intersects.length);

		if (intersects.length > 0) {
			console.log('Egg clicked! Evolving to level:', evolutionLevel + 1);
			evolveEgg();
		}
	};

	// Create heart shape
	const createHeart = () => {
		// Create a group to hold the heart
		const heartGroup = new THREE.Group();

		// Create a more defined heart shape using a combination of techniques
		const heartShape = new THREE.Shape();

		// Better heart curve definition with more pronounced lobes and point
		heartShape.moveTo(0, 0);
		heartShape.bezierCurveTo(-0.25, 0.25, -0.5, 0, -0.25, -0.25);
		heartShape.bezierCurveTo(0, -0.5, 0, -0.5, 0, -0.5);
		heartShape.bezierCurveTo(0, -0.5, 0, -0.5, 0.25, -0.25);
		heartShape.bezierCurveTo(0.5, 0, 0.25, 0.25, 0, 0);

		// Create geometry from the shape with better extrusion parameters
		const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
			depth: 0.15,
			bevelEnabled: true,
			bevelSegments: 8,
			bevelSize: 0.05,
			bevelThickness: 0.05,
			curveSegments: 32,
		});

		// Improved heart texture
		const heartTexture = createHeartTexture();

		// Create heart material - bright red with more shine for 3D effect
		const heartMaterial = new THREE.MeshStandardMaterial({
			color: 0xff0000, // Bright red
			emissive: 0xff0000,
			emissiveIntensity: 0.3,
			metalness: 0.4,
			roughness: 0.3,
		});

		// Create heart mesh
		const heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);
		// Scale and rotate for better orientation
		heartMesh.scale.set(1.2, 1.2, 1.2);
		heartGroup.add(heartMesh);

		// Create front and back text planes (not sprites)
		const textTexture = createTextTexture('Peo', 240);

		// Create a basic material that's unaffected by lighting
		const textMaterial = new THREE.MeshBasicMaterial({
			map: textTexture,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false, // Helps with transparency issues
		});

		// Front text plane
		const frontTextGeometry = new THREE.PlaneGeometry(0.5, 0.25);
		const frontTextMesh = new THREE.Mesh(frontTextGeometry, textMaterial);
		// Position it on the front of the heart, slightly lower
		frontTextMesh.position.set(0, -0.15, 0.28);
		// Make it completely flat - no rotation
		heartGroup.add(frontTextMesh);

		// Back text plane (separate mesh with same material)
		const backTextGeometry = new THREE.PlaneGeometry(0.5, 0.25);
		const backTextMesh = new THREE.Mesh(backTextGeometry, textMaterial);
		// Position it on the back of the heart, slightly lower
		backTextMesh.position.set(0, -0.15, -0.08);
		// Make it completely flat - only rotate Y to flip the text direction
		backTextMesh.rotation.y = Math.PI; // Flip it so text reads correctly
		heartGroup.add(backTextMesh);

		// Position and rotate the heart group
		heartGroup.position.set(0.3, -0.1, 0.6);
		heartGroup.rotation.y = Math.PI * 0.2;
		heartGroup.scale.set(0, 0, 0); // Start with zero scale for animation

		return heartGroup;
	};

	// Create text texture
	const createTextTexture = (text: string, fontSize: number = 100) => {
		// Create canvas
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 256;
		const context = canvas.getContext('2d');

		if (!context) {
			console.error('Could not get 2D context for text canvas');
			return new THREE.Texture();
		}

		// Clear canvas with transparent background
		context.clearRect(0, 0, canvas.width, canvas.height);

		// Set text properties
		context.font = `Bold ${fontSize}px Arial`;
		context.textAlign = 'center';
		context.textBaseline = 'middle';

		// Draw text outline
		context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
		context.lineWidth = fontSize * 0.05;
		context.strokeText(text, canvas.width / 2, canvas.height / 2);

		// Draw text
		context.fillStyle = 'rgba(255, 255, 255, 1.0)';
		context.fillText(text, canvas.width / 2, canvas.height / 2);

		// Add glow
		context.shadowColor = 'white';
		context.shadowBlur = 15;
		context.fillText(text, canvas.width / 2, canvas.height / 2);

		// Create texture
		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;

		return texture;
	};

	// Create heart texture with "Peo" text
	const createHeartTexture = () => {
		// Create a larger canvas for better quality
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const context = canvas.getContext('2d');

		if (context) {
			// Fill the background with red (with gradient for 3D effect)
			const gradient = context.createRadialGradient(
				canvas.width / 2,
				canvas.height / 2,
				50,
				canvas.width / 2,
				canvas.height / 2,
				canvas.width / 2
			);
			gradient.addColorStop(0, '#ff3333');
			gradient.addColorStop(1, '#cc0000');
			context.fillStyle = gradient;
			context.fillRect(0, 0, canvas.width, canvas.height);
		}

		// Create texture from canvas
		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	};

	// Hatch the egg into a heart
	const hatchEgg = () => {
		if (!sphereRef.current || !scene || isAnimating || isHatched) return;

		setIsAnimating(true);
		console.log('Hatching egg into heart!');

		// Create shake and crack animation for egg
		const origPos = {
			x: sphereRef.current.position.x,
			y: sphereRef.current.position.y,
			z: sphereRef.current.position.z,
		};

		// Violent shaking animation
		gsap.to(sphereRef.current.position, {
			x: origPos.x - 0.1,
			duration: 0.1,
			yoyo: true,
			repeat: 8,
			ease: 'power2.inOut',
		});

		gsap.to(sphereRef.current.position, {
			y: origPos.y + 0.05,
			duration: 0.1,
			yoyo: true,
			repeat: 8,
			ease: 'power2.inOut',
		});

		gsap.to(sphereRef.current.rotation, {
			z: Math.PI * 0.1,
			duration: 0.1,
			yoyo: true,
			repeat: 8,
			ease: 'power2.inOut',
		});

		// Create and add heart to scene
		const heart = createHeart();
		scene.add(heart);
		heartRef.current = heart;

		// After shaking, make egg disappear and heart appear
		setTimeout(() => {
			if (!sphereRef.current || !heartRef.current) return;

			// Make egg explode/disappear
			gsap.to(sphereRef.current.scale, {
				x: 0,
				y: 0,
				z: 0,
				duration: 0.5,
				ease: 'power2.in',
				onComplete: () => {
					// Remove egg from scene
					if (sphereRef.current && sphereRef.current.parent) {
						sphereRef.current.parent.remove(sphereRef.current);
					}
				},
			});

			// Make heart appear with a nice animation
			gsap.to(heartRef.current.scale, {
				x: 1,
				y: 1,
				z: 1,
				duration: 0.8,
				delay: 0.3,
				ease: 'elastic.out(1, 0.5)',
				onComplete: () => {
					setIsAnimating(false);
					setIsHatched(true);
					console.log('Egg hatched successfully!');

					// Add continuous gentle floating animation to heart
					gsap.to(heartRef.current!.position, {
						y: heartRef.current!.position.y + 0.07,
						duration: 1.5,
						repeat: -1,
						yoyo: true,
						ease: 'sine.inOut',
					});

					// Add gentle rotation
					gsap.to(heartRef.current!.rotation, {
						y: Math.PI * 2 + heartRef.current!.rotation.y,
						duration: 12,
						repeat: -1,
						ease: 'none',
					});
				},
			});
		}, 800);
	};

	// Animate heartbeat when clicked after hatching
	const animateHeartBeat = () => {
		if (!heartRef.current || isAnimating) return;

		setIsAnimating(true);
		console.log('Heart beat animation!');

		// Scale up and down quickly for heartbeat effect
		gsap.to(heartRef.current.scale, {
			x: 1.3,
			y: 1.3,
			z: 1.3,
			duration: 0.15,
			ease: 'power2.out',
			yoyo: true,
			repeat: 1,
			onComplete: () => {
				setIsAnimating(false);
			},
		});
	};

	// Directly update the egg material for a given level
	const updateEggAppearance = (level: number) => {
		if (!sphereRef.current) return;

		const material = sphereRef.current.material as THREE.MeshStandardMaterial;
		const newColor = calculateEggColor(level);
		const newOpacity = calculateEggOpacity(level);

		material.color.set(newColor);
		material.opacity = newOpacity;
		material.needsUpdate = true;

		console.log('Egg appearance updated to:', {
			level,
			color: `rgb(${Math.round(newColor.r * 255)},${Math.round(
				newColor.g * 255
			)},${Math.round(newColor.b * 255)})`,
			opacity: newOpacity,
		});
	};

	// Evolve the egg to the next level
	const evolveEgg = () => {
		if (isAnimating || evolutionLevel >= 9 || !sphereRef.current) return;

		setIsAnimating(true);
		const newLevel = evolutionLevel + 1;
		setEvolutionLevel(newLevel);

		// Get the material
		const material = sphereRef.current.material as THREE.MeshStandardMaterial;

		// Update color and opacity
		const newColor = calculateEggColor(newLevel);
		const newOpacity = calculateEggOpacity(newLevel);

		// Console log to help debug
		console.log('Evolving egg:', {
			level: newLevel,
			newColor: `rgb(${Math.round(newColor.r * 255)},${Math.round(
				newColor.g * 255
			)},${Math.round(newColor.b * 255)})`,
			newOpacity,
		});

		// Animate color change
		gsap.to(material.color, {
			r: newColor.r,
			g: newColor.g,
			b: newColor.b,
			duration: 0.5,
			ease: 'power2.out',
		});

		// Animate opacity change
		gsap.to(material, {
			opacity: newOpacity,
			duration: 0.5,
			ease: 'power2.out',
			onUpdate: () => {
				material.needsUpdate = true;
			},
		});

		// DRAMATIC WOBBLE ANIMATION - COMPLETELY REBUILT

		// Store original position and rotation
		const origPos = {
			x: sphereRef.current.position.x,
			y: sphereRef.current.position.y,
			z: sphereRef.current.position.z,
		};

		const origRot = {
			x: sphereRef.current.rotation.x,
			y: sphereRef.current.rotation.y,
			z: sphereRef.current.rotation.z,
		};

		console.log('STARTING EGG ANIMATION', { origPos, origRot });

		// Clear any running GSAP animations on this object
		gsap.killTweensOf(sphereRef.current.position);
		gsap.killTweensOf(sphereRef.current.rotation);

		// Create a very obvious initial "bump" animation first
		// This gives a dramatic initial motion for feedback
		gsap.to(sphereRef.current.position, {
			y: origPos.y + 0.1, // Big upward bounce
			duration: 0.2,
			ease: 'power2.out',
			onComplete: () => {
				console.log('Initial bump complete');
			},
		});

		// Then the wobble sequence
		// We'll handle this as a sequence of function calls with setTimeout
		// to ensure each step happens and can be logged

		setTimeout(() => {
			if (!sphereRef.current) return;
			console.log('Wobble 1 - right');

			// First wobble - right
			gsap.to(sphereRef.current.position, {
				x: origPos.x + 0.05,
				y: origPos.y - 0.05,
				duration: 0.18,
				ease: 'power1.inOut',
			});

			gsap.to(sphereRef.current.rotation, {
				z: origRot.z - 0.2,
				duration: 0.18,
				ease: 'power1.inOut',
			});
		}, 200); // after initial bump

		setTimeout(() => {
			if (!sphereRef.current) return;
			console.log('Wobble 2 - left');

			// Second wobble - left
			gsap.to(sphereRef.current.position, {
				x: origPos.x - 0.05,
				y: origPos.y - 0.02,
				duration: 0.18,
				ease: 'power1.inOut',
			});

			gsap.to(sphereRef.current.rotation, {
				z: origRot.z + 0.2,
				duration: 0.18,
				ease: 'power1.inOut',
			});
		}, 380);

		setTimeout(() => {
			if (!sphereRef.current) return;
			console.log('Wobble 3 - right');

			// Third wobble - right
			gsap.to(sphereRef.current.position, {
				x: origPos.x + 0.03,
				y: origPos.y - 0.01,
				duration: 0.15,
				ease: 'power1.inOut',
			});

			gsap.to(sphereRef.current.rotation, {
				z: origRot.z - 0.15,
				duration: 0.15,
				ease: 'power1.inOut',
			});
		}, 560);

		setTimeout(() => {
			if (!sphereRef.current) return;
			console.log('Wobble 4 - left');

			// Fourth wobble - left
			gsap.to(sphereRef.current.position, {
				x: origPos.x - 0.02,
				duration: 0.15,
				ease: 'power1.inOut',
			});

			gsap.to(sphereRef.current.rotation, {
				z: origRot.z + 0.1,
				duration: 0.15,
				ease: 'power1.inOut',
			});
		}, 710);

		setTimeout(() => {
			if (!sphereRef.current) return;
			console.log('Final settle');

			// Final settle
			gsap.to(sphereRef.current.position, {
				x: origPos.x,
				y: origPos.y,
				z: origPos.z,
				duration: 0.3,
				ease: 'power1.out',
			});

			gsap.to(sphereRef.current.rotation, {
				x: origRot.x,
				z: origRot.z,
				duration: 0.3,
				ease: 'elastic.out(1, 0.3)',
				onComplete: () => {
					console.log('WOBBLE ANIMATION COMPLETE');
					setIsAnimating(false);
					updateEggAppearance(newLevel);

					// Restart the y rotation that might have been stopped
					if (sphereRef.current) {
						gsap.to(sphereRef.current.rotation, {
							y: Math.PI * 2 + origRot.y,
							duration: 15,
							repeat: -1,
							ease: 'none',
						});
					}
				},
			});
		}, 860);
	};

	// Clean up animations when component unmounts
	useEffect(() => {
		return () => {
			// Clean up heartbeat animation
			if (heartbeatTimelineRef.current) {
				heartbeatTimelineRef.current.kill();
				heartbeatTimelineRef.current = null;
			}

			// Clean up any remaining feathers
			feathersRef.current.forEach((feather) => {
				if (feather.parent) {
					feather.parent.remove(feather);
				}
				if (feather.geometry) feather.geometry.dispose();
				if (feather.material) {
					if (Array.isArray(feather.material)) {
						feather.material.forEach((m) => m.dispose());
					} else {
						feather.material.dispose();
					}
				}
			});
			feathersRef.current = [];
		};
	}, []);

	// Initialize the Easter Egg sphere
	useEffect(() => {
		if (!enabled || !isDarkMode || !scene) return;

		// Clean up any existing sphere or heart
		if (sphereRef.current && sphereRef.current.parent) {
			sphereRef.current.parent.remove(sphereRef.current);
			if (sphereRef.current.geometry) sphereRef.current.geometry.dispose();
			if (sphereRef.current.material) {
				if (Array.isArray(sphereRef.current.material)) {
					sphereRef.current.material.forEach((mat) => mat.dispose());
				} else {
					sphereRef.current.material.dispose();
				}
			}
		}

		if (heartRef.current && heartRef.current.parent) {
			heartRef.current.parent.remove(heartRef.current);
			heartRef.current.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					if (child.geometry) child.geometry.dispose();
					if (child.material) {
						if (Array.isArray(child.material)) {
							child.material.forEach((mat) => mat.dispose());
						} else {
							child.material.dispose();
						}
					}
				}
			});
		}

		// If already hatched, create and show heart
		if (isHatched) {
			const heart = createHeart();
			scene.add(heart);
			heartRef.current = heart;

			// Set scale to 1 immediately since it's already hatched
			heart.scale.set(1, 1, 1);

			// Add continuous gentle floating animation to heart
			gsap.to(heart.position, {
				y: heart.position.y + 0.07,
				duration: 1.5,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			});

			// Add gentle rotation
			gsap.to(heart.rotation, {
				y: Math.PI * 2 + heart.rotation.y,
				duration: 12,
				repeat: -1,
				ease: 'none',
			});

			// If we should be heartbeating, restart the animation
			if (isHeartbeating) {
				startRealisticHeartbeat();
			}

			return;
		}

		// Create sphere geometry - use a basic sphere that we'll transform, but larger for easier clicking
		const sphereGeometry = new THREE.SphereGeometry(0.15, 24, 24); // Increased from 0.1 to 0.15

		// Create material with appropriate starting color and opacity
		const initialColor = calculateEggColor(evolutionLevel);
		const initialOpacity = calculateEggOpacity(evolutionLevel);

		console.log('Initial egg appearance:', {
			level: evolutionLevel,
			color: `rgb(${Math.round(initialColor.r * 255)},${Math.round(
				initialColor.g * 255
			)},${Math.round(initialColor.b * 255)})`,
			opacity: initialOpacity,
		});

		// TESTING: For testing, can be changed to orange (0xFF8C00) DO NOT EDIT THIS LINE
		const sphereMaterial = new THREE.MeshStandardMaterial({
			color: initialColor, // Start with calculated color based on level
			emissive: 0xfffaf0, // Match the lighter egg color
			emissiveIntensity: 0.05,
			metalness: 0.05,
			roughness: 0.3,
			transparent: true,
			opacity: initialOpacity, // Start at calculated opacity based on level
		});

		// Create the mesh
		const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
		sphere.userData.type = 'easterEgg'; // Add identifier

		// Scale to make it egg-shaped (taller than wide)
		sphere.scale.set(1, 1.5, 1);

		// Position near center, slightly offset for better visibility
		sphere.position.set(0.3, -0.1, 0.6); // Moved forward (z) and up (y) for better visibility

		// Rotate to make it stand upright
		sphere.rotation.x = Math.PI * 0.1;

		// Add to scene
		scene.add(sphere);
		sphereRef.current = sphere;

		// Add subtle animation
		gsap.to(sphere.position, {
			y: sphere.position.y + 0.05,
			duration: 2,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut',
		});

		// Add subtle rotation
		gsap.to(sphere.rotation, {
			y: Math.PI * 2,
			duration: 15,
			repeat: -1,
			ease: 'none',
		});

		// Set up click event listener
		const renderer = document.querySelector('canvas');
		if (renderer) {
			console.log('Canvas found, attaching click listener');
			renderer.addEventListener('click', handleCanvasClick);
			// Make sure canvas has proper pointer events
			renderer.style.pointerEvents = 'auto';
		} else {
			// Fallback to document if canvas not found
			console.log('Canvas not found, using document for click events');
			document.addEventListener('click', handleCanvasClick);
		}

		return () => {
			// Clean up
			const renderer = document.querySelector('canvas');
			if (renderer) {
				renderer.removeEventListener('click', handleCanvasClick);
			} else {
				document.removeEventListener('click', handleCanvasClick);
			}

			if (sphereRef.current && sphereRef.current.parent) {
				sphereRef.current.parent.remove(sphereRef.current);
				if (sphereRef.current.geometry) sphereRef.current.geometry.dispose();
				if (sphereRef.current.material) {
					if (Array.isArray(sphereRef.current.material)) {
						sphereRef.current.material.forEach((mat) => mat.dispose());
					} else {
						sphereRef.current.material.dispose();
					}
				}
			}
		};
	}, [enabled, isDarkMode, scene, evolutionLevel, isHatched]);

	// Create a clickable overlay div positioned where the egg is with requestAnimationFrame
	useEffect(() => {
		if (!enabled || !isDarkMode || !sphereRef.current) return;

		// Position the hitbox in the center of the screen
		const updateClickAreaPosition = () => {
			if (!clickAreaRef.current) return;

			// Place the hitbox directly in the center of the viewport
			const centerX = window.innerWidth / 2;
			const centerY = window.innerHeight / 2;

			// Set the clickable div position - center it on the egg
			// Adjust position based on whether it's hatched (heart is larger than egg)
			const size = isHatched ? 50 : 25; // Half of the width/height for centering
			clickAreaRef.current.style.left = `${centerX - size}px`;
			clickAreaRef.current.style.top = `${centerY - size}px`;
		};

		// Initial positioning
		updateClickAreaPosition();

		// Update on resize
		window.addEventListener('resize', updateClickAreaPosition);

		return () => {
			// Clean up
			cancelAnimationFrame(animationFrameRef.current);
			window.removeEventListener('resize', updateClickAreaPosition);
		};
	}, [enabled, isDarkMode, sphereRef.current, scene, isHatched]);

	// Render the clickable overlay div only in dark mode
	return isDarkMode ? (
		<div
			ref={clickAreaRef}
			onClick={handleOverlayClick}
			style={{
				position: 'fixed',
				width: isHatched ? '100px' : '50px',
				height: isHatched ? '100px' : '50px',
				borderRadius: '50%',
				cursor: 'pointer',
				pointerEvents: 'auto',
				zIndex: 1000,
				// DEBUGGING LINE: Uncomment to debug positioning DO NOT EDIT THIS LINE
				// backgroundColor: 'rgba(255,0,0,0.2)',
			}}
			aria-label="Easter Egg"
		/>
	) : null;
};

export default PeoEasterEgg;
