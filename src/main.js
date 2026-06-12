import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.scss';
import gsap from 'gsap';

import { createCamera, resizeCamera } from './systems/camera.js';
import { createRenderer, createPostProcessing } from './systems/renderer.js';
import { createTextureLibrary, loadCabin } from './world/cabin.js';
import { loadEnvironment } from './world/environment.js';
import { createFireflies } from './world/fireflies.js';
import { Howl, Howler } from 'howler';

// --- HOWLER AUDIO MANAGER ---
const sfx = {
  flower1:      new Howl({ src: ['/audio/flower_1_sfx.mp3'] }),
  flower2:      new Howl({ src: ['/audio/flower_2_sfx.mp3'] }),
  flower3:      new Howl({ src: ['/audio/flower_3_sfx.mp3'] }),
  tyre:         new Howl({ src: ['/audio/tyre_hovered_sfx.mp3'], volume: 0.2 }),
  whoosh:       new Howl({ src: ['/audio/camera_move_whoosh_sfx.mp3'] }),
  flicker:      new Howl({ src: ['/audio/flickering_light_sfx.mp3'] }),
  window:       new Howl({ src: ['/audio/window_inside_hover_sfx.mp3'], volume: 0.3 }),
  sign:         new Howl({ src: ['/audio/sign_left_right_hover_sfx.mp3'], volume: 0.3 }),
  door_opening: new Howl({ src: ['/audio/door_opening_sfx.mp3'] }),
  door_closing: new Howl({ src: ['/audio/door_closing_sfx.mp3'] }),
  
  bgm: new Howl({ 
    src: ['/audio/background_looping_sfx.mp3'], 
    loop: true, 
    volume: 0.2 
  })
};

let isAudioMuted = true;
let lastHoveredObjectName = null;

const canvas = document.querySelector('#experience-canvas');
const sizes = { width: window.innerWidth, height: window.innerHeight };

const cursorCanvas = document.querySelector('#cursor-canvas');
const ctx = cursorCanvas.getContext('2d');
cursorCanvas.width = sizes.width;
cursorCanvas.height = sizes.height;

const loadingScreen = document.querySelector('#loading-screen');
const loadingBar = document.querySelector('#loading-bar');
const loadingText = document.querySelector('#loading-text');
const blocksContainer = document.querySelector('#loading-blocks');
const backButton = document.querySelector('#back-button');
const whiteOverlay = document.querySelector('#white-fade-overlay');
const githubBubble = document.querySelector('#github-bubble');
const audioToggleBtn = document.querySelector('#audio-toggle');
const blackOverlay = document.querySelector('#black-fade-overlay');
const aeImageOverlay = document.querySelector('#ae-image-overlay');
const blackBgLayer = document.querySelector('#black-bg-layer');
const screenshotContainer = document.querySelector('#screenshot-container');
const playButton = document.querySelector('#play-button');
const greyOverlay = document.querySelector('#grey-overlay');

Howler.mute(true);
audioToggleBtn.addEventListener('click', () => {
  isAudioMuted = !isAudioMuted;
  
  if (isAudioMuted) {
    audioToggleBtn.innerText = "SOUND: OFF";
    Howler.mute(true); // Instantly mutes EVERYTHING
  } else {
    audioToggleBtn.innerText = "SOUND: ON";
    Howler.mute(false); // Instantly unmutes EVERYTHING
    
    // Only call play() on the BGM if it isn't already playing
    if (!sfx.bgm.playing()) {
      sfx.bgm.play();
    }
  }
});

const scene = new THREE.Scene();
const raycasterObjects = [];
let currentIntersects = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
const loadingManager = new THREE.LoadingManager();

const flickeringLights = [];
const interactableWheels = [];
const interactableFlowers = [];
const cursorParticles = [];
const highlightBoxes = [];
const leftSignGroup = { meshes: [], isHovered: false };
const rightSignGroup = { meshes: [], isHovered: false };
 
let currentlyHoveredSignGroup = null;

let lantern = null;
let door = null;
const blockSize = 60;

const cols = Math.ceil(window.innerWidth / blockSize);
const rows = Math.ceil(window.innerHeight / blockSize);
const totalBlocks = cols * rows;

blocksContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
blocksContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

for (let i = 0; i < totalBlocks; i++) {
  const block = document.createElement('div');
  block.classList.add('loading-block');
  blocksContainer.appendChild(block);
}

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  loadingBar.style.width = `${progress}%`;
  loadingText.innerText = `INITIALIZING... ${Math.round(progress)}%`;
};

const { camera, basePosition, adjustCameraForScreen, updateCameraBreathing } = createCamera(sizes);
let isBreathingPaused = false;

const defaultTargetY = 1.283590828652241;

const defaultBasePosition = basePosition.clone();
const defaultLookTarget = new THREE.Vector3(0.021063226292135844, defaultTargetY, 0.05102530852447889);

const cameraLookTarget = new THREE.Vector3(0.021063226292135844, defaultTargetY - 3.0, 0.05102530852447889);

// --- TRIGGER THE DIAGONAL UNRAVEL EFFECT ---
loadingManager.onLoad = () => {
  setTimeout(() => {
    document.querySelector('.loading-container').style.display = 'none';

    // 1. The Block Unravel Animation
    gsap.to('.loading-block', {
      scale: 0, 
      opacity: 0, 
      duration: 0.3, 
      ease: "power1.in", 
      stagger: {
        amount: 1.5, 
        grid: [rows, cols], 
        from: 0 
      },
      onComplete: () => {
        loadingScreen.style.display = 'none';
      }
    });

    // 2. ADD THIS: The Cinematic Head Raise
    gsap.to(cameraLookTarget, {
      y: defaultTargetY,  // Animate back to the saved default
      duration: 2.5,         // Make it slow and dramatic
      ease: "power3.inOut",  // Smooth acceleration and deceleration
      delay: 0.5             // Wait 0.5s so the blocks start clearing first!
    });

  }, 500); 
};

const renderer = createRenderer(canvas, sizes);
const { bloomComposer, finalComposer, darkBackground, darkenNonBloomed, restoreMaterial, resizePostProcessing } = createPostProcessing(scene, camera, renderer, sizes);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.autoRotate = false;
controls.target.set(0.021063226292135844, defaultTargetY - 3.0, 0.05102530852447889);

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

// --- BACK BUTTON HOVER ANIMATION ---
backButton.addEventListener('mouseenter', () => {
  gsap.to(backButton, {
    y: -8, // Bounce up 8 pixels
    duration: 0.4,
    ease: "back.out(2)" // Juicy elastic bounce
  });
});

backButton.addEventListener('mouseleave', () => {
  gsap.to(backButton, {
    y: 0, // Return to resting position
    duration: 0.4,
    ease: "power2.out"
  });
});

window.addEventListener('touchstart', (event)=>{
  pointer.x = (event.touches[0].clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.touches[0].clientY / sizes.height) * 2 + 1;

  for (let i = 0; i < 5; i++) {
    cursorParticles.push({
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      size: Math.random() * 8 + 4,
      life: 1.0,
      velocityX: (Math.random() - 0.5) * 4, // Wider spread for tap burst
      velocityY: (Math.random() - 0.5) * 4 
    });
  }
  },
  {passive: false}
);

// --- CURSOR PARTICLES ---
window.addEventListener('mousemove', (event) => {
  pointer.x = (event.clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.clientY / sizes.height) * 2 + 1;

  for (let i = 0; i < 2; i++) {
    cursorParticles.push({
      x: event.clientX,
      y: event.clientY,
      size: Math.random() * 8 + 4,
      life: 1.0, 
      velocityX: (Math.random() - 0.5) * 2, 
      velocityY: (Math.random() - 0.5) * 2 - 1 
    });
  }
});

// --- BACK BUTTON HOVER ANIMATION ---
backButton.addEventListener('mouseenter', () => {
  gsap.to(backButton, { y: -8, duration: 0.4, ease: "back.out(2)" });
});

backButton.addEventListener('mouseleave', () => {
  gsap.to(backButton, { y: 0, duration: 0.4, ease: "power2.out" });
});

