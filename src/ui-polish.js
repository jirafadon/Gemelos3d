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
#workspaceNav{position:sticky;top:-14px;z-index:6;padding:12px 2px 9px;background:linear-gradient(180deg,#0b0e13 78%,rgba(11,14,19,0));backdrop-filter:blur(8px)}
#workspaceNav [data-ws-step]{cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:.16s!important}
#workspaceNav [data-ws-step]:hover{color:#dfe5ed!important;border-color:#394352!important;transform:none!important}
#workspaceNav [data-ws-step].active{background:#edf0f4!important;color:#090c11!important;border-color:#edf0f4!important;box-shadow:0 4px 14px rgba(0,0,0,.22)}
#workspaceNav [data-ws-step].done{color:#c3cbd6!important;border-color:#303a48!important}
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

/* Visor = mesa de trabajo: HUD discreto, sin tocar el canvas ni la geometría. */
#viewer{isolation:isolate}
#viewer .g-viewerHud{position:absolute;inset:0;z-index:2;pointer-events:none;color:#8e98a7;font-variant-numeric:tabular-nums}
.g-viewerHud .g-hudTop{position:absolute;left:16px;right:16px;top:16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.g-viewerHud .g-hudTitle{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #252e3a;border-radius:9px;background:rgba(8,11,16,.58);backdrop-filter:blur(8px);box-shadow:0 10px 28px rgba(0,0,0,.14)}
.g-viewerHud .g-dot{width:6px;height:6px;border-radius:50%;background:#697586;box-shadow:0 0 0 3px rgba(105,117,134,.10)}
.g-viewerHud .g-title{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#aeb7c4}
.g-viewerHud .g-subtitle{font-size:8px;color:#606b7a;margin-left:2px}
.g-viewerHud .g-meta{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
.g-viewerHud .g-chip{padding:6px 8px;border:1px solid #252e3a;border-radius:8px;background:rgba(8,11,16,.58);backdrop-filter:blur(8px);font-size:8px;color:#8e98a7}
.g-viewerHud .g-chip b{color:#d5dbe3;font-weight:700}
.g-viewerHud .g-bottom{position:absolute;left:16px;right:16px;bottom:16px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.g-viewerHud .g-hint{max-width:360px;padding:7px 9px;border:1px solid #252e3a;border-radius:8px;background:rgba(8,11,16,.48);backdrop-filter:blur(8px);font-size:8px;color:#606b7a}
.g-viewerHud .g-status{padding:7px 9px;border:1px solid #252e3a;border-radius:8px;background:rgba(8,11,16,.58);backdrop-filter:blur(8px);font-size:8px;color:#7e8999;text-align:right}
.g-viewerHud .g-status strong{color:#b9c2ce}
#viewer.g-hasModel .g-dot{background:#9fe3b1;box-shadow:0 0 0 3px rgba(159,227,177,.10)}
#viewer.g-hasModel .g-hint{color:#788494}
#viewer.g-fabMode .g-dot{background:#d9e0e8;box-shadow:0 0 0 3px rgba(217,224,232,.09)}

/* Marco de trabajo: refuerza el área útil del visor sin dibujar sobre el modelo. */
#viewer:before,#viewer:after{content:"";position:absolute;z-index:1;pointer-events:none;opacity:.42}
#viewer:before{inset:20px;border:1px solid rgba(112,125,143,.10);border-radius:14px;box-shadow:inset 0 0 70px rgba(0,0,0,.10)}
#viewer:after{width:72px;height:72px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid rgba(145,157,174,.07);border-radius:50%;box-shadow:0 0 0 18px rgba(145,157,174,.025),0 0 0 36px rgba(145,157,174,.014)}
#viewer.g-hasModel:after{opacity:.20}
.g-viewerHud .g-hudTitle{position:relative}
.g-viewerHud .g-hudTitle:after{content:"";position:absolute;left:10px;bottom:-6px;width:18px;height:1px;background:#566173;opacity:.55}

/* Limpieza visual: el modelo y la cama vuelven a ser los protagonistas. */
#viewer .g-viewerHud{display:none!important}
#viewer:before,#viewer:after{display:none!important}
#viewer{background:#0b0e13!important}
#viewer canvas{filter:none!important}
.viewTools{box-shadow:none!important;background:rgba(10,14,20,.78)!important}
.badge{box-shadow:none!important}

@media(max-width:800px){.g-viewerHud .g-hudTop{left:8px;right:8px;top:8px}.g-viewerHud .g-bottom{left:8px;right:8px;bottom:8px}.g-viewerHud .g-meta{display:none}.g-viewerHud .g-hint{max-width:240px}.g-viewerHud .g-status{font-size:7px}#viewer:before{inset:10px}#viewer:after{width:52px;height:52px}}
@media(max-width:900px){.layout{grid-template-columns:315px minmax(0,1fr)!important}}
@media(max-width:800px){header{padding:0 12px!important}.layout{display:flex!important;flex-direction:column!important}aside{order:2;max-height:none!important}.layout #viewer{order:1;min-height:62vh!important;height:62vh}.fabricationPanel{max-height:38%!important}}
`;
  document.head.appendChild(style);
}

function enhance(){
  injectStyles();
  const aside=document.querySelector('aside');
  if(!aside || document.getElementById('workspaceNav')) return;
  const viewer=document.getElementById('viewer');
  if(viewer && !viewer.querySelector('.g-viewerHud')){
    const hud=document.createElement('div');
    hud.className='g-viewerHud';
    hud.innerHTML=`<div class="g-hudTop"><div class="g-viewerTitle"><div class="g-viewerHud g-hudTitle"><span class="g-dot"></span><span class="g-title">Mesa de trabajo 3D</span><span class="g-subtitle">Vista de diseño</span></div></div><div class="g-meta"><span class="g-chip">X <b id="gHudX">—</b> mm</span><span class="g-chip">Y <b id="gHudY">—</b> mm</span><span class="g-chip">Z <b id="gHudZ">—</b> mm</span><span class="g-chip">Piezas <b id="gHudPieces">0</b></span></div></div><div class="g-bottom"><div class="g-hint" id="gHudHint">Generá un modelo para comenzar a trabajar en 3D.</div><div class="g-status"><strong id="gHudMode">DISEÑO</strong><br><span id="gHudStatus">Listo</span></div></div>`;
    viewer.appendChild(hud);
    hud.querySelectorAll('.g-viewerHud').forEach(el=>{if(el.classList.contains('g-viewerHud') && el.classList.contains('g-hudTitle')) el.classList.remove('g-viewerHud')});
    const sync=()=>{
      const x=document.getElementById('sx')?.textContent||'—', y=document.getElementById('sy')?.textContent||'—', z=document.getElementById('sz')?.textContent||'—', p=document.getElementById('pieces')?.textContent||'0';
      document.getElementById('gHudX').textContent=x;document.getElementById('gHudY').textContent=y;document.getElementById('gHudZ').textContent=z;document.getElementById('gHudPieces').textContent=p;
      const status=document.getElementById('status');
      const txt=status?.textContent?.trim()||'Listo';
      document.getElementById('gHudStatus').textContent=txt.length>52?txt.slice(0,52)+'…':txt;
      const hasModel=p!=='0' || x!=='—';
      viewer.classList.toggle('g-hasModel',hasModel);
      document.getElementById('gHudHint').textContent=hasModel?'Arrastrá para orbitar · rueda para zoom · usá las vistas para inspeccionar el modelo.':'Generá un modelo para comenzar a trabajar en 3D.';
      const fab=viewer.classList.contains('fabricationMode') || document.querySelector('.fabricationPanel.fabricationMode');
      viewer.classList.toggle('g-fabMode',!!fab);
      document.getElementById('gHudMode').textContent=fab?'FABRICACIÓN':'DISEÑO';
    };
    const mo=new MutationObserver(sync);
    ['sx','sy','sz','pieces','status'].forEach(id=>{const el=document.getElementById(id);if(el)mo.observe(el,{childList:true,subtree:true,characterData:true});});
    const fabObserver=new MutationObserver(sync); fabObserver.observe(viewer,{attributes:true,attributeFilter:['class'],subtree:true});
    setInterval(sync,900); sync();
  }
  const nav=document.createElement('nav');
  nav.id='workspaceNav';
  nav.setAttribute('aria-label','Flujo de trabajo');
  nav.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin:0 2px 9px"><strong style="font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#687282">Flujo de trabajo</strong><span id="workspaceState" style="font-size:9px;color:#4f5968">DISEÑO</span></div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:12px">${['Diseño','Medidas','Fabricar','Costos','Entrega'].map((x,i)=>`<button type="button" data-ws-step="${i}" style="min-height:28px!important;padding:4px 3px!important;font-size:8px!important;margin:0!important;background:#0c1117!important;color:#697484!important;border:1px solid #202733!important;border-radius:7px!important">${x}</button>`).join('')}</div>`;
  const buttons=[...nav.querySelectorAll('[data-ws-step]')];
  const targets=[aside.children[1],aside.children[2],aside.children[6],document.getElementById('costPanel'),document.getElementById('exportSection')];
  const labels=['DISEÑO','MEDIDAS','FABRICAR','COSTOS','ENTREGA'];
  function activate(index){
    buttons.forEach((btn,i)=>btn.classList.toggle('active',i===index));
    buttons.forEach((btn,i)=>btn.classList.toggle('done',i<index));
    const state=nav.querySelector('#workspaceState');
    if(state) state.textContent=labels[index]||'DISEÑO';
  }
  buttons.forEach((btn,i)=>btn.addEventListener('click',()=>{
    const target=targets[i];
    activate(i);
    if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  const observedTargets=targets.filter(Boolean);
  if('IntersectionObserver' in window && observedTargets.length){
    const io=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible){const idx=observedTargets.indexOf(visible.target);if(idx>=0) activate(idx);}
    },{root:aside,threshold:[.15,.35,.6]});
    observedTargets.forEach(el=>io.observe(el));
  }
  activate(0);
  aside.prepend(nav);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance,{once:true}); else enhance();
