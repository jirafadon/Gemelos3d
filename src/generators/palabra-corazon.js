import base from './letrero-palabras.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'palabra-corazon',
  title: 'Palabra en 2 capas con corazón',
  description: 'Palabra cursiva con un corazón al final, en dos capas de color.',
  defaults: { text1: 'Mamá', font1: 'dancing', size1: 26, text2: '', text3: '', heart: 'end', colors: 2, border: 3, cBase: '#D62828', cText: '#F5F5F5', hBase: 4, foot: false },
});
