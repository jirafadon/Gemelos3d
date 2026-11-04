/**
 * Tu foto o dibujo en colores: la imagen se separa en sus colores principales
 * y cada color sale como una pieza (3MF multicolor). Como adorno con argolla,
 * posavasos, llavero, imán o dije. Colores al ras (lisos) o en relieve.
 */
import { wasm, circle, roundedRect, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { maskToShape, sampleColorLayers } from '../engine/trace.js';

const KINDS = [
  { value: 'ornament', label: 'Adorno' }, { value: 'coaster', label: 'Posavasos' },
  { value: 'keychain', label: 'Llavero' }, { value: 'magnet', label: 'Imán' }, { value: 'charm', label: 'Dije' },
];
const DEF = { ornament: 80, coaster: 100, keychain: 50, magnet: 60, charm: 30 };

export default {
  id: 'foto-color',
  title: 'Tu foto en colores',
  description: 'La imagen se separa en sus colores y sale lista para imprimir en varios colores: adorno, posavasos, llavero, imán o dije.',
  fileName: v => `${v.kind}_colores`,
  params: [
    { type: 'group', label: '1 · Imagen' },
    { key: 'image', type: 'image', label: 'Foto o dibujo', default: '', hint: 'Funciona mejor con dibujos de colores planos o fotos con fondo liso. Mientras no subas nada se muestra un ejemplo.' },
    { key: 'removeBg', type: 'toggle', label: 'Quitar el fondo', default: true },
    { key: 'bgTol', type: 'number', label: 'Cuánto se parece al fondo', default: 40, min: 5, max: 120, step: 1, unit: '', show: v => v.removeBg },
    { key: 'ncolors', type: 'segment', label: 'Colores de la imagen', default: 4, options: [2, 3, 4, 5, 6].map(n => ({ value: n, label: String(n) })) },
    { key: 'smooth', type: 'number', label: 'Suavizado', default: 0.35, min: 0, max: 2, step: 0.05, unit: 'mm' },
    { key: 'specks', type: 'number', label: 'Limpieza de motas', default: 1.5, min: 0, max: 30, step: 0.5, unit: 'mm²', hint: 'Saca islitas de color muy chicas, que no se pueden imprimir.' },
    { key: 'detail', type: 'segment', label: 'Detalle', default: 320, options: [{ value: 200, label: 'Rápido' }, { value: 320, label: 'Normal' }, { value: 520, label: 'Alto' }] },

    { type: 'group', label: '2 · Qué hacer' },
    { key: 'kind', type: 'segment', label: 'Pieza', default: 'ornament', options: KINDS },
    { key: 'outline', type: 'segment', label: 'Forma', default: 'auto', options: [{ value: 'auto', label: 'Según la pieza' }, { value: 'sil', label: 'Sigue el dibujo' }, { value: 'round', label: 'Redonda' }, { value: 'rect', label: 'Rectangular' }],
      hint: 'Según la pieza: el posavasos sale redondo y lo demás copia la silueta del dibujo.' },
    { key: 'size', type: 'number', label: 'Tamaño', default: 80, min: 20, max: 200, step: 1, unit: 'mm', hint: v => `Sugerido para ${KINDS.find(k => k.value === v.kind).label.toLowerCase()}: ${DEF[v.kind]} mm.` },
    { key: 'border', type: 'number', label: 'Borde alrededor', default: 3, min: 0.8, max: 12, step: 0.2, unit: 'mm' },
    { key: 'artSize', type: 'number', label: 'Tamaño del dibujo', default: 100, min: 30, max: 100, step: 1, unit: '%', show: v => v.outline === 'round' || v.outline === 'rect' || (v.outline === 'auto' && v.kind === 'coaster') },
    { key: 'dx', type: 'number', label: 'Mover a los lados', default: 0, min: -60, max: 60, step: 0.5, unit: 'mm', show: v => v.outline === 'round' || v.outline === 'rect' || (v.outline === 'auto' && v.kind === 'coaster') },
    { key: 'dy', type: 'number', label: 'Mover arriba / abajo', default: 0, min: -60, max: 60, step: 0.5, unit: 'mm', show: v => v.outline === 'round' || v.outline === 'rect' || (v.outline === 'auto' && v.kind === 'coaster') },
    { key: 'holeD', type: 'number', label: 'Agujero para colgar', default: 4, min: 2, max: 8, step: 0.5, unit: 'mm', show: v => ['ornament', 'keychain', 'charm'].includes(v.kind) },
    { key: 'magnetD', type: 'number', label: 'Imán (diámetro)', default: 10.2, min: 4, max: 30, step: 0.1, unit: 'mm', show: v => v.kind === 'magnet' },
    { key: 'magnetH', type: 'number', label: 'Imán (alto)', default: 2.2, min: 1, max: 6, step: 0.1, unit: 'mm', show: v => v.kind === 'magnet', hint: 'Dejá el hueco 0,2 mm más grande que tu imán. Se imprime desde atrás, el imán entra a presión.' },

    { type: 'group', label: '3 · Colores y alturas' },
    { key: 'relief', type: 'segment', label: 'Colores', default: 'flat', options: [{ value: 'flat', label: 'Al ras (lisos)' }, { value: 'raised', label: 'En relieve' }] },
    { key: 'step', type: 'number', label: 'Altura de cada color', default: 0.6, min: 0.2, max: 3, step: 0.1, unit: 'mm', show: v => v.relief === 'raised', hint: 'Cada color sube un poco más que el anterior: efecto 3D.' },
    { key: 'lip', type: 'toggle', label: 'Reborde', default: false, show: v => v.kind === 'coaster' },
    { key: 'thick', type: 'number', label: 'Espesor de la base', default: 3, min: 1.2, max: 8, step: 0.2, unit: 'mm' },
    { key: 'cBase', type: 'color', label: 'Base y borde', default: '#F5F5F5' },
    { key: 'useImg', type: 'toggle', label: 'Usar los colores de la imagen', default: true, hint: 'Apagalo para elegir vos cada color (del más grande al más chico).' },
    ...[1, 2, 3, 4, 5, 6].map(i => ({ key: `c${i}`, type: 'color', label: `Color ${i}`, default: ['#1E1E1E', '#D62828', '#FCBF49', '#2A9D8F', '#457B9D', '#F77F00'][i - 1], show: v => !v.useImg && i <= +v.ncolors })),
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    v = { ...v, outline: v.outline === 'auto' ? (v.kind === 'coaster' ? 'round' : 'sil') : v.outline };
    const res = v.image && ctx.colors
      ? await ctx.colors(v.image, { colors: +v.ncolors, maxPx: +v.detail || 320, removeBg: !!v.removeBg, bgTol: v.bgTol })
      : sampleColorLayers();
    if (!res.layers.length) throw new Error('No encontré colores en la imagen: probá sin «Quitar el fondo».');
    // Todas las capas en el mismo marco (sin centrar cada una), y después se escalan juntas
    const W = 100;
    let layers = res.layers.slice(0, +v.ncolors).map((l, i) => ({
      color: v.useImg ? l.color : v[`c${i + 1}`],
      cs: maskToShape(l.mask, { width: W, smooth: v.smooth, minArea: 0.01, center: false }),
    })).filter(l => !l.cs.isEmpty());
    if (!layers.length) throw new Error('La imagen quedó vacía: bajá la limpieza de motas.');
    // Escala para que el dibujo (o la pieza) tenga el tamaño pedido
    let art = CrossSection.union(layers.map(l => l.cs));
    const ab = art.bounds(), aw = ab.max[0] - ab.min[0], ah = ab.max[1] - ab.min[1];
    const room = v.outline === 'sil' ? v.size - 2 * v.border : (v.size - 2 * v.border) * (v.artSize / 100);
    const k = room / Math.max(aw, ah);
    const c = [-(ab.min[0] + ab.max[0]) / 2, -(ab.min[1] + ab.max[1]) / 2];
    const off = v.outline === 'sil' ? [0, 0] : [v.dx, v.dy];
    const place = cs => cs.translate(c).scale([k, k]).translate(off);
    // Las capas no se pisan: cada una pierde lo que ya ocupó una anterior; y se limpian las motas
    let used = null;
    const minA = v.specks;
    layers = layers.map(l => {
      let cs = place(l.cs);
      if (used) cs = cs.subtract(used);
      const keep = cs.toPolygons().filter(p => Math.abs(area(p)) >= minA || area(p) < 0);
      cs = keep.length ? new CrossSection(keep, 'Positive') : cs;
      used = used ? used.add(cs) : cs;
      return { ...l, cs };
    }).filter(l => !l.cs.isEmpty() && l.cs.area() >= minA);
    art = place(art);

    // Forma de la pieza
    let body;
    if (v.outline === 'round') body = circle(v.size / 2, 128);
    else if (v.outline === 'rect') { const r = Math.max(0.4, Math.min(2.5, ah / aw)); body = roundedRect(r > 1 ? v.size / r : v.size, r > 1 ? v.size : v.size * r, Math.min(6, v.size * 0.08)); }
    else body = fillHoles(outline(art, v.border));
    // Lo que sobresale de una forma redonda/rectangular se recorta
    const inside = body.offset(-Math.min(v.border, 1.2), 'Round', 2, 24);
    const lipOn = v.kind === 'coaster' && v.lip;
  const keepIn = lipOn ? body.offset(-2.8, 'Round', 2, 24) : inside;
  layers = layers.map(l => ({ ...l, cs: v.outline === 'sil' && !lipOn ? l.cs : l.cs.intersect(keepIn) })).filter(l => !l.cs.isEmpty());

    // Colgante o agujero
    const hr = v.holeD / 2;
    let hole = null;
    if (['ornament', 'keychain', 'charm'].includes(v.kind)) {
      // Lo más alto del centro (en un corazón, el hueco de arriba)
      const mid = body.intersect(roundedRect(2, v.size * 4, 0)), top = (mid.isEmpty() ? body : mid).bounds().max[1];
      const ring = circle(hr + 2.4, 48).translate([0, top + hr - 0.2]);
      body = body.add(ring).add(roundedRect((hr + 2.4) * 1.4, 4, 1).translate([0, top - 1]));
      hole = circle(hr, 40).translate([0, top + hr - 0.2]);
      body = body.subtract(hole);
    }

    const t = v.thick, parts = [];
    let base = slab(body, t);
    if (v.kind === 'magnet') {
      // Hueco para el imán desde atrás (se imprime con la cara de color arriba)
      const { Manifold } = wasm();
      base = base.subtract(Manifold.cylinder(Math.min(v.magnetH, t - 0.8), v.magnetD / 2, v.magnetD / 2, 64).translate([0, 0, -0.01]));
    }
    if (lipOn) base = base.add(slab(body.subtract(body.offset(-2.4, 'Round', 2, 24)), 1.6, t));
    if (v.relief === 'flat') {
      // Al ras: los colores ocupan los últimos 0,6 mm de arriba
      const d = Math.min(0.6, t - 0.6);
      const all = CrossSection.union(layers.map(l => l.cs));
      base = base.subtract(slab(all, d + 0.01, t - d));
      layers.forEach((l, i) => parts.push(part(`Color ${i + 1}`, l.color, slab(l.cs, d, t - d))));
    } else {
      layers.forEach((l, i) => parts.push(part(`Color ${i + 1}`, l.color, slab(l.cs, v.step * (i + 1), t))));
    }
    parts.unshift(part('Base', v.cBase, base));
    return mergeByColor(parts);
  },
};

function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
