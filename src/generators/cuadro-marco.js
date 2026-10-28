import base from './placa-decorada.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'cuadro-marco',
  title: 'Cuadro con marco',
  description: 'Cuadro con nombre, fecha y datos (ideal nacimientos), con marco y base.',
  defaults: {
    bg: 'frame', shape: 'rect', width: 90, height: 120, frameW: 5,
    title: 'Elisa', titleFont: 'great-vibes', line2: '16 · 05 · 2026', line3: '3,2 kg · 49 cm', textScale: 0.75,
    cBase: '#F72585', cDeco: '#F5F5F5', cText: '#F5F5F5',
  },
});
