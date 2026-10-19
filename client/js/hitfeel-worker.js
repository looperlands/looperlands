(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.HitFeelRenderer=factory();
})(typeof self!=='undefined'?self:null,function(){
    let mask;
    function drawSprite(ctx,image,draw,effect,scale){
        const {sx,sy,sW,sH,dx,dy,dW,dH}=draw;
        ctx.save();
        const foot=16*scale,center=8*scale;
        ctx.translate(center,foot);ctx.scale(effect.squashX,effect.squashY);ctx.translate(-center,-foot);
        if(effect.shatter!==null){
            const p=Math.max(0,Math.min(1,effect.shatter));ctx.globalAlpha*=1-p;
            const cellW=Math.max(4,Math.ceil(sW/8)),cellH=Math.max(4,Math.ceil(sH/8)),rx=dW/sW,ry=dH/sH;
            const strength=effect.shatterStrength||1;
            for(let y=0;y<sH;y+=cellH)for(let x=0;x<sW;x+=cellW){
                const w=Math.min(cellW,sW-x),h=Math.min(cellH,sH-y);
                const vx=(x-sW/2)*1.5*strength,vy=(-12-(x*17+y*31)%19)*strength;
                ctx.drawImage(image,sx+x,sy+y,w,h,dx+x*rx+Math.round(vx*p)*rx,dy+y*ry+Math.round(vy*p+52*p*p)*ry,w*rx,h*ry);
            }
        }else if(effect.flash){
            mask ||= new OffscreenCanvas(sW,sH);
            if(mask.width!==sW)mask.width=sW;if(mask.height!==sH)mask.height=sH;
            const m=mask.getContext('2d');m.clearRect(0,0,sW,sH);m.drawImage(image,sx,sy,sW,sH,0,0,sW,sH);
            m.globalCompositeOperation='source-in';m.fillStyle='#fff2cf';m.fillRect(0,0,sW,sH);m.globalCompositeOperation='source-over';
            ctx.drawImage(mask,0,0,sW,sH,dx,dy,dW,dH);
        }else ctx.drawImage(image,sx,sy,sW,sH,dx,dy,dW,dH);
        ctx.restore();
    }
    function drawImpacts(ctx,feedback){
        const scale=feedback.scale;
        const point=(x,y)=>[Math.round(x-feedback.cameraX)*scale,Math.round(y-feedback.cameraY)*scale];
        ctx.save();
        for(const impact of feedback.hitFeel||[]){
            const progress=impact.age/280;
            if(impact.slash&&impact.age<110){
                const [x,y]=point(impact.sourceX,impact.sourceY),direction=Math.atan2(impact.dirY,impact.dirX);
                ctx.globalAlpha=1-impact.age/110;ctx.strokeStyle='#fff2bf';ctx.lineWidth=2*scale;
                ctx.beginPath();ctx.arc(x,y,18*scale,direction-1+progress,direction+.9+progress);ctx.stroke();
            }
            ctx.globalAlpha=1-progress;
            for(let i=0;i<impact.sparks;i++){
                const angle=i/impact.sparks*Math.PI*2,distance=3+(1-Math.pow(1-progress,3))*(impact.critical?22:16);
                const [x,y]=point(impact.x+Math.cos(angle)*distance,impact.y+Math.sin(angle)*distance*.7+progress*progress*8);
                ctx.fillStyle=i%3?'#ffb13b':'#fff2bf';ctx.fillRect(x,y,(progress<.5?2:1)*scale,(progress<.5?2:1)*scale);
            }
        }
        ctx.restore();
    }
    return{drawSprite,drawImpacts};
});
