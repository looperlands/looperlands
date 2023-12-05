class GamePadListener {
    constructor(game) {
        this.gamepad = null;
        this.game = game;

        window.addEventListener("gamepadconnected", (event) => {
            console.log("Gamepad connected:", event.gamepad);
            this.gamepad = event.gamepad;
        });

        window.addEventListener("gamepaddisconnected", (event) => {
            console.log("Gamepad disconnected:", event.gamepad);
            if (this.gamepad && this.gamepad.index === event.gamepad.index) {
                this.gamepad = null;
            }
        });
    }

    update() {
        if (!this.gamepad) return;

        // Get the latest state of the gamepad
        this.gamepad = navigator.getGamepads()[this.gamepad.index];

        // Threshold for considering an input as a directional movement
        const threshold = 0.5;

        let keys = {
            a: 0,
            d: 0,
            w: 0,
            s: 0
        };

        let change = false;
        // Left stick horizontal movement (axis 0)
        if (this.gamepad.axes[0] < -threshold) {
            //console.log('Left stick moved left (A)');
            keys.a = 1;
            change = true;
        } else if (this.gamepad.axes[0] > threshold) {
            //console.log('Left stick moved right (D)');
            keys.d = 1;
            change = true;
        }

        // Left stick vertical movement (axis 1)
        if (this.gamepad.axes[1] < -threshold) {
            //console.log('Left stick moved up (W)');
            keys.w = 1;
            change = true;
        } else if (this.gamepad.axes[1] > threshold) {
            //console.log('Left stick moved down (S)');
            keys.s = 1;
            change = true;
        }

        if (change) {
            let x = this.game.player.gridX;
            let y = this.game.player.gridY;
            this.game.click({ x: x + keys.d - keys.a, 
                              y: y + keys.s - keys.w, 
                              keyboard: true});
            change = false;    
        }
              
        // Process the gamepad buttons here (if needed)
        /*
        for (let i = 0; i < this.gamepad.buttons.length; i++) {
            if (this.gamepad.buttons[i].pressed) {
                console.log(`Button ${i} is pressed`);
            }
        }
        */
    }
}