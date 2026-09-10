import * as THREE from 'https://esm.sh/three@0.161.0';
import { FontLoader } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';
import polygonClipping from 'https://esm.sh/polygon-clipping@0.15.7?bundle';

const $ = id => document.getElementById(id);
const viewer = $('viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d11);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewer.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.screenSpacePanning = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x30343d, 2));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(120, 180, 180);
scene.add(sun);
const bedLayer = new THREE.Group();
const objectLayer = new THREE.Group();
scene.add(bedLayer, objectLayer);

const FONT = {
  helvetiker_regular: 'helvetiker_regular.typeface.json',
  helvetiker_bold: 'helvetiker_bold.typeface.json',
  optimer_regular: 'optimer_regular.typeface.json',
  gentilis_regular: 'gentilis_regular.typeface.json'
};
const fontCache = new Map();
let font = null;
let items = [];
let plates = [];
let activeBed = 0;

const num = (id, fallback) => {
  const v = Number($(id)?.value);
  return Number.isFinite(v) ? v : fallback;
};

function status(text, cls = '') {
  if ($('status')) $('status').innerHTML = `<span class="${cls}">${text}</span>`;
}

function printer() {
  if ($('printer').value === 'custom') {
    return { x: Math.max(1, num('cx', 200)), y: Math.max(1, num('cy', 200)), z: Math.max(1, num('cz', 200)) };
  }
  const [x, y, z] = $('printer').value.split(',').map(Number);
  return { x, y, z };
}

function purge() {
  if ($('purgeMode').value === 'none') return { x: 0, y: 0 };
  return { x: Math.max(0, num('purgeX', 40)), y: Math.max(0, num('purgeY', 40)) };
}

function bed() {
  const full = printer();
  const margin = Math.max(0, num('margin', 5));
  const p = purge();
  return {
    full,
    margin,
    p,
    usable: {
      x: Math.max(1, full.x - margin * 2 - p.x),
      y: Math.max(1, full.y - margin * 2),
      z: Math.max(1, full.z - margin * 2)
    }
  };
}

function bevelSize() {
  if (!$('bevel')?.checked) return 0;
  const depth = Math.max(0.8, num('depth', 12));
  return Math.min(Math.max(0.1, num('bevelSize', 1.2)), depth / 2);
}

function line(points, color = 0x8f98a5, opacity = 1) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  );
}

function label(text, width = 170) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dfe4eb';
  ctx.font = '700 34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, 450, 72);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(width, 22, 1);
  return sprite;
}

