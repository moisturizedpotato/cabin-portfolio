import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.scss';

import { createCamera, resizeCamera } from './systems/camera.js';
import { createRenderer, createPostProcessing } from './systems/renderer.js';
import { createTextureLibrary, loadCabin } from './world/cabin.js';
import { loadEnvironment } from './world/environment.js';
import { createFireflies } from './world/fireflies.js';

const canvas = document.querySelector('#experience-canvas');
const sizes = { width: window.innerWidth, height: window.innerHeight };

const cursorCanvas = document.querySelector('#cursor-canvas');
const ctx = cursorCanvas.getContext('2d');
cursorCanvas.width = sizes.width;
cursorCanvas.height = sizes.height;

const scene = new THREE.Scene();
const raycasterObjects = [];
let currentIntersects = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const flickeringLights = [];
const interactableWheels = [];
const interactableFlowers = [];
const cursorParticles = [];
const highlightBoxes = [];

let lantern = null;
let door = null;

const { camera, adjustCameraForScreen, updateCameraBreathing } = createCamera(sizes);
const renderer = createRenderer(canvas, sizes);
const { bloomComposer, finalComposer, darkBackground, darkenNonBloomed, restoreMaterial, resizePostProcessing } = createPostProcessing(scene, camera, renderer, sizes);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.autoRotate = false;
controls.target.set(0.021063226292135844, 1.283590828652241, 0.05102530852447889);

window.addEventListener('mousemove', (event) => {
  pointer.x = (event.clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.clientY / sizes.height) * 2 + 1;

  for (let i = 0; i < 2; i++) {
    cursorParticles.push({
      x: event.clientX,
      y: event.clientY,
      size: Math.random() * 8 + 4, // Random square size between 4px and 12px
      life: 1.0, // 100% opacity
      velocityX: (Math.random() - 0.5) * 2, // Drift left/right
      velocityY: (Math.random() - 0.5) * 2 - 1 // Drift slightly upward
    });
  }
});

window.addEventListener('touchstart', (event)=>{
  pointer.x = (event.touches[0].clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.touches[0].clientY / sizes.height) * 2 + 1;
  },
  {passive: false}
);

function handleRaycasterInteraction()
{
  if (currentIntersects.length > 0)
  {
    const object = currentIntersects[0].object;
    if (object.name.includes("door"))
    {
      object.userData.isOpen = !object.userData.isOpen;
    }
  }
}

window.addEventListener('touchend', (event)=>{
  event.preventDefault();
  handleRaycasterInteraction();
  },
  {passive: false}
); 

window.addEventListener('click', handleRaycasterInteraction);

adjustCameraForScreen();

const textureLoader = new THREE.TextureLoader();
const { textureMap, loadedTextures } = createTextureLibrary(textureLoader);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  resizeCamera(camera, sizes);
  adjustCameraForScreen();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  resizePostProcessing(sizes.width, sizes.height);

  // Update 2D Canvas size
  cursorCanvas.width = window.innerWidth;
  cursorCanvas.height = window.innerHeight;
});

