import './styles.css';
import { CATEGORIES, GENERATORS, findGenerator } from './catalog.js';
import { icon } from './ui/icons.js';
import { renderParams, defaultValues } from './ui/params.js';
import { initEngine, modelStats, loadFont, collect } from './engine/index.js';
import { Viewer } from './engine/viewer.js';
import { to3MF, toSTLZip, mergedSTL, download } from './engine/export.js';
import { estimate, sendToCalculator } from './engine/cost.js';

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
  if (cleanup) { cleanup(); cleanup = null; }
  const m = location.hash.match(/^#\/g\/([\w-]+)/);
  window.scrollTo(0, 0);
  if (m) renderGenerator(m[1]); else renderCatalog();
}
window.addEventListener('hashchange', route);

function header() {
  return `<header class="top">
    <a class="brand" href="#/"><img class="logo" src="${import.meta.env.BASE_URL}brand/logo-mark.jpg" alt="Gemelos 3D" width="46" height="46"><span>Gemelos 3D <b>Lab</b></span></a>
    <nav><a href="#/">Generadores</a><a href="${import.meta.env.BASE_URL}calculadora.html" target="_blank">${icon('calc')} Calculadora</a></nav>
  </header>`;
}

// ---------------- Catálogo ----------------
function renderCatalog() {
  const state = { q: '', cat: 'all', onlyReady: false, ...(store.get('g3d_lab_filters') || {}) };
  const ready = GENERATORS.filter(g => g.load || g.href).length;
  app.innerHTML = `${header()}
  <main class="catalog">
    <section class="hero">
      <h1>Generadores para imprimir</h1>
      <p>Elegí un producto, personalizalo y bajá el 3MF con los colores separados, listo para la U1.</p>
      <div class="progress"><div style="width:${(ready / GENERATORS.length * 100).toFixed(1)}%"></div></div>
      <small>${ready} de ${GENERATORS.length} listos · el resto se va sumando por fases</small>
      <a class="calc-cta" href="${import.meta.env.BASE_URL}calculadora.html" target="_blank">${icon('calc')}<span><b>Calculadora de presupuestos</b><small>Arrastrá STL, 3MF o G-code y sacá el precio</small></span></a>
    </section>
    <div class="filters">
      <label class="search">${icon('search')}<input id="q" placeholder="Buscar: llavero, QR, cortador…" value="${esc(state.q)}"></label>
      <label class="only"><input type="checkbox" id="only" ${state.onlyReady ? 'checked' : ''}> Solo listos</label>
    </div>
    <div class="chips" id="chips"></div>
    <div id="grid"></div>
  </main>`;

  const chips = document.getElementById('chips');
  const grid = document.getElementById('grid');
  chips.innerHTML = [{ id: 'all', name: 'Todos', icon: null }, ...CATEGORIES]
    .map(c => `<button data-cat="${c.id}" class="${state.cat === c.id ? 'on' : ''}">${c.icon ? icon(c.icon) : ''}${esc(c.name)}</button>`).join('');

  const draw = () => {
    store.set('g3d_lab_filters', state);
    const q = state.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const list = GENERATORS.filter(g =>
      (state.cat === 'all' || g.cat === state.cat) &&
      (!state.onlyReady || g.load || g.href) &&
      (!q || norm(g.title + ' ' + g.desc).includes(q)));
    const cats = CATEGORIES.filter(c => list.some(g => g.cat === c.id));
    grid.innerHTML = cats.length ? cats.map(c => `
      <section class="cat">
        <h2>${icon(c.icon)} ${esc(c.name)}</h2>
        <div class="cards">${list.filter(g => g.cat === c.id).sort((a, b) => (!!(b.load || b.href) - !!(a.load || a.href)) || a.phase - b.phase).map(g => card(g, c)).join('')}</div>
      </section>`).join('') : '<p class="empty">No hay generadores con esa búsqueda.</p>';
  };
  const card = (g, c) => `<a class="card ${g.load || g.href ? 'ready' : 'soon'}" href="${g.href ? import.meta.env.BASE_URL + g.href : `#/g/${g.id}`}"${g.href ? ' target="_blank"' : ''}>
      <div class="tile c-${c.id}">${g.load || g.href ? `<img src="${import.meta.env.BASE_URL}thumbs/${g.id}.jpg" alt="" loading="lazy" onerror="this.remove()">` : ''}${icon(c.icon, 'big')}</div>
      <div class="card-body">
        <div class="card-top"><h3>${esc(g.title)}</h3><span class="badge">${g.load || g.href ? 'Listo' : `Fase ${g.phase}`}</span></div>
        <p>${esc(g.desc)}</p>
      </div>
    </a>`;

  document.getElementById('q').addEventListener('input', e => { state.q = e.target.value; draw(); });
  document.getElementById('only').addEventListener('change', e => { state.onlyReady = e.target.checked; draw(); });
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

  const ctx = { font: loadFont };
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

  const fileBase = () => `${gen.id}_${String(values.text || 'modelo').split('\n')[0]}`.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/g, '_').slice(0, 60);
  const guard = fn => () => { if (!parts.length) return; try { fn(); } catch (err) { status(`⚠ ${esc(err.message)}`, 'error'); } };
  $('x3mf').addEventListener('click', guard(() => download(to3MF(parts, { name: fileBase() }), `${fileBase()}.3mf`, 'model/3mf')));
  $('xstl').addEventListener('click', guard(() => download(mergedSTL(parts), `${fileBase()}.stl`, 'model/stl')));
  $('xzip').addEventListener('click', guard(() => download(toSTLZip(parts), `${fileBase()}_por_color.zip`, 'application/zip')));
  $('xcalc').addEventListener('click', guard(() => {
    const e = estimate(parts), s = modelStats(parts);
    sendToCalculator({
      name: `${gen.title}: ${String(values.text || '').split('\n')[0]}`.trim(),
      grams: e.grams, minutes: e.minutes, thumb: viewer.snapshot(),
      meta: `Gemelos 3D Lab · ${s.size.map(v => v.toFixed(0)).join(' × ')} mm · ${e.colors} color(es)`,
    });
  }));

  rebuild();
}

route();
