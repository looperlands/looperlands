class GameSettings {
    constructor(app) {
        this.app = app;
        // Check if localStorage is available in the browser
        if (typeof localStorage === 'undefined') {
            console.error('LocalStorage is not available in this browser.');
            return;
        }

        // Initialize default settings if they don't exist in localStorage
        if (!localStorage.getItem('musicEnabled')) {
            localStorage.setItem('musicEnabled', 'true');
        }
        if (!localStorage.getItem('streamMusicEnabled')) {
            localStorage.setItem('streamMusicEnabled', 'true');
        }
        if (!localStorage.getItem('centeredCamera')) {
            localStorage.setItem('centeredCamera', 'true');
        }
        if (!localStorage.getItem('animatedTiles')) {
            localStorage.setItem('animatedTiles', 'true');
        }
        if (!localStorage.getItem('highlightTargetTiles')) {
            localStorage.setItem('highlightTargetTiles', 'true');
        }
        if (!localStorage.getItem('fullscreen')) {
            localStorage.setItem('fullscreen', 'true');
        }
        if (!localStorage.getItem('renderText')) {
            localStorage.setItem('renderText', 'true');
        }

        if (!localStorage.getItem('inventorySlots')) {
            localStorage.setItem('inventorySlots', JSON.stringify([]));
        }

        if (!localStorage.getItem('cursor')) {
            localStorage.setItem('cursor', 'true');
        }

        if (!localStorage.getItem('renderShadows')) {
            localStorage.setItem('renderShadows', 'true');
        }
        if (!localStorage.getItem('renderPlayerShadow')) {
            localStorage.setItem('renderPlayerShadow', 'true');
        }
        if (!localStorage.getItem('enableDynamicLights')) {
            localStorage.setItem('enableDynamicLights', 'true');
        }

        // Initialize checkbox states based on localStorage
        document.getElementById('musicEnabled').checked = this.getMusicEnabled();
        document.getElementById('streamMusicEnabled').checked = this.getStreamMusicEnabled();
        document.getElementById('centeredCamera').checked = this.getCenteredCamera();
        document.getElementById('animatedTiles').checked = this.getAnimatedTiles();
        document.getElementById('highlightTargetTiles').checked = this.getHighlightTargetTiles();
        document.getElementById('fullscreen').checked = this.getFullscreen();
        document.getElementById('renderText').checked = this.getRenderText();
        document.getElementById('renderMyText').checked = this.getRenderMyText();
        document.getElementById('cursor').checked = this.getCursor();
        document.getElementById('renderShadows').checked = this.getRenderShadows();
        document.getElementById('renderPlayerShadow').checked = this.getRenderPlayerShadow();
        document.getElementById('enableDynamicLights').checked = this.getEnableDynamicLights();

        // Add event listener to save settings when the form is submitted
        const form = document.getElementById('settingsForm');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.setSettings();
            app.toggleSettings();
        });
    }

    // Methods to get and set each setting
    getMusicEnabled() {
        return localStorage.getItem('musicEnabled') === 'true';
    }

    // Methods to get and set each setting
    getStreamMusicEnabled() {
        return localStorage.getItem('streamMusicEnabled') === 'true';
    }

    setMusicEnabled(enabled) {
        localStorage.setItem('musicEnabled', enabled ? 'true' : 'false');
        if (enabled) {
            this.app.game.audioManager.enable();
        } else {
            this.app.game.audioManager.disable();
        }
    }

    getCenteredCamera() {
        return localStorage.getItem('centeredCamera') === 'true';
    }

    setCenteredCamera(enabled) {
        localStorage.setItem('centeredCamera', enabled ? 'true' : 'false');
    }

    getAnimatedTiles() {
        return localStorage.getItem('animatedTiles') === 'true';
    }

    setAnimatedTiles(enabled) {
        localStorage.setItem('animatedTiles', enabled ? 'true' : 'false');
    }

    getHighlightTargetTiles() {
        return localStorage.getItem('highlightTargetTiles') === 'true';
    }

    setHighlightTargetTiles(enabled) {
        localStorage.setItem('highlightTargetTiles', enabled ? 'true' : 'false');
    }

    getCursor() {
        return localStorage.getItem('cursor') === 'true';
    }

    setCursor(enabled) {
        localStorage.setItem('cursor', enabled ? 'true' : 'false');
    }

    setStreamMusicEnabled(enabled) {
        localStorage.setItem('streamMusicEnabled', enabled ? 'true' : 'false');
    }

    getFullscreen() {
        return localStorage.getItem('fullscreen') === 'true';
    }

    setFullscreen(enabled) {
        localStorage.setItem('fullscreen', enabled ? 'true' : 'false');
        if (enabled) {
            $("#container").css('transform', 'scale(' + Math.min(($(window).width() / $("#container").width() * 0.95), ($(window).height() / $("#container").height() * 0.95)) + ')')
        } else {
            $("#container").css('transform', 'scale(1)')
        }
    }

    setRenderMyText(enabled) {
        localStorage.setItem('renderMyText', enabled ? 'true' : 'false');
    }

    setRenderText(enabled) {
        localStorage.setItem('renderText', enabled ? 'true' : 'false');
    }

    getRenderMyText() {
        return localStorage.getItem('renderMyText') === 'true';
    }

    getRenderText() {
        return localStorage.getItem('renderText') === 'true';
    }

    getInventorySlots() {
        return JSON.parse(localStorage.getItem('inventorySlots'));
    }

    setInventorySlots(slots) {
        localStorage.setItem('inventorySlots', JSON.stringify(slots));
    }

    getRenderShadows() {
        return localStorage.getItem('renderShadows') === 'true';
    }

    setRenderShadows(enabled) {
        localStorage.setItem('renderShadows', enabled ? 'true' : 'false');
    }

    getRenderPlayerShadow() {
        return localStorage.getItem('renderPlayerShadow') === 'true';
    }

    setRenderPlayerShadow(enabled) {
        localStorage.setItem('renderPlayerShadow', enabled ? 'true' : 'false');
    }

    getEnableDynamicLights() {
        return localStorage.getItem('enableDynamicLights') === 'true';
    }

    setEnableDynamicLights(enabled) {
        localStorage.setItem('enableDynamicLights', enabled ? 'true' : 'false');
    }

    setSettings() {
        this.setMusicEnabled(document.getElementById('musicEnabled').checked);
        this.setStreamMusicEnabled(document.getElementById('streamMusicEnabled').checked);
        this.setCenteredCamera(document.getElementById('centeredCamera').checked);
        this.setAnimatedTiles(document.getElementById('animatedTiles').checked);
        this.setHighlightTargetTiles(document.getElementById('highlightTargetTiles').checked);
        this.setCursor(document.getElementById('cursor').checked);
        this.setFullscreen(document.getElementById('fullscreen').checked);
        this.setRenderMyText(document.getElementById('renderMyText').checked);
        this.setRenderText(document.getElementById('renderText').checked);
        this.setRenderShadows(document.getElementById('renderShadows').checked);
        this.setRenderPlayerShadow(document.getElementById('renderPlayerShadow').checked);
        this.setEnableDynamicLights(document.getElementById('enableDynamicLights').checked);
    }
}