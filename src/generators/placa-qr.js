/**
 * Placa con código QR: link, WiFi o redes, con título, texto y base para pararla.
 * Base de: placa Mercado Pago, WiFi, redes, Google y tarjeta.
 */
import { roundedRect, circle, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines, slotBase, placeBelow } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { qrShape, wifiPayload, socialUrl } from '../engine/qr.js';
import { firstLine } from './_common.js';

export const NETWORKS = [
  { value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' }, { value: 'youtube', label: 'YouTube' },
  { value: 'whatsapp', label: 'WhatsApp' }, { value: 'facebook', label: 'Facebook' }, { value: 'x', label: 'X' },
];

/** Cómo se imprime el usuario debajo del QR: @usuario, o el número de WhatsApp. */
export function socialLabel(network, user) {
  const u = String(user || '').trim().replace(/^@/, '');
  if (!u) return '';
  return network === 'whatsapp' ? u : `@${u}`;
}

export function payloadOf(v) {
  if (v.kind === 'wifi') return wifiPayload(v.ssid, v.pass, v.security);
  if (v.kind === 'social') return socialUrl(v.network, v.user);
  return v.link || ' ';
}

/** Bloque QR: módulos oscuros + fondo claro con margen de silencio. */
export function qrBlock(text, size, ecc) {
  const { shape, moduleSize } = qrShape(text, size, ecc);
  const quiet = Math.max(2.5, moduleSize * 2);
  return { dark: shape, pad: roundedRect(size + 2 * quiet, size + 2 * quiet, Math.min(3, quiet)), outer: size + 2 * quiet };
}

export const contentParams = (def = 'link') => [
  { type: 'group', label: 'Contenido del QR' },
  { key: 'kind', type: 'segment', label: 'Tipo', default: def, options: [{ value: 'link', label: 'Link o texto' }, { value: 'wifi', label: 'WiFi' }, { value: 'social', label: 'Redes' }] },
  { key: 'link', type: 'text', label: 'Link o texto (es lo que abre el QR)', default: 'https://gemelos3d.com.ar', show: v => v.kind === 'link' },
  { key: 'ssid', type: 'text', label: 'Nombre de la red', default: 'MiWiFi', show: v => v.kind === 'wifi' },
  { key: 'pass', type: 'text', label: 'Contraseña', default: 'clave1234', show: v => v.kind === 'wifi' && v.security !== 'nopass' },
  { key: 'security', type: 'segment', label: 'Seguridad', default: 'WPA', options: [{ value: 'WPA', label: 'WPA/WPA2' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'Abierta' }], show: v => v.kind === 'wifi' },
  { key: 'network', type: 'select', label: 'Red', default: 'instagram', options: NETWORKS, show: v => v.kind === 'social' },
  { key: 'user', type: 'text', label: 'Tu usuario (es lo que abre el QR)', default: '@3dgemelos', show: v => v.kind === 'social',
    hint: v => `El QR abre: ${socialUrl(v.network, v.user)}${v.network === 'whatsapp' ? ' · Número con código de país, ej. 5491155555555.' : ''}` },
  { key: 'ecc', type: 'segment', label: 'Resistencia a errores', default: 'M', options: [{ value: 'L', label: 'Baja' }, { value: 'M', label: 'Media' }, { value: 'Q', label: 'Alta' }, { value: 'H', label: 'Máx.' }], hint: 'Más alta = más cuadraditos, pero se sigue leyendo aunque se raye.' },
];

export default {
  id: 'placa-qr',
  title: 'Placa QR',
  description: 'QR con título y texto sobre placa con soporte.',
  fileName: v => `qr_${firstLine(v.title, v.ssid, v.user, 'placa')}`,
  params: [
    ...contentParams('link'),
    { type: 'group', label: 'Textos' },
    { key: 'title', type: 'text', label: 'Título', default: 'Escaneá y visitanos' },
    { key: 'titleFont', type: 'font', label: 'Tipografía del título', default: 'poppins' },
    { key: 'autoUser', type: 'toggle', label: 'Abajo: mostrar tu usuario', default: true, show: v => v.kind === 'social', hint: 'Así el texto impreso y el QR siempre coinciden.' },
    { key: 'sub', type: 'text', label: 'Texto de abajo', default: 'gemelos3d.com.ar', multiline: true, show: v => !(v.kind === 'social' && v.autoUser) && !(v.kind === 'wifi' && v.autoSub) },
    { key: 'subFont', type: 'font', label: 'Tipografía del texto de abajo', default: 'poppins' },
    { key: 'autoSub', type: 'toggle', label: 'Abajo: mostrar la red y la clave', default: true, show: v => v.kind === 'wifi' },

    { type: 'group', label: 'Placa' },
    { key: 'qrSize', type: 'number', label: 'Tamaño del QR', default: 50, min: 20, max: 140, step: 1, unit: 'mm', hint: 'Menos de 30 mm puede costar leerlo con la boquilla de 0,4.' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'rect', options: [{ value: 'rect', label: 'Rectángulo' }, { value: 'arch', label: 'Arco' }] },
    { key: 'margin', type: 'number', label: 'Margen', default: 7, min: 3, max: 25, step: 0.5, unit: 'mm' },

    { type: 'group', label: 'Colores' },
    { key: 'colors', type: 'segment', label: 'Cantidad de colores', default: 3, options: [{ value: 2, label: '2' }, { value: 3, label: '3' }] },
    { key: 'cBase', type: 'color', label: 'Placa', default: '#1D4ED8' },
    { key: 'cLight', type: 'color', label: 'Fondo del QR y textos', default: '#F5F5F5', show: v => v.colors === 3 },
    { key: 'cDark', type: 'color', label: 'Cuadraditos del QR', default: '#1E1E1E' },

    { type: 'group', label: 'Espesores y base' },
    { key: 'hBase', type: 'number', label: 'Placa', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'hLayer', type: 'number', label: 'Capas de color', default: 0.6, min: 0.2, max: 2, step: 0.2, unit: 'mm' },
    { key: 'stand', type: 'toggle', label: 'Base con ranura para pararla', default: true },
    { key: 'tol', type: 'number', label: 'Holgura de la ranura', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm', show: v => v.stand },
  ],

  async build(v, ctx) {
    const [tf, sf] = await Promise.all([ctx.font(v.titleFont), ctx.font(v.subFont)]);
    const S = v.qrSize;
    const qr = qrBlock(payloadOf(v), S, v.ecc);
    const W = qr.outer;
    let subText = v.sub || '';
    if (v.kind === 'wifi' && v.autoSub) subText = `Red: ${v.ssid}${v.security !== 'nopass' ? `\nClave: ${v.pass}` : ''}`;
    if (v.kind === 'social' && v.autoUser) subText = socialLabel(v.network, v.user);

    const pieces = []; // [shape, alto] de arriba hacia abajo
    if ((v.title || '').trim()) pieces.push(fitInto(stackLines(String(v.title).split('\n').map(t => ({ font: tf, text: t, height: 10 })), 1.5), W, S * 0.22));
    pieces.push('QR');
    if (subText.trim()) pieces.push(fitInto(stackLines(subText.split('\n').map(t => ({ font: sf, text: t, height: 10 })), 2), W, S * 0.2));

    const gap = 4;
    const heights = pieces.map(p => (p === 'QR' ? W : (p.bounds().max[1] - p.bounds().min[1])));
    const total = heights.reduce((a, b) => a + b, 0) + gap * (pieces.length - 1);
    let y = total / 2;
    let text = null, padPos = null;
    pieces.forEach((p, i) => {
      const h = heights[i], cy = y - h / 2;
      if (p === 'QR') padPos = cy;
      else { const b = p.bounds(); const s = p.translate([0, cy - (b.min[1] + b.max[1]) / 2]); text = text ? text.add(s) : s; }
      y -= h + gap;
    });
    const pad = qr.pad.translate([0, padPos]), dark = qr.dark.translate([0, padPos]);

    const pw = W + 2 * v.margin, ph = total + 2 * v.margin;
    let plate = roundedRect(pw, ph, 6);
    if (v.shape === 'arch') {
      const r = pw / 2;
      plate = roundedRect(pw, ph, 0).add(circle(r, 128).translate([0, ph / 2]));
      plate = plate.intersect(roundedRect(pw, ph + r * 2, 0).translate([0, r]));
    }

    const h = v.hBase, L = v.hLayer;
    const light = v.colors === 3 ? v.cLight : null;
    const parts = [part('Placa', v.cBase, slab(plate, h))];
    if (light) {
      parts.push(part('Fondo QR', light, slab(pad, L, h)));
      parts.push(part('QR', v.cDark, slab(dark, L, h + L)));
      if (text) parts.push(part('Textos', light, slab(text, L * 1.5, h)));
    } else {
      parts.push(part('QR', v.cDark, slab(dark, L, h)));
      if (text) parts.push(part('Textos', v.cDark, slab(text, L * 1.5, h)));
    }
    if (v.stand) {
      const all = parts.reduce((a, p) => (a ? a.add(p.solid) : p.solid), null);
      const base = slotBase({ length: pw + 16, slotLength: pw + 0.6, plate: h, tol: v.tol, depth: Math.max(18, h * 5), height: 12, slotDepth: 6, color: v.cBase });
      parts.push(part('Base', v.cBase, placeBelow(base.solid, all, 10)));
    }
    return mergeByColor(parts);
  },
};
