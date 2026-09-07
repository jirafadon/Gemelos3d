import * as THREE from 'https://esm.sh/three@0.161.0';
import {FontLoader} from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import {TextGeometry} from 'https://esm.sh/three@0.161.0/examples/jsm/geometries/TextGeometry.js';
import {STLExporter} from 'https://esm.sh/three@0.161.0/examples/jsm/exporters/STLExporter.js';
import {OrbitControls} from 'https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js';

const $=id=>document.getElementById(id),viewer=$('viewer');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x101216);
const camera=new THREE.PerspectiveCamera(45,1,.1,5000),renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));viewer.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.screenSpacePanning=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x30343d,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(100,180,120);scene.add(light);
const model=new THREE.Group(),bedsLayer=new THREE.Group();scene.add(model,bedsLayer);
const fontFiles={helvetiker_regular:'helvetiker_regular.typeface.json',helvetiker_bold:'helvetiker_bold.typeface.json',optimer_regular:'optimer_regular.typeface.json',gentilis_regular:'gentilis_regular.typeface.json'};
const fontCache=new Map();let font=null,objects=[],beds=[],timer,csgPromise=null;
const status=(m,c='')=>{const e=$('status');if(e)e.innerHTML=`<span class="${c}">${m}</span>`};
function dims(){if($('printer').value==='custom')return{x:+$('cx').value||1,y:+$('cy').value||1,z:+$('cz').value||1};const [x,y,z]=$('printer').value.split(',').map(Number);return{x,y,z}}
function purge(){return $('purgeMode').value==='none'?{x:0,y:0}:{x:Math.max(5,+$('purgeX').value||40),y:Math.max(5,+$('purgeY').value||40)}}
function bed(){const b=dims(),m=Math.max(0,+$('margin').value||0),p=purge();return{...b,margin:m,purge:p,x:Math.max(1,b.x-2*m-p.x),y:Math.max(1,b.y-2*m),z:Math.max(1,b.z-2*m)}}
function bedInfo(){const b=dims(),u=bed(),p=purge();$('bedInfo').textContent=`Cama total: ${b.x} × ${b.y} × ${b.z} mm · Área para piezas: ${u.x} × ${u.y} mm · Z útil: ${u.z} mm`;$('purgeInfo').textContent=p.x?`Reserva lateral: ${p.x} × ${p.y} mm.`:'Sin reserva de torre de purga.'}
async function ensureFont(){const k=$('fontStyle').value;if(fontCache.has(k)){font=fontCache.get(k);return true}try{status('Cargando tipografía…','warn');font=await new FontLoader().loadAsync('https://threejs.org/examples/fonts/'+(fontFiles[k]||fontFiles.helvetiker_regular));fontCache.set(k,font);return true}catch(e){console.error(e);status('✕ No se pudo cargar la tipografía.','bad');return false}}
function geo(ch,h,d){const bevel=$('bevel').checked,s=Math.min(Math.max(.1,+$('bevelSize').value||1.2),d/2,h/8);return new TextGeometry(ch,{font,size:h,height:d,curveSegments:Math.max(3,+$('curveSegments').value||6),bevelEnabled:bevel,bevelThickness:bevel?s:0,bevelSize:bevel?s:0,bevelSegments:bevel?Math.max(1,Math.min(6,+$('bevelSegments').value||2)):0})}
function clearModel(){model.clear();objects=[];beds=[];$('pieces').textContent='0';$('sx').textContent='—';$('sy').textContent='—';$('sz').textContent='—';$('pieceList').innerHTML='';$('bedList').innerHTML=''}
function drawBeds(b,n){bedsLayer.clear();const gap=40,off=(n-1)*(b.x+gap)/2;for(let i=0;i<n;i++){const ox=i*(b.x+gap)-off,p=[[-b.x/2,-b.y/2],[b.x/2,-b.y/2],[b.x/2,b.y/2],[-b.x/2,b.y/2],[-b.x/2,-b.y/2]].map(([x,y])=>new THREE.Vector3(ox+x,y,0));bedsLayer.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),new THREE.LineBasicMaterial({color:0x687383})));const g=new THREE.GridHelper(Math.max(b.x,b.y),Math.max(10,Math.round(Math.max(b.x,b.y)/10)),0x333740,0x22262d);g.rotation.x=Math.PI/2;g.position.set(ox,0,-.05);bedsLayer.add(g);if(b.purge.x){const q=new THREE.Mesh(new THREE.BoxGeometry(b.purge.x,b.purge.y,.15),new THREE.MeshBasicMaterial({color:0x333740,transparent:true,opacity:.7}));q.position.set(ox+b.x/2-b.margin-b.purge.x/2,-b.y/2+b.margin+b.purge.y/2,.1);bedsLayer.add(q)}}}
function pack(list,b){const out=[{items:[]}],last=out[0];let x=0,y=0,row=0;for(const o of list){o.updateMatrixWorld(true);const q=new THREE.Box3().setFromObject(o),w=q.max.x-q.min.x,h=q.max.y-q.min.y;if(w>b.x+.01||h>b.y+.01){last.items.push({o,invalid:true});continue}if(x&&x+w>b.x){x=0;y+=row+2;row=0}if(y+h>b.y){last={items:[]};out.push(last);x=0;y=0;row=0}last.items.push({o,invalid:false});x+=w+2;row=Math.max(row,h)}return out}
function center(groups,b){const gap=40,off=(groups.length-1)*(b.x+gap)/2;groups.forEach((g,i)=>{const valid=g.items.filter(x=>!x.invalid);if(!valid.length)return;const box=new THREE.Box3();valid.forEach(x=>box.expandByObject(x.o));const ox=i*(b.x+gap)-off,dx=ox-(box.min.x+box.max.x)/2,dy=-(box.min.y+box.max.y)/2;valid.forEach(x=>{x.o.position.x+=dx;x.o.position.y+=dy;x.o.updateMatrixWorld(true)})})}
function cameraFit(b,n){const span=Math.max(b.y,n*b.x+Math.max(0,n-1)*40);camera.position.set(0,span*.72,span*1.55);controls.target.set(0,0,0);controls.minDistance=Math.max(40,span*.42);controls.maxDistance=Math.max(900,span*7);controls.update()}
function lists(){ $('pieceList').innerHTML=objects.map((o,i)=>`<div class="piece"><b>Pieza ${i+1}</b><span>${o.userData.char}${o.userData.sourceIndex!=null?` · original ${o.userData.sourceIndex+1}`:''}</span></div>`).join('');$('bedList').innerHTML=beds.map((g,i)=>`<div class="bedCard"><b>🛏️ Cama ${i+1}</b><br>${g.items.filter(x=>!x.invalid).length} piezas${g.items.some(x=>x.split)?' · incluye divisiones':''}<button class="exportBed" data-bed="${i}">Exportar STL de esta cama</button></div>`).join('');document.querySelectorAll('.exportBed').forEach(b=>b.onclick=()=>exportBed(+b.dataset.bed))}
async function getCSG(){if(!csgPromise)csgPromise=import('https://esm.sh/three-bvh-csg@0.0.17?external=three');return csgPromise}
async function splitMeshToBed(mesh,b,material){
  mesh.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(mesh),w=box.max.x-box.min.x,h=box.max.y-box.min.y;
  if(w<=b.x+.01&&h<=b.y+.01)return [mesh];
  const {Brush,Evaluator,INTERSECTION}=await getCSG();
  const source=mesh.geometry.clone();source.applyMatrix4(mesh.matrixWorld);source.clearGroups();
  const sourceBrush=new Brush(source);sourceBrush.updateMatrixWorld(true);
  const evaluator=new Evaluator();evaluator.useGroups=false;
  const pieces=[];const nx=Math.max(1,Math.ceil(w/b.x)),ny=Math.max(1,Math.ceil(h/b.y));
  for(let ix=0;ix<nx;ix++)for(let iy=0;iy<ny;iy++){
    const x0=box.min.x+ix*b.x,x1=Math.min(box.max.x,x0+b.x),y0=box.min.y+iy*b.y,y1=Math.min(box.max.y,y0+b.y);
    const bw=Math.max(.01,x1-x0),bh=Math.max(.01,y1-y0),pad=.02;
    const cutter=new Brush(new THREE.BoxGeometry(bw+pad,bh+pad,Math.max(.1,box.max.z-box.min.z+.04)));
    cutter.position.set((x0+x1)/2,(y0+y1)/2,(box.min.z+box.max.z)/2);cutter.updateMatrixWorld(true);
    try{
      const result=evaluator.evaluate(sourceBrush,cutter,INTERSECTION);
      if(!result?.geometry||result.geometry.attributes.position.count<3)continue;
      result.geometry.clearGroups();result.geometry.computeBoundingBox();
      result.geometry.setDrawRange(0,result.geometry.index?result.geometry.index.count:result.geometry.attributes.position.count);
      const part=new THREE.Mesh(result.geometry,material.clone());part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.set(1,1,1);part.userData={...mesh.userData,split:true,splitCell:`${ix+1}/${iy+1}`,sourceIndex:mesh.userData.sourceIndex};pieces.push(part);
    }catch(e){console.error('CSG split failed',e)}
    cutter.geometry.dispose();
  }
  source.dispose();
  if(!pieces.length)throw new Error('No se pudo generar una división válida.');
  return pieces;
}
async function splitOversized(chars,b){
  const out=[];let splitCount=0;
  for(let i=0;i<chars.length;i++){
    const o=chars[i];o.updateMatrixWorld(true);const q=new THREE.Box3().setFromObject(o),w=q.max.x-q.min.x,h=q.max.y-q.min.y;
    if(w<=b.x+.01&&h<=b.y+.01){o.userData.sourceIndex=i;out.push(o);continue}
    status(`Dividiendo pieza ${i+1} en partes fabricables…`,'warn');
    try{const parts=await splitMeshToBed(o,b,o.material);o.geometry.dispose();o.material.dispose();parts.forEach(p=>{p.userData.sourceIndex=i;out.push(p)});splitCount+=parts.length-1}catch(e){console.error(e);o.userData.sourceIndex=i;o.userData.splitFailed=true;out.push(o)}
  }
  return{items:out,splitCount};
}
async function build(){if(!(await ensureFont()))return;const text=($('text').value||'').trim(),h=Math.max(1,+$('height').value||60),d=Math.max(.8,+$('depth').value||12),gap=Math.max(0,+$('spacing').value||4),target=Math.max(0,+$('widthScale').value||0),b=bed();clearModel();bedInfo();drawBeds(b,1);cameraFit(dims(),1);if(!text){$('guideWidth').textContent='—';$('guideHeight').textContent=h.toFixed(1)+' mm';$('guideDepth').textContent=d.toFixed(1)+' mm';status('Escribí el texto arriba y tocá “Crear modelo”.','warn');return}
  let cursor=0,natural=0,maxH=0;const chars=[];for(const ch of [...text]){if(ch===' '){cursor+=h*.45+gap;continue}const g=geo(ch,h,d);g.computeBoundingBox();const q=g.boundingBox,w=Math.max(.01,q.max.x-q.min.x),o=new THREE.Mesh(g,new THREE.MeshStandardMaterial({roughness:.65,metalness:.05}));o.position.x=cursor;o.userData={char:ch,width:w};chars.push(o);cursor+=w+gap;maxH=Math.max(maxH,q.max.y-q.min.y)}
  natural=Math.max(.01,cursor-gap);const sx=target?target/natural:1,total=target||natural;chars.forEach(o=>{o.position.x*=sx;o.scale.x=sx;o.userData.width*=sx;o.updateMatrixWorld(true)});
  const split=await splitOversized(chars,b);objects=split.items;objects.forEach(o=>model.add(o));
  beds=pack(objects,b);center(beds,b);drawBeds(b,beds.length);cameraFit(dims(),beds.length);lists();$('sx').textContent=total.toFixed(1);$('sy').textContent=maxH.toFixed(1);$('sz').textContent=d.toFixed(1);$('guideWidth').textContent=total.toFixed(1)+' mm';$('guideHeight').textContent=maxH.toFixed(1)+' mm';$('guideDepth').textContent=d.toFixed(1)+' mm';$('pieces').textContent=objects.length;
  const failed=objects.some(o=>o.userData.splitFailed),invalid=beds.flatMap(g=>g.items).some(x=>x.invalid);if(failed||invalid)status('✕ Hay una pieza que no pudo dividirse de forma segura. No se exporta como fabricación final.','bad');else if(split.splitCount)status(`✓ División física aplicada: ${split.splitCount} cortes adicionales · orden original · piezas centradas por cama.`,'ok');else status(`✓ “${text}” · orden original · centrado en cama · ${beds.length} cama${beds.length>1?'s':''}.`,'ok')}
