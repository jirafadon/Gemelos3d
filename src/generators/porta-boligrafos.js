/**
 * Porta-marcadores: bloque con una grilla de agujeros para marcadores, pinceles,
 * fibras o lápices, en filas rectas o en tresbolillo, con escalones opcionales
 * (cada fila más alta, para ver los colores) y nombre al frente.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'porta-boligrafos',
  title: 'Porta-marcadores',
  description: 'Grilla de agujeros para marcadores o pinceles, con escalones y nombre al frente.',
  fileName: v => `porta_marcadores_${v.cols}x${v.rows}_${firstLine(v.text, 'liso')}`,
  params: [
    { type: 'group', label: 'Agujeros' },
    { key: 'holeD', type: 'number', label: 'Diámetro del agujero', default: 15, min: 4, max: 40, step: 0.5, unit: 'mm', hint: 'Medí el marcador con tapa y sumale 1 mm.' },
    { key: 'cols', type: 'number', label: 'Columnas', default: 6, min: 1, max: 20, step: 1, unit: '' },
    { key: 'rows', type: 'number', label: 'Filas', default: 3, min: 1, max: 10, step: 1, unit: '' },
    { key: 'gap', type: 'number', label: 'Separación entre agujeros', default: 3, min: 1.2, max: 15, step: 0.2, unit: 'mm' },
    { key: 'stagger', type: 'toggle', label: 'En tresbolillo (filas corridas)', default: false },
    { key: 'depth', type: 'number', label: 'Profundidad', default: 35, min: 8, max: 120, step: 1, unit: 'mm' },

    { type: 'group', label: 'Bloque' },
    { key: 'steps', type: 'toggle', label: 'En escalones (cada fila más alta)', default: true },
    { key: 'step', type: 'number', label: 'Alto de cada escalón', default: 12, min: 3, max: 40, step: 1, unit: 'mm', show: v => v.steps },
    { key: 'floor', type: 'number', label: 'Piso debajo de los agujeros', default: 3, min: 1, max: 10, step: 0.5, unit: 'mm' },
    { key: 'margin', type: 'number', label: 'Borde', default: 5, min: 2, max: 20, step: 0.5, unit: 'mm' },
    { key: 'text', type: 'text', label: 'Nombre al frente (opcional)', default: 'Colores' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo', show: v => !!(v.text || '').trim() },
    { key: 'color', type: 'color', label: 'Bloque', default: '#8AC926' },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#F5F5F5', show: v => !!(v.text || '').trim() },
  ],

  async build(v, ctx) {
    const { Manifold } = wasm();
    const p = v.holeD + v.gap, rowP = v.stagger ? p * Math.sqrt(3) / 2 : p;
    const W = v.cols * p - v.gap + (v.stagger && v.rows > 1 ? p / 2 : 0) + 2 * v.margin;
    const D = (v.rows - 1) * rowP + v.holeD + 2 * v.margin;
    const baseH = v.floor + v.depth;
    let body = null;
    const holes = [];
    for (let j = 0; j < v.rows; j++) {
      // Fila 0 adelante (abajo); con escalones, cada fila de atrás sube un escalón
      const rowH = baseH + (v.steps ? j * v.step : 0);
      const y = -D / 2 + v.margin + v.holeD / 2 + j * rowP;
      const y0 = j === 0 ? -D / 2 : y - rowP / 2, y1 = j === v.rows - 1 ? D / 2 : y + rowP / 2;
      const band = slab(roundedRect(W, D, 4).intersect(wasm().CrossSection.square([W + 2, y1 - y0], true).translate([0, (y0 + y1) / 2])), rowH);
      body = body ? body.add(band) : band;
      for (let i = 0; i < v.cols; i++) {
        const x = -W / 2 + v.margin + v.holeD / 2 + i * p + (v.stagger && j % 2 ? p / 2 : 0);
        holes.push(slab(circle(v.holeD / 2, 48).translate([x, y]), v.depth + 1, rowH - v.depth));
      }
    }
    body = body.subtract(Manifold.union(holes));
    const parts = [];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }], 0), W - 2 * v.margin, baseH * 0.5);
      // En relieve sobre la cara de adelante (-Y), centrado en el alto del primer escalón
      parts.push(part('Nombre', v.cText, txt.extrude(1.2).rotate([90, 0, 0]).translate([0, -D / 2, baseH / 2])));
    }
    parts.push(part('Bloque', v.color, body));
    return mergeByColor(parts);
  },
};
