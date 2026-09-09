import * as THREE from 'https://esm.sh/three@0.161.0';
import {FontLoader} from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import {OrbitControls} from 'https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import {STLExporter} from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';
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
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(120, 180, 140);
scene.add(sun);

const bedLayer = new THREE.Group();
const objectLayer = new THREE.Group();
scene.add(bedLayer, objectLayer);

const FONT_FILES = {
  helvetiker_regular:'helvetiker_regular.typeface.json',
  helvetiker_bold:'helvetiker_bold.typeface.json',
  optimer_regular:'optimer_regular.typeface.json',
  gentilis_regular:'gentilis_regular.typeface.json'
};
const fontCache = new Map();
let font = null;
let objects = [];
let beds = [];
let activeBed = 0;

function setStatus(message, cls='') {
  const el = $('status');
  if (el) el.innerHTML = `<span class="${cls}">${message}</span>`;
}

function printerDims() {
  if ($('printer').value === 'custom') {
    return { x:Math.max(1,+$('cx').value||200), y:Math.max(1,+$('cy').value||200), z:Math.max(1,+$('cz').value||200) };
  }
  const [x,y,z] = $('printer').value.split(',').map(Number);
  return {x,y,z};
}

function purgeDims() {
  if ($('purgeMode').value === 'none') return {x:0,y:0};
  return {x:Math.max(5,+$('purgeX').value||40), y:Math.max(5,+$('purgeY').value||40)};
}

function bedConfig() {
  const full = printerDims();
  const margin = Math.max(0,+$('margin').value||0);
  const purge = purgeDims();
  const usable = {
    x:Math.max(1,full.x - margin*2 - purge.x),
    y:Math.max(1,full.y - margin*2),
    z:Math.max(1,full.z - margin*2)
  };
  return {full, margin, purge, usable};
}

function updateBedInfo() {
  const c = bedConfig();
  $('bedInfo').textContent = `Cama total: ${c.full.x} × ${c.full.y} × ${c.full.z} mm · Área útil: ${c.usable.x} × ${c.usable.y} mm · Z útil: ${c.usable.z} mm`;
  $('purgeInfo').textContent = c.purge.x ? `Reserva lateral: ${c.purge.x} × ${c.purge.y} mm.` : 'Sin reserva de torre de purga.';
  $('guideHeight').textContent = `${Math.max(1,+$('height').value||60)} mm`;
  $('guideDepth').textContent = `${Math.max(.8,+$('depth').value||12)} mm`;
  $('guideWidth').textContent = (+$('widthScale').value||0) > 0 ? `${+$('widthScale').value} mm` : 'Natural';
}

function makeTextSprite(text, width=170) {
  const canvas = document.createElement('canvas');
  canvas.width = 700; canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dfe4eb';
  ctx.font = '700 34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, 350, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.scale.set(width, 24, 1);
  return sprite;
}

function line(points, color=0x8f98a5, opacity=1) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points.map(([x,y,z=0])=>new THREE.Vector3(x,y,z))),
    new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity})
  );
}

