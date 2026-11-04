/**
 * Separador por colores: cargás un STL o 3MF, elegís una parte (varita o pincel),
 * decidís cómo se corta (plano o curvo) y cómo encastra, y exportás una pieza por color.
 * Todo corre en el navegador.
 */
import * as THREE from 'three';
import { initEngine, wasm, collect } from '../engine/index.js';
import { Viewer } from '../engine/viewer.js';
import { solidToTriangles, to3MF, toSTLZip, toSTL, download } from '../engine/export.js';
import { parseSTLMesh, meshToManifold } from '../taller/objects.js';
import { unzipSync, strFromU8 } from 'fflate';
import { icon } from '../ui/icons.js';
import {
  MATERIALS, meshInfo, wandSelect, brushSelect, fitPlane, planeCutter, skinCutter, applyCut, addJoint, checkPart, sampleModel, boundaryEdges, clean,
} from './split-core.js';

const PALETTE = ['#E63946', '#2A9D8F', '#F4A261', '#457B9D', '#8AC926', '#FFCA3A', '#6A4C93', '#1E1E1E', '#F5F5F5', '#FF85A1'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n, d = 1) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d });

/* ---------- Lectura de 3MF (objetos y componentes, con sus transformaciones) ---------- */
function read3MF(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const models = Object.keys(files).filter(n => /\.model$/i.test(n));
  if (!models.length) throw new Error('El 3MF no trae modelos');
  const SCALE = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };
  const parseT = s => { const a = (s || '').trim().split(/\s+/).map(Number); return a.length === 12 && a.every(isFinite) ? a : [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]; };
  const comp = (a, b) => { const r = new Array(12); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; for (let j = 0; j < 3; j++) r[9 + j] = a[9] * b[j] + a[10] * b[3 + j] + a[11] * b[6 + j] + b[9 + j]; return r; };
  const objects = {};
  const root = models.find(n => /^3D\/3dmodel\.model$/i.test(n)) || models[0];
  let rootDoc = null;
  for (const path of models) {
    const doc = new DOMParser().parseFromString(strFromU8(files[path]), 'application/xml');
    const s = SCALE[doc.getElementsByTagName('model')[0]?.getAttribute('unit') || 'millimeter'] || 1;
    if (path === root) rootDoc = doc;
    for (const obj of doc.getElementsByTagName('object')) {
      const key = '/' + path + '#' + obj.getAttribute('id');
      const mesh = obj.getElementsByTagName('mesh')[0];
      if (mesh) {
        const vs = mesh.getElementsByTagName('vertex'), ts = mesh.getElementsByTagName('triangle');
        const verts = new Array(vs.length * 3), tris = new Array(ts.length * 3);
        for (let i = 0; i < vs.length; i++) { verts[i * 3] = +vs[i].getAttribute('x') * s; verts[i * 3 + 1] = +vs[i].getAttribute('y') * s; verts[i * 3 + 2] = +vs[i].getAttribute('z') * s; }
        for (let i = 0; i < ts.length; i++) { tris[i * 3] = +ts[i].getAttribute('v1'); tris[i * 3 + 1] = +ts[i].getAttribute('v2'); tris[i * 3 + 2] = +ts[i].getAttribute('v3'); }
        objects[key] = { verts, tris, name: obj.getAttribute('name') };
      } else {
        objects[key] = { comps: [...obj.getElementsByTagName('component')].map(c => { const p = c.getAttribute('p:path') || c.getAttribute('path'); return { ref: (p ? (p.startsWith('/') ? p : '/' + p) : '/' + path) + '#' + c.getAttribute('objectid'), m: parseT(c.getAttribute('transform')) }; }), name: obj.getAttribute('name') };
      }
    }
  }
  const out = [];
  const walk = (key, m, depth, name) => {
    const o = objects[key]; if (!o || depth > 10) return;
    if (o.verts) {
      const v = o.verts.slice();
      for (let i = 0; i < v.length; i += 3) { const x = v[i], y = v[i + 1], z = v[i + 2]; v[i] = x * m[0] + y * m[3] + z * m[6] + m[9]; v[i + 1] = x * m[1] + y * m[4] + z * m[7] + m[10]; v[i + 2] = x * m[2] + y * m[5] + z * m[8] + m[11]; }
      out.push({ name: o.name || name, verts: v, tris: o.tris });
    } else o.comps.forEach(c => walk(c.ref, comp(c.m, m), depth + 1, o.name || name));
  };
  for (const it of rootDoc.getElementsByTagName('item')) walk('/' + root + '#' + it.getAttribute('objectid'), parseT(it.getAttribute('transform')), 0, 'Pieza');
  if (!out.length) throw new Error('El 3MF no trae mallas');
  return out;
}

