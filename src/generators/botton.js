/**
 * Accesorios para botton (chapitas de 25, 32, 44, 56 o 58 mm): marco que abraza la chapita
 * con un reborde, y atrás: imán, argolla de llavero, colgante de adorno o pie para escritorio.
 * Incluye una "prueba de tamaño" con aros de varias medidas para calibrar la holgura.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';

export default {
  id: 'botton',
  title: 'Accesorios para botton',
  description: 'Marco para chapitas de 25 a 58 mm con imán, llavero, adorno o pie de escritorio, y prueba de tamaño.',
  fileName: v => `botton_${v.badgeD}mm_${v.back}`,
  params: [
    { type: 'group', label: 'Chapita' },
    { key: 'badgeD', type: 'select', label: 'Medida de la chapita', default: '58', options: ['25', '32', '38', '44', '56', '58', '75'].map(x => ({ value: x, label: `${x} mm` })) },
    { key: 'realD', type: 'number', label: 'Diámetro real medido', default: 0, min: 0, max: 90, step: 0.1, unit: 'mm', hint: '0 = usar la medida nominal + 1,5 mm (el borde de la chapa suele medir más).' },
    { key: 'badgeT', type: 'number', label: 'Alto de la chapita', default: 5, min: 2, max: 10, step: 0.1, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura', default: 0.3, min: 0, max: 1.2, step: 0.05, unit: 'mm' },

    { type: 'group', label: 'Accesorio' },
    { key: 'back', type: 'segment', label: 'Atrás', default: 'magnet', options: [{ value: 'magnet', label: 'Imán' }, { value: 'keyring', label: 'Llavero' }, { value: 'ornament', label: 'Adorno' }, { value: 'stand', label: 'Pie' }, { value: 'test', label: 'Prueba de tamaño' }] },
    { key: 'magnetD', type: 'number', label: 'Imán', default: 15.2, min: 5, max: 30, step: 0.1, unit: 'mm', show: v => v.back === 'magnet' },
    { key: 'magnetH', type: 'number', label: 'Alto del imán', default: 3.2, min: 1, max: 6, step: 0.1, unit: 'mm', show: v => v.back === 'magnet' },
    { key: 'rim', type: 'number', label: 'Ancho del marco', default: 3, min: 1.5, max: 10, step: 0.5, unit: 'mm' },
    { key: 'text', type: 'text', label: 'Texto en el borde (opcional)', default: '', show: v => v.back !== 'test' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins', show: v => !!(v.text || '').trim() },
    { key: 'color', type: 'color', label: 'Color', default: '#457B9D' },
  ],
  async build(v, ctx) {
    const { Manifold } = wasm();
    const nominal = +v.badgeD, D = (v.realD > 0 ? v.realD : nominal + 1.5) + 2 * v.tol, R = D / 2;
    if (v.back === 'test') {
      // Tres aros finitos: -0,3, justo y +0,3 mm, con la medida grabada
      const font = await ctx.font('poppins');
      const out = [];
      [-0.3, 0, 0.3].forEach((d, i) => {
        const r = R + d;
        let ring = slab(circle(r + 2, 96).subtract(circle(r, 96)), 3).add(slab(circle(r + 2, 96).subtract(circle(r - 1.2, 96)), 0.8));
        const txt = fitInto(stackLines([{ font, text: (2 * r).toFixed(1).replace('.', ','), height: 10 }]), 10, 3).translate([0, -r - 1]);
        ring = ring.subtract(slab(txt, 0.6, 2.4));
        out.push(ring.translate([i * (2 * R + 10), 0, 0]));
      });
      return mergeByColor([part('Prueba', v.color, Manifold.union(out))]);
    }
    const t = v.rim;
    // Fondo más grueso si lleva imán (el hueco del imán se abre por abajo, sobre la cama)
    const floor = v.back === 'magnet' ? v.magnetH + 0.8 : 1.6, H = floor + v.badgeT;
    // Copa: fondo + pared + reborde que retiene la chapita (entra a presión)
    let cup = Manifold.cylinder(H, R + t, R + t, 128);
    cup = cup.subtract(Manifold.cylinder(H, R, R, 128).translate([0, 0, floor]));
    cup = cup.add(Manifold.cylinder(0.8, R + t, R + t, 128).subtract(Manifold.cylinder(1, R - 0.7, R - 0.7, 128).translate([0, 0, -0.1])).translate([0, 0, H]));
    if (v.back === 'magnet') cup = cup.subtract(Manifold.cylinder(v.magnetH + 0.01, v.magnetD / 2 + 0.1, v.magnetD / 2 + 0.1, 64).translate([0, 0, -0.01]));
    if (v.back === 'keyring' || v.back === 'ornament') {
      const big = v.back === 'ornament';
      const tab = circle(big ? 6 : 5, 40).translate([0, R + t + (big ? 4 : 3)]).add(roundedRect(big ? 12 : 9, 8, 2).translate([0, R + t]));
      cup = cup.add(slab(tab.subtract(circle(big ? 3 : 2.4, 32).translate([0, R + t + (big ? 4 : 3)])).subtract(circle(R + t - 0.5, 96)), 3));
    }
    let extra = null;
    if (v.back === 'stand') {
      // Base aparte con una ranura donde la chapita entra parada
      const L = R * 1.4, slotW = H + 0.8 + 0.4;
      extra = Manifold.cube([L, 22, 10], true).translate([0, 0, 5]).subtract(Manifold.cube([L + 2, slotW, 7], true).translate([0, 0, 10 - 3.5 + 0.01])).translate([0, -(R + t) - 20, 0]);
    }
    const parts = [part('Marco', v.color, cup)];
    if (extra) parts.push(part('Base', v.color, extra));
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), R * 1.2, Math.max(2.4, t * 0.7)).translate([0, -R - t / 2]);
      parts[0] = part('Marco', v.color, cup.subtract(slab(txt, 0.6, H + 0.8 - 0.6)));
    }
    return mergeByColor(parts);
  },
};
