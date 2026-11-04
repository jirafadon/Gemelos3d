/**
 * Mueble salvado: arreglos rápidos con medidas simples. Tirador (manija) con dos tornillos,
 * cuña para nivelar, pasacables para escritorio y escuadra de refuerzo.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';

export default {
  id: 'mueble-salvado',
  title: 'Mueble salvado',
  description: 'Tirador, cuña para nivelar, pasacables de escritorio o escuadra de refuerzo, con medidas simples.',
  fileName: v => `mueble_${v.kind}`,
  params: [
    { type: 'group', label: 'Qué' },
    { key: 'kind', type: 'segment', label: 'Pieza', default: 'handle', options: [{ value: 'handle', label: 'Tirador' }, { value: 'wedge', label: 'Cuña' }, { value: 'grommet', label: 'Pasacables' }, { value: 'bracket', label: 'Escuadra' }] },
    { key: 'pitch', type: 'number', label: 'Distancia entre tornillos', default: 96, min: 16, max: 320, step: 1, unit: 'mm', show: v => v.kind === 'handle', hint: 'Medidas comunes: 64, 96, 128 y 160 mm.' },
    { key: 'hH', type: 'number', label: 'Cuánto sobresale', default: 30, min: 15, max: 60, step: 1, unit: 'mm', show: v => v.kind === 'handle' },
    { key: 'screw', type: 'number', label: 'Tornillo', default: 4, min: 2.5, max: 6, step: 0.5, unit: 'mm', show: v => v.kind === 'handle' || v.kind === 'bracket' },
    { key: 'wedgeL', type: 'number', label: 'Largo', default: 60, min: 20, max: 200, step: 1, unit: 'mm', show: v => v.kind === 'wedge' },
    { key: 'wedgeW', type: 'number', label: 'Ancho', default: 25, min: 8, max: 100, step: 1, unit: 'mm', show: v => v.kind === 'wedge' },
    { key: 'wedgeH', type: 'number', label: 'Alto máximo', default: 8, min: 2, max: 40, step: 0.5, unit: 'mm', show: v => v.kind === 'wedge' },
    { key: 'holeD', type: 'number', label: 'Agujero del escritorio', default: 60, min: 20, max: 120, step: 0.5, unit: 'mm', show: v => v.kind === 'grommet' },
    { key: 'deskT', type: 'number', label: 'Espesor del escritorio', default: 18, min: 8, max: 50, step: 0.5, unit: 'mm', show: v => v.kind === 'grommet' },
    { key: 'arm', type: 'number', label: 'Largo de cada lado', default: 50, min: 20, max: 150, step: 1, unit: 'mm', show: v => v.kind === 'bracket' },
    { key: 'color', type: 'color', label: 'Color', default: '#6B4F3A' },
  ],
  async build(v) {
    const { Manifold, CrossSection } = wasm();
    const parts = [];
    if (v.kind === 'handle') {
      // Manija en arco, acostada; dos patas con agujero para tornillo
      const L = v.pitch + 20, H = v.hH, t = 10;
      const outer = roundedRect(L, H * 2, H * 0.9).intersect(CrossSection.square([L, H], false).translate([-L / 2, 0]));
      const inner = roundedRect(v.pitch - 16, (H - t) * 2, (H - t) * 0.85).intersect(CrossSection.square([L, H], false).translate([-L / 2, 0]));
      let s = outer.subtract(inner).extrude(12).translate([0, 0, 0]);
      for (const x of [-v.pitch / 2, v.pitch / 2]) s = s.subtract(Manifold.cylinder(14, v.screw * 0.4, v.screw * 0.4, 24).rotate([-90, 0, 0]).translate([x, -1, 6]));
      parts.push(part('Tirador', v.color, s));
    } else if (v.kind === 'wedge') {
      const prof = new CrossSection([[[0, 0], [v.wedgeL, 0], [v.wedgeL, v.wedgeH], [0, 0.6]]], 'Positive');
      let s = prof.extrude(v.wedgeW).rotate([90, 0, 0]).translate([-v.wedgeL / 2, v.wedgeW / 2, 0]);
      // Estrías para que no resbale
      for (let x = 4; x < v.wedgeL - 2; x += 4) s = s.subtract(Manifold.cube([0.8, v.wedgeW + 2, 0.6], false).translate([-v.wedgeL / 2 + x, -v.wedgeW / 2 - 1, -0.01]));
      parts.push(part('Cuña', v.color, s));
    } else if (v.kind === 'grommet') {
      const r = v.holeD / 2;
      let ring = Manifold.cylinder(2.4, r + 6, r + 6, 96).add(Manifold.cylinder(Math.min(v.deskT, 14), r - 0.3, r - 0.3, 96).translate([0, 0, 2.4]));
      ring = ring.subtract(Manifold.cylinder(40, r - 2.3, r - 2.3, 96).translate([0, 0, -1]));
      // Tapa con salida para cables
      let lid = Manifold.cylinder(2, r + 5, r + 5, 96).add(Manifold.cylinder(4, r - 2.6, r - 2.6, 96).translate([0, 0, 2]));
      lid = lid.subtract(Manifold.cube([r * 0.9, r * 0.5, 10], false).translate([r * 0.35, -r * 0.25, -1]));
      parts.push(part('Aro', v.color, ring), part('Tapa', v.color, lid.translate([2 * r + 16, 0, 0])));
    } else {
      // Escuadra en L con nervio y dos agujeros por lado
      const a = v.arm, t = 4, w = 18;
      let s = Manifold.cube([a, w, t], false).add(Manifold.cube([t, w, a], false));
      const rib = new CrossSection([[[t, t], [a * 0.6, t], [t, a * 0.6]]], 'Positive').extrude(3).rotate([90, 0, 0]).translate([0, w / 2 + 1.5, 0]);
      s = s.add(rib);
      for (const d of [a * 0.45, a * 0.8]) {
        s = s.subtract(Manifold.cylinder(t + 2, v.screw / 2 + 0.2, v.screw / 2 + 0.2, 24).translate([d, w * 0.25, -1])).subtract(Manifold.cylinder(t + 2, v.screw / 2 + 0.2, v.screw / 2 + 0.2, 24).rotate([0, 90, 0]).translate([-1, w * 0.75, d]));
      }
      parts.push(part('Escuadra', v.color, s));
    }
    return mergeByColor(parts);
  },
};
