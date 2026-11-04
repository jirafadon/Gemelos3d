/**
 * Mini micrófono de juguete (o de utilería para fotos): mango, cabeza con rejilla calada
 * y un cubo con tu logo o nombre en las cuatro caras, que se encastra en el cuello.
 */
import { wasm, circle, roundedRect, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'mini-microfono',
  title: 'Mini micrófono',
  description: 'Micrófono de juguete con rejilla y un cubo con tu nombre o marca en las cuatro caras.',
  fileName: v => `microfono_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Micrófono' },
    { key: 'length', type: 'number', label: 'Largo total', default: 150, min: 60, max: 260, step: 1, unit: 'mm' },
    { key: 'head', type: 'number', label: 'Diámetro de la cabeza', default: 46, min: 20, max: 80, step: 1, unit: 'mm' },
    { key: 'grille', type: 'toggle', label: 'Rejilla calada', default: true },
    { key: 'text', type: 'text', label: 'Texto del cubo', default: 'RADIO' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'archivo' },
    { key: 'tol', type: 'number', label: 'Holgura del cubo', default: 0.3, min: 0, max: 1, step: 0.05, unit: 'mm' },
    { key: 'cBody', type: 'color', label: 'Mango', default: '#1E1E1E' },
    { key: 'cHead', type: 'color', label: 'Cabeza', default: '#BBBBBB' },
    { key: 'cCube', type: 'color', label: 'Cubo', default: '#E63946' },
    { key: 'cText', type: 'color', label: 'Texto', default: '#F5F5F5' },
  ],
  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const R = v.head / 2, L = v.length;
    const hl = L - R * 1.6;
    // Mango: de 0,32R abajo a 0,5R arriba, con la cabeza encima
    const handle = Manifold.cylinder(hl, R * 0.32, R * 0.5, 96);
    const collar = Manifold.cylinder(R * 0.25, R * 0.62, R * 0.62, 96).translate([0, 0, hl - R * 0.15]);
    let head = Manifold.sphere(R, 96).translate([0, 0, hl + R * 0.75]);
    if (v.grille) {
      // Cabeza hueca con ranuras horizontales en la mitad de arriba
      const c = [0, 0, hl + R * 0.75];
      const zone = Manifold.sphere(R + 1, 64).subtract(Manifold.sphere(R - 2.4, 64)).translate(c).intersect(Manifold.cube([R * 3, R * 3, R * 1.2], false).translate([-R * 1.5, -R * 1.5, c[2]]));
      const slots = [];
      for (let z = c[2] + 1.5; z < c[2] + R * 0.85; z += 3.2) slots.push(Manifold.cube([R * 2.4, R * 2.4, 1.4], true).translate([0, 0, z]));
      head = head.subtract(Manifold.sphere(R - 1.6, 64).translate(c)).subtract(Manifold.union(slots).intersect(zone));
    }
    // Cubo con el texto: hueco cuadrado-redondeado que entra por el mango
    const cs = R * 1.15, z0 = hl * 0.62;
    const rAt = z => R * 0.32 + (R * 0.5 - R * 0.32) * (z / hl);
    let cube = Manifold.cube([cs, cs, cs], true).subtract(Manifold.cylinder(cs + 2, rAt(z0 - cs / 2) + v.tol, rAt(z0 + cs / 2) + v.tol, 64).translate([0, 0, -cs / 2 - 1]));
    const font = await ctx.font(v.font);
    const txt = fitInto(stackLines([{ font, text: v.text || ' ', height: 10 }]), cs * 0.8, cs * 0.35);
    const words = [];
    for (let i = 0; i < 4; i++) words.push(txt.extrude(0.8).rotate([90, 0, 0]).translate([0, -cs / 2 + 0.79, 0]).rotate([0, 0, i * 90]));
    const textS = Manifold.union(words);
    cube = cube.subtract(textS);
    const cubeT = textS.intersect(Manifold.cube([cs, cs, cs], true));
    const at = [R * 2.5, 0, cs / 2];
    return mergeByColor([
      part('Mango', v.cBody, handle.add(collar).subtract(head)),
      part('Cabeza', v.cHead, head),
      part('Cubo', v.cCube, cube.translate(at)),
      part('Texto', v.cText, cubeT.translate(at)),
    ]);
  },
};
