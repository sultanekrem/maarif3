(function(){
  'use strict';
  window.MH = window.MH || {};

  class GameLoop {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = 0;
      this.height = 0;
      this.running = false;
      this.fps = 0;
      
      this.lastTime = 0;
      this.frames = 0;
      this.fpsTimer = 0;
      this.reqId = null;
      
      this._updateFn = null;
      this._renderFn = null;
      
      this._resizeHandler = this.resize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
      this.resize();
    }

    resize() {
      const pr = window.devicePixelRatio || 1;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width * pr;
      this.canvas.height = this.height * pr;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.scale(pr, pr);
    }

    start(updateFn, renderFn) {
      this._updateFn = updateFn;
      this._renderFn = renderFn;
      if (!this.running) {
        this.running = true;
        this.lastTime = performance.now();
        this.reqId = requestAnimationFrame(this._loop.bind(this));
      }
    }

    stop() {
      this.running = false;
      if (this.reqId) {
        cancelAnimationFrame(this.reqId);
        this.reqId = null;
      }
    }

    _loop(timestamp) {
      if (!this.running) return;

      let dt = (timestamp - this.lastTime) / 1000;
      if (dt > 0.05) dt = 0.05; // cap dt
      this.lastTime = timestamp;

      this.fpsTimer += dt;
      this.frames++;
      if (this.fpsTimer >= 1.0) {
        this.fps = this.frames;
        this.frames = 0;
        this.fpsTimer = 0;
      }

      if (this._updateFn) {
        this._updateFn(dt);
      }

      this.ctx.clearRect(0, 0, this.width, this.height);
      
      if (this._renderFn) {
        this._renderFn(this.ctx, this.width, this.height);
      }

      this.reqId = requestAnimationFrame(this._loop.bind(this));
    }
    
    destroy() {
      this.stop();
      window.removeEventListener('resize', this._resizeHandler);
    }
  }

  MH.GameLoop = GameLoop;
})();
