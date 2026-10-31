/**
 * Paneles laterales ocultables (generadores y Taller): más lugar para la vista 3D.
 * La elección se recuerda en este navegador. Atajos: [ oculta el izquierdo, ] el derecho.
 */
const KEY = 'g3d_panes';

export const PANE_ICONS = {
  left: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  right: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  wide: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>',
  new: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PANE_ICONS[n]}</svg>`;

/** Botones para mostrar/ocultar los paneles (se insertan donde haga falta). */
export const paneButtons = () =>
  `<button data-pane="left" title="Mostrar u ocultar el panel izquierdo ([)">${ic('left')}</button>` +
  `<button data-pane="right" title="Mostrar u ocultar el panel derecho (])">${ic('right')}</button>` +
  `<button data-pane="wide" title="Pantalla amplia: oculta los dos paneles">${ic('wide')}</button>`;
export const newButton = (attrs = '') => `<button ${attrs} title="Empezar uno nuevo">${ic('new')}<span>Nuevo</span></button>`;

function load() {
  try { return { left: true, right: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { left: true, right: true }; }
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin almacenamiento: no pasa nada */ } }

/**
 * Engancha los botones [data-pane] dentro de `root` al layout `main` (.gen).
 * @returns función para soltar los atajos de teclado
 */
export function setupPanes(main, root = main) {
  const s = load();
  const apply = () => {
    main.classList.toggle('no-left', !s.left);
    main.classList.toggle('no-right', !s.right);
    root.querySelectorAll('[data-pane]').forEach(b => {
      const p = b.dataset.pane;
      b.classList.toggle('on', p === 'wide' ? !s.left && !s.right : !s[p]);
    });
  };
  const toggle = p => {
    if (p === 'wide') { const both = !s.left && !s.right; s.left = both; s.right = both; } else s[p] = !s[p];
    save(s); apply();
  };
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-pane]'); if (!b || !root.contains(b)) return;
    e.preventDefault(); toggle(b.dataset.pane);
  });
  const onKey = e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '[') { e.preventDefault(); toggle('left'); }
    if (e.key === ']') { e.preventDefault(); toggle('right'); }
  };
  window.addEventListener('keydown', onKey);
  apply();
  return () => window.removeEventListener('keydown', onKey);
}
