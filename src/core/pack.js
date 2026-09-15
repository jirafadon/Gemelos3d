/**
 * Packing 2D puro para piezas de fabricación.
 * Prueba orientación 0° y 90° y respeta área útil + keepout.
 * La salida no depende de Three.js: recibe rectángulos ya medidos.
 */

import { computeUsefulArea, computeKeepout, intersectsKeepout, placementFits } from './bed.js';

function orientations(item) {
  const w = Math.max(0, Number(item.width) || 0);
  const d = Math.max(0, Number(item.depth) || 0);
  const list = [{ rotation: 0, width: w, depth: d }];
  if (Math.abs(w - d) > 0.001) list.push({ rotation: 90, width: d, depth: w });
  return list;
}

function candidateFits(candidate, area, keepout) {
  if (!placementFits(candidate, area)) return false;
  return !intersectsKeepout(candidate, keepout);
}

/**
 * Empaqueta por filas, pero para cada pieza evalúa ambas orientaciones.
 * Se elige la orientación que deja menor altura ocupada en la fila.
 * Piezas que no entran se devuelven como rejected, nunca se descartan en silencio.
 */
export function packPieces(items = [], bedInput = {}, options = {}) {
  const gap = Math.max(0, Number(options.gap) || 0);
  const area = options.area || computeUsefulArea(bedInput);
  const keepout = options.keepout === undefined ? computeKeepout(bedInput) : options.keepout;
  const beds = [];
  const rejected = [];

  let current = null;
  const newBed = () => ({ items: [], cursorX: area.x0, cursorY: area.y0, rowDepth: 0 });

  const flush = () => {
    if (current?.items.length) beds.push(current);
    current = newBed();
  };

  current = newBed();

  for (const item of items) {
    const candidates = orientations(item)
      .map(o => ({ ...o, x0: area.x0, x1: area.x0 + o.width, y0: current.cursorY, y1: current.cursorY + o.depth }))
      .filter(c => candidateFits(c, area, keepout));

    const rotatedCandidates = orientations(item)
      .map(o => ({ ...o, x0: current.cursorX, x1: current.cursorX + o.width, y0: current.cursorY, y1: current.cursorY + o.depth }))
      .filter(c => candidateFits(c, area, keepout));

    let chosen = rotatedCandidates.find(c => c.rotation === 0);
    if (!chosen) chosen = rotatedCandidates.find(c => c.rotation === 90);

    if (!chosen && current.cursorX > area.x0) {
      current.cursorX = area.x0;
      current.cursorY += current.rowDepth + gap;
      current.rowDepth = 0;
      const rowCandidates = orientations(item)
        .map(o => ({ ...o, x0: current.cursorX, x1: current.cursorX + o.width, y0: current.cursorY, y1: current.cursorY + o.depth }))
        .filter(c => candidateFits(c, area, keepout));
      chosen = rowCandidates.sort((a, b) => (a.depth - b.depth) || (a.rotation - b.rotation))[0];
    }

    if (!chosen) {
      const fresh = newBed();
      const freshCandidates = orientations(item)
        .map(o => ({ ...o, x0: fresh.cursorX, x1: fresh.cursorX + o.width, y0: fresh.cursorY, y1: fresh.cursorY + o.depth }))
        .filter(c => candidateFits(c, area, keepout));
      chosen = freshCandidates.sort((a, b) => (a.depth - b.depth) || (a.rotation - b.rotation))[0];
      if (chosen) {
        flush();
      } else {
        rejected.push({ item, reason: 'no-fit' });
        continue;
      }
    }

    current.items.push({ ...item, rotation: chosen.rotation, x: chosen.x0, y: chosen.y0, width: chosen.width, depth: chosen.depth });
    current.cursorX = chosen.x1 + gap;
    current.rowDepth = Math.max(current.rowDepth, chosen.depth);
  }

  if (current.items.length) beds.push(current);

  return { beds, rejected, area, keepout };
}
