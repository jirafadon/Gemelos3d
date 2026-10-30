/**
 * Medidas de celulares y tablets para las fundas.
 *
 * Medidas generales (alto × ancho × espesor) de las fichas técnicas oficiales (GSMArena / Apple).
 * Cámara, botones y puertos son posiciones APROXIMADAS para arrancar: todas se ajustan
 * en la herramienta y conviene imprimir la "prueba de calce" antes de la funda completa.
 *
 * Convenciones (en mm):
 * - Cámara: vista desde ATRÁS. cam = [lado 'L'|'C'|'R', desde arriba, desde el costado, ancho, alto, radio, sobresale]
 *   lado 'L' = la cámara está a la izquierda mirando la espalda.
 * - Botones: vista desde ADELANTE (pantalla hacia vos).
 *   [lado 'L'|'R', desde arriba, largo] en los costados, o [lado 'T'|'B', desde la izquierda, largo] arriba/abajo.
 * - jack: auricular { side: 'top'|'bottom', x desde el centro, vista de frente }.
 * - spen: x del lápiz (Galaxy Ultra), en el borde de abajo, vista de frente.
 * - kind: 'tablet' → parlantes en los dos bordes cortos.
 * - edge: redondeo del canto; corner: radio de las esquinas.
 */

// ---------------- Apple iPhone ----------------
const ipBtn = (h, { cc = false, big = false } = {}) => {
  const k = big ? 1.06 : 1;
  const b = [['L', 18 * k, 8], ['L', 31 * k, 10], ['L', 44 * k, 10], ['R', 40 * k, big ? 18 : 16]];
  if (cc) b.push(['R', h * 0.66, 18]); // Control de la cámara (16 en adelante)
  return b;
};
const ip = (name, h, w, d, corner, edge, cam, opt = {}) => ({ brand: 'Apple', name, h, w, d, corner, edge, cam, buttons: ipBtn(h, opt), jack: null });
const sq = (top, side, s, r, bump) => ['L', top, side, s, s, r, bump];

// ---------------- Samsung ----------------
const sBtn = (top, len = 24, gap = 4, pw = 11) => [['R', top, len], ['R', top + len + gap, pw]];
const sam = (name, h, w, d, corner, edge, cam, buttons, extra = {}) => ({ brand: 'Samsung', name, h, w, d, corner, edge, cam, buttons, jack: null, ...extra });
const sCol = (w = 12, h = 37, bump = 1) => ['L', 7, 6.5, w, h, w / 2, bump]; // tres cámaras en columna
const sUltra = (bump = 1.8) => ['L', 6.5, 6, 26, 47, 8, bump];

// ---------------- Otros ----------------
const side = (top = 38, len = 24, pw = 12) => [['R', top, len], ['R', top + len + 8, pw]];
const mk = (brand, name, h, w, d, cam, extra = {}) => ({ brand, name, h, w, d, corner: 9, edge: 1.8, cam, buttons: side(), jack: null, ...extra });
const jackB = { side: 'bottom', x: -20 }, jackT = { side: 'top', x: 16 };

// ---------------- Tablets ----------------
const tab = (brand, name, h, w, d, corner, cam, buttons) => ({ brand, name, kind: 'tablet', h, w, d, corner, edge: 1, cam, buttons, jack: null });

