import { loadProjects, setActiveProject } from './project/project-storage.js';

const main = document.querySelector('main.page');
const flow = main?.querySelector('.flow');
if (!main || !flow) return;

const projects = loadProjects();
const sourceLabel = source => ({ ai: 'IA', import: 'Importados', svg: 'SVG', manual: 'Manual' }[source] || 'Otros');
const stepLabel = step => ({ crear: 'Crear', configurar: 'Configurar', revisar: 'Revisar', taller: 'Taller' }[step] || 'Crear');
const stepTarget = step => step === 'crear' ? './crear-ia.html' : './app.html';
const projectProgress = project => {
  const steps = project.workflow?.steps || {};
  const names = ['crear', 'configurar', 'revisar', 'taller'];
  const complete = names.filter(name => steps[name] === 'complete').length;
  const current = project.workflow?.current || 'crear';
  return { complete, current, percent: Math.round((complete + (steps[current] === 'active' ? .5 : 0)) / names.length * 100) };
};

const section = document.createElement('section');
section.className = 'home-projects';
section.innerHTML = `<div class="section-title"><h3>Proyectos recientes</h3><span>${projects.length ? `${projects.length} guardado${projects.length === 1 ? '' : 's'}` : 'Tu espacio de trabajo'}</span></div><div class="home-project-grid"></div>`;
const grid = section.querySelector('.home-project-grid');

if (!projects.length) {
  grid.innerHTML = `<a class="home-empty" href="./crear-ia.html"><span class="home-empty-icon">＋</span><div><strong>Creá tu primer proyecto</strong><small>Empezá con IA, importá un modelo o abrí el taller.</small></div><b>→</b></a>`;
} else {
  projects.slice(0, 3).forEach(project => {
    const name = project.name || project.design?.text || 'Proyecto sin nombre';
    const updated = project.meta?.updatedAt ? new Date(project.meta.updatedAt) : null;
    const date = updated && !Number.isNaN(updated.getTime()) ? updated.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : 'Guardado';
    const progress = projectProgress(project);
    const model = project.model?.name || project.model?.format?.toUpperCase() || 'Sin modelo';
    const card = document.createElement('a');
    card.className = 'home-project-card';
    card.href = `./proyecto.html?id=${encodeURIComponent(project.id)}`;
    card.innerHTML = `<span class="home-project-icon">◇</span><div class="home-project-main"><strong></strong><small>${date} · ${sourceLabel(project.source)} · ${model}</small><div class="home-project-progress"><i style="width:${progress.percent}%"></i></div><em>En ${stepLabel(progress.current)} · ${progress.percent}%</em></div><b>→</b>`;
    card.querySelector('strong').textContent = name;
    card.addEventListener('click', () => setActiveProject(project.id));
    grid.appendChild(card);
  });
}
flow.before(section);

