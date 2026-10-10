define([], function() {
    // Hit testing includes modal backdrops, UI and iframe boundaries. Recheck
    // each frame so opening UI under a stationary pointer also works.
    class CursorController {
        constructor(surface, doc = document, win = window) {
            this.surface = surface;
            this.document = doc;
            this.position = null;
            this.enabled = false;
            this.visible = false;
            const track = event => {
                this.position = event.pointerType === 'mouse'
                    ? {clientX: event.clientX, clientY: event.clientY} : null;
                this.update(this.enabled);
            };
            doc.addEventListener('pointermove', track, true);
            doc.addEventListener('pointerdown', track, true);
            doc.addEventListener('pointerout', event => {
                if (!event.relatedTarget) this.reset();
            }, true);
            win.addEventListener('blur', () => this.reset());
            doc.addEventListener('visibilitychange', () => {
                if (doc.hidden) this.reset();
            });
        }

        reset() {
            this.position = null;
            this.update(this.enabled);
        }

        update(enabled) {
            this.enabled = enabled;
            const position = this.position;
            const target = enabled && position && !this.document.hidden
                ? this.document.elementFromPoint(position.clientX, position.clientY) : null;
            const visible = !!(target && target.tagName === 'CANVAS'
                && target.parentElement === this.surface);
            if (visible !== this.visible) {
                this.surface.classList.toggle('game-cursor-active', visible);
                this.visible = visible;
            }
            return visible;
        }
    }

    return CursorController;
});
