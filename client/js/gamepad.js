class GamePadListener {

    static gamepad= undefined

    constructor(game) {
        this.game = game;
        this.buttonStates = new Array(16).fill(false);

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

        console.log("Created gamepad handler");
    }

    update() {
        if (!this.gamepad) {
            const gamepad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
            if (gamepad) {
              console.log("Gamepad found:", gamepad);
              this.gamepad = gamepad;
            }            
            return;
        }

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
        //let debounceTime = 100; // Time in milliseconds
        //let lastMoveTime = this.lastMoveTime || 0; // Track the last movement time

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

        /*
        // D-pad movement
        if (this.gamepad.buttons[12].pressed) {
            keys.w = 1;
            change = true;
        }
        if (this.gamepad.buttons[13].pressed) {
            keys.s = 1;
            change = true;
        }
        if (this.gamepad.buttons[14].pressed) {
            keys.a = 1;
            change = true;
        }
        if (this.gamepad.buttons[15].pressed) {
            keys.d = 1;
            change = true;
        }
        
        let currentTime = Date.now();
        */

        if (change) { //&& (currentTime - lastMoveTime > debounceTime)
            let x = this.game.player.gridX;
            let y = this.game.player.gridY;
            this.game.click({ x: x + keys.d - keys.a, 
                              y: y + keys.s - keys.w, 
                              keyboard: true});  
            //lastMoveTime = currentTime;
            change = false;
        }
        /*
        // Process the gamepad buttons here (if needed)
        for (let i = 0; i < this.gamepad.buttons.length; i++) {
            if (this.gamepad.buttons[i].pressed) {
                console.log(`Button ${i} is pressed`);
            }
        }
        */
        
        for (let i = 0; i < this.gamepad.buttons.length; i++) {
            if (this.gamepad.buttons[i].pressed) {
                if (!this.buttonStates[i]) {
                    this.buttonStates[i] = true;
                    this.handleButtonPress(i);
                }
            } else {
                if (this.buttonStates[i]) {
                    this.buttonStates[i] = false;
                    this.simulateKeyRelease(i); 
                }
            }
        }
    }

    handleButtonPress(buttonIndex) {
        switch (buttonIndex) {
            case 1:
                this.simulateKeyPress('b', 'KeyB'); // Weapon Info
                break;
            case 2:
                this.simulateKeyPress('v', 'KeyV'); // Avatar Info 
                break;
            case 3:
                this.simulateKeyPress('z', 'KeyZ'); // Inventory
                break;
            case 4:
                this.simulateKeyPress('.', 'Period'); // Next Weapon
                break;
            case 5:
                this.simulateKeyPress(',', 'Comma'); // Previous Weapon 
                break;
            case 8:
                this.simulateKeyPress('x', 'KeyX'); // Quests
                break;
            case 9:
                this.simulateKeyPress('c', 'KeyC'); // Settings
                break;
        }
    }
    
    simulateKeyPress(key, code) {
        const event = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: key,
            code: code
        });
        document.dispatchEvent(event);
    }

    simulateKeyRelease(key, code) {
        const event = new KeyboardEvent('keyup', {
            bubbles: true,
            cancelable: true,
            key: key,
            code: code
        });
        document.dispatchEvent(event);
    }    
    
}