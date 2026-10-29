/**
 * Soporte de torta (plato con pie): plato con borde, columna y pie, en tres piezas
 * que encastran a presión, así cada una entra en la cama y se imprime sin soportes.
 */
import { wasm, circle, slab, part, polygonShape } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';

export default {
  id: 'soporte-torta',
  title: 'Soporte de torta',
  description: 'Plato con borde, columna y pie que encastran; también como bandeja de dos pisos.',
  fileName: v => `soporte_torta_${v.diam}mm`,
  params: [
    { type: 'group', label: 'Plato' },
    { key: 'diam', type: 'number', label: 'Diámetro del plato', default: 240, min: 120, max: 265, step: 1, unit: 'mm', hint: 'La U1 llega a 270 mm: más grande no entra en la cama.' },
    { key: 'plateT', type: 'number', label: 'Espesor del plato', default: 4, min: 2.4, max: 8, step: 0.2, unit: 'mm' },
    { key: 'rim', type: 'number', label: 'Alto del borde', default: 4, min: 0, max: 20, step: 0.5, unit: 'mm' },
    { key: 'waves', type: 'number', label: 'Ondas en el borde', default: 24, min: 0, max: 60, step: 1, unit: '', hint: '0 = borde liso.' },

    { type: 'group', label: 'Columna y pie' },
    { key: 'colH', type: 'number', label: 'Alto de la columna', default: 90, min: 20, max: 250, step: 1, unit: 'mm' },
    { key: 'colD', type: 'number', label: 'Diámetro de la columna', default: 40, min: 20, max: 100, step: 1, unit: 'mm' },
    { key: 'footD', type: 'number', label: 'Diámetro del pie', default: 130, min: 60, max: 260, step: 1, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura de los encastres', default: 0.3, min: 0, max: 1, step: 0.05, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Color', default: '#F5F5F5' },
    { key: 'color2', type: 'color', label: 'Color de la columna', default: '#F72585' },
  ],
  build(v) {
    const { Manifold } = wasm();
    const R = v.diam / 2, rc = v.colD / 2, pin = rc * 0.55;
    const socket = Math.max(1.2, v.plateT - 1.2), pinH = socket - 0.2; // el plato se apoya sobre la columna y el perno lo centra
    // Plato: disco + borde (con ondas) + encastre abajo
    let rimShape = circle(R, 256).subtract(circle(R - 3, 256));
    if (v.waves > 0) {
      const pts = [];
      for (let i = 0; i < 720; i++) { const a = i / 720 * Math.PI * 2, r = R - 1.5 + 1.5 * Math.cos(v.waves * a); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      const w = polygonShape(pts);
      rimShape = w.subtract(w.offset(-3, 'Round', 2, 16));
    }
    let plate = slab(circle(R - (v.waves > 0 ? 1 : 0), 256), v.plateT);
    if (v.rim > 0) plate = plate.add(slab(rimShape, v.rim, v.plateT - 0.01));
    // Hueco abajo para el perno de la columna (el plato se imprime boca arriba, sin soportes)
    plate = plate.subtract(slab(circle(pin + v.tol, 64), socket + 0.01, -0.01));
    // Columna hueca con pernos arriba y abajo
    const col = Manifold.cylinder(v.colH, rc, rc, 96).subtract(Manifold.cylinder(v.colH + 2, rc - 3, rc - 3, 96).translate([0, 0, -1]))
      .add(Manifold.cylinder(pinH, pin, pin, 64).translate([0, 0, v.colH - 0.01]))
      .add(slab(circle(rc - 2.9, 96), 3, v.colH - 3));
    // Pie: cono bajo con encastre para la columna
    const foot = Manifold.cylinder(12, v.footD / 2, rc + 8, 128).subtract(slab(circle(rc + v.tol, 96), 8.01, 12 - 8));
    const gap = 15;
    return mergeByColor([
      part('Plato', v.color, plate),
      part('Columna', v.color2, col.translate([R + rc + gap, 0, 0])),
      part('Pie', v.color, foot.translate([R + 2 * rc + v.footD / 2 + 2 * gap, 0, 0])),
    ]);
  },
};
