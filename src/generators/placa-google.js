import base from './placa-qr.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'placa-google',
  title: 'Placa "Dejanos tu reseña"',
  description: 'QR a tu ficha de Google para pedir reseñas.',
  hide: ['kind'],
  defaults: {
    kind: 'link', link: 'https://g.page/r/TU-CODIGO/review',
    title: '¿Te gustó?', sub: 'Dejanos tu reseña en Google', cBase: '#F5F5F5', cLight: '#1D4ED8', cDark: '#1E1E1E', colors: 2,
  },
});
