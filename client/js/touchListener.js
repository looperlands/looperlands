class TouchListener {

    constructor(game) {
        let self = this;
        this.game = game;
        this.dragging = false;
        this.moveTreshold = 50;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.currentDragX = 0;
        this.currentDragY = 0;
        this.upateInterval = false;

        $('#canvas').on('touchstart', (e) => {
            self.dragging = true;
            self.dragStartX = e.originalEvent.touches[0].clientX;
            self.currentDragX = self.dragStartX;

            self.dragStartY = e.originalEvent.touches[0].clientY;
            self.currentDragY = self.dragStartY;
            self.updateInterval = setInterval(() => { self.update(); }, 10);
        })

        $('#canvas').on('touchmove', (e) => {
            self.currentDragX = e.originalEvent.touches[0].clientX;
            self.currentDragY = e.originalEvent.touches[0].clientY;
        });

        $('#canvas').on('touchend', (e) => {
            self.dragging = false;
            clearInterval(self.updateInterval);
        });

        console.log("Created touch handler");
    }

    update() {
        if (!this.dragging) {
            return;
        }

        const dx = this.currentDragX - this.dragStartX;
        const dy = this.currentDragY - this.dragStartY;

        var x = this.game.player.gridX;
        var y = this.game.player.gridY;

        let moveX = 0, moveY = 0;
        if(dx < (this.moveTreshold * -1)) { moveX = -1;}
        if(dx > this.moveTreshold) { moveX = 1;}
        if(dy < (this.moveTreshold * -1)) { moveY = -1;}
        if(dy > this.moveTreshold) { moveY = 1;}

        if (moveX !== 0 || moveY !== 0) {
            this.game.click({ x: x + moveX, y: y + moveY, keyboard: true});
        }
    }
}