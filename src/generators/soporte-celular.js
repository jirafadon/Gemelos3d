/**
 * Soporte de celular o tablet para escritorio, con ángulo a elección,
 * labio delantero y paso para el cable. Sale parado sobre su base y se imprime así, sin soportes.
 */
import { wasm, circle, slab, part } from '../engine/geom.js';
import { smooth } from '../engine/shapes.js';

export default {
  id: 'soporte-celular',
  title: 'Soporte de celular / tablet',
  description: 'Atril de escritorio con el ángulo que quieras y paso para el cargador.',
  fileName: v => `soporte_${v.angle}grados`,
  params: [
    { type: 'group', label: 'Equipo' },
    { key: 'device', type: 'segment', label: 'Para', default: 'phone', options: [{ value: 'phone', label: 'Celular' }, { value: 'tablet', label: 'Tablet' }] },
    { key: 'phoneT', type: 'number', label: 'Grosor del equipo (con funda)', default: 12, min: 6, max: 25, step: 0.5, unit: 'mm' },
    { key: 'angle', type: 'number', label: 'Inclinación', default: 65, min: 45, max: 85, step: 1, unit: '°' },
    { key: 'width', type: 'number', label: 'Ancho del soporte', default: 70, min: 30, max: 200, step: 1, unit: 'mm' },

    { type: 'group', label: 'Detalles' },
    { key: 'lipH', type: 'number', label: 'Alto del labio delantero', default: 10, min: 4, max: 30, step: 0.5, unit: 'mm' },
    { key: 'cable', type: 'toggle', label: 'Paso para el cable', default: true },
    { key: 'cableW', type: 'number', label: 'Ancho del paso', default: 14, min: 8, max: 30, step: 1, unit: 'mm', show: v => v.cable },
    { key: 'thick', type: 'number', label: 'Grosor de las paredes', default: 5, min: 3, max: 10, step: 0.5, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Color', default: '#1D4ED8' },
  ],

  build(v) {
    const { CrossSection } = wasm();
    const t = v.thick, W = v.width;
    const restL = v.device === 'tablet' ? 120 : 85;
    const a = v.angle * Math.PI / 180;
    const x0 = t + v.phoneT + 1; // donde arranca el respaldo
    const topX = x0 + restL * Math.cos(a), topY = restL * Math.sin(a);
    const B = Math.max(topX + 12, x0 + 40);
    // Perfil (x = profundidad, y = alto)
    const base = CrossSection.square([B, t], false);
    const lip = CrossSection.square([t, t + v.lipH], false);
    const rest = CrossSection.square([restL, t], false).rotate(v.angle).translate([x0 + t * Math.sin(a), 0]);
    const strut = CrossSection.hull([circle(t / 2, 24).translate([x0 + restL * 0.6 * Math.cos(a) + t * 0.6, restL * 0.6 * Math.sin(a)]), circle(t / 2, 24).translate([B - t / 2, t / 2])]);
    let profile = smooth(base.add(lip).add(rest).add(strut), 1.2).intersect(CrossSection.square([B + 20, topY + 20], false));
    let solid = slab(profile, W);
    if (v.cable) {
      const notch = slab(CrossSection.square([x0 + 1, t + v.lipH + 2], false).translate([-0.5, -1]), v.cableW, W / 2 - v.cableW / 2);
      solid = solid.subtract(notch);
    }
    // El perfil se dibujó en XY: se para para que la base quede sobre la cama
    solid = solid.rotate([90, 0, 0]).translate([0, W / 2, 0]);
    return [part('Soporte', v.color, solid)];
  },
};
