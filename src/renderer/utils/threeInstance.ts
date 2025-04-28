/**
 * This file exports a single instance of Three.js to be used across the application.
 * This helps prevent multiple instances of Three.js from being loaded,
 * which can cause warnings and performance issues.
 */

import * as THREE from 'three';

// We can also export commonly used extensions here
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

export { THREE, EffectComposer, RenderPass, UnrealBloomPass };
