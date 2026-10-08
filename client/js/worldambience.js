define(function () {
    class WorldAmbience {
        constructor(getView = () => ({x: 0, y: 0, scale: 1})) {
            this.getView = getView;
            this.canvas = null;
            this.frame = null;
            this.timer = null;
            this.config = null;
            this.lastFrame = 0;
        }

        setConfig(config) {
            const previousView = this.config?.scene === config?.scene ? this.view : null;
            this.clear();
            if (!config) return;
            this.config = config;
            this.view = previousView;
            this.clockOffset = (config.serverTime || Date.now()) - Date.now();
            this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
            const parent = document.getElementById('canvas');
            if (!parent) return;
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.setAttribute('aria-hidden', 'true');
                this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
                parent.style.position = 'relative';
                parent.appendChild(this.canvas);
            }
            this.canvas.style.display = 'block';
            this.updatePreviewControls(config);
            this.draw();
        }

        updatePreviewControls(config) {
            if (config.previewControls !== true) {
                if (this.controls) this.controls.style.display = 'none';
                return;
            }
            if (!this.controls) {
                this.controls = document.createElement('div');
                this.controls.style.cssText = 'position:absolute;right:8px;top:8px;display:flex;gap:4px;z-index:5;';
                this.controls.setAttribute('aria-label', 'Local world preview');
                for (const eventName of ['click', 'mousedown', 'pointerdown', 'touchstart']) {
                    this.controls.addEventListener(eventName, event => event.stopPropagation());
                }
                for (const mode of ['day', 'night', 'cycle']) {
                    const button = document.createElement('button');
                    button.textContent = mode[0].toUpperCase() + mode.slice(1);
                    button.setAttribute('aria-label', 'Preview ' + mode);
                    button.dataset.mode = mode;
                    button.style.cssText = 'font:inherit;font-size:12px;padding:5px 8px;color:#ffe3a1;background:#382632;border:1px solid #b99761;cursor:pointer;';
                    button.addEventListener('click', event => {
                        event.stopPropagation();
                        fetch('/__npc_preview/ambience', {method: 'POST',
                            headers: {'Content-Type': 'application/json'}, body: JSON.stringify({mode})});
                    });
                    this.controls.appendChild(button);
                }
                document.getElementById('canvas').appendChild(this.controls);
            }
            this.controls.style.display = 'flex';
            for (const button of this.controls.children) {
                if (!button.dataset.mode) continue;
                button.style.display = config.previewControls ? 'inline-block' : 'none';
                button.setAttribute('aria-pressed', String(button.dataset.mode === (config.mode || 'cycle')));
                button.style.background = button.dataset.mode === (config.mode || 'cycle') ? '#6b4953' : '#382632';
            }
            const story = config.story || config.previewStory;
            if (story) {
                if (!this.story) {
                    this.controls.style.flexWrap = 'wrap';
                    this.controls.style.maxWidth = '300px';
                    this.story = document.createElement('details');
                    this.story.style.cssText = 'width:100%;color:#ffe3a1;background:#382632;padding:8px;font-size:12px;line-height:1.5;';
                    const summary = document.createElement('summary');
                    summary.textContent = 'The Lantern Picnic — your next step';
                    summary.style.cursor = 'pointer';
                    this.story.appendChild(summary);
                    this.storyGoal = document.createElement('p');
                    this.story.appendChild(this.storyGoal);
                    this.storyEvent = document.createElement('p');
                    this.storyEvent.style.color = '#c9edb0';
                    this.story.appendChild(this.storyEvent);
                    const explanation = document.createElement('p');
                    explanation.textContent = 'Click NPCs to talk. Adam checks supplies, Bstrat gathers neighbours, and Town Watch patrols the gate. Your choices and completed quests change their later dialogue and greetings. Each player has their own progress.';
                    this.story.appendChild(explanation);
                    this.replay = document.createElement('button');
                    this.replay.textContent = 'Replay picnic';
                    this.replay.style.cssText = 'font:inherit;color:#ffe3a1;background:#6b4953;border:1px solid #b99761;padding:5px 8px;cursor:pointer;';
                    this.replay.addEventListener('click', () => {
                        this.replay.disabled = true;
                        const sessionId = new URLSearchParams(window.location.search).get('sessionId');
                        fetch('/__npc_preview/picnic', {method: 'POST', headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({sessionId})}).then(response => {
                            if (!response.ok) throw new Error('The picnic is already underway, or this story is not complete.');
                        }).catch(error => { this.storyEvent.textContent = error.message; })
                            .finally(() => { this.replay.disabled = false; });
                    });
                    this.story.appendChild(this.replay);
                    this.controls.appendChild(this.story);
                }
                this.story.firstChild.textContent = (story.title || 'The Lantern Picnic') + ' — your next step';
                this.storyGoal.textContent = story.goal;
                this.storyEvent.textContent = story.event || '';
                this.replay.style.display = config.previewControls && story.canReplay ? 'inline-block' : 'none';
            }
        }

        draw() {
            if (!this.config) return;
            const now = Date.now();
            if (document.hidden || now - this.lastFrame < 16) {
                this.scheduleDraw();
                return;
            }
            this.lastFrame = now;
            this.view = this.updateView(now);
            const reference = document.getElementById('background');
            const width = reference?.width || 960, height = reference?.height || 448;
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
            const context = this.canvas.getContext('2d');
            context.clearRect(0, 0, width, height);
            const elapsed = (now + this.clockOffset - (this.config.epoch || 0)) / 1000;
            const phase = (elapsed % this.config.cycleSeconds) / this.config.cycleSeconds;
            const night = this.config.mode === 'night' ? 1 : this.config.mode === 'day' ? 0 :
                (1 - Math.cos(phase * Math.PI * 2)) / 2;
            context.fillStyle = 'rgba(22,30,68,' + (night * this.config.nightOpacity) + ')';
            context.fillRect(0, 0, width, height);
            if (!this.reducedMotion) {
                for (const {index, x, y, scale} of this.particlePositions(elapsed, width, height)) {
                    const seed = index * 1.618 + 0.5;
                    if (this.config.particles === 'fireflies') {
                        const glow = night * (0.65 + Math.sin(elapsed * 1.1 + seed) * 0.15);
                        if (glow <= 0) continue;
                        const radius = 8 * scale;
                        const halo = context.createRadialGradient(x, y, 0, x, y, radius);
                        halo.addColorStop(0, 'rgba(236,255,148,' + glow * 0.45 + ')');
                        halo.addColorStop(1, 'rgba(236,255,148,0)');
                        context.globalCompositeOperation = 'lighter';
                        context.fillStyle = halo;
                        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                        context.fillStyle = 'rgba(255,255,208,' + glow + ')';
                        context.fillRect(x, y, 2 * scale, 2 * scale);
                        context.globalCompositeOperation = 'source-over';
                    } else if (this.config.particles === 'leaves') {
                        context.fillStyle = 'rgba(177,153,77,0.35)';
                        context.fillRect(Math.round(x), Math.round((y + elapsed * 3) % height), 4, 2);
                    }
                }
            }
            this.scheduleDraw();
        }

        scheduleDraw() {
            // Reduced motion removes insect animation while keeping world time.
            if (this.reducedMotion) this.timer = setTimeout(() => this.draw(), 1000);
            else this.frame = requestAnimationFrame(() => this.draw());
        }

        particlePositions(elapsed, width, height) {
            // Repeating patches live in map pixels. Camera movement changes their
            // screen position, while their small wandering motion stays independent.
            const {x: cameraX = 0, y: cameraY = 0, scale = 1} = this.view || this.getView() || {};
            const points = [];
            for (let patchY = Math.floor((cameraY - 16) / 224); patchY <= Math.floor((cameraY + height / scale + 16) / 224); patchY++) {
                for (let patchX = Math.floor((cameraX - 16) / 480); patchX <= Math.floor((cameraX + width / scale + 16) / 480); patchX++) {
                    for (let index = 0; index < this.config.particleCount; index++) {
                        const seed = index * 1.618 + 0.5;
                        const x = (patchX * 480 + (seed * 137 % 480) + Math.sin(elapsed * 0.25 + seed) * 7 - cameraX) * scale;
                        const y = (patchY * 224 + (seed * 83 % 224) + Math.cos(elapsed * 0.3 + seed) * 6 - cameraY) * scale;
                        if (x >= -16 * scale && y >= -16 * scale && x <= width + 16 * scale && y <= height + 16 * scale) {
                            points.push({index, x, y, scale});
                        }
                    }
                }
            }
            return points;
        }

        updateView(time) {
            const target = this.getView() || {x: 0, y: 0, scale: 1};
            const previous = this.view;
            // Keep floating insects smooth even though the pixel-art camera updates
            // in whole pixels. Teleports and rescaling must not sweep across the map.
            if (!previous || previous.scale !== target.scale ||
                Math.hypot(target.x - previous.x, target.y - previous.y) > 96) {
                return {x: target.x, y: target.y, scale: target.scale, time};
            }
            const alpha = 1 - Math.exp(-Math.max(0, time - previous.time) / 40);
            const follow = axis => Math.abs(target[axis] - previous[axis]) < 0.01 ? target[axis] :
                previous[axis] + (target[axis] - previous[axis]) * alpha;
            return {x: follow('x'), y: follow('y'), scale: target.scale, time};
        }

        clear() {
            if (this.frame !== null) cancelAnimationFrame(this.frame);
            this.frame = null;
            if (this.timer !== null) clearTimeout(this.timer);
            this.timer = null;
            this.config = null;
            this.view = null;
            this.lastFrame = 0;
            if (this.canvas) this.canvas.style.display = 'none';
            if (this.controls) this.controls.style.display = 'none';
        }
    }
    return WorldAmbience;
});
