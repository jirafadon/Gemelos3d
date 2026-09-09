import * as THREE from 'https://esm.sh/three@0.161.0';
import {FontLoader} from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import {OrbitControls} from 'https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import {STLExporter} from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';
import polygonClipping from 'https://esm.sh/polygon-clipping@0.15.7?bundle';

const $=id=>document.getElementById(id);
const viewer=$('viewer');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0b0d11);
const camera=new THREE.PerspectiveCamera(45,1,.1,5000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
viewer.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.screenSpacePanning=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x30343d,2));
const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(120,180,140);scene.add(sun);
const bedLayer=new THREE.Group();
const objectLayer=new THREE.Group();
scene.add(bedLayer,objectLayer);

const FONT_FILES={
  helvetiker_regular:'helvetiker_regular.typeface.json',
  helvetiker_bold:'helvetiker_bold.typeface.json',
  optimer_regular:'optimer_regular.typeface.json',
  gentilis_regular:'gentilis_regular.typeface.json'
};
const fontCache=new Map();
let font=null;
let items=[];
let plates=[];
let activeBed=0;
let modelCreated=false;

function setStatus(text,cls=''){const e=$('status');if(e)e.innerHTML=`<span class="${cls}">${text}</span>`;}
function number(id,fallback){const n=Number($(id)?.value);return Number.isFinite(n)?n:fallback;}
function printerDims(){if($('printer').value==='custom')return{x:Math.max(1,number('cx',200)),y:Math.max(1,number('cy',200)),z:Math.max(1,number('cz',200))};const [x,y,z]=$('printer').value.split(',').map(Number);return{x,y,z};}
function purgeDims(){if($('purgeMode').value==='none')return{x:0,y:0};return{x:Math.max(0,number('purgeX',40)),y:Math.max(0,number('purgeY',40))};}
function bedConfig(){const full=printerDims(),margin=Math.max(0,number('margin',5)),purge=purgeDims();return{full,margin,purge,usable:{x:Math.max(1,full.x-margin*2-purge.x),y:Math.max(1,full.y-margin*2),z:Math.max(1,full.z-margin*2)}};}
function line(points,color=0x8f98a5,opacity=1){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));}
function sprite(text,width=160){const c=document.createElement('canvas');c.width=900;c.height=120;const ctx=c.getContext('2d');ctx.fillStyle='#dfe4eb';ctx.font='700 34px Arial';ctx.textAlign='center';ctx.fillText(text,450,72);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(width,22,1);return s;}

function updateInfo(){const c=bedConfig();$('bedInfo').textContent=`Cama total: ${c.full.x} × ${c.full.y} × ${c.full.z} mm · Área útil: ${c.usable.x} × ${c.usable.y} mm · Z útil: ${c.usable.z} mm`;$('purgeInfo').textContent=c.purge.x?`Reserva lateral: ${c.purge.x} × ${c.purge.y} mm.`:'Sin reserva de torre de purga.';$('guideHeight').textContent=`${Math.max(1,number('height',60))} mm`;$('guideDepth').textContent=`${Math.max(.8,number('depth',12))} mm`;$('guideWidth').textContent=number('widthScale',0)>0?`${number('widthScale',0)} mm`:'Natural';}

