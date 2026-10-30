/**
 * Funda de TPU para celular: elegís el modelo (o cargás las medidas) y arma la funda
 * con labio sobre la pantalla, recorte de cámara, botones cubiertos o recortados,
 * puertos abajo, esquinas reforzadas y un diseño en la espalda (tramas, nombre o imagen)
 * grabado, calado o en dos colores. Se imprime con la espalda sobre la cama, sin soportes.
 *
 * Coordenadas: el celular acostado boca arriba (pantalla hacia +Z), visto de frente:
 * X a la derecha, Y hacia arriba (parte de arriba del celular), espalda en Z = 0.
 */
import { wasm, roundedRect, circle, slab, part, polygonShape } from '../engine/geom.js';
import { stackLines, mergeByColor } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { imageParams, silhouette } from './_common.js';
import { PHONES, PHONE_OPTIONS } from './phones.js';

/** Sólido con forma de celular: rectángulo redondeado con cantos curvos abajo y arriba (casco de capas). */
function roundedBody(w, h, corner, z0, z1, eBottom, eTop, segs = 6) {
  const { Manifold } = wasm();
  const H = z1 - z0;
  eBottom = Math.max(0, Math.min(eBottom, H / 2 - 0.05, w / 4));
  eTop = Math.max(0, Math.min(eTop, H / 2 - 0.05, w / 4));
  const layer = (inset, z) => slab(roundedRect(w - 2 * inset, h - 2 * inset, Math.max(0.3, corner - inset)), 0.01, z);
  const layers = [layer(0, z0 + H / 2)];
  // Perfil de cuarto de círculo: en el borde se mete "e", a una altura "e" ya no se mete
  const ins = (e, t) => e - Math.sqrt(Math.max(0, e * e - (e - e * t) ** 2));
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    layers.push(layer(ins(eBottom, t), z0 + eBottom * t));
    layers.push(layer(ins(eTop, t), z1 - 0.01 - eTop * t));
  }
  return Manifold.hull(layers);
}

/** Tramas para la espalda (formas 2D que se graban, calan o van en otro color). */
function patternShape(kind, zone, s) {
  const { CrossSection } = wasm();
  const b = zone.bounds();
  const cells = [];
  const W = b.max[0] - b.min[0], H = b.max[1] - b.min[1], cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2;
  if (kind === 'honey') {
    const R = s / 2, dx = R * Math.sqrt(3), dy = R * 1.5, hex = circle(R * 0.78, 6).rotate(30);
    for (let j = -Math.ceil(H / dy / 2) - 1; j <= Math.ceil(H / dy / 2) + 1; j++) for (let i = -Math.ceil(W / dx / 2) - 1; i <= Math.ceil(W / dx / 2) + 1; i++) cells.push(hex.translate([cx + i * dx + (j % 2 ? dx / 2 : 0), cy + j * dy]));
  } else if (kind === 'diamonds') {
    const d = polygonShape([[0, s * 0.42], [s * 0.3, 0], [0, -s * 0.42], [-s * 0.3, 0]]);
    for (let j = -Math.ceil(H / s) - 1; j <= Math.ceil(H / s) + 1; j++) for (let i = -Math.ceil(W / (s * 0.7)) - 1; i <= Math.ceil(W / (s * 0.7)) + 1; i++) cells.push(d.translate([cx + i * s * 0.7 + (j % 2 ? s * 0.35 : 0), cy + j * s * 0.5]));
  } else if (kind === 'dots') {
    const c = circle(s * 0.28, 24);
    for (let j = -Math.ceil(H / s) - 1; j <= Math.ceil(H / s) + 1; j++) for (let i = -Math.ceil(W / s) - 1; i <= Math.ceil(W / s) + 1; i++) cells.push(c.translate([cx + i * s + (j % 2 ? s / 2 : 0), cy + j * s * 0.87]));
  } else if (kind === 'lines') {
    const L = Math.hypot(W, H) + 20;
    for (let k = -Math.ceil(L / s); k <= Math.ceil(L / s); k++) cells.push(CrossSection.square([s * 0.35, L], true).rotate(35).translate([cx + k * s / Math.cos(35 * Math.PI / 180), cy]));
  } else if (kind === 'waves') {
    for (let k = -Math.ceil(H / s) - 1; k <= Math.ceil(H / s) + 1; k++) {
      const pts = [], y0 = cy + k * s, amp = s * 0.3, th = s * 0.2;
      for (let x = b.min[0] - 5; x <= b.max[0] + 5; x += 1) pts.push([x, y0 + amp * Math.sin(x / s * Math.PI)]);
      for (let x = b.max[0] + 5; x >= b.min[0] - 5; x -= 1) pts.push([x, y0 + th + amp * Math.sin(x / s * Math.PI)]);
      cells.push(polygonShape(pts));
    }
  } else return null;
  return CrossSection.union(cells).intersect(zone);
}

