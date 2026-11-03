/* PixelFX sheets: patch-gg/pixelfx, MIT. See img/points-store/PixelFX-LICENSE. */
define([], function () {
    const label = value => ({aoe:'Area damage',crit:'Critical strike',speed:'Attack speed',double_catch:'Double catch',upper_hand:'Upper hand'}[value] || value.replace(/_/g,' '));
    class ReforgeFX {
        constructor(stage, traits, playSound = () => {}) {
            this.stage = stage;
            this.playSound = name => {try {playSound(name);} catch (_) { /* Audio cannot interrupt a confirmed purchase. */ }};
            this.lastTick = -Infinity;
            this.playSound('chest');
            this.track = stage.querySelector('.ps-reel-track');
            this.step = (stage.querySelector('.ps-reel')?.clientWidth || 312) / 3;
            this.status = stage.querySelector('.ps-ritual-status');
            this.canvas = stage.querySelector('canvas');
            this.ctx = this.canvas?.getContext('2d');
            this.traits = traits.length ? traits : ['Unlocked'];
            this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.burst = new Image(); this.burst.src = 'img/points-store/collect-burst.png';
            this.offset = 0; this.started = performance.now();
            this.fill(50);
            stage.classList.add('ps-charging');
            if (this.status) this.status.textContent = 'The forge is awakening…';
            if (!this.reduced) this.frame = requestAnimationFrame(time => this.tick(time));
        }
        fill(count, result) {
            if (!this.track) return;
            this.track.replaceChildren();
            for (let i = 0; i < count; i++) {
                const tile = document.createElement('span'); tile.className = 'ps-trait-token';
                tile.textContent = label(i === count - 2 && result ? result : this.traits[i % this.traits.length]);
                this.track.append(tile);
            }
        }
        draw(sheet, seconds, width, height, columns, frames) {
            if (!this.ctx || !sheet.complete || !sheet.naturalWidth) return;
            const frame = Math.min(frames - 1, Math.floor(seconds * 20));
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(sheet, (frame % columns) * width, Math.floor(frame / columns) * height, width, height,
                (400 - width * 2) / 2, (440 - height * 2) / 2, width * 2, height * 2);
        }
        tick(now) {
            if (this.stopped) return;
            this.ctx?.clearRect(0, 0, 400, 440);
            const elapsed = (now - this.started) / 1000;
            if (!this.finishAt || now < this.finishAt) {
                this.offset = (elapsed * 12) % 35;
            } else {
                const progress = Math.min(1, (now - this.finishAt) / 1500);
                this.offset = this.from + (47 - this.from) * (1 - Math.pow(1 - progress, 4));
                if (progress === 1) {
                    if (!this.revealed) {
                        this.revealed = now;
                        this.playSound('achievement');
                        this.stage.classList.remove('ps-charging'); this.stage.classList.add('ps-revealed');
                        if (this.status) this.status.textContent = label(this.result) + ' — forged!';
                    }
                    this.draw(this.burst, (now - this.revealed) / 1000, 112, 108, 6, 28);
                    if (now - this.revealed > 1100) {this.stop(); return;}
                }
            }
            if (this.track && !this.revealed && Math.floor(this.offset)!==this.lastSlot && now-this.lastTick>=100) {
                this.playSound('chat');this.lastTick=now;this.lastSlot=Math.floor(this.offset);
            }
            if (this.track) this.track.style.transform = 'translateX(' + (-this.offset * this.step) + 'px)';
            // No perpetual animation while a network response is missing.
            if (!this.finishAt && elapsed > 8) {
                this.stage.classList.remove('ps-charging');
                if (this.status) this.status.textContent = 'Waiting for the forge to confirm…';
                return;
            }
            this.frame = requestAnimationFrame(time => this.tick(time));
        }
        settle(result) {
            if (this.stopped) return Promise.resolve();
            if (this.reduced) {this.playSound('achievement');this.stop();return Promise.resolve();}
            this.stage.classList.add('ps-charging');
            this.result = result;
            this.fill(50, result);
            this.finishAt = Math.max(performance.now(), this.started + 500);
            // Preserve the reel's position when the response arrives.
            this.from = this.offset;
            cancelAnimationFrame(this.frame);
            this.frame = requestAnimationFrame(time => this.tick(time));
            return new Promise(resolve => {this.resolve = resolve;});
        }
        stop() {
            this.stopped = true;
            cancelAnimationFrame(this.frame);
            this.ctx?.clearRect(0, 0, 400, 440);
            this.stage.classList.remove('ps-charging');
            this.resolve?.();
        }
    }
    return {ReforgeFX, label};
});
