/**
 * Soportes de celular y tablet, en varios estilos:
 * - Atril clásico, Triángulo (con trama calada y borde de color), Z (con línea de color),
 *   Onda compacta (estriada), Corazón, Escritorio (respaldo curvo y asiento), Placa Zen (placa con diseño + base)
 *   y Amplificador de sonido (el parlante del celular sale por el frente).
 * Todos con el grosor del equipo, el ángulo, paso para el cable y colores.
 * Los de perfil se imprimen acostados de costado (sin soportes); la placa y la base, planas;
 * el amplificador en dos mitades que se pegan.
 */
import { wasm, circle, roundedRect, slab, part, polygonShape } from '../engine/geom.js';
import { stackLines, mergeByColor } from '../engine/layers.js';
import { smooth, fitInto, patternShape } from '../engine/shapes.js';
import { imageParams, silhouette } from './_common.js';

const STYLES = [
  { value: 'triangle', label: 'Triángulo' }, { value: 'z', label: 'Z' }, { value: 'wave', label: 'Onda compacta' },
  { value: 'heart', label: 'Corazón' }, { value: 'desk', label: 'Escritorio' }, { value: 'classic', label: 'Atril clásico' },
  { value: 'zen', label: 'Placa Zen' }, { value: 'speaker', label: 'Amplificador de sonido' },
];
const PATTERNS = [
  { value: 'none', label: 'Liso' }, { value: 'voronoi', label: 'Voronoi' }, { value: 'honey', label: 'Panal' },
  { value: 'diamonds', label: 'Rombos' }, { value: 'dots', label: 'Puntos' }, { value: 'lines', label: 'Líneas' },
  { value: 'slots', label: 'Ranuras' }, { value: 'leaf', label: 'Hoja' }, { value: 'spiral', label: 'Espiral' },
  { value: 'stones', label: 'Piedras zen' }, { value: 'text', label: 'Nombre' }, { value: 'image', label: 'Mi imagen o logo' }, { value: 'logoText', label: 'Logo + nombre' },
];
const profiled = v => !['zen', 'speaker'].includes(v.style);
const hasPlate = v => ['triangle', 'desk', 'classic', 'zen'].includes(v.style);

// ---------- Trazos 2D (perfiles hechos con "cinta" de grosor t) ----------
const cap = (a, b, t) => wasm().CrossSection.hull([circle(t / 2, 28).translate(a), circle(t / 2, 28).translate(b)]);
const stroke = (pts, t) => wasm().CrossSection.union(pts.slice(1).map((p, i) => cap(pts[i], p, t)));
const arc = (cx, cy, r, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const dir = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
const add = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];
/** Redondea el quiebre en B (entre A y C) con una curva que arranca a distancia r de B. */
function roundCorner(A, B, C, r, n = 12) {
  const la = Math.hypot(A[0] - B[0], A[1] - B[1]), lc = Math.hypot(C[0] - B[0], C[1] - B[1]);
  const k = Math.min(r, la * 0.45, lc * 0.45);
  const P = add(B, [(A[0] - B[0]) / la, (A[1] - B[1]) / la], k), Q = add(B, [(C[0] - B[0]) / lc, (C[1] - B[1]) / lc], k);
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n, a = (1 - u) ** 2, b = 2 * u * (1 - u), c = u * u; return [a * P[0] + b * B[0] + c * Q[0], a * P[1] + b * B[1] + c * Q[1]]; });
}

/**
 * Perfil de cada estilo (x = hacia atrás, y = alto; el frente está en x ≈ 0).
 * @returns { profile, plate: { p0, ang, len } | null, line: [pts] }
 */
