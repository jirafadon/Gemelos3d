/**
 * Taller 3D: editor libre estilo Tinkercad.
 * Sumás formas, las movés (arrastrando o con números), marcás huecos y exportás.
 */
import { initEngine, loadFont, collect, modelStats } from '../engine/index.js';
import { Viewer } from '../engine/viewer.js';
import { imageToMask } from '../engine/image.js';
import { to3MF, toSTLZip, mergedSTL, download } from '../engine/export.js';
import { estimate, sendToCalculator } from '../engine/cost.js';
import { renderParams } from '../ui/params.js';
import { icon } from '../ui/icons.js';
import { TYPES, makeObject, objectSolid, sceneParts, parseSTLMesh, newId } from './objects.js';

const KEY = 'g3d_taller_scene';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtTime = min => { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h ${m} min` : `${m} min`; };

const SHAPE_ICONS = {
  box: '<rect x="4" y="7" width="13" height="13" rx="1"/><path d="M4 7l4-4h13v13l-4 4M17 7l4-4"/>',
  cylinder: '<ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5"/>',
  sphere: '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="8.5" ry="3"/>',
  cone: '<path d="M12 3L5 19M12 3l7 16"/><ellipse cx="12" cy="19" rx="7" ry="2.5"/>',
  tube: '<ellipse cx="12" cy="5" rx="7" ry="2.5"/><ellipse cx="12" cy="5" rx="3.5" ry="1.2"/><path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5"/>',
  wedge: '<path d="M3 19h18L3 6z"/><path d="M3 6l4-3v13M21 19l-4-3"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  stl: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
};
const shapeIcon = t => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${SHAPE_ICONS[t]}</svg>`;

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s?.objs)) return s; } catch { /* vacío */ }
  return null;
}
function save(state) {
  const light = state.objs.map(o => (o.mesh && o.mesh.verts.length > 300000 ? { ...o, mesh: null, meshLost: true } : o));
  try { localStorage.setItem(KEY, JSON.stringify({ objs: light, sel: state.sel })); } catch { /* sin espacio */ }
}

function demoScene() {
  const base = makeObject('box', 0, { name: 'Base', w: 60, d: 40, h: 4, color: '#1D4ED8' });
  const txt = makeObject('text', 1, { name: 'Texto', text: 'Gemelos', w: 50, d: 12, h: 2, z: 4, color: '#F5F5F5' });
  const hole = makeObject('cylinder', 2, { name: 'Agujero', x: -24, y: 13, w: 5, d: 5, h: 10, hole: true });
  return { objs: [base, txt, hole], sel: txt.id };
}

