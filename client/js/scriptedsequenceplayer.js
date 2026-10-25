define(['dialoguetext','../../shared/js/dialogueformat'],function(DialogueText,Format){
    'use strict';
    class SequencePlayer {
        constructor(game){this.game=game;this.actors=new Map();this.cameraActive=false;this.locked=false;this.key=event=>{if(event.key==='Escape'&&this.runId&&this.skippable){event.preventDefault();event.stopImmediatePropagation();this.skip();}};}
        connect(socket){this.reset();this.socket?.off('scripted-sequence',this.receive);this.socket?.off('disconnect',this.disconnect);this.socket=socket;this.receive=packet=>this.packet(packet);socket.on('scripted-sequence',this.receive);this.disconnect=()=>this.reset();socket.on('disconnect',this.disconnect);}
        packet(packet){
            if(packet.type==='start'){
                this.reset();this.runId=packet.runId;this.locked=!!packet.cinematic;this.skippable=!!packet.skippable;this.lastPacket=Date.now();
                for(const actor of packet.actors||[]){this.actors.set(actor[0],actor);this.game.client?.receiveSequenceActor(actor);}
                const p=this.game.player;p?.stop();p?.disengage();this.game.keyboardHandler?.handleBlur();this.game.touchListener?.reset();
                this.panel=document.createElement('section');this.panel.setAttribute('aria-label','Cutscene');this.panel.style.cssText='position:fixed;left:50%;bottom:12%;transform:translateX(-50%);width:min(680px,90vw);z-index:1000;background:#342433;color:#fff4df;padding:16px;border:2px solid #b99761;font:16px/1.5 GraphicPixel,serif;box-sizing:border-box;';
                const title=document.createElement('div');title.textContent=packet.name;title.style.fontSize='14px';this.caption=document.createElement('div');this.caption.setAttribute('role','status');this.caption.setAttribute('aria-live','polite');this.caption.style.margin='8px 0';
                this.panel.append(title,this.caption);if(this.skippable){this.button=document.createElement('button');this.button.type='button';this.button.textContent='Skip cutscene (Esc)';this.button.onclick=()=>this.skip();this.button.style.cssText='font:inherit;min-height:40px;background:#fff4df;color:#342433;padding:8px 12px;cursor:pointer;';this.panel.append(this.button);}
                document.body.append(this.panel);document.addEventListener('keydown',this.key,true);return;
            }
            if(packet.runId!==this.runId)return;this.lastPacket=Date.now();
            if(packet.type==='end'){this.reset();return;}
            if(packet.type==='heartbeat'){for(const actor of packet.actors||[])this.syncActor(actor);return;}
            if(packet.type==='actor_state'){this.syncActor(packet.actor);return;}
            if(packet.type==='actor_move'){
                if(packet.teleport&&this.ownsActor(packet.actorId))this.game.client?.receiveSequenceActor(packet.actor);
                else this.syncActor(packet.actor,true);
            }
            if(packet.type==='actor_move'&&this.followActor?.id===packet.actorId){
                const from=this.followPosition(Date.now()),ts=this.game.renderer.tilesize;
                this.followActor={id:packet.actorId,from,to:{x:packet.x*ts,y:packet.y*ts},start:Date.now(),duration:packet.durationMs};return;
            }
            if(packet.type==='move_complete'&&this.followActor?.id===packet.actorId){
                this.game.renderer.camera.lookAt({x:packet.x*this.game.renderer.tilesize,y:packet.y*this.game.renderer.tilesize});this.followActor=null;return;
            }
            if(packet.type!=='step')return;const step=packet.step;
            this.followActor=null;
            if(step.actorState)this.syncActor(step.actorState);
            if(step.type==='caption'||step.type==='speech') {this.text?.cancel();this.caption.replaceChildren();Format.append(this.caption,step.text);this.text=new DialogueText(this.caption);}
            if(step.type==='move'){
                this.takeCamera();this.pan=null;const ts=this.game.renderer.tilesize,position={x:step.actorX*ts,y:step.actorY*ts};
                this.followActor={id:step.actorId,from:position,to:position,start:Date.now(),duration:0};
            }
            if(step.type==='camera'){
                this.takeCamera();const camera=this.game.renderer.camera,ts=this.game.renderer.tilesize;
                const x=Math.max(0,Math.min(this.game.map.width-camera.gridW,step.x-camera.gridW/2))*ts,y=Math.max(0,Math.min(this.game.map.height-camera.gridH,step.y-camera.gridH/2))*ts;
                this.pan={x:camera.x,y:camera.y,toX:x,toY:y,start:Date.now(),duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:step.seconds*1000};
            }
            if(step.type==='camera_reset')this.restoreCamera();
            if(step.type==='sound')this.game.audioManager?.playSound(step.value);
            if(step.type==='music'){this.music=step.value;this.game.audioManager?.playMusicByName(step.value);}
        }
        tick(time){
            if(this.runId&&time-this.lastPacket>15000){this.reset();return;}
            if(this.pan){const p=this.pan,t=p.duration?Math.min(1,(time-p.start)/p.duration):1,eased=1-Math.pow(1-t,3);this.game.renderer.camera.setPosition(p.x+(p.toX-p.x)*eased,p.y+(p.toY-p.y)*eased);if(t>=1)this.pan=null;}
            if(this.followActor){const actor=this.game.getEntityById(this.followActor.id);this.game.renderer.camera.lookAt(actor||this.followPosition(time));}
        }
        followPosition(time){const p=this.followActor,t=p.duration?Math.max(0,Math.min(1,(time-p.start)/p.duration)):1;return {x:p.from.x+(p.to.x-p.from.x)*t,y:p.from.y+(p.to.y-p.from.y)*t};}
        actorIds(){return [...this.actors.keys()];}
        ownsActor(id){return this.actors.has(id);}
        syncActor(state,moving=false){
            if(!state||!this.ownsActor(state[0]))return;
            this.actors.set(state[0],state);
            const entity=this.game.getEntityById(state[0]);
            if(!entity){this.game.client?.receiveSequenceActor(state);return;}
            entity.lastUpdate=this.game.currentTime||Date.now();
            entity.applyBehaviorState(state[5]);
            this.game.addToRenderingGrid?.(entity,entity.gridX,entity.gridY);
            if(moving)this.game.makeCharacterGoTo(entity,state[2],state[3]);
        }
        takeCamera(){
            if(!this.cameraActive)this.game.visibleTileArea=null;
            this.cameraActive=true;
            this.game.renderer.camera.boundsOverride={x:0,y:0,w:this.game.map.width,h:this.game.map.height};
        }
        skip(){if(!this.runId||!this.skippable)return;this.socket?.emit('sequence-skip',{runId:this.runId});if(this.button){this.button.disabled=true;this.button.textContent='Skipping…';}}
        restoreCamera(){
            if(this.cameraActive){this.game.renderer.camera.boundsOverride=null;this.game.visibleTileArea=null;}
            this.cameraActive=false;this.pan=null;this.followActor=null;if(this.game.player)this.game.renderer?.camera?.lookAt(this.game.player);
        }
        reset(){this.text?.cancel();this.text=null;this.panel?.remove();this.panel=null;document.removeEventListener('keydown',this.key,true);this.runId=null;this.locked=false;this.restoreCamera();const actors=this.actorIds();this.actors.clear();if(actors.length)this.game.client?.releaseSequenceActors(actors);if(this.music){this.music=null;this.game.audioManager?.updateMusic();}}
        destroy(){this.reset();this.socket?.off('scripted-sequence',this.receive);this.socket?.off('disconnect',this.disconnect);this.socket=null;}
    }
    return SequencePlayer;
});
