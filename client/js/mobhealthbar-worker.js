(function(root,factory){
    if(typeof module==='object' && module.exports) module.exports=factory();
    else root.MobHealthBars=factory();
})(typeof self!=='undefined'?self:null,function(){
    class HealthTrail {
        update(hp,maxHp,now,reducedMotion){
            const ratio=maxHp>0?Math.max(0,Math.min(1,hp/maxHp)):0;
            const current=this.value(now);
            if(this.ratio===undefined || maxHp!==this.maxHp || ratio>this.ratio || reducedMotion){
                this.from=ratio;this.at=now-460;
            } else if(ratio<this.ratio){this.from=Math.max(current,this.ratio);this.at=now;}
            this.ratio=ratio;this.maxHp=maxHp;
            return {ratio,trail:reducedMotion?ratio:this.value(now)};
        }
        value(now){
            if(this.ratio===undefined)return 0;
            const p=Math.max(0,Math.min(1,(now-this.at-180)/280));
            return this.from+(this.ratio-this.from)*(1-Math.pow(1-p,3));
        }
    }
    class Bars {
        constructor(){this.states=new Map();}
        draw(ctx,bars,view,now,reducedMotion){
            const visible=new Set();const scale=view.scale||1;
            for(const bar of bars){
                if(!Number.isFinite(bar.hp)||!Number.isFinite(bar.maxHp)||bar.maxHp<=0||bar.hp<=0)continue;
                visible.add(bar.id);
                if(!this.states.has(bar.id))this.states.set(bar.id,new HealthTrail());
                const value=this.states.get(bar.id).update(bar.hp,bar.maxHp,now,reducedMotion);
                const x=Math.round(bar.x-view.cameraX)*scale,y=Math.round(bar.y-view.cameraY)*scale;
                const width=bar.width||28;
                ctx.fillStyle='#241d25';ctx.fillRect(x-(width/2+1)*scale,y-scale,(width+2)*scale,5*scale);
                ctx.fillStyle='#fff';ctx.fillRect(x-width/2*scale,y,width*value.trail*scale,3*scale);
                ctx.fillStyle='#c74c50';ctx.fillRect(x-width/2*scale,y,width*value.ratio*scale,3*scale);
                ctx.fillStyle='#ea8780';ctx.fillRect(x-width/2*scale,y,width*value.ratio*scale,scale);
            }
            for(const id of this.states.keys())if(!visible.has(id))this.states.delete(id);
        }
    }
    return {HealthTrail,Bars};
});
