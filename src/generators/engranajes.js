/**
 * Engranajes rectos, helicoidales o en espiga (perfil de evolvente).
 * Se definen por módulo y cantidad de dientes; opcionalmente arma el par que engrana.
 */
import { wasm, circle, slab, part, polygonShape } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';

const inv = a => Math.tan(a) - a;

/** Perfil 2D de un engranaje centrado en el origen. */
export function gearShape(m, z, pressureDeg = 20, backlash = 0.1) {
  const phi = pressureDeg * Math.PI / 180;
  const rp = m * z / 2, rb = rp * Math.cos(phi), ra = rp + m, rf = Math.max(rp - 1.25 * m, m * 0.5);
  const rMin = Math.max(rb, rf);
  const half = Math.PI / (2 * z) - backlash / (2 * rp);
  const beta = r => half + inv(phi) - inv(Math.acos(Math.min(1, rb / r)));
  const steps = 10;
  const pts = [];
  const pol = (r, a) => pts.push([r * Math.cos(a), r * Math.sin(a)]);
  for (let k = 0; k < z; k++) {
    const c = 2 * Math.PI * k / z;
    if (rb > rf) pol(rf, c - beta(rb));
    for (let i = 0; i <= steps; i++) { const r = rMin + (ra - rMin) * i / steps; pol(r, c - beta(r)); }
    for (let i = steps; i >= 0; i--) { const r = rMin + (ra - rMin) * i / steps; pol(r, c + beta(r)); }
    if (rb > rf) pol(rf, c + beta(rb));
  }
  return { shape: polygonShape(pts), rp, ra, rf };
}

export default {
  id: 'engranajes',
  title: 'Engranajes',
  description: 'Engranajes rectos, helicoidales o en espiga, por módulo y dientes. Arma el par.',
  fileName: v => `engranaje_m${v.module}_z${v.teeth}${v.pair ? `_z${v.teeth2}` : ''}`,
  params: [
    { type: 'group', label: 'Engranaje' },
    { key: 'module', type: 'number', label: 'Módulo', default: 2, min: 0.5, max: 6, step: 0.25, unit: 'mm', hint: 'Tamaño del diente. Dos engranajes engranan solo si tienen el mismo módulo.' },
    { key: 'teeth', type: 'number', label: 'Dientes', default: 20, min: 8, max: 120, step: 1, unit: '' },
    { key: 'width', type: 'number', label: 'Espesor', default: 8, min: 2, max: 40, step: 0.5, unit: 'mm' },
    { key: 'type', type: 'segment', label: 'Dientes', default: 'spur', options: [{ value: 'spur', label: 'Rectos' }, { value: 'helical', label: 'Helicoidales' }, { value: 'herring', label: 'En espiga' }] },
    { key: 'helix', type: 'number', label: 'Ángulo de hélice', default: 20, min: 5, max: 45, step: 1, unit: '°', show: v => v.type !== 'spur' },
    { key: 'pressure', type: 'segment', label: 'Ángulo de presión', default: 20, options: [{ value: 20, label: '20°' }, { value: 14.5, label: '14,5°' }] },

    { type: 'group', label: 'Centro' },
    { key: 'bore', type: 'number', label: 'Agujero del eje', default: 5, min: 0, max: 60, step: 0.1, unit: 'mm' },
    { key: 'flat', type: 'toggle', label: 'Eje con cara plana (D)', default: false, show: v => v.bore > 2, hint: 'Para ejes de motor tipo D.' },
    { key: 'hubD', type: 'number', label: 'Diámetro del cubo (0 = sin cubo)', default: 14, min: 0, max: 80, step: 0.5, unit: 'mm' },
    { key: 'hubH', type: 'number', label: 'Alto del cubo', default: 5, min: 1, max: 30, step: 0.5, unit: 'mm', show: v => v.hubD > 0 },
    { key: 'spokes', type: 'toggle', label: 'Alivianar con ventanas', default: false },

    { type: 'group', label: 'Par' },
    { key: 'pair', type: 'toggle', label: 'Armar el engranaje compañero', default: true },
    { key: 'teeth2', type: 'number', label: 'Dientes del compañero', default: 10, min: 8, max: 120, step: 1, unit: '', show: v => v.pair },
    { key: 'backlash', type: 'number', label: 'Juego entre dientes', default: 0.15, min: 0, max: 0.6, step: 0.05, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Color', default: '#334155' },
    { key: 'color2', type: 'color', label: 'Color del compañero', default: '#C2410C', show: v => v.pair },
  ],

  build(v) {
    const { CrossSection } = wasm();
    const make = (z, dir, rot) => {
      const { shape, rp, rf } = gearShape(v.module, z, v.pressure, v.backlash);
      let g2d = shape.rotate(rot);
      const twist = v.type === 'spur' ? 0 : (v.width * Math.tan(v.helix * Math.PI / 180) / rp) * 180 / Math.PI * dir;
      let solid;
      if (v.type === 'herring') {
        const h = v.width / 2;
        const lower = g2d.extrude(h, 12, twist / 2);
        const upper = g2d.rotate(twist / 2).extrude(h, 12, -twist / 2).translate([0, 0, h]);
        solid = lower.add(upper);
      } else solid = g2d.extrude(v.width, twist ? 16 : 0, twist);
      if (v.spokes && rf > 18) {
        const rIn = Math.max(v.hubD / 2, v.bore / 2 + 3) + 3, rOut = rf - 4;
        if (rOut - rIn > 4) {
          const win = circle(rOut, 96).subtract(circle(rIn, 64));
          const arms = CrossSection.union([0, 1, 2, 3, 4].map(i => CrossSection.square([rOut * 2.2, 3.5], true).rotate(i * 36)));
          solid = solid.subtract(slab(win.subtract(arms), v.width + 2, -1));
        }
      }
      if (v.hubD > 0) solid = solid.add(slab(circle(v.hubD / 2, 64), v.hubH, v.width - 0.01));
      if (v.bore > 0) {
        let hole = circle(v.bore / 2, 48);
        if (v.flat && v.bore > 2) hole = hole.subtract(CrossSection.square([v.bore, v.bore], true).translate([0, v.bore * 0.9]));
        solid = solid.subtract(slab(hole, v.width + v.hubH + 2, -1));
      }
      return { solid, rp };
    };
    const g1 = make(v.teeth, 1, 0);
    const parts = [part(`Engranaje ${v.teeth} dientes`, v.color, g1.solid)];
    if (v.pair) {
      const z2 = v.teeth2;
      const g2 = make(z2, -1, z2 % 2 === 0 ? 180 / z2 : 0);
      // Se ubica a la distancia entre centros exacta (para ver que engranan)
      const dist = g1.rp + g2.rp;
      parts.push(part(`Engranaje ${z2} dientes`, v.color2, g2.solid.translate([dist, 0, 0])));
    }
    return mergeByColor(parts);
  },
};
