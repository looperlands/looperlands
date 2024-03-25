export default class SiriWave {
    constructor(opt) {
      opt = opt || {};
  
      this.phase = 0;
      this.run = false;
  
      // UI vars
      this.ratio = opt.ratio || window.devicePixelRatio || 1;
  
      this.width = this.ratio * (opt.width || 320);
      this.width_2 = this.width / 2;
      this.width_4 = this.width / 4;
  
      this.height = this.ratio * (opt.height || 100);
      this.height_2 = this.height / 2;
  
      this.MAX = (this.height_2) - 4;
  
      // Constructor opt
      this.amplitude = opt.amplitude || 1;
      this.speed = opt.speed || 0.2;
      this.frequency = opt.frequency || 6;
      this.colors = opt.colors || ['#ffffff'];
      this.colorIndex = 0;
  
      // Canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
  
      if (opt.cover) {
        this.canvas.style.width = this.canvas.style.height = '100%';
      } else {
        this.canvas.style.width = (this.width / this.ratio) + 'px';
        this.canvas.style.height = (this.height / this.ratio) + 'px';
      };
  
      this.container = opt.container || document.body;
      this.container.appendChild(this.canvas);
  
      this.ctx = this.canvas.getContext('2d');
  
      // Start
      if (opt.autostart) {
        this.start();
      }
  
      // Start color change interval
      this.colorInterval = setInterval(() => {
        this.colorIndex = (this.colorIndex + 1) % this.colors.length;
      }, 1000); // Change color every second
    }
  
    _globAttFunc(x) {
      if (SiriWave.prototype._GATF_cache[x] == null) {
        SiriWave.prototype._GATF_cache[x] = Math.pow(4 / (4 + Math.pow(x, 4)), 4);
      }
      return SiriWave.prototype._GATF_cache[x];
    }
  
    _xpos(i) {
      return this.width_2 + i * this.width_4;
    }
  
    _ypos(i, attenuation) {
      var att = (this.MAX * this.amplitude) / attenuation;
      return this.height_2 + this._globAttFunc(i) * att * Math.sin(this.frequency * i - this.phase);
    }
  
    _drawLine(attenuation, width) {
      this.ctx.moveTo(0, 0);
      this.ctx.beginPath();
      this.ctx.lineWidth = width || 1;
  
      var i = -2;
      while ((i += 0.01) <= 2) {
        var y = this._ypos(i, attenuation);
        if (Math.abs(i) >= 1.90) y = this.height_2;
        var color = this.colors[this.colorIndex];
        this.ctx.strokeStyle = color;
        this.ctx.lineTo(this._xpos(i), y);
      }
  
      this.ctx.stroke();
    }
  
    _clear() {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }
  
    _draw() {
      if (this.run === false) return;
  
      this.phase = (this.phase + Math.PI * this.speed) % (2 * Math.PI);
  
      this._clear();
      this._drawLine(-2);
      this._drawLine(-6);
      this._drawLine(4);
      this._drawLine(2);
      this._drawLine(1, 1.5);
  
      if (window.requestAnimationFrame) {
        requestAnimationFrame(this._draw.bind(this));
        return;
      };
      setTimeout(this._draw.bind(this), 20);
    }
  
    /* API */
    start() {
      this.phase = 0;
      this.run = true;
      this._draw();
    }
  
    stop() {
      this.phase = 0;
      this.run = false;
      clearInterval(this.colorInterval); // Stop color change interval
    }
  
    setSpeed(v) {
      this.speed = v;
    }
  
    setAmplitude(v) {
      this.amplitude = Math.max(Math.min(v, 1), 0);
    }
  }
  
  SiriWave.prototype._GATF_cache = {};
  