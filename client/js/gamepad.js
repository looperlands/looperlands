class GamePadListener {

    static gamepad = undefined;

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

        // Left stick horizontal movement (axis 0)
        if (this.gamepad.axes[0] < -threshold) {
            this.simulateKeyPress('a', 'KeyA');
        } else if (this.gamepad.axes[0] > threshold) {
            this.simulateKeyPress('d', 'KeyD');
        } else {
            this.simulateKeyRelease('a', 'KeyA');
            this.simulateKeyRelease('d', 'KeyD');
        }

        // Left stick vertical movement (axis 1)
        if (this.gamepad.axes[1] < -threshold) {
            this.simulateKeyPress('w', 'KeyW');
        } else if (this.gamepad.axes[1] > threshold) {
            this.simulateKeyPress('s', 'KeyS');
        } else {
            this.simulateKeyRelease('w', 'KeyW');
            this.simulateKeyRelease('s', 'KeyS');
        }

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
            case 0:
                this.simulateKeyPress(' ', 'Space'); // Weapon Info
                break;
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
            case 6:
                this.simulateKeyPress('t', 'KeyT'); // Select Closest Target
                break;
            case 7:
                this.simulateKeyPress('Tab', 'Tab'); // Cycle Target 
                break;
            case 8:
                this.simulateKeyPress('x', 'KeyX'); // Quests
                break;
            case 9:
                this.simulateKeyPress('c', 'KeyC'); // Settings
                break;
            case 10:
                this.simulateKeyPress('e', 'KeyE'); // Interact
                break;
            case 11:
                this.simulateKeyPress('m', 'KeyM'); // Right stick click -- Mini map
                break;
            case 12:
                this.simulateKeyPress('1', 'Key1'); // D-Pad Up -- Consume Slot 1
                break
            case 13:
                this.simulateKeyPress('2', 'Key2'); // D-Pad Down -- Consume Slot 2
                break
            case 14:
                this.simulateKeyPress('3', 'Key3'); // D-Pad Left -- Consume Slot 3
                break
            case 14:
                this.simulateKeyPress('4', 'Key4'); // D-Pad Right -- Consume Slot 4
                break
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

    isActive() {
        return this.gamepad !== undefined;
    }
}