function drawBed(){
  bedLayer.clear();
  const c=bedConfig(),x=c.full.x,y=c.full.y,g=new THREE.Group();
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(x,y),new THREE.MeshBasicMaterial({color:0x151a21,transparent:true,opacity:.98,side:THREE.DoubleSide}));
  plate.position.z=-.3;g.add(plate);
  const gs=Math.max(x,y),grid=new THREE.GridHelper(gs,Math.max(10,Math.round(gs/10)),0x4b535f,0x252b34);
  grid.rotation.x=Math.PI/2;grid.scale.set(x/gs,y/gs,1);grid.position.z=-.08;g.add(grid);
  g.add(line([[-x/2,-y/2,.05],[x/2,-y/2,.05],[x/2,y/2,.05],[-x/2,y/2,.05],[-x/2,-y/2,.05]],0xb7bec8));
  g.add(line([[-x/2,0,.07],[x/2,0,.07]],0x555e6b,.55));
  g.add(line([[0,-y/2,.07],[0,y/2,.07]],0x555e6b,.55));
  const origin=new THREE.Mesh(new THREE.CircleGeometry(2.8,24),new THREE.MeshBasicMaterial({color:0xf5f7fa}));origin.position.set(-x/2,-y/2,.1);g.add(origin);
  const ux=c.usable.x,uy=c.usable.y,left=-x/2+c.margin+c.purge.x,bottom=-y/2+c.margin;
  const usable=new THREE.Mesh(new THREE.PlaneGeometry(ux,uy),new THREE.MeshBasicMaterial({color:0x1d2630,transparent:true,opacity:.48,side:THREE.DoubleSide}));
  usable.position.set(left+ux/2,bottom+uy/2,.01);g.add(usable);
  g.add(line([[left,bottom,.08],[left+ux,bottom,.08],[left+ux,bottom+uy,.08],[left,bottom+uy,.08],[left,bottom,.08]],0x657180,.9));
  if(c.purge.x){const px=-x/2+c.margin+c.purge.x/2;const purge=new THREE.Mesh(new THREE.PlaneGeometry(c.purge.x,c.purge.y),new THREE.MeshBasicMaterial({color:0x8b6f35,transparent:true,opacity:.24,side:THREE.DoubleSide}));purge.position.set(px,bottom+c.purge.y/2,.03);g.add(purge);g.add(line([[px-c.purge.x/2,bottom,.1],[px+c.purge.x/2,bottom,.1],[px+c.purge.x/2,bottom+c.purge.y,.1],[px-c.purge.x/2,bottom+c.purge.y,.1],[px-c.purge.x/2,bottom,.1]],0xb58b3c));const p=sprite('PURGA',75);p.position.set(px,bottom+c.purge.y+1,.1);g.add(p);}
  const label=sprite(`CAMA ${activeBed+1} · ${x} × ${y} mm`,175);label.position.set(0,-y*.44,.12);g.add(label);
  bedLayer.add(g);
}

async function loadFont(){
  const key=$('fontStyle').value;
  if(fontCache.has(key)){font=fontCache.get(key);return true;}
  try{setStatus('Cargando tipografía…','warn');font=await new FontLoader().loadAsync(`https://threejs.org/examples/fonts/${FONT_FILES[key]}`);fontCache.set(key,font);return true;}
  catch(e){console.error(e);setStatus('No se pudo cargar la tipografía.','bad');return false;}
}

function shapePoly(shape,segments){const p=shape.extractPoints(segments);return[p.shape.map(v=>[v.x,v.y]),...p.holes.map(r=>r.map(v=>[v.x,v.y]))];}
function polyBounds(poly){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const ring of poly)for(const p of ring){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}return{minX,maxX,minY,maxY,w:maxX-minX,h:maxY-minY};}
function polyShift(poly,dx,dy){return poly.map(r=>r.map(p=>[p[0]+dx,p[1]+dy]));}
function extrude(poly,depth){if(!poly||!poly[0]||poly[0].length<3)return null;const outer=poly[0],shape=new THREE.Shape();shape.moveTo(outer[0][0],outer[0][1]);for(let i=1;i<outer.length;i++)shape.lineTo(outer[i][0],outer[i][1]);shape.closePath();for(let h=1;h<poly.length;h++){const ring=poly[h];if(ring.length<3)continue;const hole=new THREE.Path();hole.moveTo(ring[0][0],ring[0][1]);for(let i=1;i<ring.length;i++)hole.lineTo(ring[i][0],ring[i][1]);hole.closePath();shape.holes.push(hole);}const d=Math.max(.8,depth),bevel=$('bevel').checked,size=Math.min(number('bevelSize',1.2),d/2);const geo=new THREE.ExtrudeGeometry(shape,{depth:d,curveSegments:Math.max(3,number('curveSegments',6)),bevelEnabled:bevel,bevelSize:size,bevelThickness:size,bevelSegments:Math.max(1,number('bevelSegments',2))});geo.computeBoundingBox();return geo;}
function meshFromPoly(poly,depth){const geo=extrude(poly,depth);if(!geo)return null;const box=geo.boundingBox;geo.translate(-box.min.x,-box.min.y,-(box.min.z+box.max.z)/2);const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({roughness:.65,metalness:.04}));mesh.userData.kind='part';return mesh;}
function makeCharacter(ch,x,height,depth,segments,xScale){
  const group=new THREE.Group();
  const shapes=font.generateShapes(ch,height);
  for(const shape of shapes){const poly=shapePoly(shape,segments);for(const ring of poly)for(const p of ring){p[0]=p[0]*xScale+x;}const mesh=meshFromPoly(poly,depth);if(mesh)group.add(mesh);}
  if(!group.children.length)return null;
  group.userData.kind='character';group.userData.char=ch;group.userData.sourceX=x;group.userData.order=items.length;
  group.updateMatrixWorld(true);
  return group;
}
function groupBox(g){g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(g);}
function groupSize(g){const b=groupBox(g);return{x:b.max.x-b.min.x,y:b.max.y-b.min.y};}
function translateGroup(g,x,y){const b=groupBox(g);g.position.x+=x-b.min.x;g.position.y+=y-b.min.y;g.updateMatrixWorld(true);}

