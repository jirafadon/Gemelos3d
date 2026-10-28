/**
 * Geometría base del motor.
 * Todo trabaja en milímetros. Las formas 2D son CrossSection de manifold-3d
 * y los sólidos son Manifold: siempre cerrados y listos para imprimir.
 *
 * Este módulo no depende del navegador: se usa igual en los tests de Node.
 */

import { track } from './gc.js';

let W = null;

/** Registra la instancia ya inicializada de manifold-3d. */
export function setWasm(wasm) { W = wasm; }
export function wasm() {
  if (!W) throw new Error('El motor 3D todavía no está inicializado');
  return W;
}

// ---------- Texto ----------

/** Convierte los comandos de un path de opentype en polígonos (y hacia arriba). */
export function pathToPolygons(commands, tolerance = 0.05) {
  const polys = [];
  let cur = null, sx = 0, sy = 0, px = 0, py = 0;
  const push = (x, y) => { cur.push([x, -y]); px = x; py = y; };
  const steps = (len) => Math.min(24, Math.max(3, Math.ceil(Math.sqrt(len / tolerance) / 2)));
  for (const c of commands) {
    switch (c.type) {
      case 'M':
        if (cur && cur.length > 2) polys.push(cur);
        cur = []; sx = c.x; sy = c.y; push(c.x, c.y);
        break;
      case 'L': push(c.x, c.y); break;
      case 'Q': {
        const n = steps(Math.hypot(c.x - px, c.y - py) + Math.hypot(c.x1 - px, c.y1 - py));
        const x0 = px, y0 = py;
        for (let i = 1; i <= n; i++) {
          const t = i / n, u = 1 - t;
          push(u * u * x0 + 2 * u * t * c.x1 + t * t * c.x, u * u * y0 + 2 * u * t * c.y1 + t * t * c.y);
        }
        break;
      }
      case 'C': {
        const n = steps(Math.hypot(c.x1 - px, c.y1 - py) + Math.hypot(c.x2 - c.x1, c.y2 - c.y1) + Math.hypot(c.x - c.x2, c.y - c.y2));
        const x0 = px, y0 = py;
        for (let i = 1; i <= n; i++) {
          const t = i / n, u = 1 - t;
          push(u * u * u * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
               u * u * u * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y);
        }
        break;
      }
      case 'Z':
        if (cur && cur.length > 2) {
          const [lx, ly] = cur[cur.length - 1];
          if (Math.abs(lx - sx) < 1e-9 && Math.abs(ly + sy) < 1e-9) cur.pop();
          polys.push(cur);
        }
        cur = null;
        break;
    }
  }
  if (cur && cur.length > 2) polys.push(cur);
  return polys;
}

/**
 * Comandos de dibujo de una línea de texto.
 * Usa el motor de opentype; si la fuente tiene reglas que opentype no soporta,
 * arma la línea letra por letra (sin ligaduras, con interletrado).
 */
function layoutLine(font, line, y, size, spacing) {
  try {
    return font.getPath(line, 0, y, size, { kerning: true, letterSpacing: spacing }).commands;
  } catch {
    const k = size / font.unitsPerEm;
    const cmds = [];
    let x = 0, prev = null;
    for (const ch of Array.from(line)) {
      const glyph = font.charToGlyph(ch);
      if (prev) { try { x += font.getKerningValue(prev, glyph) * k; } catch { /* sin kerning */ } }
      cmds.push(...glyph.getPath(x, y, size).commands);
      x += (glyph.advanceWidth || 0) * k + spacing * size;
      prev = glyph;
    }
    return cmds;
  }
}

/**
 * Texto → CrossSection.
 * @param font   fuente opentype ya cargada
 * @param text   admite varias líneas separadas por \n
 * @param opts.height  alto final del bloque de texto en mm
 * @param opts.spacing espaciado entre letras (en "em", 0 = normal, negativo = superponer)
 * @param opts.lineGap separación entre líneas (en "em")
 * @param opts.align   'center' | 'left' | 'right'
 */
