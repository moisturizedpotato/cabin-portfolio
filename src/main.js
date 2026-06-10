import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.scss'

const canvas = document.querySelector('#experience-canvas');

const sizes ={
  height: window.innerHeight,
  width: window.innerWidth
};

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

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

gltfLoader.load("/models/cabin-v4.glb", (glb) =>{
  glb.scene.traverse((child) => {
    if (child.isMesh) {
      console.log(child.geometry.attributes);
      Object.keys(textureMap).forEach((key) => {
        if (child.name.includes(key)) {
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
exrLoader.load('/images/night_sky.exr', function (texture) {
    
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
});

const render = () => {
  //console.log(camera.position);
  //console.log("0000000");
  //console.log(controls.target);
  controls.update();

  renderer.render( scene, camera );
  window.requestAnimationFrame( render );

};

render();