(function(root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./mobhealthbar-worker'));
    else {
        if (!root.MobHealthBars) importScripts('mobhealthbar-worker.js');
        const renderer = factory(root.MobHealthBars);
        root.RendererExtensions.register('combat-prototype-ground', {layer:'ground', draw:renderer.ground});
        root.RendererExtensions.register('combat-prototype', {layer:'foreground', draw:renderer.draw});
    }
})(typeof self !== 'undefined' ? self : null, function(HealthBars) {
    const healthBars = new HealthBars.Bars();
    function warningTile(ctx,x,y,progress,impact) {
        ctx.fillStyle = impact ? 'rgba(232,134,72,.24)' : `rgba(227,174,100,${.06+.08*progress})`;
        ctx.fillRect(x+1,y+1,14,14);
        ctx.strokeStyle = `rgba(239,192,123,${impact ? .8 : .4+.3*progress})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Small corner marks leave the center clear, without a full box or an X.
        for (const [cx,cy,dx,dy] of [[1.5,1.5,1,1],[14.5,1.5,-1,1],[1.5,14.5,1,-1],[14.5,14.5,-1,-1]]) {
            ctx.moveTo(x+cx,y+cy+dy*3);ctx.lineTo(x+cx,y+cy);ctx.lineTo(x+cx+dx*3,y+cy);
        }
        ctx.stroke();
    }
    const renderer = {
        ground(ctx, state, view) {
            for (const attack of state.fieldAttacks || []) renderer.ground(ctx,attack,view);
            if (state.pattern === 'slam') { renderer.slamGround(ctx,state,view);return; }
            if (state.phase === 'windup') {
                const progress = Math.max(0, Math.min(1, 1-(state.until-state.now)/(state.windup||850)));
                const pulse = .5 + .5*Math.sin(state.now/45);
                const x = state.mobX+8-view.cameraX, y = state.mobY+14-view.cameraY;
                ctx.beginPath(); ctx.ellipse(x,y,7+progress*5,3+progress*2,0,0,Math.PI*2);
                ctx.fillStyle = `rgba(255,120,55,${.18+progress*.25+pulse*.12})`; ctx.fill();
                ctx.strokeStyle = '#ffcf80'; ctx.lineWidth = 1; ctx.stroke();
            }
            for (const tile of state.lane || []) {
                const x=tile.x*16-view.cameraX, y=tile.y*16-view.cameraY;
                const progress=state.phase==='windup'?Math.max(0,Math.min(1,1-(state.until-state.now)/(state.windup||850))):1;
                warningTile(ctx,x,y,progress,state.phase==='lunge');
            }
        },
        slamGround(ctx,state,view) {
            const progress=state.phase==='windup'?Math.max(0,Math.min(1,1-(state.until-state.now)/state.windup)):1;
            for(const tile of state.lane||[]){
                const x=tile.x*16-view.cameraX,y=tile.y*16-view.cameraY;
                warningTile(ctx,x,y,progress,state.phase==='impact');
            }
            const age=state.now-state.impactAt;
            if(!state.impactAt||age<0||age>=400)return;
            const x=state.mobX+8-view.cameraX,y=state.mobY+14-view.cameraY;
            const t=state.reducedMotion?0:age/400;
            ctx.strokeStyle=`rgba(255,209,141,${1-age/400})`;ctx.lineWidth=1;
            ctx.beginPath();ctx.ellipse(x,y,12+16*t,5+8*t,0,0,Math.PI*2);ctx.stroke();
            for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
                ctx.beginPath();ctx.moveTo(x+dx*3,y+dy*2);
                ctx.lineTo(x+dx*(9+6*t),y+dy*(5+3*t));
                ctx.lineTo(x+dx*(15+6*t),y+dy*(4+5*t));ctx.stroke();
                if(!state.reducedMotion){
                    ctx.fillStyle=`rgba(240,196,142,${(1-age/400)*.7})`;
                    ctx.fillRect(x+dx*(18+5*t),y+dy*9-5*t,2,2);
                }
            }
        },
        draw(ctx, state, view) {
            for (const attack of state.fieldAttacks || []) { ctx.save();renderer.draw(ctx,attack,view);ctx.restore(); }
            if (!state.mob) return;
            ctx.scale(view.scale || 1, view.scale || 1);
            const x=state.mobX+8-view.cameraX, y=state.mobY-25-view.cameraY;
            const labels={chase:'',windup:state.pattern==='slam'?'SLAM':'CHARGING',lunge:'LUNGE',impact:'SLAM',recovery:'OPEN',round:state.event?.label || 'RESET'};
            if (!state.ordinary) {
            healthBars.draw(ctx,state.showHealthBar ? [{id:state.mob.id||'trainer',x,y,hp:state.mob.hp,maxHp:state.mob.maxHp,width:32}] : [],
                {cameraX:0,cameraY:0,scale:1},state.now||0,state.reducedMotion);
            }
            ctx.font='6px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='bottom';
            ctx.lineWidth=2; ctx.strokeStyle='#241d25'; ctx.fillStyle='#fff0ce';
            const name = Number.isFinite(state.mob.level) ? `Lv. ${state.mob.level} LUNGER` : 'LUNGER';
            if (!state.ordinary) { ctx.strokeText(name,x,y-10); ctx.fillText(name,x,y-10); }
            const phase = labels[state.phase];
            if (phase) { ctx.strokeText(phase,x,y-2); ctx.fillText(phase,x,y-2); }
            if (state.phase==='windup') {
                const progress=Math.max(0,Math.min(1,1-(state.until-state.now)/(state.windup||850)));
                ctx.fillStyle='#ffd183'; ctx.fillRect(x-17,y+5,34*progress,2);
                for (let i=0; i<4; i++) {
                    const rise=state.reducedMotion?8:(state.now/35+i*5)%18;
                    ctx.globalAlpha=.4+progress*.6;
                    ctx.fillRect(x-12+i*8,y+30-rise,1,2);
                }
                ctx.globalAlpha=1;
            }

        }
    };
    return renderer;
});
