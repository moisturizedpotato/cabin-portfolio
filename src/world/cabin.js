import * as THREE from 'three';

const textureMap = {
  First: '/textures/bakeone.webp',
  Second: '/textures/baketwo.webp',
  Third: '/textures/bakethreev2.webp',
};

export function createTextureLibrary(textureLoader) {
  const loadedTextures = {};

  Object.entries(textureMap).forEach(([key, value]) => {
    const texture = textureLoader.load(value);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    loadedTextures[key] = texture;
  });

  return {
    textureMap,
    loadedTextures,
  };
}

export function loadCabin({ scene, gltfLoader, textureMap, loadedTextures, raycasterObjects, 
    interactableWheels, flickeringLights, interactableFlowers, bloomLayer, door, 
    highlightBoxes, leftSignGroup, rightSignGroup, BLOOM_SCENE }) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      '/models/cabin-v4.glb',
      (glb) => {
        let lantern = null;

        glb.scene.traverse((child) => {
          if (!child.isMesh) {
            return;
          }

          if (child.name.includes('raycaster')) {
            raycasterObjects.push(child);
          }

          let matchedKey = null;
          Object.keys(textureMap).forEach((key) => {
            if (child.name.includes(key)) matchedKey = key;
          });

          const textureToUse = matchedKey ? loadedTextures[matchedKey] : null;

        if (child.name.toLowerCase().includes('emit')) {
            let emissiveColor = 0x996600;
            let emissiveIntensity = 1.0;

            if (child.name.includes('lantern')) {
              emissiveColor = 0xfcba03;
              emissiveIntensity = 0.5;
            } else if (child.name.includes('Flower') && (child.name.includes('_3') || child.name.includes('_2'))) {
              emissiveColor = 0x0b68a1;
              emissiveIntensity = 1.5;
            } else if (child.name.includes('Flower')) {
              emissiveColor = 0xff5050;
              emissiveIntensity = 1.5;
            } else if (child.name.includes('headlights')) {
              emissiveColor = 0xffffff;
              emissiveIntensity = 2.0;
            }

            child.material = new THREE.MeshStandardMaterial({
              map: textureToUse,
              emissive: emissiveColor,
              emissiveIntensity,
            });
            child.layers.enable(BLOOM_SCENE);

            if (child.name.includes('Flower')) {
              interactableFlowers.push(child);
            
              // Remember its normal brightness
              child.userData.baseIntensity = emissiveIntensity;
            
              // Set its target brightness (where it should be right now)
              child.userData.targetIntensity = emissiveIntensity;
            }
            if (child.name.includes('lantern') || child.name.includes('headlights')) {
              flickeringLights.push({
                material: child.material,
                baseIntensity: emissiveIntensity,
                offset: Math.random() * 100,
              });
            }
        } else if (matchedKey) {
            if (child.geometry.attributes.uv1) {
              child.geometry.attributes.uv = child.geometry.attributes.uv1;
            }

            child.material = new THREE.MeshBasicMaterial({
              map: textureToUse,
              transparent: true,
              alphaTest: 0.5,
            });

            if (child.material.map) {
              child.material.map.minFilter = THREE.LinearFilter;
            }
          }

          if (child.name.includes('hanging')) {
            lantern = child;
            child.userData.isLantern = true;
          }
          if (child.name.includes('wheel')) {
            interactableWheels.push(child);

            child.userData.initialRotation = child.rotation.clone();
            child.userData.targetRotationY = child.rotation.y;
          }
          if (child.name.includes('door_Third'))
          {
            door = child;
            door.userData.closedRotation = door.rotation.y;
            door.userData.openRotation = door.rotation.y - Math.PI / 2;
            door.userData.isOpen = false;
          }
          if (child.name.includes('target') && !child.name.includes('text'))
          {
            // 1. Create a bright yellow bounding box around the object
            const boxHelper = new THREE.BoxHelper(child, 0xffff00);

            // 2. Hide it by default
            boxHelper.visible = false; 

            // 3. Add to scene and tracking array
            scene.add(boxHelper);
            highlightBoxes.push(boxHelper);

            // 4. Give the actual mesh a direct reference to its own box!
            child.userData.boundingBox = boxHelper;

            child.userData.isOpen = false;
          }
          const nameLower = child.name.toLowerCase();

            // --- ADD THIS BLOCK FOR THE SIGNS ---
            const isLeftSign = nameLower.includes('left_sign_third') || nameLower.includes('ae_text_emit');
            const isRightSign = nameLower.includes('right_sign_third') || nameLower.includes('blender_text_emit');

            if (isLeftSign || isRightSign) {
              // 1. Save their original transforms perfectly
              child.userData.baseScale = child.scale.clone();
              child.userData.baseRotation = child.rotation.clone();
            
              // 2. Assign the mesh to the correct group
              const targetGroup = isLeftSign ? leftSignGroup : rightSignGroup;
              targetGroup.meshes.push(child);
            
              // 3. Give the mesh a backwards link to the group so the Raycaster can find it
              child.userData.parentGroup = targetGroup;
            
            }
        });

        scene.add(glb.scene);

        const transformTargets = [
          'wood_pole',
          'Left_sign_Third_target_raycaster',
          'Right_sign_Third_target_raycaster',
          'AE_text_emit_raycaster_target',
          'Blender_text_emit_raycaster_target',
        ];

        transformTargets.forEach((name) => {
          const target = scene.getObjectByName(name);
          if (!target) return;

          const zOffset = name === 'Right_sign_Third_target_raycaster' || name === 'Blender_text_emit_raycaster_target'
            ? -0.05
            : 0.05;

          target.translateZ(zOffset);

          if (window.innerWidth < 768) {
            if (name === 'wood_pole' || name === 'AE_text_emit_raycaster_target' || name === 'Left_sign_Third_target_raycaster') {
              target.translateY(0.5);
              
            }

            if (name === 'Right_sign_Third_target_raycaster' || name === 'Blender_text_emit_raycaster_target') {
              target.translateY(-0.5);
            }
          }
        });

        resolve({ glb, lantern, raycasterObjects, flickeringLights, door });
      },
      undefined,
      reject,
    );
  });
}
