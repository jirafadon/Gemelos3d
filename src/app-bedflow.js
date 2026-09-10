import * as THREE from 'https://esm.sh/three@0.161.0';
import { FontLoader } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';
import polygonClipping from 'https://esm.sh/polygon-clipping@0.15.7?bundle';

const $ = id => document.getElementById(id);
const viewer = $('viewer');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d11);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewer.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.screenSpacePanning = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x30343d, 2));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(120,180,180);
scene.add(light);

const bedLayer = new THREE.Group();
const objectLayer = new THREE.Group();
scene.add(bedLayer, objectLayer);

const FONT = {
  helvetiker_regular:'helvetiker_regular.typeface.json',
  helvetiker_bold:'helvetiker_bold.typeface.json',
  optimer_regular:'optimer_regular.typeface.json',
  gentilis_regular:'gentilis_regular.typeface.json'
};
const fontCache = new Map();
let font = null;
let items = [];
let plates = [];
let activeBed = 0;
let selectedItem = null;

const num = (id, fallback) => {
  const n = Number($(id)?.value);
  return Number.isFinite(n) ? n : fallback;
};
const status = (text, cls='') => { if ($('status')) $('status').innerHTML = `<span class="${cls}">${text}</span>`; };

function printer(){
  if ($('printer').value === 'custom') return { x:Math.max(1,num('cx',200)), y:Math.max(1,num('cy',200)), z:Math.max(1,num('cz',200)) };
  const [x,y,z] = $('printer').value.split(',').map(Number);
  return {x,y,z};
}
function purge(){
  if ($('purgeMode').value === 'none') return {x:0,y:0};
  return {x:Math.max(0,num('purgeX',40)), y:Math.max(0,num('purgeY',40))};
}
function bed(){
  const full = printer(), margin = Math.max(0,num('margin',5)), p = purge();
  return { full, margin, p, usable:{ x:Math.max(1,full.x-margin*2-p.x), y:Math.max(1,full.y-margin*2), z:Math.max(1,full.z-margin*2) } };
}
function bevelSize(){
  if (!$('bevel')?.checked) return 0;
  return Math.min(Math.max(.1,num('bevelSize',1.2)), Math.max(.8,num('depth',12))/2);
}
function line(points,color=0x8f98a5,opacity=1){
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));
}
function label(text){
  const c=document.createElement('canvas'); c.width=900; c.height=120;
  const ctx=c.getContext('2d'); ctx.fillStyle='#dfe4eb'; ctx.font='700 34px Arial'; ctx.textAlign='center'; ctx.fillText(text,450,72);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false})); s.scale.set(170,22,1); return s;
}

