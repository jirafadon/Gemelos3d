/**
 * Soporte universal: gancho bajo escritorio para auriculares o carteras, soporte de pared
 * para cosas cilíndricas (secador, linterna, botella) y organizador de cables para el borde de la mesa.
 */
import { wasm, circle, roundedRect, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';

export default {
  id: 'soporte-universal',
  title: 'Soporte universal',
  description: 'Gancho bajo escritorio para auriculares o carteras, soporte de pared para objetos redondos y organizador de cables de mesa.',
  fileName: v => `soporte_${v.kind}`,
  params: [
    { key: 'kind', type: 'segment', label: 'Soporte', default: 'underdesk', options: [{ value: 'underdesk', label: 'Bajo escritorio' }, { value: 'wall', label: 'De pared' }, { value: 'cables', label: 'Cables de mesa' }] },
    { key: 'gapW', type: 'number', label: 'Hueco (lo que cuelga o lo que entra)', default: 30, min: 8, max: 120, step: 0.5, unit: 'mm', hint: 'Bajo escritorio: ancho del arco del auricular. De pared: diámetro del objeto.' },
    { key: 'width', type: 'number', label: 'Ancho', default: 28, min: 10, max: 80, step: 1, unit: 'mm' },
    { key: 'deskT', type: 'number', label: 'Espesor de la mesa (cables)', default: 20, min: 10, max: 60, step: 0.5, unit: 'mm', show: v => v.kind === 'cables' },
    { key: 'slots', type: 'number', label: 'Cables', default: 4, min: 1, max: 10, step: 1, unit: '', show: v => v.kind === 'cables' },
    { key: 'cableD', type: 'number', label: 'Diámetro de cable', default: 5, min: 2, max: 12, step: 0.5, unit: 'mm', show: v => v.kind === 'cables' },
    { key: 'color', type: 'color', label: 'Color', default: '#1E1E1E' },
  ],
  async build(v) {
    const { Manifold, CrossSection } = wasm();
    const t = 5, W = v.width;
    let prof; // perfil en el plano XY, se extruye el ancho
    if (v.kind === 'underdesk') {
      // Placa para atornillar bajo la mesa + bajada + gancho en J con pestaña
      const r = v.gapW / 2, cx = 20 + t - (r + t), cy = -30;
      const plate = CrossSection.square([60, t], false).translate([-30, -t]);
      const drop = CrossSection.square([t, 30], false).translate([20, -30]);
      const lip = CrossSection.square([t, 10], false).translate([cx - r - t, cy - 0.01]);
      prof = CrossSection.union([plate, drop, circle(r + t, 96).subtract(circle(r, 96)).translate([cx, cy]).intersect(CrossSection.square([4 * r + 4 * t, 2 * r + 2 * t], false).translate([cx - 2 * r - 2 * t, cy - 2 * r - 2 * t])), lip]);
    } else if (v.kind === 'wall') {
      // Aro abierto adelante para objetos redondos, con placa de pared
      const r = v.gapW / 2;
      const ring = circle(r + t, 96).subtract(circle(r, 96)).subtract(CrossSection.square([r * 1.3, r * 2], false).translate([-r * 0.65, r * 0.35]));
      const plate = CrossSection.square([2 * r + 2 * t + 20, t], false).translate([-(2 * r + 2 * t + 20) / 2, -r - t - t + 0.5]);
      prof = ring.add(plate).rotate(0);
    } else {
      // Clip en U para el borde de la mesa con ranuras para cables arriba
      const T = v.deskT + 0.6;
      prof = CrossSection.union([CrossSection.square([30, t], false).translate([0, T]), CrossSection.square([30, t], false).translate([0, -t]), CrossSection.square([t, T + 2 * t], false).translate([30, -t])]);
    }
    let s = prof.extrude(W).translate([0, 0, -W / 2]);
    if (v.kind === 'underdesk') for (const x of [-20, 0]) s = s.subtract(Manifold.cylinder(t + 2, 2.2, 2.2, 24).rotate([90, 0, 0]).translate([x, 1, 0]));
    if (v.kind === 'wall') for (const x of [-(v.gapW / 2 + t + 6), v.gapW / 2 + t + 6]) s = s.subtract(Manifold.cylinder(t + 4, 2.2, 2.2, 24).rotate([90, 0, 0]).translate([x, -v.gapW / 2 - t - t + 0.5 + t + 1, 0]));
    if (v.kind === 'cables') {
      const T = v.deskT + 0.6;
      const n = v.slots, pitch = W / n;
      // Ranuras en el borde de arriba: entran a presión (boca más angosta)
      for (let i = 0; i < n; i++) {
        const z = -W / 2 + pitch * (i + 0.5);
        s = s.subtract(Manifold.cylinder(40, v.cableD / 2 + 0.2, v.cableD / 2 + 0.2, 32).rotate([0, 90, 0]).translate([-1, T + t / 2 + 1.2, z]));
        s = s.subtract(Manifold.cube([42, 4, v.cableD * 0.75], false).translate([-1, T + t / 2 + 1.2, z - v.cableD * 0.375]));
      }
    }
    // Acostado para imprimir sin soportes (el perfil sobre la cama)
    const parts = [part('Soporte', v.color, s.translate([0, 0, W / 2]))];
    return mergeByColor(parts);
  },
};