export function textShape(font, text, opts = {}) {
  const { CrossSection } = wasm();
  const { height = 15, spacing = 0, lineGap = 0.15, align = 'center' } = opts;
  const lines = String(text || '').split('\n').map(l => l.trimEnd()).filter((l, i, a) => l || a.length === 1);
  const size = 100;
  const lineStep = (font.ascender - font.descender) / font.unitsPerEm * size * (1 + lineGap) * 0.82;
  const sections = [];
  const widths = [];
  lines.forEach((line, i) => {
    if (!line.trim()) { widths.push(0); return; }
    const polys = pathToPolygons(layoutLine(font, line, i * lineStep, size, spacing), 0.08);
    if (!polys.length) { widths.push(0); return; }
    const cs = track(new CrossSection(polys, 'NonZero'));
    const b = cs.bounds();
    widths.push(b.max[0] - b.min[0]);
    sections.push({ cs, b });
  });
  if (!sections.length) return track(new CrossSection([], 'NonZero'));
  const maxW = Math.max(...widths);
  const aligned = sections.map(({ cs, b }) => {
    const w = b.max[0] - b.min[0];
    const dx = align === 'left' ? -b.min[0] : align === 'right' ? maxW - b.max[0] : (maxW - w) / 2 - b.min[0];
    return cs.translate([dx, 0]);
  });
  let all = CrossSection.union(aligned);
  const bb = all.bounds();
  const h = bb.max[1] - bb.min[1];
  const k = h > 0 ? height / h : 1;
  all = all.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2]).scale(k);
  return all;
}

// ---------- Formas 2D ----------

export const circle = (r, segs = 64) => wasm().CrossSection.circle(r, segs);

export function roundedRect(w, h, r = 0) {
  const { CrossSection } = wasm();
  r = Math.max(0, Math.min(r, w / 2 - 0.01, h / 2 - 0.01));
  if (r <= 0) return CrossSection.square([w, h], true);
  return CrossSection.square([w - 2 * r, h - 2 * r], true).offset(r, 'Round', 2, 48);
}

export function ellipse(w, h, segs = 96) {
  return circle(1, segs).scale([w / 2, h / 2]);
}

export function polygonShape(points) {
  return track(new (wasm().CrossSection)([points], 'NonZero'));
}

/** Contorno redondeado alrededor de una forma (delta > 0 agranda). */
export const outline = (cs, delta) => (delta ? cs.offset(delta, 'Round', 2, 32) : cs);

/** Rellena los agujeros interiores y deja solo el contorno exterior. */
export function fillHoles(cs) {
  const { CrossSection } = wasm();
  const polys = cs.toPolygons().filter(p => signedArea(p) > 0);
  return polys.length ? track(new CrossSection(polys, 'NonZero')) : cs;
}

export function signedArea(poly) {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function bounds2d(cs) {
  const b = cs.bounds();
  return { minX: b.min[0], minY: b.min[1], maxX: b.max[0], maxY: b.max[1], w: b.max[0] - b.min[0], h: b.max[1] - b.min[1] };
}

/** Punto de la forma más alejado en una dirección: 'left' | 'right' | 'top' | 'bottom'. */
export function extremePoint(cs, side) {
  let best = null;
  const score = ([x, y]) => side === 'left' ? -x : side === 'right' ? x : side === 'top' ? y : -y;
  for (const poly of cs.toPolygons()) for (const p of poly) if (!best || score(p) > score(best)) best = p;
  return best || [0, 0];
}

/**
 * Agrega una argolla a una forma: un anillo pegado al borde, con agujero.
 * Devuelve { shape, hole } para que el agujero también se reste de otras capas.
 */
export function addRing(shape, { side = 'left', holeD = 4, wall = 2.5 } = {}) {
  if (side === 'none') return { shape, hole: null };
  const r = holeD / 2, R = r + wall;
  const [ex, ey] = extremePoint(shape, side);
  const dir = { left: [-1, 0], right: [1, 0], top: [0, 1], bottom: [0, -1] }[side];
  const c = [ex + dir[0] * r, ey + dir[1] * r];
  const ring = circle(R).translate(c);
  const hole = circle(r).translate(c);
  return { shape: shape.add(ring).subtract(hole), hole };
}

// ---------- Sólidos ----------

/** Extruye una forma entre z0 y z0 + h. */
export function slab(cs, h, z0 = 0) {
  return cs.extrude(Math.max(0.01, h)).translate([0, 0, z0]);
}

/** Pieza de un modelo: un sólido con nombre y color. */
export const part = (name, color, solid) => ({ name, color, solid });

/** Une las piezas que comparten color (para impresoras de un solo extrusor). */
export function mergeAll(parts, name = 'Pieza', color) {
  const { Manifold } = wasm();
  return part(name, color || parts[0]?.color || '#cccccc', Manifold.union(parts.map(p => p.solid)));
}

/** Medidas, volumen y área de un conjunto de piezas. */
export function modelStats(parts) {
  let volume = 0, area = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    volume += p.solid.volume();
    area += p.solid.surfaceArea();
    const b = p.solid.boundingBox();
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], b.min[i]); max[i] = Math.max(max[i], b.max[i]); }
  }
  return { volume, area, min, max, size: max.map((v, i) => v - min[i]) };
}
