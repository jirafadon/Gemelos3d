/**
 * Egresados: birrete + año (o número de promoción) + nombre, en el formato que quieras:
 * adorno parado con base, llavero, imán (con hueco para el imán) o topper para torta.
 * Con lista de nombres sale uno por egresado, todos en la misma cama.
 */
import { wasm, circle, outline, fillHoles, slab, part, addRing, polygonShape } from '../engine/geom.js';
import { layered, stackLines, mergeByColor, slotBase, placeBelow } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { birrete, diploma } from '../engine/icons2d.js';
import { stack } from './medalla.js';

export default {
  id: 'graduados',
  title: 'Egresados y graduados',
  description: 'Birrete, año y nombre como adorno, llavero, imán o topper; uno por egresado.',
  fileName: v => `egresados_${v.year}_${v.format}`,
  params: [
    { type: 'group', label: 'Textos' },
    { key: 'names', type: 'text', label: 'Nombres (uno por línea)', default: 'Martina\nJuan\nSofía', multiline: true, hint: 'Sale una pieza por cada nombre. Dejalo vacío para una sola sin nombre.' },
    { key: 'year', type: 'text', label: 'Año o promoción', default: '2026' },
    { key: 'line', type: 'text', label: 'Texto extra (opcional)', default: 'Egresados' },
    { key: 'yearFont', type: 'font', label: 'Tipografía del año', default: 'bangers' },
    { key: 'nameFont', type: 'font', label: 'Tipografía del nombre', default: 'pacifico' },
    { key: 'icon', type: 'segment', label: 'Ícono', default: 'birrete', options: [{ value: 'birrete', label: 'Birrete' }, { value: 'diploma', label: 'Diploma' }, { value: 'none', label: 'Ninguno' }] },

    { type: 'group', label: 'Formato' },
    { key: 'format', type: 'segment', label: 'Qué hacer', default: 'stand', options: [{ value: 'stand', label: 'Adorno con base' }, { value: 'key', label: 'Llavero' }, { value: 'magnet', label: 'Imán' }, { value: 'topper', label: 'Topper' }] },
    { key: 'width', type: 'number', label: 'Ancho de cada pieza', default: 70, min: 30, max: 200, step: 1, unit: 'mm' },
    { key: 'magnetD', type: 'number', label: 'Diámetro del imán', default: 10, min: 5, max: 25, step: 0.5, unit: 'mm', show: v => v.format === 'magnet' },
    { key: 'magnetT', type: 'number', label: 'Espesor del imán', default: 2, min: 1, max: 6, step: 0.5, unit: 'mm', show: v => v.format === 'magnet' },
    { key: 'border', type: 'number', label: 'Contorno', default: 2.4, min: 1, max: 8, step: 0.2, unit: 'mm' },

    { type: 'group', label: 'Colores' },
    { key: 'colors', type: 'segment', label: 'Cantidad de colores', default: 2, options: [{ value: 1, label: '1' }, { value: 2, label: '2' }] },
    { key: 'cBase', type: 'color', label: 'Fondo', default: '#1E1E1E' },
    { key: 'cText', type: 'color', label: 'Birrete y textos', default: '#FCBF49', show: v => v.colors === 2 },
    { key: 'hBase', type: 'number', label: 'Espesor', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Relieve', default: 1, min: 0.4, max: 3, step: 0.2, unit: 'mm' },
  ],
  async build(v, ctx) {
    const { CrossSection, Manifold } = wasm();
    const [yf, nf] = await Promise.all([ctx.font(v.yearFont), ctx.font(v.nameFont)]);
    const names = String(v.names || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 30);
    if (!names.length) names.push('');
    const W = v.width;
    const ic = v.icon === 'birrete' ? birrete(W * 0.55) : v.icon === 'diploma' ? diploma(W * 0.6) : null;
    const yearS = (v.year || '').trim() ? fitInto(stackLines([{ font: yf, text: v.year, height: 10 }], 0), W * 0.8, W * 0.32) : null;
    const lineS = (v.line || '').trim() ? fitInto(stackLines([{ font: yf, text: v.line, height: 10 }], 0), W * 0.7, W * 0.1) : null;
    const pieces = [];
    for (const nm of names) {
      const items = [];
      if (ic) items.push(fitInto(ic, W * 0.6, W * 0.35));
      if (lineS) items.push(lineS);
      if (yearS) items.push(yearS);
      if (nm) items.push(fitInto(stackLines([{ font: nf, text: nm, height: 10 }], 0), W * 0.9, W * 0.2));
      // Las piezas se superponen un poco para que todo quede unido por el contorno
      let art = stack(items, -W * 0.01) || circle(W * 0.2, 48);
      art = fitInto(art, W - 2 * v.border, W * 1.4);
      let plate = fillHoles(outline(art, v.border));
      let tabH = 0;
      if (v.format === 'key') plate = addRing(plate, { side: 'top', holeD: 4, wall: 2.4 }).shape;
      if (v.format === 'stand' || v.format === 'topper') {
        // Lengüeta abajo (para la ranura de la base) o púa (para la torta)
        const pb = plate.bounds();
        if (v.format === 'stand') { tabH = 6; plate = plate.add(CrossSection.square([W * 0.5, tabH + 1], false).translate([-W * 0.25, pb.min[1] - tabH])); }
        else plate = plate.add(CrossSection.square([5, 55], false).translate([-2.5, pb.min[1] - 54])).add(polygonShape([[-2.5, pb.min[1] - 54], [2.5, pb.min[1] - 54], [0, pb.min[1] - 62]]));
      }
      let parts = layered({ base2d: plate, text2d: art, colors: v.colors, mode: 'raised', cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
      if (v.format === 'magnet') {
        // Hueco atrás para pegar el imán (la cara de atrás va sobre la cama)
        const hole = slab(circle(v.magnetD / 2 + 0.2, 48), Math.min(v.magnetT + 0.2, v.hBase - 0.8), -0.01);
        parts = parts.map(p => (p.name === 'Base' || p.name === 'Pieza' ? { ...p, solid: p.solid.subtract(hole) } : p));
      }
      pieces.push({ parts, plate, tabH });
    }
    // Se acomodan en grilla en la cama
    const cols = Math.ceil(Math.sqrt(pieces.length));
    const out = [];
    let cellW = 0, cellH = 0;
    for (const pc of pieces) { const b = pc.plate.bounds(); cellW = Math.max(cellW, b.max[0] - b.min[0]); cellH = Math.max(cellH, b.max[1] - b.min[1]); }
    pieces.forEach((pc, i) => {
      const off = [(i % cols) * (cellW + 6), -Math.floor(i / cols) * (cellH + 6), 0];
      for (const p of pc.parts) out.push({ ...p, solid: p.solid.translate(off) });
    });
    if (v.format === 'stand') {
      // Una base por pieza, en una fila debajo
      const all = Manifold.union(out.map(p => p.solid));
      const base = slotBase({ length: W * 0.5 + 14, slotLength: W * 0.5 + 0.6, plate: v.hBase, tol: 0.25, depth: 22, height: 10, slotDepth: 5, color: v.cBase }).solid;
      const first = placeBelow(base, all, 10);
      const fb = first.boundingBox(), ab = all.boundingBox();
      for (let i = 0; i < pieces.length; i++) out.push(part('Base', v.cBase, first.translate([i * (fb.max[0] - fb.min[0] + 6) - (fb.min[0] - ab.min[0]), 0, 0])));
    }
    return mergeByColor(out);
  },
};