function profileOf(v) {
  const t = v.thick, a = v.angle, L = v.device === 'tablet' ? 140 : 92;
  const y0 = t / 2, lipH = v.lipH;
  const s = Math.sin(a * Math.PI / 180);
  // Dónde arranca el respaldo para que entre el equipo entre el labio y el respaldo
  const startX = t / 2 + v.phoneT / s + t / (2 * s) + 0.6;
  if (v.style === 'triangle' || v.style === 'wave') {
    const P0 = [startX, y0], P1 = add(P0, dir(a), L);
    const legA = v.style === 'wave' ? 62 : 58;
    const F = [P1[0] + (P1[1] - y0) / Math.tan(legA * Math.PI / 180), y0];
    const lip = [[0, lipH], [0, y0]];
    let profile;
    if (v.style === 'triangle') profile = smooth(stroke([[0, lipH], [0, y0], F], t).add(stroke([P0, P1, F], t)), Math.min(2.4, t * 0.4));
    // Onda: sin base, cumbre bien redondeada y gancho adelante
    else profile = smooth(stroke([...lip, P0, ...roundCorner(P0, P1, F, Math.min(22, L * 0.24)), F], t), Math.min(2.4, t * 0.4));
    return { profile, plate: v.style === 'triangle' ? { p0: P0, ang: a, len: L } : null, line: [[0, lipH - 1], [0, y0], P0, P1, F], lip: { x: 0, y: y0 } };
  }
  if (v.style === 'z') {
    // Base con labio adelante, vuelta atrás, capa del medio hacia adelante y brazo que sube hacia atrás
    const R = 6, y2 = y0 + 2 * R;
    const m = t / 2 + v.phoneT / s + y2 / Math.tan(a * Math.PI / 180) + t / s;
    const P1 = add([m, y2], dir(a), L * 0.92);
    const D = Math.max(P1[0] * 0.92, m + 30);
    const pts = [[0, lipH], [0, y0], [D, y0], ...arc(D, y0 + R, R, -90, 90, 10), [m, y2], P1];
    return { profile: smooth(stroke(pts, t), 0.8), plate: null, line: pts, lip: { x: 0, y: y0 } };
  }
  if (v.style === 'heart') {
    // Corazón de cinta: la punta adelante abajo, con un gancho que sostiene el equipo
    const S = L * 0.95;
    const raw = [];
    for (let i = 0; i <= 120; i++) {
      const u = (i / 120) * Math.PI * 2;
      raw.push([16 * Math.sin(u) ** 3, 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)]);
    }
    const k = S / 30, rot = -28 * Math.PI / 180;
    let pts = raw.map(([x, y]) => [x * k, y * k]).map(([x, y]) => [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)]);
    const minX = Math.min(...pts.map(p => p[0])), minY = Math.min(...pts.map(p => p[1]));
    pts = pts.map(([x, y]) => [x - minX + v.phoneT + t * 1.5, y - minY]);
    // La punta: el punto más bajo de la curva
    const tip = pts.reduce((b, p) => (p[1] < b[1] ? p : b));
    const lipX = tip[0] - v.phoneT - t;
    const hp = polygonShape(pts);
    let profile = hp.offset(t / 2, 'Round', 2, 24).subtract(hp.offset(-t / 2, 'Round', 2, 24)).add(stroke([tip, [lipX, tip[1]], [lipX, tip[1] + lipH]], t));
    profile = profile.translate([0, t / 2]);
    // Apoyo plano en la cama
    const b = profile.bounds();
    profile = profile.intersect(wasm().CrossSection.square([b.max[0] - b.min[0] + 20, b.max[1] + 10], false).translate([b.min[0] - 10, 1.2])).translate([0, -1.2]);
    return { profile: smooth(profile, 0.8), plate: null, line: pts.map(([x, y]) => [x, y + t / 2 - 1.2]), lip: { x: lipX, y: tip[1] + t / 2 - 1.2 } };
  }
  if (v.style === 'desk') {
    // Asiento con labio adelante, respaldo que sube hacia atrás, curva arriba y pata atrás hasta la base
    const hs = 18, Lp = L * 0.85;
    const lipX = 0, Sx = lipX + v.phoneT / s + t * 1.2;
    const S = [Sx, hs], A = add(S, dir(a), Lp), B = [A[0] + 8, y0];
    const baseFront = Math.min(lipX - 6, 0);
    const pts = [[lipX, hs + lipH], [lipX, hs], S, ...roundCorner(S, A, B, 18), B, [baseFront, y0]];
    return { profile: smooth(stroke(pts, t), Math.min(2.4, t * 0.4)), plate: { p0: S, ang: a, len: Lp * 0.9 }, line: pts, lip: { x: lipX, y: hs } };
  }
  // Atril clásico (el de antes): base, labio, respaldo y un puntal
  const P0 = [startX, y0], P1 = add(P0, dir(a), L);
  const B = Math.max(P1[0] + 10, startX + 40);
  const strutA = add(P0, dir(a), L * 0.6);
  const profile = stroke([[0, lipH], [0, y0], [B, y0]], t).add(stroke([P0, P1], t)).add(stroke([strutA, [B - t / 2, y0]], t));
  return { profile: smooth(profile, 1.2), plate: { p0: P0, ang: a, len: L }, line: [[0, lipH], [0, y0], [B, y0]], lip: { x: 0, y: y0 } };
}

