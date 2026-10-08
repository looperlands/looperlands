define(function () {
    class WorldAmbience {
        constructor() {
            this.config = null;
        }

        setConfig(config) {
            this.clear();
            if (!config) return;
            this.config = config;
            this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
            if (document.getElementById('canvas')) this.updatePreviewControls(config);
        }

        getRenderState() {
            if (!this.config) return null;
            const {particles, particleCount, epoch} = this.config;
            return {particles, particleCount, epoch, reducedMotion: this.reducedMotion};
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

        clear() {
            this.config = null;
            if (this.controls) this.controls.style.display = 'none';
        }
    }
    return WorldAmbience;
});
