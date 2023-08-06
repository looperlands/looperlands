class KeyBoardHandler {
    constructor(game, movementLimit = 250) {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        this.game = game;
        this.movementLimit = movementLimit;
        this.lastMovementTime = 0;

        console.log("Keyboard handler created.");

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
        }
    }

    handleMovement() {
        const now = Date.now();
        if (now - this.lastMovementTime < this.movementLimit) {
            return; // Limit the movement to occur at most once every 'movementLimit' milliseconds.
        }

        if (this.game.player.path !== null || $('#chatbox').hasClass("active")) {
            return; // Prevent movement when chatting or moving along a path.
        }

        const { gridX, gridY } = this.game.player;
        if (this.keys.w) {
            this.game.click({ x: gridX, y: gridY - 1, keyboard: true });
        }
        if (this.keys.a) {
            this.game.click({ x: gridX - 1, y: gridY, keyboard: true });
        }
        if (this.keys.s) {
            this.game.click({ x: gridX, y: gridY + 1, keyboard: true });
        }
        if (this.keys.d) {
            this.game.click({ x: gridX + 1, y: gridY, keyboard: true });
        }

        this.lastMovementTime = now;
    }
}
