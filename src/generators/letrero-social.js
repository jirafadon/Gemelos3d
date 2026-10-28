import base from './letrero-palabras.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'letrero-social',
  title: 'Letrero @usuario',
  description: 'Tu usuario de redes en 2 o 3 colores, con contorno o en rectángulo.',
  defaults: { text1: '@gemelos3d', font1: 'poppins', size1: 14, text2: '', text3: '', gap: 2, border: 2.4, border2: 1.6, colors: 3, cBase: '#2A9D8F', cMid: '#F5F5F5', cText: '#1E1E1E', hBase: 5, foot: true, footH: 4 },
});
