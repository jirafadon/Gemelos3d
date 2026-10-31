/**
 * Chop (jarro cervecero) personalizado: cuerpo liso, barril con aros, facetado o estriado,
 * manija en D, y nombre y frase envueltos alrededor del cuerpo (en relieve de otro color o grabados).
 * También como funda para un vaso que ya tenés (el vaso va adentro y la pieza lleva la manija).
 * Se imprime parado, sin soportes (la manija es una D con el arco a 45° máximo).
 */
import { wasm, circle, roundedRect, slab, part, polygonShape } from '../engine/geom.js';
import { stackLines, mergeByColor } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

const STYLES = [
  { value: 'smooth', label: 'Liso' }, { value: 'barrel', label: 'Barril' },
  { value: 'faceted', label: 'Facetado' }, { value: 'fluted', label: 'Estriado' },
];

/** Contorno de la sección horizontal (sin la pared) para facetado y estriado. */
function section(style, r, sides) {
  if (style === 'faceted') return circle(r / Math.cos(Math.PI / sides), sides).rotate(180 / sides);
  const pts = [], n = Math.max(12, sides * 2), N = 360;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = r * (1 - 0.035 * (1 + Math.cos(a * n)) / 2);
    pts.push([Math.cos(a) * k, Math.sin(a) * k]);
  }
  return polygonShape(pts);
}

