class KeyBoardHandler {
    constructor(game) {
        this.keys = {
            w: 0,
            a: 0,
            s: 0,
            d: 0
        };
        this.game = game;
        this.interval = false;

        console.log("Created keyboard handler");
        
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
        window.addEventListener('blur', this.handleBlur.bind(this));
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = 1;
            if (!this.interval) {
                this.handleMovement(); // Execute one instantly so there's no interval delay
                this.interval = setInterval(this.handleMovement.bind(this), 25);
            }
        }
    }

    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = 0;
            if (this.interval && Object.values(this.keys).every((v) => v === 0)) {
                clearInterval(this.interval);
                this.interval = false;
            }
        }
    }

    handleMovement() {
        if (this.lastMovement === undefined) {
            this.lastMovement = new Date().getTime();
        }
        let now = new Date().getTime();

        let notEnoughTimeElasped = now - this.lastMovement < 100;
        
        if (this.game.player.path != null || $('#chatbox').hasClass("active") || notEnoughTimeElasped) {
            return;
        }

        this.lastMovement = now;

        var x = this.game.player.gridX;
        var y = this.game.player.gridY;
        this.game.wasd = true;
        this.game.click({ x: x + this.keys.d - this.keys.a, 
                          y: y + this.keys.s - this.keys.w, 
                          keyboard: true});
        this.game.wasd = false;
    }

    handleBlur() {
        for (let k in this.keys) {
            if(this.keys.hasOwnProperty(k)) {
                this.keys[k] = 0;
            }
        }
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = false;
        }
    }
}