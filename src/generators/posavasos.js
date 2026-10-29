/**
 * Posavasos: redondo, cuadrado, hexagonal u ondulado, con borde y un diseño arriba
 * (nombre, anillos o panal de abejas), en 1 o 2 colores. Se imprime plano.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { wavyOval, fitInto } from '../engine/shapes.js';
import { colorsParams, modeParam, firstLine } from './_common.js';

export default {
  id: 'posavasos',
  title: 'Posavasos',
  description: 'Redondo, cuadrado, hexagonal u ondulado, con nombre, anillos o panal.',
  fileName: v => `posavasos_${v.design === 'text' ? firstLine(v.text) : v.design}`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'round', options: [{ value: 'round', label: 'Redondo' }, { value: 'square', label: 'Cuadrado' }, { value: 'hex', label: 'Hexagonal' }, { value: 'wavy', label: 'Ondulado' }] },
    { key: 'size', type: 'number', label: 'Tamaño', default: 95, min: 60, max: 150, step: 1, unit: 'mm' },
    { key: 'rim', type: 'number', label: 'Borde', default: 3, min: 0, max: 10, step: 0.5, unit: 'mm', hint: '0 = sin borde.' },

    { type: 'group', label: 'Diseño' },
    { key: 'design', type: 'segment', label: 'Diseño', default: 'text', options: [{ value: 'text', label: 'Nombre' }, { value: 'rings', label: 'Anillos' }, { value: 'honey', label: 'Panal' }, { value: 'none', label: 'Liso' }] },
    { key: 'text', type: 'text', label: 'Texto', default: 'Salud!', multiline: true, show: v => v.design === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'lobster', show: v => v.design === 'text' },
    { key: 'cell', type: 'number', label: 'Tamaño del dibujo', default: 9, min: 4, max: 20, step: 0.5, unit: 'mm', show: v => v.design === 'rings' || v.design === 'honey' },
    { key: 'line', type: 'number', label: 'Grosor de las líneas', default: 1.4, min: 0.8, max: 4, step: 0.1, unit: 'mm', show: v => v.design === 'rings' || v.design === 'honey' },

    ...colorsParams({ max: 2, base: '#264653', text: '#E9C46A', baseLabel: 'Posavasos' }),
    modeParam(),
    { type: 'group', label: 'Espesores' },
    { key: 'hBase', type: 'number', label: 'Base', default: 3.6, min: 2, max: 8, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Relieve del diseño y el borde', default: 1, min: 0.4, max: 3, step: 0.2, unit: 'mm' },
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    const S = v.size, r = S / 2;
    const base = v.shape === 'round' ? circle(r, 128)
      : v.shape === 'square' ? roundedRect(S, S, S * 0.1)
        : v.shape === 'hex' ? circle(r, 6).rotate(30).offset(-2, 'Round', 2, 16).offset(2, 'Round', 2, 16)
          : wavyOval(S, S, 14, 0.05);
    const inner = v.rim > 0 ? base.offset(-v.rim, 'Round', 2, 32) : base;
    const field = inner.offset(-Math.max(1.5, v.rim > 0 ? 2 : 3), 'Round', 2, 32);
    let design = null;
    if (v.design === 'text') {
      const font = await ctx.font(v.font);
      const fb = field.bounds();
      design = fitInto(stackLines(String(v.text || ' ').split('\n').map(t => ({ font, text: t, height: 10 })), 2), (fb.max[0] - fb.min[0]) * 0.8, (fb.max[1] - fb.min[1]) * 0.5);
    } else if (v.design === 'rings') {
      const rings = [];
      for (let rr = v.cell; rr < r; rr += v.cell) rings.push(circle(rr + v.line / 2, 96).subtract(circle(rr - v.line / 2, 96)));
      design = CrossSection.union(rings).intersect(field);
    } else if (v.design === 'honey') {
      const R = v.cell, dx = R * Math.sqrt(3), dy = R * 1.5;
      const hex = circle(R, 6).rotate(30);
      const cellRing = hex.subtract(hex.offset(-v.line, 'Miter', 2, 4));
      const cells = [];
      for (let j = -Math.ceil(r / dy) - 1; j <= Math.ceil(r / dy) + 1; j++) for (let i = -Math.ceil(r / dx) - 1; i <= Math.ceil(r / dx) + 1; i++) {
        cells.push(cellRing.translate([i * dx + (j % 2 ? dx / 2 : 0), j * dy]));
      }
      design = CrossSection.union(cells).intersect(field);
    }
    let top = v.rim > 0 ? base.subtract(inner) : null;
    if (design && !design.isEmpty()) top = top ? top.add(design) : design;
    if (!top) return [part('Posavasos', v.cBase, slab(base, v.hBase))];
    return layered({ base2d: base, text2d: top, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
