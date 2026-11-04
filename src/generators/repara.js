/**
 * Repará 3D: repuestos simples a medida. Perilla (con eje redondo, en D o estriado),
 * pata o tope (con tornillo o para encastrar), buje / separador y tapa para caño o pata.
 */
import { wasm, circle, roundedRect, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';

export default {
  id: 'repara',
  title: 'Repará 3D',
  description: 'Repuestos a medida: perillas, patas y topes, bujes y separadores, y tapas para caños o patas.',
  fileName: v => `repuesto_${v.kind}`,
  params: [
    { type: 'group', label: 'Repuesto' },
    { key: 'kind', type: 'segment', label: 'Qué', default: 'knob', options: [{ value: 'knob', label: 'Perilla' }, { value: 'foot', label: 'Pata / tope' }, { value: 'bush', label: 'Buje' }, { value: 'cap', label: 'Tapa de caño' }] },
    // Perilla
    { key: 'knobD', type: 'number', label: 'Diámetro de la perilla', default: 30, min: 10, max: 80, step: 0.5, unit: 'mm', show: v => v.kind === 'knob' },
    { key: 'knobH', type: 'number', label: 'Alto', default: 16, min: 6, max: 50, step: 0.5, unit: 'mm', show: v => v.kind === 'knob' },
    { key: 'grip', type: 'segment', label: 'Agarre', default: 'knurl', options: [{ value: 'knurl', label: 'Estriado' }, { value: 'smooth', label: 'Liso' }, { value: 'wings', label: 'Mariposa' }], show: v => v.kind === 'knob' },
    { key: 'shaft', type: 'segment', label: 'Eje', default: 'd', options: [{ value: 'round', label: 'Redondo' }, { value: 'd', label: 'En D' }, { value: 'spline', label: 'Estriado' }, { value: 'nut', label: 'Tuerca' }], show: v => v.kind === 'knob' },
    { key: 'shaftD', type: 'number', label: 'Diámetro del eje', default: 6, min: 2, max: 20, step: 0.05, unit: 'mm', show: v => v.kind === 'knob', hint: 'Para tuerca: medida entre caras (M3 = 5,5; M4 = 7; M5 = 8).' },
    { key: 'shaftL', type: 'number', label: 'Largo del eje adentro', default: 10, min: 3, max: 40, step: 0.5, unit: 'mm', show: v => v.kind === 'knob' },
    { key: 'pointer', type: 'toggle', label: 'Marca de posición', default: true, show: v => v.kind === 'knob' },
    // Pata
    { key: 'footD', type: 'number', label: 'Diámetro', default: 25, min: 8, max: 80, step: 0.5, unit: 'mm', show: v => v.kind === 'foot' },
    { key: 'footH', type: 'number', label: 'Alto', default: 15, min: 3, max: 120, step: 0.5, unit: 'mm', show: v => v.kind === 'foot' },
    { key: 'footTaper', type: 'number', label: 'Afinado abajo', default: 15, min: 0, max: 50, step: 1, unit: '%', show: v => v.kind === 'foot' },
    { key: 'footFix', type: 'segment', label: 'Se fija con', default: 'screw', options: [{ value: 'screw', label: 'Tornillo' }, { value: 'peg', label: 'Encastre' }, { value: 'none', label: 'Pegada' }], show: v => v.kind === 'foot' },
    { key: 'screwD', type: 'number', label: 'Tornillo', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm', show: v => v.kind === 'foot' && v.footFix === 'screw' },
    { key: 'pegD', type: 'number', label: 'Diámetro del encastre', default: 10, min: 3, max: 40, step: 0.1, unit: 'mm', show: v => v.kind === 'foot' && v.footFix === 'peg' },
    // Buje
    { key: 'outD', type: 'number', label: 'Diámetro de afuera', default: 12, min: 3, max: 100, step: 0.05, unit: 'mm', show: v => v.kind === 'bush' },
    { key: 'inD', type: 'number', label: 'Diámetro de adentro', default: 6, min: 0.5, max: 90, step: 0.05, unit: 'mm', show: v => v.kind === 'bush' },
    { key: 'len', type: 'number', label: 'Largo', default: 10, min: 1, max: 100, step: 0.5, unit: 'mm', show: v => v.kind === 'bush' },
    { key: 'flange', type: 'number', label: 'Pestaña', default: 3, min: 0, max: 20, step: 0.5, unit: 'mm', show: v => v.kind === 'bush' },
    // Tapa
    { key: 'pipeShape', type: 'segment', label: 'Caño', default: 'round', options: [{ value: 'round', label: 'Redondo' }, { value: 'square', label: 'Cuadrado' }, { value: 'rect', label: 'Rectangular' }], show: v => v.kind === 'cap' },
    { key: 'pipeW', type: 'number', label: 'Medida de adentro del caño', default: 22, min: 5, max: 100, step: 0.1, unit: 'mm', show: v => v.kind === 'cap' },
    { key: 'pipeH', type: 'number', label: 'Otro lado (rectangular)', default: 12, min: 5, max: 100, step: 0.1, unit: 'mm', show: v => v.kind === 'cap' && v.pipeShape === 'rect' },
    { key: 'capFit', type: 'number', label: 'Ajuste', default: 0.3, min: -0.5, max: 1, step: 0.05, unit: 'mm', hint: 'Positivo = más apretado.', show: v => v.kind === 'cap' },
    { key: 'color', type: 'color', label: 'Color', default: '#1E1E1E' },
  ],
  async build(v) {
    const { Manifold, CrossSection } = wasm();
    let s;
    if (v.kind === 'knob') {
      const R = v.knobD / 2, H = v.knobH;
      let prof = circle(R, 96);
      if (v.grip === 'knurl') { const n = Math.max(12, Math.round(R * 1.6)); for (let i = 0; i < n; i++) prof = prof.subtract(circle(R * 0.08 + 0.6, 16).translate([Math.cos(i / n * 2 * Math.PI) * R, Math.sin(i / n * 2 * Math.PI) * R])); }
      if (v.grip === 'wings') prof = circle(R * 0.45, 64).add(roundedRect(2 * R, R * 0.55, R * 0.27));
      s = prof.extrude(H).add(Manifold.cylinder(2, R * 0.9, R * 0.97, 96).translate([0, 0, H]));
      const sd = v.shaftD / 2 + 0.1;
      let hole = v.shaft === 'nut' ? circle(v.shaftD / 2 / Math.cos(Math.PI / 6) + 0.15, 6) : circle(sd, 48);
      if (v.shaft === 'd') hole = hole.subtract(CrossSection.square([sd * 2, sd], false).translate([-sd, sd * 0.6]));
      if (v.shaft === 'spline') { for (let i = 0; i < 18; i++) hole = hole.add(circle(sd * 0.12, 8).translate([Math.cos(i / 18 * 2 * Math.PI) * sd, Math.sin(i / 18 * 2 * Math.PI) * sd])); }
      s = s.subtract(hole.extrude(Math.min(v.shaftL, H + 1.5)).translate([0, 0, -0.01]));
      if (v.pointer) s = s.subtract(roundedRect(1.4, R * 0.6, 0.7).translate([0, R * 0.55]).extrude(1).translate([0, 0, H + 1.01]));
    } else if (v.kind === 'foot') {
      const R = v.footD / 2, H = v.footH;
      s = Manifold.cylinder(H, R * (1 - v.footTaper / 100), R, 96);
      if (v.footFix === 'screw') s = s.subtract(Manifold.cylinder(H + 2, v.screwD / 2 + 0.2, v.screwD / 2 + 0.2, 32).translate([0, 0, -1])).subtract(Manifold.cylinder(v.screwD * 0.6, v.screwD + 0.4, v.screwD / 2 + 0.2, 32).translate([0, 0, -0.01]));
      if (v.footFix === 'peg') s = s.add(Manifold.cylinder(Math.min(15, v.pegD), v.pegD / 2, v.pegD / 2 * 0.96, 64).translate([0, 0, H]));
    } else if (v.kind === 'bush') {
      s = Manifold.cylinder(v.len, v.outD / 2, v.outD / 2, 96);
      if (v.flange > 0) s = s.add(Manifold.cylinder(1.6, v.outD / 2 + v.flange, v.outD / 2 + v.flange, 96));
      s = s.subtract(Manifold.cylinder(v.len + 2, v.inD / 2, v.inD / 2, 64).translate([0, 0, -1]));
    } else {
      const w = v.pipeW + v.capFit, h = v.pipeShape === 'rect' ? v.pipeH + v.capFit : w;
      const sec = v.pipeShape === 'round' ? circle(w / 2, 96) : roundedRect(w, h, 1);
      const top = v.pipeShape === 'round' ? circle(w / 2 + 2.2, 96) : roundedRect(w + 4.4, h + 4.4, 2.5);
      // Tapa con aletas finitas que se acomodan al caño
      const plug = sec.subtract(sec.offset(-1.6, 'Round', 2, 24)).extrude(12).translate([0, 0, 3]);
      s = top.extrude(3).add(plug);
      for (let i = 0; i < 3; i++) s = s.add(sec.offset(0.5 - i * 0.05, 'Round', 2, 24).subtract(sec.offset(-1.6, 'Round', 2, 24)).extrude(0.8).translate([0, 0, 5 + i * 3]));
    }
    return mergeByColor([part('Repuesto', v.color, s)]);
  },
};
