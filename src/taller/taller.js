/**
 * Taller 3D: editor libre estilo Tinkercad.
 * Formas, texto, imágenes y STL; manijas para mover, rotar y escalar; selección múltiple,
 * grupos con huecos, deshacer, alinear, espejar, copiar y pegar. Exporta 3MF por color.
 */
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { initEngine, loadFont, collect, modelStats } from '../engine/index.js';
import { Viewer } from '../engine/viewer.js';
import { imageToMask } from '../engine/image.js';
import { to3MF, toSTLZip, mergedSTL, download } from '../engine/export.js';
import { estimate, sendToCalculator } from '../engine/cost.js';
import { renderParams } from '../ui/params.js';
import { icon } from '../ui/icons.js';
import {
  TYPES, SHAPE_PARAMS, makeObject, cloneObj, objectParts, sceneParts, partsBox,
  groupObjects, ungroupObject, parseSTLMesh,
} from './objects.js';

export const SCENE_KEY = 'g3d_taller_scene';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtTime = min => { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h ${m} min` : `${m} min`; };
const r2 = v => Math.round(v * 100) / 100;

const SVG = {
  box: '<rect x="4" y="7" width="13" height="13" rx="1"/><path d="M4 7l4-4h13v13l-4 4M17 7l4-4"/>',
  cylinder: '<ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5"/>',
  sphere: '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="8.5" ry="3"/>',
  cone: '<path d="M12 3L5 19M12 3l7 16"/><ellipse cx="12" cy="19" rx="7" ry="2.5"/>',
  roof: '<path d="M3 18l9-12 9 12zM12 6l4-3"/>',
  pyramid: '<path d="M12 3L3 18h18zM12 3l3 15"/>',
  halfsphere: '<path d="M3 17a9 9 0 0 1 18 0z"/>',
  wedge: '<path d="M3 19h18L3 6z"/><path d="M3 6l4-3v13M21 19l-4-3"/>',
  tube: '<ellipse cx="12" cy="5" rx="7" ry="2.5"/><ellipse cx="12" cy="5" rx="3.5" ry="1.2"/><path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5"/>',
  torus: '<ellipse cx="12" cy="12" rx="9" ry="5"/><ellipse cx="12" cy="11" rx="4" ry="1.6"/>',
  polygon: '<path d="M12 3l8 5v8l-8 5-8-5V8z"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6L12 16.4 6.6 19.3l1.3-6L3.3 9.2l6.1-.6z"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  paraboloid: '<path d="M4 18c0-9 4-13 8-13s8 4 8 13z"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  stl: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  group: '<rect x="3" y="3" width="10" height="10" rx="1"/><rect x="11" y="11" width="10" height="10" rx="1"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/>',
  dup: '<rect x="3" y="3" width="12" height="12" rx="2"/><path d="M9 21h10a2 2 0 0 0 2-2V9M15 9v6M12 12h6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  ungroup: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  align: '<path d="M4 3v18M8 7h12M8 12h8M8 17h11"/>',
  mirror: '<path d="M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z"/>',
  move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  scale: '<path d="M4 20L20 4M14 4h6v6M4 14v6h6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.2 7.6A17 17 0 0 0 2 12s4 7 10 7a9.8 9.8 0 0 0 4.1-.9"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  floor: '<path d="M3 20h18M12 4v11M8 11l4 4 4-4"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
};
const SHAPE_GROUPS = [
  ['Básicas', ['box', 'cylinder', 'sphere', 'cone', 'tube', 'wedge']],
  ['Más formas', ['roof', 'pyramid', 'halfsphere', 'torus', 'polygon', 'star', 'heart', 'paraboloid']],
  ['Texto, imagen y archivos', ['text', 'image', 'stl']],
];
const svg = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${SVG[n] || ''}</svg>`;

export function loadScene() {
  try { const s = JSON.parse(localStorage.getItem(SCENE_KEY)); if (Array.isArray(s?.objs)) return s; } catch { /* vacío */ }
  return null;
}
export function saveScene(scene) {
  const strip = o => {
    const c = { ...o };
    if (c.mesh && c.mesh.verts.length > 400000) { c.mesh = null; c.meshLost = true; }
    if (c.children) c.children = c.children.map(strip);
    return c;
  };
  try { localStorage.setItem(SCENE_KEY, JSON.stringify({ objs: scene.objs.map(strip), sel: scene.sel || [], focus: !!scene.focus })); return true; } catch { return false; }
}

function demoScene() {
  const base = makeObject('box', 0, { name: 'Base', w: 60, d: 40, h: 4, color: '#1D4ED8', radius: 1.5 });
  const txt = makeObject('text', 1, { name: 'Texto', text: 'Gemelos', w: 46, d: 11, h: 2, z: 4, color: '#F5F5F5' });
  const hole = makeObject('cylinder', 2, { name: 'Agujero', x: -24, y: 13, w: 5, d: 5, h: 10, hole: true });
  return { objs: [base, txt, hole], sel: [txt.id] };
}

function schemaFor(o) {
  const isFlat = ['text', 'image'].includes(o.type);
  const p = [{ type: 'group', label: TYPES[o.type].label }, { key: 'name', type: 'text', label: 'Nombre', default: o.name }];
  p.push({ key: 'hole', type: 'segment', label: 'Tipo', default: false, options: [{ value: false, label: 'Sólido' }, { value: true, label: 'Hueco' }] });
  if (o.type === 'group') p.push({ key: 'multicolor', type: 'toggle', label: 'Mantener los colores de cada pieza', default: true, show: v => !v.hole });
  p.push({ key: 'color', type: 'color', label: 'Color', default: o.color, show: v => !v.hole && !(v.type === 'group' && v.multicolor !== false) });
  if (o.type === 'text') p.push({ key: 'text', type: 'text', label: 'Texto', default: 'Hola', multiline: true }, { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo' });
  if (o.type === 'image') p.push(
    { key: 'image', type: 'image', label: 'Imagen', default: '' },
    { key: 'threshold', type: 'number', label: 'Sensibilidad', default: 128, min: 20, max: 240, step: 1, unit: '' },
    { key: 'invert', type: 'toggle', label: 'Invertir (tomar lo claro)', default: false });
  for (const sp of SHAPE_PARAMS[o.type] || []) p.push({ ...sp, type: 'number' });
  p.push(
    { type: 'group', label: 'Tamaño' },
    { key: 'w', type: 'number', label: 'Ancho (X)', default: o.w, min: 0.2, max: 300, step: 0.5, unit: 'mm' },
    { key: 'd', type: 'number', label: isFlat ? 'Alto de la figura (Y)' : 'Fondo (Y)', default: o.d, min: 0.2, max: 300, step: 0.5, unit: 'mm' },
    { key: 'h', type: 'number', label: isFlat ? 'Espesor (Z)' : 'Alto (Z)', default: o.h, min: 0.2, max: 300, step: 0.2, unit: 'mm' },
    { type: 'group', label: 'Posición' },
    { key: 'x', type: 'number', label: 'X (centro)', default: 0, min: -150, max: 150, step: 0.5, unit: 'mm' },
    { key: 'y', type: 'number', label: 'Y (centro)', default: 0, min: -150, max: 150, step: 0.5, unit: 'mm' },
    { key: 'z', type: 'number', label: 'Z (base)', default: 0, min: -100, max: 300, step: 0.5, unit: 'mm' },
    { type: 'group', label: 'Rotación' },
    { key: 'rx', type: 'number', label: 'Alrededor de X', default: 0, min: -180, max: 180, step: 1, unit: '°' },
    { key: 'ry', type: 'number', label: 'Alrededor de Y', default: 0, min: -180, max: 180, step: 1, unit: '°' },
    { key: 'rz', type: 'number', label: 'Alrededor de Z', default: 0, min: -180, max: 180, step: 1, unit: '°' },
  );
  return p;
}

export async function renderTaller(app, headerHtml) {
  app.innerHTML = `${headerHtml}
  <main class="gen taller">
    <aside class="gen-params">
      <a class="back" href="#/">${icon('back')} Inicio</a>
      <h1>Taller 3D</h1>
      <ol class="t-steps"><li>Sumá formas o pedíselas a la IA.</li><li>Movelas con las manijas y marcá huecos.</li><li>Exportá el 3MF por colores.</li></ol>

      <details class="t-sec t-ai" open>
        <summary>${svg('spark')} Describí tu pieza <small>IA</small></summary>
        <textarea id="aiPrompt" rows="3" placeholder="Ej.: una caja de 60 × 40 × 30 mm con tapa y un agujero de 5 mm en el frente"></textarea>
        <div class="t-ai-opts">
          <label><input type="checkbox" id="aiScene" checked> Tener en cuenta lo que ya hay</label>
        </div>
        <div class="t-ai-row"><button class="primary" id="aiGo">Crear con IA</button><span id="aiMsg" class="muted small"></span></div>
        <div class="t-ai-ideas">${['Portalápices hexagonal con mi nombre', 'Soporte de celular a 60°', 'Caja de 50 × 50 con tapa y bisagra', 'Llavero redondo con un agujero y una estrella'].map(t => `<button data-idea="${t}">${t}</button>`).join('')}</div>
      </details>

      <details class="t-sec" open>
        <summary>${svg('box')} Formas</summary>
        ${SHAPE_GROUPS.map(([title, list]) => `<p class="t-gtitle">${title}</p><div class="t-add">${list.map(k => k === 'stl'
          ? `<button data-add="stl" title="Importar uno o varios STL">${svg('stl')}<span>Importar STL</span></button>`
          : `<button data-add="${k}" title="Agregar ${TYPES[k].label}">${svg(k)}<span>${TYPES[k].label}</span></button>`).join('')}</div>`).join('')}
        <input type="file" id="stlFile" accept=".stl" multiple hidden>
      </details>

      <details class="t-sec" open>
        <summary>${svg('group')} Objetos <small id="objCount"></small></summary>
        <p class="muted small">Mayús + clic para elegir varios.</p>
        <ul class="t-list" id="list"></ul>
      </details>
    </aside>
    <section class="gen-view">
      <div class="t-toolbar" id="toolbar">
        <div class="t-tools">
          <button data-tool="translate" class="on" title="Mover (1)">${svg('move')}</button>
          <button data-tool="rotate" title="Rotar (2)">${svg('rotate')}</button>
          <button data-tool="scale" title="Escalar (3)">${svg('scale')}</button>
        </div>
        <span class="t-sep"></span>
        <button data-cmd="undo" title="Deshacer (Ctrl+Z)">${svg('undo')}</button>
        <button data-cmd="redo" title="Rehacer (Ctrl+Y)">${svg('redo')}</button>
        <span class="t-sep"></span>
        <button data-cmd="copy" title="Copiar (Ctrl+C)">${svg('copy')}</button>
        <button data-cmd="paste" title="Pegar (Ctrl+V)">${svg('paste')}</button>
        <button data-cmd="dup" title="Duplicar y repetir (Ctrl+D)">${svg('dup')}</button>
        <button data-cmd="del" title="Borrar (Supr)">${svg('trash')}</button>
        <span class="t-sep"></span>
        <button data-cmd="group" title="Agrupar (Ctrl+G)">${svg('group')}</button>
        <button data-cmd="ungroup" title="Desagrupar (Ctrl+Mayús+G)">${svg('ungroup')}</button>
        <div class="t-pop"><button data-pop="align" title="Alinear (L)">${svg('align')}</button>
          <div class="t-menu" id="alignMenu">${['x', 'y', 'z'].map(ax => `<div><b>${ax.toUpperCase()}</b>${[['min', ax === 'z' ? 'Abajo' : 'Mín.'], ['mid', 'Centro'], ['max', ax === 'z' ? 'Arriba' : 'Máx.']].map(([k, l]) => `<button data-align="${ax}:${k}">${l}</button>`).join('')}</div>`).join('')}</div></div>
        <div class="t-pop"><button data-pop="mirror" title="Espejar (M)">${svg('mirror')}</button>
          <div class="t-menu" id="mirrorMenu"><div>${['x', 'y', 'z'].map((ax, i) => `<button data-mirror="${i}">Espejar en ${ax.toUpperCase()}</button>`).join('')}</div></div></div>
        <button data-cmd="floor" title="Apoyar en la cama (D)">${svg('floor')}</button>
        <button data-cmd="fit" title="Encuadrar (F)">${svg('fit')}</button>
        <span class="t-sep"></span>
        <label class="t-grid" title="Paso de la grilla">Grilla
          <select id="snap">${[0.1, 0.5, 1, 2, 5, 10].map(v => `<option value="${v}" ${v === 1 ? 'selected' : ''}>${v} mm</option>`).join('')}</select></label>
      </div>
      <div class="viewer" id="viewer"></div>
      <div class="views">
        <button data-view="iso" class="on">3D</button><button data-view="top">Arriba</button><button data-view="front">Frente</button><button data-view="side">Costado</button>
      </div>
      <div class="t-mode"><button data-mode="edit" class="on">Piezas</button><button data-mode="result">Resultado</button></div>
      <div class="t-dims" id="dims"></div>
      <div class="status" id="status"></div>
    </section>
    <aside class="gen-out">
      <div id="props"></div>
      <details class="t-result" open>
        <summary>Resultado y exportar</summary>
        <div class="stats">
          <div><small>Medidas</small><b id="oSize">—</b></div>
          <div><small>Filamento</small><b id="oGrams">—</b></div>
          <div><small>Tiempo aprox.</small><b id="oTime">—</b></div>
          <div><small>Costo</small><b id="oCost">—</b></div>
        </div>
        <p class="muted small" id="oProfile"></p>
        <ul class="parts" id="oParts"></ul>
        <div class="exports">
          <button class="primary" id="x3mf">${icon('download')} 3MF con colores</button>
          <button id="xstl">${icon('download')} STL único</button>
          <button id="xzip">${icon('download')} STL por color (.zip)</button>
          <button class="ghost" id="xcalc">${icon('calc')} Mandar a la calculadora</button>
        </div>
      </details>
      <details class="t-help">
        <summary>Atajos de teclado</summary>
        <p class="muted small">1 / 2 / 3: mover, rotar, escalar · Flechas: mover (Mayús ×10) · Re Pág / Av Pág: subir y bajar ·
        Ctrl+Z / Ctrl+Y: deshacer y rehacer · Ctrl+C / Ctrl+V: copiar y pegar · Ctrl+D: duplicar (repite el último movimiento) ·
        Ctrl+G / Ctrl+Mayús+G: agrupar y desagrupar · H: hueco · S: sólido · D: apoyar en la cama · F: encuadrar · Supr: borrar · Esc: soltar.</p>
      </details>
      <button class="link" id="reset">Empezar un diseño nuevo</button>
    </aside>
  </main>`;

  const $ = id => document.getElementById(id);
  const status = (msg, kind = '') => { $('status').className = `status ${kind}`; $('status').innerHTML = msg; };
  status('<span class="spin"></span> Preparando el motor 3D…');
  await initEngine();
  const viewer = new Viewer($('viewer'));
  const ctx = { font: loadFont, image: (url, opts) => imageToMask(url, opts) };

  // ---------- Estado ----------
  const loaded = loadScene();
  const state = loaded ? { objs: loaded.objs, sel: Array.isArray(loaded.sel) ? loaded.sel : loaded.sel ? [loaded.sel] : [] } : demoScene();
  let mode = 'edit', tool = 'translate', snap = 1;
  const cache = new Map(); // id → { key, data }
  let partsById = new Map(), result = [], timer = null, alive = true, busy = false, again = false;
  let clipboard = null, dupInfo = null;
  const undo = [], redo = [];
  let lastSnap = JSON.stringify(state.objs.map(o => ({ ...o, mesh: o.mesh ? 1 : 0 })));

  const byId = id => state.objs.find(o => o.id === id);
  const selection = () => state.sel.map(byId).filter(Boolean);
  const primary = () => byId(state.sel[state.sel.length - 1]);
  const keyOf = o => JSON.stringify(o, (k, v) => (k === 'mesh' ? (v ? v.verts.length : 0) : k === 'name' ? undefined : v));

  /** Guarda un punto de deshacer si el diseño cambió. */
  function commit() {
    const snapStr = JSON.stringify(state.objs.map(o => ({ ...o, mesh: o.mesh ? 1 : 0 })));
    if (snapStr === lastSnap) return;
    undo.push(lastState);
    if (undo.length > 80) undo.shift();
    redo.length = 0;
    lastState = { objs: state.objs.map(o => cloneObj(o)), sel: [...state.sel] };
    lastSnap = snapStr;
  }
  let lastState = { objs: state.objs.map(o => cloneObj(o)), sel: [...state.sel] };
  function restore(snapshot) {
    state.objs = snapshot.objs.map(o => cloneObj(o));
    state.sel = [...snapshot.sel];
    lastState = { objs: state.objs.map(o => cloneObj(o)), sel: [...state.sel] };
    lastSnap = JSON.stringify(state.objs.map(o => ({ ...o, mesh: o.mesh ? 1 : 0 })));
  }

  async function dataFor(o) {
    const k = keyOf(o);
    const c = cache.get(o.id);
    if (c && c.key === k) return c.data;
    const data = await objectParts(o, ctx);
    cache.set(o.id, { key: k, data });
    return data;
  }

  async function refresh() {
    if (busy) { again = true; return; }
    busy = true;
    try {
      partsById = new Map();
      const items = [];
      for (const o of state.objs) {
        try {
          const d = await dataFor(o);
          o.error = '';
          partsById.set(o.id, d.parts);
          if (!o.hidden) items.push({ id: o.id, raw: d.raw, pivot: d.pivot, rot: [o.rx || 0, o.ry || 0, o.rz || 0] });
        } catch (err) { o.error = err.message; cache.delete(o.id); }
      }
      for (const id of [...cache.keys()]) if (!byId(id)) cache.delete(id);
      result = sceneParts(state.objs, partsById);
      if (!alive) return;
      tc.detach(); // las manijas se vuelven a enganchar al objeto nuevo
      if (mode === 'result') viewer.setScene(result.map((p, i) => ({ id: `r${i}`, raw: [p], pivot: [0, 0, 0] })), []);
      else viewer.setScene(items, state.sel);
      attachGizmo();
      const keep = [];
      for (const { data } of cache.values()) keep.push(...data.parts.map(p => p.solid), ...data.raw.map(p => p.solid));
      collect([...keep, ...result.map(p => p.solid)]);
      showOutputs(); showDims();
      const err = state.objs.find(o => o.error);
      status(err ? `⚠ ${esc(err.name)}: ${esc(err.error)}` : '', err ? 'error' : '');
    } catch (err) {
      console.error(err);
      status(`⚠ ${esc(err.message || err)}`, 'error');
    } finally {
      busy = false;
      if (again) { again = false; refresh(); }
    }
  }
  /** Programa un redibujo; `history` decide si deja un punto de deshacer. */
  const schedule = (ms = 120, history = true) => {
    saveScene(state);
    clearTimeout(timer);
    timer = setTimeout(() => { if (history) commit(); refresh(); }, ms);
  };
  const changed = (ms = 0) => { drawList(); drawProps(); schedule(ms); };

  // ---------- Manijas ----------
  const tc = new TransformControls(viewer.camera, viewer.renderer.domElement);
  tc.setSize(0.8);
  viewer.scene.add(tc.getHelper());
  tc.addEventListener('change', () => viewer.render());
  tc.addEventListener('dragging-changed', e => {
    viewer.controls.enabled = !e.value;
    if (e.value) return;
    const o = primary(), holder = tc.object;
    if (!o || !holder) return;
    const d = cache.get(o.id)?.data;
    if (!d) return;
    if (tool === 'translate') {
      const dx = holder.position.x - d.pivot[0], dy = holder.position.y - d.pivot[1], dz = holder.position.z - d.pivot[2];
      for (const s of selection()) if (!s.locked) { s.x = r2(s.x + dx); s.y = r2(s.y + dy); s.z = r2(s.z + dz); }
    } else if (tool === 'rotate') {
      const e2 = new THREE.Euler().setFromQuaternion(holder.quaternion, 'ZYX');
      o.rx = r2(THREE.MathUtils.radToDeg(e2.x)); o.ry = r2(THREE.MathUtils.radToDeg(e2.y)); o.rz = r2(THREE.MathUtils.radToDeg(e2.z));
    } else {
      o.w = r2(Math.max(0.2, o.w * holder.scale.x)); o.d = r2(Math.max(0.2, o.d * holder.scale.y)); o.h = r2(Math.max(0.2, o.h * holder.scale.z));
    }
    changed();
  });
  function attachGizmo() {
    const o = primary();
    const holder = o && mode === 'edit' && !o.locked && !o.hidden ? viewer.items?.get(o.id) : null;
    if (holder) { tc.attach(holder); tc.setMode(tool); tc.setTranslationSnap(snap); tc.setRotationSnap(THREE.MathUtils.degToRad(15)); tc.setScaleSnap(0.05); }
    else tc.detach();
    viewer.render();
  }

  // ---------- Paneles ----------
  function drawList() {
    const sel = new Set(state.sel);
    $('list').innerHTML = state.objs.length ? state.objs.map(o => `<li data-id="${o.id}" class="${sel.has(o.id) ? 'on' : ''} ${o.hidden ? 'off' : ''}">
      ${o.hole ? '<i class="hole"></i>' : o.type === 'group' && o.multicolor !== false ? '<i class="multi"></i>' : `<i style="background:${o.color}"></i>`}${svg(o.type)}<span>${esc(o.name)}</span>
      ${o.hole ? '<em>hueco</em>' : ''}
      <button data-toggle="hidden" title="${o.hidden ? 'Mostrar' : 'Ocultar'}">${svg(o.hidden ? 'eyeOff' : 'eye')}</button>
      <button data-toggle="locked" title="${o.locked ? 'Desbloquear' : 'Bloquear'}" class="${o.locked ? 'on' : ''}">${svg(o.locked ? 'lock' : 'unlock')}</button></li>`).join('')
      : '<li class="muted">Todavía no hay objetos. Elegí una forma de arriba.</li>';
    $('objCount').textContent = state.objs.length ? `· ${state.objs.length}` : '';
    const n = state.sel.length, hasGroup = selection().some(o => o.type === 'group');
    const tb = $('toolbar');
    tb.querySelector('[data-cmd=group]').disabled = n < 2;
    tb.querySelector('[data-cmd=ungroup]').disabled = !hasGroup;
    tb.querySelector('[data-cmd=undo]').disabled = !undo.length;
    tb.querySelector('[data-cmd=redo]').disabled = !redo.length;
    for (const c of ['copy', 'dup', 'del', 'floor']) tb.querySelector(`[data-cmd=${c}]`).disabled = !n;
    tb.querySelector('[data-cmd=paste]').disabled = !clipboard;
    tb.querySelector('[data-pop=align]').disabled = n < 2;
    tb.querySelector('[data-pop=mirror]').disabled = !n;
  }

  function drawProps() {
    const sel = selection();
    if (!sel.length) { $('props').innerHTML = '<h2>Propiedades</h2><p class="muted small">Tocá un objeto en la vista o en la lista para editarlo.</p>'; return; }
    if (sel.length > 1) {
      $('props').innerHTML = `<h2>${sel.length} objetos</h2><p class="muted small">Movelos juntos con las flechas o arrastrando. Podés agruparlos, alinearlos o cambiarles el color a todos.</p><div id="multi"></div>`;
      const v = { hole: sel.every(o => o.hole), color: sel[0].color };
      renderParams($('multi'), [
        { key: 'hole', type: 'segment', label: 'Tipo', default: false, options: [{ value: false, label: 'Sólido' }, { value: true, label: 'Hueco' }] },
        { key: 'color', type: 'color', label: 'Color para todos', default: v.color, show: x => !x.hole },
      ], v, (vals, key) => { for (const o of sel) o[key] = vals[key]; drawList(); schedule(0); });
      return;
    }
    const o = sel[0];
    $('props').innerHTML = `<h2>Propiedades</h2>${o.meshLost ? '<p class="warn small">Esta malla era muy pesada para guardarse; volvé a importar el STL.</p>' : ''}<div id="single"></div>`;
    renderParams($('single'), schemaFor(o), o, (v, key) => {
      if (['name', 'hole', 'color', 'multicolor'].includes(key)) drawList();
      schedule(['text', 'name'].includes(key) ? 400 : 150);
    });
  }

  function showOutputs() {
    if (!result.length) {
      ['oSize', 'oGrams', 'oTime', 'oCost'].forEach(id => { $(id).textContent = '—'; });
      $('oParts').innerHTML = '<li class="muted">Agregá una forma para empezar.</li>';
      $('oProfile').textContent = '';
      return;
    }
    const s = modelStats(result), e = estimate(result);
    $('oSize').textContent = s.size.map(v => v.toFixed(1)).join(' × ') + ' mm';
    $('oGrams').textContent = `${e.grams.toFixed(1)} g`;
    $('oTime').textContent = fmtTime(e.minutes);
    $('oCost').textContent = money(e.cost);
    $('oProfile').textContent = `Estimado con el perfil "${e.profile}". Precio sugerido: ${money(e.price)}.`;
    $('oParts').innerHTML = result.map(p => `<li><i style="background:${p.color}"></i>${esc(p.name)}<span>${(p.solid.volume() / 1000).toFixed(1)} cm³</span></li>`).join('');
  }

  function showDims() {
    const parts = selection().flatMap(o => partsById.get(o.id) || []);
    if (!parts.length || mode !== 'edit') { $('dims').innerHTML = ''; return; }
    const b = partsBox(parts);
    $('dims').innerHTML = `<b>${b.size.map(v => v.toFixed(1)).join(' × ')} mm</b><span>X ${b.center[0].toFixed(1)} · Y ${b.center[1].toFixed(1)} · Z ${b.min[2].toFixed(1)}</span>`;
  }

  // ---------- Comandos ----------
  const select = (ids, add = false) => {
    if (add) for (const id of ids) state.sel = state.sel.includes(id) ? state.sel.filter(x => x !== id) : [...state.sel, id];
    else state.sel = [...ids];
    drawList(); drawProps(); schedule(0, false);
  };

  function addObject(type, extra = {}) {
    const o = makeObject(type, state.objs.length, extra);
    // Lo ubica a la derecha de lo que ya hay, para que no quede tapado
    const all = state.objs.flatMap(x => partsById.get(x.id) || []);
    if (all.length) { const b = partsBox(all); o.x = r2(Math.ceil(b.max[0] + 6 + o.w / 2)); o.y = r2(Math.round(b.center[1])); }
    state.objs.push(o);
    state.sel = [o.id];
    changed();
    return o;
  }

  function boxOf(o) { const p = partsById.get(o.id); return p && p.length ? partsBox(p) : null; }

  const commands = {
    undo() { if (!undo.length) return; redo.push({ objs: state.objs.map(o => cloneObj(o)), sel: [...state.sel] }); restore(undo.pop()); drawList(); drawProps(); schedule(0, false); },
    redo() { if (!redo.length) return; undo.push({ objs: state.objs.map(o => cloneObj(o)), sel: [...state.sel] }); restore(redo.pop()); drawList(); drawProps(); schedule(0, false); },
    copy() { const s = selection(); if (s.length) { clipboard = s.map(o => cloneObj(o)); drawList(); status(`${s.length} copiado(s)`); setTimeout(() => status(''), 1200); } },
    paste() {
      if (!clipboard) return;
      const fresh = clipboard.map(o => ({ ...cloneObj(o, true), x: r2(o.x + 5), y: r2(o.y - 5) }));
      clipboard = fresh.map(o => cloneObj(o));
      state.objs.push(...fresh); state.sel = fresh.map(o => o.id); dupInfo = null; changed();
    },
    dup() {
      const s = selection(); if (!s.length) return;
      // Si se vuelve a duplicar lo recién duplicado, repite el mismo movimiento
      let delta = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
      if (dupInfo && dupInfo.to.join() === state.sel.join()) {
        const a = byId(dupInfo.from[0]), b = byId(dupInfo.to[0]);
        if (a && b) delta = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z, rx: b.rx - a.rx, ry: b.ry - a.ry, rz: b.rz - a.rz };
      }
      const fresh = s.map(o => { const c = cloneObj(o, true); for (const k in delta) c[k] = r2(c[k] + delta[k]); c.name = `${o.name.replace(/ \(copia\)$/, '')} (copia)`; return c; });
      state.objs.push(...fresh);
      dupInfo = { from: s.map(o => o.id), to: fresh.map(o => o.id) };
      state.sel = fresh.map(o => o.id); changed();
    },
    del() { const ids = new Set(state.sel); state.objs = state.objs.filter(o => !ids.has(o.id) || o.locked); state.sel = []; changed(); },
    async group() {
      const s = selection(); if (s.length < 2) return;
      status('<span class="spin"></span> Agrupando…');
      const g = await groupObjects(s, ctx, state.objs.filter(o => o.type === 'group').length);
      const ids = new Set(s.map(o => o.id));
      const at = state.objs.findIndex(o => ids.has(o.id));
      state.objs = state.objs.filter(o => !ids.has(o.id));
      state.objs.splice(at, 0, g);
      state.sel = [g.id]; changed();
    },
    async ungroup() {
      const groups = selection().filter(o => o.type === 'group'); if (!groups.length) return;
      const newSel = [];
      for (const g of groups) {
        const kids = await ungroupObject(g, ctx);
        const at = state.objs.indexOf(g);
        state.objs.splice(at, 1, ...kids);
        newSel.push(...kids.map(k => k.id));
      }
      state.sel = newSel; changed();
    },
    floor() {
      for (const o of selection()) {
        if (o.locked) continue;
        const b = boxOf(o); if (b) o.z = r2(o.z - b.min[2]); else o.z = 0;
      }
      changed();
    },
    fit() {
      const parts = (state.sel.length ? selection() : state.objs).flatMap(o => partsById.get(o.id) || []);
      if (parts.length) { const b = partsBox(parts); viewer.frame(b.min, b.max); }
    },
  };

  function align(axis, where) {
    const s = selection().filter(o => !o.locked); if (s.length < 2) return;
    const i = { x: 0, y: 1, z: 2 }[axis];
    const boxes = s.map(o => [o, boxOf(o)]).filter(([, b]) => b);
    const all = { min: Math.min(...boxes.map(([, b]) => b.min[i])), max: Math.max(...boxes.map(([, b]) => b.max[i])) };
    for (const [o, b] of boxes) {
      const shift = where === 'min' ? all.min - b.min[i] : where === 'max' ? all.max - b.max[i] : (all.min + all.max) / 2 - (b.min[i] + b.max[i]) / 2;
      o[axis] = r2(o[axis] + shift);
    }
    changed();
  }

  function mirror(axis) {
    for (const o of selection()) { if (o.locked) continue; o.mirror = [...(o.mirror || [false, false, false])]; o.mirror[axis] = !o.mirror[axis]; }
    changed();
  }

  // ---------- Eventos ----------
  const main = $('viewer').closest('main');
  main.querySelector('.gen-params').addEventListener('click', e => {
    const b = e.target.closest('button[data-add]'); if (!b) return;
    if (b.dataset.add === 'stl') $('stlFile').click(); else addObject(b.dataset.add);
  });
  $('stlFile').addEventListener('change', async e => {
    const files = [...e.target.files]; e.target.value = '';
    for (const f of files) {
      try {
        status(`<span class="spin"></span> Leyendo ${esc(f.name)}…`);
        const mesh = parseSTLMesh(await f.arrayBuffer());
        const v = mesh.verts, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v[i + k]); max[k] = Math.max(max[k], v[i + k]); }
        addObject('stl', { name: f.name.replace(/\.stl$/i, ''), mesh, w: r2(max[0] - min[0]), d: r2(max[1] - min[1]), h: r2(max[2] - min[2]) });
      } catch (err) { status(`⚠ ${esc(f.name)}: ${esc(err.message)}`, 'error'); }
    }
  });
  $('list').addEventListener('click', e => {
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const o = byId(li.dataset.id);
    const t = e.target.closest('button[data-toggle]');
    if (t) { o[t.dataset.toggle] = !o[t.dataset.toggle]; changed(); return; }
    select([o.id], e.shiftKey || e.ctrlKey || e.metaKey);
  });
  $('toolbar').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.tool) {
      tool = b.dataset.tool;
      $('toolbar').querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b));
      attachGizmo(); return;
    }
    if (b.dataset.pop) {
      const menu = b.parentElement.querySelector('.t-menu');
      const open = !menu.classList.contains('open');
      $('toolbar').querySelectorAll('.t-menu').forEach(m => m.classList.remove('open'));
      menu.classList.toggle('open', open); return;
    }
    if (b.dataset.align) { const [ax, w] = b.dataset.align.split(':'); align(ax, w); b.closest('.t-menu').classList.remove('open'); return; }
    if (b.dataset.mirror) { mirror(+b.dataset.mirror); b.closest('.t-menu').classList.remove('open'); return; }
    if (b.dataset.cmd) await commands[b.dataset.cmd]();
  });
  $('snap').addEventListener('change', e => { snap = +e.target.value; attachGizmo(); });
  $('reset').addEventListener('click', () => {
    if (state.objs.length && !confirm('¿Borrar todo y empezar un diseño nuevo? (Podés deshacerlo)')) return;
    state.objs = []; state.sel = []; changed();
  });
  main.querySelector('.views').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    main.querySelectorAll('.views button').forEach(x => x.classList.toggle('on', x === b));
    viewer.setView(b.dataset.view);
  });
  main.querySelector('.t-mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    mode = b.dataset.mode;
    main.querySelectorAll('.t-mode button').forEach(x => x.classList.toggle('on', x === b));
    schedule(0, false);
  });

  // Clic para elegir; arrastrar el cuerpo de un objeto lo mueve sobre su plano
  const canvas = viewer.renderer.domElement;
  let drag = null;
  canvas.addEventListener('pointerdown', ev => {
    if (mode !== 'edit' || ev.button !== 0 || tc.axis) return;
    const id = viewer.pick(ev);
    drag = { start: [ev.clientX, ev.clientY], id, moved: false, add: ev.shiftKey || ev.ctrlKey || ev.metaKey };
    if (!id) return;
    if (!state.sel.includes(id) || drag.add) { select([id], drag.add); drag.selectedNow = true; }
    const o = byId(id);
    if (o.locked || drag.add) return;
    const p = viewer.groundPoint(ev, o.z);
    if (!p) return;
    drag.moving = selection().filter(x => !x.locked);
    drag.p0 = p; drag.z = o.z;
    viewer.controls.enabled = false;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', ev => {
    if (!drag || !drag.p0) return;
    if (Math.hypot(ev.clientX - drag.start[0], ev.clientY - drag.start[1]) > 3) drag.moved = true;
    if (!drag.moved) return;
    const p = viewer.groundPoint(ev, drag.z);
    if (!p) return;
    const dx = Math.round((p.x - drag.p0.x) / snap) * snap, dy = Math.round((p.y - drag.p0.y) / snap) * snap;
    drag.delta = [dx, dy];
    for (const o of drag.moving) { const h = viewer.items.get(o.id); const d = cache.get(o.id)?.data; if (h && d) h.position.set(d.pivot[0] + dx, d.pivot[1] + dy, d.pivot[2]); }
    viewer.render();
  });
  const endDrag = ev => {
    if (!drag) return;
    const d = drag; drag = null;
    viewer.controls.enabled = true;
    if (d.moving && d.moved && d.delta) {
      for (const o of d.moving) { o.x = r2(o.x + d.delta[0]); o.y = r2(o.y + d.delta[1]); }
      changed();
    } else if (!d.id && Math.hypot(ev.clientX - d.start[0], ev.clientY - d.start[1]) < 3 && state.sel.length && !d.add) {
      select([]);
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const onKey = async e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); commands.undo(); return; }
    if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); commands.redo(); return; }
    if (ctrl && k === 'c') { e.preventDefault(); commands.copy(); return; }
    if (ctrl && k === 'v') { e.preventDefault(); commands.paste(); return; }
    if (ctrl && k === 'd') { e.preventDefault(); commands.dup(); return; }
    if (ctrl && k === 'g') { e.preventDefault(); await (e.shiftKey ? commands.ungroup() : commands.group()); return; }
    if (ctrl && k === 'a') { e.preventDefault(); select(state.objs.map(o => o.id)); return; }
    if (k === 'escape') { select([]); return; }
    if (k === '1' || k === '2' || k === '3') { $('toolbar').querySelector(`[data-tool=${['translate', 'rotate', 'scale'][+k - 1]}]`).click(); return; }
    if (k === 'f') { commands.fit(); return; }
    if (!state.sel.length) return;
    const step = snap * (e.shiftKey ? 10 : 1);
    const moves = { arrowleft: ['x', -step], arrowright: ['x', step], arrowup: ['y', step], arrowdown: ['y', -step], pageup: ['z', step], pagedown: ['z', -step] };
    if (moves[k]) { const [ax, dv] = moves[k]; for (const o of selection()) if (!o.locked) o[ax] = r2(o[ax] + dv); e.preventDefault(); changed(250); }
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); commands.del(); }
    else if (k === 'h') { for (const o of selection()) o.hole = true; changed(); }
    else if (k === 's') { for (const o of selection()) o.hole = false; changed(); }
    else if (k === 'd') commands.floor();
    else if (k === 'm') mirror(0);
    else if (k === 'l' && state.sel.length > 1) $('toolbar').querySelector('[data-pop=align]').click();
  };
  window.addEventListener('keydown', onKey);
  const closeMenus = e => { if (!e.target.closest('.t-pop')) $('toolbar')?.querySelectorAll('.t-menu').forEach(m => m.classList.remove('open')); };
  document.addEventListener('click', closeMenus);

  const fileBase = () => `taller_${(state.objs.find(o => o.type === 'text')?.text || 'diseño').split('\n')[0]}`.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/g, '_').slice(0, 50);
  const guard = fn => () => { if (!result.length) return; try { fn(); } catch (err) { status(`⚠ ${esc(err.message)}`, 'error'); } };
  $('x3mf').addEventListener('click', guard(() => download(to3MF(result, { name: fileBase() }), `${fileBase()}.3mf`, 'model/3mf')));
  $('xstl').addEventListener('click', guard(() => download(mergedSTL(result), `${fileBase()}.stl`, 'model/stl')));
  $('xzip').addEventListener('click', guard(() => download(toSTLZip(result), `${fileBase()}_por_color.zip`, 'application/zip')));
  $('xcalc').addEventListener('click', guard(() => {
    const e = estimate(result), s = modelStats(result);
    sendToCalculator({ name: 'Diseño del Taller 3D', grams: e.grams, minutes: e.minutes, thumb: viewer.snapshot(), meta: `Taller 3D · ${s.size.map(v => v.toFixed(0)).join(' × ')} mm` });
  }));


  // ---------- Describí tu pieza (IA) ----------
  const aiMsg = (t, kind = '') => { $('aiMsg').className = `small ${kind || 'muted'}`; $('aiMsg').textContent = t; };
  main.querySelector('.t-ai-ideas').addEventListener('click', e => {
    const b = e.target.closest('button[data-idea]'); if (!b) return;
    $('aiPrompt').value = b.dataset.idea; $('aiPrompt').focus();
  });
  async function askAI() {
    const prompt = $('aiPrompt').value.trim();
    if (!prompt) { aiMsg('Escribí qué pieza querés.', 'warn'); return; }
    const btn = $('aiGo');
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Pensando…'; aiMsg('');
    const scene = $('aiScene').checked ? state.objs.filter(o => !o.hidden && o.type !== 'stl' && o.type !== 'image' && o.type !== 'group')
      .map(o => ({ type: o.type, name: o.name, x: o.x, y: o.y, z: o.z, w: o.w, d: o.d, h: o.h, rx: o.rx, ry: o.ry, rz: o.rz, color: o.color, hole: o.hole, text: o.text })) : [];
    const headers = { 'content-type': 'application/json' };
    const pass = (() => { try { return localStorage.getItem('g3d_lab_password'); } catch { return null; } })();
    if (pass) headers['x-lab-password'] = pass;
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}api/disenar`, { method: 'POST', headers, body: JSON.stringify({ prompt, scene }) });
      const data = await r.json().catch(() => ({ error: r.status === 404 ? 'La función de IA no está disponible acá (probá en la página publicada).' : `Error ${r.status}` }));
      if (r.status === 401 && data.code === 'bad_password') {
        const p = window.prompt('Escribí la clave del Lab (LAB_PASSWORD) para usar la IA:');
        if (p) { try { localStorage.setItem('g3d_lab_password', p); } catch { /* sin espacio */ } return askAI(); }
      }
      if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
      await applyAI(data);
      aiMsg(data.note || 'Listo.', 'ok');
    } catch (err) {
      aiMsg(err.message, 'warn');
    } finally {
      btn.disabled = false; btn.textContent = 'Crear con IA';
    }
  }
  /** Convierte la respuesta de la IA en objetos del Taller (agrupando los que comparten grupo). */
  async function applyAI({ objects, replace }) {
    const made = objects.map((o, i) => { const { group, ...rest } = o; const ob = makeObject(o.type, state.objs.length + i, rest); ob._g = group; return ob; });
    const groups = new Map(), loose = [];
    for (const o of made) { if (o._g) groups.set(o._g, [...(groups.get(o._g) || []), o]); else loose.push(o); delete o._g; }
    const final = [...loose];
    for (const [name, list] of groups) {
      if (list.length === 1) { final.push(list[0]); continue; }
      const g = await groupObjects(list, ctx, state.objs.length);
      g.name = name.charAt(0).toUpperCase() + name.slice(1);
      final.push(g);
    }
    if (replace) state.objs = [];
    // Si se agregan, los corre a la derecha de lo que ya existe para que no se encimen
    if (!replace && state.objs.length && !$('aiScene').checked) {
      const all = state.objs.flatMap(x => partsById.get(x.id) || []);
      if (all.length) { const b = partsBox(all); const minX = Math.min(...final.map(o => o.x - o.w / 2)); for (const o of final) o.x = r2(o.x + (b.max[0] + 10 - minX)); }
    }
    state.objs.push(...final);
    state.sel = final.map(o => o.id);
    changed();
    setTimeout(() => commands.fit(), 400);
  }
  $('aiGo').addEventListener('click', askAI);
  $('aiPrompt').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) askAI(); });

  drawList(); drawProps();
  await refresh();
  if (loaded?.focus) commands.fit();

  return () => {
    alive = false; clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('click', closeMenus);
    tc.dispose(); viewer.renderer.dispose(); collect([]);
  };
}
