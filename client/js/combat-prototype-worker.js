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
    const renderer = {
        ground(ctx, state, view) {
            for (const attack of state.fieldAttacks || []) renderer.ground(ctx,attack,view);
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
                ctx.fillStyle = state.phase==='lunge'?'rgba(255,83,60,.65)':'rgba(255,174,65,.3)';
                ctx.fillRect(x+1,y+1,14,14);
                ctx.strokeStyle='#ffd183'; ctx.lineWidth=1;
                ctx.strokeRect(x+1.5,y+1.5,13,13);
                ctx.beginPath(); ctx.moveTo(x+5,y+5); ctx.lineTo(x+11,y+11);
                ctx.moveTo(x+11,y+5); ctx.lineTo(x+5,y+11); ctx.stroke();
            }
        },
        draw(ctx, state, view) {
            for (const attack of state.fieldAttacks || []) { ctx.save();renderer.draw(ctx,attack,view);ctx.restore(); }
            if (!state.mob) return;
            ctx.scale(view.scale || 1, view.scale || 1);
            const x=state.mobX+8-view.cameraX, y=state.mobY-25-view.cameraY;
            const labels={chase:'',windup:'CHARGING',lunge:'LUNGE',recovery:'OPEN',round:state.event?.label || 'RESET'};
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
                    const rise=(state.now/35+i*5)%18;
                    ctx.globalAlpha=.4+progress*.6;
                    ctx.fillRect(x-12+i*8,y+30-rise,1,2);
                }
                ctx.globalAlpha=1;
            }

        }
    };
    return renderer;
});
