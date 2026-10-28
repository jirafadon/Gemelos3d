/**
 * Recetas compartidas por los generadores de texto:
 * capas de color, apilado de líneas y base con ranura.
 */
import { wasm, slab, part, textShape, roundedRect } from './geom.js';

/** Une las piezas que comparten color (el laminador las trata como una). */
export function mergeByColor(parts) {
  const { Manifold } = wasm();
  const by = new Map();
  for (const p of parts) {
    if (!p || !p.solid || p.solid.isEmpty()) continue;
    by.set(p.color, [...(by.get(p.color) || []), p]);
  }
  return [...by.values()].map(g => g.length === 1 ? g[0]
    : part(g.map(x => x.name).filter((n, i, a) => a.indexOf(n) === i).join(' + '), g[0].color, Manifold.union(g.map(x => x.solid))));
}

/**
 * Capas de color típicas: base (contorno), capa media opcional y texto.
 * @param base2d  forma de la base (ya con agujeros/argolla)
 * @param mid2d   forma de la capa media (solo si colors === 3)
 * @param text2d  forma del texto / dibujo superior
 * @param mode    'raised' (en relieve) | 'flush' (al ras, embutido)
 */
export function layered({ base2d, mid2d, text2d, colors = 2, mode = 'raised', cBase, cMid, cText, hBase = 3, hMid = 0.8, hText = 1 }) {
  colors = Number(colors);
  if (colors === 1) {
    return [part('Pieza', cBase, slab(base2d, hBase).add(slab(text2d, hText, hBase)))];
  }
  const parts = [];
  let z = hBase;
  if (colors === 3 && mid2d) {
    if (mode === 'flush') {
      parts.push(part('Base', cBase, slab(base2d.subtract(mid2d), hBase + hMid)));
      parts.push(part('Base', cBase, slab(mid2d, hBase)));
      parts.push(part('Capa media', cMid, slab(mid2d, hMid, hBase)));
      z = hBase + hMid;
    } else {
      parts.push(part('Base', cBase, slab(base2d, hBase)));
      parts.push(part('Capa media', cMid, slab(mid2d, hMid, hBase)));
      z = hBase + hMid;
    }
  } else {
    parts.push(part('Base', cBase, slab(base2d, hBase)));
  }
  if (mode === 'flush') {
    const depth = Math.min(hText, z - 0.6);
    const t = slab(text2d, depth, z - depth);
    for (const p of parts) p.solid = p.solid.subtract(t);
    parts.push(part('Texto', cText, t));
  } else {
    parts.push(part('Texto', cText, slab(text2d, hText, z)));
  }
  return mergeByColor(parts);
}

/**
 * Apila líneas de texto (cada una con su fuente y alto) centradas.
 * @param lines [{ font, text, height, spacing }]
 * @param gap   separación vertical en mm (negativa = superponer)
 */
export function stackLines(lines, gap = 2, align = 'center') {
  const { CrossSection } = wasm();
  const shapes = lines.filter(l => l.text && l.text.trim()).map(l => textShape(l.font, l.text, { height: l.height, spacing: l.spacing || 0, align }));
  if (!shapes.length) return CrossSection.square([0.01, 0.01], true);
  const placed = [];
  let y = 0;
  shapes.forEach((s, i) => {
    const b = s.bounds();
    const h = b.max[1] - b.min[1];
    const w = b.max[0] - b.min[0];
    const dx = align === 'left' ? -b.min[0] : align === 'right' ? -b.max[0] : -(b.min[0] + b.max[0]) / 2;
    if (i > 0) y -= gap;
    placed.push(s.translate([dx, y - b.max[1]]));
    y -= h;
    void w;
  });
  let all = CrossSection.union(placed);
  const bb = all.bounds();
  return all.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2]);
}

/**
 * Base para pararse: un bloque con ranura donde encastra una placa.
 * La ranura deja `tol` de holgura sobre el espesor de la placa.
 */
export function slotBase({ length, slotLength, plate = 3, tol = 0.25, depth = 16, height = 10, slotDepth = 6, color }) {
  const block = slab(roundedRect(length, depth, Math.min(4, depth / 3)), height);
  const sl = Math.min(slotLength ?? length + 2, length + 2);
  const slot = slab(roundedRect(sl, plate + tol, 0), slotDepth + 1, height - slotDepth);
  return part('Base', color, block.subtract(slot));
}

/** Ubica una pieza al lado de otra (para mostrarlas juntas en la cama). */
export function placeBelow(solid, ref, gap = 8) {
  const a = solid.boundingBox(), b = ref.boundingBox();
  return solid.translate([-(a.min[0] + a.max[0]) / 2 + (b.min[0] + b.max[0]) / 2, b.min[1] - gap - a.max[1], -a.min[2]]);
}
