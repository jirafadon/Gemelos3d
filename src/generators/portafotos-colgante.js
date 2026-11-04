/**
 * Portafotos colgante de dos colores: marco con canal para deslizar la foto desde arriba,
 * nombre o texto arriba del marco y detalles navideños (moño, arbolito, copos) en las esquinas.
 * Se imprime acostado, con la espalda sobre la cama.
 */
import { wasm, circle, roundedRect, outline, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines, slotBase, placeBelow } from '../engine/layers.js';
import { fitInto, snowflake, star, heart } from '../engine/shapes.js';
import { bow, treeShape } from '../engine/xmas.js';
import { firstLine } from './_common.js';

const SIZES = { '10x15': [100, 150], '9x13': [89, 127], '6x9': [60, 90], '5x7': [50, 70], 'polaroid': [54, 86] };

export default {
  id: 'portafotos-colgante',
  title: 'Portafotos colgante',
  description: 'Marco de dos colores con el nombre arriba, la foto se desliza por arriba, y detalles navideños o corazones.',
  fileName: v => `portafotos_${firstLine(v.text, 'colgante')}`,
  params: [
    { type: 'group', label: 'Foto' },
    { key: 'size', type: 'select', label: 'Tamaño de la foto', default: '10x15', options: Object.keys(SIZES).map(k => ({ value: k, label: k === 'polaroid' ? 'Instantánea (5,4 × 8,6 cm)' : `${k.replace('x', ' × ')} cm` })) },
    { key: 'landscape', type: 'toggle', label: 'Apaisada', default: true },
    { key: 'lip', type: 'number', label: 'Cuánto tapa el marco de la foto', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura de la foto', default: 0.6, min: 0.2, max: 2, step: 0.1, unit: 'mm' },

    { type: 'group', label: 'Marco y texto' },
    { key: 'border', type: 'number', label: 'Ancho del marco', default: 12, min: 6, max: 30, step: 0.5, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo', default: 10, min: 0, max: 30, step: 0.5, unit: 'mm' },
    { key: 'text', type: 'text', label: 'Nombre o texto arriba', default: 'Elisa' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico' },
    { key: 'textW', type: 'number', label: 'Ancho del texto', default: 60, min: 20, max: 100, step: 1, unit: '%' },
    { key: 'deco', type: 'segment', label: 'Detalles', default: 'xmas', options: [{ value: 'none', label: 'Sin' }, { value: 'xmas', label: 'Navidad' }, { value: 'snow', label: 'Copos' }, { value: 'hearts', label: 'Corazones' }] },
    { key: 'hang', type: 'segment', label: 'Para', default: 'hang', options: [{ value: 'hang', label: 'Colgar (2 agujeros)' }, { value: 'stand', label: 'Parar (base con ranura)' }] },

    { type: 'group', label: 'Colores' },
    { key: 'cFrame', type: 'color', label: 'Marco', default: '#C1121F' },
    { key: 'cDeco', type: 'color', label: 'Texto y detalles', default: '#F5F5F5' },
    { key: 'cTree', type: 'color', label: 'Arbolito', default: '#2D6A4F', show: v => v.deco === 'xmas' },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const [pw0, ph0] = SIZES[v.size] || SIZES['10x15'];
    const [pw, ph] = v.landscape ? [ph0, pw0] : [pw0, ph0];
    const W = pw + 2 * v.border, H = ph + 2 * v.border;
    const back = 1.6, pocket = 0.9, front = 1.6, T = back + pocket + front;
    const frame2d = roundedRect(W, H, Math.min(v.radius, v.border + 6));
    // Ventana al frente y canal para la foto, abierto por arriba
    const win = roundedRect(pw - 2 * v.lip, ph - 2 * v.lip, Math.max(0, Math.min(v.radius, v.border + 6) - v.border));
    const slot = CrossSection.square([pw + 2 * v.tol, ph + v.border + 10], false).translate([-(pw + 2 * v.tol) / 2, -ph / 2 - v.tol]);
    let body = slab(frame2d, T).subtract(slab(win, front + 0.02, back + pocket)).subtract(slab(slot, pocket, back));

    const parts = [], decoParts = [];
    let treePart = null;
    // Texto arriba: cruza el borde superior y queda unido por su contorno
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), W * v.textW / 100, Math.max(16, v.border * 2.2)).translate([0, H / 2 + v.border * 0.15]);
      body = body.add(slab(outline(txt, 2.2), T).subtract(slab(slot, pocket, back)));
      decoParts.push(slab(txt, 1.2, T));
    }
    // Detalles en las esquinas
    const corner = (cs, x, y) => cs.translate([x, y]);
    const extras = [];
    if (v.deco === 'xmas') {
      const tr = treeShape(Math.min(ph * 0.55, 70));
      const t2 = corner(tr.shape, W / 2 - v.border * 0.4, -H / 2 + Math.min(ph * 0.55, 70) * 0.42);
      body = body.add(slab(outline(t2, 1.6), T - 0.4));
      treePart = slab(t2.subtract(corner(tr.deco, W / 2 - v.border * 0.4, -H / 2 + Math.min(ph * 0.55, 70) * 0.42)), 0.8, T - 0.4);
      extras.push(corner(tr.deco, W / 2 - v.border * 0.4, -H / 2 + Math.min(ph * 0.55, 70) * 0.42));
      const bw = Math.min(46, W * 0.3);
      extras.push(corner(bow(bw), -W / 2 + v.border * 0.6, H / 2 - v.border * 0.2));
      for (const [x, y, s] of [[-W / 2 - 2, -H / 2 + 22, 20], [-W / 2 + 14, -H / 2 + 6, 13]]) extras.push(corner(snowflake(s), x, y));
    } else if (v.deco === 'snow') {
      for (const [x, y, s] of [[-W / 2 + 4, H / 2 - 4, 24], [W / 2 - 4, -H / 2 + 6, 22], [W / 2 - 18, -H / 2 - 2, 12], [-W / 2 - 3, H / 2 - 24, 12]]) extras.push(corner(snowflake(s), x, y));
    } else if (v.deco === 'hearts') {
      for (const [x, y, s] of [[-W / 2 + 6, H / 2 - 6, 22], [W / 2 - 6, -H / 2 + 6, 22], [W / 2 - 22, -H / 2 + 2, 12]]) extras.push(corner(heart(s), x, y).rotate(0));
    }
    if (extras.length) {
      const ex = CrossSection.union(extras);
      body = body.add(slab(outline(ex, 1.6), T - 0.4).subtract(slab(slot, pocket, back)));
      decoParts.push(slab(ex, 0.8, T - 0.4));
    }
    // Colgar o parar
    if (v.hang === 'hang') {
      for (const s of [-1, 1]) {
        const at = [s * (W / 2 - v.border / 2), H / 2 - v.border / 2];
        body = body.subtract(Manifold.cylinder(T * 3, 1.8, 1.8, 24).translate([...at, -T]));
      }
    }
    // Los detalles no se pisan con el marco
    const decoAll = decoParts.length ? Manifold.union(decoParts).subtract(body) : null;
    parts.unshift(part('Marco', v.cFrame, body));
    if (treePart) parts.push(part('Arbolito', v.cTree, treePart.subtract(body)));
    if (decoAll && !decoAll.isEmpty()) parts.push(part('Texto y detalles', v.cDeco, decoAll));
    if (v.hang === 'stand') {
      const base = slotBase({ length: Math.min(W * 0.7, W - 20), slotLength: W + 4, plate: T, tol: 0.3, depth: 22, height: 10, slotDepth: 6, color: v.cFrame });
      parts.push({ ...base, solid: placeBelow(base.solid, body, 14) });
    }
    return mergeByColor(parts);
  },
};