// --- REVERT AFTER EFFECTS TRANSITION (PLAY BUTTON) ---
playButton.addEventListener('click', () => {
  
  // Optional: Play a sound effect when they click play!
  if (!isAudioMuted) sfx.whoosh.play();

  // 1. Instantly hide the play button and grey overlay
  gsap.to([playButton, greyOverlay], { opacity: 0, duration: 0.2 });

  // 2. Slide the AE UI back down off the screen
  gsap.to(aeImageOverlay, {
    yPercent: 100, 
    duration: 1.5,
    ease: "power3.inOut"
  });

  // 3. Expand the screenshot back to full screen
  gsap.to(screenshotContainer, {
    scale: 1,   // Back to 100% size
    x: "0%",    // Centered
    y: "0%",    // Centered
    duration: 1.5,
    ease: "power3.inOut",
    onComplete: () => {
      
      // 4. THE SWITCH: Hide the 2D fake layers to reveal the 3D canvas underneath!
      gsap.set([blackBgLayer, screenshotContainer], { opacity: 0 });
      
      // Reset the play button and grey overlay so they are ready for the next time
      gsap.set([playButton, greyOverlay], { opacity: 1 });

      // 5. Unfreeze the 3D Camera!
      isBreathingPaused = false;

      // 6. Unlock the scene so the user can interact with objects again
      raycasterObjects.forEach(obj => obj.userData.isTransitioning = false);
      if (door) door.userData.isAnimating = false;

      // 7. Bring back the main UI buttons
      gsap.to(audioToggleBtn, { opacity: 1, duration: 0.5 });
      // (Only bring back the back button if you want it visible from the main view)
      // gsap.to(backButton, { opacity: 1, duration: 0.5 }); 
    }
  });
});

// --- BACK BUTTON CLICK (ZOOM OUT LOGIC) ---
backButton.addEventListener('click', () => {
  // 1. Prevent spam clicking
  if (door.userData.isAnimating) return;
  door.userData.isAnimating = true;

  // 2. Button "Press" Animation
  gsap.to(backButton, {
    scale: 0.85, duration: 0.1, yoyo: true, repeat: 1,
    onComplete: () => {
      
      // 3. Fade out the back button and disable clicks on it
      gsap.to(backButton, { opacity: 0, duration: 0.3, onComplete: () => { backButton.style.pointerEvents = 'none'; } });

      // 4. Swing the door shut
      door.userData.isOpen = false;

      sfx.door_closing.play();
      // 5. ZOOM OUT: Return camera to default
      gsap.to(basePosition, {
        x: defaultBasePosition.x, y: defaultBasePosition.y, z: defaultBasePosition.z,
        duration: 1.5, ease: "power2.inOut", overwrite: true
      });

      gsap.to(cameraLookTarget, {
        x: defaultLookTarget.x, y: defaultLookTarget.y, z: defaultLookTarget.z,
        duration: 1.5, ease: "power2.inOut", overwrite: true,
        onComplete: () => { door.userData.isAnimating = false; } 
      });
    }
  });
});

// --- MOBILE TOUCH INITIALIZATION ---
window.addEventListener('touchstart', (event)=>{
  pointer.x = (event.touches[0].clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.touches[0].clientY / sizes.height) * 2 + 1;
}, {passive: false});

