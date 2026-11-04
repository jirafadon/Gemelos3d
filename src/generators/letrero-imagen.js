/**
 * Letrero con imagen: una o dos líneas de texto más un ícono o tu dibujo al lado o arriba,
 * sobre una placa con contorno, en 2 o 3 colores, con base para pararlo o agujeros para colgar.
 */
import { wasm, circle, roundedRect, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines, slotBase, placeBelow } from '../engine/layers.js';
import { SHAPES, fitInto, star, heart } from '../engine/shapes.js';
import { ICONS } from '../engine/icons2d.js';
import { imageParams, silhouette, firstLine } from './_common.js';

const ICON_KEYS = ['image', 'star', 'heart', ...Object.keys(ICONS).filter(k => ICONS[k].make), ...['paw', 'house', 'cloudShape', 'flower', 'moon', 'crown', 'balloonShape'].filter(k => SHAPES[k])];
const label = k => (k === 'image' ? 'Mi dibujo' : ICONS[k]?.label || SHAPES[k]?.label || k);

export default {
  id: 'letrero-imagen',
  title: 'Letrero con imagen',
  description: 'Una o dos líneas de texto más un ícono o tu dibujo, sobre una placa con contorno en 2 o 3 colores.',
  fileName: v => `letrero_${firstLine(v.line1, v.line2)}`,
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'line1', type: 'text', label: 'Línea 1', default: 'Taller' },
    { key: 'font1', type: 'font', label: 'Tipografía', default: 'lobster' },
    { key: 'line2', type: 'text', label: 'Línea 2', default: 'de Joni' },
    { key: 'font2', type: 'font', label: 'Tipografía de la línea 2', default: 'poppins', show: v => !!(v.line2 || '').trim() },

    { type: 'group', label: 'Imagen' },
    { key: 'icon', type: 'select', label: 'Ícono', default: 'heart', options: ICON_KEYS.map(k => ({ value: k, label: label(k) })) },
    ...imageParams({ label: 'Dibujo', showIf: v => v.icon === 'image' }).filter(p => ['image', 'removeBg', 'bgTol', 'threshold', 'invert', 'smooth', 'specks'].includes(p.key)),
    { key: 'where', type: 'segment', label: 'Dónde va', default: 'left', options: [{ value: 'left', label: 'A la izquierda' }, { value: 'top', label: 'Arriba' }, { value: 'right', label: 'A la derecha' }] },
    { key: 'iconSize', type: 'number', label: 'Tamaño del ícono', default: 100, min: 40, max: 200, step: 5, unit: '%' },

    { type: 'group', label: 'Placa' },
    { key: 'width', type: 'number', label: 'Ancho', default: 180, min: 60, max: 400, step: 1, unit: 'mm' },
    { key: 'plate', type: 'segment', label: 'Forma', default: 'contour', options: [{ value: 'contour', label: 'Contorno' }, { value: 'rect', label: 'Rectangular' }, { value: 'pill', label: 'Píldora' }] },
    { key: 'border', type: 'number', label: 'Borde', default: 5, min: 2, max: 20, step: 0.5, unit: 'mm' },
    { key: 'colors', type: 'segment', label: 'Colores', default: 2, options: [{ value: 2, label: '2' }, { value: 3, label: '3' }] },
    { key: 'base', type: 'number', label: 'Espesor de la placa', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm' },
    { key: 'relief', type: 'number', label: 'Relieve', default: 2, min: 0.6, max: 6, step: 0.2, unit: 'mm' },
    { key: 'mount', type: 'segment', label: 'Para', default: 'stand', options: [{ value: 'stand', label: 'Parar (base)' }, { value: 'hang', label: 'Colgar' }, { value: 'none', label: 'Nada' }] },
    { key: 'cBase', type: 'color', label: 'Placa', default: '#264653' },
    { key: 'cMid', type: 'color', label: 'Contorno medio', default: '#E9C46A', show: v => +v.colors === 3 },
    { key: 'cText', type: 'color', label: 'Texto e ícono', default: '#F5F5F5' },
  ],
  async build(v, ctx) {
    const { CrossSection, Manifold } = wasm();
    const [f1, f2] = await Promise.all([ctx.font(v.font1), ctx.font(v.font2 || v.font1)]);
    const lines = [];
    if ((v.line1 || '').trim()) lines.push({ font: f1, text: v.line1, height: 20 });
    if ((v.line2 || '').trim()) lines.push({ font: f2, text: v.line2, height: 11 });
    let text = lines.length ? stackLines(lines, 3) : CrossSection.square([0.01, 0.01], true);
    const tb = text.bounds(), th = tb.max[1] - tb.min[1];
    const isz = th * 1.15 * (v.iconSize / 100);
    let icon = v.icon === 'image' ? await silhouette(v, ctx, 100) : v.icon === 'star' ? star(10, 5, 0.45, 0.4) : v.icon === 'heart' ? heart(10) : ICONS[v.icon]?.make ? ICONS[v.icon].make(10) : SHAPES[v.icon].make(10, 10);
    icon = fitInto(icon, isz, isz);
    const ib = icon.bounds(), gap = th * 0.18;
    const tw = tb.max[0] - tb.min[0], iw = ib.max[0] - ib.min[0];
    text = text.translate([-(tb.min[0] + tb.max[0]) / 2, -(tb.min[1] + tb.max[1]) / 2]);
    if (v.where === 'top') icon = icon.translate([0, th / 2 + gap + isz / 2]);
    else { const s = v.where === 'left' ? -1 : 1; icon = icon.translate([s * (tw / 2 + gap + iw / 2), 0]); }
    let art = text.add(icon);
    const ab = art.bounds();
    const k = (v.width - 2 * v.border) / (ab.max[0] - ab.min[0]);
    art = art.translate([-(ab.min[0] + ab.max[0]) / 2, -(ab.min[1] + ab.max[1]) / 2]).scale([k, k]);
    const border = v.border;
    let plate;
    const bb = art.bounds(), W = bb.max[0] - bb.min[0] + 2 * border, H = bb.max[1] - bb.min[1] + 2 * border;
    if (v.plate === 'rect') plate = roundedRect(W, H, Math.min(10, H * 0.15));
    else if (v.plate === 'pill') plate = roundedRect(W + H * 0.3, H, H / 2);
    else {
      plate = fillHoles(outline(art, border));
      // Si el ícono quedó separado del texto, la placa los une (cierre: engordar y volver)
      for (let k2 = 1; plate.decompose().length > 1 && k2 < 6; k2++) plate = fillHoles(outline(art, border + k2 * border).offset(-k2 * border, 'Round', 2, 24));
    }
    const parts = [];
    let base = slab(plate, v.base);
    if (v.mount === 'hang') for (const s of [-1, 1]) base = base.subtract(Manifold.cylinder(v.base + 2, 2, 2, 24).translate([s * (W / 2 - border * 0.6 - 3), bb.max[1] + border * 0.3, -1]));
    parts.push(part('Placa', v.cBase, base));
    let z = v.base;
    if (+v.colors === 3) { parts.push(part('Contorno medio', v.cMid, slab(fillHoles(outline(art, Math.max(1, border * 0.4))).intersect(plate), 1, z))); z += 1; }
    parts.push(part('Texto', v.cText, slab(art, v.relief, z)));
    if (v.mount === 'stand') {
      const sb = slotBase({ length: Math.min(W * 0.6, W - 10), slotLength: W, plate: v.base, tol: 0.3, depth: 24, height: 12, slotDepth: 7, color: v.cBase });
      parts.push({ ...sb, solid: placeBelow(sb.solid, base, 12) });
    }
    return mergeByColor(parts);
  },
};
