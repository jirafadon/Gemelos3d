import './project-ui.js';
import { evaluateFabricationExportGuard } from './core/fabrication-export-guard.js';
import { evaluatePersistedFabricationState } from './core/fabrication-state-guard.js';
import { recoverTallerFabricationState } from './core/taller-fabrication-persistence.js';

const aside = document.querySelector('aside');

function value(id, fallback=''){
  const el=document.getElementById(id);
  return el ? (el.value ?? fallback) : fallback;
}
function num(id, fallback=0){const n=Number(value(id,fallback));return Number.isFinite(n)?n:fallback;}
function downloadText(name, text, type='text/plain'){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function collectProject(){
  const pieces=[...document.querySelectorAll('#pieceList .piece')].map(row=>{
    const text=row.textContent.trim();
    const m=text.match(/Pieza\s+(\d+)\s+Cama\s+(\d+)\s+·\s+([\d.,]+)\s+×\s+([\d.,]+)\s+mm/i);
    return m?{id:Number(m[1]),bed:Number(m[2]),widthMm:Number(m[3].replace(',','.')),heightMm:Number(m[4].replace(',','.'))}:{label:text};
  });
  return {
    app:'Gemelos 3D',formatVersion:1,createdAt:new Date().toISOString(),
    design:{text:value('text'),heightMm:num('height',60),widthTotalMm:num('widthScale',0),depthMm:num('depth',12),spacingMm:num('spacing',4),font:value('fontStyle'),curveSegments:num('curveSegments',6),bevel:document.getElementById('bevel')?.checked===true,bevelSizeMm:num('bevelSize',1.2),bevelSegments:num('bevelSegments',2)},
    printer:{preset:value('printer'),marginMm:num('margin',5),purgeMode:value('purgeMode'),purgeXmm:num('purgeX',40),purgeYmm:num('purgeY',40)},
    fabrication:{beds:document.querySelectorAll('#bedList .bedCard').length,pieces},
    exports:{note:'La geometría STL se genera desde el motor de Gemelos 3D al momento de exportar.'}
  };
}
function assertExportSafe(){
  const live=window.__gemelos3dFabricationState;
  const recovered=recoverTallerFabricationState();
  const persisted=window.__gemelos3dProject?.fabrication ?? window.gemelos3dProject?.fabrication;
  const liveGuard=evaluateFabricationExportGuard(live ?? {});
  const recoveredGuard=evaluatePersistedFabricationState(recovered ?? {});
  const persistedGuard=evaluatePersistedFabricationState(persisted ?? {});
  const blocked=[...new Set([...liveGuard.blockedPieceIds,...recoveredGuard.blockedPieceIds,...persistedGuard.blockedPieceIds])];
  if(blocked.length){
    alert(`Exportación bloqueada. Revisá la geometría de: ${blocked.join(', ')}.`);
    return false;
  }
  return true;
}
function install(){
  if(!aside || document.getElementById('exportPlusSection'))return;
  const section=document.createElement('section');section.id='exportPlusSection';
  section.innerHTML=`
    <h2 class="sectionTitle"><span class="sectionNumber">09</span>📤 Entrega</h2>
    <p class="sectionHint">Descargá el resultado final y una ficha técnica del trabajo.</p>
    <button id="exportFullPlus" class="primary">STL completo</button>
    <button id="exportPiecesPlus">STL de piezas</button>
    <button id="exportProjectPlus">Proyecto completo JSON</button>
    <button id="exportSheetPlus">Ficha técnica JSON</button>
    <div class="hint">3MF queda reservado para una integración posterior con geometría y posiciones reales de cada pieza; no se genera un archivo 3MF falso o aproximado.</div>`;
  const current=[...aside.querySelectorAll('section')].find(s=>s.querySelector('#download'));
  current ? current.after(section) : aside.appendChild(section);
  section.querySelector('#exportFullPlus').onclick=()=>{if(assertExportSafe())document.getElementById('download')?.click();};
  section.querySelector('#exportPiecesPlus').onclick=()=>{if(assertExportSafe())document.getElementById('downloadPieces')?.click();};
  section.querySelector('#exportProjectPlus').onclick=()=>{if(assertExportSafe())downloadText('gemelos3d-proyecto-completo.json',JSON.stringify(collectProject(),null,2),'application/json');};
  section.querySelector('#exportSheetPlus').onclick=()=>{
    if(!assertExportSafe())return;
    const p=collectProject();
    const lines=['GEMELOS 3D — FICHA TÉCNICA','',`Texto: ${p.design.text || '—'}`,`Alto: ${p.design.heightMm} mm`,`Ancho total: ${p.design.widthTotalMm || 'Natural'} mm`,`Grosor: ${p.design.depthMm} mm`,`Tipografía: ${p.design.font}`,`Bisel: ${p.design.bevel?'Sí':'No'}`,'',`Impresora: ${p.printer.preset}`,`Margen: ${p.printer.marginMm} mm`,'',`Camas: ${p.fabrication.beds}`,`Piezas: ${p.fabrication.pieces.length}`,'',...p.fabrication.pieces.map(x=>`Pieza ${x.id}: cama ${x.bed}, ${x.widthMm} × ${x.heightMm} mm`),'',`Generado: ${p.createdAt}`];
    downloadText('gemelos3d-ficha-tecnica.txt',lines.join('\n'));
  };
}
install();
