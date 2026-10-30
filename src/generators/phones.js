/**
 * Medidas de celulares para las fundas.
 *
 * Medidas generales (alto × ancho × espesor) de las fichas técnicas oficiales.
 * Cámara, botones y puertos son posiciones APROXIMADAS para arrancar: todas se ajustan
 * en la herramienta y conviene imprimir la "prueba de calce" antes de la funda completa.
 *
 * Convenciones (en mm):
 * - Cámara: vista desde ATRÁS del celular. cam = [lado, desde arriba, desde el costado, ancho, alto, radio, sobresale]
 *   lado 'L' = la cámara está a la izquierda mirando la espalda del celular.
 * - Botones: vista desde ADELANTE (pantalla hacia vos). [lado 'L'|'R', desde arriba, largo]
 * - edge: redondeo del canto (cuánto se curva el borde lateral); corner: radio de las esquinas.
 */
export const PHONES = {
  // ---------------- Apple ----------------
  'iphone-11': { brand: 'Apple', name: 'iPhone 11', h: 150.9, w: 75.7, d: 8.3, corner: 10.5, edge: 3.2, cam: ['L', 5.5, 5.5, 31.5, 31.5, 8, 1.4], buttons: [['L', 18, 7], ['L', 33, 10], ['L', 46, 10], ['R', 42, 17]], jack: null },
  'iphone-12': { brand: 'Apple', name: 'iPhone 12', h: 146.7, w: 71.5, d: 7.4, corner: 9.6, edge: 0.8, cam: ['L', 5.2, 5.2, 28.5, 28.5, 7, 1.4], buttons: [['L', 18, 7], ['L', 31, 10], ['L', 44, 10], ['R', 40, 16]], jack: null },
  'iphone-13': { brand: 'Apple', name: 'iPhone 13', h: 146.7, w: 71.5, d: 7.65, corner: 9.6, edge: 0.8, cam: ['L', 5, 5, 30.5, 30.5, 7.5, 1.8], buttons: [['L', 18, 7], ['L', 31, 10], ['L', 44, 10], ['R', 40, 16]], jack: null },
  'iphone-14': { brand: 'Apple', name: 'iPhone 14', h: 146.7, w: 71.5, d: 7.8, corner: 9.6, edge: 0.8, cam: ['L', 5, 5, 31, 31, 7.5, 2.4], buttons: [['L', 18, 7], ['L', 31, 10], ['L', 44, 10], ['R', 40, 16]], jack: null },
  'iphone-15': { brand: 'Apple', name: 'iPhone 15', h: 147.6, w: 71.6, d: 7.8, corner: 9.8, edge: 1.2, cam: ['L', 5, 5, 31.5, 31.5, 7.5, 2.6], buttons: [['L', 18, 7], ['L', 31, 10], ['L', 44, 10], ['R', 40, 16]], jack: null },
  'iphone-15-pro': { brand: 'Apple', name: 'iPhone 15 Pro', h: 146.6, w: 70.6, d: 8.25, corner: 10, edge: 1, cam: ['L', 4.3, 4.3, 37.5, 37.5, 8.5, 4], buttons: [['L', 18, 7], ['L', 31, 10], ['L', 44, 10], ['R', 40, 16]], jack: null },
  'iphone-16': { brand: 'Apple', name: 'iPhone 16', h: 147.6, w: 71.6, d: 7.8, corner: 9.8, edge: 1.2, cam: ['L', 5.5, 5.5, 18, 33, 9, 2.6], buttons: [['L', 18, 7], ['L', 31, 10], ['L', 44, 10], ['R', 40, 16], ['R', 100, 18]], jack: null },
  'iphone-16-pro': { brand: 'Apple', name: 'iPhone 16 Pro', h: 149.6, w: 71.5, d: 8.25, corner: 10.2, edge: 1, cam: ['L', 4.3, 4.3, 38, 38, 8.5, 4], buttons: [['L', 18, 7], ['L', 31, 10], ['L', 44, 10], ['R', 40, 16], ['R', 100, 18]], jack: null },
  // ---------------- Samsung ----------------
  'galaxy-a05s': { brand: 'Samsung', name: 'Galaxy A05s', h: 168, w: 77.8, d: 8.8, corner: 9, edge: 2, cam: ['L', 7, 6.5, 12, 38, 6, 0.9], buttons: [['R', 38, 26], ['R', 68, 12]], jack: { side: 'bottom', x: -18 } },
  'galaxy-a15': { brand: 'Samsung', name: 'Galaxy A15', h: 160.1, w: 76.8, d: 8.4, corner: 9, edge: 1.6, cam: ['L', 7, 6.5, 12, 37, 6, 1], buttons: [['R', 36, 25], ['R', 66, 12]], jack: null },
  'galaxy-a25': { brand: 'Samsung', name: 'Galaxy A25', h: 161, w: 76.5, d: 8.3, corner: 9, edge: 1.6, cam: ['L', 7, 6.5, 12, 37, 6, 1], buttons: [['R', 36, 25], ['R', 66, 12]], jack: null },
  'galaxy-a35': { brand: 'Samsung', name: 'Galaxy A35', h: 161.7, w: 78, d: 8.2, corner: 9.5, edge: 1.6, cam: ['L', 7, 6.5, 13, 38, 6.5, 1.2], buttons: [['R', 36, 26], ['R', 68, 12]], jack: null },
  'galaxy-a55': { brand: 'Samsung', name: 'Galaxy A55', h: 161.1, w: 77.4, d: 8.2, corner: 9.5, edge: 1.4, cam: ['L', 7, 6.5, 13, 38, 6.5, 1.2], buttons: [['R', 36, 26], ['R', 68, 12]], jack: null },
  'galaxy-s24': { brand: 'Samsung', name: 'Galaxy S24', h: 147, w: 70.6, d: 7.6, corner: 9, edge: 1, cam: ['L', 8, 7.5, 11.5, 34, 5.8, 1.3], buttons: [['R', 30, 24], ['R', 58, 11]], jack: null },
  // ---------------- Motorola ----------------
  'moto-g24': { brand: 'Motorola', name: 'Moto G24', h: 163.49, w: 74.53, d: 7.99, corner: 9, edge: 2.2, cam: ['L', 6, 6, 23, 40, 7, 1.5], buttons: [['R', 38, 24], ['R', 70, 12]], jack: { side: 'bottom', x: -20 } },
  'moto-g54': { brand: 'Motorola', name: 'Moto G54', h: 161.6, w: 73.8, d: 8, corner: 9, edge: 2.2, cam: ['L', 6, 6, 22, 37, 7, 1.5], buttons: [['R', 38, 24], ['R', 70, 12]], jack: { side: 'bottom', x: -20 } },
  'moto-g84': { brand: 'Motorola', name: 'Moto G84', h: 160, w: 74.4, d: 7.6, corner: 9, edge: 2.4, cam: ['L', 5.5, 5.5, 24, 38, 7, 1.6], buttons: [['R', 38, 24], ['R', 70, 12]], jack: { side: 'bottom', x: -20 } },
  // ---------------- Xiaomi ----------------
  'redmi-13c': { brand: 'Xiaomi', name: 'Redmi 13C', h: 168, w: 78, d: 8.1, corner: 9, edge: 1.6, cam: ['L', 6, 6, 32, 42, 6, 1.6], buttons: [['R', 40, 22], ['R', 68, 12]], jack: { side: 'bottom', x: -20 } },
  'redmi-note-13': { brand: 'Xiaomi', name: 'Redmi Note 13', h: 162.24, w: 75.55, d: 7.97, corner: 9, edge: 1.2, cam: ['L', 6, 6, 25, 38, 6, 1.6], buttons: [['R', 38, 22], ['R', 66, 12]], jack: { side: 'top', x: 16 } },
};

export const PHONE_OPTIONS = [
  { value: 'custom', label: 'A medida (cargo las medidas)' },
  ...Object.entries(PHONES).map(([value, p]) => ({ value, label: `${p.brand} ${p.name}` })),
];