// --- 3D RAYCASTER LOGIC (ZOOM IN LOGIC) ---
function handleRaycasterInteraction() {
  if (currentIntersects.length > 0) {
    const object = currentIntersects[0].object;
    
    // --- DOOR LOGIC ---
    if (object.name.includes("door_Third")) {
      
      // 1. THE LOCK: If animating OR already open, ignore the click!
      // This forces them to use the Back Button to close it.
      if (object.userData.isAnimating || object.userData.isOpen) return;

      object.userData.isAnimating = true;
      object.userData.isOpen = true; // Force it to open state
      
      // Hide the highlight box
      if (object.userData.boundingBox) {
         object.userData.boundingBox.visible = false;
      }
      sfx.door_opening.play();
      // 2. THE GSAP ZOOM IN ANIMATION (Restored Original Offsets)
      const doorWorldPos = new THREE.Vector3();
      object.getWorldPosition(doorWorldPos);

      // Calculate a point halfway between the camera and the door to zoom to
      const zoomPos = defaultBasePosition.clone().lerp(doorWorldPos, 0.5); 

      sfx.whoosh.play();
      // Glide the camera forward
      gsap.to(basePosition, {
        x: zoomPos.x,
        y: zoomPos.y + 0.5, // RESTORED: Lift the camera slightly
        z: zoomPos.z,
        duration: 1.5,
        ease: "power2.inOut",
        overwrite: true
      });

      // Pan the camera to stare directly at the door
      gsap.to(cameraLookTarget, {
        x: doorWorldPos.x - 0.5,
        y: doorWorldPos.y + 0.8, // RESTORED: Look at the middle/top of the door
        z: doorWorldPos.z,
        duration: 1.5,
        ease: "power2.inOut",
        overwrite: true,
        onComplete: () => { object.userData.isAnimating = false; }
      });

      // 3. SHOW THE BACK BUTTON
      gsap.to(backButton, {
        opacity: 1,
        duration: 0.5,
        delay: 1.0, // Wait until the camera zoom is almost finished
        onStart: () => { backButton.style.pointerEvents = 'auto'; }
      });
    }
    if (object.name.includes("door_emit_target_raycaster")) {
      
      // 1. The Ultimate Lock: If we are already transitioning, ignore all clicks
      if (object.userData.isTransitioning) return;
      object.userData.isTransitioning = true;
      
      // Also lock the door so the user can't click the back button or door anymore!
      door.userData.isAnimating = true; 

      // 2. Hide the cursor target box if you have one
      if (object.userData.boundingBox) {
         object.userData.boundingBox.visible = false;
      }

      // 3. Find exactly where the glowing plane is
      const planePos = new THREE.Vector3();
      object.getWorldPosition(planePos);

      // Calculate a point just in front of the plane (90% of the way there)
      const walkThroughPos = basePosition.clone().lerp(planePos, 0.90); 
      walkThroughPos.y = basePosition.y; // Keep the camera perfectly level!

      sfx.whoosh.play();
      // 4. THE CAMERA SPRINT
      gsap.to(basePosition, {
        x: walkThroughPos.x,
        y: walkThroughPos.y,
        z: walkThroughPos.z,
        duration: 2.0,
        ease: "power2.in", // 'power2.in' makes it start slow and accelerate!
        overwrite: true
      });

      // 5. THE WHITE FADE & REDIRECT
      gsap.to(whiteOverlay, {
        opacity: 1,          // Fade to pure white
        duration: 1.5,       // Take 1.5 seconds to fade
        delay: 0.5,          // Wait 0.5 seconds before the fade starts so we see the camera move first
        ease: "power1.inOut",
        onStart: () => {
          // Hide the back button immediately so it doesn't float over the white screen
          gsap.to(backButton, { opacity: 0, duration: 0.2 });
        },
        onComplete: () => {
          // 6. THE REDIRECT: Once the screen is 100% white, change the page!
          window.location.href = "https://www.youtube.com";
        }
      });
    }
    // --- LINKEDIN PAN RIGHT & FADE TO BLACK ---
    if (object.name.includes("Right_sign_Third_target_raycaster") || object.name.includes("Blender_text_emit_raycaster_target")) {
      
      // 1. Lock the scene so the user can't click anything else
      if (object.userData.isTransitioning) return;
      object.userData.isTransitioning = true;
      door.userData.isAnimating = true; 

      // 2. Hide the highlight box if it's currently showing
      if (object.userData.boundingBox) {
         object.userData.boundingBox.visible = false;
      }

      // 3. Play the whoosh sound effect
      if (!isAudioMuted) sfx.whoosh.play();

      // 4. THE CAMERA SLIDE (Pan Right)
      // We add +4.0 to the X axis to slide the camera physically to the right
      gsap.to(basePosition, {
        z: basePosition.z - 1.0, 
        duration: 1.0,
        ease: "power2.inOut",
        overwrite: true
      });

      // We also move the target so the camera doesn't rotate, it just slides
      gsap.to(cameraLookTarget, {
        z: cameraLookTarget.z - 1.0, 
        duration: 1.0,
        ease: "power2.inOut",
        overwrite: true
      });

      // 5. THE BLACK FADE & REDIRECT
      gsap.to(blackOverlay, {
        opacity: 1,
        duration: 1.0,       // Takes 1 second to fade to black
        ease: "power2.inOut",
        onStart: () => {
          // Hide the UI buttons so they don't float over the black screen
          gsap.to(backButton, { opacity: 0, duration: 0.2 });
          gsap.to(audioToggleBtn, { opacity: 0, duration: 0.2 });
        },
        onComplete: () => {
          // 6. REDIRECT: Once the screen is pitch black, load LinkedIn!
          window.location.href = "https://www.linkedin.com";
        }
      });
    }
    // --- AFTER EFFECTS TRANSITION (LEFT SIGN) ---
    if (object.name.includes("Left_sign_Third_target_raycaster") || object.name.includes("AE_text_emit_raycaster_target")) {
      
      if (object.userData.isTransitioning) return;
      object.userData.isTransitioning = true;
      if (door) door.userData.isAnimating = true; 

      if (object.userData.boundingBox) object.userData.boundingBox.visible = false;
      if (!isAudioMuted) sfx.whoosh.play();

   // 1. Freeze the camera breathing
      isBreathingPaused = true;

      gsap.set([blackBgLayer, screenshotContainer], { opacity: 1 });

      // 2. Slide up the AE Image Overlay
      gsap.to(aeImageOverlay, {
        yPercent: 0,
        y: 0, // Slide to top
        duration: 1.5,
        ease: "power3.inOut",
        onStart: () => {
          gsap.to(backButton, { opacity: 0, duration: 0.2 });
          gsap.to(audioToggleBtn, { opacity: 0, duration: 0.2 });
        }
      });
      gsap.to(screenshotContainer, {
        scale: 0.5,   // Shrinks the image down to 45% of its size
        x: "10%",      // Shifts it slightly to the right
        y: "-13%",      // Shifts it slightly up
        duration: 1.5, // Match the duration of the UI sliding up
        ease: "power3.inOut" // Match the easing so they move completely in sync
      });
    }
    if (object.name.includes("window_inside"))
    {
      if (door.userData.isAnimating) return;
      window.location.href = "https://github.com/moisturizedpotato";
    }

  }
}

