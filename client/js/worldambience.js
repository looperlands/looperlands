define(['worldtime-worker', 'worldparticles-worker'], function (WorldTime, WorldParticles) {
    class WorldAmbience {
        constructor(getView = () => ({x: 0, y: 0, scale: 1}), getWorldTime = () => Date.now()) {
            this.getView = getView;
            this.getWorldTime = getWorldTime;
            this.canvas = null;
            this.frame = null;
            this.config = null;
            this.lastFrame = 0;
        }

        setConfig(config) {
            const previousView = this.config?.scene === config?.scene ? this.view : null;
            this.clear();
            if (!config) return;
            this.config = config;
            this.view = previousView;
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
            const story = config.story ? {...config.story, canReplay: config.previewStory?.canReplay} : config.previewStory;
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
                    explanation.textContent = 'Local playtest guide. Click NPCs to talk and walk to ground markers to inspect them. The normal quest log keeps your objectives. Dialogue explains what each neighbour knows and why they need your help. Each player has their own progress.';
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
                if (story.quests) {
                    if (!this.journalContent) {
                        this.journalContent = document.createElement('div');
                        this.journalContent.style.cssText = 'max-height:45vh;overflow:auto;';
                        this.story.appendChild(this.journalContent);
                    }
                    this.journalContent.replaceChildren();
                    const line = (text, strong = false) => {
                        const element = document.createElement(strong ? 'strong' : 'p');
                        element.textContent = text;
                        this.journalContent.appendChild(element);
                    };
                    line(story.chapter || '', true);
                    line('Why: ' + story.why);
                    line('What you know: ' + story.known);
                    for (const memory of story.memories || []) line(memory);
                    for (const quest of story.quests) line((quest.optional ? 'Optional · ' : '') + quest.name + ': ' + quest.next);
                    const action = (item, type) => {
                        const button = document.createElement('button');
                        button.textContent = item.label;
                        button.style.cssText = 'display:block;margin:6px 0;font:inherit;color:#ffe3a1;background:#6b4953;border:1px solid #b99761;padding:5px 8px;cursor:pointer;';
                        button.addEventListener('click', async event => {
                            event.stopPropagation(); button.disabled = true;
                            try {
                                const sessionId = new URLSearchParams(window.location.search).get('sessionId');
                                const response = await fetch('/session/' + sessionId + '/story/' + type + '/' + encodeURIComponent(item.id), {method: 'POST'});
                                const result = await response.json();
                                if (!response.ok) throw new Error(result.error || 'Please try again.');
                                this.storyEvent.textContent = result.text;
                            } catch (error) { this.storyEvent.textContent = error.message; }
                            finally { button.disabled = false; }
                        });
                        this.journalContent.appendChild(button);
                    };
                    for (const item of story.inspect || []) action({...item, label: 'Inspect: ' + item.label}, 'inspect');
                    for (const item of story.passages || []) action(item, 'travel');
                }
                this.replay.style.display = config.previewControls && story.canReplay ? 'inline-block' : 'none';
            }
        }

        draw() {
            if (!this.config) return;
            const now = Date.now();
            if (document.hidden || now - this.lastFrame < 16) {
                if (!this.reducedMotion) this.frame = requestAnimationFrame(() => this.draw());
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
            const elapsed = (now - (this.config.epoch || 0)) / 1000;
            const worldTime = WorldTime.previewTime(this.config.previewTimeMode, this.getWorldTime());
            const daylight = WorldTime.mainDaylight(worldTime);
            // Area effects share the renderer clock and never add a lighting tint.
            if (!this.reducedMotion) {
                context.save();
                if (this.config.bounds) {
                    const {x, y, width: areaWidth, height: areaHeight} = this.config.bounds;
                    const {x: cameraX, y: cameraY, scale} = this.view;
                    context.beginPath();
                    context.rect((x - cameraX) * scale, (y - cameraY) * scale, areaWidth * scale, areaHeight * scale);
                    context.clip();
                }
                const effects = this.config.effects || [{type: this.config.particles, count: this.config.particleCount}];
                for (const effect of effects) {
                    for (const point of this.particlePositions(elapsed, width, height, effect.type, effect.count)) {
                        WorldParticles.draw(context, point, effect.type, elapsed, daylight);
                    }
                }
                context.restore();
            }
            if (!this.reducedMotion) this.frame = requestAnimationFrame(() => this.draw());
        }

        particlePositions(elapsed, width, height, type = this.config.particles, count = this.config.particleCount) {
            return WorldParticles.positions(type, count, elapsed, this.view || this.getView(), width, height);
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
            this.config = null;
            this.view = null;
            this.lastFrame = 0;
            if (this.canvas) this.canvas.style.display = 'none';
            if (this.controls) this.controls.style.display = 'none';
        }
    }
    return WorldAmbience;
});
