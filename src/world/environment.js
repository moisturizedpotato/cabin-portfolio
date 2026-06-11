import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

export function loadEnvironment(scene, manager) {
  const textureLoader = new THREE.TextureLoader();
  const previewTexture = textureLoader.load('/images/night_sky-v3.png');
  previewTexture.mapping = THREE.EquirectangularReflectionMapping;
  previewTexture.colorSpace = THREE.SRGBColorSpace;

  scene.environment = previewTexture;
  scene.background = previewTexture;
  scene.backgroundIntensity = 0.4;

  const exrLoader = new EXRLoader(manager);
  exrLoader.setDataType(THREE.HalfFloatType);

  exrLoader.load(
    '/images/night_sky-v2.exr',
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.background = texture;
      scene.backgroundIntensity = 1;
      scene.backgroundRotation.y = Math.PI / 32;
      scene.backgroundRotation.z = Math.PI / 16 + Math.PI / 32;
    },
    undefined,
    (error) => {
      console.warn('EXR environment load failed, using preview texture instead.', error);
    },
  );

  return Promise.resolve(previewTexture);
}