const counts = projects.reduce((acc, project) => {
  const key = project.source || 'other';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const latest = projects[0];
const activity = document.createElement('section');
activity.className = 'home-activity';
activity.innerHTML = `<div class="section-title"><h3>Estado del espacio</h3><span>${projects.length ? 'Todo queda guardado en este dispositivo' : 'Listo para empezar'}</span></div><div class="home-activity-grid"><div class="home-stat"><span>Proyectos</span><strong>${projects.length}</strong><small>guardados localmente</small></div><div class="home-stat"><span>Origen principal</span><strong>${projects.length ? sourceLabel(Object.entries(counts).sort((a,b) => b[1] - a[1])[0][0]) : '—'}</strong><small>${projects.length ? `${Math.max(...Object.values(counts))} proyecto${Math.max(...Object.values(counts)) === 1 ? '' : 's'}` : 'sin actividad'}</small></div><div class="home-stat home-stat-action"><span>Siguiente paso</span><strong>${projects.length ? stepLabel(latest?.workflow?.current || 'crear') : 'Crear proyecto'}</strong><small>${projects.length ? `Continuá ${latest?.name || 'tu último trabajo'}` : 'Elegí una herramienta arriba'}</small><a href="${projects.length ? stepTarget(latest?.workflow?.current || 'crear') : './crear-ia.html'}">${projects.length ? 'Retomar →' : 'Abrir →'}</a></div></div>`;
if (projects.length) {
  activity.querySelector('.home-stat-action a').addEventListener('click', () => setActiveProject(latest.id));
}
section.after(activity);

const quick = document.createElement('section');
quick.className = 'home-quick';
quick.innerHTML = `<div class="section-title"><h3>Acciones rápidas</h3><span>Elegí cómo continuar</span></div><div class="home-quick-grid"><a href="./crear-ia.html"><b>✦</b><strong>Generar una pieza</strong><small>Describí una idea y empezá desde cero.</small><span>Empezar →</span></a><a href="./importar-modelo.html"><b>↥</b><strong>Traer un modelo</strong><small>Subí un STL, OBJ, GLB o GLTF.</small><span>Importar →</span></a><a href="./svg-3d.html"><b>⌁</b><strong>Convertir un SVG</strong><small>Transformá un vector en volumen 3D.</small><span>Convertir →</span></a><a href="./buscar-modelos.html"><b>⌕</b><strong>Encontrar una base</strong><small>Buscá modelos y repuestos gratuitos.</small><span>Explorar →</span></a></div>`;
activity.after(quick);

const style = document.createElement('style');
style.textContent = `.home-projects{margin-top:28px}.home-project-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.home-project-card,.home-empty{display:flex;align-items:center;gap:12px;min-height:88px;padding:14px 15px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#10151d,#0c1016);color:#fff;text-decoration:none;transition:.18s}.home-project-card:hover,.home-empty:hover{transform:translateY(-2px);border-color:#ffffff35;background:#141a23}.home-project-icon,.home-empty-icon{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:10px;background:#8bf0c510;border:1px solid #8bf0c522;color:var(--accent);font-size:18px}.home-project-main{min-width:0;flex:1}.home-project-card strong,.home-empty strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.home-project-card small,.home-empty small{display:block;margin-top:5px;color:#747f90;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.home-project-card b,.home-empty b{color:#7f8b9d;font-size:14px}.home-project-progress{height:4px;margin-top:10px;border-radius:99px;background:#1a2029;overflow:hidden}.home-project-progress i{display:block;height:100%;border-radius:inherit;background:var(--accent);box-shadow:0 0 10px #8bf0c53b}.home-project-card em{display:block;margin-top:5px;color:#758193;font-size:8px;font-style:normal}.home-empty{grid-column:1/-1;min-height:92px}.home-empty-icon{font-size:22px}.home-activity{margin-top:18px}.home-activity-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.home-stat{position:relative;min-height:108px;padding:16px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#0f141c,#0c1016)}.home-stat span{display:block;color:#6f7b8c;font-size:9px;text-transform:uppercase;letter-spacing:.1em}.home-stat strong{display:block;margin-top:11px;font-size:19px;letter-spacing:-.02em}.home-stat small{display:block;margin-top:5px;color:#7c8797;font-size:9px;max-width:210px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.home-stat-action a{position:absolute;right:14px;bottom:14px;color:var(--accent);text-decoration:none;font-size:10px;font-weight:800}.home-stat-action a:hover{text-decoration:underline}.home-quick{margin-top:18px}.home-quick-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.home-quick-grid a{display:flex;flex-direction:column;gap:8px;min-height:148px;padding:16px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#111720,#0c1016);color:#fff;text-decoration:none;transition:.18s}.home-quick-grid a:hover{transform:translateY(-2px);border-color:#8bf0c544;background:#151d26}.home-quick-grid b{color:var(--accent);font-size:21px;font-weight:500}.home-quick-grid strong{font-size:12px}.home-quick-grid small{color:#7d899a;font-size:9px;line-height:1.5}.home-quick-grid span{margin-top:auto;color:var(--accent);font-size:10px;font-weight:800}@media(max-width:850px){.home-project-grid,.home-activity-grid{grid-template-columns:1fr 1fr}.home-quick-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.home-project-grid,.home-activity-grid,.home-quick-grid{grid-template-columns:1fr}}`;
document.head.appendChild(style);
