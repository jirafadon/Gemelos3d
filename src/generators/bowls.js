import base from './vasos-espiral.js';
import { preset } from './_common.js';

export default preset(base, {
  id: 'bowls',
  title: 'Bowls y cuencos',
  description: 'Cuencos, fruteras y macetas bajas con ondas y giro.',
  defaults: { style: 'flower', lobes: 10, depth: 0.14, diam: 90, topScale: 1.8, height: 60, twist: 36, mode: 'walls', wall: 2, floor: 2.4, color: '#0E7490' },
});
