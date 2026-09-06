(function(){
  'use strict';
  window.MH = window.MH || {};

  /**
   * @class
   */
  class Particles {
    constructor() {
      this.pool = [];
      this.maxParticles = 500;
      for (let i = 0; i < this.maxParticles; i++) {
        this.pool.push({
          active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0,
          color: '#fff', size: 1, rotation: 0, rotationSpeed: 0, type: 'circle', gravity: 0
        });
      }
    }

    _spawn() {
      for (let i = 0; i < this.maxParticles; i++) {
        if (!this.pool[i].active) {
          this.pool[i].active = true;
          return this.pool[i];
        }
      }
      return null;
    }

    explode(x, y, color, count = 20) {
      for (let i = 0; i < count; i++) {
        const p = this._spawn();
        if (!p) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 200 + 50;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = p.maxLife = Math.random() * 0.5 + 0.3;
        p.color = color;
        p.size = Math.random() * 4 + 2;
        p.rotation = 0;
        p.rotationSpeed = 0;
        p.type = 'circle';
        p.gravity = 0;
      }
    }

    sparkle(x, y, color = '#FFD700') {
      for (let i = 0; i < 5; i++) {
        const p = this._spawn();
        if (!p) break;
        p.x = x + (Math.random() - 0.5) * 40;
        p.y = y + (Math.random() - 0.5) * 40;
        p.vx = (Math.random() - 0.5) * 20;
        p.vy = (Math.random() - 0.5) * 20 - 20;
        p.life = p.maxLife = Math.random() * 0.4 + 0.2;
        p.color = color;
        p.size = Math.random() * 3 + 1;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = (Math.random() - 0.5) * 10;
        p.type = 'circle';
        p.gravity = -50; // floats up
      }
    }

    confetti(x, y, count = 30) {
      const colors = ['#6C5CE7', '#00D2FF', '#00E676', '#FF6B35', '#FF5252', '#FFD700'];
      for (let i = 0; i < count; i++) {
        const p = this._spawn();
        if (!p) break;
        p.x = x + (Math.random() - 0.5) * 100;
        p.y = y + (Math.random() - 0.5) * 50;
        p.vx = (Math.random() - 0.5) * 150;
        p.vy = -Math.random() * 300 - 100;
        p.life = p.maxLife = Math.random() * 2 + 1;
        p.color = colors[Math.floor(Math.random() * colors.length)];
        p.size = Math.random() * 6 + 4;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = (Math.random() - 0.5) * 20;
        p.type = 'rect';
        p.gravity = 400;
      }
    }

    trail(x, y, color, size = 3) {
      const p = this._spawn();
      if (!p) return;
      p.x = x + (Math.random() - 0.5) * 5;
      p.y = y + (Math.random() - 0.5) * 5;
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = (Math.random() - 0.5) * 10;
      p.life = p.maxLife = Math.random() * 0.3 + 0.1;
      p.color = color;
      p.size = size;
      p.rotation = 0;
      p.rotationSpeed = 0;
      p.type = 'circle';
      p.gravity = 0;
    }

    shockwave(x, y, color) {
      const p = this._spawn();
      if (!p) return;
      p.x = x;
      p.y = y;
      p.vx = 0;
      p.vy = 0;
      p.life = p.maxLife = 0.5;
      p.color = color;
      p.size = 1; // Used as inner radius multiplier
      p.rotation = 0;
      p.rotationSpeed = 0;
      p.type = 'ring';
      p.gravity = 0;
    }

    update(dt) {
      for (let i = 0; i < this.maxParticles; i++) {
        const p = this.pool[i];
        if (!p.active) continue;

        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }

        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;
      }
    }

    render(ctx) {
      for (let i = 0; i < this.maxParticles; i++) {
        const p = this.pool[i];
        if (!p.active) continue;

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;

        if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'rect') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else if (p.type === 'ring') {
          const r = (1 - alpha) * 100;
          ctx.lineWidth = 4 * alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;
    }

    clear() {
      for (let i = 0; i < this.maxParticles; i++) {
        this.pool[i].active = false;
      }
    }
  }

  MH.Particles = Particles;
})();