function drawBed() {
  bedLayer.clear();
  const c = bedConfig();
  const {x,y} = c.full;
  const group = new THREE.Group();

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(x,y),
    new THREE.MeshBasicMaterial({color:0x151a21,transparent:true,opacity:.98,side:THREE.DoubleSide})
  );
  plate.position.z = -0.25;
  group.add(plate);

  const gridSize = Math.max(x,y);
  const grid = new THREE.GridHelper(gridSize, Math.max(10,Math.round(gridSize/10)), 0x4b535f, 0x252b34);
  grid.rotation.x = Math.PI/2;
  grid.position.z = -0.08;
  grid.scale.set(x/gridSize,y/gridSize,1);
  group.add(grid);

  group.add(line([[-x/2,-y/2,.05],[x/2,-y/2,.05],[x/2,y/2,.05],[-x/2,y/2,.05],[-x/2,-y/2,.05]],0xb7bec8));
  group.add(line([[-x/2,0,.07],[x/2,0,.07]],0x555e6b,.55));
  group.add(line([[0,-y/2,.07],[0,y/2,.07]],0x555e6b,.55));

  const origin = new THREE.Mesh(new THREE.CircleGeometry(2.8,24),new THREE.MeshBasicMaterial({color:0xf5f7fa}));
  origin.position.set(-x/2,-y/2,.1);
  group.add(origin);

  const ux = c.usable.x, uy = c.usable.y;
  const usableLeft = -x/2 + c.margin + c.purge.x;
  const usableBottom = -y/2 + c.margin;
  const usable = new THREE.Mesh(
    new THREE.PlaneGeometry(ux,uy),
    new THREE.MeshBasicMaterial({color:0x1d2630,transparent:true,opacity:.48,side:THREE.DoubleSide})
  );
  usable.position.set(usableLeft + ux/2, usableBottom + uy/2, .01);
  group.add(usable);
  group.add(line([[usableLeft,usableBottom,.08],[usableLeft+ux,usableBottom,.08],[usableLeft+ux,usableBottom+uy,.08],[usableLeft,usableBottom+uy,.08],[usableLeft,usableBottom,.08]],0x657180,.9));

  if (c.purge.x) {
    const purgeX = -x/2 + c.margin + c.purge.x/2;
    const purge = new THREE.Mesh(
      new THREE.PlaneGeometry(c.purge.x,c.purge.y),
      new THREE.MeshBasicMaterial({color:0x8b6f35,transparent:true,opacity:.24,side:THREE.DoubleSide})
    );
    purge.position.set(purgeX, usableBottom+c.purge.y/2, .03);
    group.add(purge);
    group.add(line([
      [purgeX-c.purge.x/2,usableBottom,.1],[purgeX+c.purge.x/2,usableBottom,.1],
      [purgeX+c.purge.x/2,usableBottom+c.purge.y,.1],[purgeX-c.purge.x/2,usableBottom+c.purge.y,.1],
      [purgeX-c.purge.x/2,usableBottom,.1]
    ],0xb58b3c));
    const pl = makeTextSprite('PURGA',80); pl.position.set(purgeX,usableBottom+c.purge.y+.7,.1); group.add(pl);
  }

  const label = makeTextSprite(`CAMA ${activeBed+1} · ${x} × ${y} mm`,170);
  label.position.set(0,-y*.44,.12);
  group.add(label);
  bedLayer.add(group);
}

async function loadFont() {
  const key = $('fontStyle').value;
  if (fontCache.has(key)) { font=fontCache.get(key); return true; }
  try {
    setStatus('Cargando tipografía…','warn');
    font = await new FontLoader().loadAsync(`https://threejs.org/examples/fonts/${FONT_FILES[key]}`);
    fontCache.set(key,font);
    return true;
  } catch (error) {
    console.error(error);
    setStatus('✕ No se pudo cargar la tipografía.','bad');
    return false;
  }
}

function clearObjects() {
  objectLayer.clear(); objects = []; beds = []; activeBed = 0;
  $('pieces').textContent = '0';
  $('sx').textContent = '—'; $('sy').textContent = '—'; $('sz').textContent = '—';
  $('pieceList').innerHTML = ''; $('bedList').innerHTML = '';
  drawBed(); fitCamera();
}

function shapePolygon(shape, segments) {
  const p = shape.extractPoints(segments);
  return [p.shape.map(v=>[v.x,v.y]), ...p.holes.map(r=>r.map(v=>[v.x,v.y]))];
}

function clipPolygonToRect(poly, rect) {
  try { return polygonClipping.intersection(poly, rect); }
  catch(e) { console.error(e); return []; }
}

