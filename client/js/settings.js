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
      if(!localStorage.getItem('renderText')) {
          localStorage.setItem('renderText', 'true');
      }

      if(!localStorage.getItem('inventorySlots')) {
          localStorage.setItem('inventorySlots', JSON.stringify([]));
      }

      // Initialize checkbox states based on localStorage
      document.getElementById('musicEnabled').checked = this.getMusicEnabled();
      document.getElementById('centeredCamera').checked = this.getCenteredCamera();
      document.getElementById('animatedTiles').checked = this.getAnimatedTiles();
      document.getElementById('highlightTargetTiles').checked = this.getHighlightTargetTiles();
      document.getElementById('fullscreen').checked = this.getFullscreen();
      document.getElementById('renderText').checked = this.getRenderText();

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

    getFullscreen() {
      return localStorage.getItem('fullscreen') === 'true';
    }

    setFullscreen(enabled) {
        localStorage.setItem('fullscreen', enabled ? 'true' : 'false');
        if(enabled) {
            $("#container").css('transform', 'scale(' + Math.min(($(window).width() / $("#container").width() * 0.95), ($(window).height() / $("#container").height() * 0.95)) + ')')
        } else {
            $("#container").css('transform', 'scale(1)')
        }
    }

    setRenderText(enabled) {
      localStorage.setItem('renderText', enabled ? 'true' : 'false');
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

    setSettings() {
      this.setMusicEnabled(document.getElementById('musicEnabled').checked);
      this.setCenteredCamera(document.getElementById('centeredCamera').checked);
      this.setAnimatedTiles(document.getElementById('animatedTiles').checked);
      this.setHighlightTargetTiles(document.getElementById('highlightTargetTiles').checked);
      this.setFullscreen(document.getElementById('fullscreen').checked);
      this.setRenderText(document.getElementById('renderText').checked);
    }
  }