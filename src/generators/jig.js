/**
 * Plantilla de perforación: una guía para agujerear siempre igual (estantes, manijas, bisagras).
 * Agujeros en línea, en grilla o en círculo, con tope para apoyar contra el canto y las medidas grabadas.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';

export default {
  id: 'jig',
  title: 'Plantilla de perforación',
  description: 'Guía para agujerear con distancias exactas: en línea, en grilla o en círculo, con tope y medidas grabadas.',
  fileName: v => `plantilla_${v.layout}_${v.holeD}mm`,
  params: [
    { type: 'group', label: 'Agujeros' },
    { key: 'layout', type: 'segment', label: 'Patrón', default: 'line', options: [{ value: 'line', label: 'En línea' }, { value: 'grid', label: 'Grilla' }, { value: 'circle', label: 'En círculo' }] },
    { key: 'holeD', type: 'number', label: 'Diámetro de la mecha', default: 5, min: 1.5, max: 20, step: 0.5, unit: 'mm' },
    { key: 'fit', type: 'number', label: 'Holgura para la mecha', default: 0.2, min: 0, max: 1, step: 0.05, unit: 'mm' },
    { key: 'count', type: 'number', label: 'Cantidad', default: 4, min: 2, max: 30, step: 1, unit: '', show: v => v.layout !== 'grid' },
    { key: 'pitch', type: 'number', label: 'Distancia entre agujeros', default: 32, min: 5, max: 200, step: 0.5, unit: 'mm', show: v => v.layout !== 'circle', hint: '32 mm es el estándar de muebles.' },
    { key: 'rows', type: 'number', label: 'Filas', default: 2, min: 2, max: 10, step: 1, unit: '', show: v => v.layout === 'grid' },
    { key: 'cols', type: 'number', label: 'Columnas', default: 3, min: 2, max: 10, step: 1, unit: '', show: v => v.layout === 'grid' },
    { key: 'pitch2', type: 'number', label: 'Distancia entre filas', default: 32, min: 5, max: 200, step: 0.5, unit: 'mm', show: v => v.layout === 'grid' },
    { key: 'circD', type: 'number', label: 'Diámetro del círculo', default: 60, min: 10, max: 250, step: 0.5, unit: 'mm', show: v => v.layout === 'circle' },
    { key: 'edgeDist', type: 'number', label: 'Distancia al canto', default: 37, min: 3, max: 150, step: 0.5, unit: 'mm', hint: 'Desde el tope hasta el centro de los agujeros.' },

    { type: 'group', label: 'Plantilla' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 8, min: 3, max: 25, step: 0.5, unit: 'mm', hint: 'Más gruesa guía mejor la mecha derecha.' },
    { key: 'fence', type: 'toggle', label: 'Tope para el canto', default: true },
    { key: 'fenceH', type: 'number', label: 'Alto del tope', default: 12, min: 4, max: 40, step: 1, unit: 'mm', show: v => v.fence },
    { key: 'labels', type: 'toggle', label: 'Medidas grabadas', default: true },
    { key: 'color', type: 'color', label: 'Color', default: '#F77F00' },
  ],
  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    let pts = [];
    if (v.layout === 'line') pts = Array.from({ length: v.count }, (_, i) => [(i - (v.count - 1) / 2) * v.pitch, 0]);
    else if (v.layout === 'grid') for (let j = 0; j < v.rows; j++) for (let i = 0; i < v.cols; i++) pts.push([(i - (v.cols - 1) / 2) * v.pitch, j * v.pitch2]);
    else pts = Array.from({ length: v.count }, (_, i) => { const a = i / v.count * 2 * Math.PI; return [Math.cos(a) * v.circD / 2, Math.sin(a) * v.circD / 2 + v.circD / 2]; });
    // Los agujeros arrancan a "edgeDist" del tope (y = 0 es el canto)
    pts = pts.map(([x, y]) => [x, y + v.edgeDist]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const m = Math.max(10, v.holeD * 1.5);
    const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y1 = Math.max(...ys) + m;
    const plate = CrossSection.square([x1 - x0, y1], false).translate([x0, 0]);
    let body = slab(roundedRect(x1 - x0, y1, 4).translate([(x0 + x1) / 2, y1 / 2]).add(CrossSection.square([x1 - x0, 6], false).translate([x0, 0])), v.thick);
    void plate;
    const r = v.holeD / 2 + v.fit;
    body = body.subtract(Manifold.union(pts.map(([x, y]) => Manifold.cylinder(v.thick + 2, r, r, 40).translate([x, y, -1]))));
    // Avellanado arriba para que entre la mecha fácil
    body = body.subtract(Manifold.union(pts.map(([x, y]) => Manifold.cylinder(1.2, r, r + 1.2, 40).translate([x, y, v.thick - 1.19]))));
    if (v.fence) body = body.add(Manifold.cube([x1 - x0, 5, v.fenceH + v.thick], false).translate([x0, -5, -v.fenceH]));
    if (v.labels) {
      const font = await ctx.font('poppins');
      const lab = [`Ø${String(v.holeD).replace('.', ',')}`, v.layout !== 'circle' ? `${String(v.pitch).replace('.', ',')} mm` : `Ø${v.circD}`, `canto ${String(v.edgeDist).replace('.', ',')}`].join('  ·  ');
      const txt = fitInto(stackLines([{ font, text: lab, height: 10 }]), (x1 - x0) * 0.85, 5).translate([(x0 + x1) / 2, Math.max(...ys) + m * 0.55]);
      if (txt.bounds().max[1] < y1 - 1) body = body.subtract(slab(txt, 0.8, v.thick - 0.8));
    }
    // Se imprime con el tope hacia arriba: lo doy vuelta para que la cara plana quede en la cama
    const flipped = body.rotate([180, 0, 0]);
    const b = flipped.boundingBox();
    return mergeByColor([part('Plantilla', v.color, flipped.translate([0, 0, -b.min[2]]))]);
  },
};
