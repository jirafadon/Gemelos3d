/**
 * Lámpara de letra: letra hueca con frente fino (difusor) para poner una tira o guirnalda LED
 * adentro, el nombre en relieve al frente y una tapa trasera a presión con salida de cable.
 * La letra se imprime con el frente sobre la cama; conviene el frente en blanco o natural.
 */
import { textShape, slab, part, circle } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'lampara-letra',
  title: 'Lámpara de letra con nombre',
  description: 'Letra hueca para LED con frente traslúcido, nombre al frente y tapa con salida de cable.',
  fileName: v => `lampara_${(v.letter || 'A').slice(0, 1)}_${firstLine(v.name, 'letra')}`,
  params: [
    { type: 'group', label: 'Letra' },
    { key: 'letter', type: 'text', label: 'Letra', default: 'L' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'anton', hint: 'Las letras gruesas dejan más lugar para el LED.' },
    { key: 'height', type: 'number', label: 'Alto', default: 160, min: 80, max: 250, step: 1, unit: 'mm' },
    { key: 'depth', type: 'number', label: 'Profundidad', default: 40, min: 20, max: 80, step: 1, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Paredes', default: 1.6, min: 1, max: 4, step: 0.2, unit: 'mm' },
    { key: 'front', type: 'number', label: 'Frente (difusor)', default: 0.8, min: 0.4, max: 2, step: 0.2, unit: 'mm', hint: 'Más fino = más luz. 0,8 mm en PLA blanco queda parejo.' },

    { type: 'group', label: 'Nombre al frente' },
    { key: 'name', type: 'text', label: 'Nombre (opcional)', default: 'Lola' },
    { key: 'nameFont', type: 'font', label: 'Tipografía del nombre', default: 'pacifico', show: v => !!(v.name || '').trim() },

    { type: 'group', label: 'Tapa' },
    { key: 'cableD', type: 'number', label: 'Agujero para el cable', default: 6, min: 3, max: 14, step: 0.5, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura de la tapa', default: 0.3, min: 0, max: 0.8, step: 0.05, unit: 'mm' },

    { type: 'group', label: 'Colores' },
    { key: 'cFront', type: 'color', label: 'Frente y paredes', default: '#F5F5F5' },
    { key: 'cName', type: 'color', label: 'Nombre', default: '#E76F51', show: v => !!(v.name || '').trim() },
    { key: 'cBack', type: 'color', label: 'Tapa', default: '#1E1E1E' },
  ],
  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const L = textShape(font, Array.from(String(v.letter || 'A').trim() || 'A')[0], { height: v.height });
    const inner = L.offset(-v.wall, 'Round', 2, 24);
    if (inner.isEmpty()) throw new Error('La letra es muy fina para hacerla hueca: probá otra tipografía o más alto');
    // Cuerpo: frente (abajo, sobre la cama) + paredes; queda abierto atrás
    let body = slab(L, v.depth).subtract(slab(inner, v.depth, v.front));
    const parts = [];
    if ((v.name || '').trim()) {
      // El nombre va embutido en el frente (al ras), espejado porque el frente apoya en la cama
      const nf = await ctx.font(v.nameFont);
      const lb = L.bounds();
      const nm = fitInto(stackLines([{ font: nf, text: v.name, height: 10 }], 0), (lb.max[0] - lb.min[0]) * 0.8, v.height * 0.18).mirror([1, 0]);
      const ns = slab(nm.intersect(L.offset(-2, 'Round', 2, 16)), Math.min(0.6, v.front));
      body = body.subtract(ns);
      parts.push(part('Nombre', v.cName, ns));
    }
    parts.push(part('Letra', v.cFront, body));
    // Tapa trasera: entra en la letra con holgura; reborde para que no se hunda y agujero para el cable
    const lid2d = inner.offset(-v.tol, 'Round', 2, 24);
    let lid = slab(L, 1.6).add(slab(lid2d.subtract(lid2d.offset(-1.4, 'Round', 2, 24)), 4, 1.59));
    const lb = lid2d.bounds();
    // Agujero en el punto más bajo de la letra que tenga lugar
    let cable = null;
    for (let f = 0.12; f < 0.9 && !cable; f += 0.06) {
      for (let g = 0.2; g <= 0.8 && !cable; g += 0.1) {
        const p = [lb.min[0] + (lb.max[0] - lb.min[0]) * g, lb.min[1] + (lb.max[1] - lb.min[1]) * f];
        const probe = circle(v.cableD / 2 + 2, 24).translate(p);
        if (probe.subtract(lid2d.offset(-1.6, 'Round', 2, 16)).isEmpty()) cable = p;
      }
    }
    if (cable) lid = lid.subtract(slab(circle(v.cableD / 2, 32).translate(cable), 10, -1));
    const bb = L.bounds();
    parts.push(part('Tapa', v.cBack, lid.translate([bb.max[0] - bb.min[0] + 15, 0, 0])));
    return mergeByColor(parts);
  },
};
