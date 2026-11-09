(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else {
        const aura=factory();
        root.RendererExtensions.register('invincibility-aura',{layer:'entities',entries:aura.entries});
    }
})(typeof self!=='undefined'?self:null,function(){
    function draw(ctx,actor,view,front){
        const s=view.scale,x=Math.round(actor.x-view.cameraX),y=Math.round(actor.y-view.cameraY);
        const pixel=(dx,dy,color)=>{ctx.fillStyle=color;ctx.fillRect((x+Math.round(dx))*s,(y+Math.round(dy))*s,s,s);};
        // Separate near/far halves pass around the sprite at its own depth.
        for(let ring=0;ring<3;ring++){
            const phase=((actor.time/1800+ring/3)%1+1)%1,height=phase*36;
            ctx.globalAlpha=Math.max(.45,Math.min(1,phase*8,(1-phase)*8));
            // Rasterize each ellipse once: adjacent pixels stay connected at every zoom.
            for(let dy=-6;dy<=6;dy++)for(let dx=-17;dx<=17;dx++){
                if((dy>=0)!==front)continue;
                const d=dx*dx/256+dy*dy/25;
                if(d<.62||d>1.12)continue;
                pixel(dx,dy-height,d>.98?'#168c91':d<.78?'#adff36':'#f4ffe5');
            }
        }
        ctx.globalAlpha=1;
        for(let i=0;i<14;i++){
            const phase=((actor.time/2400+i/14)%1+1)%1,a=i*2.399+actor.time/5000;
            if((Math.sin(a)>=0)!==front)continue;
            const dx=Math.cos(a)*17,dy=-phase*38+Math.sin(a)*3;
            pixel(dx,dy,'#ffffff');
            if(i%2===0){pixel(dx-1,dy,'#adff36');pixel(dx+1,dy,'#adff36');pixel(dx,dy-1,'#adff36');pixel(dx,dy+1,'#adff36');}
        }
    }
    function entries(actors,view){
        return actors.flatMap(actor=>[false,true].map(front=>({y:actor.y+(front?.1:-.1),draw(ctx){
            ctx.save();draw(ctx,actor,view,front);ctx.restore();
        }})));
    }
    return {entries};
});