// --- CLICK BINDINGS ---
window.addEventListener('touchend', (event)=>{

  if (event.target === backButton || event.target === audioToggleBtn) return;
  event.preventDefault();
  handleRaycasterInteraction();
}, {passive: false}); 

window.addEventListener('click', handleRaycasterInteraction);
adjustCameraForScreen();

const textureLoader = new THREE.TextureLoader();
const { textureMap, loadedTextures } = createTextureLibrary(textureLoader);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader(loadingManager);
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

// --- GSAP ANIMATION LOGIC ---
const playSignHoverEnter = (group) => {
  group.meshes.forEach(mesh => {
    // 1. Scale up by 15% with a juicy bounce
    gsap.to(mesh.scale, {
      x: mesh.userData.baseScale.x * 1.35,
      y: mesh.userData.baseScale.y * 1.35,
      z: mesh.userData.baseScale.z * 1.35,
      duration: 0.5,
      ease: "back.out(1.7)" // The (1.7) controls how intense the bounce is!
    });

    // 2. Add a slight tilt on the Z-axis (adjust 'z' to 'y' or 'x' if they rotate weirdly)
    gsap.to(mesh.rotation, {
      z: mesh.userData.baseRotation.z + 0.15, 
      duration: 0.5,
      ease: "back.out(1.7)"
    });
  });
};

const playSignHoverLeave = (group) => {
  group.meshes.forEach(mesh => {
    // Revert to original transforms with a smooth, heavy elastic return
    gsap.to(mesh.scale, {
      x: mesh.userData.baseScale.x,
      y: mesh.userData.baseScale.y,
      z: mesh.userData.baseScale.z,
      duration: 0.4,
      ease: "power2.out" 
    });
    gsap.to(mesh.rotation, {
      z: mesh.userData.baseRotation.z,
      duration: 0.4,
      ease: "power2.out"
    });
  });
};

