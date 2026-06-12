import * as THREE from 'three';

export function createCamera(sizes) {
  const camera = new THREE.PerspectiveCamera(40, sizes.width / sizes.height, 0.1, 1000);
  camera.setFocalLength(35);
  camera.lookAt(0, 0, 0);
  camera.position.set(11.219791287579758, 0.305711364170281, -0.034319656950226644);

  const basePosition = camera.position.clone();

  function adjustCameraForScreen() {
    camera.setFocalLength(sizes.width < 768 ? 30 : 35);
  }

  function updateCameraBreathing(elapsedTime, target, isBreathingPaused, cameraLookTarget) {
    const breathSpeed = 1.5;
    const verticalAmplitude = 0.01;
    const swayAmplitude = 0.012;

    if (isBreathingPaused) {
    camera.lookAt(cameraLookTarget);
    return; 
    }

    camera.position.y = basePosition.y + Math.sin(elapsedTime * breathSpeed) * verticalAmplitude;
    camera.position.x = basePosition.x + Math.cos(elapsedTime * (breathSpeed * 0.5)) * swayAmplitude;
    camera.position.z = basePosition.z;
    camera.lookAt(target);
  }

  return {
    camera,
    basePosition,
    adjustCameraForScreen,
    updateCameraBreathing,
  };
}

export function resizeCamera(camera, sizes) {
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
}
