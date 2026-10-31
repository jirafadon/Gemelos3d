/**
 * Soporte con tu logo o nombre: el soporte en triángulo (u otro con respaldo) con el logo
 * y/o el nombre calado o en otro color en el respaldo. Ideal para regalar o para tu marca.
 */
import base from './soporte-celular.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'soporte-logo',
  title: 'Soporte con tu logo o nombre',
  description: 'Soporte de celular o tablet con tu logo y tu nombre en el respaldo, calado o en otro color.',
  defaults: { style: 'triangle', pattern: 'logoText', pMode: 'cut', accent: 'none', text: 'Gemelos 3D', font: 'poppins', color: '#1E1E1E', color2: '#FCBF49', mScale: 100 },
});
