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
const fontCache = new Map();

// Fonts are static example assets, not JavaScript modules. Keep them on the
// Three.js examples host so changing the font does not depend on esm.sh path
// rewriting or module resolution.
const fontBase = 'https://threejs.org/examples/fonts/';
const fontFiles = {
  helvetiker_regular: 'helvetiker_regular.typeface.json',
  helvetiker_bold: 'helvetiker_bold.typeface.json',
  optimer_regular: 'optimer_regular.typeface.json',
  gentilis_regular: 'gentilis_regular.typeface.json'
};

function setStatus(message, className = '') {
  const status = $('status');
  if (status) status.innerHTML = `<span class="${className}">${message}</span>`;
}

async function loadFont(style) {
  if (fontCache.has(style)) return fontCache.get(style);
  const file = fontFiles[style] || fontFiles.helvetiker_regular;
  setStatus(`Cargando tipografía…`, 'warn');
  try {
    const loaded = await new FontLoader().loadAsync(fontBase + file);
    fontCache.set(style, loaded);
    return loaded;
  } catch (err) {
    console.error('Error al cargar tipografía:', err);
    throw err;
  }
}

async function ensureFont() {
  const style = $('fontStyle').value;
  if (fontCache.has(style)) {
    font = fontCache.get(style);
    return true;
  }
  try {
    font = await loadFont(style);
    return true;
  } catch {
    setStatus('✕ No se pudo cargar la tipografía 3D. Revisá la conexión y recargá la página.', 'bad');
    return false;
  }
}

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
  const bevelEnabled = $('bevel').checked;
  const bevelSize = Math.max(0.1, +$('bevelSize').value || 1.2);
  const bevelSegments = Math.max(1, Math.min(6, +$('bevelSegments').value || 2));
  const curveSegments = Math.max(3, +$('curveSegments').value || 6);
  const safeBevel = Math.min(bevelSize, d / 2, h / 8);
  const geo = new TextGeometry(ch, {
    font,
    size: h,
    height: d,
    curveSegments,
    bevelEnabled,
    bevelThickness: safeBevel,
    bevelSize: safeBevel,
    bevelOffset: 0,
    bevelSegments
  });
  geo.computeBoundingBox();
  return geo;
}

function createMaterial() {
  return new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 });
}

function splitMeshByX(mesh, usableX) {
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

async function build() {
  const ok = await ensureFont();
  if (!ok) return;

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
  const all = [];

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

  all.forEach(mesh => {
    if (mesh.userData.width <= usable.x + 0.001) {
      group.add(mesh);
      currentObjects.push(mesh);
      return;
    }
    const parts = splitMeshByX(mesh, usable.x);
    if (!parts.length) {
      setStatus(`✕ No se pudo cortar físicamente la letra (${mesh.userData.char}).`, 'bad');
      return;
    }
    parts.forEach(part => {
      group.add(part);
      currentObjects.push(part);
    });
  });

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
    if (splitParts.length) setStatus(`✓ La letra (${oversizedLetter.userData.char}) fue cortada físicamente en ${splitParts.length} piezas de hasta ${usable.x.toFixed(1)} mm.`, 'ok');
    else setStatus(`✕ No se pudo cortar físicamente la letra (${oversizedLetter.userData.char}).`, 'bad');
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
  list.innerHTML = plannedPieces.map(p => `<div class="piece"><b>Pieza ${p.number}</b><span>${p.objects.map(o => o.userData.char).join('')} · ${p.width.toFixed(1)} mm</span></div>`).join('');
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
['printer', 'margin', 'cx', 'cy', 'cz', 'text', 'height', 'depth', 'spacing', 'curveSegments', 'bevelSize', 'bevelSegments'].forEach(id => {
  $(id).addEventListener('input', () => {
    if (id === 'printer') $('customFields').hidden = $('printer').value !== 'custom';
    if (id === 'bevelSize' || id === 'bevelSegments') $('bevel').checked = true;
    build();
  });
});
$('printer').onchange = () => {
  $('customFields').hidden = $('printer').value !== 'custom';
  build();
};
$('fontStyle').onchange = build;
$('bevel').onchange = () => {
  $('bevelFields').hidden = !$('bevel').checked;
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
  exportObjects(currentObjects, 'gemelos3d-proyecto02.stl');
};

$('downloadPieces').onclick = () => {
  if (!plannedPieces.length) return;
  plannedPieces.forEach((p, i) => setTimeout(() => exportObjects(p.objects, `gemelos3d-pieza-${String(i + 1).padStart(2, '0')}.stl`), i * 250));
};

$('project').onclick = () => {
  const data = {
    app: 'Gemelos 3D',
    project: 'Proyecto 02',
    printer: $('printer').value,
    custom: { x: $('cx').value, y: $('cy').value, z: $('cz').value },
    margin: +$('margin').value,
    text: $('text').value,
    fontStyle: $('fontStyle').value,
    height: +$('height').value,
    depth: +$('depth').value,
    spacing: +$('spacing').value,
    curveSegments: +$('curveSegments').value,
    bevel: $('bevel').checked,
    bevelSize: +$('bevelSize').value,
    bevelSegments: +$('bevelSegments').value,
    pieces: plannedPieces.map(p => ({ number: p.number, width: p.width, text: p.objects.map(o => o.userData.char).join('') }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gemelos3d-proyecto02.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

ensureFont().then(build);