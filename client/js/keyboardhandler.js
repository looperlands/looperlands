class KeyBoardHandler {
    constructor(game, app) {
        this.keys = {
            w: 0,
            a: 0,
            s: 0,
            d: 0,
            arrowup: 0,
            arrowleft: 0,
            arrowdown: 0,
            arrowright: 0            
        };

        this.app = app;

        this.weapons = null;

        this.wasRenderingText = this.app.settings.getRenderText();
        this.ctrlIsDown = false;

        this.keyCallbacks = {
            'Comma': () => this.previousWeapon(),
            'Period': () => this.nextWeapon(),
            'Tab': (event) => this.highlightNextTarget(event),
            'Space': (event) => this.engageTarget(event),
        };
        this.game = game;
        this.interval = false;
        this.game.player.onPathContinuation(() => this.getContinuationPath());

        console.log("Created keyboard handler");

        document.addEventListener('keydown', event => this.handleConversationKey(event), true);
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
        window.addEventListener('blur', this.handleBlur.bind(this));
    }

    handleConversationKey(event) {
        if (!this.game.started || this.game.player.isDead || this.inputHasFocus() || this.hasOpenPanel() || event.ctrlKey || event.metaKey || event.altKey) return;
        if ($('#dialogue-popup').hasClass('active')) {
            if (!['w', 's', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'e', 'Escape'].includes(event.key)) return;
            this.handleBlur();
            if (!event.repeat) this.app.handleChoiceKeyboardInput(event);
        } else {
            if (event.repeat && ['Enter', 'e'].includes(event.key) && this.game.worldConversation?.active()) {
                event.preventDefault(); event.stopImmediatePropagation(); return;
            }
            if (!this.game.worldConversation?.handleKey(event.key)) return;
            this.handleBlur();
        }
        event.preventDefault(); event.stopImmediatePropagation();
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        if (!this.inputHasFocus() && this.keys.hasOwnProperty(key)) {
            this.keys[key] = 1;
            if (!this.interval) {
                this.handleMovement(); // Execute one instantly so there's no interval delay
                this.interval = setInterval(this.handleMovement.bind(this), 25);
            }
        }

        if(this.keyCallbacks.hasOwnProperty(event.code)) {
            this.keyCallbacks[event.code](event);
        }

        // Keyboard shortcuts
        const shortCuts = 'ezxcvbtm1234';

        if (shortCuts.indexOf(key) > -1) {
            if(!this.game.started || this.inputHasFocus()) {
                return;
            }
            switch (key) {
                case 'e':
                    this.game.interact();
                    break;
                case 'z':
                    this.app.toggleInventory();
                    break;
                case 'x':
                    this.app.toggleAchievements();
                    break;
                case 'c':
                    this.app.toggleSettings();
                    break;
                case 'v':
                    this.app.toggleWeaponInfo(event);
                    break;
                case 'b':
                    this.app.toggleAvatarInfo(event);
                    break;
                case '1':
                    this.app.consumeSlot(0);
                    break;
                case '2':
                    this.app.consumeSlot(1);
                    break;
                case '3':
                    this.app.consumeSlot(2);
                    break
                case '4':
                    this.app.consumeSlot(3);
                    break;
                case 't':
                    this.highlightClosestTarget(event);
                    break;
                case 'm':
                    this.app.toggleMiniMap();
                    break;
            }
        }

        if (event.ctrlKey && !this.ctrlIsDown) {
            this.ctrlIsDown = true;
            this.wasRenderingText = this.app.settings.getRenderText();
            this.app.settings.setRenderText(true);
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

        if(!event.ctrlKey && this.ctrlIsDown) {
            this.app.settings.setRenderText(this.wasRenderingText);
            this.ctrlIsDown = false;
        }
    }

    handleMovement() {
        if (this.game.player.path != null || this.movementIsBlocked()) {
            return;
        }
        const { dx, dy } = this.getMovementDirection();
        if (dx === 0 && dy === 0) {
            return;
        }
        var x = this.game.player.gridX;
        var y = this.game.player.gridY;
        this.game.click({x: x + dx,
                         y: y + dy,
                          keyboard: true});
    }

    getMovementDirection() {
        return {
            dx: Math.sign(this.keys.d + this.keys.arrowright - this.keys.a - this.keys.arrowleft),
            dy: Math.sign(this.keys.s + this.keys.arrowdown - this.keys.w - this.keys.arrowup),
        };
    }

    movementIsBlocked() {
        return !this.game.started || this.game.player.isDead || this.game.player.isRooted
            || this.inputHasFocus() || this.hasOpenPanel()
            || $('#dialogue-popup').hasClass('active')
            || this.game.minigameLoaded || this.game.hoveringMinigamePrompt || this.game.doorCheck
            || !!$('.panel').filter(function () { return $(this).is(':hover'); }).length;
    }

    getContinuationPath() {
        const player = this.game.player;
        if (!this.game.keyboardMovement || this.movementIsBlocked() || player.hasTarget()
            || this.game.map.isDoor(player.gridX, player.gridY) || this.game.isItemAt(player.gridX, player.gridY)) {
            return null;
        }

        const { dx, dy } = this.getMovementDirection();
        if ((dx === 0 && dy === 0) || this.game.canFish(player.gridX + dx, player.gridY + dy, true)) {
            return null;
        }

        const start = [player.gridX, player.gridY];
        const end = [player.gridX + dx, player.gridY + dy];
        // Diagonal input still travels along two cardinal tiles, just like pathfinding.
        const paths = dx && dy
            ? [[start, [end[0], start[1]], end], [start, [start[0], end[1]], end]]
            : [[start, end]];
        return paths.find(path => path.slice(1).every(([x, y]) => {
            const row = this.game.finalPathingGrid[y];
            return row && (row[x] === 0 || row[x] === false) && !this.game.map.isColliding(x, y)
                && !this.game.getEntityAt(x, y)
                && !this.game.map.isDoor(x, y);
        })) || null;
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

    previousWeapon() {
        if(!this.game.player.hasWeapon()) {
            return
        }

        if(!this.game.started || this.inputHasFocus() || this.hasOpenPanel()) {
            return;
        }

        let self = this;
        this.getWeapons((weapons) => {
            self.equipWeapon(self.getNextWeapon(weapons));
        });
    }

    nextWeapon() {
        if(!this.game.player.hasWeapon()) {
            return
        }

        if(!this.game.started || this.inputHasFocus() || this.hasOpenPanel()) {
            return;
        }

        let self = this;
        this.getWeapons((weapons) => {
            self.equipWeapon(self.getPreviousWeapon(weapons));
        });
    }

    inputHasFocus() {
        const elem = document.activeElement;
        return elem && (elem.tagName.toLowerCase() === "input" || elem.tagName.toLowerCase() === "textarea" || elem.isContentEditable || elem.closest('#global'));
    }

    hasOpenPanel() {
        return $('body').hasClass('settings') ||
            $('body').hasClass('inventory') ||
            $('body').hasClass('credits') ||
            $('#chatbox').hasClass("active") ||
            $(`#minigame`).hasClass("active");
    }

    equipWeapon(weapon) {
        let weaponId = Types.getKindFromString(weapon);
        let nftId = weapon.replace("NFT_", "0x");
        this.game.client.sendEquipInventory(weaponId, nftId);
        this.game.player.switchWeapon(weapon,1);
    }

    getWeapons(callback) {
        if(this.weapons == null) {
            var inventoryQuery = "/session/" + this.game.sessionId + "/inventory";
            let self = this;
            this.weapons = [];
            axios.get(inventoryQuery).then(function(response) {
                for(var i = 0; i < response.data.inventory.length; i++) {
                    if (Types.isWeapon(Types.Entities[response.data.inventory[i].nftId])) {
                        self.weapons.push(response.data.inventory[i].nftId);
                    }
                }
                callback(self.weapons);
            });
        } else {
            callback(this.weapons);
        }
    }

    getPreviousWeapon(weapons) {
        var currentWeapon = this.game.player.getWeaponName();
        var currentWeaponIndex = weapons.indexOf(currentWeapon);
        var prevWeaponIndex = (currentWeaponIndex + 1) % weapons.length;

        return weapons[prevWeaponIndex];
    }

    getNextWeapon(weapons) {
        var currentWeapon = this.game.player.getWeaponName();
        var currentWeaponIndex = weapons.indexOf(currentWeapon);
        var nextWeaponIndex;
        if(currentWeaponIndex === 0) {
            nextWeaponIndex = weapons.length -1;
        } else {
            nextWeaponIndex = (currentWeaponIndex - 1) % weapons.length;
        }

        return weapons[nextWeaponIndex];
    }

    highlightNextTarget(event) {
        if(!this.game.started || this.inputHasFocus() || this.hasOpenPanel()) {
            return;
        }

        if (event !== undefined) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }

        this.game.highlightNextTarget();
    }

    highlightClosestTarget() {
        if(!this.game.started || this.inputHasFocus() || this.hasOpenPanel()) {
            return;
        }

        this.game.highlightClosestTarget();
    }

    engageTarget(event) {
        if(!this.game.started || this.inputHasFocus() || this.hasOpenPanel()) {
            return;
        }

        if (event !== undefined) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }

        if(this.game.highlightedTarget) {
            if(!this.game.highlightedTarget.isDead) {
                this.game.makePlayerAttack(this.game.highlightedTarget);
            }
        }
    }
}
