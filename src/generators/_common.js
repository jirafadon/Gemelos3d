/**
 * Bloques de parámetros reutilizados por varios generadores,
 * para que todos se vean y se comporten igual.
 */

export const colorsParams = ({ max = 3, def = 2, base = '#1D4ED8', mid = '#F5F5F5', text = '#F5F5F5', baseLabel = 'Fondo / contorno' } = {}) => [
  { type: 'group', label: 'Colores' },
  { key: 'colors', type: 'segment', label: 'Cantidad de colores', default: def, options: [1, 2, 3].slice(0, max).map(n => ({ value: n, label: String(n) })) },
  { key: 'cBase', type: 'color', label: baseLabel, default: base },
  ...(max >= 3 ? [{ key: 'cMid', type: 'color', label: 'Contorno medio', default: mid, show: v => v.colors === 3 }] : []),
  { key: 'cText', type: 'color', label: 'Texto', default: text, show: v => v.colors >= 2 },
];

export const modeParam = () => ({
  key: 'mode', type: 'segment', label: 'Texto', default: 'raised',
  options: [{ value: 'raised', label: 'En relieve' }, { value: 'flush', label: 'Al ras' }],
  show: v => v.colors >= 2, hint: 'Al ras: el texto queda embutido y la cara de arriba es plana.',
});

export const thicknessParams = ({ base = 3, mid = 0.8, relief = 1, maxBase = 12 } = {}) => [
  { type: 'group', label: 'Espesores' },
  { key: 'hBase', type: 'number', label: 'Base', default: base, min: 1.2, max: maxBase, step: 0.2, unit: 'mm' },
  { key: 'hMid', type: 'number', label: 'Capa media', default: mid, min: 0.4, max: 4, step: 0.2, unit: 'mm', show: v => v.colors === 3 },
  { key: 'hText', type: 'number', label: 'Relieve del texto', default: relief, min: 0.4, max: 5, step: 0.2, unit: 'mm' },
];

export const ringParams = ({ def = 'left', options = ['left', 'top', 'right', 'none'] } = {}) => {
  const labels = { left: 'Izquierda', top: 'Arriba', right: 'Derecha', none: 'Sin argolla' };
  return [
    { type: 'group', label: 'Argolla' },
    { key: 'ring', type: 'segment', label: 'Posición', default: def, options: options.map(o => ({ value: o, label: labels[o] })) },
    { key: 'holeD', type: 'number', label: 'Diámetro del agujero', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm', show: v => v.ring !== 'none' },
    { key: 'ringWall', type: 'number', label: 'Ancho del aro', default: 2.5, min: 1.2, max: 6, step: 0.1, unit: 'mm', show: v => v.ring !== 'none' },
  ];
};

/** Crea una variante de un generador con otro nombre y otros valores por defecto. */
export function preset(base, { id, title, description, defaults = {}, hide = [] }) {
  return {
    ...base,
    id, title, description: description || base.description,
    // Los campos ocultos se mantienen (sin mostrarse) para que su valor siga existiendo:
    // si no, los demás campos que dependen de ellos (ej.: "tipo = redes") no aparecerían.
    params: base.params
      .map(p => (p.key && p.key in defaults ? { ...p, default: defaults[p.key] } : p))
      .map(p => (hide.includes(p.key) ? { ...p, show: () => false } : p)),
    build: (v, ctx) => base.build({ ...Object.fromEntries(base.params.filter(p => p.key).map(p => [p.key, p.key in defaults ? defaults[p.key] : p.default])), ...v }, ctx),
  };
}

/** Nombre corto para el archivo exportado. */
export const firstLine = (...texts) => (texts.find(t => t && String(t).trim()) || 'modelo').split('\n')[0];

// ---------- Imagen ----------
import { maskToShape, sampleMask } from '../engine/trace.js';

export const imageParams = ({ label = 'Imagen', showIf } = {}) => [
  { key: 'image', type: 'image', label, default: '', show: showIf, hint: 'Mientras no subas nada se muestra un ejemplo.' },
  { key: 'threshold', type: 'number', label: 'Sensibilidad', default: 128, min: 20, max: 240, step: 1, unit: '', show: showIf, hint: 'Subila si faltan partes claras del dibujo; bajala si aparece el fondo.' },
  { key: 'invert', type: 'toggle', label: 'Invertir (tomar lo claro)', default: false, show: showIf },
  { key: 'smooth', type: 'number', label: 'Suavizado de bordes', default: 0.4, min: 0, max: 2, step: 0.1, unit: 'mm', show: showIf },
  { key: 'detail', type: 'segment', label: 'Detalle', default: 320, show: showIf, options: [{ value: 200, label: 'Rápido' }, { value: 320, label: 'Normal' }, { value: 520, label: 'Alto' }] },
];

/** Silueta de la imagen subida (o del ejemplo) con el ancho pedido en mm. */
export async function silhouette(v, ctx, width, { fill = false } = {}) {
  const mask = v.image && ctx.image
    ? await ctx.image(v.image, { threshold: v.threshold, invert: v.invert, maxPx: v.detail })
    : sampleMask();
  return maskToShape(mask, { width, smooth: v.smooth ?? 0.4, fill, minArea: Math.max(0.5, width * width * 0.0004) });
}

/**
 * Acomodar el texto sobre la forma: tamaño, centrar y mover con flechas.
 * Va al final del grupo de texto de cada herramienta.
 */
export const textPlaceParams = ({ showIf, label = 'Acomodar el texto' } = {}) => [
  { type: 'group', label },
  { key: 'tScale', type: 'number', label: 'Tamaño del texto', default: 100, min: 30, max: 200, step: 5, unit: '%', show: showIf },
  { key: 'tDx', type: 'nudge', keyY: 'tDy', keyC: 'tCenter', label: 'Posición', default: 0, step: 0.5, show: showIf },
  { key: 'tDy', type: 'number', label: 'Y', default: 0, min: -200, max: 200, step: 0.5, show: () => false },
  { key: 'tCenter', type: 'toggle', label: 'Centrado', default: false, show: () => false },
];

/**
 * Aplica tamaño, centrado y corrimiento a un texto 2D.
 * @param cs    texto (CrossSection) ya ubicado donde lo pone la herramienta
 * @param shape forma de referencia para "Centrar" (su centro)
 */
export function placeText(cs, v, shape = null) {
  if (!cs || cs.isEmpty()) return cs;
  const b = cs.bounds(), c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
  const k = Math.max(0.05, (v.tScale ?? 100) / 100);
  let out = k !== 1 ? cs.translate([-c[0], -c[1]]).scale([k, k]).translate(c) : cs;
  if (v.tCenter && shape && !shape.isEmpty()) {
    const sb = shape.bounds();
    out = out.translate([(sb.min[0] + sb.max[0]) / 2 - c[0], (sb.min[1] + sb.max[1]) / 2 - c[1]]);
  }
  const dx = +v.tDx || 0, dy = +v.tDy || 0;
  return dx || dy ? out.translate([dx, dy]) : out;
}
