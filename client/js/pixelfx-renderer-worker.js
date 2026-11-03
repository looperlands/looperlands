/* global RendererExtensions, AttackWarning */
(() => {
    importScripts('attackwarning-worker.js');
    let painter;
    import('./pixelfxpainter.mjs').then(({PixelFxPainter}) => {painter=new PixelFxPainter();}).catch(error=>console.warn('PixelFX renderer:',error.message));
    RendererExtensions.register('pixel-fx', {layer:'entities', entries(effects,view) {
        if(!painter)return [];
        painter.beginFrame();
        return effects.filter(e=>Math.abs(e.x-view.cameraX)<view.viewportWidth/view.scale+1024 && Math.abs(e.y-view.cameraY)<view.viewportHeight/view.scale+1024).map(e=>({y:e.y,draw(ctx){painter.draw(ctx,e.effect,e.time,(e.x-view.cameraX)*view.scale,(e.y-view.cameraY)*view.scale,e.scale*view.scale,{palette:e.palette,hue:e.hue,removeBackdrop:e.removeBackdrop});}}));
    }});
    RendererExtensions.register('pixel-fx-tiles', {layer:'ground',draw(ctx,rows,view) {
        const s=view.scale;
        for(const row of rows) {
            const x=(row.x*16-view.cameraX)*s,y=(row.y*16-view.cameraY)*s;
            if(x+row.width*16*s<0 || y+row.height*16*s<0 || x>ctx.canvas.width || y>ctx.canvas.height)continue;
            const progress=row.phase.kind==='warning'?1-row.phase.remaining/row.hazard.warningMs:1;
            for(let dy=0;dy<row.height;dy++)for(let dx=0;dx<row.width;dx++) {
                AttackWarning.tile(ctx,x+dx*16,y+dy*16,progress,row.phase.kind==='active');
            }
            if(row.phase.kind==='warning') {
                ctx.globalAlpha=1;ctx.font='8px sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
                ctx.lineWidth=2;ctx.strokeStyle='#241d25';ctx.fillStyle='#fff0ce';
                const label=(row.phase.remaining/1000).toFixed(1),cx=x+row.width*8,cy=y-2;
                ctx.strokeText(label,cx,cy);ctx.fillText(label,cx,cy);
            }

        }
    }});
})();