function extrude(poly, depth) {
  if (!poly?.length || poly[0].length<3) return null;
  const outer = poly[0];
  const shape = new THREE.Shape();
  shape.moveTo(outer[0][0],outer[0][1]);
  for(let i=1;i<outer.length;i++) shape.lineTo(outer[i][0],outer[i][1]);
  shape.closePath();
  for(let h=1;h<poly.length;h++) {
    const ring=poly[h]; if(ring.length<3) continue;
    const hole=new THREE.Path(); hole.moveTo(ring[0][0],ring[0][1]);
    for(let i=1;i<ring.length;i++) hole.lineTo(ring[i][0],ring[i][1]);
    hole.closePath(); shape.holes.push(hole);
  }
  const bevelEnabled=$('bevel').checked;
  const bevelSize=Math.min(+$('bevelSize').value||1.2,depth/2);
  const geometry=new THREE.ExtrudeGeometry(shape,{
    depth,curveSegments:Math.max(3,+$('curveSegments').value||6),
    bevelEnabled,bevelSize,bevelThickness:bevelSize,bevelSegments:Math.max(1,+$('bevelSegments').value||2)
  });
  geometry.translate(0,0,-depth/2);
  return geometry;
}

function material() { return new THREE.MeshStandardMaterial({roughness:.65,metalness:.04}); }

function polygonBounds(poly) {
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const ring of poly) for(const [x,y] of ring) { minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y); }
  return {minX,maxX,minY,maxY,w:maxX-minX,h:maxY-minY};
}

function buildCharacterPolygons(ch, xScale, offsetX, height, segments) {
  const shapes=font.generateShapes(ch,height);
  const polys=[];
  for(const shape of shapes) {
    const poly=shapePolygon(shape,segments);
    for(const ring of poly) for(const p of ring) p[0]=p[0]*xScale+offsetX;
    polys.push(poly);
  }
  return polys;
}

function addPiece(poly, depth, meta) {
  const geometry=extrude(poly,depth); if(!geometry) return null;
  const mesh=new THREE.Mesh(geometry,material());
  mesh.userData=meta;
  objectLayer.add(mesh); objects.push(mesh);
  return mesh;
}

function scaleAndCenter(list) {
  const box=new THREE.Box3(); list.forEach(o=>box.expandByObject(o));
  if(box.isEmpty()) return;
  const cx=(box.min.x+box.max.x)/2, cy=(box.min.y+box.max.y)/2;
  list.forEach(o=>{o.position.x-=cx;o.position.y-=cy;o.updateMatrixWorld(true);});
}

function createNormalText(text,height,depth,spacing,widthTarget) {
  const segments=Math.max(3,+$('curveSegments').value||6);
  const raw=[]; let cursor=0;
  for(const ch of text) {
    const shapes=font.generateShapes(ch,height);
    let min=Infinity,max=-Infinity;
    for(const shape of shapes) { const b=polygonBounds(shapePolygon(shape,segments)); min=Math.min(min,b.minX+cursor); max=Math.max(max,b.maxX+cursor); }
    raw.push({ch,cursor}); cursor += (max-min)+spacing;
  }
  const natural=Math.max(0,cursor-spacing);
  const xScale=widthTarget>0&&natural>0?widthTarget/natural:1;
  const result=[];
  for(const item of raw) {
    const polys=buildCharacterPolygons(item.ch,xScale,item.cursor,height,segments);
    for(const poly of polys) { const mesh=addPiece(poly,depth,{char:item.ch,split:false,part:0}); if(mesh) result.push(mesh); }
  }
  scaleAndCenter(result);
}