function drawBed() {
  bedLayer.clear();
  const c = bed();
  const x = c.full.x;
  const y = c.full.y;
  const g = new THREE.Group();
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(x, y),
    new THREE.MeshBasicMaterial({ color: 0x151a21, transparent: true, opacity: 0.98, side: THREE.DoubleSide })
  );
  plane.position.z = -0.3;
  g.add(plane);
  const gs = Math.max(x, y);
  const grid = new THREE.GridHelper(gs, Math.max(10, Math.round(gs / 10)), 0x4b535f, 0x252b34);
  grid.rotation.x = Math.PI / 2;
  grid.scale.set(x / gs, y / gs, 1);
  grid.position.z = -0.08;
  g.add(grid);
  g.add(line([[-x / 2, -y / 2, 0.05], [x / 2, -y / 2, 0.05], [x / 2, y / 2, 0.05], [-x / 2, y / 2, 0.05], [-x / 2, -y / 2, 0.05]], 0xb7bec8));
  g.add(line([[-x / 2, 0, 0.07], [x / 2, 0, 0.07]], 0x555e6b, 0.55));
  g.add(line([[0, -y / 2, 0.07], [0, y / 2, 0.07]], 0x555e6b, 0.55));
  const origin = new THREE.Mesh(new THREE.CircleGeometry(2.8, 24), new THREE.MeshBasicMaterial({ color: 0xf5f7fa }));
  origin.position.set(-x / 2, -y / 2, 0.1);
  g.add(origin);
  const left = -x / 2 + c.margin + c.p.x;
  const bottom = -y / 2 + c.margin;
  const usable = new THREE.Mesh(
    new THREE.PlaneGeometry(c.usable.x, c.usable.y),
    new THREE.MeshBasicMaterial({ color: 0x1d2630, transparent: true, opacity: 0.48, side: THREE.DoubleSide })
  );
  usable.position.set(left + c.usable.x / 2, bottom + c.usable.y / 2, 0.01);
  g.add(usable);
  g.add(line([[left, bottom, 0.08], [left + c.usable.x, bottom, 0.08], [left + c.usable.x, bottom + c.usable.y, 0.08], [left, bottom + c.usable.y, 0.08], [left, bottom, 0.08]], 0x657180, 0.9));
  if (c.p.x) {
    const reserved = new THREE.Mesh(
      new THREE.PlaneGeometry(c.p.x, c.p.y),
      new THREE.MeshBasicMaterial({ color: 0x8b6f35, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
    );
    reserved.position.set(-x / 2 + c.margin + c.p.x / 2, bottom + c.p.y / 2, 0.03);
    g.add(reserved);
  }
  const l = label(`CAMA ${activeBed + 1} · ${x} × ${y} mm`);
  l.position.set(0, -y * 0.44, 0.12);
  g.add(l);
  bedLayer.add(g);
}

function info() {
  const c = bed();
  $('bedInfo').textContent = `Cama total: ${c.full.x} × ${c.full.y} × ${c.full.z} mm · Área útil: ${c.usable.x} × ${c.usable.y} mm · Z útil: ${c.usable.z} mm`;
  $('purgeInfo').textContent = c.p.x ? `Reserva lateral: ${c.p.x} × ${c.p.y} mm.` : 'Sin reserva de torre de purga.';
  $('guideHeight').textContent = `${Math.max(1, num('height', 60))} mm`;
  $('guideDepth').textContent = `${Math.max(0.8, num('depth', 12))} mm`;
  $('guideWidth').textContent = num('widthScale', 0) > 0 ? `${num('widthScale', 0)} mm` : 'Natural';
}

async function loadFont() {
  const key = $('fontStyle').value;
  if (fontCache.has(key)) {
    font = fontCache.get(key);
    return true;
  }
  try {
    font = await new FontLoader().loadAsync(`https://threejs.org/examples/fonts/${FONT[key]}`);
    fontCache.set(key, font);
    return true;
  } catch (e) {
    console.error(e);
    status('No se pudo cargar la tipografía.', 'bad');
    return false;
  }
}

function polygonFromShape(shape, segments) {
  const p = shape.extractPoints(segments);
  return [p.shape.map(v => [v.x, v.y]), ...p.holes.map(r => r.map(v => [v.x, v.y]))];
}

function bounds(polygons) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const polygon of polygons) for (const ring of polygon) for (const point of ring) {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function makeLayout(text, spacing, targetHeight, targetWidth) {
  const segments = Math.max(3, num('curveSegments', 6));
  let cursor = 0;
  const chars = [];
  for (const ch of text) {
    const polygons = font.generateShapes(ch, 1).map(s => polygonFromShape(s, segments));
    const b = bounds(polygons);
    const advance = Math.max(0.001, b.maxX - b.minX);
    chars.push({ ch, polygons, x: cursor, minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY });
    cursor += advance + spacing;
  }
  const raw = bounds(chars.map(c => c.polygons).flat());
  const naturalWidth = Math.max(0.001, raw.w + Math.max(0, cursor - (chars.length ? spacing : 0) - raw.maxX));
  const minX = Math.min(...chars.map(c => c.x + c.minX));
  const maxX = Math.max(...chars.map(c => c.x + c.maxX));
  const minY = Math.min(...chars.map(c => c.minY));
  const maxY = Math.max(...chars.map(c => c.maxY));
  const measuredWidth = Math.max(0.001, maxX - minX);
  const measuredHeight = Math.max(0.001, maxY - minY);
  const sy = targetHeight / measuredHeight;
  const sx = targetWidth > 0 ? targetWidth / measuredWidth : sy;
  return { chars, sx, sy, minX, minY, width: measuredWidth * sx, height: measuredHeight * sy };
}

function scaledPolygons(layout, char) {
  return char.polygons.map(polygon => polygon.map(ring => ring.map(point => [
    (point[0] + char.x - layout.minX) * layout.sx,
    (point[1] - layout.minY) * layout.sy
  ])));
}

function meshFromPolygon(polygon, depth) {
  if (!polygon?.[0] || polygon[0].length < 3) return null;
  const outer = polygon[0];
  const shape = new THREE.Shape();
  shape.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1]);
  shape.closePath();
  for (let i = 1; i < polygon.length; i++) {
    const ring = polygon[i];
    if (ring.length < 3) continue;
    const hole = new THREE.Path();
    hole.moveTo(ring[0][0], ring[0][1]);
    for (let j = 1; j < ring.length; j++) hole.lineTo(ring[j][0], ring[j][1]);
    hole.closePath();
    shape.holes.push(hole);
  }
  const z = Math.max(0.8, depth);
  const bevel = $('bevel').checked;
  const bs = Math.min(bevelSize(), z / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: z,
    curveSegments: Math.max(3, num('curveSegments', 6)),
    bevelEnabled: bevel && bs > 0,
    bevelSize: bs,
    bevelThickness: bs,
    bevelSegments: Math.max(1, num('bevelSegments', 2))
  });
  geometry.translate(0, 0, -z / 2);
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.04 }));
}