function layoutCharacters(text,height,spacing,widthTarget){
  const segments=Math.max(3,number('curveSegments',6));
  const chars=[];let cursor=0,natural=0;
  for(const ch of text){
    const shapes=font.generateShapes(ch,height);let min=Infinity,max=-Infinity;
    for(const shape of shapes){const b=polyBounds(shapePoly(shape,segments));if(Number.isFinite(b.minX)){min=Math.min(min,b.minX);max=Math.max(max,b.maxX);}}
    const advance=Number.isFinite(min)?Math.max(.001,max-min):(font.data?.glyphs?.[ch]?.ha||height*.35);
    chars.push({ch,x:cursor});cursor+=advance+spacing;natural=cursor-spacing;
  }
  natural=Math.max(0,natural);
  const scale=widthTarget>0&&natural>0?widthTarget/natural:1;
  return{chars,natural,width:widthTarget>0?widthTarget:natural,scale};
}

function clearModel(){objectLayer.clear();items=[];plates=[];activeBed=0;modelCreated=false;$('pieces').textContent='0';$('sx').textContent='—';$('sy').textContent='—';$('sz').textContent='—';$('pieceList').innerHTML='';$('bedList').innerHTML='';drawBed();fitCamera();setStatus('Listo. Escribí el texto arriba y bajá por las opciones.');}

function buildModel(){
  clearModel();
  const text=($('text').value||'').trim();
  if(!text){setStatus('Escribí un texto antes de crear el modelo.','warn');return;}
  if(!font){setStatus('La tipografía todavía no está lista.','warn');return;}
  const c=bedConfig(),height=Math.max(1,number('height',60)),depth=Math.max(.8,number('depth',12)),spacing=Math.max(0,number('spacing',4)),target=number('widthScale',0);
  const layout=layoutCharacters(text,height,spacing,target);
  const chars=[];
  for(const it of layout.chars){const g=makeCharacter(it.ch,it.x,height,depth,Math.max(3,number('curveSegments',6)),layout.scale);if(g)chars.push(g);}
  if(!chars.length){setStatus('No se pudo generar el texto.','bad');return;}
  const maxSingle=Math.max(...chars.map(g=>groupSize(g).x));
  if(maxSingle>c.usable.x+.01||Math.max(...chars.map(g=>groupSize(g).y))>c.usable.y+.01){
    // A single oversized character is split into horizontal bands. Normal words remain in source order.
    const expanded=[];
    for(const g of chars){
      const s=groupSize(g);
      if(s.x<=c.usable.x+.01&&s.y<=c.usable.y+.01){expanded.push(g);continue;}
      const gb=groupBox(g),bands=Math.ceil(s.y/c.usable.y),bandH=s.y/bands;
      for(let bi=0;bi<bands;bi++){
        const y0=bi*bandH,y1=Math.min(s.y,(bi+1)*bandH),band=new THREE.Group();
        for(const child of g.children){child.updateMatrixWorld(true);const cb=new THREE.Box3().setFromObject(child);const localMin=cb.min.y-gb.min.y,localMax=cb.max.y-gb.min.y;if(localMax<y0||localMin>y1)continue;
          // For the rare oversized character case use polygon clipping on each child geometry's 2D footprint.
          const shapes=font.generateShapes(g.userData.char,height);for(const shape of shapes){const poly=shapePoly(shape,Math.max(3,number('curveSegments',6)));for(const ring of poly)for(const p of ring){p[0]=p[0]*layout.scale+g.userData.sourceX;p[1]+=0;}const shifted=polyShift(poly,-gb.min.x,-gb.min.y-y0);const rect=[[[0,-.001],[s.x+.001,-.001],[s.x+.001,y1-y0+.001],[0,y1-y0+.001],[0,-.001]]];try{for(const cp of polygonClipping.intersection(shifted,rect)){const m=meshFromPoly(cp,depth);if(m)band.add(m);}}catch(e){console.error(e);}}
        }
        if(band.children.length){band.userData.kind='split';band.userData.char=g.userData.char;band.userData.order=g.userData.order;expanded.push(band);}
      }
    }
    chars.length=0;chars.push(...expanded);
  }
  items=chars.map((g,i)=>({id:i+1,object:g,char:g.userData.char||'',order:i,bed:0,placed:false}));
  items.forEach(it=>objectLayer.add(it.object));
  modelCreated=true;
  pack(false);
  updateModelStats();
  setStatus(`Modelo creado: ${items.length} pieza${items.length===1?'':'s'} · texto en orden y centrado en cama.`,'ok');
}