function schedule(){clearTimeout(timer);timer=setTimeout(build,300)}
function exportObjects(list,name){if(!list.length)return;const root=new THREE.Group();list.forEach(o=>root.add(o.clone()));root.updateMatrixWorld(true);const stl=new STLExporter().parse(root,{binary:true}),u=URL.createObjectURL(new Blob([stl],{type:'model/stl'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function exportBed(i){exportObjects(beds[i]?.items.filter(x=>!x.invalid&&!x.o.userData.splitFailed).map(x=>x.o)||[],`gemelos3d-cama-${String(i+1).padStart(2,'0')}.stl`)}
function saveProject(){const data={app:'Gemelos 3D',version:1,text:$('text').value,printer:$('printer').value,margin:$('margin').value,height:$('height').value,widthMm:$('widthScale').value,depth:$('depth').value,spacing:$('spacing').value,font:$('fontStyle').value,curveSegments:$('curveSegments').value,bevel:$('bevel').checked,bevelSize:$('bevelSize').value,bevelSegments:$('bevelSegments').value,purgeMode:$('purgeMode').value,purgeX:$('purgeX').value,purgeY:$('purgeY').value};const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='gemelos3d-proyecto.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$('build').onclick=build;$('buildTop').onclick=build;$('clearText').onclick=()=>{$('text').value='';clearModel();const b=bed();bedInfo();drawBeds(b,1);cameraFit(dims(),1);status('Campo limpio. Escribí algo arriba para crear el modelo.','warn');$('text').focus()};$('centerAll').onclick=build;$('optimize').onclick=()=>status('Optimización queda pausada hasta cerrar esta base estable.','ok');$('download').onclick=()=>exportObjects(objects.filter(o=>!o.userData.splitFailed),'gemelos3d-proyecto02.stl');$('downloadPieces').onclick=()=>objects.filter(o=>!o.userData.splitFailed).forEach((o,i)=>exportObjects([o],`gemelos3d-pieza-${String(i+1).padStart(2,'0')}.stl`));$('project').onclick=saveProject;
['printer','margin','cx','cy','cz','text','height','widthScale','depth','spacing','curveSegments','bevelSize','bevelSegments','purgeMode','purgeX','purgeY'].forEach(id=>$(id)?.addEventListener('input',()=>{if(id==='printer')$('customFields').hidden=$('printer').value!=='custom';if(id==='purgeMode')$('purgeFields').hidden=$('purgeMode').value==='none';bedInfo();schedule()}));$('printer').onchange=build;$('fontStyle').onchange=build;$('bevel').onchange=()=>{$('bevelFields').hidden=!$('bevel').checked;build()};$('purgeFields').hidden=true;$('customFields').hidden=$('printer').value!=='custom';$('bevelFields').hidden=true;bedInfo();drawBeds(bed(),1);cameraFit(dims(),1);status('Listo. Escribí el texto arriba y tocá “Crear modelo”.','ok');
function resize(){const w=Math.max(1,viewer.clientWidth),h=Math.max(1,viewer.clientHeight||600);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();(function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)})();