async function init() {
  const environmentPromise = loadEnvironment(scene, loadingManager);
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
    leftSignGroup,
    rightSignGroup,
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
      light.isFlickering = false;
      const noise = Math.sin((elapsedTime + light.offset) * 5) + Math.sin((elapsedTime + light.offset) * 8.5);

      if (noise < -1.98) {
        light.material.emissiveIntensity = 0;
        if (!light.isFlickering) {
          sfx.flicker.play();
          light.isFlickering = true;
        }
      } else {
        light.material.emissiveIntensity = light.baseIntensity * (0.8 + Math.random() * 0.2);
        light.isFlickering = false;
      }
    });

    updateCameraBreathing(elapsedTime, cameraLookTarget, isBreathingPaused, cameraLookTarget);

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

    githubBubble.style.opacity = '0';
    
    if (currentIntersects.length > 0) {
      const hoveredObj = currentIntersects[0].object;

      const hoveredName = hoveredObj.name;
      if (hoveredName !== lastHoveredObjectName) {
        if (hoveredName.includes("Flower_1")) sfx.flower1.play();
        else if (hoveredName.includes("Flower_2")) sfx.flower2.play();
        else if (hoveredName.includes("Flower_3")) sfx.flower3.play();
        else if (hoveredName.includes("wheel")) sfx.tyre.play();
        else if (hoveredName.includes("window_inside")) sfx.window.play();
        else if (hoveredName.includes("sign") || hoveredName.includes("text")) sfx.sign.play();

        lastHoveredObjectName = hoveredName; // Save it so it doesn't repeat!
      }
      if (hoveredObj.name.includes("wheel"))
      {
        interactableWheels.forEach(wheel => {
          wheel.userData.targetRotationY = wheel.userData.initialRotation.y + Math.PI / 6;
        });
      }
      if (hoveredObj.name.includes("Flower"))
      {
        hoveredObj.userData.targetIntensity = hoveredObj.userData.baseIntensity * 3.0;
      }
      if (hoveredObj.name.includes("door_Third"))
      {
        targetRotation = door.userData.isOpen ? door.userData.openRotation : door.userData.closedRotation;
      }
      
      // 4. If it's a target object AND it hasn't been clicked/opened yet... show the box!
      if (hoveredObj.name.toLowerCase().includes('target') && !hoveredObj.userData.isOpen) {
        if (hoveredObj.userData.boundingBox) {
          hoveredObj.userData.boundingBox.visible = true;
        }
      }
      if (hoveredObj.name.includes("sign") || hoveredObj.name.includes("text"))
      {
        // We hit one of the 4 meshes! Find out which group it belongs to
        const hitGroup = hoveredObj.userData.parentGroup;

        // Did we just enter a NEW group?
        if (currentlyHoveredSignGroup !== hitGroup) {
          // If we were hovering the other sign, tell it to reset first
          if (currentlyHoveredSignGroup) {
            playSignHoverLeave(currentlyHoveredSignGroup);
          }

          // Update our tracker and play the bounce!
          currentlyHoveredSignGroup = hitGroup;
          playSignHoverEnter(currentlyHoveredSignGroup);
        }
      } else {
        // The laser is hitting nothing. Did we just leave a sign?
        if (currentlyHoveredSignGroup) {
          playSignHoverLeave(currentlyHoveredSignGroup);
          currentlyHoveredSignGroup = null; // Reset the tracker
        }
      }
      if (hoveredObj.name.includes("window_inside")) {
        githubBubble.style.opacity = '1';

        const windowBox = new THREE.Box3().setFromObject(hoveredObj);
        const windowCenter = new THREE.Vector3();
        windowBox.getCenter(windowCenter);

        // 2. Magic Math: Project that 3D point onto the 2D camera screen
        windowCenter.project(camera);

        // 3. Convert the normalized screen coordinates (-1 to +1) into actual pixel coordinates
        const screenX = (windowCenter.x * 0.5 + 0.5) * sizes.width;
        // The Y axis is inverted in 2D HTML vs 3D WebGL!
        const screenY = -(windowCenter.y * 0.5 - 0.5) * sizes.height;

        // 4. Move the HTML bubble to those pixels
        // We subtract 20 from Y to make it float just a bit higher than the center
        githubBubble.style.transform = `translate(-50%, -100%) translate(${screenX - 100}px, ${screenY - 20}px)`;
      }
    }
    targetRotation = door.userData.isOpen ? door.userData.openRotation : door.userData.closedRotation;

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