async function init() {
  const environmentPromise = loadEnvironment(scene);
  const cabinPromise = loadCabin({
    scene,
    gltfLoader,
    textureMap,
    loadedTextures,
    raycasterObjects,
    interactableWheels,
    flickeringLights,
    interactableFlowers,
    door,
    highlightBoxes,
    BLOOM_SCENE: 1,
  });

  const cabin = await Promise.all([environmentPromise, cabinPromise]).then(([, loadedCabin]) => loadedCabin);

  lantern = cabin.lantern;
  door = cabin.door;
  let targetRotation = door.userData.closedRotation;
  const fireflies = createFireflies(scene, 1, 75);

  const render = () => {

    // --- 2D CURSOR ANIMATION ---
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    for (let i = cursorParticles.length - 1; i >= 0; i--) {
      const p = cursorParticles[i];

      // Move the particle
      p.x += p.velocityX;
      p.y += p.velocityY;
      
      // Fade it out
      p.life -= 0.03;

      // If it's dead, remove it from the array
      if (p.life <= 0) {
        cursorParticles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = `rgba(51, 187, 255, ${p.life})`;
      const currentSize = p.size * p.life;
      ctx.fillRect(p.x, p.y, currentSize, currentSize);
    }
    const elapsedTime = clock.getElapsedTime();

    fireflies.update(elapsedTime);

    if (lantern) {
      const swingSpeed = 2.0;
      const swingAngle = 0.25;
      lantern.rotation.x = Math.sin(elapsedTime * swingSpeed) * swingAngle;
    }

    flickeringLights.forEach((light) => {
      const noise = Math.sin((elapsedTime + light.offset) * 5) + Math.sin((elapsedTime + light.offset) * 8.5);

      if (noise < -1.98) {
        light.material.emissiveIntensity = 0;
      } else {
        light.material.emissiveIntensity = light.baseIntensity * (0.8 + Math.random() * 0.2);
      }
    });

    updateCameraBreathing(elapsedTime, controls.target);

    raycaster.setFromCamera(pointer, camera);
    currentIntersects = raycaster.intersectObjects(raycasterObjects);

    interactableWheels.forEach(wheel => {
    wheel.userData.targetRotationY = wheel.userData.initialRotation.y;
    });

    interactableFlowers.forEach(flower => {
    flower.userData.targetIntensity = flower.userData.baseIntensity;
    });

    highlightBoxes.forEach(box => {
    box.visible = false;
    
    // IMPORTANT: Tell the box to recalculate its position in case 
    // the door it is attached to is currently swinging open/closed!
    box.update(); 
    });

    for (let i = 0; i < currentIntersects.length; i += 1) {
      if (currentIntersects[i].object.name.includes("wheel"))
      {
        interactableWheels.forEach(wheel => {
          wheel.userData.targetRotationY = wheel.userData.initialRotation.y + Math.PI / 6;
        });
      }
      if (currentIntersects[i].object.name.includes("Flower"))
      {
        currentIntersects[i].object.userData.targetIntensity = currentIntersects[i].object.userData.baseIntensity * 3.0;
      }
      if (currentIntersects[i].object.name.includes("door"))
      {
        targetRotation = door.userData.isOpen ? door.userData.openRotation : door.userData.closedRotation;
      }
    }
    if (currentIntersects.length > 0) {
      const hoveredObj = currentIntersects[0].object;

      // 4. If it's a target object AND it hasn't been clicked/opened yet... show the box!
      if (hoveredObj.name.toLowerCase().includes('target') && !hoveredObj.userData.isOpen) {
        if (hoveredObj.userData.boundingBox) {
          hoveredObj.userData.boundingBox.visible = true;
        }
      }
    }

    document.body.style.cursor = currentIntersects.length > 0 && currentIntersects[0].object.name.includes('target')
      ? 'pointer'
      : 'default';

    interactableWheels.forEach(wheel => {
    // Lerp (Linear Interpolation) creates a buttery smooth movement
    const turnSpeed = 0.1;
    wheel.rotation.y += (wheel.userData.targetRotationY - wheel.rotation.y) * turnSpeed;
    });

    interactableFlowers.forEach(flower => {
    const glowSpeed = 0.1; // How fast the glow swells and fades
    // Lerp the material's emissive intensity
    flower.material.emissiveIntensity += (flower.userData.targetIntensity - flower.material.emissiveIntensity) * glowSpeed;
    });

    const swingSpeed = 0.05; // Lower number = slower, heavier door swing
    door.rotation.y += (targetRotation - door.rotation.y) * swingSpeed;

    const currentBackground = scene.background;
    scene.background = darkBackground;
    scene.traverse(darkenNonBloomed);
    scene.updateMatrixWorld(true);

    bloomComposer.render();

    scene.background = currentBackground;
    scene.traverse(restoreMaterial);

    finalComposer.render();

    window.requestAnimationFrame(render);
  };

  render();
}

init();