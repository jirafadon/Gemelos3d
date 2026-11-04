/**
 * Cubre caja de pañuelos: una funda sin fondo que tapa la caja de pañuelos de cartón,
 * con la abertura arriba, texto o paredes caladas. Se imprime boca abajo (la tapa sobre la cama).
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'caja-panuelos',
  title: 'Cubre caja de pañuelos',
  description: 'Funda para la caja de pañuelos de cartón, con la abertura arriba, tu texto y paredes lisas o caladas.',
  fileName: v => `cubre_panuelos_${firstLine(v.text, 'liso')}`,
  params: [
    { type: 'group', label: 'Tu caja de pañuelos' },
    { key: 'W', type: 'number', label: 'Largo de la caja', default: 222, min: 80, max: 270, step: 1, unit: 'mm' },
    { key: 'D', type: 'number', label: 'Ancho de la caja', default: 112, min: 60, max: 200, step: 1, unit: 'mm' },
    { key: 'H', type: 'number', label: 'Alto de la caja', default: 85, min: 40, max: 200, step: 1, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura', default: 1.5, min: 0.5, max: 5, step: 0.5, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 2, min: 1.2, max: 4, step: 0.2, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo', default: 8, min: 0, max: 30, step: 1, unit: 'mm' },

    { type: 'group', label: 'Diseño' },
    { key: 'opening', type: 'segment', label: 'Abertura', default: 'oval', options: [{ value: 'oval', label: 'Óvalo' }, { value: 'slot', label: 'Ranura' }, { value: 'round', label: 'Redonda' }] },
    { key: 'walls', type: 'segment', label: 'Paredes', default: 'plain', options: [{ value: 'plain', label: 'Lisas' }, { value: 'slots', label: 'Ranuras' }, { value: 'dots', label: 'Puntos' }] },
    { key: 'text', type: 'text', label: 'Texto al frente', default: 'Hogar' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => !!(v.text || '').trim() },
    { key: 'color', type: 'color', label: 'Color', default: '#E9C46A' },
    { key: 'color2', type: 'color', label: 'Texto', default: '#264653', show: v => !!(v.text || '').trim() },
  ],
  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const t = v.wall, W = v.W + 2 * v.tol + 2 * t, D = v.D + 2 * v.tol + 2 * t, H = v.H + v.tol + t;
    const r = Math.min(v.radius, D / 2 - 1);
    // Boca abajo: la tapa en z = 0..t y las paredes hacia arriba
    let shell = slab(roundedRect(W, D, r), H).subtract(slab(roundedRect(W - 2 * t, D - 2 * t, Math.max(0, r - t)), H, t));
    const hole = v.opening === 'oval' ? roundedRect(Math.min(150, W * 0.6), Math.min(50, D * 0.42), Math.min(25, D * 0.21)) :
      v.opening === 'slot' ? roundedRect(Math.min(170, W * 0.7), 14, 7) : CrossSection.circle(Math.min(35, D * 0.32), 64);
    shell = shell.subtract(slab(hole, t + 2, -1));
    // Paredes caladas en los lados largos (dejando marco)
    if (v.walls !== 'plain') {
      const cuts = [];
      const zc0 = t + 14, zc1 = H - 14;
      const pitch = v.walls === 'slots' ? 10 : 9;
      const n = Math.floor((W - 2 * r - 20) / pitch);
      for (let i = 0; i < n; i++) {
        const x = -((n - 1) * pitch) / 2 + i * pitch;
        if (v.walls === 'slots') cuts.push(roundedRect(4, zc1 - zc0, 2).translate([x, (zc0 + zc1) / 2]));
        else for (let z = zc0 + 3; z < zc1 - 2; z += 9) cuts.push(CrossSection.circle(2.6, 24).translate([x + ((z / 9) % 2 ? pitch / 2 : 0), z]));
      }
      if (cuts.length) {
        let c2 = CrossSection.union(cuts).extrude(D + 2, 0, 0, [1, 1], true).rotate([90, 0, 0]);
        // Con texto, el frente queda liso y se calan solo los otros lados
        if ((v.text || '').trim()) c2 = c2.intersect(Manifold.cube([W + 2, D, H * 2], false).translate([-W / 2 - 1, 0, -1]));
        shell = shell.subtract(c2);
      }
    }
    const parts = [];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      // Al frente, centrado en el alto; boca abajo el texto va al revés (se lee al dar vuelta la funda)
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), W * 0.6, Math.min(30, H * 0.35)).rotate(180);
      const solid = txt.extrude(1.2 + 0.4).rotate([90, 0, 0]).translate([0, -D / 2 + 0.4, t + (H - t) / 2]);
      // Donde van las letras, la pared queda lisa
      parts.push(part('Texto', v.color2, solid.subtract(shell)));
    }
    parts.unshift(part('Funda', v.color, shell));
    return mergeByColor(parts);
  },
};
