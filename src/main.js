import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import './style.scss'

const canvas = document.querySelector('#experience-canvas');

const sizes ={
  height: window.innerHeight,
  width: window.innerWidth
};

const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
const materials = {}; // This will temporarily store your normal materials

const clock = new THREE.Clock();
let lantern; // Create a variable to hold the lantern object

//Loaders
const textureLoader = new THREE.TextureLoader();

//Model Loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const textureMap = {
  First: "/textures/bakeone.webp",
  Second: "/textures/baketwo.webp",
  Third: "/textures/bakethreev2.webp"
};

const loadedTextures = {};

Object.entries(textureMap).forEach(([key, value]) => {
  const Texture = textureLoader.load(value);
  Texture.flipY = false; // Ensure the texture is not flipped vertically
  Texture.colorSpace = THREE.SRGBColorSpace; // Set the color space to sRGB for correct color rendering
  loadedTextures[key] = Texture;
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 40, sizes.width / sizes.height, 0.1, 1000 );
camera.setFocalLength(35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

gltfLoader.load("/models/cabin-v4.glb", (glb) =>{
  glb.scene.traverse((child) => {
    if (child.isMesh) {
      Object.keys(textureMap).forEach((key) => {
        if (child.name.toLowerCase().includes('emit')) {
          if (child.name.includes("lantern"))
          {
            child.material = new THREE.MeshStandardMaterial({
            map: loadedTextures[key],       // The base color of the object
            emissive: 0xFCBA03,    // The color of the light it emits (e.g., warm orange)
            emissiveIntensity: 1.0 // How bright the light is (can go above 1)
            });
            child.layers.enable(BLOOM_SCENE);
          }
          else if (child.name.includes("Flower") && (child.name.includes("_3") || child.name.includes("_2"))){
            child.material = new THREE.MeshStandardMaterial({
            map: loadedTextures[key],       // The base color of the object
            emissive: 0x0B68A1,    // The color of the light it emits (e.g., warm orange)
            emissiveIntensity: 3.0 // How bright the light is (can go above 1)
          });
          child.layers.enable(BLOOM_SCENE);
          }
          else if (child.name.includes("Flower")) {
            child.material = new THREE.MeshStandardMaterial({
            map: loadedTextures[key],       // The base color of the object
            emissive: 0xFF5050,    // The color of the light it emits (e.g., warm orange)
            emissiveIntensity: 5.0 // How bright the light is (can go above 1)
          });
          child.layers.enable(BLOOM_SCENE);
          }
          else if (child.name.includes("headlights")){
            child.material = new THREE.MeshStandardMaterial({
            map: loadedTextures[key],       // The base color of the object
            emissive: 0xffaa00,    // The color of the light it emits (e.g., warm orange)
            emissiveIntensity: 5.0 // How bright the light is (can go above 1)
          });
          child.layers.enable(BLOOM_SCENE);
          }
        
        }
        else if (child.name.includes(key)) {
          // Force the primary UV channel to use the secondary UV map's data
          //come back here to manage the uvs for models without a second uv
          if (child.geometry.attributes.uv1) {
            child.geometry.attributes.uv = child.geometry.attributes.uv1;
          }
          const material = new THREE.MeshBasicMaterial({
            map: loadedTextures[key],
            transparent: true, // 1. Tells Three.js to read the alpha channel
            alphaTest: 0.5
          });
          child.material = material;
          
          if (child.material.map)
          {
            child.material.map.minFilter = THREE.LinearFilter; // 1. Set the minification filter to LinearFilter
          }
          if (child.name.includes("hanging")) {
            lantern = child;
          }
        }
      });
    }
  });
  scene.add(glb.scene);
});

// 1. Ensure your renderer is ready for high-dynamic-range lighting
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0; 
renderer.outputColorSpace = THREE.SRGBColorSpace;

// 2. Initialize the EXRLoader
const exrLoader = new EXRLoader();

// Optional: You can explicitly set the data type to HalfFloatType. 
// This saves memory and is perfectly fine for most visual lighting tasks.
exrLoader.setDataType(THREE.HalfFloatType);

// 3. Load the EXR file
exrLoader.load('/images/night_sky-v2.exr', function (texture) {
    
    // Tell Three.js this is an equirectangular sphere map
    texture.mapping = THREE.EquirectangularReflectionMapping;

    // Apply it to the background and the global environment lighting
    scene.background = texture;
    scene.environment = texture;

    scene.backgroundRotation.y = Math.PI / 32;
    scene.backgroundRotation.z = Math.PI / 16 + Math.PI / 32;
    
    // Optional: free up memory once the texture is uploaded to the GPU
    texture.dispose();
});



camera.position.set(11.219791287579758, 0.305711364170281, -0.034319656950226644);

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();
controls.target.set(0.021063226292135844, 1.283590828652241, 0.05102530852447889);

// --- POST-PROCESSING SETUP ---

const renderPass = new RenderPass(scene, camera);

// --- COMPOSER 1: THE BLOOM MAKER ---
const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false; // Don't show this to the user
bloomComposer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5, 0.1, 0.5 // Standard settings!
);
bloomComposer.addPass(bloomPass);

// --- COMPOSER 2: THE FINAL MIX ---
const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderPass);

