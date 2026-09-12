import { Font } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/FontLoader.js';

const $ = id => document.getElementById(id);
const originalGenerateShapes = Font.prototype.generateShapes;
let cacheKey = '';
let stretchY = 1;

function boundsOfShapes(shapes){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const visitPath = path => {
    for(const p of path.getPoints(20)){
      minX=Math.min(minX,p.x); minY=Math.min(minY,p.y);
      maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y);
    }
  };
  for(const shape of shapes){
    visitPath(shape);
    for(const hole of shape.holes||[]) visitPath(hole);
  }
  return {w:Math.max(.001,maxX-minX),h:Math.max(.001,maxY-minY)};
}

function scalePathY(path,scale){
  for(const curve of path.curves||[]){
    for(const key of ['v1','v2','v3']){
      const v=curve[key];
      if(v && Number.isFinite(v.y)) v.y*=scale;
    }
    for(const key of ['aY','yRadius']){
      if(Number.isFinite(curve[key])) curve[key]*=scale;
    }
  }
  if(path.currentPoint && Number.isFinite(path.currentPoint.y)) path.currentPoint.y*=scale;
}

function scaleShapesY(shapes,scale){
  if(Math.abs(scale-1)<1e-9)return shapes;
  for(const shape of shapes){
    scalePathY(shape,scale);
    for(const hole of shape.holes||[]) scalePathY(hole,scale);
  }
  return shapes;
}

Font.prototype.generateShapes = function(text,size=100,direction){
  const fullText=($('text')?.value||'').trim();
  const requestedW=Number($('widthScale')?.value||0);
  const requestedH=Number($('height')?.value||0);
  const key=`${fullText}|${requestedW}|${requestedH}|${$('fontStyle')?.value||''}`;

  if(key!==cacheKey){
    cacheKey=key;
    stretchY=1;
    if(fullText && requestedW>0 && requestedH>0){
      const natural=boundsOfShapes(originalGenerateShapes.call(this,fullText,1,direction));
      const naturalAspect=natural.w/natural.h;
      const targetAspect=requestedW/requestedH;
      if(naturalAspect>0 && targetAspect>0) stretchY=naturalAspect/targetAspect;
    }
  }

  const shapes=originalGenerateShapes.call(this,text,size,direction);
  return scaleShapesY(shapes,stretchY);
};

// The old fixer changed the width input to a proportional value before
// generation. That made 200 × 200 silently become 200 × 38.6.
// The engine now receives the user's real dimensions and stretches only
// the text geometry vertically when both total dimensions are explicit.
