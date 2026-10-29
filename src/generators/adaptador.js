/**
 * Adaptador / reductor entre dos medidas redondas (caños, mangueras, aspiradoras).
 * En cada punta se elige si la medida es de un caño que entra adentro del
 * adaptador (se mide el exterior del caño) o de un caño donde el adaptador entra.
 */
import { wasm, part, polygonShape } from '../engine/geom.js';

export default {
  id: 'adaptador',
  title: 'Adaptador de medidas',
  description: 'Une dos caños o mangueras de distinta medida, con transición sin soportes.',
  fileName: v => `adaptador_${v.dA}_a_${v.dB}`,
  params: [
    { type: 'group', label: 'Punta A (abajo)' },
    { key: 'dA', type: 'number', label: 'Medida A', default: 32, min: 4, max: 200, step: 0.1, unit: 'mm' },
    { key: 'fitA', type: 'segment', label: 'El caño A', default: 'over', options: [{ value: 'over', label: 'Entra en el adaptador' }, { value: 'into', label: 'Recibe al adaptador' }], hint: 'Entra: medí el diámetro EXTERIOR del caño. Recibe: medí el diámetro INTERIOR.' },
    { key: 'lA', type: 'number', label: 'Largo de la punta A', default: 25, min: 5, max: 120, step: 1, unit: 'mm' },

    { type: 'group', label: 'Punta B (arriba)' },
    { key: 'dB', type: 'number', label: 'Medida B', default: 20, min: 4, max: 200, step: 0.1, unit: 'mm' },
    { key: 'fitB', type: 'segment', label: 'El caño B', default: 'into', options: [{ value: 'over', label: 'Entra en el adaptador' }, { value: 'into', label: 'Recibe al adaptador' }] },
    { key: 'lB', type: 'number', label: 'Largo de la punta B', default: 25, min: 5, max: 120, step: 1, unit: 'mm' },

    { type: 'group', label: 'Cuerpo' },
    { key: 'wall', type: 'number', label: 'Pared', default: 2, min: 0.8, max: 6, step: 0.1, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura', default: 0.3, min: 0, max: 1.5, step: 0.05, unit: 'mm' },
    { key: 'trans', type: 'number', label: 'Largo de la transición', default: 0, min: 0, max: 120, step: 1, unit: 'mm', hint: '0 = automático (a 45°, se imprime sin soportes).' },
    { key: 'stop', type: 'toggle', label: 'Tope interno', default: true, hint: 'Un escalón para que los caños no pasen de largo.' },
    { key: 'color', type: 'color', label: 'Color', default: '#0F766E' },
  ],

  build(v) {
    const t = v.wall;
    const radii = (d, fit) => fit === 'over' ? [d / 2 + v.tol, d / 2 + v.tol + t] : [d / 2 - v.tol - t, d / 2 - v.tol];
    const [riA, roA] = radii(v.dA, v.fitA), [riB, roB] = radii(v.dB, v.fitB);
    if (riA < 0.5 || riB < 0.5) throw new Error('La pared es más gruesa que el caño: bajá la pared o revisá las medidas.');
    // Tope: el interior se angosta hacia la punta B; el escalón mira hacia arriba (sin soportes)
    const stopIn = v.stop ? Math.max(0.5, Math.min(riA, riB) - Math.min(1.5, t * 0.75)) : riB;
    const auto = Math.max(Math.abs(roA - roB), riA - stopIn, 0) + 1;
    const LT = Math.max(2, v.trans || auto);
    const z1 = v.lA, z2 = v.lA + LT, z3 = z2 + v.lB;
    const zs = v.stop ? z2 - 0.8 : z2;
    const inner = v.stop
      ? [[riB, z3], [riB, zs], [stopIn, zs], [riA, z1], [riA, 0]]
      : [[riB, z3], [riB, z2], [riA, z1], [riA, 0]];
    const pts = [[roA, 0], [roA, z1], [roB, z2], [roB, z3], ...inner];
    const solid = wasm().Manifold.revolve(polygonShape(pts), 128);
    return [part('Adaptador', v.color, solid)];
  },
};
