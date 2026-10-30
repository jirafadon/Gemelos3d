import base from './placa-qr.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'placa-redes',
  title: 'Placa QR de redes',
  description: 'Instagram, TikTok, YouTube o WhatsApp con su QR.',
  hide: ['kind', 'link'],
  defaults: { kind: 'social', network: 'instagram', user: '@3dgemelos', title: 'Seguinos', sub: '@3dgemelos', cBase: '#F72585' },
});