/* ---------- Pantalla ---------- */
export async function renderSplitter(app, headerHtml) {
  app.innerHTML = `${headerHtml}
  <main class="sp">
    <aside class="sp-left">
      <a class="back" href="#/">${icon('back')} Inicio</a>
      <h1>Separar por colores</h1>
      <p class="muted small">Elegís una parte del modelo, el programa la corta con un encastre y te da una pieza por color.</p>
      <ol class="sp-steps" id="steps">
        <li data-s="1"><b>1</b> Cargar el modelo</li>
        <li data-s="2"><b>2</b> Elegir la parte</li>
        <li data-s="3"><b>3</b> Cómo se corta</li>
        <li data-s="4"><b>4</b> Encastre</li>
        <li data-s="5"><b>5</b> Exportar</li>
      </ol>

      <section class="sp-sec" data-sec="1">
        <h2>1 · Cargar el modelo</h2>
        <label class="sp-drop" id="drop"><input type="file" id="file" accept=".stl,.3mf" hidden>
          <b>Abrir STL o 3MF</b><span>o soltalo acá · el original no se toca</span></label>
        <button class="sp-btn wide" id="sample">Probar con el muñeco de nieve de ejemplo</button>
        <div class="sp-row" style="margin-top:10px"><span class="muted small">Girar:</span>
          <button class="sp-btn sm" data-rot="0">X +90°</button><button class="sp-btn sm" data-rot="1">Y +90°</button><button class="sp-btn sm" data-rot="2">Z +90°</button></div>
        <button class="sp-btn sm wide" id="layFace" style="margin-top:6px">Apoyar una cara en la cama (tocá la cara)</button>
      </section>

      <section class="sp-sec" data-sec="2">
        <h2>2 · Elegir la parte</h2>
        <div class="sp-seg" id="toolSeg"><button data-tool="wand" class="on">Varita</button><button data-tool="brush">Pincel</button><button data-tool="erase">Borrar</button></div>
        <div id="wandOpts"><label class="sp-l">Qué tan lejos se expande <output id="angO"></output></label><input type="range" id="ang" min="5" max="70" step="1" value="28">
          <p class="muted small">Tocá la parte (una nariz, un gorro, un ojo): se toma hasta donde la forma quiebra. <kbd>Ctrl</kbd> + clic suma otra parte al mismo corte.</p></div>
        <div id="brushOpts" hidden><label class="sp-l">Tamaño del pincel <output id="brO"></output></label><input type="range" id="br" min="1" max="30" step="0.5" value="5">
          <p class="muted small">Arrastrá sobre el modelo para pintar lo que querés separar. Para girar la vista, arrastrá fuera del modelo.</p></div>
        <div class="sp-row"><button class="sp-btn sm" id="selClear">Limpiar</button><button class="sp-btn sm" id="selGrow">Agrandar</button><button class="sp-btn sm" id="selShrink">Achicar</button></div>
        <p class="sp-info" id="selInfo">Nada elegido todavía.</p>
        <button class="sp-btn sm wide" id="bodies">Separar cuerpos sueltos (si la parte ya es independiente)</button>
      </section>

      <section class="sp-sec" data-sec="3">
        <h2>3 · Cómo se corta</h2>
        <div class="sp-seg" id="closeSeg"><button data-close="flat" class="on">Cierre plano</button><button data-close="curved">Cierre curvo</button></div>
        <div id="flatOpts"><label class="sp-l">Profundidad del corte <output id="depO"></output></label><input type="range" id="dep" min="-5" max="15" step="0.1" value="0.4">
          <p class="muted small">Plano: la pieza se imprime apoyada sobre la cara del corte. Más profundidad = más pieza y más lugar para el encastre.</p></div>
        <div id="curvedOpts" hidden><label class="sp-l">Espesor de la pieza <output id="thO"></output></label><input type="range" id="th" min="0.6" max="6" step="0.1" value="1.6">
          <p class="muted small">Curvo: la pieza copia la superficie, como una cáscara. Ideal para manchas, ojos o parches.</p></div>
        <div class="sp-row"><button class="sp-btn" id="preview">Previsualizar</button><label class="sp-check"><input type="checkbox" id="ghost"> Ver a través</label></div>
      </section>

      <section class="sp-sec" data-sec="4">
        <h2>4 · Encastre</h2>
        <div class="sp-seg four" id="jointSeg"><button data-joint="none">Sin</button><button data-joint="peg" class="on">Tetón</button><button data-joint="double">Doble</button><button data-joint="key">Llave</button></div>
        <label class="sp-l">Material</label>
        <select class="sp-in" id="mat">${MATERIALS.map(m => `<option value="${m.id}">${m.label} · holgura ${String(m.gap).replace('.', ',')} mm</option>`).join('')}<option value="custom">Holgura propia</option></select>
        <div id="gapBox" hidden><label class="sp-l">Holgura radial <output id="gapO"></output></label><input type="range" id="gap" min="0.05" max="0.6" step="0.01" value="0.15"></div>
        <p class="muted small">El tetón sale de la pieza nueva y entra en un agujero del resto. Se verifica que el agujero no atraviese la pared. La llave cuadrada no deja que gire.</p>
        <button class="sp-btn primary wide" id="apply">Aplicar el corte</button>
        <p class="sp-info" id="cutInfo"></p>
      </section>

      <section class="sp-sec" data-sec="5">
        <h2>5 · Exportar</h2>
        <button class="sp-btn primary wide" id="x3mf">${icon('download')} 3MF con colores (se arma solo en el laminador)</button>
        <button class="sp-btn wide" id="xzip">${icon('download')} ZIP con un STL por pieza</button>
      </section>
    </aside>

    <section class="sp-view">
      <div class="sp-bar">
        <button class="sp-btn sm" data-view="iso">Iso</button><button class="sp-btn sm" data-view="front">Frente</button><button class="sp-btn sm" data-view="side">Costado</button><button class="sp-btn sm" data-view="top">Arriba</button><button class="sp-btn sm" data-view="bottom">Abajo</button>
        <span class="sp-sp"></span>
        <button class="sp-btn sm" id="undo" title="Deshacer (Ctrl+Z)">↶</button><button class="sp-btn sm" id="redo" title="Rehacer (Ctrl+Y)">↷</button>
      </div>
      <div class="sp-canvas" id="viewer"><div class="sp-empty" id="empty"><b>Separá tu modelo por colores</b><span>Abrí un STL o 3MF, o probá con el ejemplo.</span></div></div>
      <div class="sp-status" id="status">Listo.</div>
    </section>

    <aside class="sp-right">
      <h3>Modelo</h3>
      <dl class="sp-dl" id="modelInfo"><dt>Archivo</dt><dd>—</dd></dl>
      <h3>Piezas <small id="pcount"></small></h3>
      <ul class="sp-parts" id="parts"></ul>
      <p class="muted small">Tocá una pieza para seguir cortándola. El color es el que va al 3MF.</p>
      <h3>Estado</h3>
      <div id="health" class="sp-health"></div>
    </aside>
  </main>`;

  await initEngine();
  const $ = id => app.querySelector('#' + id);
  const viewer = new Viewer($('viewer'));
  viewer.setView('iso');

  // ---------- Estado ----------
  const S = {
    fileName: '', original: 0, parts: [], active: 0, info: null, sel: new Set(),
    tool: 'wand', close: 'flat', joint: 'peg', preview: null, ghost: false, mode: null,
  };
  const undo = [], redo = [];
  const snap = () => ({ parts: S.parts.map(p => ({ ...p })), active: S.active });
  const push = () => { undo.push(snap()); if (undo.length > 40) undo.shift(); redo.length = 0; };
  const status = (t, bad) => { const s = $('status'); s.textContent = t; s.classList.toggle('bad', !!bad); };
  const busy = async (msg, fn) => { status(msg); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 20))); try { return await fn(); } catch (e) { console.error(e); status(e.message || 'Algo falló', true); } };

  // ---------- Dibujo ----------
  let meshes = [], offset = new THREE.Vector3();
  function placeOffset() {
    const box = new THREE.Box3();
    for (const p of S.parts) { const b = p.solid.boundingBox(); box.expandByPoint(new THREE.Vector3(...b.min)); box.expandByPoint(new THREE.Vector3(...b.max)); }
    const c = box.getCenter(new THREE.Vector3());
    offset.set(-c.x, -c.y, -box.min.z);
    const size = box.getSize(new THREE.Vector3());
    viewer.updateGrid(Math.max(size.x, size.y));
    viewer.fit(Math.max(size.x, size.y, size.z), size.z);
  }
  function geoOf(solid, color, selSet) {
    const pos = solidToTriangles(solid), nt = pos.length / 9;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const col = new Float32Array(nt * 9), base = new THREE.Color(color), hi = new THREE.Color('#00c2ff');
    for (let t = 0; t < nt; t++) { const c = selSet && selSet.has(t) ? hi : base; for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], t * 9 + k * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }
  function draw() {
    for (const m of meshes) { m.geometry.dispose(); m.material.dispose(); viewer.group.remove(m); }
    meshes = [];
    viewer.group.position.copy(offset);
    const list = [];
    S.parts.forEach((p, i) => {
      if (S.preview && i === S.active) {
        list.push({ solid: S.preview.rest, color: p.color, i, prev: true }, { solid: S.preview.inside, color: S.preview.color, i: -1, prev: true });
      } else list.push({ solid: p.solid, color: p.color, i, sel: i === S.active ? S.sel : null });
    });
    for (const it of list) {
      const geo = geoOf(it.solid, it.color, it.sel);
      const dim = S.ghost || (S.parts.length > 1 && it.i !== S.active && it.i !== -1 && S.mode !== 'face');
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.02, transparent: dim, opacity: S.ghost ? 0.45 : dim ? 0.55 : 1, depthWrite: !S.ghost });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.part = it.i;
      viewer.group.add(mesh); meshes.push(mesh);
    }
    // Plano del corte en la previsualización
    if (S.preview && S.preview.edges) viewer.setOverlay({ lines: S.preview.edges.map(([a, b]) => [add3(a, offset), add3(b, offset)]), color: '#ff2d55' });
    else viewer.setOverlay({});
    viewer.render();
  }
  const add3 = (p, o) => [p[0] + o.x, p[1] + o.y, p[2] + o.z];

  // ---------- Paneles ----------
  function renderParts() {
    $('pcount').textContent = S.parts.length ? `(${S.parts.length})` : '';
    $('parts').innerHTML = S.parts.map((p, i) => `<li class="${i === S.active ? 'on' : ''}" data-i="${i}">
      <input type="color" value="${p.color}" data-color="${i}" title="Color">
      <input class="sp-pname" value="${esc(p.name)}" data-name="${i}">
      <button class="sp-btn sm" data-stl="${i}" title="Bajar solo esta pieza">STL</button></li>`).join('');
    const total = S.parts.reduce((a, p) => a + p.check.volume, 0);
    const bad = S.parts.filter(p => !p.check.ok);
    const drift = S.original ? Math.abs(total - S.original) / S.original : 0;
    $('health').innerHTML = !S.parts.length ? '<p class="muted small">Cargá un modelo.</p>' : `
      <p class="${bad.length ? 'bad' : 'ok'}">● ${bad.length ? `${bad.length} pieza(s) con problemas` : 'Todas las piezas están cerradas y listas para laminar.'}</p>
      <p class="${drift > 0.02 ? 'warn' : 'ok'}">● Volumen: ${fmt(total / 1000, 2)} cm³ ${S.original ? `(original ${fmt(S.original / 1000, 2)} cm³)` : ''}</p>
      ${S.parts.map(p => `<p class="small ${p.check.bodies > 1 ? 'warn' : 'muted'}">${esc(p.name)}: ${fmt(p.check.volume / 1000, 2)} cm³ · ${p.check.tris.toLocaleString('es-AR')} triángulos${p.check.bodies > 1 ? ` · ${p.check.bodies} cuerpos sueltos` : ''}</p>`).join('')}`;
  }
  function renderModelInfo() {
    if (!S.parts.length) return;
    const box = [[1e9, 1e9, 1e9], [-1e9, -1e9, -1e9]];
    let tris = 0;
    for (const p of S.parts) { const b = p.solid.boundingBox(); for (let i = 0; i < 3; i++) { box[0][i] = Math.min(box[0][i], b.min[i]); box[1][i] = Math.max(box[1][i], b.max[i]); } tris += p.check.tris; }
    const sz = [0, 1, 2].map(i => box[1][i] - box[0][i]);
    $('modelInfo').innerHTML = `<dt>Archivo</dt><dd>${esc(S.fileName)}</dd><dt>Medidas</dt><dd>${sz.map(v => fmt(v)).join(' × ')} mm</dd><dt>Triángulos</dt><dd>${tris.toLocaleString('es-AR')}</dd><dt>Volumen</dt><dd>${fmt(S.original / 1000, 2)} cm³</dd>`;
  }
  function stepOn() {
    const s = !S.parts.length ? 1 : S.preview ? 4 : S.sel.size ? 3 : S.parts.length > 1 ? 5 : 2;
    app.querySelectorAll('#steps li').forEach(li => li.classList.toggle('on', +li.dataset.s === s));
    app.querySelectorAll('.sp-sec').forEach(sec => sec.classList.toggle('dim', !S.parts.length && sec.dataset.sec !== '1'));
    $('selInfo').textContent = S.sel.size ? `${S.sel.size.toLocaleString('es-AR')} triángulos elegidos en «${S.parts[S.active]?.name}».` : 'Nada elegido todavía.';
    $('empty').hidden = !!S.parts.length;
  }
  function refreshAll(redraw = true) { renderParts(); renderModelInfo(); stepOn(); if (redraw) draw(); }

  function setActive(i) {
    S.active = Math.max(0, Math.min(i, S.parts.length - 1));
    S.sel = new Set(); S.preview = null;
    S.info = S.parts.length ? meshInfo(S.parts[S.active].solid) : null;
  }
  const mkPart = (name, color, solid) => ({ name, color, solid, check: checkPart(solid) });

  // ---------- Carga ----------
  function loadSolids(list, name) {
    S.fileName = name;
    S.parts = list.map((x, i) => mkPart(x.name || (list.length > 1 ? `Pieza ${i + 1}` : 'Cuerpo'), PALETTE[(i + 8) % PALETTE.length], x.solid));
    S.original = S.parts.reduce((a, p) => a + p.check.volume, 0);
    undo.length = redo.length = 0;
    setActive(0); placeOffset(); refreshAll();
    status(`Modelo cargado: ${S.parts.reduce((a, p) => a + p.check.tris, 0).toLocaleString('es-AR')} triángulos. Ahora tocá la parte que querés separar.`);
  }
  async function openFile(f) {
    await busy(`Leyendo ${f.name}…`, async () => {
      const buf = await f.arrayBuffer();
      let list;
      if (/\.3mf$/i.test(f.name)) list = read3MF(buf).map(o => ({ name: o.name, solid: meshToManifold({ verts: o.verts, tris: o.tris }) }));
      else list = [{ name: f.name.replace(/\.stl$/i, ''), solid: meshToManifold(parseSTLMesh(buf)) }];
      loadSolids(list, f.name);
    });
  }
  $('file').addEventListener('change', e => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(ev => app.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => app.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  app.addEventListener('drop', e => { const f = e.dataTransfer?.files?.[0]; if (f) openFile(f); });
  $('sample').addEventListener('click', () => busy('Armando el ejemplo…', () => loadSolids([{ name: 'Muñeco', solid: sampleModel() }], 'muñeco-de-nieve (ejemplo)')));

  // Girar todo y volver a apoyarlo en la cama
  const reseat = parts => {
    let minZ = Infinity; for (const p of parts) minZ = Math.min(minZ, p.solid.boundingBox().min[2]);
    return parts.map(p => mkPart(p.name, p.color, p.solid.translate([0, 0, -minZ])));
  };
  app.querySelectorAll('[data-rot]').forEach(b => b.addEventListener('click', () => {
    if (!S.parts.length) return;
    push(); const r = [0, 0, 0]; r[+b.dataset.rot] = 90;
    S.parts = reseat(S.parts.map(p => ({ ...p, solid: p.solid.rotate(r) })));
    setActive(S.active); placeOffset(); refreshAll();
  }));
  $('layFace').addEventListener('click', () => { if (!S.parts.length) return; S.mode = 'face'; status('Tocá la cara del modelo que va apoyada en la cama.'); });
  function layOnFace(n) {
    // Rota para que la normal n quede mirando para abajo (-Z)
    const a = new THREE.Vector3(...n).normalize(), b = new THREE.Vector3(0, 0, -1);
    const q = new THREE.Quaternion().setFromUnitVectors(a, b), m = new THREE.Matrix4().makeRotationFromQuaternion(q).elements;
    const M = [m[0], m[1], m[2], 0, m[4], m[5], m[6], 0, m[8], m[9], m[10], 0, 0, 0, 0, 1];
    push();
    S.parts = reseat(S.parts.map(p => ({ ...p, solid: p.solid.transform(M) })));
    S.mode = null; setActive(S.active); placeOffset(); refreshAll();
    status('Listo: esa cara quedó apoyada en la cama.');
  }

  // ---------- Elegir ----------
  const setSeg = (seg, attr, v) => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset[attr] === v));
  $('toolSeg').addEventListener('click', e => { const t = e.target.dataset.tool; if (!t) return; S.tool = t; setSeg($('toolSeg'), 'tool', t); $('wandOpts').hidden = t !== 'wand'; $('brushOpts').hidden = t === 'wand'; });
  const out = (id, unit, f = v => v) => { const i = $(id), o = $(id + 'O'); const u = () => { o.textContent = f(i.value) + unit; }; i.addEventListener('input', u); u(); };
  out('ang', '°'); out('br', ' mm', v => String(v).replace('.', ',')); out('dep', ' mm', v => String(v).replace('.', ',')); out('th', ' mm', v => String(v).replace('.', ',')); out('gap', ' mm', v => String(v).replace('.', ','));

  const ray = new THREE.Raycaster();
  function hitActive(ev) {
    ray.setFromCamera(viewer.ndc(ev), viewer.camera);
    const targets = S.mode === 'face' ? meshes : meshes.filter(m => m.userData.part === S.active);
    const h = ray.intersectObjects(targets, false)[0];
    if (!h) return null;
    const p = h.point.clone().sub(offset);
    return { t: h.faceIndex, point: [p.x, p.y, p.z], part: h.object.userData.part, normal: h.face.normal };
  }
  let painting = false, downAt = null;
  const cvs = viewer.renderer.domElement;
  cvs.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || !S.parts.length) return;
    downAt = [ev.clientX, ev.clientY];
    if (S.mode === 'face' || S.tool === 'wand' || S.preview) return;
    const h = hitActive(ev);
    if (!h) return;
    painting = true; viewer.controls.enabled = false; cvs.setPointerCapture(ev.pointerId);
    paint(h);
  });
  cvs.addEventListener('pointermove', ev => { if (painting) { const h = hitActive(ev); if (h) paint(h); } });
  cvs.addEventListener('pointerup', ev => {
    if (painting) { painting = false; viewer.controls.enabled = true; refreshAll(); return; }
    if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5) return;
    const h = hitActive(ev); downAt = null;
    if (S.mode === 'face') { if (h) { const n = h.normal.clone(); layOnFace([n.x, n.y, n.z]); } return; }
    if (!h || S.tool !== 'wand' || S.preview) return;
    const got = wandSelect(S.info, h.t, +$('ang').value);
    if (!(ev.ctrlKey || ev.metaKey)) S.sel = new Set();
    for (const t of got) S.sel.add(t);
    refreshAll();
  });
  let paintT = 0;
  function paint(h) {
    const got = brushSelect(S.info, h.t, h.point, +$('br').value);
    for (const t of got) S.tool === 'erase' ? S.sel.delete(t) : S.sel.add(t);
    const now = performance.now(); if (now - paintT > 60) { paintT = now; draw(); stepOn(); }
  }
  $('selClear').addEventListener('click', () => { S.sel = new Set(); S.preview = null; refreshAll(); });
  function ring(grow) {
    if (!S.sel.size) return;
    const edges = new Set();
    for (const t of S.sel) for (let k = 0; k < 3; k++) { const u = S.info.nb[t * 3 + k]; if (u >= 0 && !S.sel.has(u)) edges.add(grow ? u : t); }
    for (const t of edges) grow ? S.sel.add(t) : S.sel.delete(t);
    S.preview = null; refreshAll();
  }
  $('selGrow').addEventListener('click', () => ring(true));
  $('selShrink').addEventListener('click', () => ring(false));
  $('bodies').addEventListener('click', () => busy('Buscando cuerpos sueltos…', () => {
    const p = S.parts[S.active]; if (!p) return;
    const list = p.solid.decompose().filter(b => b.volume() > 0.005).sort((a, b) => b.volume() - a.volume());
    if (list.length < 2) { status('Esta pieza es un solo cuerpo: elegí la parte y cortala.'); return; }
    push();
    const used = new Set(S.parts.map(x => x.color));
    const fresh = list.slice(1).map((s, i) => mkPart(`${p.name} ${i + 2}`, PALETTE.find(c => !used.has(c) && (used.add(c), true)) || PALETTE[i % PALETTE.length], s));
    S.parts.splice(S.active, 1, mkPart(p.name, p.color, list[0]), ...fresh);
    setActive(S.active); refreshAll();
    status(`Separé ${list.length} cuerpos sueltos.`);
  }));

  // ---------- Cortar ----------
  $('closeSeg').addEventListener('click', e => { const c = e.target.dataset.close; if (!c) return; S.close = c; setSeg($('closeSeg'), 'close', c); $('flatOpts').hidden = c !== 'flat'; $('curvedOpts').hidden = c === 'flat'; if (S.preview) makePreview(); });
  $('jointSeg').addEventListener('click', e => { const j = e.target.dataset.joint; if (!j) return; S.joint = j; setSeg($('jointSeg'), 'joint', j); if (S.preview) makePreview(); });
  $('mat').addEventListener('change', e => { $('gapBox').hidden = e.target.value !== 'custom'; if (S.preview) makePreview(); });
  $('ghost').addEventListener('change', e => { S.ghost = e.target.checked; draw(); });
  for (const id of ['dep', 'th', 'gap']) $(id).addEventListener('change', () => { if (S.preview) makePreview(); });
  const gapOf = () => { const v = $('mat').value; return v === 'custom' ? +$('gap').value : MATERIALS.find(m => m.id === v).gap; };

  function computeCut() {
    const part = S.parts[S.active];
    if (!S.sel.size) throw new Error('Primero elegí la parte que querés separar.');
    if (S.sel.size >= S.info.nt) throw new Error('Elegiste toda la pieza: no hay nada que separar.');
    let tool, cut = null, edges = null;
    if (S.close === 'flat') {
      const plane = fitPlane(S.info, S.sel);
      cut = planeCutter(S.info, S.sel, plane, { depth: +$('dep').value });
      if (!cut) throw new Error('No pude armar el corte con esa selección.');
      tool = cut.tool;
      // Contorno del corte para mostrarlo
      const f = cut.frame, o = cut.origin;
      edges = [];
      for (const poly of cut.foot.toPolygons()) for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const w = q => [o[0] + f.u[0] * q[0] + f.v[0] * q[1], o[1] + f.u[1] * q[0] + f.v[1] * q[1], o[2] + f.u[2] * q[0] + f.v[2] * q[1]];
        edges.push([w(a), w(b)]);
      }
    } else {
      const sk = skinCutter(S.info, S.sel, +$('th').value);
      if (!sk) throw new Error('La superficie elegida es muy irregular para un cierre curvo: probá con el plano.');
      tool = sk.tool;
    }
    let { inside, rest } = applyCut(part.solid, tool);
    if (inside.isEmpty() || inside.volume() < 0.01) throw new Error('El corte no toma material: probá más profundidad.');
    if (rest.isEmpty() || rest.volume() < 0.01) throw new Error('El corte se lleva toda la pieza.');
    let note = '';
    if (S.joint !== 'none') {
      if (S.close !== 'flat') note = 'Los encastres van con el cierre plano: esta pieza va pegada.';
      else { const j = addJoint(inside, rest, cut, { kind: S.joint, gap: gapOf() }); inside = j.inside; rest = j.rest; note = j.note || `Encastre listo: ${j.info.count > 1 ? 'dos tetones' : S.joint === 'key' ? 'llave' : 'tetón'} de ${fmt(j.info.r * 2)} mm × ${fmt(j.info.L)} mm, holgura ${fmt(gapOf(), 2)} mm.`; }
    }
    const used = new Set(S.parts.map(p => p.color));
    const color = PALETTE.find(c => !used.has(c)) || PALETTE[S.parts.length % PALETTE.length];
    return { inside, rest, color, edges, note };
  }
  function makePreview() {
    return busy('Calculando el corte…', () => {
      S.preview = computeCut();
      refreshAll();
      $('cutInfo').textContent = S.preview.note;
      status(`Así queda: la parte nueva (${fmt(S.preview.inside.volume() / 1000, 2)} cm³) y el resto. Si te gusta, «Aplicar el corte».`);
    });
  }
  $('preview').addEventListener('click', makePreview);
  $('apply').addEventListener('click', () => busy('Cortando…', async () => {
    if (!S.preview) S.preview = computeCut();
    const pv = S.preview, part = S.parts[S.active];
    push();
    const n = S.parts.length + 1;
    S.parts.splice(S.active, 1, mkPart(part.name, part.color, clean(pv.rest)));
    S.parts.push(mkPart(`Parte ${n}`, pv.color, clean(pv.inside)));
    const note = pv.note;
    setActive(S.active); refreshAll();
    $('cutInfo').textContent = note;
    status(`Corte aplicado. ${note} Podés seguir eligiendo otra parte o exportar.`);
    // Libera la memoria de los cálculos intermedios, sin tocar las piezas ni el historial
    collect([...S.parts, ...undo.flatMap(u => u.parts), ...redo.flatMap(u => u.parts)].map(p => p.solid));
  }));

  // ---------- Piezas ----------
  $('parts').addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    if (e.target.dataset.stl !== undefined) {
      const p = S.parts[+e.target.dataset.stl];
      download(toSTL([solidToTriangles(p.solid)]), `${base()}_${p.name}.stl`.replace(/\s+/g, '_'), 'model/stl');
      return;
    }
    if (e.target.matches('input')) return;
    setActive(+li.dataset.i); refreshAll();
  });
  $('parts').addEventListener('input', e => {
    const i = e.target.dataset.color ?? e.target.dataset.name; if (i === undefined) return;
    const p = S.parts[+i];
    if (e.target.dataset.color !== undefined) { p.color = e.target.value.toUpperCase(); draw(); }
    else p.name = e.target.value;
  });
  $('parts').addEventListener('change', () => renderParts());

  // ---------- Deshacer ----------
  function restore(from, to) {
    if (!from.length) return;
    to.push(snap()); const s = from.pop();
    S.parts = s.parts; setActive(s.active); refreshAll();
  }
  $('undo').addEventListener('click', () => restore(undo, redo));
  $('redo').addEventListener('click', () => restore(redo, undo));
  const onKey = e => {
    if (e.target.matches('input, select, textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); restore(e.shiftKey ? redo : undo, e.shiftKey ? undo : redo); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); restore(redo, undo); }
    else if (e.key === 'Escape') { S.mode = null; S.preview = null; refreshAll(); }
  };
  window.addEventListener('keydown', onKey);

  // ---------- Vistas y exportar ----------
  app.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => viewer.setView(b.dataset.view)));
  const base = () => (S.fileName || 'modelo').replace(/\.(stl|3mf)$/i, '').replace(/[^\wáéíóúñ\- ]+/gi, '').trim().replace(/\s+/g, '_') || 'modelo';
  const ready = () => { if (!S.parts.length) { status('Primero cargá un modelo.', true); return false; } return true; };
  $('x3mf').addEventListener('click', () => { if (ready()) download(to3MF(S.parts, { name: base() }), `${base()}_colores.3mf`, 'model/3mf'); });
  $('xzip').addEventListener('click', () => { if (ready()) download(toSTLZip(S.parts), `${base()}_piezas.zip`, 'application/zip'); });

  refreshAll();
  return () => { window.removeEventListener('keydown', onKey); viewer.renderer.dispose(); };
}

// Para las pruebas
export { read3MF };