function createSplitText(text,height,depth,spacing,widthTarget) {
  const c=bedConfig(), usableW=c.usable.x, usableH=c.usable.y;
  const segments=Math.max(3,+$('curveSegments').value||6);
  const raw=[]; let cursor=0;
  for(const ch of text) {
    const shapes=font.generateShapes(ch,height);
    let min=Infinity,max=-Infinity;
    for(const shape of shapes) { const b=polygonBounds(shapePolygon(shape,segments)); min=Math.min(min,b.minX+cursor); max=Math.max(max,b.maxX+cursor); }
    raw.push({ch,cursor}); cursor += (max-min)+spacing;
  }
  const natural=Math.max(0,cursor-spacing);
  const xScale=widthTarget>0&&natural>0?widthTarget/natural:1;
  const allPolys=[];
  for(const item of raw) allPolys.push(...buildCharacterPolygons(item.ch,xScale,item.cursor,height,segments));
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  allPolys.forEach(p=>{const b=polygonBounds(p);minX=Math.min(minX,b.minX);maxX=Math.max(maxX,b.maxX);minY=Math.min(minY,b.minY);maxY=Math.max(maxY,b.maxY);});
  const shiftX=-minX,shiftY=-minY;
  allPolys.forEach(poly=>poly.forEach(ring=>ring.forEach(p=>{p[0]+=shiftX;p[1]+=shiftY;})));
  const totalW=maxX-minX,totalH=maxY-minY;
  const cols=Math.max(1,Math.ceil(totalW/usableW)),rows=Math.max(1,Math.ceil(totalH/usableH));
  let part=0;
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    const x0=col*usableW,x1=Math.min(totalW,(col+1)*usableW),y0=row*usableH,y1=Math.min(totalH,(row+1)*usableH);
    const rect=[[[x0-.001,y0-.001],[x1+.001,y0-.001],[x1+.001,y1+.001],[x0-.001,y1+.001],[x0-.001,y0-.001]]];
    for(const poly of allPolys) for(const cp of clipPolygonToRect(poly,rect)) {
      if(!cp?.length||cp[0].length<3) continue;
      const mesh=addPiece(cp,depth,{char:'',split:true,part:part++,bandX:col,bandY:row});
      if(mesh){mesh.position.x=-totalW/2;mesh.position.y=-totalH/2;mesh.updateMatrixWorld(true);}
    }
  }
  scaleAndCenter(objects);
}

function boundsObject(o, angle=0) {
  const pos=o.position.clone(), rot=o.rotation.z;
  o.position.set(0,0,0); o.rotation.z=angle; o.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(o);
  o.position.copy(pos); o.rotation.z=rot; o.updateMatrixWorld(true);
  return {minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,w:b.max.x-b.min.x,h:b.max.y-b.min.y};
}

function placeObject(o,x,y,angle=0) {
  o.rotation.z=angle; o.position.set(0,0,0); o.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(o);
  o.position.x=x-b.min.x; o.position.y=y-b.min.y; o.updateMatrixWorld(true);
}

function centerGroup(items) {
  if(!items.length) return;
  const b=new THREE.Box3(); items.forEach(i=>b.expandByObject(i.o));
  const dx=-(b.min.x+b.max.x)/2,dy=-(b.min.y+b.max.y)/2;
  items.forEach(i=>{i.o.position.x+=dx;i.o.position.y+=dy;i.o.updateMatrixWorld(true);});
}