// ---------- Diseños para la placa / respaldo ----------
async function motif(v, ctx, w0, h0) {
  const { CrossSection } = wasm();
  const sc = (v.mScale ?? 100) / 100, w = w0 * Math.min(1, sc) || w0, h = h0 * Math.min(1, sc) || h0;
  const zone = roundedRect(w, h, Math.min(w, h) * 0.12);
  const k = v.pSize;
  if (['voronoi', 'honey', 'diamonds', 'dots', 'lines'].includes(v.pattern)) return patternShape(v.pattern, zone, k, v.pattern === 'voronoi' ? Math.max(1.4, k * 0.25) : undefined);
  if (v.pattern === 'slots') {
    const n = Math.max(2, Math.round(h / (k * 1.4))), parts = [];
    for (let i = 0; i < n; i++) parts.push(roundedRect(w * 0.8, Math.max(1.6, k * 0.32), 1).translate([0, -h / 2 + (h * (i + 0.5)) / n]));
    return CrossSection.union(parts);
  }
  if (v.pattern === 'leaf') {
    // Hoja: tallo y hojitas en diagonal, que se achican hacia la punta
    const parts = [roundedRect(1.8, h * 0.86, 0.9)];
    const n = Math.max(5, Math.round(h / (k * 0.9)));
    for (let i = 1; i < n; i++) {
      const y = -h * 0.4 + (h * 0.8 * i) / n, len = w * 0.42 * (1 - i / (n + 1)) + 3;
      for (const sgn of [-1, 1]) parts.push(roundedRect(len, 1.7, 0.85).translate([sgn * len / 2, 0]).rotate(sgn * 35).translate([0, y]));
    }
    return CrossSection.union(parts).intersect(zone);
  }
  if (v.pattern === 'spiral') {
    const pts = [], turns = 3.2, R = Math.min(w, h) * 0.44;
    for (let i = 0; i <= 260; i++) { const tt = i / 260, ang = tt * turns * Math.PI * 2, r = R * tt; pts.push([Math.cos(ang) * r, Math.sin(ang) * r]); }
    return stroke(pts, Math.max(2, k * 0.35)).add(circle(Math.max(2, k * 0.3), 24).translate([0, h * 0.36])).add(circle(Math.max(1.4, k * 0.22), 24).translate([0, h * 0.43])).intersect(zone);
  }
  if (v.pattern === 'stones') {
    const st = [[0.78, 0.13, -0.3], [0.6, 0.11, -0.13], [0.44, 0.1, 0.02], [0.18, 0.13, 0.22]];
    return CrossSection.union(st.map(([sw, sh, y]) => roundedRect(w * sw, h * sh, h * sh / 2).translate([0, h * y]))).intersect(zone);
  }
  if (v.pattern === 'text') {
    const font = await ctx.font(v.font);
    return fitInto(stackLines(String(v.text || ' ').split('\n').map(tx => ({ font, text: tx, height: 10 })), 2), w * 0.88, h * 0.8);
  }
  if (v.pattern === 'image') return fitInto(await silhouette(v, ctx, 100), w * 0.85, h * 0.8);
  if (v.pattern === 'logoText') {
    // Logo arriba y nombre abajo, centrados
    const logo = fitInto(await silhouette(v, ctx, 100), w * 0.8, h * 0.58);
    const font = await ctx.font(v.font);
    const name = (v.text || '').trim() ? fitInto(stackLines(String(v.text).split('\n').map(tx => ({ font, text: tx, height: 10 })), 2), w * 0.88, h * 0.26) : null;
    if (!name) return logo;
    const lb = logo.bounds(), nb = name.bounds(), gap = Math.max(3, h * 0.05);
    const total = (lb.max[1] - lb.min[1]) + gap + (nb.max[1] - nb.min[1]);
    const top = total / 2;
    return logo.translate([-(lb.min[0] + lb.max[0]) / 2, top - lb.max[1]])
      .add(name.translate([-(nb.min[0] + nb.max[0]) / 2, top - (lb.max[1] - lb.min[1]) - gap - nb.max[1]]));
  }
  return null;
}

