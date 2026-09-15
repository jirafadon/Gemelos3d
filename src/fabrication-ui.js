import './ui-polish.js';
import './layout-quality-fix.js';
import './cost-ui.js';
import './responsive-workspace.js';
import { TALLER_PLAN_RESULT, createTallerPlanRequest } from './core/taller-fabrication-events.js';
import { persistTallerFabricationPlan, recoverTallerFabricationState } from './core/taller-fabrication-persistence.js';

const viewer = document.getElementById('viewer');
const aside = document.querySelector('aside');
const bedList = document.getElementById('bedList');
const pieceList = document.getElementById('pieceList');

function installFabricationUI(){
  if (!viewer || !aside || !bedList || !pieceList) return;

  if (!document.getElementById('fabricationInspectorStyles')) {
    const style = document.createElement('style');
    style.id = 'fabricationInspectorStyles';
    style.textContent = `
      .fabSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:7px 0}
      .fabSummary div{padding:6px 5px;border:1px solid #252a33;border-radius:7px;background:#14181f;text-align:center}
      .fabSummary b{display:block;font-size:13px;color:#f5f7fa}
      .fabSummary span{display:block;margin-top:1px;color:#7f8794;font-size:8px}
      .fabSelectedTitle{font-size:9px;letter-spacing:.08em;color:#7f8794;font-weight:800;margin:8px 0 4px}
      .fabSelected{padding:7px;border:1px solid #303641;border-radius:7px;background:#14181f;min-height:34px}
      .fabSelected b,.fabSelected span{display:block}
      .fabSelected b{font-size:10px}
      .fabSelected span{margin-top:3px;color:#8d96a3;font-size:9px;line-height:1.35}
      .fabBedCard{padding:7px;margin-top:5px;border:1px solid #252a33;border-radius:7px;background:#14181f;font-size:10px;cursor:pointer}
      .fabBedCard.active{border-color:#8a95a5;background:#1a1f27}
      .fabBedMain{display:flex;justify-content:space-between;align-items:center;gap:7px}
      .fabBedMain>div{min-width:0;flex:1}
      .fabBedMain>span{color:#8d96a3;font-size:8px;font-weight:800;white-space:nowrap}
      .fabBedCard button{margin-top:5px;padding:6px;font-size:9px}
      .fabPieceRow{display:flex;justify-content:space-between;gap:7px;padding:7px;margin-top:5px;border:1px solid #252a33;border-radius:7px;background:#14181f;font-size:9px;cursor:pointer}
      .fabPieceRow b{font-size:10px}
      .fabPieceRow span{color:#8d96a3;text-align:right}
      .fabPieceRow.selected{border-color:#8a95a5;background:#1a1f27}
      .fabPlan{margin:8px 0;padding:8px;border:1px solid #303641;border-radius:7px;background:#11151b}
      .fabPlan button{width:100%;padding:8px;font-size:10px}
      .fabPlanStatus{display:block;margin-top:6px;color:#8d96a3;font-size:9px;line-height:1.35}
      .fabricationPanel:not(.hasBeds) .fabBedsTitle,.fabricationPanel:not(.hasBeds) #fabBeds{display:none}
      .fabricationPanel:not(.hasPieces) .fabPiecesTitle,.fabricationPanel:not(.hasPieces) #fabPieces{display:none}
    `;
    document.head.appendChild(style);
  }

  let panel = document.getElementById('fabricationPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'fabricationPanel';
    panel.className = 'fabricationPanel';
    panel.innerHTML = `
      <div class="fabHeader"><div><strong>Fabricación</strong><span>Lo que ves acá es lo que se va a fabricar</span></div><span class="fabLive">● EN VIVO</span></div>
      <div class="fabMode" role="tablist" aria-label="Modo de visualización"><button type="button" data-fab-mode="model" class="active">Modelo</button><button type="button" data-fab-mode="fabrication">Fabricación</button></div>
      <div class="fabSummary" id="fabSummary"><div><b id="fabBedCount">0</b><span>camas</span></div><div><b id="fabPieceCount">0</b><span>piezas</span></div><div><b id="fabActiveBed">—</b><span>cama activa</span></div></div>
      <div class="fabPlan"><button type="button" id="fabPlanButton">Planificar fabricación</button><span class="fabPlanStatus" id="fabPlanStatus" aria-live="polite">Listo para solicitar un plan al Taller.</span></div>
      <div class="fabBedsTitle">CAMAS</div><div id="fabBeds"></div>
      <div class="fabSelectedTitle">SELECCIÓN</div><div id="fabSelected" class="fabSelected"><b>Ninguna pieza seleccionada</b><span>Elegí una pieza para ver sus medidas y cama.</span></div>
      <div class="fabPiecesTitle">PIEZAS</div><div id="fabPieces"></div>
    `;
    viewer.appendChild(panel);
  }

  const fabBeds = panel.querySelector('#fabBeds');
  const fabPieces = panel.querySelector('#fabPieces');
  const fabSelected = panel.querySelector('#fabSelected');
  const fabBedCount = panel.querySelector('#fabBedCount');
  const fabPieceCount = panel.querySelector('#fabPieceCount');
  const fabActiveBed = panel.querySelector('#fabActiveBed');
  const fabPlanButton = panel.querySelector('#fabPlanButton');
  const fabPlanStatus = panel.querySelector('#fabPlanStatus');

  function readSelected(){
    const source = document.getElementById('selectedPiece');
    fabSelected.innerHTML = source ? source.innerHTML : '<b>Ninguna pieza seleccionada</b><span>Elegí una pieza para ver sus medidas y cama.</span>';
  }

  function sync(){
    const bedCards = [...bedList.querySelectorAll('.bedCard')];
    const pieceRows = [...pieceList.querySelectorAll('.piece')];
    const activeIndex = bedCards.findIndex(card => card.classList.contains('active'));
    fabBeds.innerHTML = '';
    bedCards.forEach((card,index)=>{
      const item=document.createElement('div'); item.className=`fabBedCard${index===activeIndex?' active':''}`;
      const tab=card.querySelector('.bedTab'); item.innerHTML=`<div class="fabBedMain"><div>${tab?.innerHTML||`Cama ${index+1}`}</div><span>${index===activeIndex?'ACTIVA':'DISPONIBLE'}</span></div><button type="button">Ver cama ${index+1}</button>`;
      item.querySelector('button').addEventListener('click',event=>{event.stopPropagation();card.querySelector('button')?.click();}); item.addEventListener('click',()=>card.querySelector('button')?.click()); fabBeds.appendChild(item);
    });
    fabPieces.innerHTML='';
    pieceRows.forEach(row=>{const item=document.createElement('div');item.className=`fabPieceRow${row.classList.contains('selected')?' selected':''}`;item.innerHTML=row.innerHTML;item.setAttribute('role','button');item.setAttribute('tabindex','0');const activate=()=>row.click();item.addEventListener('click',activate);item.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});fabPieces.appendChild(item);});
    fabBedCount.textContent=String(bedCards.length); fabPieceCount.textContent=String(pieceRows.length); fabActiveBed.textContent=activeIndex>=0?`Cama ${activeIndex+1}`:'—'; panel.classList.toggle('hasBeds',bedCards.length>0);panel.classList.toggle('hasPieces',pieceRows.length>0);panel.classList.toggle('hasSelection',pieceRows.some(row=>row.classList.contains('selected')));readSelected();
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(sync)); observer.observe(bedList,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); observer.observe(pieceList,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  sync();

  const recovered = recoverTallerFabricationState();
  if (recovered?.pieces?.length) {
    fabPlanStatus.textContent = `Plan recuperado: ${recovered.placed.length} piezas colocadas, ${recovered.rejected.length} rechazadas, ${recovered.beds.length} camas.`;
  }

  fabPlanButton?.addEventListener('click',()=>{fabPlanStatus.textContent='Solicitud enviada al Taller. Esperando el plan…';window.dispatchEvent(createTallerPlanRequest());});
  window.addEventListener(TALLER_PLAN_RESULT,event=>{
    const plan=event.detail?.plan;
    const summary=plan?.summary;
    if(!summary){fabPlanStatus.textContent='El Taller devolvió un resultado sin resumen.';return;}
    try {
      persistTallerFabricationPlan(plan);
      fabPlanStatus.textContent=`Plan guardado: ${summary.placed??0} piezas colocadas, ${summary.rejected??0} rechazadas, ${summary.beds??0} camas.`;
    } catch {
      fabPlanStatus.textContent=`Plan recibido: ${summary.placed??0} piezas colocadas, ${summary.rejected??0} rechazadas, ${summary.beds??0} camas. No se pudo guardar.`;
    }
  });

  panel.querySelectorAll('[data-fab-mode]').forEach(btn=>btn.addEventListener('click',()=>{panel.querySelectorAll('[data-fab-mode]').forEach(b=>b.classList.toggle('active',b===btn));const fabrication=btn.dataset.fabMode==='fabrication';viewer.classList.toggle('fabricationMode',fabrication);panel.classList.toggle('fabricationMode',fabrication);if(fabrication){const section=[...aside.querySelectorAll('section')].find(s=>s.querySelector('#bedList'));section?.scrollIntoView({behavior:'smooth',block:'nearest'});}}));
}

installFabricationUI();
