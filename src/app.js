import * as THREE from 'https://esm.sh/three@0.161.0';
import { FontLoader } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://esm.sh/three@0.161.0/examples/jsm/geometries/TextGeometry.js';
import { STLExporter } from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';
import { Brush, Evaluator, INTERSECTION } from 'https://esm.sh/three-bvh-csg@0.0.18?deps=three@0.161.0,three-mesh-bvh@0.9.7';

const $ = id => document.getElementById(id);
const viewer = $('viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101216);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewer.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff, 0x30343d, 2));
const dl = new THREE.DirectionalLight(0xffffff, 2);
dl.position.set(100, 180, 120);
scene.add(dl);
const grid = new THREE.GridHelper(600, 30, 0x333740, 0x22262d);
grid.rotation.x = Math.PI / 2;
scene.add(grid);

let group = new THREE.Group();
scene.add(group);
let font = null;
let currentObjects = [];
let plannedPieces = [];

function setStatus(message, className = '') {
  const status = $('status');
  if (status) status.innerHTML = `<span class="${className}">${message}</span>`;
}

new FontLoader().load(
  'https://esm.sh/three@0.161.0/examples/fonts/helvetiker_regular.typeface.json',
  f => { font = f; build(); },
  undefined,
  err => setStatus('✕ No se pudo cargar la fuente 3D. Revisá la conexión y recargá la página.', 'bad')
);

function dims() {
  if ($('printer').value === 'custom') return {
    x: Math.max(1, +$('cx').value || 1),
    y: Math.max(1, +$('cy').value || 1),
    z: Math.max(1, +$('cz').value || 1)
  };
  const [x, y, z] = $('printer').value.split(',').map(Number);
  return { x, y, z };
}

function makeGeometry(ch, h, d) {
  const geo = new TextGeometry(ch, {
    font,
    size: h,
    height: d,
    curveSegments: 6,
    bevelEnabled: false
  });
  geo.computeBoundingBox();
  return geo;
}

function createMaterial() {
  return new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 });
}

function splitMeshByX(mesh, usableX, totalStartX, totalEndX) {
  const box = new THREE.Box3().setFromObject(mesh);
  const width = box.max.x - box.min.x;
  if (width <= usableX + 0.001) return [mesh];

  const parts = [];
  const evaluator = new Evaluator();
  const original = new Brush(mesh.geometry.clone(), createMaterial());
  original.position.copy(mesh.position);
  original.rotation.copy(mesh.rotation);
  original.scale.copy(mesh.scale);
  original.updateMatrixWorld(true);

  const start = box.min.x;
  const count = Math.ceil(width / usableX);
  for (let i = 0; i < count; i++) {
    const x0 = start + i * usableX;
    const x1 = Math.min(start + (i + 1) * usableX, box.max.x);
    const slabWidth = Math.max(0.001, x1 - x0);
    const cutter = new Brush(new THREE.BoxGeometry(slabWidth, box.max.y - box.min.y + 2, box.max.z - box.min.z + 2), createMaterial());
    cutter.position.set((x0 + x1) / 2, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2);
    cutter.updateMatrixWorld(true);

    try {
      const result = evaluator.evaluate(original, cutter, INTERSECTION);
      result.geometry.computeBoundingBox();
      const resultBox = result.geometry.boundingBox;
      if (resultBox && resultBox.max.x - resultBox.min.x > 0.01) {
        result.material = createMaterial();
        result.position.set(0, 0, 0);
        result.rotation.set(0, 0, 0);
        result.scale.set(1, 1, 1);
        result.updateMatrixWorld(true);
        result.userData = {
          ...mesh.userData,
          split: true,
          splitIndex: i + 1,
          splitCount: count,
          splitMinX: x0,
          splitMaxX: x1
        };
        parts.push(result);
      }
    } catch (error) {
      console.error('Error al cortar letra:', error);
      return [];
    }
  }

  return parts;
}

