/**
 * Adornos navideños con nombre: bola calada (aro con el nombre cruzado),
 * copo de nieve o estrella, con colgante arriba.
 */
import { circle, outline, part, slab } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { ring, snowflake, star, fitInto } from '../engine/shapes.js';
import { firstLine, textPlaceParams, placeText } from './_common.js';

export default {
  id: 'adorno-navidad',
  title: 'Adornos navideños',
  description: 'Bola calada, copo o estrella con nombre, listos para colgar del árbol.',
  fileName: v => `adorno_${firstLine(v.name)}`,
  params: [
    { type: 'group', label: 'Adorno' },
    { key: 'kind', type: 'segment', label: 'Modelo', default: 'ball', options: [{ value: 'ball', label: 'Bola calada' }, { value: 'flake', label: 'Copo' }, { value: 'star', label: 'Estrella' }] },
    { key: 'size', type: 'number', label: 'Diámetro', default: 80, min: 40, max: 160, step: 1, unit: 'mm' },
    { key: 'rim', type: 'number', label: 'Ancho del aro', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm', show: v => v.kind === 'ball' },
    { key: 'flakes', type: 'toggle', label: 'Copitos alrededor del aro', default: true, show: v => v.kind === 'ball' },

    { type: 'group', label: 'Nombre' },
    { key: 'name', type: 'text', label: 'Nombre', default: 'Aline' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico' },
    { key: 'border', type: 'number', label: 'Contorno del nombre', default: 2, min: 0.8, max: 6, step: 0.1, unit: 'mm', show: v => v.kind !== 'ball' },

    ...textPlaceParams(),
    { type: 'group', label: 'Colores' },
    { key: 'colors', type: 'segment', label: 'Cantidad de colores', default: 2, options: [{ value: 1, label: '1' }, { value: 2, label: '2' }] },
    { key: 'cBase', type: 'color', label: 'Adorno', default: '#F5F5F5' },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#D62828', show: v => v.colors === 2 },

    { type: 'group', label: 'Espesor' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'holeD', type: 'number', label: 'Agujero para colgar', default: 4, min: 2, max: 8, step: 0.5, unit: 'mm' },
  ],

  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const R = v.size / 2;
    const cText = Number(v.colors) === 2 ? v.cText : v.cBase;
    const t = v.thick;
    let body, nameShape, nameZ = 0;

    if (v.kind === 'ball') {
      body = ring(R, v.rim);
      if (v.flakes) for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 360 + 22.5;
        if (Math.abs(((a + 360) % 360) - 90) < 30) continue; // deja libre arriba para el colgante
        body = body.add(snowflake(v.rim * 3.4).translate([R - v.rim / 2, 0]).rotate(a));
      }
      // El nombre cruza el aro de lado a lado para quedar unido
      nameShape = placeText(fitInto(stackLines([{ font, text: v.name || ' ', height: 10 }]), (R - v.rim * 0.4) * 2, R * 0.9), v, body);
      body = body.subtract(nameShape);
    } else {
      body = v.kind === 'flake' ? snowflake(v.size) : star(v.size, 5, 0.5, 1.2);
      const area = v.kind === 'flake' ? [R * 1.3, R * 0.45] : [R * 0.9, R * 0.36];
      nameShape = placeText(fitInto(stackLines([{ font, text: v.name || ' ', height: 10 }]), area[0], area[1]), v, body);
      body = body.add(outline(nameShape, v.border));
      nameZ = t;
    }

    // Colgante: anillito arriba
    const hr = v.holeD / 2, hangR = hr + 2.2;
    const bb = body.bounds();
    const hang = circle(hangR).translate([0, bb.max[1] + hr]).subtract(circle(hr).translate([0, bb.max[1] + hr]));
    body = body.add(hang);

    const parts = [part('Adorno', v.cBase, slab(body, t))];
    parts.push(part('Nombre', cText, nameZ ? slab(nameShape, 1, nameZ) : slab(nameShape, t)));
    return mergeByColor(parts);
  },
};