function resetItemToLocal(it){it.object.position.set(0,0,0);it.object.rotation.z=0;it.object.updateMatrixWorld(true);}
function itemBoundsAt(it,angle=0){resetItemToLocal(it);it.object.rotation.z=angle;it.object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(it.object);const out={w:b.max.x-b.min.x,h:b.max.y-b.min.y};it.object.rotation.z=0;it.object.updateMatrixWorld(true);return out;}
function overlaps(a,b,gap){return a.x < b.x+b.w+gap && a.x+a.w+gap > b.x && a.y < b.y+b.h+gap && a.y+a.h+gap > b.y;}
function findSpot(placed,w,h,c,gap){const candidates=[[0,0]];for(const p of placed){candidates.push([p.x+p.w+gap,p.y],[p.x,p.y+p.h+gap],[p.x+p.w+gap,p.y+p.h+gap]);}let best=null;for(const [x,y] of candidates){if(x<0||y<0||x+w>c.usable.x+.001||y+h>c.usable.y+.001)continue;const r={x,y,w,h};if(placed.some(p=>overlaps(r,p,gap)))continue;const score=(y+h)*100000+(x+w);if(!best||score<best.score)best={x,y,w,h,score};}return best;}
function setPlaced(it,spot,angle,c){resetItemToLocal(it);it.object.rotation.z=angle;it.object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(it.object);const left=-c.full.x/2+c.margin+c.purge.x, bottom=-c.full.y/2+c.margin;const worldX=left+spot.x,worldY=bottom+spot.y;it.object.position.x=worldX-b.min.x;it.object.position.y=worldY-b.min.y;it.object.updateMatrixWorld(true);}
function centerPlate(plate,c){if(!plate.items.length)return;const box=new THREE.Box3();plate.items.forEach(it=>box.expandByObject(it.object));const cx=-c.full.x/2+c.margin+c.purge.x+c.usable.x/2,cy=-c.full.y/2+c.margin+c.usable.y/2;const dx=cx-(box.min.x+box.max.x)/2,dy=cy-(box.min.y+box.max.y)/2;plate.items.forEach(it=>{it.object.position.x+=dx;it.object.position.y+=dy;it.object.updateMatrixWorld(true);});}
function pack(showStatus=true){
  const c=bedConfig(),gap=Math.max(0,number('spacing',4)),queue=[...items].sort((a,b)=>a.order-b.order);
  plates=[];activeBed=0;
  queue.forEach(resetItemToLocal);
  for(const it of queue){
    let placed=false;
    for(let pi=0;pi<plates.length&&!placed;pi++){
      const plate=plates[pi];
      for(const angle of [0,Math.PI/2]){const size=itemBoundsAt(it,angle),spot=findSpot(plate.placed,size.w,size.h,c,gap);if(!spot)continue;setPlaced(it,spot,angle,c);plate.items.push(it);plate.placed.push(spot);it.bed=pi;it.placed=true;placed=true;break;}
    }
    if(!placed){const plate={items:[],placed:[]};const angle=0;const size=itemBoundsAt(it,angle);const spot=findSpot(plate.placed,size.w,size.h,c,gap);if(!spot){setStatus(`La pieza ${it.id} no entra en la cama útil. Bajá el alto o ajustá las medidas.`,'bad');return;}setPlaced(it,spot,angle,c);plate.items.push(it);plate.placed.push(spot);it.bed=plates.length;it.placed=true;plates.push(plate);}
  }
  plates.forEach(p=>centerPlate(p,c));
  drawBed();renderBedList();renderPieceList();updateModelStats();
  if(showStatus)setStatus(`Optimizado: ${plates.length} cama${plates.length===1?'':'s'} · sin superposición · texto completo visible.`,'ok');
}