export default {
  id: 'soporte-celular',
  title: 'Soportes de celular y tablet',
  description: 'Triángulo, Z, onda, corazón, escritorio, placa Zen o amplificador de sonido, con trama, nombre y colores.',
  fileName: v => `soporte_${v.style}${v.pattern !== 'none' && v.pattern ? '_' + v.pattern : ''}`,
  params: [
    { type: 'group', label: 'Estilo' },
    { key: 'style', type: 'select', label: 'Modelo', default: 'triangle', options: STYLES,
      hint: v => ({
        triangle: 'Base, respaldo y pata en triángulo. Se imprime acostado, de costado.',
        z: 'Una cinta en Z con labio adelante. Queda linda con la línea de otro color.',
        wave: 'Compacto, sin base, con gancho adelante y estrías.',
        heart: 'Cinta en forma de corazón: el equipo se apoya adelante.',
        desk: 'Respaldo curvo, asiento con labio y ranuras.',
        classic: 'El atril de siempre, con puntal.',
        zen: 'Placa con diseño y base aparte con ranura inclinada. Salen las dos piezas.',
        speaker: 'El celular va parado en la ranura y el sonido sale por el frente. Sale en dos mitades para pegar.',
      }[v.style]) },
    { key: 'device', type: 'segment', label: 'Para', default: 'phone', options: [{ value: 'phone', label: 'Celular' }, { value: 'tablet', label: 'Tablet' }], show: v => v.style !== 'speaker' },
    { key: 'phoneT', type: 'number', label: 'Grosor del equipo (con funda)', default: 12, min: 6, max: 25, step: 0.5, unit: 'mm' },
    { key: 'phoneW', type: 'number', label: 'Ancho del celular (con funda)', default: 78, min: 60, max: 95, step: 0.5, unit: 'mm', show: v => v.style === 'speaker' },
    { key: 'angle', type: 'number', label: 'Inclinación', default: 65, min: 50, max: 82, step: 1, unit: '°', show: v => !['heart', 'speaker'].includes(v.style) },
    { key: 'width', type: 'number', label: 'Ancho del soporte', default: 70, min: 30, max: 200, step: 1, unit: 'mm', show: v => v.style !== 'speaker' },
    { key: 'thick', type: 'number', label: 'Grosor de la cinta / paredes', default: 5, min: 3, max: 10, step: 0.5, unit: 'mm' },
    { key: 'lipH', type: 'number', label: 'Alto del labio delantero', default: 9, min: 4, max: 25, step: 0.5, unit: 'mm', show: v => !['speaker'].includes(v.style) },
    { key: 'cable', type: 'toggle', label: 'Paso para el cable', default: true, show: v => profiled(v) && v.style !== 'heart' },
    { key: 'cableW', type: 'number', label: 'Ancho del paso', default: 14, min: 8, max: 30, step: 1, unit: 'mm', show: v => profiled(v) && v.cable },

    { type: 'group', label: 'Diseño' },
    { key: 'pattern', type: 'select', label: 'Trama o dibujo en el respaldo', default: 'voronoi', options: PATTERNS, show: hasPlate },
    { key: 'pSize', type: 'number', label: 'Tamaño de la trama', default: 12, min: 5, max: 30, step: 0.5, unit: 'mm', show: v => hasPlate(v) && !['none', 'text', 'image', 'stones'].includes(v.pattern) },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Joni', multiline: true, show: v => hasPlate(v) && ['text', 'logoText'].includes(v.pattern) },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => hasPlate(v) && ['text', 'logoText'].includes(v.pattern) },
    ...imageParams({ label: 'Imagen o logo', showIf: v => hasPlate(v) && ['image', 'logoText'].includes(v.pattern) }),
    { key: 'mScale', type: 'number', label: 'Tamaño del diseño', default: 100, min: 40, max: 100, step: 5, unit: '%', show: v => hasPlate(v) && ['text', 'image', 'logoText'].includes(v.pattern) },
    { key: 'pMode', type: 'segment', label: 'Cómo va', default: 'cut', options: [{ value: 'cut', label: 'Calado' }, { value: 'inlay', label: 'En otro color' }], show: v => hasPlate(v) && v.pattern !== 'none' },
    { key: 'ribs', type: 'toggle', label: 'Estrías', default: true, show: v => ['wave', 'heart'].includes(v.style) },
    { key: 'accent', type: 'segment', label: 'Detalle de color', default: 'edge', options: [{ value: 'none', label: 'Ninguno' }, { value: 'edge', label: 'Borde' }, { value: 'line', label: 'Línea' }], show: profiled },

    { type: 'group', label: 'Colores' },
    { key: 'color', type: 'color', label: 'Soporte', default: '#1E1E1E' },
    { key: 'color2', type: 'color', label: 'Detalles', default: '#FCBF49' },
  ],

  async build(v, ctx) {
    if (v.style === 'zen') return zen(v, ctx);
    if (v.style === 'speaker') return speaker(v);
    const { Manifold, CrossSection } = wasm();
    const W = v.width, t = v.thick;
    const { profile, plate, line, lip } = profileOf(v);
    let body = slab(profile, W);
    const accents = [];

    // Trama o dibujo calado / de color en el respaldo.
    // El dibujo se arma "de frente" (ancho del soporte × largo del respaldo) y se apoya sobre el respaldo.
    if (plate && v.pattern !== 'none') {
      const u0 = plate.len * 0.16, u1 = plate.len * 0.9, w0 = 7, w1 = W - 7;
      if (u1 - u0 > 15 && w1 - w0 > 15) {
        const m = await motif(v, ctx, w1 - w0, u1 - u0);
        if (m && !m.isEmpty()) {
          // (u = a lo largo del respaldo, w = ancho, n = espesor) → mundo. Se lee derecho mirando el respaldo desde atrás (el frente lo tapa el equipo)
          const place = (n0, n1) => m.rotate(-90).translate([(u0 + u1) / 2, (w0 + w1) / 2]).extrude(n1 - n0).translate([0, 0, n0])
            .rotate([90, 0, 0]).rotate([0, 0, plate.ang]).translate([plate.p0[0], plate.p0[1], 0]);
          if (v.pMode === 'cut') body = body.subtract(place(-t, t));
          else accents.push(place(t / 2 - 1, t / 2 + 0.5));
        }
      }
    }
    // Paso para el cable (en el medio, por el labio y la base)
    if (v.cable && v.style !== 'heart') {
      const notch = CrossSection.square([Math.max(8, v.phoneT + t * 1.6), v.lipH + t + 4], false).translate([lip.x - t, lip.y - t / 2 - 2]);
      body = body.subtract(slab(notch, v.cableW, W / 2 - v.cableW / 2));
    }
    // Estrías a lo largo de la cinta
    if (v.ribs && ['wave', 'heart'].includes(v.style)) {
      const skin = profile.subtract(profile.offset(-0.7, 'Round', 2, 16));
      const pitch = 3.2;
      const cuts = [];
      for (let z = pitch; z < W - pitch / 2; z += pitch) cuts.push(slab(skin, 1.2, z - 0.6));
      body = body.subtract(Manifold.union(cuts));
    }
    // Detalle de color en los dos costados
    if (v.accent === 'edge') {
      const ring = profile.subtract(profile.offset(-Math.min(1.6, t * 0.32), 'Round', 2, 24));
      for (const z of [-0.5, W - 0.8]) accents.push(slab(ring, 1.3, z));
    } else if (v.accent === 'line') {
      const stripe = stroke(line, Math.max(1.2, t * 0.3)).intersect(profile.offset(-0.9, 'Round', 2, 16));
      for (const z of [-0.5, W - 0.8]) accents.push(slab(stripe, 1.3, z));
    }
    // Las piezas de color salen del mismo soporte: lo que se resta de uno es exactamente lo que queda en el otro
    let acc = null;
    if (accents.length) { const cutter = Manifold.union(accents); acc = body.intersect(cutter); body = body.subtract(cutter); }
    const parts = [part('Soporte', v.color, body)];
    if (acc && !acc.isEmpty()) parts.push(part('Detalles', v.color2, acc));
    // Acostado de costado: ya está (perfil en XY, ancho en Z)
    return mergeByColor(parts);
  },
};

