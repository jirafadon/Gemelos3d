/**
 * Moldes desde tu pieza: cargás un STL o 3MF y sale un molde rígido de dos mitades
 * (con llaves, bebedero y respiraderos) o una caja para colar silicona.
 */
import { initEngine } from '../engine/index.js';
import { Viewer } from '../engine/viewer.js';
import { toSTLZip, to3MF, download } from '../engine/export.js';
import { parseSTLMesh, meshToManifold } from '../taller/objects.js';
import { icon } from '../ui/icons.js';
import { read3MF } from './separador.js';
import { twoPartMold, siliconeBox } from './mold-core.js';
import { sampleModel } from './split-core.js';

export async function renderMolds(app, headerHtml) {
  app.innerHTML = `${headerHtml}
  <main class="sp" style="grid-template-columns:320px minmax(0,1fr)">
    <aside class="sp-left">
      <a class="back" href="#/">${icon('back')} Inicio</a>
      <h1>Moldes desde tu pieza</h1>
      <p class="muted small">Cargás la pieza y sale el molde listo para imprimir: rígido de dos mitades (resina, yeso, jabón, cera) o una caja para colar silicona.</p>
      <section class="sp-sec">
        <h2>1 · La pieza</h2>
        <label class="sp-drop" id="drop"><input type="file" id="file" accept=".stl,.3mf" hidden><b>Abrir STL o 3MF</b><span>o soltalo acá</span></label>
        <button class="sp-btn wide" id="sample">Probar con el muñeco de ejemplo</button>
        <div class="sp-row"><span class="muted small">Girar:</span><button class="sp-btn sm" data-rot="0">X +90°</button><button class="sp-btn sm" data-rot="1">Y +90°</button><button class="sp-btn sm" data-rot="2">Z +90°</button></div>
      </section>
      <section class="sp-sec">
        <h2>2 · Tipo de molde</h2>
        <div class="sp-seg" id="kindSeg" style="grid-template-columns:1fr 1fr"><button data-kind="rigid" class="on">Dos mitades</button><button data-kind="box">Caja para silicona</button></div>
        <div id="rigidOpts">
          <label class="sp-l">Pared alrededor <output id="wallO"></output></label><input type="range" id="wall" min="4" max="20" step="0.5" value="8">
          <label class="sp-l">Altura del corte <output id="splitO"></output></label><input type="range" id="split" min="10" max="90" step="1" value="50">
          <label class="sp-l">Llaves de registro <output id="keyO"></output></label><input type="range" id="key" min="2" max="6" step="0.5" value="3.5">
          <label class="sp-l">Holgura de las llaves <output id="gapO"></output></label><input type="range" id="gap" min="0.1" max="0.6" step="0.05" value="0.2">
          <label class="sp-l">Bebedero <output id="pourO"></output></label><input type="range" id="pour" min="0" max="16" step="1" value="8">
          <label class="sp-l">Respiraderos <output id="ventsO"></output></label><input type="range" id="vents" min="0" max="4" step="1" value="2">
          <p class="muted small">Las dos mitades salen con la cara del corte hacia arriba: el hueco queda como un cuenco y se imprime sin soportes. Cortá a la altura donde la pieza es más ancha para que salga sin trabarse.</p>
        </div>
        <div id="boxOpts" hidden>
          <label class="sp-l">Espacio alrededor <output id="marginO"></output></label><input type="range" id="margin" min="5" max="30" step="1" value="10">
          <label class="sp-l">Silicona arriba de la pieza <output id="overO"></output></label><input type="range" id="over" min="4" max="25" step="1" value="8">
          <p class="muted small">Pegá la pieza en la base con una gota de silicona, pará las paredes en el canal y sujetalas con una gomita o cinta.</p>
        </div>
        <button class="sp-btn primary wide" id="make">Armar el molde</button>
        <p class="sp-info" id="info"></p>
      </section>
      <section class="sp-sec">
        <h2>3 · Exportar</h2>
        <button class="sp-btn primary wide" id="xzip">${icon('download')} ZIP con un STL por pieza</button>
        <button class="sp-btn wide" id="x3mf">${icon('download')} 3MF</button>
      </section>
    </aside>
    <section class="sp-view">
      <div class="sp-bar"><button class="sp-btn sm" data-view="iso">Iso</button><button class="sp-btn sm" data-view="front">Frente</button><button class="sp-btn sm" data-view="top">Arriba</button></div>
      <div class="sp-canvas" id="viewer"><div class="sp-empty" id="empty"><b>Moldes desde tu pieza</b><span>Abrí un STL o 3MF, o probá con el ejemplo.</span></div></div>
      <div class="sp-status" id="status">Listo.</div>
    </section>
  </main>`;
  await initEngine();
  const $ = id => app.querySelector('#' + id);
  const viewer = new Viewer($('viewer'));
  viewer.setView('iso');
  let model = null, name = 'pieza', kind = 'rigid', parts = [];
  const status = (t, bad) => { $('status').textContent = t; $('status').classList.toggle('bad', !!bad); };
  const fmt = v => String(v).replace('.', ',');
  for (const [id, u] of [['wall', ' mm'], ['split', ' %'], ['key', ' mm'], ['gap', ' mm'], ['pour', ' mm'], ['vents', ''], ['margin', ' mm'], ['over', ' mm']]) {
    const i = $(id), o = $(id + 'O'); const upd = () => { o.textContent = fmt(i.value) + u; }; i.addEventListener('input', upd); upd();
    i.addEventListener('change', () => model && make());
  }
  const show = list => { parts = list; $('empty').hidden = !!list.length; viewer.setParts(list); };
  function make() {
    if (!model) { status('Primero cargá una pieza.', true); return; }
    status('Armando el molde…');
    setTimeout(() => {
      try {
        if (kind === 'rigid') {
          const r = twoPartMold(model, { wall: +$('wall').value, split: +$('split').value / 100, keyR: +$('key').value, gap: +$('gap').value, pour: +$('pour').value, vents: +$('vents').value });
          show([{ name: 'Mitad de abajo', color: '#2A9D8F', solid: r.lower }, { name: 'Mitad de arriba', color: '#E76F51', solid: r.upper }]);
          $('info').textContent = `Dos mitades con 4 llaves. ${r.notes.join(' ')}`;
        } else {
          const r = siliconeBox(model, { margin: +$('margin').value, over: +$('over').value });
          show([{ name: 'Base', color: '#457B9D', solid: r.base }, { name: 'Pieza (referencia)', color: '#BBBBBB', solid: r.model }, ...r.walls.map((w, i) => ({ name: `Pared ${i + 1}`, color: '#457B9D', solid: w }))]);
          const vol = r.inner[0] * r.inner[1] * r.inner[2] / 1000 - model.volume() / 1000;
          $('info').textContent = `Caja de ${r.inner.map(x => Math.round(x)).join(' × ')} mm por dentro. Vas a necesitar unos ${Math.round(vol * 1.1)} cm³ de silicona.`;
        }
        status('Molde listo. Revisalo y exportalo.');
      } catch (e) { console.error(e); status(e.message || 'No pude armar el molde', true); }
    }, 30);
  }
  async function open(f) {
    status(`Leyendo ${f.name}…`);
    try {
      const buf = await f.arrayBuffer();
      if (/\.3mf$/i.test(f.name)) { const list = read3MF(buf); model = list.map(o => meshToManifold({ verts: o.verts, tris: o.tris })).reduce((a, s) => a.add(s)); }
      else model = meshToManifold(parseSTLMesh(buf));
      name = f.name.replace(/\.(stl|3mf)$/i, '');
      make();
    } catch (e) { status(e.message, true); }
  }
  $('file').addEventListener('change', e => { if (e.target.files[0]) open(e.target.files[0]); e.target.value = ''; });
  app.addEventListener('dragover', e => e.preventDefault());
  app.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) open(f); });
  $('sample').addEventListener('click', () => { model = sampleModel(); name = 'muñeco'; make(); });
  app.querySelectorAll('[data-rot]').forEach(b => b.addEventListener('click', () => { if (!model) return; const r = [0, 0, 0]; r[+b.dataset.rot] = 90; model = model.rotate(r); const bb = model.boundingBox(); model = model.translate([0, 0, -bb.min[2]]); make(); }));
  $('kindSeg').addEventListener('click', e => { const k = e.target.dataset.kind; if (!k) return; kind = k; $('kindSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.kind === k)); $('rigidOpts').hidden = k !== 'rigid'; $('boxOpts').hidden = k !== 'box'; if (model) make(); });
  $('make').addEventListener('click', make);
  app.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => viewer.setView(b.dataset.view)));
  const out = () => parts.filter(p => !/referencia/.test(p.name));
  $('xzip').addEventListener('click', () => { if (!parts.length) return status('Primero armá el molde.', true); download(toSTLZip(out()), `molde_${name}.zip`, 'application/zip'); });
  $('x3mf').addEventListener('click', () => { if (!parts.length) return status('Primero armá el molde.', true); download(to3MF(out(), { name: `molde_${name}` }), `molde_${name}.3mf`, 'model/3mf'); });
  return () => viewer.renderer.dispose();
}
