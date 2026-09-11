import { FontLoader } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';

const $ = id => document.getElementById(id);
const FONT = {
  helvetiker_regular:'helvetiker_regular.typeface.json',
  helvetiker_bold:'helvetiker_bold.typeface.json',
  optimer_regular:'optimer_regular.typeface.json',
  gentilis_regular:'gentilis_regular.typeface.json'
};
const cache = new Map();

function bounds(polys){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const poly of polys) for(const ring of poly) for(const p of ring){
    minX=Math.min(minX,p[0]); minY=Math.min(minY,p[1]);
    maxX=Math.max(maxX,p[0]); maxY=Math.max(maxY,p[1]);
  }
  return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
}

function polygonFromShape(shape,segments){
  const p=shape.extractPoints(segments);
  return [p.shape.map(v=>[v.x,v.y]),...p.holes.map(r=>r.map(v=>[v.x,v.y]))];
}

async function naturalSize(text, spacing, segments, fontKey){
  let font=cache.get(fontKey);
  if(!font){
    font=await new FontLoader().loadAsync(`https://threejs.org/examples/fonts/${FONT[fontKey]}`);
    cache.set(fontKey,font);
  }
  let cursor=0;
  const chars=[];
  for(const ch of text){
    const polygons=font.generateShapes(ch,1).map(s=>polygonFromShape(s,segments));
    const b=bounds(polygons);
    const advance=Math.max(.001,b.maxX-b.minX);
    chars.push({x:cursor,minX:b.minX,minY:b.minY,maxX:b.maxX,maxY:b.maxY});
    cursor+=advance+spacing;
  }
  if(!chars.length)return {w:0,h:0};
  const minX=Math.min(...chars.map(c=>c.x+c.minX));
  const maxX=Math.max(...chars.map(c=>c.x+c.maxX));
  const minY=Math.min(...chars.map(c=>c.minY));
  const maxY=Math.max(...chars.map(c=>c.maxY));
  return {w:Math.max(.001,maxX-minX),h:Math.max(.001,maxY-minY)};
}

function install(){
  const button=$('buildTop');
  if(!button || button.dataset.layoutQualityFixInstalled)return;
  const original=button.onclick;
  if(typeof original!=='function')return;
  button.dataset.layoutQualityFixInstalled='1';

  document.addEventListener('click', async event=>{
    if(event.target!==button)return;
    const requestedW=Number($('widthScale')?.value||0);
    const requestedH=Number($('height')?.value||0);
    if(!(requestedW>0) || !(requestedH>0))return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const text=($('text')?.value||'').trim();
    if(!text)return original.call(button,event);

    try{
      const spacing=Math.max(0,Number($('spacing')?.value||0));
      const segments=Math.max(3,Number($('curveSegments')?.value||6));
      const fontKey=$('fontStyle')?.value||'helvetiker_regular';
      const natural=await naturalSize(text,spacing,segments,fontKey);
      if(!natural.w || !natural.h)return original.call(button,event);

      // Treat width and height as maximum physical dimensions, never as
      // independent X/Y scales. This preserves the typeface proportions.
      const scale=Math.min(requestedW/natural.w, requestedH/natural.h);
      const proportionalW=natural.w*scale;
      const widthInput=$('widthScale');
      const oldValue=widthInput.value;
      widthInput.value=String(Number(proportionalW.toFixed(4)));

      const result=original.call(button,event);
      await Promise.resolve(result);
      widthInput.value=oldValue;
      widthInput.dispatchEvent(new Event('input',{bubbles:true}));
      widthInput.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(error){
      console.error('Layout quality fix:',error);
      original.call(button,event);
    }
  },true);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
