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
        var x = this.game.player.gridX;
        var y = this.game.player.gridY;
        if (this.keys.w) {
            console.log("Moving forward");
            this.game.makePlayerGoTo(x, y-1);
            // Add your code here for moving forward
        }
        if (this.keys.a) {
            console.log("Moving left");
            this.game.makePlayerGoTo(x-1, y);
            // Add your code here for moving left
        }
        if (this.keys.s) {
            console.log("Moving backward");
            this.game.makePlayerGoTo(x, y+1);
            // Add your code here for moving backward
        }
        if (this.keys.d) {
            console.log("Moving right");
            this.game.makePlayerGoTo(x+1, y);
            // Add your code here for moving right
        }
    }
}
