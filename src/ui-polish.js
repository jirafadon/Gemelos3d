const STYLE_ID = 'gemelos-ui-polish';

function injectStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
:root{
  --g-bg:#080a0e;--g-panel:#0e1218;--g-panel2:#121720;--g-border:#242b36;--g-border2:#303846;
  --g-text:#f4f7fb;--g-muted:#7f8998;--g-soft:#aab3c0;--g-accent:#e9edf3;--g-accentText:#0b0e13;
  --g-radius:12px;--g-shadow:0 18px 50px rgba(0,0,0,.28)
}
html,body{background:var(--g-bg)!important}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;letter-spacing:-.01em}
header{height:68px!important;padding:0 22px!important;background:rgba(9,12,17,.88)!important;border-bottom:1px solid var(--g-border)!important;backdrop-filter:blur(14px);box-shadow:0 8px 30px rgba(0,0,0,.16)}
header h1{font-size:18px!important;letter-spacing:-.025em}
header p{font-size:11px!important;color:#697382!important}
.back{border-color:var(--g-border2)!important;border-radius:9px!important;background:#11151c;transition:.18s}
.back:hover{background:#1a2029;transform:translateY(-1px)}
.layout{grid-template-columns:355px minmax(0,1fr)!important;min-height:calc(100vh - 68px)!important}
aside{padding:14px!important;border-right:1px solid var(--g-border)!important;background:linear-gradient(180deg,#0b0e13 0%,#090c11 100%);scrollbar-width:thin}
aside>section{margin-bottom:10px!important;padding:13px!important;border:1px solid var(--g-border)!important;border-radius:var(--g-radius)!important;background:rgba(15,19,25,.88)!important;box-shadow:0 5px 18px rgba(0,0,0,.10)}
.sectionTitle{font-size:12px!important;font-weight:750!important;letter-spacing:.01em}
.sectionHint{font-size:10px!important;color:#687282!important;margin-bottom:9px!important}
.sectionNumber{color:#5e6878!important;font-variant-numeric:tabular-nums}
label{font-size:10px!important;color:#929dac!important;text-transform:none;letter-spacing:.01em}
input,select,button{border-color:#2a323e!important;background:#11161d!important;border-radius:8px!important;min-height:34px;transition:border-color .16s,background .16s,transform .16s,box-shadow .16s}
input:focus,select:focus{outline:none;border-color:#687487!important;box-shadow:0 0 0 3px rgba(130,145,166,.10)}
button:hover{background:#1a2029!important;border-color:#3b4655!important;transform:translateY(-1px)}
button.primary{background:#eef1f5!important;color:#090c11!important;border-color:#eef1f5!important;box-shadow:0 7px 20px rgba(0,0,0,.20)}
button.primary:hover{background:#fff!important}
.textSection{border-color:#343d4a!important;background:linear-gradient(180deg,#121821,#10151c)!important}
.textSection input{font-size:17px!important;min-height:46px!important;border-radius:10px!important;background:#0b0f15!important;border-color:#313b49!important}
.createSection{background:linear-gradient(180deg,#151a22,#11161d)!important;border-color:#3a4452!important}
.createSection button{min-height:42px!important;font-size:12px!important}
.flowNote,.bedSummary,#status{background:#0b0f15!important;border:1px solid #202733;color:#788393!important;border-radius:9px!important}
.stats{gap:8px!important}.card{background:#0c1117!important;border-color:#202733!important;border-radius:9px!important;padding:10px!important}.card b{font-size:14px!important}
#viewer{background:radial-gradient(circle at 50% 38%,#1a202b 0,#0d1118 42%,#080a0e 76%)!important}
#viewer canvas{filter:saturate(.92) contrast(1.02)}
.viewTools{left:16px!important;top:16px!important;border-color:#303947!important;background:rgba(10,14,20,.72)!important;border-radius:10px!important;box-shadow:var(--g-shadow)}
.viewTools button{min-height:30px!important;border:0!important;background:transparent!important;color:#9ba5b4!important}.viewTools button:hover{color:#fff!important}.viewTools button.active{background:#edf0f4!important;color:#090c11!important}
.badge{right:16px!important;top:16px!important;background:rgba(10,14,20,.72)!important;border-color:#303947!important;border-radius:9px!important}
.fabricationPanel{left:16px!important;bottom:16px!important;width:min(370px,calc(100% - 32px))!important;border-color:#303947!important;background:rgba(10,14,20,.86)!important;border-radius:12px!important;box-shadow:0 18px 50px rgba(0,0,0,.38)!important}
.fabricationPanel.fabricationMode{border-color:#586679!important}
.bedCard,.piece{border-color:#252d39!important;background:#0d1219!important;border-radius:8px!important}
.bedCard.active{border-color:#68778a!important;background:#151b23!important}
.bedCard button{min-height:30px!important}
.sizeGuide{background:#0b0f15!important;border-color:#222a35!important;border-radius:9px!important}
@media(max-width:900px){.layout{grid-template-columns:315px minmax(0,1fr)!important}}
@media(max-width:800px){header{padding:0 12px!important}.layout{display:flex!important;flex-direction:column!important}aside{order:2;max-height:none!important}.layout #viewer{order:1;min-height:62vh!important;height:62vh}.fabricationPanel{max-height:38%!important}}
`;
  document.head.appendChild(style);
}

function enhance(){
  injectStyles();
  const aside=document.querySelector('aside');
  if(!aside || document.getElementById('workspaceNav')) return;
  const nav=document.createElement('nav');
  nav.id='workspaceNav';
  nav.setAttribute('aria-label','Flujo de trabajo');
  nav.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin:0 2px 9px"><strong style="font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#687282">Flujo de trabajo</strong><span style="font-size:9px;color:#4f5968">GEMELOS 3D</span></div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:12px">${['Diseño','Medidas','Fabricar','Costos','Entrega'].map((x,i)=>`<button type="button" data-ws-step="${i}" style="min-height:28px!important;padding:4px 3px!important;font-size:8px!important;margin:0!important;background:#0c1117!important;color:#697484!important;border:1px solid #202733!important;border-radius:7px!important">${x}</button>`).join('')}</div>`;
  nav.querySelectorAll('[data-ws-step]').forEach((btn,i)=>btn.addEventListener('click',()=>{
    const targets=[aside.children[0],aside.children[1],aside.children[5],document.getElementById('costPanel'),document.getElementById('exportSection')];
    const target=targets[i];
    if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  aside.prepend(nav);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance,{once:true}); else enhance();
`;
