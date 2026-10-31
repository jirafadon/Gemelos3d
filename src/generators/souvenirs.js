/**
 * Souvenirs para eventos: una forma (corazón, estrella, nube, globo, chupete, birrete…)
 * con el nombre de cada invitado y una fecha o frase, como llavero, imán o colgante.
 * Con la lista de invitados sale uno por nombre, todos acomodados en la cama.
 */
import { circle, slab, part, addRing } from '../engine/geom.js';
import { layered, stackLines, mergeByColor } from '../engine/layers.js';
import { fitInto, heart, star, wavyOval } from '../engine/shapes.js';
import { SHAPES as LIB } from '../engine/shapes.js';
import { cloud, balloon, pacifier, birrete } from '../engine/icons2d.js';
import { textPlaceParams, placeText } from './_common.js';

const OWN = {
  heart: { label: 'Corazón', make: w => heart(w, w * 0.9), area: [0.62, 0.38, 0.05] },
  star: { label: 'Estrella', make: w => star(w, 5, 0.5, w * 0.03), area: [0.46, 0.22, -0.02] },
  circle: { label: 'Círculo', make: w => circle(w / 2, 96), area: [0.74, 0.46, 0] },
  wavy: { label: 'Ondulado', make: w => wavyOval(w, w * 0.78), area: [0.72, 0.44, 0] },
  cloud: { label: 'Nube', make: w => cloud(w), area: [0.7, 0.3, -0.02] },
  balloon: { label: 'Globo', make: w => balloon(w), area: [0.66, 0.5, 0.1] },
  pacifier: { label: 'Chupete', make: w => pacifier(w), area: [0.5, 0.2, 0] },
  birrete: { label: 'Birrete', make: w => birrete(w), area: [0.5, 0.18, 0.26] },
};
// Más formas de la biblioteca común (sin repetir las propias)
const SHAPES = { ...OWN };
for (const [k, sh] of Object.entries(LIB)) if (!SHAPES[k] && k !== 'rect') SHAPES[k] = { label: sh.label, make: w => sh.make(w, w * sh.aspect), area: sh.area };


export default {
  id: 'souvenirs',
  title: 'Souvenirs para eventos',
  description: 'Forma con el nombre de cada invitado y la fecha: llavero, imán o colgante.',
  fileName: v => `souvenirs_${v.shape}_${(String(v.names || '').split('\n').filter(Boolean).length) || 1}`,
  params: [
    { type: 'group', label: 'Invitados' },
    { key: 'names', type: 'text', label: 'Nombres (uno por línea)', default: 'Lola\nMateo\nEmma\nBruno', multiline: true, hint: 'Sale un souvenir por nombre. Vacío = todos iguales.' },
    { key: 'copies', type: 'number', label: 'Cantidad (si no hay nombres)', default: 6, min: 1, max: 60, step: 1, unit: '' },
    { key: 'extra', type: 'text', label: 'Fecha o frase', default: 'Mis 15 · 2026' },
    { key: 'font', type: 'font', label: 'Tipografía del nombre', default: 'baloo' },
    { key: 'font2', type: 'font', label: 'Tipografía de la fecha', default: 'poppins', show: v => !!(v.extra || '').trim() },

    ...textPlaceParams(),
    { type: 'group', label: 'Souvenir' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: Object.entries(SHAPES).map(([value, s]) => ({ value, label: s.label })) },
    { key: 'format', type: 'segment', label: 'Formato', default: 'key', options: [{ value: 'key', label: 'Llavero' }, { value: 'magnet', label: 'Imán' }, { value: 'hang', label: 'Colgante' }] },
    { key: 'size', type: 'number', label: 'Tamaño', default: 50, min: 25, max: 120, step: 1, unit: 'mm' },
    { key: 'frame', type: 'toggle', label: 'Borde del color del texto', default: true },
    { key: 'magnetD', type: 'number', label: 'Diámetro del imán', default: 10, min: 5, max: 25, step: 0.5, unit: 'mm', show: v => v.format === 'magnet' },
    { key: 'magnetT', type: 'number', label: 'Espesor del imán', default: 2, min: 1, max: 6, step: 0.5, unit: 'mm', show: v => v.format === 'magnet' },

    { type: 'group', label: 'Colores' },
    { key: 'colors', type: 'segment', label: 'Cantidad de colores', default: 2, options: [{ value: 1, label: '1' }, { value: 2, label: '2' }] },
    { key: 'cBase', type: 'color', label: 'Forma', default: '#F72585' },
    { key: 'cText', type: 'color', label: 'Textos y borde', default: '#F5F5F5', show: v => v.colors === 2 },
    { key: 'hBase', type: 'number', label: 'Espesor', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Relieve', default: 0.8, min: 0.4, max: 3, step: 0.2, unit: 'mm' },
  ],
  async build(v, ctx) {
    const [f1, f2] = await Promise.all([ctx.font(v.font), ctx.font(v.font2)]);
    let names = String(v.names || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 60);
    if (!names.length) names = Array(Math.max(1, Math.min(60, v.copies))).fill('');
    const S = SHAPES[v.shape] || SHAPES.heart, W = v.size;
    const shape = S.make(W);
    const sb = shape.bounds(), sw = sb.max[0] - sb.min[0], sh = sb.max[1] - sb.min[1];
    const [aw, ah, ay] = S.area;
    const pieces = [];
    for (const nm of names) {
      const lines = [];
      if (nm) lines.push({ font: f1, text: nm, height: 10 });
      if ((v.extra || '').trim()) lines.push({ font: f2, text: v.extra, height: nm ? 5 : 8 });
      let top = lines.length ? fitInto(stackLines(lines, 1.5), sw * aw, sh * ah * (lines.length > 1 ? 1.5 : 1)).translate([0, (sb.min[1] + sb.max[1]) / 2 + sh * ay]) : null;
      if (top) top = placeText(top, v, shape);
      if (v.frame) { const ring = shape.subtract(shape.offset(-1.4, 'Round', 2, 32)); top = top ? top.add(ring) : ring; }
      if (!top) top = shape.subtract(shape.offset(-1.4, 'Round', 2, 32));
      let base = shape;
      if (v.format === 'key') base = addRing(shape, { side: 'top', holeD: 4, wall: 2.4 }).shape;
      if (v.format === 'hang') base = addRing(shape, { side: 'top', holeD: 2.5, wall: 1.8 }).shape;
      let parts = layered({ base2d: base, text2d: top, colors: v.colors, mode: 'raised', cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
      if (v.format === 'magnet') {
        const hole = slab(circle(v.magnetD / 2 + 0.2, 48), Math.min(v.magnetT + 0.2, v.hBase - 0.8), -0.01);
        parts = parts.map(p => (p.name === 'Base' || p.name === 'Pieza' ? { ...p, solid: p.solid.subtract(hole) } : p));
      }
      pieces.push(parts);
    }
    const cols = Math.ceil(Math.sqrt(pieces.length)), gx = sw + 8 + (v.format === 'magnet' ? 0 : 0), gy = sh + 14;
    const out = [];
    pieces.forEach((parts, i) => { const off = [(i % cols) * gx, -Math.floor(i / cols) * gy, 0]; for (const p of parts) out.push({ ...p, solid: p.solid.translate(off) }); });
    return mergeByColor(out);
  },
};
