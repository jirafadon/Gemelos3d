/**
 * Prueba cada generador listo del catálogo con sus valores por defecto
 * y con cada opción de los selectores de colores y modo.
 */
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
import Module from 'manifold-3d';
import { setWasm } from '../src/engine/geom.js';
import { enableGC, collect } from '../src/engine/gc.js';
import { to3MF, mergedSTL } from '../src/engine/export.js';
import { GENERATORS } from '../src/catalog.js';

const FONT_FILES = {
  'pacifico': 'pacifico/files/pacifico-latin-400-normal.woff',
  'lobster': 'lobster/files/lobster-latin-400-normal.woff',
  'dancing': 'dancing-script/files/dancing-script-latin-700-normal.woff',
  'satisfy': 'satisfy/files/satisfy-latin-400-normal.woff',
  'kaushan': 'kaushan-script/files/kaushan-script-latin-400-normal.woff',
  'cookie': 'cookie/files/cookie-latin-400-normal.woff',
  'courgette': 'courgette/files/courgette-latin-400-normal.woff',
  'yellowtail': 'yellowtail/files/yellowtail-latin-400-normal.woff',
  'leckerli': 'leckerli-one/files/leckerli-one-latin-400-normal.woff',
  'damion': 'damion/files/damion-latin-400-normal.woff',
  'grand-hotel': 'grand-hotel/files/grand-hotel-latin-400-normal.woff',
  'merienda': 'merienda/files/merienda-latin-800-normal.woff',
  'caveat': 'caveat/files/caveat-latin-700-normal.woff',
  'kalam': 'kalam/files/kalam-latin-700-normal.woff',
  'marker': 'permanent-marker/files/permanent-marker-latin-400-normal.woff',
  'great-vibes': 'great-vibes/files/great-vibes-latin-400-normal.woff',
  'fredoka': 'fredoka/files/fredoka-latin-600-normal.woff',
  'baloo': 'baloo-2/files/baloo-2-latin-800-normal.woff',
  'nunito': 'nunito/files/nunito-latin-900-normal.woff',
  'varela': 'varela-round/files/varela-round-latin-400-normal.woff',
  'comfortaa': 'comfortaa/files/comfortaa-latin-700-normal.woff',
  'chewy': 'chewy/files/chewy-latin-400-normal.woff',
  'sniglet': 'sniglet/files/sniglet-latin-800-normal.woff',
  'luckiest': 'luckiest-guy/files/luckiest-guy-latin-400-normal.woff',
  'titan': 'titan-one/files/titan-one-latin-400-normal.woff',
  'bubblegum': 'bubblegum-sans/files/bubblegum-sans-latin-400-normal.woff',
  'coiny': 'coiny/files/coiny-latin-400-normal.woff',
  'rammetto': 'rammetto-one/files/rammetto-one-latin-400-normal.woff',
  'lilita': 'lilita-one/files/lilita-one-latin-400-normal.woff',
  'poppins': 'poppins/files/poppins-latin-800-normal.woff',
  'montserrat': 'montserrat/files/montserrat-latin-900-normal.woff',
  'raleway': 'raleway/files/raleway-latin-900-normal.woff',
  'rubik': 'rubik/files/rubik-latin-800-normal.woff',
  'lexend': 'lexend/files/lexend-latin-800-normal.woff',
  'archivo': 'archivo-black/files/archivo-black-latin-400-normal.woff',
  'righteous': 'righteous/files/righteous-latin-400-normal.woff',
  'russo': 'russo-one/files/russo-one-latin-400-normal.woff',
  'anton': 'anton/files/anton-latin-400-normal.woff',
  'bebas': 'bebas-neue/files/bebas-neue-latin-400-normal.woff',
  'oswald': 'oswald/files/oswald-latin-700-normal.woff',
  'fjalla': 'fjalla-one/files/fjalla-one-latin-400-normal.woff',
  'teko': 'teko/files/teko-latin-600-normal.woff',
  'league-gothic': 'league-gothic/files/league-gothic-latin-400-normal.woff',
  'staatliches': 'staatliches/files/staatliches-latin-400-normal.woff',
  'passion': 'passion-one/files/passion-one-latin-700-normal.woff',
  'playfair': 'playfair-display/files/playfair-display-latin-900-normal.woff',
  'abril': 'abril-fatface/files/abril-fatface-latin-400-normal.woff',
  'cinzel': 'cinzel/files/cinzel-latin-900-normal.woff',
  'alfa-slab': 'alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff',
  'bree': 'bree-serif/files/bree-serif-latin-400-normal.woff',
  'roboto-slab': 'roboto-slab/files/roboto-slab-latin-900-normal.woff',
  'bangers': 'bangers/files/bangers-latin-400-normal.woff',
  'bungee': 'bungee/files/bungee-latin-400-normal.woff',
  'graduate': 'graduate/files/graduate-latin-400-normal.woff',
  'black-ops': 'black-ops-one/files/black-ops-one-latin-400-normal.woff',
  'racing': 'racing-sans-one/files/racing-sans-one-latin-400-normal.woff',
  'rye': 'rye/files/rye-latin-400-normal.woff',
  'creepster': 'creepster/files/creepster-latin-400-normal.woff',
  'christmas': 'mountains-of-christmas/files/mountains-of-christmas-latin-700-normal.woff',
  'audiowide': 'audiowide/files/audiowide-latin-400-normal.woff',
  'orbitron': 'orbitron/files/orbitron-latin-900-normal.woff',
  'pixel': 'press-start-2p/files/press-start-2p-latin-400-normal.woff',
};
const fonts = {};
const ctx = { image: async () => (await import('../src/engine/trace.js')).sampleMask(120), font: async id => {
  if (!fonts[id]) { const b = fs.readFileSync(`node_modules/@fontsource/${FONT_FILES[id] || FONT_FILES.pacifico}`); fonts[id] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
  return fonts[id];
} };
before(async () => { const w = await Module(); w.setup(); enableGC(w); setWasm(w); });
afterEach(() => collect([]));

const defaults = g => Object.fromEntries(g.params.filter(p => p.key).map(p => [p.key, p.default]));

function check(name, parts) {
  assert.ok(parts.length >= 1, `${name}: sin piezas`);
  for (const p of parts) {
    assert.equal(p.solid.status(), 'NoError', `${name}/${p.name}`);
    assert.ok(p.solid.volume() > 0.5, `${name}/${p.name}: volumen ${p.solid.volume()}`);
    assert.match(p.color, /^#[0-9A-Fa-f]{6}$/, `${name}/${p.name}: color`);
  }
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const v = parts[i].solid.intersect(parts[j].solid).volume();
    assert.ok(v < 0.05, `${name}: ${parts[i].name} y ${parts[j].name} se pisan (${v.toFixed(2)} mm³)`);
  }
  assert.ok(to3MF(parts).length > 500);
  assert.ok(mergedSTL(parts).length > 84);
  collect([]);
}

const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
for (const entry of GENERATORS.filter(g => g.load && (!ONLY.length || ONLY.includes(g.id)))) {
  test(`${entry.id}: valores por defecto`, async () => {
    const gen = (await entry.load()).default;
    assert.equal(gen.id, entry.id, 'el id del módulo coincide con el catálogo');
    check(entry.id, await gen.build(defaults(gen), ctx));
  });
  test(`${entry.id}: variantes de colores y modo`, async () => {
    const gen = (await entry.load()).default;
    const base = defaults(gen);
    const colorOpts = gen.params.find(p => p.key === 'colors')?.options.map(o => o.value) || [base.colors];
    for (const colors of colorOpts) for (const mode of ['raised', 'flush']) {
      if (!('mode' in base) && mode === 'flush') continue;
      check(`${entry.id} ${colors}c ${mode}`, await gen.build({ ...base, colors, mode, cBase: '#111111', cMid: '#888888', cText: '#EEEEEE' }, ctx));
    }
    if (gen.params.some(p => p.type === 'image')) check(`${entry.id} con imagen`, await gen.build({ ...base, image: 'data:fake', source: base.source }, ctx));
    for (const p of gen.params.filter(p => p.type === 'select' || (p.type === 'segment' && !['colors', 'mode'].includes(p.key)))) {
      for (const o of p.options) check(`${entry.id} ${p.key}=${o.value}`, await gen.build({ ...base, [p.key]: o.value }, ctx));
    }
  });
}