function makeFullWord(layout, depth) {
  const group = new THREE.Group();
  for (const char of layout.chars) {
    for (const polygon of scaledPolygons(layout, char)) {
      const mesh = meshFromPolygon(polygon, depth);
      if (mesh) group.add(mesh);
    }
  }
  group.userData.role = 'word';
  group.updateMatrixWorld(true);
  return group;
}

function makePhysicalFragment(polygons, depth, meta) {
  const group = new THREE.Group();
  for (const polygon of polygons) {
    const mesh = meshFromPolygon(polygon, depth);
    if (mesh) group.add(mesh);
  }
  group.userData = { role: 'fragment', ...meta };
  group.updateMatrixWorld(true);
  return group;
}

function splitWholeWord(layout, depth) {
  const c = bed();
  const safety = bevelSize();
  const safeW = Math.max(1, c.usable.x - safety * 2);
  const safeH = Math.max(1, c.usable.y - safety * 2);
  const all = layout.chars.flatMap(ch => scaledPolygons(layout, ch));
  const full = bounds(all);
  const cols = Math.max(1, Math.ceil(full.w / safeW));
  const rows = Math.max(1, Math.ceil(full.h / safeH));
  const cellW = full.w / cols;
  const cellH = full.h / rows;
  const fragments = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = full.minX + col * cellW;
      const x1 = col === cols - 1 ? full.maxX : full.minX + (col + 1) * cellW;
      const y0 = full.minY + row * cellH;
      const y1 = row === rows - 1 ? full.maxY : full.minY + (row + 1) * cellH;
      const rectangle = [[[x0 - 0.001, y0 - 0.001], [x1 + 0.001, y0 - 0.001], [x1 + 0.001, y1 + 0.001], [x0 - 0.001, y1 + 0.001], [x0 - 0.001, y0 - 0.001]]];
      const clipped = [];
      for (const polygon of all) {
        try {
          clipped.push(...polygonClipping.intersection(polygon, rectangle));
        } catch (error) {
          console.error('fragment clipping', error);
        }
      }
      if (clipped.length) {
        fragments.push(makePhysicalFragment(clipped, depth, { row, col, rows, cols }));
      }
    }
  }
  return fragments;
}

function clearObjects() {
  items = [];
  plates = [];
  objectLayer.clear();
  $('pieceList').innerHTML = '';
  $('bedList').innerHTML = '';
  stats();
}

function resetItem(item) {
  item.object.position.set(0, 0, 0);
  item.object.rotation.z = 0;
  item.object.updateMatrixWorld(true);
}

function itemBox(item, angle = 0) {
  resetItem(item);
  item.object.rotation.z = angle;
  item.object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(item.object);
  const result = { w: box.max.x - box.min.x, h: box.max.y - box.min.y };
  resetItem(item);
  return result;
}

