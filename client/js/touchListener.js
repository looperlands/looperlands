class TouchListener {
    constructor(game) {
        this.game = game;
        this.pointerId = null;
        this.dragging = false;
        this.moveThreshold = 16;
        this.direction = { dx: 0, dy: 0 };
        this.updateInterval = null;
        this.lastTouchTime = 0;
        const canvas = document.getElementById('canvas');
        this.canvas = canvas;

        canvas.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' || this.pointerId !== null
                || event.target.tagName !== 'CANVAS' || game.keyboardHandler.movementIsBlocked()) return;
            event.preventDefault();
            this.lastTouchTime = Date.now();
            this.hasTouchInput = true;
            this.pointerId = event.pointerId;
            this.dragStartX = event.clientX;
            this.dragStartY = event.clientY;
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointermove', event => {
            if (event.pointerId !== this.pointerId) return;
            const dx = event.clientX - this.dragStartX;
            const dy = event.clientY - this.dragStartY;
            if (Math.hypot(dx, dy) >= this.moveThreshold) this.dragging = true;
            this.direction = {
                dx: Math.abs(dx) >= this.moveThreshold ? Math.sign(dx) : 0,
                dy: Math.abs(dy) >= this.moveThreshold ? Math.sign(dy) : 0,
            };
            if (this.dragging && this.updateInterval === null) {
                this.updateInterval = setInterval(() => this.update(), 25);
                this.update();
            }
        });
        canvas.addEventListener('pointerup', event => {
            if (event.pointerId !== this.pointerId) return;
            const tap = !this.dragging && !game.keyboardHandler.movementIsBlocked();
            this.reset();
            if (tap) {
                game.app.center();
                game.app.setMouseCoordinates(event);
                game.click();
            }
        });
        for (const type of ['pointercancel', 'lostpointercapture']) {
            canvas.addEventListener(type, event => {
                if (event.pointerId === this.pointerId) this.reset();
            });
        }
        // A touch already produced either movement or a tap above.
        canvas.addEventListener('click', event => {
            if (event.pointerType === 'touch' || event.pointerType === 'pen'
                || Date.now() - this.lastTouchTime < 700) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
        window.addEventListener('blur', () => this.reset());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.reset();
        });
    }

    reset() {
        const pointerId = this.pointerId;
        this.pointerId = null;
        if (pointerId !== null && this.canvas.hasPointerCapture(pointerId)) {
            this.canvas.releasePointerCapture(pointerId);
        }
        this.dragging = false;
        this.direction = { dx: 0, dy: 0 };
        clearInterval(this.updateInterval);
        this.updateInterval = null;
        if (pointerId !== null) this.lastTouchTime = Date.now();
    }

    update() {
        if (this.game.keyboardHandler.movementIsBlocked()) {
            this.reset();
            return;
        }
        this.game.keyboardHandler.handleMovement();
    }
}
