/*!
 *  Howler.js Audio Player Demo
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

// Cache references to DOM elements.
var elms = ['CORNRADIO', 'track', 'timer', 'duration', 'playBtn', 'pauseBtn', 'prevBtn',
  'nextBtn', 'volumeBtn', 'progress', 'bar', 'wave', 'loading', //'playlistBtn', remove playlist button for now
  'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn'];

elms.forEach(function (elm) {
  window[elm] = document.getElementById(elm);
});

/**
 * Player class containing the state of our playlist and where we are in it.
 * Includes all methods for playing, skipping, updating the display, etc.
 * @param {Array} playlist Array of objects with playlist song details ({title, file, howl}).
 */
var Player = function (playlist) {
  this.playlist = playlist;
  this.index = 0;

  // Display the title of the first track.
  track.innerHTML = playlist[0].title;
/*   var textWidth = track.offsetWidth*1.1;
  if (textWidth > CORNRADIO.offsetWidth * 0.9) {
    track.classList.add('scrolling');
    track.style.setProperty('--scroll-width', textWidth + 'px');
  } else {
    track.classList.remove('scrolling');
  } */

  // Setup the playlist display.
  playlist.forEach(function (song) {
    var div = document.createElement('div');
    div.className = 'list-song';
    div.innerHTML = song.title;
    div.onclick = function () {
      player.skipTo(playlist.indexOf(song));
    };
    list.appendChild(div);
  });
};
Player.prototype = {
  /**
   * Play a song in the playlist.
   * @param  {Number} index Index of the song in the playlist (leave empty to play the first or current).
   */
  play: function (index) {
    var self = this;
    var sound;

    index = typeof index === 'number' ? index : self.index;
    var data = self.playlist[index];

    // If we already loaded this track, use the current one.
    // Otherwise, setup and load a new Howl.
    if (data.howl) {
      sound = data.howl;
    } else {
      sound = data.howl = new Howl({
        src: ['./audio/' + data.file + '.mp3'],
        html5: true, // Force to HTML5 so that the audio can stream in (best for large files).
        onplay: function () {
          // Display the duration.
          duration.innerHTML = self.formatTime(Math.round(sound.duration()));

          // Start updating the progress of the track.
          requestAnimationFrame(self.step.bind(self));

          // Start the wave animation if we have already loaded
          wave.container.style.display = 'block';
          bar.style.display = 'none';
          pauseBtn.style.display = 'block';
        },
        onload: function () {
          // Start the wave animation.
          wave.container.style.display = 'block';
          bar.style.display = 'none';
          loading.style.display = 'none';
        },
        onend: function () {
          // Stop the wave animation.
          wave.container.style.display = 'none';
          bar.style.display = 'block';
          self.skip('next');
        },
        onpause: function () {
          // Stop the wave animation.
          wave.container.style.display = 'none';
          bar.style.display = 'block';
        },
        onstop: function () {
          // Stop the wave animation.
          wave.container.style.display = 'none';
          bar.style.display = 'block';
        },
        onseek: function () {
          // Start updating the progress of the track.
          requestAnimationFrame(self.step.bind(self));
        }
      });
    }

    // Begin playing the sound.
    sound.play();

    // Update the track display.
    track.innerHTML = data.title;
/*     var textWidth = track.scrollWidth;
    if (track.scrollWidth > CORNRADIO.offsetWidth * 0.9) {
      track.classList.add('scrolling');
      track.style.setProperty('--scroll-width', textWidth + 'px');
    } else {
      track.classList.remove('scrolling');
    } */

    

    // Show the pause button.
    if (sound.state() === 'loaded') {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'block';
    } else {
      loading.style.display = 'block';
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
    }

    // Keep track of the index we are currently playing.
    self.index = index;
  },

  /**
   * Pause the currently playing track.
   */
  pause: function () {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Pause the sound.
    sound.pause();

    // Show the play button.
    playBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
  },

  /**
   * Skip to the next or previous track.
   * @param  {String} direction 'next' or 'prev'.
   */
  skip: function (direction) {
    var self = this;

    // Get the next track based on the direction of the track.
    var index = 0;
    if (direction === 'prev') {
      index = self.index - 1;
      if (index < 0) {
        index = self.playlist.length - 1;
      }
    } else {
      index = self.index + 1;
      if (index >= self.playlist.length) {
        index = 0;
      }
    }

    self.skipTo(index);
  },

  /**
   * Skip to a specific track based on its playlist index.
   * @param  {Number} index Index in the playlist.
   */
  skipTo: function (index) {
    var self = this;

    // Stop the current track.
    if (self.playlist[self.index].howl) {
      self.playlist[self.index].howl.stop();
    }

    // Reset progress.
    progress.style.width = '0%';

    // Play the new track.
    self.play(index);
  },

  /**
   * Set the volume and update the volume slider display.
   * @param  {Number} val Volume between 0 and 1.
   */
  volume: function (val) {
    var self = this;

    // Update the global volume (affecting all Howls).
    Howler.volume(val);

    // Update the display on the slider.
    var barWidth = (val * 90) / 100;
    barFull.style.width = (barWidth * 100) + '%';
    sliderBtn.style.left = (CORNRADIO.offsetWidth * barWidth) + 'px';
  },

  /**
   * Seek to a new position in the currently playing track.
   * @param  {Number} per Percentage through the song to skip.
   */
  seek: function (per) {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Convert the percent into a seek position.
    if (sound.playing()) {
      sound.seek(sound.duration() * per);
    }
  },

  /**
   * The step called within requestAnimationFrame to update the playback position.
   */
  step: function () {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Determine our current seek position.
    var seek = sound.seek() || 0;
    timer.innerHTML = self.formatTime(Math.round(seek));
    progress.style.width = (((seek / sound.duration()) * 100) || 0) + '%';

    // If the sound is still playing, continue stepping.
    if (sound.playing()) {
      requestAnimationFrame(self.step.bind(self));
    }
  },

  /**
   * Toggle the playlist display on/off.
   */
  togglePlaylist: function () {
    var self = this;
    var display = (playlist.style.display === 'block') ? 'none' : 'block';

    setTimeout(function () {
      playlist.style.display = display;
    }, (display === 'block') ? 0 : 500);
    playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  /**
   * Toggle the volume display on/off.
   */
  toggleVolume: function () {
    var self = this;
    var display = (volume.style.display === 'block') ? 'none' : 'block';

    setTimeout(function () {
      volume.style.display = display;
    }, (display === 'block') ? 0 : 500);
    volume.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  /**
   * Format the time from seconds to M:SS.
   * @param  {Number} secs Seconds to format.
   * @return {String}      Formatted time.
   */
  formatTime: function (secs) {
    var minutes = Math.floor(secs / 60) || 0;
    var seconds = (secs - minutes * 60) || 0;

    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
};

// Setup our new audio player class and pass it the playlist.
var player = new Player([
  {
    title: 'BASSMINT',
    file: '1',
    howl: null
  },
  {
    title: 'JAMIENCE',
    file: '2',
    howl: null
  },
  {
    title: 'Rave Digger',
    file: 'rave_digger',
    howl: null
  },
  {
    title: '80s Vibe',
    file: '80s_vibe',
    howl: null
  },
  {
    title: 'Running Out',
    file: 'running_out',
    howl: null
  }
]);

// Bind our player controls.
playBtn.addEventListener('click', function () {
  player.play();
});
pauseBtn.addEventListener('click', function () {
  player.pause();
});
prevBtn.addEventListener('click', function () {
  player.skip('prev');
});
nextBtn.addEventListener('click', function () {
  player.skip('next');
});
waveform.addEventListener('click', function (event) {
  player.seek((event.clientX-CORNRADIO.offsetLeft) / CORNRADIO.offsetWidth);
});
//playlistBtn.addEventListener('click', function () {
//  player.togglePlaylist();
//});
//playlist.addEventListener('click', function () {
//  player.togglePlaylist();
//});
volumeBtn.addEventListener('click', function () {
  player.toggleVolume();
});
volume.addEventListener('click', function () {
  player.toggleVolume();
});

// Setup the event listeners to enable dragging of volume slider.
barEmpty.addEventListener('click', function (event) {
  var per = (event.clientX-CORNRADIO.offsetLeft) / parseFloat(barEmpty.scrollWidth);
  player.volume(per);
});

sliderBtn.addEventListener('mousedown', function () {
  window.sliderDown = true;
});
sliderBtn.addEventListener('touchstart', function () {
  window.sliderDown = true;
});
volume.addEventListener('mouseup', function () {
  window.sliderDown = false;
});
volume.addEventListener('touchend', function () {
  window.sliderDown = false;
});

document.addEventListener('mouseup', function () {
  window.sliderDown = false;
});
document.addEventListener('touchend', function () {
  window.sliderDown = false;
});

var move = function (event) {
  if (window.sliderDown) {
    var x = event.clientX || event.touches[0].clientX;
    var startX = CORNRADIO.offsetWidth * 0.05;
    var layerX = (x-CORNRADIO.offsetLeft) - startX;
    var per = Math.min(1, Math.max(0, layerX / parseFloat(barEmpty.scrollWidth)));
    player.volume(per);
  }
};

volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move);

// Setup the "waveform" animation.
var wave = new SiriWave({
  container: waveform,
  width: CORNRADIO.offsetWidth*2,
  height: CORNRADIO.offsetHeight * 0.4,
  cover: true,
  speed: 0.03,
  amplitude: 0.7,
  frequency: 3
});
wave.start();

// Update the height of the wave animation.
// These are basically some hacks to get SiriWave.js to do what we want.
var resize = function () {
  var height = CORNRADIO.offsetHeight * 0.25;
  var width = CORNRADIO.offsetWidth*2;
  wave.height = CORNRADIO.offsetHeight/2;
  wave.height_2 = height / 2;
  wave.MAX = wave.height_2;
  wave.width = width;
  wave.width_2 = width / 2;
  wave.width_4 = width / 4;
  wave.canvas.height = height;
  wave.canvas.width = width;
  wave.container.style.margin = -(height / 2) + 'px auto';
  wave.color = "#b9d1ee";

  // Update the position of the slider.
  var sound = player.playlist[player.index].howl;
  if (sound) {
    var vol = sound.volume();
    var barWidth = (vol * 0.9);
    sliderBtn.style.left = (width * barWidth + width * 0.05 - 25) + 'px';
  }
};
window.addEventListener('resize', resize);
resize();

// Get all elements with the draggable class
var draggableElements = document.querySelectorAll('.draggable');

// Loop through each draggable element and attach event listeners
draggableElements.forEach(function(element) {
  var offsetX, offsetY;
  var isDragging = false;

  element.addEventListener('mousedown', startDragging);
  element.addEventListener('touchstart', startDragging);

  document.addEventListener('mouseup', stopDragging);
  document.addEventListener('touchend', stopDragging);

  function startDragging(e) {
    if(volume.style.display == 'block') return;
    e.preventDefault();
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    isDragging = true;
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
  }

  function drag(e) {
    if (!isDragging) return;
    var x = e.clientX - offsetX;
    var y = e.clientY - offsetY;
    element.style.left = (x/window.innerWidth) * 100 + '%';
    element.style.top = (y/window.innerHeight) * 100 + '%';
  }

  function stopDragging() {
    if(volume.style.display == 'block') return;
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
  }
});