const P = v => (v.model === 'custom' ? {
  name: 'A medida', h: v.cH, w: v.cW, d: v.cD, corner: v.cCorner, edge: v.cEdge,
  cam: [v.camSide, v.camTop, v.camOff, v.camW, v.camH, v.camR, v.camBump], buttons: [], jack: null,
} : PHONES[v.model]);

export default {
  id: 'funda-celular',
  title: 'Funda de TPU para celular',
  description: 'Elegí tu celular y diseñá la funda: labio, cámara, botones, esquinas reforzadas y tramas atrás.',
  fileName: v => `funda_${v.model}${v.print === 'test' ? '_prueba' : ''}`,
  params: [
    { type: 'group', label: 'Celular' },
    { key: 'model', type: 'select', label: 'Modelo', default: 'galaxy-a15', options: PHONE_OPTIONS, hint: 'Medidas generales oficiales. Cámara y botones son aproximados: imprimí primero la prueba de calce y ajustá abajo.' },
    { key: 'cH', type: 'number', label: 'Alto del celular', default: 160, min: 100, max: 190, step: 0.1, unit: 'mm', show: v => v.model === 'custom' },
    { key: 'cW', type: 'number', label: 'Ancho', default: 75, min: 50, max: 95, step: 0.1, unit: 'mm', show: v => v.model === 'custom' },
    { key: 'cD', type: 'number', label: 'Espesor (sin la cámara)', default: 8.2, min: 5, max: 14, step: 0.05, unit: 'mm', show: v => v.model === 'custom' },
    { key: 'cCorner', type: 'number', label: 'Radio de las esquinas', default: 9, min: 2, max: 20, step: 0.5, unit: 'mm', show: v => v.model === 'custom' },
    { key: 'cEdge', type: 'number', label: 'Curva del canto', default: 1.5, min: 0, max: 5, step: 0.1, unit: 'mm', show: v => v.model === 'custom', hint: '0 = cantos rectos (tipo iPhone 12); 3 = muy redondeados.' },
    { key: 'camSide', type: 'segment', label: 'Cámara (mirando la espalda)', default: 'L', options: [{ value: 'L', label: 'A la izquierda' }, { value: 'C', label: 'Al centro' }, { value: 'R', label: 'A la derecha' }], show: v => v.model === 'custom' },
    { key: 'camTop', type: 'number', label: 'Cámara: distancia al borde de arriba', default: 6, min: 0, max: 80, step: 0.1, unit: 'mm', show: v => v.model === 'custom' },
    { key: 'camOff', type: 'number', label: 'Cámara: distancia al costado', default: 6, min: 0, max: 60, step: 0.1, unit: 'mm', show: v => v.model === 'custom' && v.camSide !== 'C' },
    { key: 'camW', type: 'number', label: 'Cámara: ancho del módulo', default: 22, min: 5, max: 80, step: 0.1, unit: 'mm', show: v => v.model === 'custom' },
    { key: 'camH', type: 'number', label: 'Cámara: alto del módulo', default: 36, min: 5, max: 80, step: 0.1, unit: 'mm', show: v => v.model === 'custom' },
    { key: 'camR', type: 'number', label: 'Cámara: redondeo', default: 6, min: 0, max: 40, step: 0.5, unit: 'mm', show: v => v.model === 'custom' },
    { key: 'camBump', type: 'number', label: 'Cámara: cuánto sobresale', default: 1.5, min: 0, max: 6, step: 0.1, unit: 'mm', show: v => v.model === 'custom' },

    { type: 'group', label: 'Ajuste fino' },
    { key: 'tol', type: 'number', label: 'Holgura', default: 0.15, min: -0.3, max: 0.8, step: 0.05, unit: 'mm', hint: 'El TPU estira: 0 a 0,2 mm queda firme. Negativo = más apretada.' },
    { key: 'camDx', type: 'number', label: 'Correr el recorte de cámara hacia el centro', default: 0, min: -10, max: 10, step: 0.1, unit: 'mm' },
    { key: 'camDy', type: 'number', label: 'Correr el recorte de cámara hacia abajo', default: 0, min: -10, max: 10, step: 0.1, unit: 'mm' },
    { key: 'camGrow', type: 'number', label: 'Margen alrededor de la cámara', default: 1, min: 0, max: 5, step: 0.1, unit: 'mm' },
    { key: 'btnDy', type: 'number', label: 'Correr los botones hacia abajo', default: 0, min: -15, max: 15, step: 0.1, unit: 'mm' },

    { type: 'group', label: 'Funda' },
    { key: 'wall', type: 'number', label: 'Pared de los costados', default: 1.5, min: 0.8, max: 3, step: 0.1, unit: 'mm' },
    { key: 'back', type: 'number', label: 'Espesor de la espalda', default: 1.6, min: 0.8, max: 4, step: 0.1, unit: 'mm' },
    { key: 'lipH', type: 'number', label: 'Cuánto sobresale sobre la pantalla', default: 0.8, min: 0, max: 3, step: 0.1, unit: 'mm' },
    { key: 'lipIn', type: 'number', label: 'Cuánto abraza el frente', default: 1.8, min: 0.6, max: 4, step: 0.1, unit: 'mm', hint: 'Desde el borde del celular hacia adentro. Más = sostiene mejor.' },
    { key: 'camProtect', type: 'toggle', label: 'Proteger la cámara (espalda más gruesa que el módulo)', default: true },
    { key: 'corners', type: 'toggle', label: 'Esquinas reforzadas (anti-golpes)', default: true },
    { key: 'buttons', type: 'segment', label: 'Botones', default: 'cover', options: [{ value: 'cover', label: 'Cubiertos' }, { value: 'cut', label: 'Recortados' }, { value: 'none', label: 'Sin marcar' }], show: v => v.model !== 'custom' },
    { key: 'bottom', type: 'segment', label: 'Abajo', default: 'ports', options: [{ value: 'ports', label: 'USB + parlante' }, { value: 'usb', label: 'Solo USB' }, { value: 'open', label: 'Abierto' }] },
    { key: 'lanyard', type: 'toggle', label: 'Agujeros para colgante', default: false },

    { type: 'group', label: 'Diseño de la espalda' },
    { key: 'pattern', type: 'select', label: 'Trama', default: 'honey', options: [{ value: 'none', label: 'Lisa' }, { value: 'honey', label: 'Panal de abejas' }, { value: 'diamonds', label: 'Rombos' }, { value: 'dots', label: 'Puntos' }, { value: 'lines', label: 'Líneas diagonales' }, { value: 'waves', label: 'Ondas' }, { value: 'image', label: 'Mi imagen o logo' }] },
    { key: 'pSize', type: 'number', label: 'Tamaño de la trama', default: 8, min: 3, max: 25, step: 0.5, unit: 'mm', show: v => !['none', 'image'].includes(v.pattern) },
    ...imageParams({ label: 'Imagen o logo', showIf: v => v.pattern === 'image' }),
    { key: 'imgSize', type: 'number', label: 'Tamaño de la imagen', default: 0.7, min: 0.2, max: 1, step: 0.05, unit: '×', show: v => v.pattern === 'image' },
    { key: 'text', type: 'text', label: 'Nombre o frase (opcional)', default: '' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => !!(v.text || '').trim() },
    { key: 'textSize', type: 'number', label: 'Alto del texto', default: 14, min: 5, max: 40, step: 0.5, unit: 'mm', show: v => !!(v.text || '').trim() },
    { key: 'mode', type: 'segment', label: 'Cómo va el diseño', default: 'engrave', options: [{ value: 'engrave', label: 'Grabado' }, { value: 'cut', label: 'Calado' }, { value: 'inlay', label: 'En 2 colores' }], show: v => v.pattern !== 'none' || !!(v.text || '').trim(), hint: 'Calado deja ver el celular por los huecos. 2 colores: necesitás dos TPU (la U1 los cambia sola).' },

    { type: 'group', label: 'Impresión' },
    { key: 'print', type: 'segment', label: 'Imprimir', default: 'full', options: [{ value: 'full', label: 'Funda completa' }, { value: 'test', label: 'Prueba de calce' }], hint: 'La prueba es solo la parte de arriba (cámara y botones de arriba): gasta poco y sirve para ajustar.' },
    { key: 'color', type: 'color', label: 'Color de la funda', default: '#4361EE' },
    { key: 'color2', type: 'color', label: 'Color del diseño', default: '#F72585', show: v => v.mode === 'inlay' && (v.pattern !== 'none' || !!(v.text || '').trim()) },
  ],

  async build(v, ctx) {
    const { Manifold } = wasm();
    const ph = P(v);
    if (!ph) throw new Error('Elegí un modelo de celular');
    const tol = v.tol, t = v.wall;
    const W = ph.w, H = ph.h, D = ph.d, R = ph.corner, E = ph.edge;
    const [side, cTop, cOff, cW, cH, cR, bump] = ph.cam;
    const back = v.camProtect ? Math.max(v.back, bump + 0.6) : v.back;

    // Hueco del celular (con holgura) y cuerpo de la funda
    const cavity = roundedBody(W + 2 * tol, H + 2 * tol, R + tol, 0, D + 0.05, E, E);
    const outerW = W + 2 * (tol + t), outerH = H + 2 * (tol + t);
    let body = roundedBody(outerW, outerH, R + tol + t, -back, D + v.lipH, Math.min(E + t, back + 1), 0.6);
    if (v.corners) {
      const k = 0.9, cr = R + tol + t;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const c = [sx * (outerW / 2 - cr), sy * (outerH / 2 - cr)];
        body = body.add(slab(circle(cr + k, 48).translate(c).intersect(roundedRect(outerW + 2 * k, outerH + 2 * k, cr + k)), D + v.lipH - 0.6 - (-back + 0.8), -back + 0.8));
      }
    }
    let cut = cavity;
    // Abertura de la pantalla: el labio abraza el borde
    cut = cut.add(slab(roundedRect(W - 2 * v.lipIn, H - 2 * v.lipIn, Math.max(1, R - v.lipIn)), v.lipH + D * 0.5 + 2, D * 0.5));

    // Cámara (posición dada mirando la espalda: a la izquierda en la espalda = a la derecha visto de frente)
    const cx = side === 'C' ? 0 : (side === 'L' ? 1 : -1) * (W / 2 - cOff - cW / 2 - v.camDx);
    const cy = H / 2 - cTop - cH / 2 - v.camDy;
    const camCut = roundedRect(cW + 2 * v.camGrow, cH + 2 * v.camGrow, Math.min(cR + v.camGrow, (Math.min(cW, cH) + 2 * v.camGrow) / 2 - 0.01)).translate([cx, cy]);
    cut = cut.add(slab(camCut, back + 2, -back - 1));

    // Botones laterales
    const zMid = D / 2;
    if (v.model !== 'custom' && v.buttons !== 'none') {
      for (const [bs, from, len] of ph.buttons || []) {
        const x = (bs === 'L' ? -1 : 1) * (W / 2 + tol), y = H / 2 - from - len / 2 - v.btnDy;
        if (v.buttons === 'cut') {
          cut = cut.add(Manifold.cube([t * 2 + 2, len + 2, Math.min(D * 0.62, 5.5)], true).translate([x + (bs === 'L' ? -t / 2 : t / 2), y, zMid]));
        } else {
          // Cubierto: la pared se afina por dentro y lleva un relieve afuera para encontrar el botón
          cut = cut.add(Manifold.cube([1.2, len + 1, Math.min(D * 0.62, 5)], true).translate([x + (bs === 'L' ? -0.3 : 0.3), y, zMid]));
          body = body.add(Manifold.cube([1.6, len, Math.min(D * 0.5, 4)], true).translate([x + (bs === 'L' ? -(t + 0.4) : t + 0.4), y, zMid]));
        }
      }
    }

    // Abajo: USB-C, parlante y micrófono (o abierto); auricular si tiene
    const yb = -H / 2 - tol, slotZ = Math.min(D - 1.4, 6.6);
    if (v.bottom === 'open') {
      cut = cut.add(Manifold.cube([W - 2 * Math.max(R, 10), t * 2 + 4, D - 1.6], true).translate([0, yb, D / 2 + 0.4]));
    } else {
      cut = cut.add(Manifold.cube([13, t * 2 + 4, slotZ], true).translate([0, yb, zMid]));
      if (v.bottom === 'ports') for (const sx of [-1, 1]) cut = cut.add(Manifold.cube([12, t * 2 + 4, Math.min(3.4, D - 2)], true).translate([sx * 17, yb, zMid]));
    }
    if (ph.jack) {
      const jy = ph.jack.side === 'top' ? H / 2 + tol : yb;
      cut = cut.add(Manifold.cylinder(t * 2 + 4, 3.6, 3.6, 32, true).rotate([90, 0, 0]).translate([ph.jack.x, jy, zMid]));
    }
    if (v.lanyard) for (const dx of [0, 4]) cut = cut.add(Manifold.cylinder(t * 2 + 4, 1, 1, 16, true).rotate([90, 0, 0]).translate([-W / 2 + R + 2 + dx, yb, zMid]));

    let caseSolid = body.subtract(cut);

    // Diseño de la espalda (visto desde atrás: se espeja para leerse bien)
    const zone = roundedRect(W - 10, H - 10, Math.max(1, R - 5)).subtract(camCut.offset(3, 'Round', 2, 24));
    let art = null;
    if (v.pattern === 'image') {
      const zb = zone.bounds();
      art = fitInto(await silhouette(v, ctx, 100), (zb.max[0] - zb.min[0]) * v.imgSize, (zb.max[1] - zb.min[1]) * v.imgSize).mirror([1, 0]).intersect(zone);
    } else if (v.pattern !== 'none') art = patternShape(v.pattern, zone, v.pSize);
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      // El texto va en la mitad de abajo, cortando la trama alrededor para que se lea
      const txt = fitInto(stackLines(String(v.text).split('\n').map(s => ({ font, text: s, height: 10 })), 2), W - 18, v.textSize * (String(v.text).split('\n').length)).translate([0, -H * 0.22]).mirror([1, 0]).intersect(zone);
      art = art ? art.subtract(txt.offset(2.2, 'Round', 2, 16)).add(txt) : txt;
    }
    const parts = [];
    if (art && !art.isEmpty()) {
      const depth = Math.min(0.6, back - 0.8);
      if (v.mode === 'cut') caseSolid = caseSolid.subtract(slab(art, back + 1, -back - 0.5));
      else {
        const a = slab(art, depth, -back);
        caseSolid = caseSolid.subtract(a);
        if (v.mode === 'inlay') parts.push(part('Diseño', v.color2, a));
      }
    }
    // Prueba de calce: solo la parte de arriba (cámara + botones de arriba)
    if (v.print === 'test') {
      const keep = Math.min(H * 0.38, Math.max(45, cTop + cH + 12));
      const box = Manifold.cube([outerW + 10, keep, D + back + v.lipH + 4], false).translate([-(outerW + 10) / 2, H / 2 + tol + t + 2 - keep, -back - 2]);
      caseSolid = caseSolid.intersect(box);
      for (const p of parts) p.solid = p.solid.intersect(box);
    }
    parts.unshift(part('Funda', v.color, caseSolid));
    // Espalda sobre la cama
    const out = parts.filter(p => !p.solid.isEmpty()).map(p => ({ ...p, solid: p.solid.translate([0, 0, back]) }));
    return mergeByColor(out);
  },
};