function schemaFor(o) {
  const isShape = !['text', 'image'].includes(o.type);
  const p = [
    { type: 'group', label: TYPES[o.type].label },
    { key: 'name', type: 'text', label: 'Nombre', default: o.name },
    { key: 'hole', type: 'toggle', label: 'Hueco (resta a lo que toca)', default: false },
    { key: 'color', type: 'color', label: 'Color', default: o.color, show: v => !v.hole },
  ];
  if (o.type === 'text') p.push({ key: 'text', type: 'text', label: 'Texto', default: 'Hola', multiline: true }, { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo' });
  if (o.type === 'image') p.push(
    { key: 'image', type: 'image', label: 'Imagen', default: '' },
    { key: 'threshold', type: 'number', label: 'Sensibilidad', default: 128, min: 20, max: 240, step: 1, unit: '' },
    { key: 'invert', type: 'toggle', label: 'Invertir (tomar lo claro)', default: false });
  if (o.type === 'tube') p.push({ key: 'wall', type: 'number', label: 'Pared', default: 2, min: 0.4, max: 50, step: 0.2, unit: 'mm' });
  p.push(
    { type: 'group', label: 'Tamaño' },
    { key: 'w', type: 'number', label: 'Ancho (X)', default: o.w, min: 0.5, max: 300, step: 0.5, unit: 'mm' },
    { key: 'd', type: 'number', label: isShape ? 'Fondo (Y)' : 'Alto de la figura (Y)', default: o.d, min: 0.5, max: 300, step: 0.5, unit: 'mm' },
    { key: 'h', type: 'number', label: isShape ? 'Alto (Z)' : 'Espesor (Z)', default: o.h, min: 0.2, max: 300, step: 0.2, unit: 'mm' },
    { type: 'group', label: 'Posición' },
    { key: 'x', type: 'number', label: 'X', default: 0, min: -150, max: 150, step: 0.5, unit: 'mm' },
    { key: 'y', type: 'number', label: 'Y', default: 0, min: -150, max: 150, step: 0.5, unit: 'mm' },
    { key: 'z', type: 'number', label: 'Altura de la base (Z)', default: 0, min: -50, max: 300, step: 0.5, unit: 'mm' },
    { type: 'group', label: 'Rotación' },
    { key: 'rx', type: 'number', label: 'Alrededor de X', default: 0, min: -180, max: 180, step: 5, unit: '°' },
    { key: 'ry', type: 'number', label: 'Alrededor de Y', default: 0, min: -180, max: 180, step: 5, unit: '°' },
    { key: 'rz', type: 'number', label: 'Alrededor de Z', default: 0, min: -180, max: 180, step: 5, unit: '°' },
  );
  return p;
}

export async function renderTaller(app, headerHtml) {
  app.innerHTML = `${headerHtml}
  <main class="gen taller">
    <aside class="gen-params">
      <a class="back" href="#/">${icon('back')} Generadores</a>
      <h1>Taller 3D</h1>
      <p class="muted">Armá tu pieza con formas: sumá, mové, rotá y marcá huecos para restar. Arrastrá los objetos en la vista para moverlos.</p>
      <div class="t-add">${Object.entries(TYPES).map(([k, t]) => `<button data-add="${k}" title="Agregar ${t.label}">${shapeIcon(k)}<span>${k === 'stl' ? 'Importar STL' : t.label}</span></button>`).join('')}</div>
      <input type="file" id="stlFile" accept=".stl" hidden>
      <h3 class="t-h">Objetos</h3>
      <ul class="t-list" id="list"></ul>
      <div class="t-actions" id="actions"></div>
      <div id="props"></div>
    </aside>
    <section class="gen-view">
      <div class="viewer" id="viewer"></div>
      <div class="views">
        <button data-view="iso" class="on">3D</button><button data-view="top">Arriba</button><button data-view="front">Frente</button><button data-view="side">Costado</button>
      </div>
      <div class="t-mode"><button data-mode="edit" class="on">Piezas</button><button data-mode="result">Resultado</button></div>
      <div class="status" id="status"></div>
    </section>
    <aside class="gen-out">
      <h2>Resultado</h2>
      <div class="stats">
        <div><small>Medidas</small><b id="oSize">—</b></div>
        <div><small>Filamento</small><b id="oGrams">—</b></div>
        <div><small>Tiempo aprox.</small><b id="oTime">—</b></div>
        <div><small>Costo</small><b id="oCost">—</b></div>
      </div>
      <p class="muted small" id="oProfile"></p>
      <h3>Piezas por color</h3>
      <ul class="parts" id="oParts"></ul>
      <div class="exports">
        <button class="primary" id="x3mf">${icon('download')} 3MF con colores</button>
        <button id="xstl">${icon('download')} STL único</button>
        <button id="xzip">${icon('download')} STL por color (.zip)</button>
        <button class="ghost" id="xcalc">${icon('calc')} Mandar a la calculadora</button>
      </div>
      <h3>Atajos</h3>
      <p class="muted small">Flechas: mover 1 mm (con Mayús, 10 mm) · Re Pág / Av Pág: subir y bajar · Supr: borrar · Ctrl + D: duplicar</p>
      <button class="link" id="reset">Empezar un diseño nuevo</button>
    </aside>
  </main>`;

  const $ = id => document.getElementById(id);
  const status = (msg, kind = '') => { $('status').className = `status ${kind}`; $('status').innerHTML = msg; };
  status('<span class="spin"></span> Preparando el motor 3D…');
  await initEngine();
  const viewer = new Viewer($('viewer'));
  const ctx = { font: loadFont, image: (url, opts) => imageToMask(url, opts) };

  const state = load() || demoScene();
  let mode = 'edit';
  const solids = new Map(), keys = new Map();
  let parts = [], timer = null, alive = true, busy = false, again = false;
  const selected = () => state.objs.find(o => o.id === state.sel) || null;

  const keyOf = o => JSON.stringify({ ...o, name: 0, mesh: o.mesh ? o.mesh.verts.length : 0 });

  async function refresh() {
    if (busy) { again = true; return; }
    busy = true;
    try {
      for (const o of state.objs) {
        const k = keyOf(o);
        if (keys.get(o.id) !== k || !solids.get(o.id)) {
          try { solids.set(o.id, await objectSolid(o, ctx)); keys.set(o.id, k); o.error = ''; }
          catch (err) { o.error = err.message; solids.delete(o.id); }
        }
      }
      for (const id of [...solids.keys()]) if (!state.objs.some(o => o.id === id)) { solids.delete(id); keys.delete(id); }
      parts = sceneParts(state.objs, solids);
      if (!alive) return;
      if (mode === 'result') viewer.setObjects(parts.map((p, i) => ({ id: `r${i}`, solid: p.solid, color: p.color })), null);
      else viewer.setObjects(state.objs.filter(o => solids.get(o.id)).map(o => ({ ...o, solid: solids.get(o.id) })), state.sel);
      collect([...solids.values(), ...parts.map(p => p.solid)]);
      showOutputs();
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
  const schedule = (ms = 120) => { save(state); clearTimeout(timer); timer = setTimeout(refresh, ms); };

  function showOutputs() {
    if (!parts.length) {
      ['oSize', 'oGrams', 'oTime', 'oCost'].forEach(id => { $(id).textContent = '—'; });
      $('oParts').innerHTML = '<li class="muted">Agregá una forma para empezar.</li>';
      return;
    }
    const s = modelStats(parts), e = estimate(parts);
    $('oSize').textContent = s.size.map(v => v.toFixed(1)).join(' × ') + ' mm';
    $('oGrams').textContent = `${e.grams.toFixed(1)} g`;
    $('oTime').textContent = fmtTime(e.minutes);
    $('oCost').textContent = money(e.cost);
    $('oProfile').textContent = `Estimado con el perfil "${e.profile}". Precio sugerido: ${money(e.price)}.`;
    $('oParts').innerHTML = parts.map(p => `<li><i style="background:${p.color}"></i>${esc(p.name)}<span>${(p.solid.volume() / 1000).toFixed(1)} cm³</span></li>`).join('');
  }

  function drawList() {
    $('list').innerHTML = state.objs.length ? state.objs.map(o => `<li data-id="${o.id}" class="${o.id === state.sel ? 'on' : ''}">
      ${o.hole ? '<i class="hole"></i>' : `<i style="background:${o.color}"></i>`}${shapeIcon(o.type)}<span>${esc(o.name)}</span>${o.hole ? '<em>hueco</em>' : ''}</li>`).join('')
      : '<li class="muted">Todavía no hay objetos.</li>';
    $('actions').innerHTML = selected() ? `
      <button data-act="dup">Duplicar</button><button data-act="floor">Apoyar en la cama</button>
      <button data-act="center">Centrar</button><button data-act="del" class="danger">Borrar</button>` : '';
  }

  function drawProps() {
    const o = selected();
    if (!o) { $('props').innerHTML = '<p class="muted small">Tocá un objeto en la vista o en la lista para editarlo.</p>'; return; }
    renderParams($('props'), schemaFor(o), o, (v, key) => {
      if (key === 'name' || key === 'hole' || key === 'color') drawList();
      schedule();
    });
  }

  const select = id => { state.sel = id; drawList(); drawProps(); schedule(0); };

  function add(type, extra = {}) {
    const o = makeObject(type, state.objs.length, extra);
    // Lo ubica un poco corrido para que no quede tapado
    o.x = Math.round((state.objs.length % 5) * 6 - 12); o.y = Math.round(Math.floor(state.objs.length / 5) * 6 - 6);
    state.objs.push(o);
    select(o.id);
  }

  // ---------- Eventos ----------
  $('viewer').closest('main').querySelector('.t-add').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add === 'stl') $('stlFile').click(); else add(b.dataset.add);
  });
  $('stlFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      status('<span class="spin"></span> Leyendo el STL…');
      const mesh = parseSTLMesh(await f.arrayBuffer());
      const v = mesh.verts, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v[i + k]); max[k] = Math.max(max[k], v[i + k]); }
      add('stl', { name: f.name.replace(/\.stl$/i, ''), mesh, w: +(max[0] - min[0]).toFixed(2), d: +(max[1] - min[1]).toFixed(2), h: +(max[2] - min[2]).toFixed(2) });
    } catch (err) { status(`⚠ ${esc(err.message)}`, 'error'); }
  });
  $('list').addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li) select(li.dataset.id); });
  $('actions').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act, o = selected();
    if (!act || !o) return;
    if (act === 'del') { state.objs = state.objs.filter(x => x !== o); state.sel = state.objs.at(-1)?.id || null; }
    if (act === 'dup') { const c = { ...o, id: newId(), name: `${o.name} (copia)`, x: o.x + 5, y: o.y - 5 }; state.objs.push(c); state.sel = c.id; }
    if (act === 'floor') o.z = 0;
    if (act === 'center') { o.x = 0; o.y = 0; }
    drawList(); drawProps(); schedule(0);
  });
  $('reset').addEventListener('click', () => {
    if (state.objs.length && !confirm('¿Borrar todo y empezar un diseño nuevo?')) return;
    state.objs = []; state.sel = null; drawList(); drawProps(); schedule(0);
  });
  document.querySelector('.views').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('.views button').forEach(x => x.classList.toggle('on', x === b));
    viewer.setView(b.dataset.view);
  });
  document.querySelector('.t-mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    mode = b.dataset.mode;
    document.querySelectorAll('.t-mode button').forEach(x => x.classList.toggle('on', x === b));
    schedule(0);
  });

  // Arrastrar para mover (en el plano de la base del objeto)
  const canvas = viewer.renderer.domElement;
  let drag = null;
  canvas.addEventListener('pointerdown', ev => {
    if (mode !== 'edit' || ev.button !== 0) return;
    const id = viewer.pick(ev);
    drag = { start: [ev.clientX, ev.clientY], id, moved: false };
    if (!id) return;
    const o = state.objs.find(x => x.id === id);
    const p = viewer.groundPoint(ev, o.z);
    if (!p) return;
    Object.assign(drag, { o, off: [o.x - p.x, o.y - p.y], from: [o.x, o.y], mesh: viewer.group.children.find(m => m.userData.id === id) });
    viewer.controls.enabled = false;
    canvas.setPointerCapture(ev.pointerId);
    if (state.sel !== id) { state.sel = id; drawList(); drawProps(); viewer.setObjects(state.objs.filter(x => solids.get(x.id)).map(x => ({ ...x, solid: solids.get(x.id) })), id); drag.mesh = viewer.group.children.find(m => m.userData.id === id); }
  });
  canvas.addEventListener('pointermove', ev => {
    if (!drag || !drag.o) return;
    if (Math.hypot(ev.clientX - drag.start[0], ev.clientY - drag.start[1]) > 3) drag.moved = true;
    const p = viewer.groundPoint(ev, drag.o.z);
    if (!p) return;
    const nx = Math.round((p.x + drag.off[0]) * 2) / 2, ny = Math.round((p.y + drag.off[1]) * 2) / 2;
    drag.next = [nx, ny];
    if (drag.mesh) { drag.mesh.position.set(nx - drag.from[0], ny - drag.from[1], 0); viewer.render(); }
  });
  const endDrag = ev => {
    if (!drag) return;
    const d = drag; drag = null;
    viewer.controls.enabled = true;
    if (d.o && d.moved && d.next) { d.o.x = d.next[0]; d.o.y = d.next[1]; drawProps(); schedule(0); }
    else if (!d.id && Math.hypot(ev.clientX - d.start[0], ev.clientY - d.start[1]) < 3 && state.sel) { state.sel = null; drawList(); drawProps(); schedule(0); }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const onKey = e => {
    const o = selected();
    if (!o || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    const step = e.shiftKey ? 10 : 1;
    const moves = { ArrowLeft: ['x', -step], ArrowRight: ['x', step], ArrowUp: ['y', step], ArrowDown: ['y', -step], PageUp: ['z', step], PageDown: ['z', -step] };
    if (moves[e.key]) { const [k, dv] = moves[e.key]; o[k] = +(o[k] + dv).toFixed(2); e.preventDefault(); drawProps(); schedule(0); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { $('actions').querySelector('[data-act=del]')?.click(); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { $('actions').querySelector('[data-act=dup]')?.click(); e.preventDefault(); }
  };
  window.addEventListener('keydown', onKey);

  const fileBase = () => `taller_${(state.objs.find(o => o.type === 'text')?.text || 'diseño').split('\n')[0]}`.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/g, '_').slice(0, 50);
  const guard = fn => () => { if (!parts.length) return; try { fn(); } catch (err) { status(`⚠ ${esc(err.message)}`, 'error'); } };
  $('x3mf').addEventListener('click', guard(() => download(to3MF(parts, { name: fileBase() }), `${fileBase()}.3mf`, 'model/3mf')));
  $('xstl').addEventListener('click', guard(() => download(mergedSTL(parts), `${fileBase()}.stl`, 'model/stl')));
  $('xzip').addEventListener('click', guard(() => download(toSTLZip(parts), `${fileBase()}_por_color.zip`, 'application/zip')));
  $('xcalc').addEventListener('click', guard(() => {
    const e = estimate(parts), s = modelStats(parts);
    sendToCalculator({ name: 'Diseño del Taller 3D', grams: e.grams, minutes: e.minutes, thumb: viewer.snapshot(), meta: `Taller 3D · ${s.size.map(v => v.toFixed(0)).join(' × ')} mm` });
  }));

  drawList(); drawProps();
  await refresh();

  return () => { alive = false; clearTimeout(timer); window.removeEventListener('keydown', onKey); viewer.renderer.dispose(); collect([]); };
}
