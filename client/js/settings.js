class GameSettings {
    constructor() {
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

      // Initialize checkbox states based on localStorage
      document.getElementById('musicEnabled').checked = this.getMusicEnabled();
      document.getElementById('centeredCamera').checked = this.getCenteredCamera();
      document.getElementById('animatedTiles').checked = this.getAnimatedTiles();

      // Add event listener to save settings when the form is submitted
      const form = document.getElementById('settingsForm');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.setMusicEnabled(document.getElementById('musicEnabled').checked);
        this.setCenteredCamera(document.getElementById('centeredCamera').checked);
        this.setAnimatedTiles(document.getElementById('animatedTiles').checked);
        alert('Settings saved!');
      });
    }

    // Methods to get and set each setting
    getMusicEnabled() {
      return localStorage.getItem('musicEnabled') === 'true';
    }

    setMusicEnabled(enabled) {
      localStorage.setItem('musicEnabled', enabled ? 'true' : 'false');
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
  }