// ---------- Placa Zen: placa con diseño + base con ranura ----------
async function zen(v, ctx) {
  const { Manifold, CrossSection } = wasm();
  const W = v.width, Hh = v.device === 'tablet' ? 170 : 130, pt = Math.max(3.2, v.thick * 0.8);
  const r = Math.min(W, Hh) * 0.14;
  let plate2 = roundedRect(W, Hh, r);
  const ledgeY = -Hh / 2 + 22;
  const parts = [];
  let plate = slab(plate2, pt);
  const m = v.pattern !== 'none' ? await motif(v, ctx, W * 0.78, (Hh / 2 - 12) - (ledgeY + 10)) : null;
  if (m && !m.isEmpty()) {
    const mm = m.translate([0, ((Hh / 2 - 12) + (ledgeY + 10)) / 2]);
    if (v.pMode === 'cut') plate = plate.subtract(slab(mm, pt + 2, -1));
    else { const inl = slab(mm, 1, pt - 1); plate = plate.subtract(inl); parts.push(part('Diseño', v.color2, inl)); }
  }
  // Repisa donde apoya el equipo (va arriba de la placa, en otro color)
  const ledge = slab(roundedRect(W - 8, 6, 2), Math.max(6, v.phoneT * 0.7 + 3), pt).translate([0, ledgeY, 0]);
  parts.push(part('Repisa', v.color2, ledge));
  parts.unshift(part('Placa', v.color, plate));
  // Base: bloque con ranura inclinada para la placa
  const bd = 46, bh = 12, tol = 0.35;
  let base = slab(roundedRect(W, bd, 6), bh);
  const slot = Manifold.cube([W + 2, pt + 2 * tol, bh * 3], true).rotate([-(90 - v.angle), 0, 0]).translate([0, -bd * 0.12, bh * 1.5 + 2.5]);
  base = base.subtract(slot);
  void CrossSection;
  parts.push(part('Base', v.color, base.translate([W + 12, 0, 0])));
  return mergeByColor(parts);
}