function drawBed(){
  bedLayer.clear();
  const c=bed(), x=c.full.x, y=c.full.y, g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(x,y),new THREE.MeshBasicMaterial({color:0x151a21,side:THREE.DoubleSide})));
  const gs=Math.max(x,y);
  const grid=new THREE.GridHelper(gs,Math.max(10,Math.round(gs/10)),0x4b535f,0x252b34);
  grid.rotation.x=Math.PI/2; grid.scale.set(x/gs,y/gs,1); grid.position.z=-.08; g.add(grid);
  g.add(line([[-x/2,-y/2,.05],[x/2,-y/2,.05],[x/2,y/2,.05],[-x/2,y/2,.05],[-x/2,-y/2,.05]],0xb7bec8));
  const left=-x/2+c.margin+c.p.x, bottom=-y/2+c.margin;
  const usable=new THREE.Mesh(new THREE.PlaneGeometry(c.usable.x,c.usable.y),new THREE.MeshBasicMaterial({color:0x1d2630,transparent:true,opacity:.48,side:THREE.DoubleSide}));
  usable.position.set(left+c.usable.x/2,bottom+c.usable.y/2,.01); g.add(usable);
  g.add(line([[left,bottom,.08],[left+c.usable.x,bottom,.08],[left+c.usable.x,bottom+c.usable.y,.08],[left,bottom+c.usable.y,.08],[left,bottom,.08]],0x657180));
  if(c.p.x){const r=new THREE.Mesh(new THREE.PlaneGeometry(c.p.x,c.p.y),new THREE.MeshBasicMaterial({color:0x8b6f35,transparent:true,opacity:.24,side:THREE.DoubleSide}));r.position.set(-x/2+c.margin+c.p.x/2,bottom+c.p.y/2,.03);g.add(r);}
  const l=label(`CAMA ${activeBed+1} · ${x} × ${y} mm`); l.position.set(0,-y*.44,.12); g.add(l); bedLayer.add(g);
}
function info(){
  const c=bed();
  $('bedInfo').textContent=`Cama total: ${c.full.x} × ${c.full.y} × ${c.full.z} mm · Área útil: ${c.usable.x} × ${c.usable.y} mm · Z útil: ${c.usable.z} mm`;
  $('purgeInfo').textContent=c.p.x?`Reserva lateral: ${c.p.x} × ${c.p.y} mm.`:'Sin reserva de torre de purga.';
  $('guideHeight').textContent=`${Math.max(1,num('height',60))} mm`;
  $('guideDepth').textContent=`${Math.max(.8,num('depth',12))} mm`;
  $('guideWidth').textContent=num('widthScale',0)>0?`${num('widthScale',0)} mm`:'Natural';
}
async function loadFont(){
  const key=$('fontStyle').value;
  if(fontCache.has(key)){font=fontCache.get(key);return true;}
  try{font=await new FontLoader().loadAsync(`https://threejs.org/examples/fonts/${FONT[key]}`);fontCache.set(key,font);return true;}
  catch(e){console.error(e);status('No se pudo cargar la tipografía.','bad');return false;}
}
function polygonFromShape(shape,segments){
  const p=shape.extractPoints(segments); return [p.shape.map(v=>[v.x,v.y]),...p.holes.map(r=>r.map(v=>[v.x,v.y]))];
}
function bounds(polys){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const poly of polys) for(const ring of poly) for(const p of ring){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);}
  return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
}
function makeLayout(text,spacing,targetH,targetW){
  const seg=Math.max(3,num('curveSegments',6)); let cursor=0; const chars=[];
  for(const ch of text){
    const polygons=font.generateShapes(ch,1).map(s=>polygonFromShape(s,seg)); const b=bounds(polygons),advance=Math.max(.001,b.maxX-b.minX);
    chars.push({ch,polygons,x:cursor,minX:b.minX,minY:b.minY,maxX:b.maxX,maxY:b.maxY}); cursor+=advance+spacing;
  }
  const minX=Math.min(...chars.map(c=>c.x+c.minX)),maxX=Math.max(...chars.map(c=>c.x+c.maxX)),minY=Math.min(...chars.map(c=>c.minY)),maxY=Math.max(...chars.map(c=>c.maxY));
  const w=Math.max(.001,maxX-minX),h=Math.max(.001,maxY-minY),sy=targetH/h,sx=targetW>0?targetW/w:sy;
  return {chars,sx,sy,minX,minY,width:w*sx,height:h*sy};
}
function scaledPolygons(layout,char){return char.polygons.map(poly=>poly.map(ring=>ring.map(p=>[(p[0]+char.x-layout.minX)*layout.sx,(p[1]-layout.minY)*layout.sy])));}
function meshFromPolygon(poly,depth){
  if(!poly?.[0]||poly[0].length<3)return null; const shape=new THREE.Shape(),outer=poly[0]; shape.moveTo(outer[0][0],outer[0][1]);
  for(let i=1;i<outer.length;i++)shape.lineTo(outer[i][0],outer[i][1]); shape.closePath();
  for(let i=1;i<poly.length;i++){const ring=poly[i];if(ring.length<3)continue;const hole=new THREE.Path();hole.moveTo(ring[0][0],ring[0][1]);for(let j=1;j<ring.length;j++)hole.lineTo(ring[j][0],ring[j][1]);hole.closePath();shape.holes.push(hole);}
  const z=Math.max(.8,depth),bs=Math.min(bevelSize(),z/2); const geo=new THREE.ExtrudeGeometry(shape,{depth:z,curveSegments:Math.max(3,num('curveSegments',6)),bevelEnabled:$('bevel').checked&&bs>0,bevelSize:bs,bevelThickness:bs,bevelSegments:Math.max(1,num('bevelSegments',2))});
  geo.translate(0,0,-z/2); return new THREE.Mesh(geo,new THREE.MeshStandardMaterial({roughness:.65,metalness:.04}));
}
function makeWord(layout,depth){
  const g=new THREE.Group(); for(const ch of layout.chars)for(const poly of scaledPolygons(layout,ch)){const m=meshFromPolygon(poly,depth);if(m)g.add(m);} g.userData.role='word';g.updateMatrixWorld(true);return g;
}
function makeFragment(polys,depth,meta){
  const g=new THREE.Group();for(const poly of polys){const m=meshFromPolygon(poly,depth);if(m)g.add(m);}g.userData={role:'fragment',...meta};g.updateMatrixWorld(true);return g;
}
function splitWord(layout,depth){
  const c=bed(),safeW=Math.max(1,c.usable.x-bevelSize()*2),safeH=Math.max(1,c.usable.y-bevelSize()*2),all=layout.chars.flatMap(ch=>scaledPolygons(layout,ch)),full=bounds(all);
  const cols=Math.max(1,Math.ceil(full.w/safeW)),rows=Math.max(1,Math.ceil(full.h/safeH)),fragments=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const x0=full.minX+col*(full.w/cols),x1=col===cols-1?full.maxX:full.minX+(col+1)*(full.w/cols),y0=full.minY+row*(full.h/rows),y1=row===rows-1?full.maxY:full.minY+(row+1)*(full.h/rows);
    const rect=[[[x0-.001,y0-.001],[x1+.001,y0-.001],[x1+.001,y1+.001],[x0-.001,y1+.001],[x0-.001,y0-.001]]],clipped=[];
    for(const poly of all)try{clipped.push(...polygonClipping.intersection(poly,rect));}catch(e){console.error(e);}
    if(clipped.length)fragments.push(makeFragment(clipped,depth,{row,col,rows,cols}));
  }
  return fragments;
}
function clearSelection(){
  if(selectedItem) selectedItem.object.traverse(n=>{if(n.isMesh&&n.material?.emissive){n.material.emissive.setHex(0x000000);n.material.emissiveIntensity=0;}});
  selectedItem=null;
}
function ensureSelectionPanel(){
  let panel=$('selectedPiece');
  if(panel)return panel;
  panel=document.createElement('div');panel.id='selectedPiece';panel.className='selectedPiece';
  panel.innerHTML='<b>Pieza seleccionada</b><span>Elegí una pieza para ver sus datos.</span>';
  const list=$('pieceList');list.parentElement.insertBefore(panel,list);
  return panel;
}
function selectItem(item){
  if(selectedItem&&selectedItem!==item)clearSelection();
  selectedItem=item;activeBed=item.bed;
  item.object.traverse(n=>{if(n.isMesh&&n.material?.emissive){n.material.emissive.setHex(0x5f748f);n.material.emissiveIntensity=.8;}});
  const panel=ensureSelectionPanel();
  panel.innerHTML=`<b>Pieza ${item.id}</b><span>Cama ${item.bed+1} · ${item.width.toFixed(1)} × ${item.height.toFixed(1)} mm</span><span>Rotación ${(THREE.MathUtils.radToDeg(item.object.rotation.z)%360+360)%360}°</span>`;
  render();
}
function clearObjects(){clearSelection();items=[];plates=[];activeBed=0;objectLayer.clear();$('pieceList').innerHTML='';$('bedList').innerHTML='';$('selectedPiece')?.remove();stats();drawBed();}
function reset(item){item.object.position.set(0,0,0);item.object.rotation.z=0;item.object.updateMatrixWorld(true);}
function itemBox(item,angle=0){reset(item);item.object.rotation.z=angle;item.object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(item.object);const out={w:b.max.x-b.min.x,h:b.max.y-b.min.y};reset(item);return out;}
function overlap(a,b,g){return a.x<b.x+b.w+g&&a.x+a.w+g>b.x&&a.y<b.y+b.h+g&&a.y+a.h+g>b.y;}
function findSpot(used,w,h,c,g){
  const candidates=[[0,0]];for(const p of used)candidates.push([p.x+p.w+g,p.y],[p.x,p.y+p.h+g]);let best=null;
  for(const [x,y] of candidates){if(x<0||y<0||x+w>c.usable.x+.001||y+h>c.usable.y+.001)continue;const r={x,y,w,h};if(used.some(p=>overlap(r,p,g)))continue;const score=(y+h)*100000+x+w;if(!best||score<best.score)best={...r,score};}
  return best;
}
function place(item,rect,angle,c){reset(item);item.object.rotation.z=angle;item.object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(item.object),left=-c.full.x/2+c.margin+c.p.x,bottom=-c.full.y/2+c.margin;item.object.position.x=left+rect.x-b.min.x;item.object.position.y=bottom+rect.y-b.min.y;item.object.updateMatrixWorld(true);}
function centerPlate(plate,c){
  if(!plate.items.length)return;const b=new THREE.Box3();plate.items.forEach(i=>b.expandByObject(i.object));const cx=-c.full.x/2+c.margin+c.p.x+c.usable.x/2,cy=-c.full.y/2+c.margin+c.usable.y/2,dx=cx-(b.min.x+b.max.x)/2,dy=cy-(b.min.y+b.max.y)/2;
  plate.items.forEach(i=>{i.object.position.x+=dx;i.object.position.y+=dy;i.object.updateMatrixWorld(true);});
}
function pack(allowRotate=false){
  const c=bed(),gap=Math.max(0,num('spacing',4));plates=[];items.forEach(reset);
  for(const item of items){let placed=false;const angles=allowRotate?[0,Math.PI/2]:[0];
    for(let pi=0;pi<plates.length&&!placed;pi++)for(const angle of angles){const size=itemBox(item,angle),spot=findSpot(plates[pi].used,size.w,size.h,c,gap);if(!spot)continue;place(item,spot,angle,c);item.bed=pi;plates[pi].items.push(item);plates[pi].used.push(spot);placed=true;break;}
    if(!placed){const size=itemBox(item,0),spot=findSpot([],size.w,size.h,c,gap);if(!spot){status(`La pieza ${item.id} no entra en la cama útil.`,'bad');return false;}const plate={items:[],used:[]};place(item,spot,0,c);item.bed=plates.length;plate.items.push(item);plate.used.push(spot);plates.push(plate);}
  }
  plates.forEach(p=>centerPlate(p,c));render();return true;
}
function render(){items.forEach(i=>{i.object.visible=i.bed===activeBed;});drawBed();renderLists();stats();}
function stats(){
  if(!items.length){$('sx').textContent='—';$('sy').textContent='—';$('sz').textContent='—';$('pieces').textContent='0';return;}
  const b=new THREE.Box3();items.forEach(i=>b.expandByObject(i.object));$('sx').textContent=`${(b.max.x-b.min.x).toFixed(1)} mm`;$('sy').textContent=`${(b.max.y-b.min.y).toFixed(1)} mm`;$('sz').textContent=`${(b.max.z-b.min.z).toFixed(1)} mm`;$('pieces').textContent=String(items.length);
}
function renderLists(){
  const beds=$('bedList');beds.innerHTML='';plates.forEach((p,i)=>{const card=document.createElement('div');card.className=`bedCard${i===activeBed?' active':''}`;card.innerHTML=`<div class="bedTab"><b>Cama ${i+1}</b><span>${p.items.length} pieza${p.items.length===1?'':'s'}</span></div><button>Ver esta cama</button>`;card.querySelector('button').onclick=()=>{activeBed=i;render();};beds.appendChild(card);});
  const pieces=$('pieceList');pieces.innerHTML='';items.forEach(i=>{const row=document.createElement('button');row.type='button';row.className=`piece${i===selectedItem?' selected':''}`;row.innerHTML=`<b>Pieza ${i.id}</b><span>Cama ${i.bed+1} · ${i.width.toFixed(1)} × ${i.height.toFixed(1)} mm</span>`;row.onclick=()=>selectItem(i);pieces.appendChild(row);});
  const panel=ensureSelectionPanel();
  if(!selectedItem)panel.innerHTML='<b>Pieza seleccionada</b><span>Elegí una pieza para ver sus datos.</span>';
}
function frame(){const c=bed();camera.position.set(Math.max(c.full.x,c.full.y)*.72,Math.max(c.full.x,c.full.y)*.72,Math.max(c.full.x,c.full.y)*.72);camera.up.set(0,1,0);controls.target.set(0,0,0);controls.update();}
function setView(view){
  const c=bed(),d=Math.max(c.full.x,c.full.y)*1.65;
  if(view==='top') camera.position.set(0,0,d);
  else if(view==='front') camera.position.set(0,-d,0);
  else if(view==='side') camera.position.set(d,0,0);
  else camera.position.set(d*.72,d*.72,d*.72);
  camera.up.set(0,1,0);controls.target.set(0,0,0);controls.update();
  document.querySelectorAll('.viewTools button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
function build(){
  clearObjects();const text=($('text').value||'').trim();if(!text){status('Escribí un texto antes de crear el modelo.','warn');return;}if(!font){status('La tipografía todavía no está lista.','warn');return;}
  const c=bed(),h=Math.max(1,num('height',60)),d=Math.max(.8,num('depth',12)),spacing=Math.max(0,num('spacing',4)),width=Math.max(0,num('widthScale',0)),layout=makeLayout(text,spacing,h,width),whole=makeWord(layout,d),wb=new THREE.Box3().setFromObject(whole);
  if(wb.max.x-wb.min.x<=c.usable.x+.001&&wb.max.y-wb.min.y<=c.usable.y+.001){const item={id:1,object:whole,bed:0,width:wb.max.x-wb.min.x,height:wb.max.y-wb.min.y,source:text,fragment:false};items.push(item);objectLayer.add(whole);pack(false);status(`Texto creado: ${item.width.toFixed(1)} × ${item.height.toFixed(1)} × ${d.toFixed(1)} mm.`,'ok');return;}
  whole.traverse(n=>{if(n.geometry)n.geometry.dispose();});
  const frags=splitWord(layout,d);if(!frags.length){status('No se pudo dividir el texto con estas medidas.','bad');return;}
  frags.forEach((f,index)=>{const b=new THREE.Box3().setFromObject(f),item={id:index+1,object:f,bed:0,width:b.max.x-b.min.x,height:b.max.y-b.min.y,source:text,fragment:true,gridRow:f.userData.row,gridCol:f.userData.col};items.push(item);objectLayer.add(f);});
  if(pack(false))status(`Texto completo dividido físicamente en ${items.length} fragmentos y distribuido en ${plates.length} camas.`,'ok');
}
function centerAll(){if(!items.length){status('Primero creá el modelo.','warn');return;}plates.forEach(p=>centerPlate(p,bed()));render();status('Modelo centrado en la cama. La escala no cambió.','ok');}
function optimize(){if(!items.length){status('Primero creá el modelo.','warn');return;}if(pack(true))status(`Acomodado terminado: ${plates.length} cama${plates.length===1?'':'s'}. La escala física se mantuvo.`,'ok');}
function exportSTL(parts){
  if(!items.length){status('No hay modelo para exportar.','warn');return;}const out=new THREE.Group();items.forEach(i=>out.add(i.object.clone(true)));out.updateMatrixWorld(true);const text=new STLExporter().parse(out),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'model/stl'}));a.download=parts?'gemelos3d-piezas.stl':'gemelos3d.stl';a.click();URL.revokeObjectURL(a.href);
}
function saveProject(){
  const payload={app:'Gemelos3D',version:6,text:$('text').value,height:num('height',60),widthTotal:num('widthScale',0),depth:num('depth',12),spacing:num('spacing',4),printer:$('printer').value,margin:num('margin',5),purgeMode:$('purgeMode').value,purgeX:num('purgeX',40),purgeY:num('purgeY',40),font:$('fontStyle').value,pieces:items.map(i=>({id:i.id,bed:i.bed,width:i.width,height:i.height}))};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download='gemelos3d-proyecto.json';a.click();URL.revokeObjectURL(a.href);
}
function wire(){
  const ids=['printer','margin','purgeMode','purgeX','purgeY','cx','cy','cz','height','widthScale','depth','spacing','fontStyle','curveSegments','bevel','bevelSize','bevelSegments'];
  ids.forEach(id=>$(id)?.addEventListener('change',async()=>{info();if(id==='fontStyle')await loadFont();if(['printer','margin','purgeMode','purgeX','purgeY','cx','cy','cz'].includes(id)){drawBed();frame();}}));
  $('buildTop').onclick=async()=>{if(await loadFont())build()};
  $('clearText').onclick=clearObjects;
  $('centerAll').onclick=centerAll;
  $('optimize').onclick=optimize;
  $('download').onclick=()=>exportSTL(false);
  $('downloadPieces').onclick=()=>exportSTL(true);
  $('project').onclick=saveProject;
  document.querySelectorAll('.viewTools button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
}
function resize(){const w=Math.max(1,viewer.clientWidth),h=Math.max(1,viewer.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
wire();info();drawBed();frame();resize();window.addEventListener('resize',resize);status('Listo. Escribí el texto arriba y bajá por las opciones.');
(function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);})();