export default {
  id: 'chop',
  title: 'Chop personalizado',
  description: 'Jarro con tu nombre o frase alrededor, manija y forma de barril, facetado o estriado. También como funda para tu vaso.',
  fileName: v => `chop_${firstLine(v.line1, v.line2)}`,
  params: [
    { type: 'group', label: 'Qué hacer' },
    { key: 'kind', type: 'segment', label: 'Pieza', default: 'mug', options: [{ value: 'mug', label: 'Chop completo' }, { value: 'sleeve', label: 'Funda para un vaso' }],
      hint: v => (v.kind === 'mug'
        ? 'Para tomar: imprimilo en PETG y sellá el interior con resina apta para alimentos. El PLA solo sirve como adorno o portalápices.'
        : 'Medí tu vaso: la funda lo abraza y le pone la manija y el nombre. El vaso es el que toca la bebida.') },
    { key: 'glassD', type: 'number', label: 'Diámetro del vaso (arriba)', default: 78, min: 40, max: 130, step: 0.5, unit: 'mm', show: v => v.kind === 'sleeve' },
    { key: 'glassH', type: 'number', label: 'Alto del vaso', default: 140, min: 60, max: 220, step: 1, unit: 'mm', show: v => v.kind === 'sleeve' },
    { key: 'tol', type: 'number', label: 'Holgura con el vaso', default: 0.6, min: 0, max: 3, step: 0.1, unit: 'mm', show: v => v.kind === 'sleeve' },

    { type: 'group', label: 'Forma' },
    { key: 'style', type: 'segment', label: 'Estilo', default: 'barrel', options: STYLES },
    { key: 'sides', type: 'number', label: 'Caras o estrías', default: 10, min: 6, max: 24, step: 1, unit: '', show: v => v.style === 'faceted' || v.style === 'fluted' },
    { key: 'd', type: 'number', label: 'Diámetro', default: 86, min: 50, max: 130, step: 1, unit: 'mm', show: v => v.kind === 'mug' },
    { key: 'h', type: 'number', label: 'Alto', default: 125, min: 60, max: 200, step: 1, unit: 'mm', show: v => v.kind === 'mug',
      hint: v => { const r = v.d / 2 - v.wall, cap = Math.PI * r * r * (v.h - v.bottom) / 1000; return `Entran unos ${Math.round(cap / 10) * 10} ml.`; } },
    { key: 'wall', type: 'number', label: 'Pared', default: 2.4, min: 1.2, max: 5, step: 0.2, unit: 'mm' },
    { key: 'bottom', type: 'number', label: 'Fondo', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'handle', type: 'segment', label: 'Manija', default: 'd', options: [{ value: 'd', label: 'En D' }, { value: 'round', label: 'Redondeada' }, { value: 'none', label: 'Sin manija' }] },
    { key: 'handleT', type: 'number', label: 'Grosor de la manija', default: 11, min: 7, max: 18, step: 0.5, unit: 'mm', show: v => v.handle !== 'none' },

    { type: 'group', label: 'Texto alrededor' },
    { key: 'line1', type: 'text', label: 'Nombre', default: 'Joni' },
    { key: 'font1', type: 'font', label: 'Tipografía del nombre', default: 'kaushan' },
    { key: 'line2', type: 'text', label: 'Frase (opcional)', default: 'Salud 2026' },
    { key: 'font2', type: 'font', label: 'Tipografía de la frase', default: 'oswald', show: v => !!(v.line2 || '').trim() },
    { key: 'textH', type: 'number', label: 'Alto del texto', default: 34, min: 10, max: 90, step: 1, unit: 'mm' },
    { key: 'textY', type: 'number', label: 'Altura del texto (centro)', default: 55, min: 15, max: 85, step: 1, unit: '%' },
    { key: 'arc', type: 'number', label: 'Cuánto da la vuelta', default: 55, min: 20, max: 80, step: 1, unit: '%', hint: 'Del contorno, del lado opuesto a la manija.' },
    { key: 'relief', type: 'segment', label: 'Cómo va', default: 'raised', options: [{ value: 'raised', label: 'En relieve' }, { value: 'engraved', label: 'Grabado' }] },
    { key: 'depth', type: 'number', label: 'Relieve', default: 1.2, min: 0.6, max: 3, step: 0.1, unit: 'mm' },

    { type: 'group', label: 'Colores' },
    { key: 'cBody', type: 'color', label: 'Chop', default: '#1E1E1E' },
    { key: 'cText', type: 'color', label: 'Texto', default: '#C9A227', show: v => v.relief === 'raised' },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const sleeve = v.kind === 'sleeve';
    const wall = v.wall, bottom = v.bottom;
    // Medidas: en funda, el hueco es el vaso
    const rIn = sleeve ? v.glassD / 2 + v.tol : v.d / 2 - wall;
    const R = rIn + wall;
    const H = sleeve ? Math.round(v.glassH * 0.72) : v.h;
    const barrel = v.style === 'barrel';
    // Radio exterior según la altura (el barril se abomba al medio)
    const rAt = y => (barrel ? R * (1 + 0.07 * Math.sin(Math.PI * Math.min(1, Math.max(0, y / H)))) : R);

    let body;
    if (v.style === 'smooth' || barrel) {
      const pts = [];
      const N = 40;
      for (let i = 0; i <= N; i++) { const y = (H * i) / N; pts.push([rAt(y), y]); }
      // Borde de arriba redondeado y vuelta por adentro
      // Por adentro sigue la misma curva, así la pared tiene el mismo espesor
      pts.push([rAt(H) - wall * 0.8, H]);
      for (let i = N; i >= 0; i--) { const y = bottom + ((H - 0.6 - bottom) * i) / N; pts.push([rAt(y) - wall, y]); }
      pts.push([0, bottom]);
      pts.push([0, 0]);
      body = Manifold.revolve(polygonShape(pts), 128);
      if (barrel) {
        // Aros del barril
        for (const f of [0.12, 0.88]) {
          const y = H * f, r0 = rAt(y);
          body = body.add(Manifold.revolve(roundedRect(2.4, 7, 1.1).translate([r0 + 0.2, y]), 128));
        }
      }
    } else {
      const outer = section(v.style, R, v.sides);
      body = outer.extrude(H).subtract(outer.offset(-wall, 'Round', 2, 32).extrude(H, 0, 0, [1, 1]).translate([0, 0, bottom]));
    }

    // Manija (del lado +X), en el plano XZ
    if (v.handle !== 'none') {
      const hw = Math.max(26, R * 0.62), hh = H * 0.68, t = v.handleT;
      const y0 = H * 0.16;
      let ring = v.handle === 'd'
        ? roundedRect(hw * 2, hh, Math.min(hw * 0.9, hh * 0.45)).subtract(roundedRect((hw - t) * 2, hh - 2 * t, Math.min((hw - t) * 0.8, (hh - 2 * t) * 0.42)))
        : roundedRect(hw * 2, hh, hh * 0.5).subtract(roundedRect((hw - t) * 2, hh - 2 * t, (hh - 2 * t) * 0.5));
      ring = ring.intersect(CrossSection.square([hw + 2, hh + 2], false).translate([0, -hh / 2 - 1]));
      const h3 = ring.extrude(t * 0.85, 0, 0, [1, 1]).translate([0, 0, -t * 0.425]).rotate([90, 0, 0]);
      const hb = h3.boundingBox();
      body = body.add(h3.translate([rAt(y0 + hh / 2) - wall * 0.6 - hb.min[0], 0, y0 + hh / 2]));
      // Que no se meta adentro
      body = body.subtract(Manifold.cylinder(H, rIn - 0.01, rIn - 0.01, 96).translate([0, 0, bottom]));
    }

    // Texto envuelto: se arma plano (x = largo del arco, y = alto) y se dobla sobre el cuerpo
    const parts = [];
    const lines = [];
    const [f1, f2] = await Promise.all([ctx.font(v.font1), ctx.font(v.font2)]);
    if ((v.line1 || '').trim()) lines.push({ font: f1, text: v.line1, height: 10 });
    if ((v.line2 || '').trim()) lines.push({ font: f2, text: v.line2, height: 6 });
    if (lines.length) {
      const rFace = v.style === 'faceted' ? R : v.style === 'fluted' ? R * 0.965 : R;
      const maxArc = 2 * Math.PI * rFace * (v.arc / 100);
      const flat = fitInto(stackLines(lines, 2), maxArc, Math.min(v.textH, H * 0.8));
      const yc = H * (v.textY / 100);
      const d = v.depth, embed = 0.6;
      const raised = v.relief === 'raised';
      const z0 = raised ? -embed : -d, z1 = raised ? d : 0.3;
      let txt = flat.extrude(z1 - z0).translate([0, 0, z0]).refineToLength(1.2);
      txt = txt.warp(p => {
        const x = p[0], y = p[1] + yc, z = p[2];
        const r = (barrel ? rAt(y) : rFace) + z;
        const a = Math.PI + x / rFace; // frente: del lado opuesto a la manija
        p[0] = Math.cos(a) * r; p[1] = Math.sin(a) * r; p[2] = y;
      });
      if (raised) {
        const t = txt.subtract(body);
        if (!t.isEmpty()) parts.push(part('Texto', v.cText, t));
      } else body = body.subtract(txt);
    }
    parts.unshift(part('Chop', v.cBody, body));
    // Girado para que en la vista 3D el texto quede de frente (la impresión no cambia)
    return mergeByColor(parts.map(p => ({ ...p, solid: p.solid.rotate([0, 0, 54]) })));
  },
};
