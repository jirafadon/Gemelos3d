/**
 * Roscas: tornillo y tuerca a medida, o frasco con tapa a rosca.
 * La rosca se arma girando un contorno "dentado" a medida que sube (una vuelta por paso),
 * así queda una hélice real. El perfil es trapecial, pensado para imprimir sin soportes.
 */
import { wasm, circle, slab, part, polygonShape } from '../engine/geom.js';

/** Contorno de una rosca: el radio sube y baja con el ángulo (un diente por vuelta). */
export function threadSection(rMajor, depth, segs = 96) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const t = i / segs, a = t * Math.PI * 2;
    // Trapecio: 30 % arriba (cresta), 20 % bajando, 30 % abajo (raíz), 20 % subiendo
    const f = t < 0.3 ? 1 : t < 0.5 ? 1 - (t - 0.3) / 0.2 : t < 0.8 ? 0 : (t - 0.8) / 0.2;
    const r = rMajor - depth + depth * f;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return polygonShape(pts);
}
/** Cilindro roscado de largo L (gira 360° por cada paso). */
export function threadRod(rMajor, depth, pitch, L) {
  const turns = L / pitch;
  return threadSection(rMajor, depth).extrude(L, Math.max(8, Math.round(turns * 32)), -360 * turns);
}

export default {
  id: 'roscas',
  title: 'Roscas: tornillo y tuerca o frasco',
  description: 'Tornillo y tuerca a medida, o frasco con tapa a rosca.',
  fileName: v => (v.mode === 'jar' ? `frasco_${v.jarD}x${v.jarH}` : `tornillo_${v.d}x${v.len}`),
  params: [
    { type: 'group', label: 'Qué hacer' },
    { key: 'mode', type: 'segment', label: 'Pieza', default: 'bolt', options: [{ value: 'bolt', label: 'Tornillo y tuerca' }, { value: 'jar', label: 'Frasco con tapa' }] },

    { type: 'group', label: 'Tornillo', show: v => v.mode === 'bolt' },
    { key: 'd', type: 'number', label: 'Diámetro', default: 12, min: 6, max: 50, step: 0.5, unit: 'mm', show: v => v.mode === 'bolt', hint: 'Desde 8 mm la rosca sale bien con boquilla de 0,4.' },
    { key: 'pitch', type: 'number', label: 'Paso', default: 2, min: 1, max: 6, step: 0.25, unit: 'mm', show: v => v.mode === 'bolt' },
    { key: 'len', type: 'number', label: 'Largo de la rosca', default: 30, min: 5, max: 150, step: 1, unit: 'mm', show: v => v.mode === 'bolt' },
    { key: 'head', type: 'segment', label: 'Cabeza', default: 'hex', options: [{ value: 'hex', label: 'Hexagonal' }, { value: 'knob', label: 'Perilla' }, { value: 'none', label: 'Sin cabeza' }], show: v => v.mode === 'bolt' },
    { key: 'nut', type: 'toggle', label: 'Con tuerca', default: true, show: v => v.mode === 'bolt' },

    { type: 'group', label: 'Frasco', show: v => v.mode === 'jar' },
    { key: 'jarD', type: 'number', label: 'Diámetro', default: 60, min: 25, max: 200, step: 1, unit: 'mm', show: v => v.mode === 'jar' },
    { key: 'jarH', type: 'number', label: 'Alto', default: 70, min: 20, max: 250, step: 1, unit: 'mm', show: v => v.mode === 'jar' },
    { key: 'jarWall', type: 'number', label: 'Pared', default: 2, min: 1.2, max: 5, step: 0.2, unit: 'mm', show: v => v.mode === 'jar' },

    { type: 'group', label: 'Ajuste' },
    { key: 'tol', type: 'number', label: 'Holgura de la rosca', default: 0.35, min: 0.1, max: 1, step: 0.05, unit: 'mm', hint: 'Si no entra, subila; si queda floja, bajala.' },
    { key: 'color', type: 'color', label: 'Color', default: '#2A9D8F' },
    { key: 'color2', type: 'color', label: 'Color de la tuerca / tapa', default: '#F4A261' },
  ],
  build(v) {
    const { Manifold } = wasm();
    if (v.mode === 'jar') {
      // Frasco: cuerpo + cuello roscado arriba. Tapa: con rosca interior y estrías
      const R = v.jarD / 2, t = v.jarWall, pitch = 4, depth = 1.6, neckH = 12;
      const neckR = R - t - 1; // radio exterior de la rosca del cuello
      const bore = neckR - depth - t; // boca del frasco
      const bodyH = v.jarH - neckH;
      // Por fuera: cuerpo + hombro + cuello roscado
      let body = Manifold.cylinder(bodyH, R, R, 128)
        .add(Manifold.cylinder(2, R, neckR - depth, 128).translate([0, 0, bodyH - 0.01]))
        .add(threadRod(neckR, depth, pitch, neckH).translate([0, 0, bodyH]));
      // Por dentro: cavidad + techo a 45° + boca (todo imprimible sin soportes)
      const roof = (R - t) - bore;
      body = body.subtract(Manifold.cylinder(bodyH - 2 - roof + 0.01, R - t, R - t, 128).translate([0, 0, 2]))
        .subtract(Manifold.cylinder(roof, R - t, bore, 128).translate([0, 0, bodyH - roof]))
        .subtract(Manifold.cylinder(neckH + 2, bore, bore, 128).translate([0, 0, bodyH - 0.5]));
      const capH = neckH + 2, capR = neckR + v.tol + 2.4;
      let cap = Manifold.cylinder(capH, capR, capR, 128).subtract(threadRod(neckR + v.tol, depth, pitch, capH).translate([0, 0, 2]));
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; cap = cap.add(Manifold.cylinder(capH, 0.9, 0.9, 12).translate([capR * Math.cos(a), capR * Math.sin(a), 0])); }
      return [part('Frasco', v.color, body), part('Tapa', v.color2, cap.translate([R + capR + 12, 0, 0]))];
    }
    const r = v.d / 2, depth = Math.min(v.pitch * 0.55, r * 0.3);
    // Tornillo: cabeza abajo (sobre la cama) y rosca hacia arriba, con la punta biselada
    const headH = v.head === 'none' ? 0 : Math.max(5, v.d * 0.6);
    const af = v.d * 1.6; // entre caras
    let bolt = threadRod(r, depth, v.pitch, v.len).translate([0, 0, headH - 0.01]);
    // Bisel de la punta (cono a 45°) para que entre fácil en la tuerca
    const top = headH + v.len, bev = depth + 0.5;
    bolt = bolt.subtract(Manifold.cylinder(bev + 0.5, r + 2, r + 2, 64).translate([0, 0, top - bev]).subtract(Manifold.cylinder(bev, r, r - bev, 64).translate([0, 0, top - bev])));
    if (v.head === 'hex') bolt = bolt.add(Manifold.cylinder(headH, af / Math.sqrt(3), af / Math.sqrt(3), 6));
    if (v.head === 'knob') {
      let knob = Manifold.cylinder(headH, r * 2, r * 2, 96);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; knob = knob.subtract(Manifold.cylinder(headH + 1, r * 0.35, r * 0.35, 24).translate([r * 2.1 * Math.cos(a), r * 2.1 * Math.sin(a), -0.5])); }
      bolt = bolt.add(knob);
    }
    const parts = [part('Tornillo', v.color, bolt)];
    if (v.nut) {
      const nh = Math.max(v.d * 0.8, v.pitch * 3);
      const hole = threadRod(r + v.tol, depth, v.pitch, nh + 2 * v.pitch).translate([0, 0, -v.pitch]);
      let nut = Manifold.cylinder(nh, af / Math.sqrt(3), af / Math.sqrt(3), 6).subtract(hole)
        .subtract(Manifold.cylinder(depth + 0.6, r - depth + v.tol + depth + 0.6, r - depth + v.tol, 64).translate([0, 0, -0.01])) // avellanado de entrada
        .subtract(Manifold.cylinder(depth + 0.6, r - depth + v.tol, r - depth + v.tol + depth + 0.6, 64).translate([0, 0, nh - depth - 0.6 + 0.01]));
      parts.push(part('Tuerca', v.color2, nut.translate([Math.max(af, r * 4) + 10, 0, 0])));
    }
    return parts;
  },
};
