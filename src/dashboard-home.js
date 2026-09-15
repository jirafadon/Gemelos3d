import { loadProjects } from './project/project-storage.js';

const main = document.querySelector('main.page');
const flow = main?.querySelector('.flow');
if (!main || !flow) return;

const projects = loadProjects();
const section = document.createElement('section');
section.className = 'home-projects';
section.innerHTML = `<div class="section-title"><h3>Proyectos recientes</h3><span>${projects.length ? `${projects.length} guardado${projects.length === 1 ? '' : 's'}` : 'Tu espacio de trabajo'}</span></div><div class="home-project-grid"></div>`;
const grid = section.querySelector('.home-project-grid');
if (!projects.length) {
  grid.innerHTML = `<a class="home-empty" href="./crear-ia.html"><span class="home-empty-icon">＋</span><div><strong>Creá tu primer proyecto</strong><small>Empezá con IA, importá un modelo o abrí el taller.</small></div><b>→</b></a>`;
} else {
  projects.slice(0, 3).forEach(project => {
    const name = project.name || project.design?.text || 'Proyecto sin nombre';
    const updated = project.updatedAt ? new Date(project.updatedAt) : null;
    const date = updated && !Number.isNaN(updated.getTime()) ? updated.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : 'Guardado';
    const card = document.createElement('a');
    card.className = 'home-project-card';
    card.href = `./proyectos.html?project=${encodeURIComponent(project.id || '')}`;
    card.innerHTML = `<span class="home-project-icon">◇</span><div><strong></strong><small>${date} · ${project.source || 'proyecto'}</small></div><b>→</b>`;
    card.querySelector('strong').textContent = name;
    grid.appendChild(card);
  });
}
flow.before(section);
const style = document.createElement('style');
style.textContent = `.home-projects{margin-top:28px}.home-project-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.home-project-card,.home-empty{display:flex;align-items:center;gap:12px;min-height:76px;padding:14px 15px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#10151d,#0c1016);color:#fff;text-decoration:none;transition:.18s}.home-project-card:hover,.home-empty:hover{transform:translateY(-2px);border-color:#ffffff35;background:#141a23}.home-project-icon,.home-empty-icon{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:10px;background:#8bf0c510;border:1px solid #8bf0c522;color:var(--accent);font-size:18px}.home-project-card div,.home-empty div{min-width:0;flex:1}.home-project-card strong,.home-empty strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.home-project-card small,.home-empty small{display:block;margin-top:5px;color:#747f90;font-size:9px}.home-project-card b,.home-empty b{color:#7f8b9d;font-size:14px}.home-empty{grid-column:1/-1;min-height:92px}.home-empty-icon{font-size:22px}@media(max-width:850px){.home-project-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.home-project-grid{grid-template-columns:1fr}}`;
document.head.appendChild(style);
