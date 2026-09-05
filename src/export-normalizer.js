import * as THREE from 'https://esm.sh/three@0.161.0';
import { STLExporter } from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';

const originalParse = STLExporter.prototype.parse;

STLExporter.prototype.parse = function (scene, ...args) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);

  if (!box.isEmpty()) {
    scene.position.x -= box.min.x;
    scene.position.y -= box.min.y;
    scene.position.z -= box.min.z;
    scene.updateMatrixWorld(true);
  }

  return originalParse.call(this, scene, ...args);
};
