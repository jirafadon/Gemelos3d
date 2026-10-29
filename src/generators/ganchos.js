/**
 * Ganchos de pared para llaves, auriculares, carteras o toallas.
 * Se imprimen de costado (el perfil apoyado en la cama): así las capas
 * corren a lo largo del gancho y no se quiebra.
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';
import { smooth } from '../engine/shapes.js';

export default {
  id: 'ganchos',
  title: 'Ganchos de pared',
  description: 'Uno o varios ganchos sobre una placa, con agujeros avellanados o para cinta.',
  fileName: v => `ganchos_${v.count}`,
  params: [
    { type: 'group', label: 'Ganchos' },
    { key: 'count', type: 'number', label: 'Cantidad de ganchos', default: 3, min: 1, max: 8, step: 1, unit: '' },
    { key: 'reach', type: 'number', label: 'Largo del brazo', default: 30, min: 10, max: 120, step: 1, unit: 'mm' },
    { key: 'tip', type: 'number', label: 'Alto de la punta', default: 12, min: 4, max: 60, step: 1, unit: 'mm' },
    { key: 'armT', type: 'number', label: 'Grosor del brazo', default: 6, min: 3, max: 16, step: 0.5, unit: 'mm' },
    { key: 'armW', type: 'number', label: 'Ancho de cada gancho', default: 10, min: 4, max: 40, step: 1, unit: 'mm' },
    { key: 'angle', type: 'number', label: 'Inclinación del brazo', default: 10, min: 0, max: 45, step: 1, unit: '°', hint: 'Un poco hacia arriba para que no se resbale lo que cuelga.' },

    { type: 'group', label: 'Placa' },
    { key: 'plateW', type: 'number', label: 'Largo de la placa', default: 120, min: 15, max: 260, step: 1, unit: 'mm' },
    { key: 'plateH', type: 'number', label: 'Alto de la placa', default: 40, min: 15, max: 120, step: 1, unit: 'mm' },
    { key: 'plateT', type: 'number', label: 'Espesor de la placa', default: 5, min: 2.4, max: 12, step: 0.2, unit: 'mm' },
    { key: 'mount', type: 'segment', label: 'Fijación', default: 'screw', options: [{ value: 'screw', label: 'Tornillos' }, { value: 'tape', label: 'Cinta doble faz' }] },
    { key: 'screwD', type: 'number', label: 'Diámetro del tornillo', default: 4, min: 2.5, max: 6, step: 0.5, unit: 'mm', show: v => v.mount === 'screw' },
    { key: 'color', type: 'color', label: 'Color', default: '#334155' },
  ],

  build(v) {
    const { Manifold, CrossSection } = wasm();
    const T = v.plateT, Hp = v.plateH, a = v.armT;
    const W = Math.max(v.plateW, v.count * v.armW + (v.count + 1) * 4);
    // Perfil en XY (x = sale de la pared, y = alto); se extruye en Z (= largo de la placa)
    const plate2d = roundedRect(T, Hp, Math.min(1.5, T / 3)).translate([T / 2, Hp / 2]);
    const arm = CrossSection.square([v.reach + T, a], false).rotate(v.angle).translate([0, 0]);
    const ang = v.angle * Math.PI / 180;
    const endX = (v.reach + T) * Math.cos(ang), endY = (v.reach + T) * Math.sin(ang);
    const tip = roundedRect(a, v.tip + a, a / 2).translate([endX - a / 2, endY + (v.tip + a) / 2 - a * 0.1]).rotate(0);
    const hook2d = smooth(arm.add(tip).add(roundedRect(T, a * 2, 0).translate([T / 2, a])), Math.min(2, a * 0.35)).intersect(CrossSection.square([500, 500], false).translate([0.01, -1]));

    let solid = slab(plate2d, W);
    const pitch = W / v.count;
    for (let i = 0; i < v.count; i++) solid = solid.add(slab(hook2d, v.armW, pitch * (i + 0.5) - v.armW / 2));

    if (v.mount === 'screw') {
      const r = v.screwD / 2, rHead = r * 2;
      const hole = Manifold.cylinder(T + 2, r, r, 32).translate([0, 0, -1])
        .add(Manifold.cylinder(rHead - r + 0.01, r, rHead + 0.01, 32).translate([0, 0, T - (rHead - r)]))
        .rotate([0, 90, 0]);
      const zs = W >= 40 ? [W * 0.12 + 4, W * 0.88 - 4] : [W / 2];
      for (const z of zs) solid = solid.subtract(hole.translate([0, Hp - Math.max(7, rHead + 3), z]));
    }
    return [part('Ganchos', v.color, solid)];
  },
};