function optimize() {
  if(!objects.length){setStatus('Primero creá el modelo.','warn');return;}
  const c=bedConfig(),gap=Math.max(0,+$('spacing').value||4);
  const items=objects.map((o,index)=>({o,index}));
  const plates=[];
  for(const item of items) {
    let best=null;
    for(const plate of plates) for(const angle of [0,Math.PI/2]) {
      const q=boundsObject(item.o,angle);
      if(q.w>c.usable.x+.001||q.h>c.usable.y+.001) continue;
      let x=0,y=0; const row=plate.rows[plate.rows.length-1];
      if(row){ if(row.x+gap+q.w<=c.usable.x)x=row.x+gap; else {x=0;y=row.y+row.h+gap;} }
      if(y+q.h<=c.usable.y){ const waste=(c.usable.x-(x+q.w))+(c.usable.y-(y+q.h)); if(!best||waste<best.waste)best={plate,angle,q,x,y,waste}; }
    }
    if(!best){
      const plate={items:[],rows:[]}; plates.push(plate);
      let angle=0,q=boundsObject(item.o,0);
      if(q.w>c.usable.x||q.h>c.usable.y){angle=Math.PI/2;q=boundsObject(item.o,angle);}
      if(q.w>c.usable.x||q.h>c.usable.y){setStatus(`✕ La pieza ${item.index+1} supera el área útil de la cama.`,'bad');return;}
      best={plate,angle,q,x:0,y:0,waste:0};
    }
    let row=best.plate.rows[best.plate.rows.length-1];
    if(!row||(best.x===0&&best.y>0)){row={x:0,y:best.y,w:0,h:best.q.h};best.plate.rows.push(row);}
    placeObject(item.o,best.x,best.y,best.angle);
    row.x=Math.max(row.x,best.x+best.q.w);row.h=Math.max(row.h,best.q.h);best.plate.items.push(item);
  }
  beds=plates; beds.forEach(p=>centerGroup(p.items)); activeBed=0; applyBedVisibility(); renderBedList(); updateStats(); fitCamera();
  setStatus(`✓ Camas acomodadas · ${beds.length} cama(s) · separación ${gap} mm · rotación 0°/90°.`,'ok');
}

function applyBedVisibility(){
  const current=beds[activeBed];
  const visible=new Set((current?.items||[]).map(i=>i.o));
  objects.forEach(o=>o.visible=beds.length?visible.has(o):true);
  drawBed();
}

function renderBedList(){
  $('bedList').innerHTML=beds.map((b,i)=>`<div class="bedCard ${i===activeBed?'active':''}"><button class="bedTab" data-bed="${i}"><b>🛏️ Cama ${i+1}</b><span>${b.items.length} piezas</span></button><button class="exportBed" data-bed="${i}">Exportar STL de esta cama</button></div>`).join('');
  document.querySelectorAll('.bedTab').forEach(btn=>btn.onclick=()=>{activeBed=+btn.dataset.bed;applyBedVisibility();renderBedList();fitCamera();});
  document.querySelectorAll('.exportBed').forEach(btn=>btn.onclick=()=>exportBed(+btn.dataset.bed));
}

function updateStats(){
  if(!objects.length){$('sx').textContent='—';$('sy').textContent='—';$('sz').textContent='—';$('pieces').textContent='0';return;}
  const b=new THREE.Box3();objects.forEach(o=>b.expandByObject(o));
  $('sx').textContent=`${(b.max.x-b.min.x).toFixed(1)} mm`;
  $('sy').textContent=`${(b.max.y-b.min.y).toFixed(1)} mm`;
  $('sz').textContent=`${(b.max.z-b.min.z).toFixed(1)} mm`;
  $('pieces').textContent=String(objects.length);
  $('pieceList').innerHTML=objects.map((o,i)=>`<div class="piece"><b>Pieza ${i+1}</b><span>${o.userData.char||'fragmento'}${o.userData.split?' · parte física':''}</span></div>`).join('');
}

function centerAll(){
  if(!objects.length){setStatus('Primero creá el modelo.','warn');return;}
  const items=objects.map(o=>({o})); centerGroup(items);
  beds=[{items}]; activeBed=0; applyBedVisibility(); renderBedList(); fitCamera();
  setStatus(`✓ Modelo centrado en Cama 1 · ${bedConfig().full.x} × ${bedConfig().full.y} mm.`,'ok');
}

