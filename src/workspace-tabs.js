(() => {
  const aside = document.querySelector('aside');
  if (!aside || document.getElementById('workspaceTabs')) return;

  const sections = [...aside.querySelectorAll(':scope > section')];
  if (sections.length < 7) return;

  const groups = [
    { id: 'design', label: 'Diseño', icon: '✏️', indexes: [0, 3, 4], hint: 'Texto, tipografía y creación del modelo.' },
    { id: 'size', label: 'Medidas', icon: '📐', indexes: [1], hint: 'Dimensiones físicas por letra, grosor y separación.' },
    { id: 'machine', label: 'Máquina', icon: '🛏️', indexes: [2], hint: 'Impresora, cama útil, margen y torre de purga.' },
    { id: 'fabrication', label: 'Fabricar', icon: '🧩', indexes: [5], hint: 'Acomodado, camas, piezas y vista de fabricación.' },
    { id: 'delivery', label: 'Entrega', icon: '📦', indexes: [6, 7, 8, 9, 10], hint: 'Exportación, proyecto, costos y documentación.' },
  ];

  const style = document.createElement('style');
  style.id = 'workspaceTabsStyles';
  style.textContent = `
    #workspaceTabs{display:flex;gap:6px;align-items:center;margin:0 0 10px;padding:5px;border:1px solid #2b323d;border-radius:10px;background:#0f1319;position:sticky;top:0;z-index:5;box-shadow:0 8px 22px #0005}
    #workspaceTabs button{width:auto;flex:1;margin:0;padding:8px 7px;border:1px solid transparent;border-radius:7px;background:transparent;color:#929cab;font-size:11px;white-space:nowrap}
    #workspaceTabs button:hover{background:#171c24;color:#eef2f6}
    #workspaceTabs button.active{background:#f1f4f7;color:#0c0e12;border-color:#f1f4f7}
    #workspaceTabs button:focus-visible{outline:2px solid #aeb9c9;outline-offset:2px}
    #workspaceTabHint{margin:0 0 8px;padding:7px 9px;border:1px solid #252c36;border-radius:7px;background:#12171e;color:#7f8998;font-size:10px;line-height:1.35}
    #mobileCreateModel{display:none}
    @media(max-width:800px){#mobileCreateModel{display:block;position:fixed;left:12px;right:12px;bottom:12px;z-index:20;width:auto;margin:0;padding:12px;border:1px solid #f5f7fa;border-radius:10px;background:#f5f7fa;color:#0c0e12;box-shadow:0 8px 24px #0009;font-size:13px;font-weight:800}body{padding-bottom:64px}}
    @media(max-width:800px){#workspaceTabs,#workspaceTabHint{display:none!important}}
  `;
  document.head.appendChild(style);

  const nav = document.createElement('nav');
  nav.id = 'workspaceTabs';
  nav.setAttribute('aria-label', 'Pestañas del taller');
  const hint = document.createElement('div');
  hint.id = 'workspaceTabHint';
  aside.insertBefore(hint, sections[0]);
  aside.insertBefore(nav, hint);

  const mobileCreate = document.createElement('button');
  mobileCreate.id = 'mobileCreateModel';
  mobileCreate.type = 'button';
  mobileCreate.textContent = '▶ Crear modelo';
  mobileCreate.setAttribute('aria-label', 'Crear modelo con las medidas actuales');
  mobileCreate.addEventListener('click', () => document.getElementById('buildTop')?.click());
  document.body.appendChild(mobileCreate);

  let active = 0;
  const activate = (index, scroll = true) => {
    active = index;
    const group = groups[index];
    nav.querySelectorAll('button').forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    hint.textContent = group.hint;
    sections.forEach((section, sectionIndex) => {
      const visible = group.indexes.includes(sectionIndex);
      section.hidden = !visible;
      section.classList.toggle('workspaceTabVisible', visible);
    });
    if (scroll) {
      const first = sections[group.indexes[0]];
      first?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  groups.forEach((group, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${group.icon} ${group.label}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `workspace-tab-${group.id}`);
    button.addEventListener('click', () => activate(index));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? groups.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length;
      activate(next, false);
      nav.querySelectorAll('button')[next].focus();
    });
    nav.appendChild(button);
  });

  // Keep the existing mobile category controller in charge on narrow screens.
  const mq = window.matchMedia('(max-width: 800px)');
  const syncViewport = () => {
    if (!mq.matches) activate(active, false);
    else sections.forEach(section => { section.hidden = false; });
  };
  mq.addEventListener?.('change', syncViewport);
  activate(0, false);
  syncViewport();
})();