function build() {
  if (!font) return;
  group.clear();
  currentObjects = [];
  plannedPieces = [];

  const text = $('text').value || 'GEMELOS 3D';
  const h = Math.max(1, +$('height').value || 60);
  const d = Math.max(0.8, +$('depth').value || 12);
  const gap = Math.max(0, +$('spacing').value || 4);
  const bed = dims();
  const margin = Math.max(0, +$('margin').value || 0);
  const usable = {
    x: Math.max(1, bed.x - 2 * margin),
    y: Math.max(1, bed.y - 2 * margin),
    z: Math.max(1, bed.z - 2 * margin)
  };

  let cursor = 0;
  let maxH = 0;
  let all = [];

  [...text].forEach((ch, index) => {
    if (ch === ' ') {
      cursor += h * 0.45 + gap;
      return;
    }
    const geo = makeGeometry(ch, h, d);
    const box = geo.boundingBox;
    const w = box.max.x - box.min.x;
    const mesh = new THREE.Mesh(geo, createMaterial());
    mesh.position.x = cursor;
    mesh.userData = { char: ch, index, width: w, startX: cursor };
    all.push(mesh);
    cursor += w + gap;
    maxH = Math.max(maxH, box.max.y - box.min.y);
  });

  const totalX = Math.max(0, cursor - gap);
  const totalY = d;
  const totalZ = maxH;
  const fits = totalX <= usable.x && totalY <= usable.y && totalZ <= usable.z;

  // Convert every letter into printable geometry. Oversized letters are cut
  // physically with CSG intersections against X slabs that fit the printer.
  all.forEach(mesh => {
    const width = mesh.userData.width;
    if (width <= usable.x + 0.001) {
      group.add(mesh);
      currentObjects.push(mesh);
      return;
    }

    const parts = splitMeshByX(mesh, usable.x, mesh.userData.startX, mesh.userData.startX + width);
    if (!parts.length) {
      setStatus(`✕ No se pudo cortar físicamente la letra (${mesh.userData.char}).`, 'bad');
      return;
    }
    parts.forEach(part => {
      group.add(part);
      currentObjects.push(part);
    });
  });

  // Plan printable groups. A physically split letter is already a piece; the
  // normal case groups complete letters into bed-sized files.
  let piece = [];
  let pieceWidth = 0;
  let pieceNumber = 1;
  all.forEach(mesh => {
    const w = mesh.userData.width;
    if (w > usable.x + 0.001) {
      const splitCount = Math.ceil(w / usable.x);
      for (let i = 1; i <= splitCount; i++) {
        const part = currentObjects.find(o => o.userData.index === mesh.userData.index && o.userData.splitIndex === i);
        if (part) plannedPieces.push({ number: pieceNumber++, objects: [part], width: usable.x });
      }
      return;
    }
    const next = piece.length ? pieceWidth + gap + w : w;
    if (piece.length && next > usable.x) {
      plannedPieces.push({ number: pieceNumber++, objects: piece, width: pieceWidth });
      piece = [];
      pieceWidth = 0;
    }
    piece.push(mesh);
    pieceWidth = piece.length === 1 ? w : pieceWidth + gap + w;
  });
  if (piece.length) plannedPieces.push({ number: pieceNumber, objects: piece, width: pieceWidth });

  const oversizedLetter = all.find(m => m.userData.width > usable.x);

  $('sx').textContent = totalX.toFixed(1);
  $('sy').textContent = totalY.toFixed(1);
  $('sz').textContent = totalZ.toFixed(1);
  $('pieces').textContent = fits ? '1' : plannedPieces.length;

  if (oversizedLetter) {
    const splitParts = currentObjects.filter(o => o.userData.index === oversizedLetter.userData.index && o.userData.split);
    if (splitParts.length) {
      setStatus(`✓ La letra (${oversizedLetter.userData.char}) fue cortada físicamente en ${splitParts.length} piezas de hasta ${usable.x.toFixed(1)} mm.`, 'ok');
    } else {
      setStatus(`✕ No se pudo cortar físicamente la letra (${oversizedLetter.userData.char}).`, 'bad');
    }
  } else if (fits) {
    setStatus(`✓ Modelo listo: entra en la cama útil (${usable.x} × ${usable.y} × ${usable.z} mm).`, 'ok');
  } else {
    setStatus(`⚠ Modelo dividido en ${plannedPieces.length} archivos imprimibles por grupos de letras. Cada pieza respeta X=${usable.x.toFixed(1)} mm.`, 'warn');
  }

  group.position.set(-totalX / 2, -totalZ / 2, 0);
  grid.position.set(0, 0, -d / 2 - 1);
  fitCamera(totalX, totalZ, d);
  renderPieceList();
}

function renderPieceList() {
  const list = $('pieceList');
  if (!list) return;
  list.innerHTML = plannedPieces.map(p =>
    `<div class="piece"><b>Pieza ${p.number}</b><span>${p.objects.map(o => o.userData.char).join('')} · ${p.width.toFixed(1)} mm</span></div>`
  ).join('');
}

function fitCamera(x, z, y) {
  const r = Math.max(x, z, y) * 1.25;
  camera.position.set(r * 0.9, r * 0.75, r * 1.1);
  camera.lookAt(0, 0, 0);
}

function resize() {
  const w = viewer.clientWidth;
  const h = viewer.clientHeight || 600;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  group.rotation.z = Math.sin(Date.now() / 5000) * 0.02;
  renderer.render(scene, camera);
}
animate();

$('build').onclick = build;
['printer', 'margin', 'cx', 'cy', 'cz', 'text', 'height', 'depth', 'spacing'].forEach(id => {
  $(id).addEventListener('input', () => {
    if (id === 'printer') $('customFields').hidden = $('printer').value !== 'custom';
    build();
  });
});
$('printer').onchange = () => {
  $('customFields').hidden = $('printer').value !== 'custom';
  build();
};

function exportObjects(objects, filename) {
  const exporter = new STLExporter();
  const root = new THREE.Group();
  objects.forEach(o => root.add(o.clone()));
  const stl = exporter.parse(root);
  const blob = new Blob([stl], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('download').onclick = () => {
  if (!currentObjects.length) return;
  exportObjects(currentObjects, 'gemelos3d-proyecto01.stl');
};

$('downloadPieces').onclick = () => {
  if (!plannedPieces.length) return;
  plannedPieces.forEach((p, i) => {
    setTimeout(() => exportObjects(p.objects, `gemelos3d-pieza-${String(i + 1).padStart(2, '0')}.stl`), i * 250);
  });
};

$('project').onclick = () => {
  const data = {
    app: 'Gemelos 3D',
    project: 'Proyecto 01',
    printer: $('printer').value,
    custom: { x: $('cx').value, y: $('cy').value, z: $('cz').value },
    margin: +$('margin').value,
    text: $('text').value,
    height: +$('height').value,
    depth: +$('depth').value,
    spacing: +$('spacing').value,
    pieces: plannedPieces.map(p => ({ number: p.number, width: p.width, text: p.objects.map(o => o.userData.char).join('') }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gemelos3d-proyecto01.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
