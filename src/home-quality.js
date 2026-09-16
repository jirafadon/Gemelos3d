const main = document.querySelector('main.page');
const flow = main?.querySelector('.flow');
if (!main || !flow) return;

const section = document.createElement('section');
section.className = 'home-quality';
section.innerHTML = `<div class="section-title"><h3>Cuando necesites ayuda</h3><span>Recursos para no frenarte</span></div><div class="home-quality-grid"><a href="./proyectos.html"><span>01</span><div><strong>Mis proyectos</strong><small>Volvé a cualquier diseño guardado y retomá donde lo dejaste.</small></div><b>→</b></a><a href="./buscar-modelos.html"><span>02</span><div><strong>Buscar modelos</strong><small>Encontrá una base 3D para partir de algo ya existente.</small></div><b>→</b></a><a href="./crear-ia.html"><span>03</span><div><strong>Crear con IA</strong><small>Transformá una descripción en un punto de partida visual.</small></div><b>→</b></a></div>`;
flow.before(section);

const style = document.createElement('style');
style.textContent = `.home-quality{margin-top:18px}.home-quality-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.home-quality-grid a{display:flex;align-items:center;gap:12px;min-width:0;padding:15px 16px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#10161f,#0c1016);color:#fff;text-decoration:none;transition:transform .18s,border-color .18s,background .18s}.home-quality-grid a:hover{transform:translateY(-2px);border-color:#8bf0c544;background:#151d26}.home-quality-grid a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.home-quality-grid a>span{display:grid;place-items:center;width:32px;height:32px;flex:0 0 32px;border:1px solid #8bf0c522;border-radius:9px;color:var(--accent);font-size:9px;font-weight:800}.home-quality-grid a div{min-width:0;flex:1}.home-quality-grid strong{display:block;font-size:11px}.home-quality-grid small{display:block;margin-top:5px;color:#7d899a;font-size:9px;line-height:1.5}.home-quality-grid b{color:var(--accent);font-size:13px}@media(max-width:700px){.home-quality-grid{grid-template-columns:1fr}}`;
document.head.appendChild(style);
