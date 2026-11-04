/**
 * Rompecabezas: piezas con encastre (lengüetas) en cuadrícula, con marco opcional
 * y un texto embutido que queda repartido entre las piezas (se arma para leerlo).
 * Las lengüetas se sortean con una "semilla": cambiándola salen piezas distintas.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, heart, stretchTo } from '../engine/shapes.js';
import { maskToShape, sampleColorLayers } from '../engine/trace.js';
import { firstLine, imageParams, silhouette } from './_common.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default {
  id: 'rompecabezas',
  title: 'Rompecabezas',
  description: 'Rectangular, redondo, hexagonal, corazón o con la silueta de tu imagen; con foto en colores o un nombre repartido entre las piezas.',
  fileName: v => `rompecabezas_${v.cols}x${v.rows}_${firstLine(v.text, 'liso')}`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'outline', type: 'segment', label: 'Contorno', default: 'rect', options: [{ value: 'rect', label: 'Rectangular' }, { value: 'circle', label: 'Redondo' }, { value: 'hex', label: 'Hexagonal' }, { value: 'heart', label: 'Corazón' }, { value: 'image', label: 'Silueta de imagen' }] },
    ...imageParams({ label: 'Imagen para la silueta', showIf: v => v.outline === 'image' }).filter(p => ['image', 'removeBg', 'bgTol', 'threshold', 'invert', 'smooth'].includes(p.key)),

    { type: 'group', label: 'Piezas' },
    { key: 'cols', type: 'number', label: 'Columnas', default: 4, min: 2, max: 12, step: 1, unit: '' },
    { key: 'rows', type: 'number', label: 'Filas', default: 3, min: 2, max: 12, step: 1, unit: '' },
    { key: 'cell', type: 'number', label: 'Tamaño de cada pieza', default: 30, min: 15, max: 60, step: 1, unit: 'mm' },
    { key: 'tab', type: 'number', label: 'Tamaño de la lengüeta', default: 0.22, min: 0.12, max: 0.3, step: 0.01, unit: '×' },
    { key: 'gap', type: 'number', label: 'Holgura entre piezas', default: 0.25, min: 0.1, max: 0.8, step: 0.05, unit: 'mm', hint: 'Más holgura = encastra más suelto.' },
    { key: 'jitter', type: 'number', label: 'Variación de las piezas', default: 30, min: 0, max: 100, step: 5, unit: '%', hint: 'Mueve y cambia el tamaño de las lengüetas para que ninguna pieza sea igual.' },
    { key: 'seed', type: 'number', label: 'Variante de piezas', default: 7, min: 1, max: 999, step: 1, unit: '', hint: 'Cambiala para sortear otras formas de piezas.' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },

    { type: 'group', label: 'Dibujo arriba (opcional)' },
    { key: 'photo', type: 'image', label: 'Foto o dibujo en colores', default: '', hint: 'Se separa en colores y queda embutida en las piezas: hay que armarlo para verlo entero.' },
    { key: 'photoColors', type: 'segment', label: 'Colores de la foto', default: 4, options: [2, 3, 4, 5, 6].map(n => ({ value: n, label: String(n) })), show: v => !!v.photo },
    { key: 'photoBg', type: 'toggle', label: 'Quitar el fondo de la foto', default: false, show: v => !!v.photo },

    { type: 'group', label: 'Texto (opcional)' },
    { key: 'text', type: 'text', label: 'Texto repartido en las piezas', default: 'Feliz día', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => !!(v.text || '').trim() },

    { type: 'group', label: 'Marco' },
    { key: 'frame', type: 'toggle', label: 'Con marco', default: true },
    { key: 'frameW', type: 'number', label: 'Ancho del marco', default: 8, min: 4, max: 25, step: 0.5, unit: 'mm', show: v => v.frame },

    { type: 'group', label: 'Colores' },
    { key: 'checker', type: 'toggle', label: 'Piezas en dos colores alternados', default: true },
    { key: 'c1', type: 'color', label: 'Piezas', default: '#2A9D8F' },
    { key: 'c2', type: 'color', label: 'Piezas (alternadas)', default: '#F4A261', show: v => v.checker },
    { key: 'cText', type: 'color', label: 'Texto', default: '#F5F5F5', show: v => !!(v.text || '').trim() },
    { key: 'cFrame', type: 'color', label: 'Marco', default: '#264653', show: v => v.frame },
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    const C = v.cell, nx = v.cols, ny = v.rows, W = nx * C, H = ny * C;
    const rand = rng(v.seed * 9973 + nx * 31 + ny);
    const J = (v.jitter ?? 30) / 100;
    const R = C * v.tab / 2;
    // Lengüeta: círculo + cuello, apoyada en el borde y saliendo hacia +Y
    const knobOf = k => circle(R * k, 40).translate([0, R * k * 0.95]).add(CrossSection.square([R * k * 0.9, R * k * 0.9], false).translate([-R * k * 0.45, -0.01]));
    // Bordes interiores: sentido sorteado (+1 sale hacia la pieza de arriba/derecha)
    const hDir = [], vDir = [];
    for (let i = 0; i < nx; i++) for (let j = 1; j < ny; j++) hDir[i * ny + j] = rand() < 0.5 ? 1 : -1;
    for (let i = 1; i < nx; i++) for (let j = 0; j < ny; j++) vDir[i * ny + j] = rand() < 0.5 ? 1 : -1;
    function rand2(a, b) { const r = rng(v.seed * 131 + a * 977 + b * 7919); return r(); }
    const size = (a, b) => 1 + (rand2(a + 300, b) - 0.5) * 0.5 * J;
    // Forma de la lengüeta de cada borde, en el mundo
    const hKnob = (i, j) => { const k = knobOf(size(i, j)); const d = hDir[i * ny + j]; return (d > 0 ? k : k.mirror([0, 1])).translate([(i + 0.5) * C - W / 2 + (rand2(i, j) - 0.5) * C * 0.4 * J, j * C - H / 2]); };
    const vKnob = (i, j) => { const k = knobOf(size(j + 50, i)); const d = vDir[i * ny + j]; return (d > 0 ? k : k.mirror([0, 1])).rotate(-90).translate([i * C - W / 2, (j + 0.5) * C - H / 2 + (rand2(j + 50, i) - 0.5) * C * 0.4 * J]); };

    // Contorno del rompecabezas
    let outline = null;
    if (v.outline === 'circle') outline = circle(Math.min(W, H) / 2, 160);
    else if (v.outline === 'hex') outline = stretchTo(circle(10, 6).rotate(30), W, H);
    else if (v.outline === 'heart') outline = stretchTo(heart(100), W, H);
    else if (v.outline === 'image') outline = stretchTo(fillAll(await silhouette(v, ctx, 100, { fill: true })), W, H);

    const pieces = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      let p = CrossSection.square([C, C], false).translate([i * C - W / 2, j * C - H / 2]);
      // abajo (borde j) / arriba (borde j+1) / izquierda (i) / derecha (i+1)
      if (j > 0) p = hDir[i * ny + j] < 0 ? p.add(hKnob(i, j)) : p.subtract(hKnob(i, j));
      if (j < ny - 1) p = hDir[i * ny + j + 1] > 0 ? p.add(hKnob(i, j + 1)) : p.subtract(hKnob(i, j + 1));
      if (i > 0) p = vDir[i * ny + j] < 0 ? p.add(vKnob(i, j)) : p.subtract(vKnob(i, j));
      if (i < nx - 1) p = vDir[(i + 1) * ny + j] > 0 ? p.add(vKnob(i + 1, j)) : p.subtract(vKnob(i + 1, j));
      if (outline) p = p.intersect(outline);
      pieces.push({ shape: p, odd: (i + j) % 2 === 1, i, j });
    }
    // Con contorno, las piecitas que quedan muy chicas se pegan a la vecina más grande
    if (outline) {
      const min = C * C * 0.25;
      for (const pc of pieces) {
        for (const part of pc.shape.decompose()) {
          if (part.area() >= min) continue;
          let best = null, ba = 0;
          for (const o of pieces) {
            if (o === pc || Math.abs(o.i - pc.i) + Math.abs(o.j - pc.j) !== 1) continue;
            const touch = o.shape.offset(0.05, 'Miter', 2, 4).intersect(part);
            if (!touch.isEmpty() && o.shape.area() > ba) { ba = o.shape.area(); best = o; }
          }
          if (best) { best.shape = best.shape.add(part); pc.shape = pc.shape.subtract(part.offset(0.01, 'Miter', 2, 4)); }
        }
      }
    }
    for (const pc of pieces) pc.shape = pc.shape.offset(-v.gap / 2, 'Round', 2, 16);
    const live = pieces.filter(pc => !pc.shape.isEmpty() && pc.shape.area() > 1);
    pieces.length = 0; pieces.push(...live);

    let text2d = null;
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      text2d = fitInto(stackLines(String(v.text).split('\n').map(t => ({ font, text: t, height: 10 })), 2), W * (outline ? 0.6 : 0.85), H * (outline ? 0.45 : 0.7));
    }
    // Foto en colores sobre todas las piezas
    let photo = [];
    if (v.photo) {
      const res = ctx.colors ? await ctx.colors(v.photo, { colors: +v.photoColors, maxPx: 360, removeBg: !!v.photoBg }) : sampleColorLayers();
      let used = null;
      const layers = res.layers.map(l => ({ color: l.color, cs: maskToShape(l.mask, { width: 100, smooth: 0.3, minArea: 0.01, center: false }) })).filter(l => !l.cs.isEmpty());
      if (layers.length) {
        const all = CrossSection.union(layers.map(l => l.cs)), b = all.bounds();
        const k = Math.max(W / (b.max[0] - b.min[0]), H / (b.max[1] - b.min[1])); // cubre todo
        const c = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2];
        const clip = outline || CrossSection.square([W, H], true);
        photo = layers.map(l => { let cs = l.cs.translate(c).scale([k, k]).intersect(clip); if (used) cs = cs.subtract(used); used = used ? used.add(cs) : cs; return { color: l.color, cs }; }).filter(l => !l.cs.isEmpty());
      }
    }
    const inlay = 0.6;
    const parts = [];
    for (const pc of pieces) {
      let solid = slab(pc.shape, v.thick);
      for (const [n, l] of photo.entries()) {
        const t = l.cs.intersect(pc.shape);
        if (t.isEmpty()) continue;
        const ts = slab(t, inlay, v.thick - inlay);
        solid = solid.subtract(ts);
        parts.push(part(`Foto ${n + 1}`, l.color, ts));
      }
      if (text2d) {
        let t = text2d.intersect(pc.shape);
        for (const l of photo) t = t.subtract(l.cs);
        if (!t.isEmpty()) {
          const ts = slab(t, inlay, v.thick - inlay);
          solid = solid.subtract(ts);
          parts.push(part('Texto', v.cText, ts));
        }
      }
      parts.push(part(v.checker && pc.odd ? 'Piezas (alternadas)' : 'Piezas', v.checker && pc.odd ? v.c2 : v.c1, solid));
    }
    if (v.frame) {
      const inner = outline ? outline.offset(v.gap / 2, 'Round', 2, 24) : CrossSection.square([W + v.gap, H + v.gap], true);
      const outer = outline ? outline.offset(v.frameW, 'Round', 2, 32) : roundedRect(W + 2 * v.frameW, H + 2 * v.frameW, Math.min(6, v.frameW));
      parts.push(part('Marco', v.cFrame, slab(outer.subtract(inner), v.thick)));
    }
    return mergeByColor(parts);
  },
};

/** Silueta sin agujeros y de una sola pieza (la isla más grande). */
function fillAll(cs) {
  const list = cs.decompose().sort((a, b) => b.area() - a.area());
  const big = list[0] || cs;
  const polys = big.toPolygons().filter(p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a > 0; });
  return polys.length ? new (wasm().CrossSection)(polys, 'Positive') : big;
}
