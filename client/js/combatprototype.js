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
        locked() { return this.enabled && this.state && this.now() < this.state.lockUntil; }
        owns(entity) { return this.enabled && (entity.id === this.state?.mob.id || entity === this.game.player && (this.selected || this.locked())); }

        select(entity) {
            if (!this.enabled) return false;
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

        canTechnique() {
            const {player} = this.game, state = this.state;
            return !!(this.enabled && state?.combo && this.now() <= state.comboUntil
                && !this.locked() && !player.isMoving()
                && Math.abs(player.gridX-state.mob.x)+Math.abs(player.gridY-state.mob.y) === 1);
        }

        technique() {
            if (!this.canTechnique()) return false;
            this.selected = true;
            this.game.player.disengage();
            this.send('technique');
            return true;
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
            player.disengage();
            game.unregisterEntityPosition(player);
            player.cancelPath();
            player.setGridPosition(position.x, position.y);
            game.registerEntityPosition(player); player.idle();
            this.lastReport = null;
        }

        showCombatInfo(text) {
            const {player,infoManager} = this.game;
            infoManager.addDamageInfo(text,player.x,player.y-15,'combo',player.id);
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
                this.showCombatInfo(`${packet.streak}-kill streak +${packet.streakBonusPercent}% XP`);
            }
            this.toggle.textContent = 'Combat on'; this.toggle.setAttribute('aria-pressed','true');
            this.reset.hidden = false;
            this.update();
        }

        update() {
            if (!this.enabled || !this.state || !this.game.player) return;
            const {game, state} = this, player = game.player, now = this.now();
            if (game.isStopped || player.isDead) return;
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
                        player.setOrientation(player.getOrientationTo(mob)); player.hit();
                        game.audioManager.playSound('hit1');
                    } else if (['lunge','mob-attack'].includes(state.event?.kind)) {
                        const direction = state.direction;
                        if (state.event.kind === 'lunge' && direction) mob.setOrientation(direction.x ? (direction.x > 0 ? Types.Orientations.RIGHT : Types.Orientations.LEFT)
                            : (direction.y > 0 ? Types.Orientations.DOWN : Types.Orientations.UP));
                        mob.hit();
                    }
                }
            }
            const combo = state.combo && now <= state.comboUntil ? state.combo : null;
            const phaseLabel = state.phase === 'windup' ? 'Sidestep now' : combo === 'counter' ? 'Counter ready'
                : combo === 'finisher' ? 'Finisher ready' : state.phase === 'round' ? state.event.label : 'Trainer ' + state.phase;
            if (this.status && this.status.textContent !== phaseLabel) this.status.textContent = phaseLabel;
            const adjacent = Math.abs(player.gridX-state.mob.x)+Math.abs(player.gridY-state.mob.y) === 1;
            this.action.hidden = !combo;
            this.action.disabled = !adjacent || this.locked() || player.isMoving();
            const key = game.gamepadListener?.isActive() ? 'A' : game.touchListener?.hasTouchInput ? '' : 'Space';
            this.action.textContent = (combo === 'finisher'?'Finisher':'Counter') + (adjacent ? (key ? ' · ' + key : '') : ' · move closer');
            this.action.title = 'Move: WASD / arrows / drag. Evade the marked tiles; press Space twice for Counter → Finisher.';
            if (game.renderer && this.renderer !== game.renderer) {
                this.renderer = game.renderer;
                this.renderer.registerExtension('combat-prototype-worker.js');
            }
            const frame = {...state, now, mobX:mob?.x ?? state.mob.x*16, mobY:mob?.y ?? state.mob.y*16, playerX:player.x, playerY:player.y};
            this.renderer?.setExtensionData('combat-prototype-ground', frame);
            this.renderer?.setExtensionData('combat-prototype', frame);
        }

        clear() {
            this.enabled = false; this.selected = false; this.state = null; this.motion = null; this.lastEvent = null; this.lastReward = null; this.lastReport = null;
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
