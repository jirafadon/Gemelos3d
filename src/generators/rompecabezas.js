/**
 * Rompecabezas: piezas con encastre (lengüetas) en cuadrícula, con marco opcional
 * y un texto embutido que queda repartido entre las piezas (se arma para leerlo).
 * Las lengüetas se sortean con una "semilla": cambiándola salen piezas distintas.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export default {
  id: 'rompecabezas',
  title: 'Rompecabezas',
  description: 'Piezas con encastre en cuadrícula, con marco y un nombre repartido entre las piezas.',
  fileName: v => `rompecabezas_${v.cols}x${v.rows}_${firstLine(v.text, 'liso')}`,
  params: [
    { type: 'group', label: 'Piezas' },
    { key: 'cols', type: 'number', label: 'Columnas', default: 4, min: 2, max: 12, step: 1, unit: '' },
    { key: 'rows', type: 'number', label: 'Filas', default: 3, min: 2, max: 12, step: 1, unit: '' },
    { key: 'cell', type: 'number', label: 'Tamaño de cada pieza', default: 30, min: 15, max: 60, step: 1, unit: 'mm' },
    { key: 'tab', type: 'number', label: 'Tamaño de la lengüeta', default: 0.22, min: 0.12, max: 0.3, step: 0.01, unit: '×' },
    { key: 'gap', type: 'number', label: 'Holgura entre piezas', default: 0.25, min: 0.1, max: 0.8, step: 0.05, unit: 'mm', hint: 'Más holgura = encastra más suelto.' },
    { key: 'seed', type: 'number', label: 'Variante de piezas', default: 7, min: 1, max: 999, step: 1, unit: '', hint: 'Cambiala para sortear otras formas de piezas.' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },

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
    const R = C * v.tab / 2;
    // Lengüeta: círculo + cuello, apoyada en el borde y saliendo hacia +Y
    const knob = circle(R, 40).translate([0, R * 0.95]).add(CrossSection.square([R * 0.9, R * 0.9], false).translate([-R * 0.45, -0.01]));
    // Bordes interiores: sentido sorteado (+1 sale hacia la pieza de arriba/derecha)
    const hDir = [], vDir = [];
    for (let i = 0; i < nx; i++) for (let j = 1; j < ny; j++) hDir[i * ny + j] = rand() < 0.5 ? 1 : -1;
    for (let i = 1; i < nx; i++) for (let j = 0; j < ny; j++) vDir[i * ny + j] = rand() < 0.5 ? 1 : -1;
    // Forma de la lengüeta de cada borde, en el mundo
    const hKnob = (i, j) => { const d = hDir[i * ny + j]; const k = d > 0 ? knob : knob.mirror([0, 1]); return k.translate([(i + 0.5) * C - W / 2 + (rand2(i, j) - 0.5) * C * 0.15, j * C - H / 2]); };
    const vKnob = (i, j) => { const d = vDir[i * ny + j]; const k = (d > 0 ? knob : knob.mirror([0, 1])).rotate(-90); return k.translate([i * C - W / 2, (j + 0.5) * C - H / 2 + (rand2(j + 50, i) - 0.5) * C * 0.15]); };
    function rand2(a, b) { const r = rng(v.seed * 131 + a * 977 + b * 7919); return r(); }

    const pieces = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      let p = CrossSection.square([C, C], false).translate([i * C - W / 2, j * C - H / 2]);
      // abajo (borde j) / arriba (borde j+1) / izquierda (i) / derecha (i+1)
      if (j > 0) p = hDir[i * ny + j] < 0 ? p.add(hKnob(i, j)) : p.subtract(hKnob(i, j));
      if (j < ny - 1) p = hDir[i * ny + j + 1] > 0 ? p.add(hKnob(i, j + 1)) : p.subtract(hKnob(i, j + 1));
      if (i > 0) p = vDir[i * ny + j] < 0 ? p.add(vKnob(i, j)) : p.subtract(vKnob(i, j));
      if (i < nx - 1) p = vDir[(i + 1) * ny + j] > 0 ? p.add(vKnob(i + 1, j)) : p.subtract(vKnob(i + 1, j));
      pieces.push({ shape: p.offset(-v.gap / 2, 'Round', 2, 16), odd: (i + j) % 2 === 1 });
    }

    let text2d = null;
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      text2d = fitInto(stackLines(String(v.text).split('\n').map(t => ({ font, text: t, height: 10 })), 2), W * 0.85, H * 0.7);
    }
    const inlay = 0.6;
    const parts = [];
    for (const pc of pieces) {
      let solid = slab(pc.shape, v.thick);
      if (text2d) {
        const t = text2d.intersect(pc.shape);
        if (!t.isEmpty()) {
          const ts = slab(t, inlay, v.thick - inlay);
          solid = solid.subtract(ts);
          parts.push(part('Texto', v.cText, ts));
        }
      }
      parts.push(part(v.checker && pc.odd ? 'Piezas (alternadas)' : 'Piezas', v.checker && pc.odd ? v.c2 : v.c1, solid));
    }
    if (v.frame) {
      const inner = CrossSection.square([W + v.gap, H + v.gap], true);
      const outer = roundedRect(W + 2 * v.frameW, H + 2 * v.frameW, Math.min(6, v.frameW));
      parts.push(part('Marco', v.cFrame, slab(outer.subtract(inner), v.thick)));
    }
    return mergeByColor(parts);
  },
};