// This custom shader adds the glowing layer on top of the normal layer
const mixPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      varying vec2 vUv;
      void main() {
        // Additive blending: Normal Scene + Glowing Scene
        gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
      }
    `
  }), 'baseTexture'
);
mixPass.needsSwap = true;
finalComposer.addPass(mixPass);


//Event Listeners
window.addEventListener('resize', () => {
  //Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  //Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  //Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  bloomComposer.setSize(sizes.width, sizes.height);
  finalComposer.setSize(sizes.width, sizes.height);
});

controls.enabled = false;
controls.autoRotate = false;
const basePosition = camera.position.clone();

function darkenNonBloomed(obj) {
  // If it's a mesh and NOT on the bloom layer, turn it black
  if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
    materials[obj.uuid] = obj.material; // Save the real material
    obj.material = darkMaterial;        // Apply the black material
  }
}

function restoreMaterial(obj) {
  // Give the object its real material back
  if (materials[obj.uuid]) {
    obj.material = materials[obj.uuid];
    delete materials[obj.uuid];
  }
}

const render = () => {
  //console.log(camera.position);
  //console.log("0000000");
  //console.log(controls.target);
  // 1. Get the time elapsed since the clock started
  const elapsedTime = clock.getElapsedTime();

  // 2. Animate the lantern if it has loaded
  if (lantern) {
    const swingSpeed = 2.0;  // How fast it swings back and forth
    const swingAngle = 0.25; // How far it swings (in radians)

    // Math.sin creates a smooth wave between -1 and 1 based on time.
    // Multiply by swingAngle to constrain how far it moves.
    lantern.rotation.x = Math.sin(elapsedTime * swingSpeed) * swingAngle; 
    
    // Note: If your lantern is facing a different direction, 
    // you might need to change '.z' to '.x' to make it swing the right way!
  }

  // --- BREATHING SETTINGS ---
  const breathSpeed = 1.5;      // How fast the person is breathing
  const verticalAmplitude = 0.01; // How far up and down the camera moves
  const swayAmplitude = 0.012;   // How far left and right the camera sways

  // --- APPLY THE MOTION ---
  // 1. Calculate the new position using the saved basePosition
  camera.position.y = basePosition.y + Math.sin(elapsedTime * breathSpeed) * verticalAmplitude;
  
  // 2. Add a slight side-to-side sway using cosine at half speed for organic variation
  camera.position.x = basePosition.x + Math.cos(elapsedTime * (breathSpeed * 0.5)) * swayAmplitude;

  // 3. Keep the camera focused on your target while it moves
  camera.lookAt(controls.target);
  controls.update();

// 1. HIDE THE SCENE: Turn the sky black and silhouette the cabin
  const currentBackground = scene.background;
  scene.background = new THREE.Color('black');
  scene.traverse(darkenNonBloomed);

  // 2. RENDER THE GLOW: Takes a picture of only the glowing lanterns
  bloomComposer.render();

  // 3. RESTORE THE SCENE: Bring back the EXR sky and the real cabin materials
  scene.background = currentBackground;
  scene.traverse(restoreMaterial);

  // 4. RENDER FINAL: Draws the normal scene and overlays the glow picture
  finalComposer.render();
  window.requestAnimationFrame( render );

};

render();