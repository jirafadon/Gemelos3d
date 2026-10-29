/**
 * Taller 3D: editor libre estilo Tinkercad.
 * Formas, texto, imágenes y STL; manijas para mover, rotar y escalar; selección múltiple,
 * grupos con huecos, operaciones booleanas (unir, restar, intersecar), patrones lineales y circulares,
 * perfiles dibujados que se extruyen o revolucionan (como en FreeCAD), regla para medir,
 * deshacer, alinear, espejar, copiar y pegar. Exporta 3MF por color.
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
  groupObjects, ungroupObject, parseSTLMesh, sketchSize, OPS, groupLocal,
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
  union: '<path d="M9 4a6 6 0 1 0 0 12 6 6 0 0 0 6-6"/><path d="M15 20a6 6 0 1 0 0-12 6 6 0 0 0-6 6"/>',
  subtract: '<circle cx="9" cy="10" r="6"/><circle cx="15" cy="14" r="6" stroke-dasharray="2 2"/>',
  intersect: '<circle cx="9" cy="10" r="6" stroke-dasharray="2 2"/><circle cx="15" cy="14" r="6" stroke-dasharray="2 2"/><path d="M15 8.5a6 6 0 0 1-6 7"/><path d="M9 15.5a6 6 0 0 1 6-7"/>',
  pattern: '<rect x="3" y="9" width="5" height="6" rx="1"/><rect x="10" y="9" width="5" height="6" rx="1"/><rect x="17" y="9" width="4" height="6" rx="1"/><path d="M3 5h18M18 3l3 2-3 2"/>',
  ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  sketch: '<path d="M4 18l4-10 5 6 3-9 4 13z"/><circle cx="4" cy="18" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="13" cy="14" r="1.3"/><circle cx="16" cy="5" r="1.3"/><circle cx="20" cy="18" r="1.3"/>',
  workplane: '<path d="M3 15l9-5 9 5-9 5z"/><path d="M12 10V3M9 6l3-3 3 3"/>',
  revolve: '<ellipse cx="12" cy="18" rx="7" ry="2.5"/><path d="M12 3v15M12 4c4 2 5 6 4 14"/><path d="M19 9a8 3 0 0 1-3 2"/>',
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
};
const SHAPE_GROUPS = [
  ['Básicas', ['box', 'cylinder', 'sphere', 'cone', 'tube', 'wedge']],
  ['Más formas', ['roof', 'pyramid', 'halfsphere', 'torus', 'polygon', 'star', 'heart', 'paraboloid']],
  ['Texto, imagen y archivos', ['text', 'image', 'stl']],
];
const svg = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${SVG[n] || ''}</svg>`;

const INCOMING_KEY = 'g3d_taller_incoming';

/** Último diseño (copia de respaldo, para poder recuperarlo). */
export function loadScene() {
  try { const s = JSON.parse(localStorage.getItem(SCENE_KEY)); if (Array.isArray(s?.objs)) return s; } catch { /* vacío */ }
  return null;
}
const strip = o => {
  const c = { ...o };
  if (c.mesh && c.mesh.verts.length > 400000) { c.mesh = null; c.meshLost = true; }
  if (c.children) c.children = c.children.map(strip);
  return c;
};
export function saveScene(scene) {
  try { localStorage.setItem(SCENE_KEY, JSON.stringify({ objs: scene.objs.map(strip), sel: scene.sel || [] })); return true; } catch { return false; }
}
/** Pasa un objeto de un generador al Taller (se levanta una sola vez, al abrirlo). */
export function sendToTaller(item) {
  try {
    const prev = JSON.parse(localStorage.getItem(INCOMING_KEY) || 'null');
    const objs = [...(Array.isArray(prev?.objs) ? prev.objs : []), strip(item)];
    localStorage.setItem(INCOMING_KEY, JSON.stringify({ objs }));
    return true;
  } catch { return false; }
}
function takeIncoming() {
  try {
    const s = JSON.parse(localStorage.getItem(INCOMING_KEY) || 'null');
    localStorage.removeItem(INCOMING_KEY);
    return Array.isArray(s?.objs) && s.objs.length ? s : null;
  } catch { return null; }
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
  const isUnion = v => (v.op || 'union') === 'union';
  if (o.type === 'group') {
    p.push({ key: 'op', type: 'segment', label: 'Operación', default: 'union', options: [{ value: 'union', label: 'Agrupar' }, { value: 'subtract', label: 'Restar' }, { value: 'intersect', label: 'Intersecar' }],
      hint: 'Restar: al primer objeto le saca los demás. Intersecar: deja solo lo que comparten.' });
    p.push({ key: 'multicolor', type: 'toggle', label: 'Mantener los colores de cada pieza', default: true, show: v => !v.hole && isUnion(v) });
  }
  p.push({ key: 'color', type: 'color', label: 'Color', default: o.color, show: v => !v.hole && !(v.type === 'group' && isUnion(v) && v.multicolor !== false) });
  if (o.type === 'sketch') p.push(
    { key: 'op', type: 'segment', label: 'Operación', default: 'extrude', options: [{ value: 'extrude', label: 'Extruir' }, { value: 'revolve', label: 'Revolucionar' }] },
    { key: 'angle', type: 'number', label: 'Ángulo de giro', default: 360, min: 1, max: 360, step: 1, unit: '°', show: v => v.op === 'revolve' },
    { key: 'round', type: 'number', label: 'Redondeo de esquinas', default: 0, min: 0, max: 30, step: 0.5, unit: 'mm' },
    { key: 'edge', type: 'segment', label: 'Borde de arriba', default: 'none', options: [{ value: 'none', label: 'Recto' }, { value: 'chamfer', label: 'Chaflán' }, { value: 'fillet', label: 'Redondeado' }], show: v => v.op !== 'revolve' },
    { key: 'edgeSize', type: 'number', label: 'Tamaño del borde', default: 1, min: 0.2, max: 20, step: 0.2, unit: 'mm', show: v => v.op !== 'revolve' && v.edge !== 'none' },
    { key: 'ptsText', type: 'text', label: 'Puntos del perfil (x, y en mm, uno por línea)', default: '', multiline: true, hint: 'Podés corregir cualquier punto a mano.' });
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
      <ol class="t-steps"><li>Sumá formas, texto o un STL.</li><li>Movelas con las manijas y marcá huecos.</li><li>Exportá el 3MF por colores.</li></ol>

      <details class="t-sec" open>
        <summary>${svg('box')} Formas</summary>
        ${SHAPE_GROUPS.map(([title, list]) => `<p class="t-gtitle">${title}</p><div class="t-add">${list.map(k => k === 'stl'
          ? `<button data-add="stl" title="Importar uno o varios STL">${svg('stl')}<span>Importar STL</span></button>`
          : `<button data-add="${k}" title="Agregar ${TYPES[k].label}">${svg(k)}<span>${TYPES[k].label}</span></button>`).join('')}</div>`).join('')}
        <p class="t-gtitle">Dibujar (como en FreeCAD)</p>
        <div class="t-add t-add2">
          <button data-draw="extrude" title="Dibujá un perfil sobre la grilla y se levanta como pieza (P)">${svg('sketch')}<span>Perfil extruido</span></button>
          <button data-draw="revolve" title="Dibujá medio perfil y gira alrededor de su borde izquierdo">${svg('revolve')}<span>Perfil revolucionado</span></button>
        </div>
        <input type="file" id="stlFile" accept=".stl" multiple hidden>
      </details>

      <details class="t-sec" open>
        <summary>${svg('group')} Objetos <small id="objCount"></small></summary>
        <p class="muted small">Mayús + clic para elegir varios. Mayús + arrastrar en un lugar vacío: elegir con recuadro.</p>
        <button class="link t-recover" id="recover" hidden></button>
        <ul class="t-list" id="list"></ul>
      </details>
    </aside>
    <section class="gen-view">
      <div class="t-toolbar" id="toolbar">
        <div class="t-tools">
          <button data-tool="translate" class="on" title="Mover (1)">${svg('move')}</button>
          <button data-tool="rotate" title="Rotar (2)">${svg('rotate')}</button>
          <button data-tool="scale" title="Escalar (3)">${svg('scale')}</button>
          <button data-tool="measure" title="Regla: tocá dos puntos para medir (R)">${svg('ruler')}</button>
          <button data-tool="workplane" title="Plano de trabajo: tocá una cara y lo nuevo se apoya ahí (W)">${svg('workplane')}</button>
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
        <span class="t-sep"></span>
        <button data-bool="union" title="Unir: junta todo en una sola pieza">${svg('union')}</button>
        <button data-bool="subtract" title="Restar: al primero que elegiste le saca los demás">${svg('subtract')}</button>
        <button data-bool="intersect" title="Intersecar: deja solo la parte que comparten">${svg('intersect')}</button>
        <div class="t-pop"><button data-pop="pattern" title="Repetir en línea o en círculo">${svg('pattern')}</button>
          <div class="t-menu t-form" id="patternMenu">
            <div class="t-seg"><button data-pk="linear" class="on">En línea</button><button data-pk="circular">En círculo</button></div>
            <label>Copias en total <input type="number" id="pN" value="4" min="2" max="100" step="1"></label>
            <div class="pk-linear"><label>Separación X <input type="number" id="pDx" value="25" step="0.5"></label>
              <label>Separación Y <input type="number" id="pDy" value="0" step="0.5"></label>
              <label>Separación Z <input type="number" id="pDz" value="0" step="0.5"></label></div>
            <div class="pk-circular" hidden><label>Ángulo total <input type="number" id="pAng" value="360" min="1" max="360" step="1"></label>
              <label>Centro X <input type="number" id="pCx" value="0" step="0.5"></label>
              <label>Centro Y <input type="number" id="pCy" value="0" step="0.5"></label></div>
            <label class="chk"><input type="checkbox" id="pGroup" checked> Agrupar el resultado</label>
            <button class="primary" id="pGo">Repetir</button>
          </div></div>
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
        <button data-ortho title="Vista sin perspectiva: las medidas no se deforman">Ortogonal</button>
      </div>
      <div class="t-wp" id="wpchip" hidden><span id="wpText"></span><button id="wpReset">Volver a la cama</button></div>
      <div class="t-mode"><button data-mode="edit" class="on">Piezas</button><button data-mode="result">Resultado</button></div>
      <div class="t-dims" id="dims"></div>
      <div class="t-sketchbar" id="sketchbar" hidden>
        <b id="skTitle">Perfil</b>
        <span id="skHelp" class="muted">Tocá la grilla para poner puntos. Cerrá tocando el primero, con doble clic o Enter.</span>
        <label id="skHwrap">Alto <input type="number" id="skH" value="10" min="0.2" step="0.5"> mm</label>
        <button id="skUndo" title="Borrar el último punto (Retroceso)">Deshacer punto</button>
        <button class="primary" id="skDone">Terminar</button>
        <button id="skCancel">Cancelar</button>
      </div>
      <div class="t-ruler" id="ruler" hidden></div>
      <div class="t-rect" id="rect" hidden></div>
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
        <p class="muted small">1 / 2 / 3: mover, rotar, escalar · R: regla · W: plano de trabajo · P: dibujar perfil · Mayús + arrastrar: elegir con recuadro · Flechas: mover (Mayús ×10) · Re Pág / Av Pág: subir y bajar ·
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
  // Cada visita arranca de cero (o con lo que llegó de un generador).
  // El último diseño queda como respaldo y se puede recuperar con un botón.
  const incoming = takeIncoming();
  const previous = loadScene();
  const state = incoming ? { objs: incoming.objs, sel: [incoming.objs[incoming.objs.length - 1].id] } : demoScene();
  const loaded = incoming ? { focus: true } : null;
  if (incoming) saveScene(state); // lo que llegó de un generador también queda como respaldo
  let mode = 'edit', tool = 'translate', snap = 1;
  let special = null; // 'measure' | 'sketch'
  let rulerPts = [], sk = null, rectSel = null;
  let wp = null; // plano de trabajo: { point, normal, name }
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
    saveScene(state);
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
    const holder = o && mode === 'edit' && !special && !o.locked && !o.hidden ? viewer.items?.get(o.id) : null;
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
    for (const b of tb.querySelectorAll('[data-bool]')) b.disabled = n < 2;
    tb.querySelector('[data-pop=pattern]').disabled = !n;
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
    if (o.type === 'sketch') o.ptsText = o.pts.map(([x, y]) => `${r2(x)}, ${r2(y)}`).join('\n');
    $('props').innerHTML = `<h2>Propiedades</h2>${o.meshLost ? '<p class="warn small">Esta malla era muy pesada para guardarse; volvé a importar el STL.</p>' : ''}<div id="single"></div>`;
    renderParams($('single'), schemaFor(o), o, async (v, key) => {
      if (['name', 'hole', 'color', 'multicolor'].includes(key)) drawList();
      if (o.type === 'sketch' && ['ptsText', 'op', 'angle', 'round'].includes(key)) {
        if (key === 'ptsText') {
          const pts = String(o.ptsText).split('\n').map(l => l.split(/[,;\s]+/).filter(Boolean).map(Number)).filter(a => a.length >= 2 && a.every(Number.isFinite)).map(a => [a[0], a[1]]);
          if (pts.length < 3) { status('⚠ El perfil necesita al menos 3 puntos', 'error'); return; }
          o.pts = pts;
        }
        try { Object.assign(o, sketchSize(o, o.op === 'extrude' && key === 'op' ? 10 : o.h)); } catch (err) { status(`⚠ ${esc(err.message)}`, 'error'); return; }
        if (key === 'op' || key === 'angle') drawProps();
      }
      if (o.type === 'group' && key === 'op') {
        // El tamaño del grupo pasa a ser el de su nuevo resultado
        const local = await groupLocal(o, ctx);
        if (!local.box) { status('⚠ Con esa operación el grupo queda vacío', 'error'); return; }
        Object.assign(o, { w: r2(local.box.size[0]), d: r2(local.box.size[1]), h: r2(local.box.size[2]) });
        drawList(); drawProps();
      }
      schedule(['text', 'name', 'ptsText'].includes(key) ? 400 : 150);
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
    if (wp) placeOnWorkplane(o);
    else {
      // Lo ubica a la derecha de lo que ya hay, para que no quede tapado
      const all = state.objs.flatMap(x => partsById.get(x.id) || []);
      if (all.length) { const b = partsBox(all); o.x = r2(Math.ceil(b.max[0] + 6 + o.w / 2)); o.y = r2(Math.round(b.center[1])); }
    }
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

  // ---------- Plano de trabajo ----------
  /** Apoya un objeto nuevo sobre el plano: su base toca la cara y queda girado según ella. */
  function placeOnWorkplane(o) {
    const n = new THREE.Vector3(...wp.normal).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const e = new THREE.Euler().setFromQuaternion(q, 'ZYX');
    o.rx = r2(THREE.MathUtils.radToDeg(e.x)); o.ry = r2(THREE.MathUtils.radToDeg(e.y)); o.rz = r2(THREE.MathUtils.radToDeg(e.z));
    const m = new THREE.Matrix4().makeRotationFromQuaternion(q).elements;
    const hz = Math.abs(m[2]) * o.w / 2 + Math.abs(m[6]) * o.d / 2 + Math.abs(m[10]) * o.h / 2;
    const c = new THREE.Vector3(...wp.point).addScaledVector(n, o.h / 2);
    o.x = r2(c.x); o.y = r2(c.y); o.z = r2(c.z - hz);
  }
  function setWorkplane(next) {
    wp = next;
    viewer.setWorkplane(wp ? { point: wp.point, normal: wp.normal } : null, 50);
    $('wpchip').hidden = !wp;
    if (wp) $('wpText').textContent = `Plano de trabajo: sobre ${wp.name}${Math.abs(wp.normal[2]) > 0.99 ? '' : ' (cara inclinada)'}`;
  }
  /** Altura donde se dibujan los perfiles: arriba de la cara elegida si es horizontal. */
  const sketchZ = () => (wp && wp.normal[2] > 0.99 ? wp.point[2] : 0);

  // ---------- Operaciones booleanas ----------
  async function boolean(op) {
    const s = selection(); if (s.length < 2) return;
    status(`<span class="spin"></span> ${op === 'subtract' ? 'Restando' : op === 'intersect' ? 'Intersecando' : 'Uniendo'}…`);
    let g;
    try { g = await groupObjects(s, ctx, state.objs.filter(o => o.type === 'group').length, op); }
    catch (err) { status(`⚠ ${esc(err.message)}`, 'error'); return; }
    if (op === 'union') { g.multicolor = false; g.name = g.name.replace(/^Grupo/, 'Unión'); }
    const ids = new Set(s.map(o => o.id));
    const at = state.objs.findIndex(o => ids.has(o.id));
    state.objs = state.objs.filter(o => !ids.has(o.id));
    state.objs.splice(at, 0, g);
    state.sel = [g.id]; changed();
  }

  // ---------- Repetir (patrón lineal o circular) ----------
  let patternKind = 'linear';
  async function pattern() {
    const s = selection().filter(o => !o.locked); if (!s.length) return;
    const n = Math.max(2, Math.min(100, Math.round(+$('pN').value || 2)));
    const fresh = [];
    for (let i = 1; i < n; i++) {
      for (const o of s) {
        const c = cloneObj(o, true);
        if (patternKind === 'linear') {
          c.x = r2(o.x + (+$('pDx').value || 0) * i); c.y = r2(o.y + (+$('pDy').value || 0) * i); c.z = r2(o.z + (+$('pDz').value || 0) * i);
        } else {
          const total = Math.max(1, Math.min(360, +$('pAng').value || 360));
          const step = total >= 360 ? 360 / n : total / (n - 1);
          const a = THREE.MathUtils.degToRad(step * i), cx = +$('pCx').value || 0, cy = +$('pCy').value || 0;
          const dx = o.x - cx, dy = o.y - cy;
          c.x = r2(cx + dx * Math.cos(a) - dy * Math.sin(a)); c.y = r2(cy + dx * Math.sin(a) + dy * Math.cos(a));
          c.rz = r2(((o.rz || 0) + step * i + 180) % 360 - 180);
        }
        c.name = `${o.name} ${i + 1}`;
        fresh.push(c);
      }
    }
    state.objs.push(...fresh);
    state.sel = [...s.map(o => o.id), ...fresh.map(o => o.id)];
    if ($('pGroup').checked) {
      await commands.group();
      const g = primary();
      if (g?.type === 'group') { g.name = `Patrón ${patternKind === 'linear' ? 'en línea' : 'circular'} × ${n}`; drawList(); drawProps(); }
    } else changed();
  }

  // ---------- Herramientas especiales: regla y perfil ----------
  const view = $('viewer').closest('.gen-view');
  function setSpecial(next) {
    special = next;
    $('toolbar').querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', next ? x.dataset.tool === next : x.dataset.tool === tool));
    $('sketchbar').hidden = next !== 'sketch';
    if (next !== 'measure') { rulerPts = []; $('ruler').hidden = true; }
    if (next !== 'sketch') sk = null;
    canvas.style.cursor = next ? 'crosshair' : '';
    viewer.controls.enableRotate = next !== 'sketch'; // dibujando se mira desde arriba, sin girar
    if (!next) viewer.setOverlay();
    attachGizmo();
  }
  const fmt = v => (Math.round(v * 100) / 100).toLocaleString('es-AR');
  function drawRuler() {
    const pts = rulerPts.map(p => [p.x, p.y, p.z]);
    viewer.setOverlay({ lines: pts.length === 2 ? [pts] : [], points: pts });
    const el = $('ruler');
    if (pts.length < 2) { el.hidden = false; el.innerHTML = pts.length ? 'Tocá el segundo punto' : 'Tocá el primer punto a medir'; el.style.left = '50%'; el.style.top = '64px'; return; }
    const [a, b] = rulerPts, d = a.distanceTo(b);
    el.innerHTML = `<b>${fmt(d)} mm</b><span>X ${fmt(Math.abs(b.x - a.x))} · Y ${fmt(Math.abs(b.y - a.y))} · Z ${fmt(Math.abs(b.z - a.z))}</span>`;
    const m = viewer.project((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), r = view.getBoundingClientRect();
    el.hidden = false; el.style.left = `${m.x - r.left}px`; el.style.top = `${m.y - r.top - 40}px`;
  }
  function startSketch(op) {
    if (mode !== 'edit') main.querySelector('.t-mode [data-mode=edit]').click();
    setSpecial('sketch');
    sk = { op, pts: [], hover: null };
    $('skTitle').textContent = op === 'revolve' ? 'Perfil revolucionado' : 'Perfil extruido';
    $('skHelp').textContent = op === 'revolve'
      ? 'Dibujá medio perfil: gira alrededor de su borde izquierdo (línea punteada). Lo que dibujes hacia "arriba" en la grilla será el alto.'
      : 'Tocá la grilla para poner puntos. Cerrá tocando el primero, con doble clic o Enter.';
    $('skHwrap').hidden = op === 'revolve';
    viewer.setView('top'); main.querySelectorAll('.views button[data-view]').forEach(x => x.classList.toggle('on', x.dataset.view === 'top'));
    drawSketch();
  }
  const snapPt = p => [Math.round(p.x / snap) * snap, Math.round(p.y / snap) * snap];
  function drawSketch() {
    if (!sk) return;
    const zz = sketchZ() + 0.05;
    const P = sk.pts.map(([x, y]) => [x, y, zz]);
    const lines = [];
    for (let i = 1; i < P.length; i++) lines.push([P[i - 1], P[i]]);
    if (sk.hover && P.length) lines.push([P[P.length - 1], [sk.hover[0], sk.hover[1], zz]]);
    if (P.length > 2) lines.push([P[P.length - 1], P[0]]);
    const extra = [];
    if (sk.op === 'revolve' && (P.length || sk.hover)) {
      const all = [...sk.pts, ...(sk.hover ? [sk.hover] : [])];
      const minX = Math.min(...all.map(p => p[0])), y0 = Math.min(...all.map(p => p[1])) - 10, y1 = Math.max(...all.map(p => p[1])) + 10;
      for (let y = y0; y < y1; y += 4) extra.push([[minX, y, zz], [minX, Math.min(y + 2, y1), zz]]);
    }
    viewer.setOverlay({ lines: [...lines, ...extra], points: [...P, ...(sk.hover ? [[sk.hover[0], sk.hover[1], zz]] : [])], color: '#1d6fd8' });
  }
  function finishSketch() {
    if (!sk) return;
    const pts = sk.pts.filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
    if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
    if (pts.length < 3) { status('⚠ Poné al menos 3 puntos para cerrar el perfil', 'error'); return; }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const o = makeObject('sketch', state.objs.length, {
      name: `${sk.op === 'revolve' ? 'Revolución' : 'Perfil'} ${state.objs.filter(x => x.type === 'sketch').length + 1}`,
      pts: pts.map(([x, y]) => [r2(x - cx), r2(y - cy)]), op: sk.op, angle: 360,
    });
    try { Object.assign(o, sketchSize(o, Math.max(0.2, +$('skH').value || 10))); }
    catch (err) { status(`⚠ ${esc(err.message)}`, 'error'); return; }
    // Extruido: queda donde lo dibujaste. Revolucionado: el eje pasa por el borde izquierdo
    o.x = r2(sk.op === 'revolve' ? minX : cx); o.y = r2(cy); o.z = r2(sketchZ());
    state.objs.push(o); state.sel = [o.id];
    setSpecial(null);
    viewer.setView('iso'); main.querySelectorAll('.views button[data-view]').forEach(x => x.classList.toggle('on', x.dataset.view === 'iso'));
    changed();
  }

  // ---------- Eventos ----------
  const main = $('viewer').closest('main');
  main.querySelector('.gen-params').addEventListener('click', e => {
    const dr = e.target.closest('button[data-draw]');
    if (dr) { startSketch(dr.dataset.draw); return; }
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
    if (b.dataset.tool === 'measure') { setSpecial(special === 'measure' ? null : 'measure'); if (special) drawRuler(); return; }
    if (b.dataset.tool === 'workplane') { setSpecial(special === 'workplane' ? null : 'workplane'); if (special) status('Tocá la cara donde querés trabajar (o la cama para volver al piso)'); return; }
    if (b.dataset.bool) { await boolean(b.dataset.bool); return; }
    if (b.dataset.pk) {
      patternKind = b.dataset.pk;
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      $('patternMenu').querySelector('.pk-linear').hidden = patternKind !== 'linear';
      $('patternMenu').querySelector('.pk-circular').hidden = patternKind !== 'circular';
      return;
    }
    if (b.id === 'pGo') { b.closest('.t-menu').classList.remove('open'); await pattern(); return; }
    if (b.dataset.tool) {
      if (special) setSpecial(null);
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
  $('skDone').addEventListener('click', finishSketch);
  $('skCancel').addEventListener('click', () => setSpecial(null));
  $('skUndo').addEventListener('click', () => { if (sk) { sk.pts.pop(); drawSketch(); } });
  // Diseño anterior (respaldo de la última visita)
  if (previous?.objs?.length) {
    const rb = $('recover');
    rb.hidden = false;
    rb.textContent = `Abrir el diseño anterior (${previous.objs.length} objeto${previous.objs.length === 1 ? '' : 's'})`;
    rb.addEventListener('click', () => {
      state.objs = previous.objs.map(o => cloneObj(o)); state.sel = [];
      rb.hidden = true; changed();
      setTimeout(() => commands.fit(), 300);
    });
  }
  $('reset').addEventListener('click', () => {
    if (state.objs.length && !confirm('¿Borrar todo y empezar un diseño nuevo? (Podés deshacerlo)')) return;
    state.objs = []; state.sel = []; changed();
  });
  $('wpReset').addEventListener('click', () => setWorkplane(null));
  viewer.onCamera = cam => { tc.camera = cam; attachGizmo(); };
  main.querySelector('.views').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-ortho')) { viewer.setOrtho(!viewer.orthoOn); b.classList.toggle('on', viewer.orthoOn); return; }
    main.querySelectorAll('.views button[data-view]').forEach(x => x.classList.toggle('on', x === b));
    viewer.setView(b.dataset.view);
    if (special === 'measure' && rulerPts.length === 2) drawRuler();
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
    if (ev.button !== 0) return;
    if (special === 'measure') {
      const hit = viewer.pickPoint(ev); if (!hit) return;
      if (rulerPts.length >= 2) rulerPts = [];
      rulerPts.push(hit.point); drawRuler(); return;
    }
    if (special === 'workplane') {
      const hit = viewer.pickPoint(ev); if (!hit) return;
      const o = hit.id ? byId(hit.id) : null;
      setWorkplane(o ? { point: [r2(hit.point.x), r2(hit.point.y), r2(hit.point.z)], normal: [hit.normal.x, hit.normal.y, hit.normal.z].map(v => Math.round(v * 1e4) / 1e4), name: o.name } : null);
      status(''); setSpecial(null); return;
    }
    if (special === 'sketch' && sk) {
      const p = viewer.groundPoint(ev, sketchZ()); if (!p) return;
      const q = snapPt(p);
      if (sk.pts.length >= 3) {
        const f = viewer.project(sk.pts[0][0], sk.pts[0][1], sketchZ());
        if (Math.hypot(f.x - ev.clientX, f.y - ev.clientY) < 12) { finishSketch(); return; }
      }
      sk.pts.push(q); drawSketch(); return;
    }
    if (mode !== 'edit' || tc.axis) return;
    const id = viewer.pick(ev);
    if (!id && ev.shiftKey) {
      // Recuadro de selección
      rectSel = { x0: ev.clientX, y0: ev.clientY, x1: ev.clientX, y1: ev.clientY };
      viewer.controls.enabled = false;
      canvas.setPointerCapture(ev.pointerId);
      return;
    }
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
    if (special === 'sketch' && sk) { const p = viewer.groundPoint(ev, sketchZ()); sk.hover = p ? snapPt(p) : null; drawSketch(); return; }
    if (rectSel) {
      rectSel.x1 = ev.clientX; rectSel.y1 = ev.clientY;
      const r = view.getBoundingClientRect(), el = $('rect');
      el.hidden = false;
      el.style.left = `${Math.min(rectSel.x0, rectSel.x1) - r.left}px`; el.style.top = `${Math.min(rectSel.y0, rectSel.y1) - r.top}px`;
      el.style.width = `${Math.abs(rectSel.x1 - rectSel.x0)}px`; el.style.height = `${Math.abs(rectSel.y1 - rectSel.y0)}px`;
      return;
    }
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
  canvas.addEventListener('dblclick', () => { if (special === 'sketch') finishSketch(); });
  const endDrag = ev => {
    if (rectSel) {
      const R = rectSel; rectSel = null; $('rect').hidden = true; viewer.controls.enabled = true;
      const [xa, xb] = [Math.min(R.x0, R.x1), Math.max(R.x0, R.x1)], [ya, yb] = [Math.min(R.y0, R.y1), Math.max(R.y0, R.y1)];
      if (xb - xa < 4 && yb - ya < 4) return;
      const ids = state.objs.filter(o => !o.hidden).filter(o => {
        const b = boxOf(o); if (!b) return false;
        const c = viewer.project(...b.center);
        return c.x >= xa && c.x <= xb && c.y >= ya && c.y <= yb;
      }).map(o => o.id);
      state.sel = [...new Set([...state.sel, ...ids])]; drawList(); drawProps(); schedule(0, false);
      return;
    }
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
    if (special === 'sketch') {
      if (k === 'enter') { e.preventDefault(); finishSketch(); }
      else if (k === 'backspace' || k === 'delete') { e.preventDefault(); if (sk) { sk.pts.pop(); drawSketch(); } }
      else if (k === 'escape') setSpecial(null);
      return;
    }
    if (special === 'measure' && k === 'escape') { setSpecial(null); return; }
    if (!ctrl && k === 'r') { $('toolbar').querySelector('[data-tool=measure]').click(); return; }
    if (!ctrl && k === 'p') { startSketch('extrude'); return; }
    if (!ctrl && k === 'w') { $('toolbar').querySelector('[data-tool=workplane]').click(); return; }
    if (special === 'workplane' && k === 'escape') { setSpecial(null); status(''); return; }
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
