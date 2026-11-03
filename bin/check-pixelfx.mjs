#!/usr/bin/env node
// Exercise every shipped effect's native imports, simulation and transparent drawing.
import {createRequire} from 'node:module';
import {createFrame,createFx,clearFrame,composite} from '../client/js/lib/pixelfx/core/index.mjs';
const {effects}=createRequire(import.meta.url)('../shared/js/pixelfxcatalog.js');
const {rotatePixels,removeDarkBackdrop}=await import('../client/js/pixelfxpainter.mjs');
const rotated=rotatePixels(new Uint8ClampedArray([255,0,0,123,70,70,70,255]),120);
if(String(rotated)!=='0,255,0,123,70,70,70,255')throw new Error('Hue rotation must preserve alpha and neutral colors');
const backdrop=new Uint32Array([0xAA08121A,0xFF08121A,0xAAFFFFFF]);
removeDarkBackdrop(backdrop);
if(backdrop[0]>>>24 || backdrop[1]!==0xFF08121A || backdrop[2]!==0xAAFFFFFF)throw new Error('Backdrop removal must keep opaque outlines and bright pixels');
let count=0;
for(const[id,meta]of Object.entries(effects)) {
    const mod=await import('../client/js/lib/pixelfx/fx/'+id+'.mjs');
    const fx=createFx(mod,{x:meta.origin[0],y:meta.origin[1],seed:1});
    const f=createFrame(...meta.size),out=new Uint8ClampedArray(f.w*f.h*4);
    for(const fraction of [0,.2,.5,.8]) {fx.update(Math.max(0,meta.duration/1000*fraction-fx.t));clearFrame(f);fx.draw(f);removeDarkBackdrop(f.color);composite(f,out,null);}
    count++;
}
console.log('Rendered '+count+' shipped effects at four animation positions.');

// Cached frames must remain drawable after their particle simulation is evicted.
const {PixelFxPainter}=await import('../client/js/pixelfxpainter.mjs');
const painter=new PixelFxPainter((width,height)=>({width,height,getContext:()=>({createImageData:()=>({data:new Uint8ClampedArray(width*height*4)}),putImageData(){}})}));
const small=Object.entries(effects).sort(([,a],[,b])=>a.size[0]*a.size[1]-b.size[0]*b.size[1]).slice(0,33).map(([id])=>id);
for(const id of small){painter.beginFrame();painter.frame(id,0);await painter.load(id);await Promise.resolve();painter.frame(id,0);}
if(painter.instances.has(small[0]))throw new Error('Expected the oldest simulation to be evicted');
if(!painter.draw({drawImage(){}},small[0],0,0,0,1))throw new Error('Cached artwork disappeared after simulation eviction');
console.log('Cached artwork survives simulation eviction.');
