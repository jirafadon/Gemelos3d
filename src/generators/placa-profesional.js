/**
 * Placa profesional de escritorio: el nombre en letras paradas (una pieza
 * con barra inferior que encastra) y una base con la profesión en el frente.
 */
import { textShape, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, slotBase, placeBelow } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'placa-profesional',
  title: 'Placa profesional',
  description: 'Nombre en letras paradas sobre base, con la profesión en el frente.',
  fileName: v => `placa_${firstLine(v.name)}`,
  params: [
    { type: 'group', label: 'Nombre' },
    { key: 'name', type: 'text', label: 'Nombre', default: 'LUANA RUTZ' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'oswald' },
    { key: 'size', type: 'number', label: 'Alto de las letras', default: 22, min: 10, max: 80, step: 0.5, unit: 'mm' },
    { key: 'spacing', type: 'number', label: 'Espaciado entre letras', default: 0.02, min: -0.1, max: 0.4, step: 0.01, unit: 'em' },
    { key: 'thick', type: 'number', label: 'Espesor de las letras', default: 5, min: 2.5, max: 12, step: 0.5, unit: 'mm' },

    { type: 'group', label: 'Base' },
    { key: 'job', type: 'text', label: 'Profesión (en el frente)', default: 'ABOGACÍA' },
    { key: 'jobFont', type: 'font', label: 'Tipografía de la profesión', default: 'poppins' },
    { key: 'baseH', type: 'number', label: 'Alto de la base', default: 14, min: 8, max: 40, step: 0.5, unit: 'mm' },
    { key: 'baseD', type: 'number', label: 'Profundidad de la base', default: 20, min: 12, max: 50, step: 0.5, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura de la ranura', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm', hint: 'Si queda flojo, bajala; si no entra, subila.' },

    { type: 'group', label: 'Colores' },
    { key: 'cName', type: 'color', label: 'Letras', default: '#B08968' },
    { key: 'cBase', type: 'color', label: 'Base', default: '#F5F5F5' },
    { key: 'cJob', type: 'color', label: 'Profesión', default: '#B08968' },
  ],

  async build(v, ctx) {
    const [font, jobFont] = await Promise.all([ctx.font(v.font), ctx.font(v.jobFont)]);
    const letters = textShape(font, v.name || ' ', { height: v.size, spacing: v.spacing });
    const b = letters.bounds();
    const barW = (b.max[0] - b.min[0]) + 2, slotDepth = Math.min(6, v.baseH - 3);
    // Barra que une las letras por abajo y entra en la ranura
    const bar = roundedRect(barW, slotDepth + 1.5, 0).translate([(b.min[0] + b.max[0]) / 2, b.min[1] - (slotDepth + 1.5) / 2 + 1.5]);
    const piece = part('Letras', v.cName, slab(letters.add(bar), v.thick));

    const length = barW + 14;
    const base = slotBase({ length, slotLength: barW + 0.6, plate: v.thick, tol: v.tol, depth: v.baseD, height: v.baseH, slotDepth, color: v.cBase });
    const parts = [piece];
    let baseSolid = base.solid;
    let jobSolid = null;
    if ((v.job || '').trim()) {
      const jt = fitInto(textShape(jobFont, v.job, { height: 10, spacing: 0.08 }), length - 10, Math.min(v.baseH * 0.5, 7));
      // Texto en relieve sobre la cara frontal (plano XZ), saliendo hacia -Y
      jobSolid = slab(jt, 0.8).rotate([90, 0, 0]).translate([0, -v.baseD / 2, v.baseH / 2]);
      baseSolid = baseSolid.subtract(jobSolid.translate([0, 0.4, 0]));
      jobSolid = jobSolid.translate([0, 0.4, 0]);
    }
    const placedBase = placeBelow(baseSolid, piece.solid, 10);
    const off = [placedBase.boundingBox().min[0] - baseSolid.boundingBox().min[0], placedBase.boundingBox().min[1] - baseSolid.boundingBox().min[1], 0];
    parts.push(part('Base', v.cBase, placedBase));
    if (jobSolid) parts.push(part('Profesión', v.cJob, jobSolid.translate(off)));
    return mergeByColor(parts);
  },
};
