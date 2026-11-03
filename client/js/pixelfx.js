define(['../../shared/js/placedfxconfig'], function (Config) {
    class PixelFx {
        constructor(game) {this.game=game;this.clear();}
        clear() {this.rows=[];this.hits=[];this.seen=new Set();this.mapId=this.game.mapId;this.game.renderer?.setExtensionData('pixel-fx',null);this.game.renderer?.setExtensionData('pixel-fx-tiles',null);}
        pause() {this.hits=[];this.game.renderer?.setExtensionData('pixel-fx',null);this.game.renderer?.setExtensionData('pixel-fx-tiles',null);}
        receive(packet) {
            if (packet.mapId?.replace(/^world_/,'')!==this.game.mapId?.replace(/^world_/,'')) return;
            if(this.mapId!==this.game.mapId)this.clear();
            if(packet.type==='map') {
                try {Config.validate(packet.rows);} catch (_) {return;}
                this.rows=packet.rows;this.seed=packet.seed || 0;this.elapsedAtSync=packet.now-packet.epoch;this.syncedAt=performance.now();
            } else if(packet.type==='hit' && Config.catalog[packet.effect] && !this.seen.has(packet.id)) {
                this.seen.add(packet.id);if(this.seen.size>256)this.seen.delete(this.seen.values().next().value);
                this.hits.push({...packet,started:performance.now()});if(this.hits.length>32)this.hits.shift();
            }
        }
        render(renderer) {
            if(this.mapId!==this.game.mapId)this.clear();
            if(!this.game.started || this.game.isStopped)return;
            if(this.renderer!==renderer){renderer.registerExtension('pixelfx-renderer-worker.js');this.renderer=renderer;}
            const now=performance.now(), reduced=!!this.game.app?.settings?.getReducedMotion?.();
            this.hits=this.hits.filter(h=>now-h.started<500);
            const rows=this.rows.map(row=>{const phase=Config.phase(row,this.elapsedAtSync+now-this.syncedAt);return {...row,...Config.hitRegion(row,phase.cycle,this.seed),phase};});
            const effects=rows.map(row=>({effect:row.effect,x:(row.x+row.width/2)*16,y:(row.y+row.height/2)*16,scale:row.scale,hue:row.hue || 0,removeBackdrop:row.background!=='original',time:reduced?200:row.phase.effectMs}));
            if(!reduced && this.game.app?.settings?.getCombatEffectsEnabled?.()!==false) for(const h of this.hits)effects.push({effect:h.effect,x:h.x*16+8,y:h.y*16+8,scale:.3,time:(now-h.started)/500*Config.catalog[h.effect].duration});
            // Warning tiles and countdowns are never disabled by reduced motion.
            renderer.setExtensionData('pixel-fx',effects.filter((e,i)=>i>=rows.length || rows[i].phase.effectMs!==null));
            renderer.setExtensionData('pixel-fx-tiles',rows.filter(r=>r.hazard && r.phase.kind!=='cooldown'));
        }
    }
    return PixelFx;
});