function overlap(a, b, gap) {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

function findSpot(used, w, h, c, gap) {
  const candidates = [[0, 0]];
  for (const p of used) {
    candidates.push([p.x + p.w + gap, p.y]);
    candidates.push([p.x, p.y + p.h + gap]);
  }
  let best = null;
  for (const [x, y] of candidates) {
    if (x < 0 || y < 0 || x + w > c.usable.x + 0.001 || y + h > c.usable.y + 0.001) continue;
    const rect = { x, y, w, h };
    if (used.some(p => overlap(rect, p, gap))) continue;
    const score = (y + h) * 100000 + x + w;
    if (!best || score < best.score) best = { ...rect, score };
  }
  return best;
}

function placeItem(item, rect, angle, c) {
  resetItem(item);
  item.object.rotation.z = angle;
  item.object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(item.object);
  const left = -c.full.x / 2 + c.margin + c.p.x;
  const bottom = -c.full.y / 2 + c.margin;
  item.object.position.x = left + rect.x - box.min.x;
  item.object.position.y = bottom + rect.y - box.min.y;
  item.object.updateMatrixWorld(true);
}

function centerPlate(plate, c) {
  if (!plate.items.length) return;
  const box = new THREE.Box3();
  plate.items.forEach(item => box.expandByObject(item.object));
  const centerX = -c.full.x / 2 + c.margin + c.p.x + c.usable.x / 2;
  const centerY = -c.full.y / 2 + c.margin + c.usable.y / 2;
  const dx = centerX - (box.min.x + box.max.x) / 2;
  const dy = centerY - (box.min.y + box.max.y) / 2;
  plate.items.forEach(item => {
    item.object.position.x += dx;
    item.object.position.y += dy;
    item.object.updateMatrixWorld(true);
  });
}

function pack(allowRotate = false) {
  const c = bed();
  const gap = Math.max(0, num('spacing', 4));
  plates = [];
  items.forEach(resetItem);

  for (const item of items) {
    let placed = false;
    const angles = allowRotate ? [0, Math.PI / 2] : [0];
    for (let plateIndex = 0; plateIndex < plates.length && !placed; plateIndex++) {
      for (const angle of angles) {
        const size = itemBox(item, angle);
        const rect = findSpot(plates[plateIndex].used, size.w, size.h, c, gap);
        if (!rect) continue;
        placeItem(item, rect, angle, c);
        plates[plateIndex].items.push(item);
        plates[plateIndex].used.push(rect);
        item.bed = plateIndex;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const plate = { items: [], used: [] };
      const size = itemBox(item, 0);
      const rect = findSpot([], size.w, size.h, c, gap);
      if (!rect) {
        status(`La pieza ${item.id} no entra en la cama útil.`, 'bad');
        return false;
      }
      placeItem(item, rect, 0, c);
      plate.items.push(item);
      plate.used.push(rect);
      item.bed = plates.length;
      plates.push(plate);
    }
  }
  plates.forEach(p => centerPlate(p, c));
  drawBed();
  renderLists();
  stats();
  return true;
}

function stats() {
  if (!items.length) {
    $('sx').textContent = '—';
    $('sy').textContent = '—';
    $('sz').textContent = '—';
    $('pieces').textContent = '0';
    return;
  }
  const box = new THREE.Box3();
  items.forEach(item => box.expandByObject(item.object));
  $('sx').textContent = `${(box.max.x - box.min.x).toFixed(1)} mm`;
  $('sy').textContent = `${(box.max.y - box.min.y).toFixed(1)} mm`;
  $('sz').textContent = `${(box.max.z - box.min.z).toFixed(1)} mm`;
  $('pieces').textContent = String(items.length);
}

function renderLists() {
  const beds = $('bedList');
  beds.innerHTML = '';
  plates.forEach((plate, index) => {
    const card = document.createElement('div');
    card.className = `bedCard${index === activeBed ? ' active' : ''}`;
    card.innerHTML = `<div class="bedTab"><b>Cama ${index + 1}</b><span>${plate.items.length} pieza${plate.items.length === 1 ? '' : 's'}</span></div><button data-bed="${index}">Ver esta cama</button>`;
    card.querySelector('button').onclick = () => {
      activeBed = index;
      drawBed();
      renderLists();
    };
    beds.appendChild(card);
  });

  const pieces = $('pieceList');
  pieces.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'piece';
    row.innerHTML = `<b>Pieza ${item.id}</b><span>Cama ${item.bed + 1} · ${item.width.toFixed(1)} × ${item.height.toFixed(1)} mm</span>`;
    pieces.appendChild(row);
  });
}

function frame() {
  const c = bed();
  camera.position.set(0, 0, Math.max(c.full.x, c.full.y) * 1.65);
  camera.up.set(0, 1, 0);
  controls.target.set(0, 0, 0);
  controls.update();
}