async function build(){
  const text=($('text').value||'').trim();
  if(!text){setStatus('Escribí un texto para crear el modelo.','warn');return;}
  if(!(await loadFont()))return;
  objectLayer.clear();objects=[];beds=[];activeBed=0;
  const height=Math.max(1,+$('height').value||60),depth=Math.max(.8,+$('depth').value||12),spacing=Math.max(0,+$('spacing').value||4),widthTarget=Math.max(0,+$('widthScale').value||0);
  const c=bedConfig(),segments=Math.max(3,+$('curveSegments').value||6);
  const shapes=font.generateShapes(text,height);
  let natural=0; for(const s of shapes) natural+=polygonBounds(shapePolygon(s,segments)).w; natural+=Math.max(0,text.length-1)*spacing;
  if(natural<=c.usable.x && height<=c.usable.y) createNormalText(text,height,depth,spacing,widthTarget);
  else createSplitText(text,height,depth,spacing,widthTarget);
  updateStats();
  beds=[{items:objects.map(o=>({o,index:objects.indexOf(o)}))}]; activeBed=0;
  centerGroup(beds[0].items); applyBedVisibility(); renderBedList(); fitCamera();
  setStatus(`✓ Modelo creado · ${objects.length} pieza(s) · centrado en la cama.`,'ok');
}

function exportGroup(group){
  const exporter=new STLExporter(), temp=new THREE.Group();
  (group?.items||objects.map(o=>({o}))).forEach(item=>temp.add(item.o.clone()));
  temp.updateMatrixWorld(true);
  const data=exporter.parse(temp,{binary:true});
  const blob=new Blob([data],{type:'model/stl'}); const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='gemelos3d.stl'; a.click(); URL.revokeObjectURL(a.href);
}
function exportBed(index){exportGroup(beds[index]);}
function exportPieces(){objects.forEach((o,i)=>{const exporter=new STLExporter();const data=exporter.parse(o,{binary:true});const blob=new Blob([data],{type:'model/stl'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`pieza-${i+1}.stl`;a.click();URL.revokeObjectURL(a.href);});}
function saveProject(){const data={text:$('text').value,printer:$('printer').value,height:+$('height').value,width:+$('widthScale').value,depth:+$('depth').value,spacing:+$('spacing').value,margin:+$('margin').value,font:$('fontStyle').value,bevel:$('bevel').checked};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gemelos3d-proyecto.json';a.click();URL.revokeObjectURL(a.href);}

function fitCamera(){
  const {full}=bedConfig(); camera.position.set(0,full.y*.72,Math.max(full.x,full.y)*1.55); camera.lookAt(0,0,0); controls.target.set(0,0,0);
  controls.minDistance=Math.max(40,Math.max(full.x,full.y)*.4); controls.maxDistance=Math.max(900,Math.max(full.x,full.y)*7); controls.update();
}
function resize(){const w=viewer.clientWidth||800,h=viewer.clientHeight||600;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
window.addEventListener('resize',resize);

$('printer').addEventListener('change',()=>{$('customFields').hidden=$('printer').value!=='custom';updateBedInfo();drawBed();fitCamera();});
$('purgeMode').addEventListener('change',()=>{$('purgeFields').hidden=$('purgeMode').value==='none';updateBedInfo();drawBed();});
['cx','cy','cz','margin','purgeX','purgeY'].forEach(id=>$(id)?.addEventListener('input',()=>{updateBedInfo();drawBed();fitCamera();}));
['height','widthScale','depth'].forEach(id=>$(id)?.addEventListener('input',updateBedInfo));
$('fontStyle').addEventListener('change',()=>{font=null;});
$('bevel').addEventListener('change',()=>{$('bevelFields').hidden=!$('bevel').checked;});
$('buildTop').addEventListener('click',build);
$('clearText').addEventListener('click',()=>{$('text').value='';clearObjects();setStatus('Listo. Escribí el texto arriba y bajá por las opciones.');});
$('optimize').addEventListener('click',optimize);
$('centerAll').addEventListener('click',centerAll);
$('download').addEventListener('click',()=>exportGroup(null));
$('downloadPieces').addEventListener('click',exportPieces);
$('project').addEventListener('click',saveProject);

updateBedInfo(); drawBed(); resize(); fitCamera();
setStatus('Listo. La cama se muestra desde el inicio. Escribí el texto y bajá por las opciones.');
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);} animate();
