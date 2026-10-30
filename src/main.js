import './styles.css';
import { CATEGORIES, GENERATORS, APPS, FAMILIES, SHARED_GROUPS, FAMILY_SHARE, findGenerator, familyOf } from './catalog.js';
import { renderTaller, sendToTaller } from './taller/taller.js';
import { makeObject, solidToMeshData, groupObjects } from './taller/objects.js';
import { icon } from './ui/icons.js';
import { renderParams, defaultValues } from './ui/params.js';
import { initEngine, modelStats, loadFont, collect } from './engine/index.js';
import { Viewer } from './engine/viewer.js';
import { to3MF, toSTLZip, mergedSTL, download } from './engine/export.js';
import { estimate, sendToCalculator } from './engine/cost.js';
import { imageToMask, imageToGray } from './engine/image.js';

const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtTime = min => { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h ${m} min` : `${m} min`; };

let cleanup = null;

/**
 * Lo que se escribe en un programa vive solo mientras estás adentro:
 * al volver al inicio (o recargar) todo arranca de cero.
 */
const session = { family: null, params: {}, shared: {} };
const resetSession = () => { session.family = null; session.params = {}; session.shared = {}; };
// Limpia lo que guardaban las versiones anteriores
try {
  for (const k of Object.keys(localStorage)) if (/^g3d_lab_(params_|shared_|filters)/.test(k)) localStorage.removeItem(k);
} catch { /* sin acceso */ }

function route() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  const m = location.hash.match(/^#\/g\/([\w-]+)/);
  const fa = location.hash.match(/^#\/app\/([\w-]+)(?:\/([\w-]+))?/);
  window.scrollTo(0, 0);
  if (fa) {
    const fam = FAMILIES.find(f => f.id === fa[1]);
    if (!fam) { location.hash = '#/'; return; }
    renderGenerator(fa[2] || fam.items.find(id => findGenerator(id)?.load), fam);
  } else if (m) renderGenerator(m[1], familyOf(m[1]));
  else if (location.hash.startsWith('#/taller')) {
    const token = Symbol();
    cleanup = token;
    renderTaller(app, header()).then(fn => { if (cleanup === token) cleanup = fn; else fn(); });
  } else renderCatalog(location.hash.startsWith('#/buscar'));
}
window.addEventListener('hashchange', route);

function header() {
  const base = import.meta.env.BASE_URL;
  const h = location.hash || '#/';
  const on = test => (test ? ' class="on"' : '');
  return `<header class="top">
    <a class="brand" href="#/"><img class="logo" src="${base}brand/logo-mark.jpg" alt="Gemelos 3D" width="46" height="46"><span>Gemelos 3D <b>Lab</b></span></a>
    <nav><a href="#/">Inicio</a><a href="#/taller">Taller 3D</a><a href="${base}calculadora.html" target="_blank">${icon('calc')} Calculadora</a></nav>
  </header>
  <nav class="tabbar" aria-label="Navegación">
    <a href="#/"${on(h === '#/' || h === '#')}>${icon('home')}<span>Inicio</span></a>
    <a href="#/buscar"${on(h.startsWith('#/buscar'))}>${icon('search')}<span>Buscar</span></a>
    <a href="#/taller"${on(h.startsWith('#/taller'))}>${icon('cube')}<span>Taller 3D</span></a>
    <a href="${base}calculadora.html" target="_blank">${icon('calc')}<span>Calculadora</span></a>
  </nav>`;
}

// ---------------- Catálogo ----------------
const isReady = g => !!(g.load || g.href);
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function renderCatalog(focusSearch = false) {
  resetSession();
  const state = { q: '', soon: false };
  const base = import.meta.env.BASE_URL;
  const readyIn = f => f.items.filter(id => isReady(findGenerator(id) || {}));
  const inFamily = new Set(FAMILIES.flatMap(f => f.items));
  app.innerHTML = `${header()}
  <main class="catalog">
    <section class="hero">
      <h1>Gemelos 3D Lab</h1>
      <p>Apps y programas para diseñar, presupuestar e imprimir en la U1.</p>
    </section>
    <h2 class="sec-title">Apps</h2>
    <section class="apps">
      ${APPS.map(a => `<a class="app-card" href="${a.href ? base + a.href : a.route}"${a.href ? ' target="_blank" rel="noopener"' : ''}>
        <img src="${base}thumbs/${a.id}.jpg" alt="" loading="lazy">
        <span class="sq tone-${a.tone}">${icon(a.icon)}</span>
        <div><span class="badge app">App</span><h2>${esc(a.title)}</h2><p>${esc(a.desc)}</p></div>
      </a>`).join('')}
    </section>
    <div class="filters">
      <label class="search">${icon('search')}<input id="q" placeholder="Buscar: llavero, WiFi, caja, engranaje…" value="${esc(state.q)}"></label>
    </div>
    <div id="grid"></div>
  </main>`;
  const grid = document.getElementById('grid');

  const famCard = f => {
    const n = readyIn(f).length;
    return `<a class="card ready fam" href="#/app/${f.id}">
      <div class="tile c-${f.cat}"><img src="${base}thumbs/${f.cover}.jpg" alt="" loading="lazy" onerror="this.remove()"></div>
      <span class="sq tone-${f.tone}">${icon(f.icon)}</span>
      <div class="card-body">
        <div class="card-top"><h3>${esc(f.title)}</h3><span class="badge">${n} ${n === 1 ? 'opción' : 'opciones'}</span></div>
        <p>${esc(f.desc)}</p>
      </div>
    </a>`;
  };
  const genCard = g => {
    const f = familyOf(g.id), c = CATEGORIES.find(x => x.id === g.cat);
    return `<a class="card ${isReady(g) ? 'ready' : 'soon'}" href="${f ? `#/app/${f.id}/${g.id}` : `#/g/${g.id}`}">
      <div class="tile c-${c.id}">${isReady(g) ? `<img src="${base}thumbs/${g.id}.jpg" alt="" loading="lazy" onerror="this.remove()">` : ''}${icon(c.icon, 'big')}</div>
      <div class="card-body">
        <div class="card-top"><h3>${esc(g.title)}</h3>${isReady(g) ? (f ? `<span class="badge">${esc(f.title)}</span>` : '') : `<span class="badge">Fase ${g.phase}</span>`}</div>
        <p>${esc(g.desc)}</p>
      </div>
    </a>`;
  };

  const draw = () => {
    const q = norm(state.q.trim());
    if (q) {
      const hits = GENERATORS.filter(g => isReady(g) && norm(g.title + ' ' + g.desc).includes(q));
      grid.innerHTML = hits.length ? `<section class="cat"><h2>Resultados</h2><div class="cards">${hits.map(genCard).join('')}</div></section>` : '<p class="empty">No encontramos eso todavía. Probá con otra palabra o armalo en el Taller 3D.</p>';
      return;
    }
    const fams = FAMILIES.filter(f => readyIn(f).length);
    const pending = GENERATORS.filter(g => !isReady(g) && !inFamily.has(g.id));
    grid.innerHTML = `<section class="cat"><h2>Programas</h2><div class="cards">${fams.map(famCard).join('')}</div></section>` +
      (pending.length ? `<div class="soon-toggle"><button id="soonBtn">${state.soon ? 'Ocultar' : 'Ver'} lo que viene (${pending.length})</button></div>` : '') +
      (state.soon ? `<div class="soon-list">${CATEGORIES.filter(c => pending.some(g => g.cat === c.id)).map(c => `<section class="cat"><h2>${icon(c.icon)} ${esc(c.name)}</h2><div class="cards">${pending.filter(g => g.cat === c.id).map(genCard).join('')}</div></section>`).join('')}</div>` : '');
    document.getElementById('soonBtn')?.addEventListener('click', () => { state.soon = !state.soon; draw(); });
  };
  const q = document.getElementById('q');
  q.addEventListener('input', e => { state.q = e.target.value; draw(); });
  draw();
  if (focusSearch) { q.scrollIntoView({ block: 'center' }); q.focus(); }
}

// ---------------- Generador ----------------
/** Selector de variantes dentro de un programa (ej.: QR → WiFi, Mercado Pago, redes…). */
function familyPicker(fam, current) {
  const base = import.meta.env.BASE_URL;
  const items = fam.items.map(findGenerator).filter(Boolean);
  const ready = items.filter(isReady), soon = items.filter(g => !isReady(g));
  return `<h1>${esc(fam.title)}</h1>
    <p class="pick-label">¿Qué querés hacer?</p>
    <div class="picker">${ready.map(g => `<a href="#/app/${fam.id}/${g.id}" class="${g.id === current ? 'on' : ''}" title="${esc(g.desc)}">
      <img src="${base}thumbs/${g.id}.jpg" alt="" loading="lazy"><span>${esc(g.title)}</span></a>`).join('')}
    ${soon.map(g => `<span class="soon" title="Próximamente (fase ${g.phase})">${esc(g.title)}<small>pronto</small></span>`).join('')}</div>
    ${ready.length > 1 ? `<h2 class="pick-title">${esc(findGenerator(current).title)}</h2>` : ''}`;
}

async function renderGenerator(id, fam = null) {
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
      <a class="back" href="#/">${icon('back')} Inicio</a>
      ${fam ? familyPicker(fam, id) : `<h1>${esc(entry.title)}</h1>`}
      <p class="muted">${esc(entry.desc)}</p>
      <div id="params"><div class="loading"><span class="spin"></span> Cargando…</div></div>
      <button class="link" id="reset">Volver a los valores de fábrica</button>
    </aside>
    <section class="gen-view">
      <div class="viewer" id="viewer"></div>
      <div class="views">
        <button data-view="iso" class="on">3D</button><button data-view="top">Arriba</button><button data-view="bottom">Abajo</button><button data-view="front">Frente</button><button data-view="side">Costado</button>
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
        <button class="ghost" id="xtaller">Seguir editando en el Taller 3D</button>
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

  // Si cambiaste de programa, se olvida lo del anterior
  const famId = fam ? fam.id : `g:${id}`;
  if (session.family !== famId) { session.family = famId; session.params = {}; session.shared = {}; }
  const values = { ...defaultValues(gen.params), ...(session.params[id] || {}) };
  session.params[id] = values;
  // Lo que escribiste en otra opción del mismo programa (nombre, letra, colores…) te sigue
  const shareGroups = fam ? (FAMILY_SHARE[fam.id] || []) : [];
  const famShared = session.shared;
  const validFor = (p, v) => {
    if (p.type === 'segment' || p.type === 'select') return p.options.some(o => o.value === v);
    if (p.type === 'number') return typeof v === 'number' && v >= p.min && v <= p.max;
    return typeof v === typeof p.default;
  };
  for (const g of shareGroups) {
    if (!(g in famShared)) continue;
    for (const k of SHARED_GROUPS[g]) {
      const p = gen.params.find(x => x.key === k);
      if (p && validFor(p, famShared[g])) values[k] = famShared[g];
    }
  }
  const rememberShared = () => {
    if (!fam) return;
    for (const g of shareGroups) {
      const k = SHARED_GROUPS[g].find(key => key in values);
      if (k) famShared[g] = values[k];
    }
  };
  let parts = [], token = 0, timer = null, alive = true;
  cleanup = () => { alive = false; clearTimeout(timer); viewer.renderer.dispose(); collect([]); };

  const ctx = { font: loadFont, image: (url, opts) => imageToMask(url, opts), gray: (url, opts) => imageToGray(url, opts) };
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

  renderParams($('params'), gen.params, values, () => { rememberShared(); schedule(); });
  $('reset').addEventListener('click', () => {
    Object.assign(values, defaultValues(gen.params));
    renderParams($('params'), gen.params, values, () => { rememberShared(); schedule(); });
    schedule();
  });
  document.querySelector('.views').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('.views button').forEach(x => x.classList.toggle('on', x === b));
    viewer.setView(b.dataset.view);
  });

  const label = () => String((gen.fileName ? gen.fileName(values) : values.text) || 'modelo').split('\n')[0].trim();
  const fileBase = () => `${gen.id}_${label()}`.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/g, '_').slice(0, 60);
  const guard = fn => () => { if (!parts.length) return; Promise.resolve().then(fn).catch(err => { console.error(err); status(`⚠ ${esc(err.message)}`, 'error'); }); };
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

  $('xtaller').addEventListener('click', guard(async () => {
    // Cada color pasa como una malla; juntas forman un grupo multicolor que se mueve entero
    const kids = parts.map((p, i) => {
      const b = p.solid.boundingBox();
      return makeObject('stl', i, {
        name: `${gen.title} · ${p.name}`, color: p.color, mesh: solidToMeshData(p.solid),
        x: (b.min[0] + b.max[0]) / 2, y: (b.min[1] + b.max[1]) / 2, z: b.min[2],
        w: b.max[0] - b.min[0], d: b.max[1] - b.min[1], h: b.max[2] - b.min[2],
      });
    });
    const item = kids.length > 1 ? await groupObjects(kids, ctx, 0) : kids[0];
    item.name = `${gen.title}: ${label()}`.slice(0, 60);
    item.x = 0; item.y = 0; item.z = 0;
    if (!sendToTaller(item)) { status('⚠ El modelo es muy pesado para pasarlo al Taller. Exportalo como STL e importalo ahí.', 'error'); return; }
    location.hash = '#/taller';
  }));

  rebuild();
}

route();
