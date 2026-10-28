/**
 * Punto de entrada del motor en el navegador.
 * Inicializa manifold-3d (WebAssembly) una sola vez.
 */
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { setWasm } from './geom.js';
import { enableGC } from './gc.js';

let ready = null;
export function initEngine() {
  if (!ready) {
    ready = Module({ locateFile: () => wasmUrl }).then(w => { w.setup(); enableGC(w); setWasm(w); return w; });
  }
  return ready;
}

export * from './geom.js';
export { loadFont, FONTS } from './fonts.js';
export { collect } from './gc.js';
