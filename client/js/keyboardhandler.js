class KeyBoardHandler {
    constructor(game) {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        this.game = game;

        console.log("Created keyboard handler");
        
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
            this.handleMovement();
        }
    }

    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
            this.handleMovement();
        }
    }

    handleMovement() {
        console.log(this.game.player);
        if (this.game.player.path != null || $('#chatbox').hasClass("active")) {
            return;
        }
        var x = this.game.player.gridX;
        var y = this.game.player.gridY;
        if (this.keys.w) {
            this.game.click({x: x, y: y-1, keyboard: true});
        }
        if (this.keys.a) {
            this.game.click({x: x-1, y: y, keyboard: true});
        }
        if (this.keys.s) {
            this.game.click({x: x, y: y+1, keyboard: true});
        }
        if (this.keys.d) {
            this.game.click({x: x+1, y: y, keyboard: true});
        }
    }
}
