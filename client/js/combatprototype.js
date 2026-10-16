define(function () {
    class CombatPrototype {
        constructor(game) {
            this.game = game;
            this.state = null;
            this.enabled = false;
            this.onPacket = packet => this.receive(packet);
        }

        configure(config) {
            if (!config?.previewControls || !config.previewCombat) { this.clear(); return; }
            const socket = this.game.client?.connection;
            if (socket && socket !== this.socket) {
                this.socket?.off('combat-preview', this.onPacket);
                this.socket = socket;
                socket.on('combat-preview', this.onPacket);
            }
            const parent = this.game.worldAmbience.controls;
            if (!parent || this.toggle) return;
            const makeButton = (text, click) => {
                const button = document.createElement('button');
                button.type = 'button'; button.textContent = text;
                button.style.cssText = 'font:inherit;font-size:12px;line-height:16px;padding:2px 6px;color:#ffe3a1;background:#382632;border:1px solid #b99761;cursor:pointer;';
                button.addEventListener('click', event => { event.stopPropagation(); click(); button.blur(); });
                parent.insertBefore(button, parent.querySelector('details'));
                return button;
            };
            this.toggle = makeButton('Combat off', () => this.send(this.enabled ? 'disable' : 'enable'));
            this.toggle.title = 'Local training: move out of the lunge, then Space / A to counter and finish.';
            this.toggle.setAttribute('aria-pressed', 'false');
            this.reset = makeButton('Reset', () => this.send('reset'));
            this.reset.hidden = true;
            this.action = makeButton('Counter', () => this.technique());
            this.action.hidden = true;
            this.action.style.cssText += 'position:absolute;right:0;top:calc(100% + 6px);min-height:38px;min-width:125px;font-size:14px;';
            this.action.setAttribute('aria-label', 'Combat technique');
            this.status = document.createElement('span');
            this.status.setAttribute('role', 'status');
            this.status.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);';
            parent.appendChild(this.status);
            // One compact row. Existing FX/story details remain collapsible below it.
            parent.style.flexWrap = 'wrap'; parent.style.width = '310px';
            parent.style.maxWidth = 'calc(100% - 16px)'; parent.style.gap = '3px';
            for (const button of parent.querySelectorAll('button[data-mode]')) {
                button.style.padding = '2px 6px'; button.style.lineHeight = '16px';
            }
        }

        send(action, values = {}) { this.socket?.emit('combat-preview', {action, ...values}); }
        now() { return Date.now() + (this.offset || 0); }
        locked() { return this.enabled && this.state && (this.now() < this.state.lockUntil || this.now() < (this.pendingTechnique?.until || 0)); }
        owns(entity) { return this.enabled && (this.state?.fieldAttacks?.some(a=>Number(a.mob.id)===Number(entity.id)) || entity.id === this.state?.mob.id || entity === this.game.player && (this.selected || this.locked())); }

        select(entity) {
            if (!this.enabled) return false;
            this.pendingTechnique = null;
            this.selected = Number(entity.id) === Number(this.state?.mob.id);
            this.send('select', {mobId:entity.id});
            if (this.selected) {
                this.game.player.disengage();
                const mob = this.game.getEntityById(this.state.mob.id);
                if (mob && !this.game.player.isAdjacentNonDiagonal(mob)) {
                    this.game.player.follow(mob);
                }
            }
            return this.selected;
        }

        techniqueState() {
            const state=this.state;if(!state)return state;
            const combo=state.fieldCombo;
            const attack=combo ? state.fieldAttacks?.find(a=>a.mob.id===combo.mob.id)
                : state.fieldAttacks?.find(a=>['windup','lunge'].includes(a.phase));
            if(!combo&&!attack)return state;
            return {...state,...attack,mob:combo?.mob||attack.mob,
                combo:combo && combo.kind!=='commit'?combo.kind:null,comboUntil:combo?.until||0,
                phase:combo?.kind==='commit'?'finisher':attack?.phase||'recovery',lane:attack?.lane||[]};
        }

        canTechnique() {
            const {player} = this.game, state = this.techniqueState(), now = this.now();
            if (!this.enabled || !state || now < state.lockUntil) return false;
            const opening = state.combo && now <= state.comboUntil;
            // Buffer a press just before impact, but only after leaving the warned lane.
            const early = !state.combo && (state.phase === 'lunge'
                || state.phase === 'windup' && state.until-now <= 150)
                && !state.lane.some(tile => tile.x === player.gridX && tile.y === player.gridY);
            if (!opening && !early) return false;
            const target = state.phase === 'windup' ? state.lane[0] : state.mob;
            const adjacent = (x,y) => target && Math.abs(x-target.x)+Math.abs(y-target.y) === 1;
            return player.isMoving() ? adjacent(player.nextGridX,player.nextGridY) : adjacent(player.gridX,player.gridY);
        }

        technique() {
            if (!this.canTechnique()) return false;
            this.selected = true;
            this.game.player.disengage();
            const state=this.techniqueState();
            this.pendingTechnique = {mobId:state.mob.id,combo:state.combo || 'counter',until:this.now()+350};
            if (this.game.player.isMoving()) this.game.player.stop();
            this.flushTechnique();
            return true;
        }

        flushTechnique() {
            const pending = this.pendingTechnique, state = this.techniqueState(), player = this.game.player;
            if (!pending) return;
            if (this.now() > pending.until || !this.enabled || !state
                || ['round','finisher'].includes(state.phase)
                || state.phase === 'recovery' && !state.combo) {
                this.pendingTechnique = null;
                return;
            }
            if (state.mob.id !== pending.mobId || state.combo !== pending.combo || this.now() > state.comboUntil || player.isMoving()
                || Math.abs(player.gridX-state.mob.x)+Math.abs(player.gridY-state.mob.y) !== 1) return;
            this.pendingTechnique = null;
            this.send('technique', state.mob.id === this.state.mob.id ? {} : {mobId:state.mob.id});
        }

        playStrike(player, mob, label) {
            this.restoreStrike?.();
            const technique = label === 'Counter' || label === 'Finisher';
            if (technique) {
                // A deliberate technique interrupts the old attack, including the same atk clip.
                player.animationLock = false;
                player.currentAnimation = null;
            }
            player.setOrientation(player.getOrientationTo(mob));
            player.hit();
            if (technique && player.currentAnimation?.speed) {
                const speed = player.currentAnimation.speed;
                const total = speed.reduce((sum,ms)=>sum+ms,0);
                const scale = Math.min(1,(label === 'Counter' ? 180 : 240)/total);
                const animation = player.currentAnimation, onEnd = animation.endcount_callback;
                const restore = () => {
                    animation.setSpeed(speed);
                    if (this.restoreStrike === restore) this.restoreStrike = null;
                };
                this.restoreStrike = restore;
                animation.endcount_callback = () => { restore(); onEnd?.(); };
                animation.setSpeed(speed.map(ms=>ms*scale));
            }
        }

        reportPosition() {
            if (!this.enabled || !this.state) return;
            const player = this.game.player;
            const next = player.isMoving() && player.nextGridX >= 0 && player.nextGridY >= 0
                && (player.nextGridX !== player.gridX || player.nextGridY !== player.gridY)
                ? {x:player.nextGridX,y:player.nextGridY} : null;
            const report = `${player.gridX},${player.gridY}>${next?.x},${next?.y}@${this.state.correction}`;
            if (report === this.lastReport) return;
            this.lastReport = report;
            // Called at every tile boundary, including multiple completions in one frame.
            this.send('move', {x:player.gridX,y:player.gridY,next,correction:this.state.correction});
        }

        correct(position) {
            const {game} = this, player = game.player;
            this.pendingTechnique = null;
            player.disengage();
            game.unregisterEntityPosition(player);
            player.cancelPath();
            player.setGridPosition(position.x, position.y);
            game.registerEntityPosition(player); player.idle();
            this.lastReport = null;
        }

        showCombatInfo(text, presentation = {}) {
            const {player,infoManager} = this.game;
            infoManager.addDamageInfo(text,player.x,player.y-15,'combo',player.id,false,presentation);
        }

        receive(packet) {
            if (packet.error) { this.game.showNotification(packet.error); return; }
            if (packet.attackRate) this.game.player?.setAttackRate(packet.attackRate);
            if (!packet.enabled) {
                if (packet.player) this.correct(packet.player);
                this.clear(); return;
            }
            const starting = !this.enabled;
            this.enabled = true;
            if (starting || packet.event?.kind === 'reset' && this.lastEvent !== packet.event.id) this.selected = true;
            this.offset = packet.serverNow - Date.now();
            if (starting || this.state?.correction !== packet.correction) this.correct(packet.player);
            const previous = this.state;
            this.state = packet;
            if (packet.reward && packet.reward.id !== this.lastReward) {
                this.lastReward = packet.reward.id;
                this.showCombatInfo(`Combo! +${packet.reward.xp} XP`);
            }
            if (packet.streak >= 2 && (packet.streak !== previous?.streak || packet.streakUntil !== previous?.streakUntil)) {
                const tier = packet.streak >= 7 ? ['Unstoppable!','#ff85be']
                    : packet.streak >= 5 ? ['Amazing!','#ff875f']
                        : packet.streak >= 4 ? ['Awesome!','#ffad49']
                            : packet.streak >= 3 ? ['Great!','#ffd16a'] : ['Nice!','#fce045'];
                this.showCombatInfo(`${packet.streak}x combo`, {
                    scale:1 + Math.min(1, (packet.streak-2)*0.2), praise:tier[0], color:tier[1]
                });
            }
            this.toggle.textContent = 'Combat on'; this.toggle.setAttribute('aria-pressed','true');
            this.reset.hidden = false;
            this.update();
        }

        updateFieldAttacks(now) {
            const game=this.game, attacks=this.state.fieldAttacks||[], live=new Set();
            this.fieldMotions ||= new Map();
            const frames=[];
            for(const attack of attacks){
                const mob=game.getEntityById(attack.mob.id);if(!mob)continue;
                live.add(mob.id);
                let motion=this.fieldMotions.get(mob.id);
                if(!motion){
                    motion={mob,attacking:mob.attackingMode,following:mob.followingMode};
                    this.fieldMotions.set(mob.id,motion);
                    game.unregisterEntityPosition(mob);mob.cancelPath();game.registerEntityPosition(mob);
                }
                mob.attackingMode=false;mob.followingMode=false;
                if(mob.gridX!==attack.mob.x||mob.gridY!==attack.mob.y){
                    motion.from={x:mob.x,y:mob.y};motion.at=now;motion.duration=attack.phase==='lunge'?150:200;
                    game.unregisterEntityPosition(mob);mob.setGridPosition(attack.mob.x,attack.mob.y);game.registerEntityPosition(mob);
                }
                if(motion.from){
                    const t=Math.min(1,(now-motion.at)/motion.duration);
                    mob.x=motion.from.x+(attack.mob.x*16-motion.from.x)*t;
                    mob.y=motion.from.y+(attack.mob.y*16-motion.from.y)*t;mob.hasMoved();
                    if(t===1)motion.from=null;
                }
                const d=attack.direction;
                mob.setOrientation(d.x?(d.x>0?Types.Orientations.RIGHT:Types.Orientations.LEFT):(d.y>0?Types.Orientations.DOWN:Types.Orientations.UP));
                if(motion.phase!==attack.phase){
                    motion.phase=attack.phase;
                    if(attack.phase==='lunge'){mob.animationLock=false;mob.currentAnimation=null;mob.hit();}
                    else mob.idle();
                }
                frames.push({...attack,now,mobX:mob.x,mobY:mob.y,ordinary:true});
            }
            for(const [id,motion] of this.fieldMotions){
                if(live.has(id))continue;
                const mob=game.getEntityById(id);
                if(mob){mob.attackingMode=motion.attacking;mob.followingMode=motion.following;}
                this.fieldMotions.delete(id);
            }
            const event=this.state.fieldEvent;
            if(event&&event.id!==this.lastFieldEvent){
                this.lastFieldEvent=event.id;
                if(event.label==='Counter ready')this.showCombatInfo('Counter ready');
                else{
                    const mob=game.getEntityById(event.mobId);
                    if(mob)this.playStrike(game.player,mob,event.label);
                    if(event.label==='Counter')this.showCombatInfo('Counter!');
                    game.audioManager.playSound('hit1');
                }
            }
            return frames;
        }

        update() {
            if (!this.enabled || !this.state || !this.game.player) return;
            const {game, state} = this, player = game.player, now = this.now();
            if (game.isStopped || player.isDead) { this.pendingTechnique = null; return; }
            this.flushTechnique();
            const fieldFrames=this.updateFieldAttacks(now);
            const mob = game.getEntityById(state.mob.id);
            if (mob) {
                mob.isAggressive = false; mob.attackingMode = false; mob.followingMode = false;
                mob.target = null; mob.path = null; mob.isFading = false;
                if (mob.gridX !== state.mob.x || mob.gridY !== state.mob.y) {
                    const from = {x:mob.x, y:mob.y};
                    game.unregisterEntityPosition(mob);
                    mob.setGridPosition(state.mob.x, state.mob.y);
                    game.registerEntityPosition(mob);
                    this.motion = {from, x:mob.x, y:mob.y, at:now, duration:state.phase === 'lunge'?150:260};
                    mob.walk(game.player.gridY < mob.gridY ? Types.Orientations.UP : Types.Orientations.DOWN);
                }
                if (this.motion) {
                    const p = Math.min(1, (now-this.motion.at)/this.motion.duration);
                    mob.x = this.motion.from.x + (this.motion.x-this.motion.from.x)*p;
                    mob.y = this.motion.from.y + (this.motion.y-this.motion.from.y)*p;
                    mob.hasMoved();
                    if (p===1) { this.motion=null; mob.idle(); }
                }
                // Face the opponent between attacks; the warned direction stays fixed
                // through wind-up, travel and impact so sidestepping remains fair.
                const direction = state.direction;
                const facing = ['windup','lunge'].includes(state.phase) && direction
                    ? direction.x ? (direction.x > 0 ? Types.Orientations.RIGHT : Types.Orientations.LEFT)
                        : (direction.y > 0 ? Types.Orientations.DOWN : Types.Orientations.UP)
                    : mob.getOrientationTo(player);
                if (mob.orientation !== facing) {
                    mob.setOrientation(facing);
                    if (this.motion && state.phase !== 'lunge') mob.walk(facing);
                    else if (!this.motion) mob.idle();
                }
                if (state.event?.id !== this.lastEvent) {
                    this.lastEvent = state.event?.id;
                    if (state.event?.kind === 'evade') this.showCombatInfo('Counter ready');
                    if (state.event?.kind === 'attack') {
                        if (state.event.label === 'Counter') this.showCombatInfo('Counter!');
                        this.playStrike(player,mob,state.event.label);
                        game.audioManager.playSound('hit1');
                    } else if (['lunge','mob-attack'].includes(state.event?.kind)) {
                        const direction = state.direction;
                        if (state.event.kind === 'lunge' && direction) mob.setOrientation(direction.x ? (direction.x > 0 ? Types.Orientations.RIGHT : Types.Orientations.LEFT)
                            : (direction.y > 0 ? Types.Orientations.DOWN : Types.Orientations.UP));
                        mob.hit();
                    }
                }
            }
            const technique = this.techniqueState();
            const combo = technique.combo && now <= technique.comboUntil ? technique.combo : null;
            const phaseLabel = technique.phase === 'windup' ? 'Sidestep now' : combo === 'counter' ? 'Counter ready'
                : combo === 'finisher' ? 'Finisher ready' : state.phase === 'round' ? state.event.label : 'Trainer ' + state.phase;
            if (this.status && this.status.textContent !== phaseLabel) this.status.textContent = phaseLabel;
            const adjacent = Math.abs(player.gridX-technique.mob.x)+Math.abs(player.gridY-technique.mob.y) === 1;
            this.action.hidden = !combo;
            this.action.disabled = !this.canTechnique();
            const key = game.gamepadListener?.isActive() ? 'A' : game.touchListener?.hasTouchInput ? '' : 'Space';
            this.action.textContent = (combo === 'finisher'?'Finisher':'Counter') + (adjacent ? (key ? ' · ' + key : '') : ' · move closer');
            this.action.title = 'Move: WASD / arrows / drag. Evade the marked tiles; press Space twice for Counter → Finisher.';
            if (game.renderer && this.renderer !== game.renderer) {
                this.renderer = game.renderer;
                this.renderer.registerExtension('combat-prototype-worker.js');
            }
            const frame = {...state, now, fieldAttacks:fieldFrames,reducedMotion:game.app?.settings.getReducedMotion() || false, mobX:mob?.x ?? state.mob.x*16, mobY:mob?.y ?? state.mob.y*16, playerX:player.x, playerY:player.y};
            this.renderer?.setExtensionData('combat-prototype-ground', frame);
            this.renderer?.setExtensionData('combat-prototype', frame);
        }

        clear() {
            for(const motion of this.fieldMotions?.values() || []){
                motion.mob.attackingMode=motion.attacking;motion.mob.followingMode=motion.following;
            }
            this.fieldMotions?.clear();this.lastFieldEvent=null;
            this.restoreStrike?.();
            this.enabled = false; this.selected = false; this.state = null; this.motion = null; this.lastEvent = null; this.lastReward = null; this.lastReport = null; this.pendingTechnique = null;
            if (this.toggle) { this.toggle.textContent = 'Combat off'; this.toggle.setAttribute('aria-pressed','false'); }
            if (this.reset) this.reset.hidden = true;
            if (this.action) this.action.hidden = true;
            if (this.status) this.status.textContent = '';
            this.renderer?.setExtensionData('combat-prototype-ground', null);
            this.renderer?.setExtensionData('combat-prototype', null);
        }
    }
    return CombatPrototype;
});
