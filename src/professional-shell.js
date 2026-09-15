(() => {
  const layout = document.querySelector('.layout');
  const aside = document.querySelector('aside');
  if (!layout || !aside || document.getElementById('professionalShell')) return;

  const KEY = 'gemelos3d:last-session:v1';
  const ids = ['text','height','widthScale','depth','spacing','printer','margin','purgeMode','purgeX','purgeY','fontStyle','curveSegments','bevel','bevelSize','bevelSegments'];
  const style = document.createElement('style');
  style.textContent = `
    #professionalShell{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 14px;border-bottom:1px solid #252a33;background:linear-gradient(180deg,#11161d,#0d1015);box-shadow:0 8px 24px #0003;z-index:8}
    .professionalIdentity{display:flex;align-items:center;gap:9px;min-width:0}.professionalMark{display:grid;place-items:center;width:29px;height:29px;border:1px solid #657286;border-radius:8px;background:#e9edf2;color:#11151b;font-size:10px;font-weight:900;letter-spacing:-.05em}.professionalIdentity strong{display:block;font-size:12px;letter-spacing:.01em}.professionalIdentity span:not(.professionalMark){display:block;color:#727e8e;font-size:9px;margin-top:2px}.professionalActions{display:flex;gap:5px}.professionalActions button{width:auto;margin:0;padding:6px 9px;background:#151b23;border-color:#303a49;color:#bcc6d3;font-size:10px}.professionalActions button:hover{background:#e9edf2;color:#0c0e12}
    @media(max-width:800px){#professionalShell{position:sticky;top:0;padding:8px 10px}.professionalIdentity strong{font-size:11px}.professionalActions button{padding:6px 7px;font-size:9px}.professionalActions button:first-child{display:none}}
  `;
  document.head.appendChild(style);
  const readSession = () => {
    const values = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      values[id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return { savedAt: new Date().toISOString(), values };
  };
  const hasContent = () => Boolean(document.getElementById('text')?.value.trim());
  const setStatus = text => {
    const el = document.getElementById('professionalShellStatus');
    if (el) el.textContent = text;
  };
  const save = (quiet = false) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(readSession()));
      setStatus(quiet ? 'Guardado local automático' : 'Sesión guardada en este dispositivo');
    } catch (error) {
      console.warn('No se pudo guardar la sesión local.', error);
      setStatus('No se pudo guardar la sesión local');
    }
  };
  const restore = () => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!data?.values) return false;
      Object.entries(data.values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = Boolean(value);
        else el.value = value;
        el.dispatchEvent(new Event(el.type === 'checkbox' ? 'change' : 'input', { bubbles: true }));
      });
      document.getElementById('buildTop')?.click();
      const date = data.savedAt ? new Date(data.savedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      setStatus(`Sesión recuperada${date ? ` · ${date}` : ''}`);
      return true;
    } catch {
      localStorage.removeItem(KEY);
      return false;
    }
  };

  const bar = document.createElement('div');
  bar.id = 'professionalShell';
  bar.innerHTML = `
    <div class="professionalIdentity">
      <span class="professionalMark">G3</span>
      <div><strong>Gemelos 3D</strong><span id="professionalShellStatus">Espacio de trabajo listo</span></div>
    </div>
    <div class="professionalActions">
      <button type="button" id="newProjectAction">Nuevo</button>
      <button type="button" id="saveSessionAction">Guardar sesión</button>
      <button type="button" id="restoreSessionAction">Recuperar</button>
    </div>`;
  layout.insertBefore(bar, aside);

  document.getElementById('saveSessionAction').addEventListener('click', () => save(false));
  document.getElementById('restoreSessionAction').addEventListener('click', () => restore() || setStatus('No hay una sesión guardada'));
  document.getElementById('newProjectAction').addEventListener('click', () => {
    if (hasContent() && !window.confirm('¿Crear un proyecto nuevo? Se limpiará el modelo actual.')) return;
    document.getElementById('clearText')?.click();
    localStorage.removeItem(KEY);
    setStatus('Nuevo proyecto listo');
  });

  let saveTimer;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(true), 900);
  };
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener('input', scheduleSave);
    document.getElementById(id)?.addEventListener('change', scheduleSave);
  });
  const flushSave = () => {
    clearTimeout(saveTimer);
    save(true);
  };
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save(false);
    }
  });
  if (localStorage.getItem(KEY)) setStatus('Hay una sesión guardada disponible');
})();