function build() {
  clearObjects();
  const text = ($('text').value || '').trim();
  if (!text) {
    status('Escribí un texto antes de crear el modelo.', 'warn');
    return;
  }
  if (!font) {
    status('La tipografía todavía no está lista.', 'warn');
    return;
  }
  const c = bed();
  const height = Math.max(1, num('height', 60));
  const depth = Math.max(0.8, num('depth', 12));
  const spacing = Math.max(0, num('spacing', 4));
  const widthTotal = Math.max(0, num('widthScale', 0));
  const layout = makeLayout(text, spacing, height, widthTotal);
  const whole = makeFullWord(layout, depth);
  const wholeBox = new THREE.Box3().setFromObject(whole);
  const wholeWidth = wholeBox.max.x - wholeBox.min.x;
  const wholeHeight = wholeBox.max.y - wholeBox.min.y;

  if (wholeWidth <= c.usable.x + 0.001 && wholeHeight <= c.usable.y + 0.001) {
    const item = { id: 1, object: whole, bed: 0, width: wholeWidth, height: wholeHeight, source: text, fragment: false };
    items.push(item);
    objectLayer.add(whole);
    if (!pack(false)) return;
    status(`Texto creado: ${wholeWidth.toFixed(1)} × ${wholeHeight.toFixed(1)} × ${depth.toFixed(1)} mm.`, 'ok');
    return;
  }

  whole.traverse(node => {
    if (node.geometry) node.geometry.dispose();
  });

  const fragments = splitWholeWord(layout, depth);
  if (!fragments.length) {
    status('No se pudo dividir el texto con estas medidas.', 'bad');
    return;
  }

  fragments.forEach((fragment, index) => {
    const b = new THREE.Box3().setFromObject(fragment);
    const item = {
      id: index + 1,
      object: fragment,
      bed: 0,
      width: b.max.x - b.min.x,
      height: b.max.y - b.min.y,
      source: text,
      fragment: true,
      gridRow: fragment.userData.row,
      gridCol: fragment.userData.col
    };
    items.push(item);
    objectLayer.add(fragment);
  });

  if (!pack(false)) return;
  status(`Texto completo dividido físicamente en ${items.length} fragmentos y distribuido en ${plates.length} cama${plates.length === 1 ? '' : 's'}.`, 'ok');
}

function centerAll() {
  if (!items.length) {
    status('Primero creá el modelo.', 'warn');
    return;
  }
  plates.forEach(p => centerPlate(p, bed()));
  drawBed();
  stats();
  status('Modelo centrado en la cama. La escala no cambió.', 'ok');
}

function optimize() {
  if (!items.length) {
    status('Primero creá el modelo.', 'warn');
    return;
  }
  if (!pack(true)) return;
  status(`Acomodado terminado: ${plates.length} cama${plates.length === 1 ? '' : 's'}. La escala física se mantuvo.`, 'ok');
}

function exportSTL(parts) {
  if (!items.length) {
    status('No hay modelo para exportar.', 'warn');
    return;
  }
  const exporter = new STLExporter();
  const output = new THREE.Group();
  items.forEach(item => output.add(item.object.clone(true)));
  output.updateMatrixWorld(true);
  const text = exporter.parse(output);
  const blob = new Blob([text], { type: 'model/stl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = parts ? 'gemelos3d-piezas.stl' : 'gemelos3d.stl';
  a.click();
  URL.revokeObjectURL(a.href);
}

function saveProject() {
  const payload = {
    app: 'Gemelos3D',
    version: 5,
    text: $('text').value,
    height: num('height', 60),
    widthTotal: num('widthScale', 0),
    depth: num('depth', 12),
    spacing: num('spacing', 4),
    printer: $('printer').value,
    margin: num('margin', 5),
    purgeMode: $('purgeMode').value,
    purgeX: num('purgeX', 40),
    purgeY: num('purgeY', 40),
    font: $('fontStyle').value,
    pieces: items.map(item => ({ id: item.id, bed: item.bed, width: item.width, height: item.height }))
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gemelos3d-proyecto.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function wire() {
  const refreshIds = ['printer', 'margin', 'purgeMode', 'purgeX', 'purgeY', 'cx', 'cy', 'cz', 'height', 'widthScale', 'depth', 'spacing', 'fontStyle', 'curveSegments', 'bevel', 'bevelSize', 'bevelSegments'];
  refreshIds.forEach(id => $(id)?.addEventListener('change', async () => {
    info();
    if (id === 'fontStyle') await loadFont();
    if (['printer', 'margin', 'purgeMode', 'purgeX', 'purgeY', 'cx', 'cy', 'cz'].includes(id)) {
      drawBed();
      frame();
    }
  }));
  $('buildTop').onclick = async () => {
    if (await loadFont()) build();
  };
  $('clearText').onclick = clearObjects;
  $('centerAll').onclick = centerAll;
  $('optimize').onclick = optimize;
  $('download').onclick = () => exportSTL(false);
  $('downloadPieces').onclick = () => exportSTL(true);
  $('project').onclick = saveProject;
}

function resize() {
  const width = Math.max(1, viewer.clientWidth);
  const height = Math.max(1, viewer.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

wire();
info();
drawBed();
frame();
resize();
window.addEventListener('resize', resize);
status('Listo. Escribí el texto arriba y bajá por las opciones.');

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
