const main = document.querySelector('main.page');
const flow = main?.querySelector('.flow');
if (!main || !flow) return;

const section = document.createElement('section');
section.className = 'home-workflow';
section.innerHTML = `<div class="section-title"><h3>De la idea al taller</h3><span>El recorrido de Gemelos 3D</span></div><div class="home-workflow-track" aria-label="Recorrido de Gemelos 3D"><a href="./crear-ia.html"><span>01</span><strong>Idea</strong><small>Creá</small></a><i aria-hidden="true">→</i><a href="./proyectos.html"><span>02</span><strong>Diseño</strong><small>Guardá</small></a><i aria-hidden="true">→</i><a href="./proyectos.html"><span>03</span><strong>Proyecto</strong><small>Retomá</small></a><i aria-hidden="true">→</i><a href="./app.html"><span>04</span><strong>Taller</strong><small>Prepará</small></a><i aria-hidden="true">→</i><a href="./app.html"><span>05</span><strong>Fabricación</strong><small>Exportá</small></a></div>`;
flow.before(section);

const style = document.createElement('style');
style.textContent = `.home-workflow{margin-top:18px}.home-workflow-track{display:flex;align-items:stretch;gap:7px;overflow-x:auto;padding-bottom:3px;scrollbar-width:thin}.home-workflow-track a{display:flex;flex-direction:column;justify-content:center;min-width:108px;min-height:86px;padding:13px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#10161f,#0c1016);color:#fff;text-decoration:none;transition:transform .18s,border-color .18s,background .18s}.home-workflow-track a:hover{transform:translateY(-2px);border-color:#8bf0c544;background:#151d26}.home-workflow-track a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.home-workflow-track a span{color:var(--accent);font-size:9px;font-weight:800;letter-spacing:.08em}.home-workflow-track strong{margin-top:8px;font-size:11px}.home-workflow-track small{margin-top:4px;color:#7d899a;font-size:9px}.home-workflow-track i{align-self:center;color:#536072;font-style:normal;font-size:13px;flex:0 0 auto}`;
document.head.appendChild(style);
