import * as THREE from 'https://esm.sh/three@0.161.0';
import {FontLoader} from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import {STLExporter} from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';
import {OrbitControls} from 'https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
import polygonClipping from 'https://esm.sh/polygon-clipping@0.15.7?bundle';
import {getProject,setActiveProject} from './project/project-storage.js';
import './project/taller-autosave.js';

const $=id=>document.getElementById(id);
const viewer=$('viewer');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x101216);
const camera=new THREE.PerspectiveCamera(45,1,.1,5000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
viewer.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.screenSpacePanning=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x30343d,2));
const light=new THREE.DirectionalLight(0xffffff,2);
light.position.set(100,180,120);
scene.add(light);
const model=new THREE.Group();
const bedsLayer=new THREE.Group();
scene.add(model,bedsLayer);
const fontFiles={helvetiker_regular:'helvetiker_regular.typeface.json',helvetiker_bold:'helvetiker_bold.typeface.json',optimer_regular:'optimer_regular.typeface.json',gentilis_regular:'gentilis_regular.typeface.json'};
const fontCache=new Map();
let font=null;
let objects=[];
let beds=[];
let timer;
const status=(m,c='')=>{const e=$('status');if(e)e.innerHTML=`<span class="${c}">${m}</span>`};
function dims(){if($('printer').value==='custom')return{x:+$('cx').value||1,y:+$('cy').value||1,z:+$('cz').value||1};const [x,y,z]=$('printer').value.split(',').map(Number);return{x,y,z}}
function purge(){if($('purgeMode').value==='none')return{x:0,y:0};return{x:Math.max(5,+$('purgeX').value||40),y:Math.max(5,+$('purgeY').value||40)}}
function bed(){const b=dims(),margin=Math.max(0,+$('margin').value||0),p=purge();return{...b,margin,purge:p,x:Math.max(1,b.x-2*margin-p.x),y:Math.max(1,b.y-2*margin),z:Math.max(1,b.z-2*margin)}}
function bedInfo(){const b=dims(),u=bed(),p=purge();$('bedInfo').textContent=`Cama total: ${b.x} × ${b.y} × ${b.z} mm · Área para piezas: ${u.x} × ${u.y} mm · Z útil: ${u.z} mm`;$('purgeInfo').textContent=p.x?`Reserva lateral: ${p.x} × ${p.y} mm.`:'Sin reserva de torre de purga.'}
async function ensureFont(){const k=$('fontStyle').value;if(fontCache.has(k)){font=fontCache.get(k);return true}try{status('Cargando tipografía…','warn');font=await new FontLoader().loadAsync('https://threejs.org/examples/fonts/'+(fontFiles[k]||fontFiles.helvetiker_regular));fontCache.set(k,font);return true}catch(e){console.error(e);status('✕ No se pudo cargar la tipografía.','bad');return false}}
function clearModel(){model.clear();objects=[];beds=[];$('pieces').textContent='0';$('sx').textContent='—';$('sy').textContent='—';$('sz').textContent='—';$('pieceList').innerHTML='';$('bedList').innerHTML=''}
function drawBeds(b,n){bedsLayer.clear();const gap=40,total=n*b.x+Math.max(0,n-1)*gap,start=-total/2+b.x/2;for(let i=0;i<n;i++){const ox=start+i*(b.x+gap);const plane=new THREE.Mesh(new THREE.PlaneGeometry(b.x,b.y),new THREE.MeshBasicMaterial({color:0x151a21,transparent:true,opacity:.72,side:THREE.DoubleSide}));plane.position.set(ox,0,-.12);bedsLayer.add(plane);const corners=[[-b.x/2,-b.y/2],[b.x/2,-b.y/2],[b.x/2,b.y/2],[-b.x/2,b.y/2],[-b.x/2,-b.y/2]].map(([x,y])=>new THREE.Vector3(ox+x,y,.01));bedsLayer.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(corners),new THREE.LineBasicMaterial({color:0x8a95a5})));const grid=new THREE.GridHelper(Math.max(b.x,b.y),Math.max(10,Math.round(Math.max(b.x,b.y)/10)),0x3a414d,0x252a32);grid.rotation.x=Math.PI/2;grid.position.set(ox,0,.02);bedsLayer.add(grid);const label=document.createElement('canvas');label.width=512;label.height=96;const ctx=label.getContext('2d');ctx.fillStyle='#dce2ea';ctx.font='bold 34px Arial';ctx.fillText(`CAMA ${i+1} · ${b.x} × ${b.y} mm`,18,56);const tex=new THREE.CanvasTexture(label);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.scale.set(Math.min(b.x*.72,180),Math.min(b.y*.12,30),1);sprite.position.set(ox,-b.y*.43,.08);bedsLayer.add(sprite)}}
function shapeToPolygon(shape,segments){const p=shape.extractPoints(segments);return[p.shape.map(v=>[v.x,v.y]),...p.holes.map(r=>r.map(v=>[v.x,v.y]))]}
function boundsOfPolygons(polys){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const poly of polys)for(const ring of poly)for(const [x,y] of ring){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}return{minX,maxX,minY,maxY,w:maxX-minX,h:maxY-minY}}
function extrudePolygon(poly,depth){if(!poly||!poly.length||poly[0].length<3)return null;const outer=poly[0],shape=new THREE.Shape();shape.moveTo(outer[0][0],outer[0][1]);for(let i=1;i<outer.length;i++)shape.lineTo(outer[i][0],outer[i][1]);shape.closePath();for(let i=1;i<poly.length;i++){const ring=poly[i];if(ring.length<3)continue;const hole=new THREE.Path();hole.moveTo(ring[0][0],ring[0][1]);for(let j=1;j<ring.length;j++)hole.lineTo(ring[j][0],ring[j][1]);hole.closePath();shape.holes.push(hole)}const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:Math.max(3,+$('curveSegments').value||6)});geometry.translate(0,0,-depth/2);return geometry}
function material(){return new THREE.MeshStandardMaterial({roughness:.65,metalness:.05})}
function createGlyphPolygons(ch,scaleX,cursor,segments,height){const shapes=font.generateShapes(ch,height),polys=[];for(const shape of shapes){const poly=shapeToPolygon(shape,segments);for(const ring of poly)for(const p of ring)p[0]=p[0]*scaleX+cursor*scaleX;polys.push(poly)}return polys}
function makeFragmentMeshes(polys,rect,depth,split,character,partStart){const out=[],m=material();for(const poly of polys){const clipped=split?polygonClipping.intersection(poly,rect):[poly];for(const clippedPoly of clipped){if(!clippedPoly||!clippedPoly.length||clippedPoly[0].length<3)continue;const g=extrudePolygon(clippedPoly,depth);if(!g)continue;const mesh=new THREE.Mesh(g,m);mesh.userData={char:character,split,part:partStart+out.length};out.push(mesh)}}return out}
function packNormalPieces(items,b){const result=[],gap=4;let current={items:[],x:0,y:0,rowH:0,split:false};const flush=()=>{if(current.items.length)result.push(current);current={items:[],x:0,y:0,rowH:0,split:false}};for(const item of items){item.o.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(item.o),w=box.max.x-box.min.x,h=box.max.y-box.min.y;if(w>b.x+.001||h>b.y+.001)continue;if(current.x>0&&current.x+w>b.x){current.x=0;current.y+=current.rowH+gap;current.rowH=0}if(current.y>0&&current.y+h>b.y)flush();item.o.updateMatrixWorld(true);const q=new THREE.Box3().setFromObject(item.o);item.o.position.x+=current.x-q.min.x;item.o.position.y+=current.y-q.min.y;item.o.updateMatrixWorld(true);current.items.push(item);current.x+=w+gap;current.rowH=Math.max(current.rowH,h)}flush();return result}
function centerGroups(groups,b){const gap=40;groups.forEach((group,index)=>{if(!group.items.length)return;const box=new THREE.Box3();group.items.forEach(item=>box.expandByObject(item.o));const ox=(groups.length-1)*(b.x+gap)/2,bedCenterX=index*(b.x+gap)-ox,dx=bedCenterX-(box.min.x+box.max.x)/2,dy=-(box.min.y+box.max.y)/2,items=group.items;items.forEach(item=>{item.o.position.x+=dx;item.o.position.y+=dy;item.o.updateMatrixWorld(true)})})}
function cameraFit(b,n){const span=Math.max(b.y,n*b.x+Math.max(0,n-1)*40);camera.position.set(0,span*.72,Math.max(span*1.55,220));camera.lookAt(0,0,0);controls.target.set(0,0,0);controls.minDistance=Math.max(40,span*.42);controls.maxDistance=Math.max(900,span*7);controls.update()}
function lists(){$('pieceList').innerHTML=objects.map((o,i)=>`<div class="piece"><b>Pieza ${i+1}</b><span>${o.userData.char||''}${o.userData.split?' · parte '+(o.userData.part+1):''}</span></div>`).join('');$('bedList').innerHTML=beds.map((g,i)=>`<div class="bedCard"><b>🛏️ Cama ${i+1}</b><br>${g.items.length} piezas<button class="exportBed" data-bed="${i}">Exportar STL de esta cama</button></div>`).join('');document.querySelectorAll('.exportBed').forEach(btn=>btn.onclick=()=>exportBed(+btn.dataset.bed));$('pieces').textContent=String(objects.length)}
async function build(){if(!(await ensureFont()))return;const text=($('text').value||'').trim(),height=Math.max(1,+$('height').value||60),depth=Math.max(.8,+$('depth').value||12),spacing=Math.max(0,+$('spacing').value||4),targetWidth=Math.max(0,+$('widthScale').value||0),b=bed();clearModel();bedInfo();drawBeds(b,1);if(!text){$('guideWidth').textContent='—';$('guideHeight').textContent=height.toFixed(1)+' mm';$('guideDepth').textContent=depth.toFixed(1)+' mm';cameraFit(b,1);status('Escribí el texto arriba y tocá “Crear modelo”.','warn');return}const segments=Math.max(12,(+$('curveSegments').value||6)*4),glyphs=[];let cursor=0,naturalHeight=0;for(const ch of [...text]){if(ch===' '){cursor+=height*.45+spacing;continue}const shapes=font.generateShapes(ch,height);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const shape of shapes){const p=shape.extractPoints(segments);for(const v of p.shape){minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y)}for(const ring of p.holes)for(const v of ring){minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y)}}const w=Math.max(.01,maxX-minX);glyphs.push({ch,cursor,w,minX,maxX,minY,maxY});cursor+=w+spacing;naturalHeight=Math.max(naturalHeight,maxY-minY)}const naturalWidth=Math.max(.01,cursor-spacing),scaleX=targetWidth?targetWidth/naturalWidth:1,finalWidth=targetWidth||naturalWidth,normalItems=[],splitGroups=[];let splitCharacters=0;for(const g of glyphs){const polys=createGlyphPolygons(g.ch,scaleX,g.cursor,segments,height),bounds=boundsOfPolygons(polys),tooWide=bounds.w>b.x+.001,tooTall=bounds.h>b.y+.001;if(!tooWide&&!tooTall){const rect=[[[bounds.minX,bounds.minY],[bounds.maxX,bounds.minY],[bounds.maxX,bounds.maxY],[bounds.minX,bounds.maxY],[bounds.minX,bounds.minY]]];for(const mesh of makeFragmentMeshes(polys,rect,depth,false,g.ch,0))normalItems.push({o:mesh,char:g.ch,part:0,split:false});continue}splitCharacters++;const cols=Math.max(1,Math.ceil(bounds.w/b.x)),rows=Math.max(1,Math.ceil(bounds.h/b.y));let part=0;for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x0=bounds.minX+col*b.x,x1=Math.min(bounds.maxX,bounds.minX+(col+1)*b.x),y0=bounds.minY+row*b.y,y1=Math.min(bounds.maxY,bounds.minY+(row+1)*b.y),rect=[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]],meshes=makeFragmentMeshes(polys,rect,depth,true,g.ch,part);if(meshes.length){for(const mesh of meshes){splitGroups.push({items:[{o:mesh,char:g.ch,part:part++,split:true}],split:true})}}}}
if(normalItems.length)beds=packNormalPieces(normalItems,b);else beds=[];beds.push(...splitGroups);if(!beds.length){status('✕ No se pudo generar una pieza válida.','bad');return}beds.forEach(group=>group.items.forEach(item=>{model.add(item.o);objects.push(item.o)}));centerGroups(beds,b);drawBeds(b,beds.length);cameraFit(dims(),beds.length);lists();$('sx').textContent=finalWidth.toFixed(1);$('sy').textContent=naturalHeight.toFixed(1);$('sz').textContent=depth.toFixed(1);$('guideWidth').textContent=finalWidth.toFixed(1)+' mm';$('guideHeight').textContent=naturalHeight.toFixed(1)+' mm';$('guideDepth').textContent=depth.toFixed(1)+' mm';status(`✓ “${text}” · orden original · centrado · ${objects.length} piezas`+(splitCharacters?` · ${splitCharacters} carácter(es) dividido(s) en camas independientes.`:''),'ok')}
async function loadAiModel(){const raw=sessionStorage.getItem('gemelos3dAiModel');if(!raw)return;let data;try{data=JSON.parse(raw)}catch{sessionStorage.removeItem('gemelos3dAiModel');return}if(!data?.modelUrl)return;status('Cargando modelo generado por IA en el Taller…','warn');try{const gltf=await new GLTFLoader().loadAsync(data.modelUrl);clearModel();const imported=gltf.scene;const box=new THREE.Box3().setFromObject(imported),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z)||1;imported.position.sub(center);imported.scale.setScalar(100/max);imported.userData={char:'IA',source:'ai',prompt:data.prompt||''};model.add(imported);objects=[imported];beds=[{items:[{o:imported,char:'IA',part:0,split:false}],split:false}];drawBeds(bed(),1);cameraFit(dims(),1);lists();$('sx').textContent=Math.max(size.x,size.y,size.z).toFixed(1);$('sy').textContent='—';$('sz').textContent='—';status(`✓ Modelo IA cargado en el Taller · ${data.prompt||'modelo generado'}`,'ok');sessionStorage.removeItem('gemelos3dAiModel')}catch(e){console.error(e);status('✕ No se pudo cargar el modelo IA en el Taller.','bad')}}
function schedule(){clearTimeout(timer);timer=setTimeout(build,300)}
function exportObjects(list,name){if(!list.length)return;const root=new THREE.Group();list.forEach(o=>root.add(o.clone()));const stl=new STLExporter().parse(root),u=URL.createObjectURL(new Blob([stl],{type:'model/stl'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function exportBed(i){exportObjects(beds[i]?.items.map(x=>x.o)||[],`gemelos3d-cama-${String(i+1).padStart(2,'0')}.stl`)}
function saveProject(){const data={app:'Gemelos 3D',version:3,text:$('text').value,printer:$('printer').value,margin:$('margin').value,height:$('height').value,widthMm:$('widthScale').value,depth:$('depth').value,spacing:$('spacing').value,font:$('fontStyle').value,curveSegments:$('curveSegments').value,bevel:$('bevel').checked,bevelSize:$('bevelSize').value,bevelSegments:$('bevelSegments').value,purgeMode:$('purgeMode').value,purgeX:$('purgeX').value,purgeY:$('purgeY').value};const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='gemelos3d-proyecto.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}

function applyProject(project){
  if(!project)return;
  setActiveProject(project.id);
  const c=project.configuration||{};
  const set=(id,value)=>{const el=$(id);if(el&&value!==null&&value!==undefined&&value!=='')el.value=String(value)};
  const modelName=project.model?.name||project.name||'';
  if(project.model?.format==='glb'&&project.model?.url){sessionStorage.setItem('gemelos3dAiModel',JSON.stringify({modelUrl:project.model.url,prompt:modelName,source:project.source||'project'}));}
  set('printer',c.printer);set('margin',c.margin);set('spacing',c.spacing);
  const urlText=new URLSearchParams(location.search).get('text');
  if(urlText)set('text',urlText);
  document.title=`Gemelos 3D — ${project.name||'Taller'}`;
  status(`✓ Proyecto cargado: ${project.name||modelName||project.id}`,'ok');
}
function loadProjectFromUrl(){
  const id=new URLSearchParams(location.search).get('project');
  if(!id)return null;
  const project=getProject(id);
  if(!project){status('✕ No se encontró el proyecto solicitado.','bad');return null}
  applyProject(project);
  return project;
}

$('build').onclick=build;
$('buildTop').onclick=build;
$('clearText').onclick=()=>{$('text').value='';clearModel();const b=bed();bedInfo();drawBeds(b,1);cameraFit(b,1);status('Campo limpio. Escribí algo arriba para crear el modelo.','warn');$('text').focus()};
$('centerAll').onclick=build;
$('optimize').onclick=()=>status('Optimización queda pausada hasta cerrar esta base estable.','ok');
$('download').onclick=()=>exportObjects(objects,'gemelos3d-proyecto.stl');
$('downloadPieces').onclick=()=>objects.forEach((o,i)=>exportObjects([o],`gemelos3d-pieza-${String(i+1).padStart(2,'0')}.stl`));
$('project').onclick=saveProject;
['printer','margin','cx','cy','cz','text','height','widthScale','depth','spacing','curveSegments','bevelSize','bevelSegments','purgeMode','purgeX','purgeY'].forEach(id=>$(id)?.addEventListener('input',()=>{if(id==='printer')$('customFields').hidden=$('printer').value!=='custom';if(id==='purgeMode')$('purgeFields').hidden=$('purgeMode').value==='none';bedInfo();schedule()}));
$('printer').onchange=build;
$('fontStyle').onchange=build;
$('bevel').onchange=()=>{$('bevelFields').hidden=!$('bevel').checked;build()};
$('purgeFields').hidden=true;
$('customFields').hidden=$('printer').value!=='custom';
$('bevelFields').hidden=true;

const widthLabel=[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Ancho máximo por letra'));
if(widthLabel)widthLabel.textContent='Ancho total de la palabra (mm)';
const guideLabels=[...document.querySelectorAll('.dimensionLabel')];
if(guideLabels[0])guideLabels[0].textContent='ANCHO TOTAL';
const legend=document.querySelector('.sizeLegend');
if(legend)legend.innerHTML='<b>Medida física</b><br>↔ ancho total de la palabra<br>↕ alto máximo por letra<br>↗ grosor de impresión<br><br>0 mm = ancho natural.';

bedInfo();
drawBeds(bed(),1);
cameraFit(bed(),1);
status('Listo. Escribí el texto arriba y tocá “Crear modelo”.','ok');
const requestedProject=loadProjectFromUrl();
loadAiModel();
function resize(){const w=Math.max(1,viewer.clientWidth),h=Math.max(1,viewer.clientHeight||600);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
addEventListener('resize',resize);
resize();
(function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)})();
