import base from './placa-qr.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'placa-wifi',
  title: 'Placa QR WiFi',
  description: 'El QR conecta directo a tu WiFi, con la red y la clave impresas.',
  hide: ['kind', 'link'],
  defaults: { kind: 'wifi', title: 'Conectate al WiFi', autoSub: true, cBase: '#7B2CBF' },
});