// ---------- Amplificador: ranura arriba, canal curvo y salida adelante ----------
function speaker(v) {
  const { Manifold, CrossSection } = wasm();
  const t = v.thick, ch = 22, W = v.phoneW + 2 * t + 2, slotG = v.phoneT + 1.6;
  const R = ch / 2 + 10, H = 64, Lf = 92;
  const yb = ch / 2 + t;
  // Perfil en XY (x = hacia atrás, y = alto), ancho en Z. Baja por atrás, dobla y sale adelante (−x)
  const center = [[0, H], [0, yb + R], ...arc(-R, yb + R, R, 0, -90, 16), [-Lf, yb]];
  const outer = stroke(center, ch + 2 * t).add(CrossSection.square([R + ch / 2 + t, yb + R], false).translate([-R, 0]));
  const inner = stroke(center.slice(1), ch).add(stroke([[-Lf, yb], [-Lf - 20, yb]], ch));
  let body = slab(outer, W).subtract(slab(inner, W - 2 * t, t));
  // Ranura para el celular y dos topes en las puntas (el medio queda libre para el sonido)
  const stopY = H - 28;
  body = body.subtract(Manifold.cube([slotG, 60, W - 2 * t], false).translate([-slotG / 2, stopY, t]));
  for (const z of [t, W - t - 9]) body = body.add(Manifold.cube([ch + 2, 3, 9], false).translate([-(ch + 2) / 2, stopY - 3, z]).intersect(slab(outer, W)));
  // Rejilla del frente (otra pieza, entra a presión)
  const gw = W - 2 * t - 0.4, gh = ch - 0.4;
  const holes = patternShape('honey', roundedRect(gw - 4, gh - 4, 2), 4.2);
  const grille = slab(holes ? roundedRect(gw, gh, 2).subtract(holes) : roundedRect(gw, gh, 2), 2);
  // Dos mitades: se corta por el medio del ancho; cada una apoya su pared de afuera y queda abierta arriba
  const [hi, lo] = body.splitByPlane([0, 0, 1], W / 2);
  const hb = hi.mirror([0, 0, 1]).translate([0, 0, W]);
  const pb = outer.bounds(), gap = pb.max[1] - pb.min[1] + 10;
  return mergeByColor([
    part('Amplificador', v.color, lo.add(hb.translate([0, gap, 0]))),
    part('Rejilla', v.color2, grille.translate([-Lf / 2, gap * 2 + gh / 2, 0])),
  ]);
}
