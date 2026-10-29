/**
 * Marcapáginas: tira fina con el nombre.
 * "Clásico": tira con el texto a lo largo y agujero para la borla.
 * "Asoma del libro": el nombre arriba (queda afuera del libro) y una lengüeta larga que va adentro.
 */
import { roundedRect, circle } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { heart, star } from '../engine/shapes.js';
import { colorsParams, modeParam, firstLine } from './_common.js';

export default {
  id: 'marcapaginas',
  title: 'Marcapáginas',
  description: 'Tira con tu nombre, o el nombre que asoma arriba del libro.',
  fileName: v => `marcapaginas_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Nombre o frase', default: 'Martina' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico' },

    { type: 'group', label: 'Marcapáginas' },
    { key: 'style', type: 'segment', label: 'Estilo', default: 'peek', options: [{ value: 'peek', label: 'Asoma del libro' }, { value: 'strip', label: 'Clásico' }] },
    { key: 'width', type: 'number', label: 'Ancho de la tira', default: 22, min: 12, max: 50, step: 1, unit: 'mm' },
    { key: 'length', type: 'number', label: 'Largo total', default: 150, min: 80, max: 220, step: 5, unit: 'mm' },
    { key: 'textH', type: 'number', label: 'Alto del texto', default: 16, min: 6, max: 40, step: 0.5, unit: 'mm', show: v => v.style === 'peek', hint: 'En "Clásico" el texto se ajusta solo al ancho de la tira.' },
    { key: 'deco', type: 'segment', label: 'Adorno', default: 'heart', options: [{ value: 'none', label: 'Ninguno' }, { value: 'heart', label: 'Corazón' }, { value: 'star', label: 'Estrella' }] },
    { key: 'tassel', type: 'toggle', label: 'Agujero para borla', default: true, show: v => v.style === 'strip' },

    ...colorsParams({ max: 2, base: '#F5F5F5', text: '#BE185D', baseLabel: 'Tira' }),
    modeParam(),
    { type: 'group', label: 'Espesores' },
    { key: 'hBase', type: 'number', label: 'Tira', default: 1.2, min: 0.8, max: 3, step: 0.2, unit: 'mm', hint: 'Fino entra mejor en el libro; 1,2 mm ya es firme.' },
    { key: 'hText', type: 'number', label: 'Relieve del texto', default: 0.8, min: 0.4, max: 2, step: 0.2, unit: 'mm' },
  ],

  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const W = v.width, L = v.length;
    const deco = s => v.deco === 'heart' ? heart(s, s * 0.9) : v.deco === 'star' ? star(s) : null;

    if (v.style === 'strip') {
      // El texto corre a lo largo de la tira (girado 90°)
      const strip = roundedRect(W, L, Math.min(W / 2, 6));
      let text = stackLines([{ font, text: v.text || ' ', height: 10 }], 0);
      const b = text.bounds();
      const tw = b.max[0] - b.min[0], th = b.max[1] - b.min[1];
      const room = L - (v.tassel ? 24 : 12) - (v.deco !== 'none' ? W : 0);
      const k = Math.min(room / tw, (W * 0.68) / th);
      text = text.scale(k).rotate(90);
      const shiftY = (v.deco !== 'none' ? -W / 2 : 0) + (v.tassel ? -6 : 0);
      let top = text.translate([0, shiftY]);
      const d = deco(W * 0.55);
      if (d) top = top.add(d.translate([0, L / 2 - (v.tassel ? 18 : 6) - W * 0.4]));
      top = top.add(strip.subtract(strip.offset(-1.2, 'Round', 2, 32)));
      let base = strip;
      if (v.tassel) {
        const hole = circle(2.5).translate([0, L / 2 - 6]);
        base = base.subtract(hole);
        top = top.subtract(hole.offset(1.2, 'Round', 2, 24));
      }
      return layered({ base2d: base, text2d: top, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
    }

    // Asoma del libro: nombre con contorno + lengüeta
    let text = stackLines([{ font, text: v.text || ' ', height: v.textH }], 0);
    const d = deco(v.textH * 0.9);
    if (d) {
      const b = text.bounds();
      text = text.add(d.translate([b.max[0] + v.textH * 0.45, 0]));
    }
    const tb = text.bounds();
    text = text.translate([-(tb.min[0] + tb.max[0]) / 2, -(tb.min[1] + tb.max[1]) / 2]);
    const head = text.offset(2.4, 'Round', 2, 32);
    const hb = head.bounds();
    const tongueW = Math.min(W, hb.max[0] - hb.min[0]);
    const tongueL = L - (hb.max[1] - hb.min[1]);
    const tongue = roundedRect(tongueW, tongueL + 6, Math.min(tongueW / 2, 4)).translate([0, hb.min[1] - tongueL / 2 + 3]);
    const base = head.add(tongue);
    return layered({ base2d: base, text2d: text, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
