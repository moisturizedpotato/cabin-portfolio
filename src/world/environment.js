import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

export function loadEnvironment(scene) {
  const exrLoader = new EXRLoader();
  exrLoader.setDataType(THREE.HalfFloatType);

  return new Promise((resolve, reject) => {
    exrLoader.load(
      '/images/night_sky-v2.exr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        scene.background = texture;
        scene.environment = texture;
        scene.backgroundIntensity = 1;
        scene.backgroundRotation.y = Math.PI / 32;
        scene.backgroundRotation.z = Math.PI / 16 + Math.PI / 32;

        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}