export const PHONES = {
  // iPhone 18 / 17
  'iphone-18-pro-max': ip('iPhone 18 Pro Max', 163.4, 78, 8.8, 11.5, 2, ['C', 3, 0, 72, 43, 9, 3.6], { cc: true, big: true }),
  'iphone-18-pro': ip('iPhone 18 Pro', 150, 71.9, 8.8, 10.5, 2, ['C', 3, 0, 66, 41, 9, 3.6], { cc: true }),
  'iphone-17-pro-max': ip('iPhone 17 Pro Max', 163.4, 78, 8.75, 11.5, 2, ['C', 3, 0, 72, 43, 9, 3.6], { cc: true, big: true }),
  'iphone-17-pro': ip('iPhone 17 Pro', 150, 71.9, 8.75, 10.5, 2, ['C', 3, 0, 66, 41, 9, 3.6], { cc: true }),
  'iphone-air': ip('iPhone Air', 156.2, 74.7, 5.64, 10.5, 1, ['C', 4, 0, 69, 26, 9, 2.6], { cc: true }),
  'iphone-17': ip('iPhone 17', 149.6, 71.5, 7.95, 10, 1.2, ['L', 5.5, 5.5, 19, 35, 9.5, 2.6], { cc: true }),
  'iphone-17e': ip('iPhone 17e', 146.7, 71.5, 7.8, 9.6, 0.9, sq(6, 6, 15, 5, 1.6)),
  // iPhone 16
  'iphone-16-pro-max': ip('iPhone 16 Pro Max', 163, 77.6, 8.25, 11, 1, sq(4.5, 4.5, 40, 9, 4), { cc: true, big: true }),
  'iphone-16-pro': ip('iPhone 16 Pro', 149.6, 71.5, 8.25, 10.2, 1, sq(4.3, 4.3, 38, 8.5, 4), { cc: true }),
  'iphone-16-plus': ip('iPhone 16 Plus', 160.9, 77.8, 7.8, 11, 1.2, ['L', 5.5, 5.5, 18, 33, 9, 2.6], { cc: true, big: true }),
  'iphone-16': ip('iPhone 16', 147.6, 71.6, 7.8, 9.8, 1.2, ['L', 5.5, 5.5, 18, 33, 9, 2.6], { cc: true }),
  'iphone-16e': ip('iPhone 16e', 146.7, 71.5, 7.8, 9.6, 0.9, sq(6, 6, 15, 5, 1.6)),
  // iPhone 15
  'iphone-15-pro-max': ip('iPhone 15 Pro Max', 159.9, 76.7, 8.25, 10.8, 1, sq(4.3, 4.3, 39, 8.5, 4), { big: true }),
  'iphone-15-pro': ip('iPhone 15 Pro', 146.6, 70.6, 8.25, 10, 1, sq(4.3, 4.3, 37.5, 8.5, 4)),
  'iphone-15-plus': ip('iPhone 15 Plus', 160.9, 77.8, 7.8, 11, 1.2, sq(5, 5, 31.5, 7.5, 2.6), { big: true }),
  'iphone-15': ip('iPhone 15', 147.6, 71.6, 7.8, 9.8, 1.2, sq(5, 5, 31.5, 7.5, 2.6)),
  // iPhone 14
  'iphone-14-pro-max': ip('iPhone 14 Pro Max', 160.7, 77.6, 7.85, 10.8, 0.8, sq(4.5, 4.5, 39.5, 8.5, 4.2), { big: true }),
  'iphone-14-pro': ip('iPhone 14 Pro', 147.5, 71.5, 7.85, 9.8, 0.8, sq(4.5, 4.5, 38.5, 8.5, 4.2)),
  'iphone-14-plus': ip('iPhone 14 Plus', 160.8, 78.1, 7.8, 10.8, 0.8, sq(5, 5, 31, 7.5, 2.4), { big: true }),
  'iphone-14': ip('iPhone 14', 146.7, 71.5, 7.8, 9.6, 0.8, sq(5, 5, 31, 7.5, 2.4)),
  // iPhone 13
  'iphone-13-pro-max': ip('iPhone 13 Pro Max', 160.8, 78.1, 7.65, 10.8, 0.8, sq(4.5, 4.5, 38.5, 8.5, 3.6), { big: true }),
  'iphone-13-pro': ip('iPhone 13 Pro', 146.7, 71.5, 7.65, 9.6, 0.8, sq(4.5, 4.5, 37.5, 8.5, 3.6)),
  'iphone-13': ip('iPhone 13', 146.7, 71.5, 7.65, 9.6, 0.8, sq(5, 5, 30.5, 7.5, 1.8)),
  'iphone-13-mini': ip('iPhone 13 mini', 131.5, 64.2, 7.65, 8.6, 0.8, sq(4.8, 4.8, 28, 7, 1.8)),
  // iPhone 12
  'iphone-12-pro-max': ip('iPhone 12 Pro Max', 160.8, 78.1, 7.4, 10.8, 0.8, sq(5, 5, 35, 8, 1.6), { big: true }),
  'iphone-12-pro': ip('iPhone 12 Pro', 146.7, 71.5, 7.4, 9.6, 0.8, sq(5, 5, 31.5, 7.5, 1.5)),
  'iphone-12': ip('iPhone 12', 146.7, 71.5, 7.4, 9.6, 0.8, sq(5.2, 5.2, 28.5, 7, 1.4)),
  'iphone-12-mini': ip('iPhone 12 mini', 131.5, 64.2, 7.4, 8.6, 0.8, sq(5, 5, 26, 6.5, 1.4)),
  // iPhone 11
  'iphone-11-pro-max': ip('iPhone 11 Pro Max', 158, 77.8, 8.1, 11, 3, sq(5.5, 5.5, 35, 8.5, 1.6), { big: true }),
  'iphone-11-pro': ip('iPhone 11 Pro', 144, 71.4, 8.1, 10, 3, sq(5.5, 5.5, 34, 8.5, 1.6)),
  'iphone-11': ip('iPhone 11', 150.9, 75.7, 8.3, 10.5, 3.2, sq(5.5, 5.5, 31.5, 8, 1.4)),

  // Galaxy S26 / S25 / S24 / S23
  'galaxy-s26-ultra': sam('Galaxy S26 Ultra', 163.6, 78.1, 7.9, 4.5, 0.8, sUltra(2), sBtn(45, 26, 4, 12), { spen: -25 }),
  'galaxy-s26-plus': sam('Galaxy S26+', 158.4, 75.8, 7.3, 10, 1, ['L', 7, 7, 14, 40, 7, 1.8], sBtn(34, 25)),
  'galaxy-s26': sam('Galaxy S26', 149.6, 71.7, 7.2, 9.5, 1, ['L', 7, 7, 13, 38, 6.5, 1.8], sBtn(31)),
  'galaxy-s25-ultra': sam('Galaxy S25 Ultra', 162.8, 77.6, 8.2, 4.5, 0.8, sUltra(1.8), sBtn(45, 26, 4, 12), { spen: -25 }),
  'galaxy-s25-edge': sam('Galaxy S25 Edge', 158.2, 75.6, 5.8, 10, 0.8, ['L', 7, 7, 26, 15, 7.5, 3.5], sBtn(34, 25)),
  'galaxy-s25-plus': sam('Galaxy S25+', 158.4, 75.8, 7.3, 10, 1, sCol(12, 36, 1.3), sBtn(34, 25)),
  'galaxy-s25': sam('Galaxy S25', 146.9, 70.5, 7.2, 9.5, 1, sCol(11.5, 34, 1.3), sBtn(30)),
  'galaxy-s25-fe': sam('Galaxy S25 FE', 161.3, 76.6, 7.4, 9.5, 1.2, sCol(12, 36, 1.3), sBtn(36, 25)),
  'galaxy-s24-ultra': sam('Galaxy S24 Ultra', 162.3, 79, 8.6, 4, 0.8, sUltra(1.6), sBtn(45, 26, 4, 12), { spen: -25 }),
  'galaxy-s24-plus': sam('Galaxy S24+', 158.5, 75.9, 7.7, 10, 1, sCol(12, 36, 1.3), sBtn(34, 25)),
  'galaxy-s24': sam('Galaxy S24', 147, 70.6, 7.6, 9, 1, ['L', 8, 7.5, 11.5, 34, 5.8, 1.3], sBtn(30)),
  'galaxy-s24-fe': sam('Galaxy S24 FE', 162, 77.3, 8, 9.5, 1.2, sCol(12, 36, 1.3), sBtn(36, 25)),
  'galaxy-s23-ultra': sam('Galaxy S23 Ultra', 163.4, 78.1, 8.9, 3, 2.4, sUltra(1.6), sBtn(45, 26, 4, 12), { spen: -25 }),
  'galaxy-s23-plus': sam('Galaxy S23+', 157.8, 76.2, 7.6, 10, 1.4, sCol(12, 36, 1.3), sBtn(34, 25)),
  'galaxy-s23': sam('Galaxy S23', 146.3, 70.9, 7.6, 9, 1.4, ['L', 8, 7.5, 11.5, 34, 5.8, 1.3], sBtn(30)),
  'galaxy-s23-fe': sam('Galaxy S23 FE', 158, 76.5, 8.2, 9.5, 1.4, sCol(12, 36, 1.3), sBtn(35, 25)),
  // Galaxy A
  'galaxy-a57': sam('Galaxy A57', 161.5, 76.8, 6.9, 9.5, 1.2, sCol(13, 39, 1.3), sBtn(36, 26, 4, 12)),
  'galaxy-a56': sam('Galaxy A56', 162.2, 77.5, 7.4, 9.5, 1.4, ['L', 6.5, 6, 18, 41, 8, 1.4], sBtn(36, 26, 4, 12)),
  'galaxy-a55': sam('Galaxy A55', 161.1, 77.4, 8.2, 9.5, 1.4, sCol(13, 38, 1.2), sBtn(36, 26, 4, 12)),
  'galaxy-a37': sam('Galaxy A37', 162.9, 78.2, 7.4, 9.5, 1.4, sCol(13, 39, 1.3), sBtn(36, 26, 4, 12)),
  'galaxy-a36': sam('Galaxy A36', 162.9, 78.2, 7.4, 9.5, 1.4, ['L', 6.5, 6, 18, 41, 8, 1.4], sBtn(36, 26, 4, 12)),
  'galaxy-a35': sam('Galaxy A35', 161.7, 78, 8.2, 9.5, 1.6, sCol(13, 38, 1.2), sBtn(36, 26, 4, 12)),
  'galaxy-a26': sam('Galaxy A26', 164, 77.5, 7.7, 9, 1.6, ['L', 6.5, 6, 18, 41, 8, 1.4], sBtn(36, 25, 4, 12)),
  'galaxy-a25': sam('Galaxy A25', 161, 76.5, 8.3, 9, 1.6, sCol(12, 37, 1), sBtn(36, 25, 4, 12)),
  'galaxy-a17': sam('Galaxy A17', 164.4, 77.9, 7.5, 9, 1.6, sCol(12, 38, 1), sBtn(36, 25, 4, 12)),
  'galaxy-a16': sam('Galaxy A16', 164.4, 77.9, 7.9, 9, 1.6, sCol(12, 38, 1), sBtn(36, 25, 4, 12)),
  'galaxy-a15': sam('Galaxy A15', 160.1, 76.8, 8.4, 9, 1.6, sCol(12, 37, 1), sBtn(36, 25, 4, 12)),
  'galaxy-a07': sam('Galaxy A07', 167.4, 77.4, 7.6, 9, 1.8, sCol(12, 30, 0.9), sBtn(38, 25, 4, 12), { jack: { side: 'bottom', x: -18 } }),
  'galaxy-a05s': sam('Galaxy A05s', 168, 77.8, 8.8, 9, 2, ['L', 7, 6.5, 12, 38, 6, 0.9], sBtn(38, 26, 4, 12), { jack: { side: 'bottom', x: -18 } }),

  // Motorola
  'moto-edge-70': mk('Motorola', 'Edge 70', 159.9, 74, 6, ['L', 6, 6, 30, 30, 8, 2.4], { edge: 1.4 }),
  'moto-edge-70-fusion': mk('Motorola', 'Edge 70 Fusion', 162.8, 75.6, 7.2, ['L', 6, 6, 30, 30, 8, 2], { edge: 2.6 }),
  'moto-edge-60': mk('Motorola', 'Edge 60', 161.2, 73.1, 7.9, ['L', 6, 6, 30, 30, 8, 1.8], { edge: 2.6 }),
  'moto-edge-60-fusion': mk('Motorola', 'Edge 60 Fusion', 161, 73, 8, ['L', 6, 6, 29, 29, 8, 1.8], { edge: 2.6 }),
  'moto-g-2026': mk('Motorola', 'Moto G (2026)', 167.2, 76.4, 8.5, ['L', 6, 6, 24, 38, 7, 1.5], { jack: jackB }),
  'moto-g86': mk('Motorola', 'Moto G86', 161.2, 74.7, 7.8, ['L', 6, 6, 26, 38, 7, 1.6], { edge: 2.4 }),
  'moto-g56': mk('Motorola', 'Moto G56', 165.8, 76.3, 8.4, ['L', 6, 6, 24, 38, 7, 1.5], { jack: jackB }),
  'moto-g35': mk('Motorola', 'Moto G35', 166.3, 76, 7.8, ['L', 6, 6, 23, 37, 7, 1.5], { jack: jackB }),
  'moto-g15': mk('Motorola', 'Moto G15', 165.7, 76, 8.2, ['L', 6, 6, 23, 37, 7, 1.5], { jack: jackB }),
  'moto-g06': mk('Motorola', 'Moto G06', 171.4, 77.5, 8.3, ['L', 6, 6, 23, 38, 7, 1.5], { jack: jackB }),
  'moto-g84': mk('Motorola', 'Moto G84', 160, 74.4, 7.6, ['L', 5.5, 5.5, 24, 38, 7, 1.6], { edge: 2.4, jack: jackB }),
  'moto-g54': mk('Motorola', 'Moto G54', 161.6, 73.8, 8, ['L', 6, 6, 22, 37, 7, 1.5], { edge: 2.2, jack: jackB }),
  'moto-g24': mk('Motorola', 'Moto G24', 163.49, 74.53, 7.99, ['L', 6, 6, 23, 40, 7, 1.5], { edge: 2.2, jack: jackB }),

  // Xiaomi
  'redmi-note-15-pro': mk('Xiaomi', 'Redmi Note 15 Pro', 163.6, 78.1, 8, ['L', 6, 6, 32, 32, 9, 2], { buttons: side(38, 22), edge: 1.6 }),
  'redmi-note-15': mk('Xiaomi', 'Redmi Note 15', 164, 75.4, 7.4, ['L', 6, 6, 28, 30, 8, 1.8], { buttons: side(38, 22), jack: jackT }),
  'redmi-15c': mk('Xiaomi', 'Redmi 15C', 171.6, 79.5, 8, ['L', 6, 6, 34, 42, 8, 1.6], { buttons: side(40, 22), jack: jackB }),
  'redmi-note-13': mk('Xiaomi', 'Redmi Note 13', 162.24, 75.55, 7.97, ['L', 6, 6, 25, 38, 6, 1.6], { buttons: side(38, 22), edge: 1.2, jack: jackT }),
  'redmi-13c': mk('Xiaomi', 'Redmi 13C', 168, 78, 8.1, ['L', 6, 6, 32, 42, 6, 1.6], { buttons: side(40, 22), edge: 1.6, jack: jackB }),

  // LG (dejó de fabricar celulares en 2021: los últimos que más se usan acá)
  'lg-k62': mk('LG', 'K62', 165, 76.7, 8.4, ['L', 7, 7, 24, 24, 6, 1.2], { buttons: [['L', 40, 24], ['R', 50, 14]], jack: { side: 'bottom', x: -16 } }),
  'lg-k52': mk('LG', 'K52', 165, 76.7, 8.4, ['L', 7, 7, 24, 24, 6, 1.2], { buttons: [['L', 40, 24], ['R', 50, 14]], jack: { side: 'bottom', x: -16 } }),
  'lg-k42': mk('LG', 'K42', 165, 76.7, 8.4, ['L', 7, 7, 24, 24, 6, 1.2], { buttons: [['L', 40, 24], ['R', 50, 14]], jack: { side: 'bottom', x: -16 } }),

  // Tablets (vista de frente en vertical)
  'ipad-a16': tab('Apple', 'iPad 11" (A16, 2025)', 248.6, 179.5, 7, 17, sq(7, 7, 11, 5.5, 1), [['T', 179.5 - 28, 16], ['T', 179.5 - 62, 26]]),
  'ipad-10': tab('Apple', 'iPad 10.ª gen (2022)', 248.6, 179.5, 7, 17, sq(7, 7, 11, 5.5, 1), [['T', 179.5 - 28, 16], ['T', 179.5 - 62, 26]]),
  'ipad-air-11': tab('Apple', 'iPad Air 11" (M2 / M3)', 247.6, 178.5, 6.1, 17, sq(7, 7, 11, 5.5, 1), [['T', 178.5 - 28, 16], ['R', 22, 30]]),
  'ipad-pro-11': tab('Apple', 'iPad Pro 11" (M4 / M5)', 249.7, 177.5, 5.3, 16, sq(6, 6, 24, 8, 1.4), [['T', 177.5 - 28, 16], ['R', 22, 30]]),
  'ipad-mini-7': tab('Apple', 'iPad mini (A17 Pro, 2024)', 195.4, 134.8, 6.3, 15, sq(7, 7, 11, 5.5, 1), [['T', 134.8 - 26, 16], ['T', 20, 26]]),
  'tab-a11-plus': tab('Samsung', 'Galaxy Tab A11+', 257.1, 168.7, 6.9, 14, sq(8, 8, 10, 5, 0.6), [['R', 22, 14], ['R', 42, 24]]),
  'tab-a9-plus': tab('Samsung', 'Galaxy Tab A9+', 257.1, 168.7, 6.9, 14, sq(8, 8, 10, 5, 0.6), [['R', 22, 14], ['R', 42, 24]]),
  'tab-a11': tab('Samsung', 'Galaxy Tab A11 (8.7")', 211, 124.7, 8, 12, sq(8, 8, 10, 5, 0.6), [['R', 22, 14], ['R', 42, 24]]),
  'tab-s10-fe': tab('Samsung', 'Galaxy Tab S10 FE', 254.3, 165.8, 6, 12, ['L', 8, 8, 10, 24, 5, 0.8], [['R', 22, 14], ['R', 42, 24]]),
};

export const BRANDS = ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'LG'];

export const PHONE_OPTIONS = [
  { value: 'custom', label: 'A medida (cargo las medidas)' },
  ...BRANDS.flatMap(b => Object.entries(PHONES).filter(([, p]) => p.brand === b && p.kind !== 'tablet').map(([value, p]) => ({ value, label: `${p.brand === 'Apple' ? '' : p.brand + ' '}${p.name}`, group: p.brand === 'Apple' ? 'iPhone' : p.brand }))),
  ...Object.entries(PHONES).filter(([, p]) => p.kind === 'tablet').map(([value, p]) => ({ value, label: p.name, group: 'Tablets' })),
];
