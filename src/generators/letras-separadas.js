import base from './letrero-palabras.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'letras-separadas',
  title: 'Letrero de letras separadas',
  description: 'Letras gruesas con su contorno, separadas y unidas por un pie.',
  defaults: { text1: 'ELISA', font1: 'anton', size1: 40, text2: '', text3: '', spacing: 0.16, gap: 2, border: 3, border2: 2, colors: 2, cBase: '#3A4A5C', cMid: '#C0C0C0', cText: '#F5F5F5', hBase: 8, hText: 2, foot: true, footH: 5, fill: true },
});
