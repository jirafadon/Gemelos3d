/**
 * Llavero de nombre — 1, 2 o 3 colores.
 * Capas (de abajo hacia arriba): contorno exterior, contorno medio (3 colores) y texto.
 */
import { textShape, outline, fillHoles, addRing, slab, part, mergeAll } from '../engine/geom.js';

export default {
  id: 'llavero-nombre',
  title: 'Llavero de nombre',
  description: 'Nombre en relieve con contorno en 1, 2 o 3 colores, argolla y opción de letras superpuestas.',
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Joni', multiline: true, hint: 'Enter para una segunda línea.' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico' },
    { key: 'height', type: 'number', label: 'Alto del texto', default: 16, min: 6, max: 60, step: 0.5, unit: 'mm' },
    { key: 'spacing', type: 'number', label: 'Espaciado entre letras', default: 0, min: -0.15, max: 0.3, step: 0.01, unit: 'em', hint: 'Negativo para superponer las letras.' },

    { type: 'group', label: 'Colores' },
    { key: 'colors', type: 'segment', label: 'Cantidad de colores', default: 2, options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }] },
    { key: 'cBase', type: 'color', label: 'Contorno', default: '#1D4ED8' },
    { key: 'cMid', type: 'color', label: 'Contorno medio', default: '#F5F5F5', show: v => v.colors === 3 },
    { key: 'cText', type: 'color', label: 'Texto', default: '#F5F5F5', show: v => v.colors >= 2 },

    { type: 'group', label: 'Forma' },
    { key: 'border', type: 'number', label: 'Ancho del contorno', default: 2.5, min: 0.8, max: 8, step: 0.1, unit: 'mm' },
    { key: 'border2', type: 'number', label: 'Ancho del contorno medio', default: 1.4, min: 0.6, max: 5, step: 0.1, unit: 'mm', show: v => v.colors === 3 },
    { key: 'fill', type: 'toggle', label: 'Rellenar huecos del contorno', default: true },
    { key: 'mode', type: 'segment', label: 'Texto', default: 'raised', options: [{ value: 'raised', label: 'En relieve' }, { value: 'flush', label: 'Al ras' }], show: v => v.colors >= 2, hint: 'Al ras: el texto queda embutido y la cara de arriba es plana.' },

    { type: 'group', label: 'Espesores' },
    { key: 'base', type: 'number', label: 'Base', default: 3, min: 1.2, max: 8, step: 0.2, unit: 'mm' },
    { key: 'mid', type: 'number', label: 'Capa media', default: 0.8, min: 0.4, max: 4, step: 0.2, unit: 'mm', show: v => v.colors === 3 },
    { key: 'relief', type: 'number', label: 'Relieve del texto', default: 1, min: 0.4, max: 5, step: 0.2, unit: 'mm' },

    { type: 'group', label: 'Argolla' },
    { key: 'ring', type: 'segment', label: 'Posición', default: 'left', options: [{ value: 'left', label: 'Izquierda' }, { value: 'top', label: 'Arriba' }, { value: 'right', label: 'Derecha' }, { value: 'none', label: 'Sin argolla' }] },
    { key: 'holeD', type: 'number', label: 'Diámetro del agujero', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm', show: v => v.ring !== 'none' },
    { key: 'ringWall', type: 'number', label: 'Ancho del aro', default: 2.5, min: 1.2, max: 6, step: 0.1, unit: 'mm', show: v => v.ring !== 'none' },
  ],

  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const text = textShape(font, v.text || ' ', { height: v.height, spacing: v.spacing });
    const colors = Number(v.colors);
    const total = v.border + (colors === 3 ? v.border2 : 0);
    let outer = outline(text, total);
    if (v.fill) outer = fillHoles(outer);
    const { shape: base2d } = addRing(outer, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    const name = (v.text || 'llavero').split('\n')[0];

    if (colors === 1) {
      return [mergeAll([
        part('Base', v.cBase, slab(base2d, v.base)),
        part('Texto', v.cBase, slab(text, v.relief, v.base)),
      ], name, v.cBase)];
    }

    const parts = [];
    let z = v.base;
    if (colors === 3) {
      let mid2d = outline(text, v.border);
      if (v.fill) mid2d = fillHoles(mid2d);
      if (v.mode === 'flush') {
        parts.push(part('Contorno', v.cBase, slab(base2d.subtract(mid2d), v.base + v.mid)));
        parts.push(part('Contorno medio', v.cMid, slab(mid2d, v.mid, v.base)));
        parts.push(part('Base interior', v.cBase, slab(mid2d, v.base)));
      } else {
        parts.push(part('Contorno', v.cBase, slab(base2d, v.base)));
        parts.push(part('Contorno medio', v.cMid, slab(mid2d, v.mid, v.base)));
        z = v.base + v.mid;
      }
    } else {
      parts.push(part('Contorno', v.cBase, slab(base2d, v.base)));
    }

    if (v.mode === 'flush') {
      // El texto ocupa las capas de arriba, embutido en la base.
      const top = colors === 3 ? v.base + v.mid : v.base;
      const depth = Math.min(v.relief, top - 0.6);
      const textSolid = slab(text, depth, top - depth);
      for (const p of parts) p.solid = p.solid.subtract(textSolid);
      parts.push(part('Texto', v.cText, textSolid));
    } else {
      parts.push(part('Texto', v.cText, slab(text, v.relief, z)));
    }

    // Une las piezas del mismo color para que el laminador no las duplique.
    const byColor = new Map();
    for (const p of parts) byColor.set(p.color, [...(byColor.get(p.color) || []), p]);
    return [...byColor.values()].map(group => group.length === 1 ? group[0] : mergeAll(group, group.map(g => g.name).join(' + '), group[0].color));
  },
};
