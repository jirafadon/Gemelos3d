/**
 * Conectores de estructura para varillas o caños (redondos o cuadrados):
 * recto, codo (L), T, cruz, esquina 3D y esquina 3D en T. Con agujero opcional
 * para un tornillo que traba cada caño. Se imprimen apoyados sobre una cara plana.
 */
import { wasm, part } from '../engine/geom.js';

// Direcciones de cada brazo: +X, -X, +Y, -Y, +Z
const KINDS = {
  straight: { label: 'Recto', arms: [[1, 0, 0], [-1, 0, 0]] },
  elbow: { label: 'Codo (L)', arms: [[1, 0, 0], [0, 1, 0]] },
  tee: { label: 'T', arms: [[1, 0, 0], [-1, 0, 0], [0, 1, 0]] },
  cross: { label: 'Cruz', arms: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]] },
  corner: { label: 'Esquina 3D', arms: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
  corner4: { label: 'Esquina 3D en T', arms: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1]] },
  five: { label: '5 vías', arms: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1]] },
};

export default {
  id: 'conectores',
  title: 'Conectores de estructura',
  description: 'Uniones rectas, en L, T, cruz o esquina 3D para varillas o caños.',
  fileName: v => `conector_${v.kind}_${v.rod}mm`,
  params: [
    { type: 'group', label: 'Conector' },
    { key: 'kind', type: 'select', label: 'Tipo', default: 'corner', options: Object.entries(KINDS).map(([value, k]) => ({ value, label: k.label })) },
    { key: 'profile', type: 'segment', label: 'Caño', default: 'round', options: [{ value: 'round', label: 'Redondo' }, { value: 'square', label: 'Cuadrado' }] },
    { key: 'rod', type: 'number', label: 'Medida del caño (exterior)', default: 12, min: 3, max: 50, step: 0.1, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura', default: 0.3, min: 0, max: 1.2, step: 0.05, unit: 'mm' },
    { key: 'depth', type: 'number', label: 'Cuánto entra el caño', default: 20, min: 6, max: 60, step: 1, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 2.4, min: 1.2, max: 8, step: 0.2, unit: 'mm' },
    { key: 'screw', type: 'toggle', label: 'Agujero para tornillo traba', default: true },
    { key: 'screwD', type: 'number', label: 'Diámetro del tornillo', default: 3, min: 2, max: 6, step: 0.5, unit: 'mm', show: v => v.screw },
    { key: 'count', type: 'number', label: 'Cantidad', default: 4, min: 1, max: 16, step: 1, unit: '' },
    { key: 'color', type: 'color', label: 'Color', default: '#334155' },
  ],
  build(v) {
    const { Manifold } = wasm();
    const k = KINDS[v.kind];
    const hole = v.rod + 2 * v.tol, outer = hole + 2 * v.wall, half = outer / 2;
    const round = v.profile === 'round';
    // Pieza de un brazo a lo largo de +Z (desde el centro hasta la punta)
    const L = half + v.depth;
    const armSolid = round ? Manifold.cylinder(L, half, half, 64) : Manifold.cube([outer, outer, L], false).translate([-half, -half, 0]);
    const armHole = round ? Manifold.cylinder(v.depth + 0.01, hole / 2, hole / 2, 64).translate([0, 0, L - v.depth]) : Manifold.cube([hole, hole, v.depth + 0.01], false).translate([-hole / 2, -hole / 2, L - v.depth]);
    const orient = (m, [x, y, z]) => (z === 1 ? m : z === -1 ? m.rotate([180, 0, 0]) : x === 1 ? m.rotate([0, 90, 0]) : x === -1 ? m.rotate([0, -90, 0]) : y === 1 ? m.rotate([-90, 0, 0]) : m.rotate([90, 0, 0]));
    // Centro: un cubo (o esfera) que une los brazos
    let body = round ? Manifold.sphere(half, 48).add(Manifold.cube([outer, outer, outer], true).intersect(Manifold.sphere(half * 1.25, 48))) : Manifold.cube([outer, outer, outer], true);
    for (const a of k.arms) body = body.add(orient(armSolid, a));
    for (const a of k.arms) body = body.subtract(orient(armHole, a));
    if (v.screw) {
      // Un agujero por brazo, cruzando la pared desde arriba o de costado
      for (const a of k.arms) {
        const along = half + v.depth / 2;
        const dir = a[2] === 0 ? [0, 0, 1] : [1, 0, 0];
        let s = Manifold.cylinder(outer + 2, v.screwD / 2, v.screwD / 2, 24, true);
        s = dir[2] ? s : s.rotate([0, 90, 0]);
        body = body.subtract(s.translate([a[0] * along, a[1] * along, a[2] * along]));
      }
    }
    // Se apoya en la cama: la cara de abajo del cubo central en Z = 0
    const b0 = body.boundingBox();
    body = body.translate([0, 0, -b0.min[2]]);
    const bb = body.boundingBox(), pitch = bb.max[0] - bb.min[0] + 8, pitchY = bb.max[1] - bb.min[1] + 8;
    const cols = Math.ceil(Math.sqrt(v.count));
    const copies = [];
    for (let i = 0; i < v.count; i++) copies.push(body.translate([(i % cols) * pitch, Math.floor(i / cols) * pitchY, 0]));
    const all = Manifold.union(copies);
    const ab = all.boundingBox();
    return [part(`Conectores (${v.count})`, v.color, all.translate([-(ab.min[0] + ab.max[0]) / 2, -(ab.min[1] + ab.max[1]) / 2, 0]))];
  },
};
