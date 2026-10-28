/**
 * Códigos QR como formas 2D (en mm).
 */
import qrcode from 'qrcode-generator';
import { wasm } from './geom.js';
import { track } from './gc.js';

// Acentos y ñ: el QR tiene que ir en UTF-8 para que los celulares lo lean bien.
const utf8 = new TextEncoder();
qrcode.stringToBytes = s => Array.from(utf8.encode(s));

/**
 * @param text  contenido del QR
 * @param size  lado total en mm (sin margen)
 * @param ecc   corrección de errores: 'L' | 'M' | 'Q' | 'H'
 * @returns { shape, modules, moduleSize }  shape = módulos oscuros centrados en el origen
 */
export function qrShape(text, size = 40, ecc = 'M') {
  const { CrossSection } = wasm();
  const q = qrcode(0, ecc);
  q.addData(String(text || ' '), 'Byte');
  q.make();
  const n = q.getModuleCount();
  const m = size / n;
  const e = Math.min(0.03, m * 0.02); // solapamiento mínimo para que los módulos en diagonal queden unidos
  const polys = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!q.isDark(r, c)) { c++; continue; }
      const start = c;
      while (c < n && q.isDark(r, c)) c++;
      const x0 = -size / 2 + start * m - e, x1 = -size / 2 + c * m + e;
      const y1 = size / 2 - r * m + e, y0 = size / 2 - (r + 1) * m - e;
      polys.push([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    }
  }
  return { shape: track(new CrossSection(polys, 'NonZero')), modules: n, moduleSize: m };
}

/** Contenido para conectarse a una red WiFi. */
export function wifiPayload(ssid, password, security = 'WPA', hidden = false) {
  const esc = s => String(s || '').replace(/([\\;,:"])/g, '\\$1');
  const t = security === 'nopass' ? 'nopass' : security;
  return `WIFI:T:${t};S:${esc(ssid)};${t !== 'nopass' ? `P:${esc(password)};` : ''}${hidden ? 'H:true;' : ''};`;
}

/** Enlace a un perfil según la red. */
export function socialUrl(network, user) {
  const u = String(user || '').trim().replace(/^@/, '');
  switch (network) {
    case 'instagram': return `https://instagram.com/${u}`;
    case 'tiktok': return `https://tiktok.com/@${u}`;
    case 'youtube': return `https://youtube.com/@${u}`;
    case 'facebook': return `https://facebook.com/${u}`;
    case 'whatsapp': return `https://wa.me/${u.replace(/\D/g, '')}`;
    case 'x': return `https://x.com/${u}`;
    default: return u;
  }
}
