import {createFrame, clearFrame, createFx, composite, PAL} from './lib/pixelfx/core/index.mjs';

// Lazy loading and bounded frame caching are shared by the game worker and Toolbox.
export class PixelFxPainter {
    constructor(canvas = (w,h) => new OffscreenCanvas(w,h)) {
        this.canvas = canvas; this.modules = new Map(); this.metadata = new Map(); this.instances = new Map(); this.frames = new Map(); this.bytes = 0;
        this.seed=1+Math.floor(Math.random()*2147483646);
    }
    beginFrame() {this.frameSpent=0;}
    load(id) {
        if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('Invalid PixelFX ID'));
        if (!this.modules.has(id)) this.modules.set(id, import('./lib/pixelfx/fx/'+id+'.mjs').then(mod => {this.metadata.set(id,mod.meta);return mod;}));
        return this.modules.get(id);
    }
    frame(id, time, {palette, seed = this.seed, options = {}, hue = 0, removeBackdrop = false} = {}) {
        if (palette && !Object.hasOwn(PAL,palette)) throw new Error('Unknown PixelFX palette');
        // Named palettes go into the original shader, as in the upstream gallery.
        // Retain hue only for older saved placements until a palette is selected.
        if (palette) hue=0;
        const instanceKey=JSON.stringify([id,palette || 'original',seed,Object.entries(options).sort(([a],[b])=>a.localeCompare(b))]);
        const step = Math.floor(Math.max(0,time)/1000*20), key = instanceKey+':'+step+':'+hue+':'+removeBackdrop;
        if (this.frames.has(key)) {const frame=this.frames.get(key); this.frames.delete(key); this.frames.set(key,frame); return frame;}
        let item = this.instances.get(instanceKey);
        if (!item) {
            this.instances.set(instanceKey, {loading:true});
            this.load(id).then(mod => {this.instances.set(instanceKey, {mod});}).catch(error => {this.instances.set(instanceKey, {error}); console.warn('PixelFX:',id,error.message);});
            return null;
        }
        if (!item.mod) return null;
        if(this.frameSpent>12) return item.lastHue===hue && item.lastBackdrop===removeBackdrop ? item.last || null : null;
        const started=performance.now();
        const mod=item.mod, t=step/20, [w,h]=mod.meta.size;
        if (!item.fx || item.fx.t>t) item.fx=createFx(mod,{...options,x:mod.meta.origin[0],y:mod.meta.origin[1],seed,...(palette?{palette:PAL[palette]}:{})});
        item.fx.update(Math.max(0,t-item.fx.t));
        item.raw ||= createFrame(w,h); clearFrame(item.raw); item.fx.draw(item.raw);
        if(removeBackdrop) removeDarkBackdrop(item.raw.color);
        const canvas=this.canvas(w,h), ctx=canvas.getContext('2d'), pixels=ctx.createImageData(w,h);
        composite(item.raw,pixels.data,null); rotatePixels(pixels.data,hue); ctx.putImageData(pixels,0,0);
        item.last=canvas;item.lastHue=hue;item.lastBackdrop=removeBackdrop;this.frameSpent=(this.frameSpent || 0)+performance.now()-started;
        this.frames.set(key,canvas); this.bytes+=w*h*4;
        while(this.bytes>16*1024*1024) {const first=this.frames.keys().next().value, old=this.frames.get(first);this.bytes-=old.width*old.height*4;this.frames.delete(first);}
        // Simulations hold particles; do not keep abandoned map instances forever.
        if(this.instances.size>32) for(const other of this.instances.keys()) if(other!==instanceKey){this.instances.delete(other);break;}
        return canvas;
    }
    draw(ctx, effect, milliseconds, x, y, scale, appearance = {}) {
        const frame=this.frame(effect,milliseconds,appearance); if(!frame)return false;
        const meta=this.metadata.get(effect); if(!meta)return false;
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(frame,Math.round(x-meta.origin[0]*scale),Math.round(y-meta.origin[1]*scale),Math.round(frame.width*scale),Math.round(frame.height*scale));
        return true;
    }
}

// Rotate hue after compositing so every upstream effect supports color variations,
// including effects with hard-coded colors. Preserve alpha, saturation and lightness.
export function rotatePixels(pixels, degrees) {
    if (!degrees) return pixels;
    const shift=degrees/360;
    for(let i=0;i<pixels.length;i+=4) {
        if(!pixels[i+3])continue;
        const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255;
        const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
        if(!delta)continue;
        let hue=(max===r?(g-b)/delta:max===g?2+(b-r)/delta:4+(r-g)/delta)/6;
        hue=((hue+shift)%1+1)%1;
        const section=hue*6,x=delta*(1-Math.abs(section%2-1));
        const rgb=section<1?[delta,x,0]:section<2?[x,delta,0]:section<3?[0,delta,x]:section<4?[0,x,delta]:section<5?[x,0,delta]:[delta,0,x];
        for(let c=0;c<3;c++)pixels[i+c]=Math.round((rgb[c]+min)*255);
    }
    return pixels;
}

// Upstream weather shaders deliberately paint dark translucent air over the
// whole canvas. Remove that color wash before compositing; keep the light buffer
// and opaque sprite outlines intact. Mapmakers can retain the original artwork.
export function removeDarkBackdrop(colors) {
    for(let i=0;i<colors.length;i++) {
        const c=colors[i],alpha=c>>>24;
        if(!alpha || alpha>=250)continue;
        const brightness=Math.max(c&255,(c>>>8)&255,(c>>>16)&255);
        if(brightness>=64)continue;
        const opacity=Math.max(0,(brightness-32)/32);
        colors[i]=(Math.round(alpha*opacity)<<24)|(c&0xffffff);
    }
    return colors;
}
