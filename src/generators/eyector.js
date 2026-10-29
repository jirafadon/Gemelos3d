/**
 * Eyector de masa: cortador con émbolo para galletitas, caramelos y bombones.
 * Tres piezas: el cortador (con un puente arriba que guía el vástago), el émbolo
 * (placa con la forma + vástago) y la perilla que se encastra a presión arriba.
 * Todo se imprime sin soportes: el cortador con el faldón abajo y el émbolo con la placa abajo.
 */
import { wasm, outline, fillHoles, circle, slab, part } from '../engine/geom.js';
import { stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { imageParams, silhouette, firstLine } from './_common.js';

export default {
  id: 'eyector',
  title: 'Eyector de masa',
  description: 'Cortador con émbolo: corta y empuja la masa, con marca opcional en el émbolo.',
  fileName: v => `eyector_${v.source === 'shape' ? v.shape : v.source === 'text' ? firstLine(v.text) : 'imagen'}`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'source', type: 'segment', label: 'A partir de', default: 'shape', options: [{ value: 'shape', label: 'Forma' }, { value: 'image', label: 'Imagen' }, { value: 'text', label: 'Nombre' }] },
    ...imageParams({ showIf: v => v.source === 'image' }),
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: ['heart', 'star', 'circle', 'oval', 'wavy', 'paw', 'bone', 'fish'].map(k => ({ value: k, label: SHAPES[k].label })), show: v => v.source === 'shape' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Ana', show: v => v.source === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo', show: v => v.source === 'text' },
    { key: 'size', type: 'number', label: 'Tamaño (lado más largo)', default: 50, min: 25, max: 120, step: 1, unit: 'mm' },

    { type: 'group', label: 'Marca en el émbolo' },
    { key: 'mark', type: 'text', label: 'Texto que queda marcado en la masa', default: 'Ana', hint: 'Vacío = émbolo liso.' },
    { key: 'markFont', type: 'font', label: 'Tipografía de la marca', default: 'pacifico', show: v => !!(v.mark || '').trim() },

    { type: 'group', label: 'Medidas' },
    { key: 'height', type: 'number', label: 'Alto del cortador', default: 18, min: 10, max: 40, step: 0.5, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 1.2, min: 0.8, max: 3, step: 0.1, unit: 'mm' },
    { key: 'blade', type: 'number', label: 'Filo', default: 0.5, min: 0.4, max: 1.5, step: 0.05, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura del émbolo', default: 0.5, min: 0.2, max: 1.2, step: 0.05, unit: 'mm', hint: 'Espacio entre el émbolo y la pared; más holgura = corre más suelto.' },
    { key: 'stemD', type: 'number', label: 'Diámetro del vástago', default: 6, min: 4, max: 10, step: 0.5, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Cortador', default: '#F77F00' },
    { key: 'color2', type: 'color', label: 'Émbolo y perilla', default: '#F5F5F5' },
  ],
  async build(v, ctx) {
    const { CrossSection, Manifold } = wasm();
    let shape;
    if (v.source === 'text') {
      const font = await ctx.font(v.font);
      shape = fillHoles(outline(stackLines([{ font, text: v.text || ' ', height: 20 }]), 2));
    } else if (v.source === 'shape') shape = SHAPES[v.shape].make(100, 90);
    else shape = fillHoles(await silhouette(v, ctx, 100, { fill: true }));
    shape = fillHoles(fitInto(shape, v.size, v.size));
    const b = shape.bounds();

    // Cortador: faldón + puente con agujero (abajo, sobre la cama), pared y filo arriba
    const flangeH = 2, bladeH = 3, lower = v.height - bladeH;
    const wallRing = outline(shape, v.wall).subtract(shape);
    const bladeRing = outline(shape, v.blade).subtract(shape);
    const flange = outline(shape, v.wall + 4).subtract(outline(shape, v.wall * 0.5));
    const bridgeW = Math.max(v.stemD + 6, 10);
    const span = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]) + 20;
    const bridge = CrossSection.square([span, bridgeW], true).intersect(outline(shape, v.wall * 0.5))
      .add(circle(v.stemD / 2 + 3, 48))
      .subtract(circle(v.stemD / 2 + 0.35, 48));
    const cutter = slab(wallRing, lower).add(slab(bladeRing, bladeH, lower)).add(slab(flange, flangeH)).add(slab(bridge, flangeH + 1));

    // Émbolo: placa con la forma (achicada por la holgura) + vástago
    const plateT = 3;
    let plate2d = shape.offset(-v.tol, 'Round', 2, 32);
    if (plate2d.isEmpty()) throw new Error('La forma es muy chica para el émbolo');
    const stemL = v.height - plateT + 10; // sobresale arriba del puente para la perilla
    let plunger = slab(plate2d, plateT).add(Manifold.cylinder(stemL, v.stemD / 2, v.stemD / 2, 32).translate([0, 0, plateT - 0.01]));
    if ((v.mark || '').trim()) {
      // Marca grabada en la cara que toca la masa (va contra la cama, espejada para leerse bien)
      const mf = await ctx.font(v.markFont);
      const pb = plate2d.bounds();
      const mk = fitInto(stackLines(String(v.mark).split('\n').map(t => ({ font: mf, text: t, height: 10 })), 1.5), (pb.max[0] - pb.min[0]) * 0.7, (pb.max[1] - pb.min[1]) * 0.45).mirror([1, 0]);
      plunger = plunger.subtract(slab(mk.intersect(plate2d.offset(-1, 'Round', 2, 24)), 0.8, -0.01));
    }
    // Perilla: entra a presión en el vástago
    const knob = Manifold.cylinder(10, v.stemD / 2 + 5, v.stemD / 2 + 4, 48).subtract(Manifold.cylinder(8, v.stemD / 2 + 0.05, v.stemD / 2 + 0.05, 32).translate([0, 0, -0.01]));

    const gap = 10, w = b.max[0] - b.min[0] + 2 * (v.wall + 4);
    return [
      part('Cortador', v.color, cutter),
      part('Émbolo', v.color2, plunger.translate([w + gap, 0, 0])),
      part('Perilla', v.color2, knob.translate([w + gap, -(b.max[1] - b.min[1]) / 2 - 20, 0])),
    ];
  },
};
