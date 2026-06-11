import * as THREE from 'three';

export function createFireflies(scene, bloomLayerIndex, count = 75) {
  const positionArray = new Float32Array(count * 3);
  const phaseArray = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positionArray[i * 3 + 0] = (Math.random() - 0.5) * 15;
    positionArray[i * 3 + 1] = (Math.random() * Math.random() * Math.random()) * 5;
    positionArray[i * 3 + 2] = (Math.random() - 0.5) * 15;
    phaseArray[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phaseArray, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x00ff00) },
    },
    vertexShader: `
      uniform float uTime;
      attribute float aPhase;
      varying float vAlpha;
      void main() {
        vAlpha = (sin(uTime * 1.5 + aPhase) + 1.0) * 0.5;
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = 80.0 * vAlpha * (1.0 / -viewPosition.z);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 border = min(gl_PointCoord, 1.0 - gl_PointCoord);
        float edgeGlow = min(border.x, border.y) * 4.0;
        gl_FragColor = vec4(uColor, vAlpha * edgeGlow);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const fireflies = new THREE.Points(geometry, material);
  fireflies.layers.enable(bloomLayerIndex);
  scene.add(fireflies);

  function update(elapsedTime) {
    material.uniforms.uTime.value = elapsedTime;
  }

  return {
    fireflies,
    firefliesMaterial: material,
    update,
  };
}
