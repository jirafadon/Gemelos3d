import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { FontLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/geometries/TextGeometry.js';
import { STLExporter } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/exporters/STLExporter.js';

const $=id=>document.getElementById(id);
const viewer=$('viewer');
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x101216);
const camera=new THREE.PerspectiveCamera(45,1,.1,5000); camera.position.set(180,150,220);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); viewer.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x30343d,2)); const dl=new THREE.DirectionalLight(0xffffff,2); dl.position.set(100,180,120); scene.add(dl);
const grid=new THREE.GridHelper(600,30,0x333740,0x22262d); grid.rotation.x=Math.PI/2; scene.add(grid);
let group=new THREE.Group(); scene.add(group); let font=null, currentObjects=[];
new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.161.0/examples/fonts/helvetiker_regular.typeface.json', f=>{font=f; build();});

function dims(){ if($('printer').value==='custom') return {x:+$('cx').value,y:+$('cy').value,z:+$('cz').value}; const [x,y,z]=$('printer').value.split(',').map(Number); return {x,y,z}; }
function build(){ if(!font)return; group.clear(); currentObjects=[]; const text=$('text').value||'GEMELOS 3D', h=+$('height').value||60, d=+$('depth').value||12, gap=+$('spacing').value||4; let cursor=0, maxH=0;
  const chars=[...text]; chars.forEach((ch,i)=>{ if(ch===' '){cursor+=h*.45+gap;return;} const geo=new TextGeometry(ch,{font,size:h,height:d,curveSegments:6,bevelEnabled:false}); geo.computeBoundingBox(); const w=geo.boundingBox.max.x-geo.boundingBox.min.x; geo.translate(cursor,0,0); const mat=new THREE.MeshStandardMaterial({roughness:.65,metalness:.05}); const mesh=new THREE.Mesh(geo,mat); group.add(mesh); currentObjects.push(mesh); cursor+=w+gap; maxH=Math.max(maxH,geo.boundingBox.max.y); });
  const totalX=Math.max(0,cursor-gap), totalY=d, totalZ=maxH; const bed=dims(), margin=Math.max(0,+$('margin').value||0); const usable={x:bed.x-2*margin,y:bed.y-2*margin,z:bed.z-2*margin}; const pieces=Math.max(1,Math.ceil(totalX/Math.max(1,usable.x))); $('sx').textContent=totalX.toFixed(1); $('sy').textContent=totalY.toFixed(1); $('sz').textContent=totalZ.toFixed(1); $('pieces').textContent=pieces;
  const fits=totalX<=usable.x&&totalY<=usable.y&&totalZ<=usable.z; $('status').innerHTML=fits?`<span class="ok">✓ Entra en la cama útil (${usable.x} × ${usable.y} × ${usable.z} mm).</span>`:`<span class="warn">⚠ Supera la cama útil (${usable.x} × ${usable.y} × ${usable.z} mm). División estimada: ${pieces} piezas.</span>`;
  group.position.set(-totalX/2,-totalZ/2,0); grid.position.set(0,0,-d/2-1); fitCamera(totalX,totalZ,d);
}
function fitCamera(x,z,y){ const r=Math.max(x,z,y)*1.25; camera.position.set(r*.9,r*.75,r*1.1); camera.lookAt(0,0,0); }
function resize(){ const w=viewer.clientWidth,h=viewer.clientHeight||600; renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix(); } addEventListener('resize',resize); resize();
function animate(){requestAnimationFrame(animate); group.rotation.z=Math.sin(Date.now()/5000)*.02; renderer.render(scene,camera);} animate();
$('build').onclick=build; ['printer','margin','cx','cy','cz','text','height','depth','spacing'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='printer')$('customFields').hidden=$('printer').value!=='custom';build();}));
$('printer').onchange=()=>{$('customFields').hidden=$('printer').value!=='custom';build();};
$('download').onclick=()=>{ if(!currentObjects.length)return; const exporter=new STLExporter(); const merged=new THREE.Group(); currentObjects.forEach(o=>merged.add(o.clone())); const stl=exporter.parse(merged); const blob=new Blob([stl],{type:'model/stl'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gemelos3d-proyecto01.stl';a.click();URL.revokeObjectURL(a.href); };
$('project').onclick=()=>{ const data={app:'Gemelos 3D',project:'Proyecto 01',printer:$('printer').value,custom:{x:$('cx').value,y:$('cy').value,z:$('cz').value},margin:+$('margin').value,text:$('text').value,height:+$('height').value,depth:+$('depth').value,spacing:+$('spacing').value}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gemelos3d-proyecto01.json';a.click();};
