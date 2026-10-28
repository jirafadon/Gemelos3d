import './styles.css';
import { CATEGORIES, GENERATORS, APPS, findGenerator } from './catalog.js';
import { renderTaller } from './taller/taller.js';
import { icon } from './ui/icons.js';
import { renderParams, defaultValues } from './ui/params.js';
import { initEngine, modelStats, loadFont, collect } from './engine/index.js';
import { Viewer } from './engine/viewer.js';
import { to3MF, toSTLZip, mergedSTL, download } from './engine/export.js';
import { estimate, sendToCalculator } from './engine/cost.js';
import { imageToMask } from './engine/image.js';

const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtTime = min => { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h ${m} min` : `${m} min`; };
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ } },
};

let cleanup = null;

function route() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  const m = location.hash.match(/^#\/g\/([\w-]+)/);
  window.scrollTo(0, 0);
  if (m) renderGenerator(m[1]);
  else if (location.hash.startsWith('#/taller')) {
    const token = Symbol();
    cleanup = token;
    renderTaller(app, header()).then(fn => { if (cleanup === token) cleanup = fn; else fn(); });
  } else renderCatalog();
}
window.addEventListener('hashchange', route);

function header() {
  return `<header class="top">
    <a class="brand" href="#/"><img class="logo" src="${import.meta.env.BASE_URL}brand/logo-mark.jpg" alt="Gemelos 3D" width="46" height="46"><span>Gemelos 3D <b>Lab</b></span></a>
    <nav><a href="#/">Generadores</a><a href="#/taller">Taller 3D</a><a href="${import.meta.env.BASE_URL}calculadora.html" target="_blank">${icon('calc')} Calculadora</a></nav>
  </header>`;
}

// ---------------- Catálogo ----------------
const isReady = g => !!(g.load || g.href);
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function renderCatalog() {
  const saved = store.get('g3d_lab_filters') || {};
  const state = { q: saved.q || '', cat: saved.cat || 'all', soon: false };
  const ready = GENERATORS.filter(isReady);
  const base = import.meta.env.BASE_URL;
  app.innerHTML = `${header()}
  <main class="catalog">
    <section class="hero">
      <h1>Gemelos 3D Lab</h1>
      <p>Apps y generadores para diseñar, presupuestar e imprimir en la U1.</p>
    </section>
    <section class="apps">
      ${APPS.map(a => `<a class="app-card" href="${a.href ? base + a.href : a.route}"${a.href ? ' target="_blank" rel="noopener"' : ''}>
        <img src="${base}thumbs/${a.id}.jpg" alt="" loading="lazy">
        <div><span class="badge app">App</span><h2>${esc(a.title)}</h2><p>${esc(a.desc)}</p></div>
      </a>`).join('')}
    </section>
    <div class="filters">
      <label class="search">${icon('search')}<input id="q" placeholder="Buscar: llavero, QR, cortador…" value="${esc(state.q)}"></label>
    </div>
    <div class="chips" id="chips"></div>
    <div id="grid"></div>
  </main>`;

  const chips = document.getElementById('chips');
  const grid = document.getElementById('grid');
  const count = id => ready.filter(g => id === 'all' || g.cat === id).length;
  chips.innerHTML = [{ id: 'all', name: 'Todos', icon: null }, ...CATEGORIES.filter(c => count(c.id) > 0)]
    .map(c => `<button data-cat="${c.id}" class="${state.cat === c.id ? 'on' : ''}">${c.icon ? icon(c.icon) : ''}${esc(c.name)} <small>${count(c.id)}</small></button>`).join('');
  if (!chips.querySelector('.on')) { state.cat = 'all'; chips.querySelector('[data-cat=all]').classList.add('on'); }

  const card = (g, c) => `<a class="card ${isReady(g) ? 'ready' : 'soon'}" href="#/g/${g.id}">
      <div class="tile c-${c.id}">${isReady(g) ? `<img src="${base}thumbs/${g.id}.jpg" alt="" loading="lazy" onerror="this.remove()">` : ''}${icon(c.icon, 'big')}</div>
      <div class="card-body">
        <div class="card-top"><h3>${esc(g.title)}</h3>${isReady(g) ? '' : `<span class="badge">Fase ${g.phase}</span>`}</div>
        <p>${esc(g.desc)}</p>
      </div>
    </a>`;

  const draw = () => {
    store.set('g3d_lab_filters', { q: state.q, cat: state.cat });
    const q = norm(state.q.trim());
    const match = g => (state.cat === 'all' || g.cat === state.cat) && (!q || norm(g.title + ' ' + g.desc).includes(q));
    const list = GENERATORS.filter(g => match(g) && isReady(g));
    const pending = GENERATORS.filter(g => match(g) && !isReady(g));
    const section = (items, cats) => cats.map(c => `
      <section class="cat">
        ${state.cat === 'all' ? `<h2>${icon(c.icon)} ${esc(c.name)}</h2>` : ''}
        <div class="cards">${items.filter(g => g.cat === c.id).map(g => card(g, c)).join('')}</div>
      </section>`).join('');
    const cats = CATEGORIES.filter(c => list.some(g => g.cat === c.id));
    grid.innerHTML = (list.length ? section(list, cats) : '<p class="empty">No hay generadores listos con esa búsqueda.</p>') +
      (pending.length ? `<div class="soon-toggle"><button id="soonBtn">${state.soon ? 'Ocultar' : 'Ver'} los que vienen (${pending.length})</button></div>` : '') +
      (state.soon && pending.length ? `<div class="soon-list">${section(pending, CATEGORIES.filter(c => pending.some(g => g.cat === c.id)))}</div>` : '');
    document.getElementById('soonBtn')?.addEventListener('click', () => { state.soon = !state.soon; draw(); });
  };

  document.getElementById('q').addEventListener('input', e => { state.q = e.target.value; draw(); });
  chips.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.cat = b.dataset.cat;
    chips.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    draw();
  });
  draw();
}

// ---------------- Generador ----------------
async function renderGenerator(id) {
  const entry = findGenerator(id);
  if (!entry) { location.hash = '#/'; return; }
  const cat = CATEGORIES.find(c => c.id === entry.cat);

  if (!entry.load) {
    app.innerHTML = `${header()}<main class="soon-page">
      <a class="back" href="#/">${icon('back')} Generadores</a>
      <div class="tile c-${cat.id}">${icon(cat.icon, 'big')}</div>
      <h1>${esc(entry.title)}</h1><p>${esc(entry.desc)}</p>
      <p class="muted">Todavía no está construido. Está planificado para la <b>fase ${entry.phase}</b>.</p>
    </main>`;
    return;
  }

  app.innerHTML = `${header()}
  <main class="gen">
    <aside class="gen-params">
      <a class="back" href="#/">${icon('back')} Generadores</a>
      <h1>${esc(entry.title)}</h1>
      <p class="muted">${esc(entry.desc)}</p>
      <div id="params"><div class="loading"><span class="spin"></span> Cargando…</div></div>
      <button class="link" id="reset">Volver a los valores de fábrica</button>
    </aside>
    <section class="gen-view">
      <div class="viewer" id="viewer"></div>
      <div class="views">
        <button data-view="iso" class="on">3D</button><button data-view="top">Arriba</button><button data-view="front">Frente</button><button data-view="side">Costado</button>
      </div>
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
    </aside>
  </main>`;

  const $ = s => document.getElementById(s);
  const status = (msg, kind = '') => { $('status').className = `status ${kind}`; $('status').innerHTML = msg; };
  status('<span class="spin"></span> Preparando el motor 3D…');

  let viewer, gen;
  try {
    const [mod] = await Promise.all([entry.load(), initEngine()]);
    gen = mod.default;
    viewer = new Viewer($('viewer'));
  } catch (err) {
    console.error(err);
    status(`No se pudo iniciar: ${esc(err.message)}`, 'error');
    return;
  }

  const saveKey = `g3d_lab_params_${id}`;
  const values = { ...defaultValues(gen.params), ...(store.get(saveKey) || {}) };
  let parts = [], token = 0, timer = null, alive = true;
  cleanup = () => { alive = false; clearTimeout(timer); viewer.renderer.dispose(); collect([]); };

  const ctx = { font: loadFont, image: (url, opts) => imageToMask(url, opts) };
  const rebuild = async () => {
    const my = ++token;
    status('<span class="spin"></span> Generando…');
    try {
      const result = await gen.build({ ...values }, ctx);
      if (!alive || my !== token) return;
      const next = result.filter(p => p.solid && !p.solid.isEmpty());
      if (!next.length) throw new Error('El modelo quedó vacío. Revisá el texto o las medidas.');
      parts = next;
      viewer.setParts(parts);
      showOutputs();
      collect(parts.map(p => p.solid));
      status('');
    } catch (err) {
      collect(parts.map(p => p.solid));
      if (my !== token) return;
      console.error(err);
      status(`⚠ ${esc(err.message || err)}`, 'error');
    }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(rebuild, 180); };

  const showOutputs = () => {
    const s = modelStats(parts), e = estimate(parts);
    $('oSize').textContent = s.size.map(v => v.toFixed(1)).join(' × ') + ' mm';
    $('oGrams').textContent = `${e.grams.toFixed(1)} g`;
    $('oTime').textContent = fmtTime(e.minutes);
    $('oCost').textContent = money(e.cost);
    $('oProfile').textContent = `Estimado con el perfil "${e.profile}" de la calculadora. Precio sugerido: ${money(e.price)}.`;
    $('oParts').innerHTML = parts.map(p => `<li><i style="background:${p.color}"></i>${esc(p.name)}<span>${(p.solid.volume() / 1000).toFixed(1)} cm³</span></li>`).join('');
  };

  renderParams($('params'), gen.params, values, () => { store.set(saveKey, values); schedule(); });
  $('reset').addEventListener('click', () => {
    Object.assign(values, defaultValues(gen.params));
    store.set(saveKey, values);
    renderParams($('params'), gen.params, values, () => { store.set(saveKey, values); schedule(); });
    schedule();
  });
  document.querySelector('.views').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('.views button').forEach(x => x.classList.toggle('on', x === b));
    viewer.setView(b.dataset.view);
  });

  const label = () => String((gen.fileName ? gen.fileName(values) : values.text) || 'modelo').split('\n')[0].trim();
  const fileBase = () => `${gen.id}_${label()}`.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/g, '_').slice(0, 60);
  const guard = fn => () => { if (!parts.length) return; try { fn(); } catch (err) { status(`⚠ ${esc(err.message)}`, 'error'); } };
  $('x3mf').addEventListener('click', guard(() => download(to3MF(parts, { name: fileBase() }), `${fileBase()}.3mf`, 'model/3mf')));
  $('xstl').addEventListener('click', guard(() => download(mergedSTL(parts), `${fileBase()}.stl`, 'model/stl')));
  $('xzip').addEventListener('click', guard(() => download(toSTLZip(parts), `${fileBase()}_por_color.zip`, 'application/zip')));
  $('xcalc').addEventListener('click', guard(() => {
    const e = estimate(parts), s = modelStats(parts);
    sendToCalculator({
      name: `${gen.title}: ${label()}`.trim(),
      grams: e.grams, minutes: e.minutes, thumb: viewer.snapshot(),
      meta: `Gemelos 3D Lab · ${s.size.map(v => v.toFixed(0)).join(' × ')} mm · ${e.colors} color(es)`,
    });
  }));

  rebuild();
}

route();