function optimize(){if(!modelCreated||!items.length){setStatus('Primero creá el modelo y después optimizá las camas.','warn');return;}pack(true);fitCamera();}
function centerAll(){if(!modelCreated||!items.length){setStatus('Primero creá el modelo.','warn');return;}const c=bedConfig();plates.forEach(p=>centerPlate(p,c));drawBed();renderBedList();fitCamera();setStatus('Piezas centradas en el área útil de la cama.','ok');}
function selectBed(index){if(index<0||index>=plates.length)return;activeBed=index;items.forEach(it=>{it.object.visible=it.bed===index;});drawBed();renderBedList();fitCamera();}

function renderBedList(){const e=$('bedList');if(!e)return;e.innerHTML='';plates.forEach((p,i)=>{const d=document.createElement('div');d.className=`bedCard ${i===activeBed?'active':''}`;d.innerHTML=`<button class="bedTab" type="button"><b>Cama ${i+1}</b><span>${p.items.length} pieza${p.items.length===1?'':'s'}</span></button>`;d.querySelector('button').onclick=()=>selectBed(i);e.appendChild(d);});items.forEach(it=>it.object.visible=it.bed===activeBed);}
function renderPieceList(){const e=$('pieceList');if(!e)return;e.innerHTML='';items.forEach(it=>{const d=document.createElement('div');d.className='piece';d.innerHTML=`<b>Pieza ${it.id}</b><span>${it.char?`“${it.char}” · `:''}Cama ${it.bed+1}</span>`;e.appendChild(d);});}
function updateModelStats(){if(!items.length)return;const box=new THREE.Box3();items.forEach(it=>box.expandByObject(it.object));if(box.isEmpty())return;$('sx').textContent=`${(box.max.x-box.min.x).toFixed(1)} mm`;$('sy').textContent=`${(box.max.y-box.min.y).toFixed(1)} mm`;$('sz').textContent=`${Math.max(.8,number('depth',12)).toFixed(1)} mm`;$('pieces').textContent=String(items.length);}

function fitCamera(){const c=bedConfig(),max=Math.max(c.full.x,c.full.y),box=new THREE.Box3().setFromObject(bedLayer);if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3());camera.position.set(center.x,center.y+max*0.78,max*1.35);camera.lookAt(center);controls.target.copy(center);camera.near=.1;camera.far=Math.max(5000,max*20);camera.updateProjectionMatrix();}
function resize(){const w=viewer.clientWidth||800,h=viewer.clientHeight||600;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}

function exportSTL(all=true){if(!modelCreated||!items.length){setStatus('Primero creá el modelo.','warn');return;}const root=new THREE.Group();items.filter(it=>all||it.bed===activeBed).forEach(it=>root.add(it.object.clone(true)));const data=new STLExporter().parse(root,{binary:true});const blob=new Blob([data],{type:'model/stl'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=all?'gemelos3d-completo.stl':`gemelos3d-cama-${activeBed+1}.stl`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function saveProject(){const data={app:'Gemelos 3D',text:$('text').value,height:number('height',60),width:number('widthScale',0),depth:number('depth',12),spacing:number('spacing',4),printer:$('printer').value,margin:number('margin',5),purgeMode:$('purgeMode').value,activeBed,plates:plates.map((p,i)=>({bed:i+1,pieces:p.items.map(it=>({id:it.id,char:it.char}))}))};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gemelos3d-proyecto.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

function wire(){
  ['printer','margin','purgeMode','purgeX','purgeY','height','widthScale','depth','spacing','fontStyle','curveSegments','bevel','bevelSize','bevelSegments'].forEach(id=>{$(id)?.addEventListener('input',()=>{updateInfo();if(id==='printer'||id==='margin'||id.startsWith('purge')){if($('printer').value==='custom')$('customFields').hidden=false;else $('customFields').hidden=true;if($('purgeMode').value==='none')$('purgeFields').hidden=true;else $('purgeFields').hidden=false;drawBed();fitCamera();}if(id==='bevel')$('bevelFields').hidden=!$('bevel').checked;});$(id)?.addEventListener('change',()=>{updateInfo();if(id==='fontStyle')loadFont();});});
  $('buildTop').onclick=async()=>{if(await loadFont())buildModel();};
  $('clearText').onclick=clearModel;
  $('optimize').onclick=optimize;
  $('centerAll').onclick=centerAll;
  $('download').onclick=()=>exportSTL(true);
  $('downloadPieces').onclick=()=>exportSTL(false);
  $('project').onclick=saveProject;
  $('text').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('buildTop').click();}});
}

updateInfo();drawBed();wire();resize();fitCamera();animate();
window.addEventListener('resize',resize);
loadFont();
