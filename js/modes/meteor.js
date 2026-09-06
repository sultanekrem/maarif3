(function() {
  'use strict';
  window.MH = window.MH || {};
  
  const U = MH.Utils;
  
  class MeteorMode {
    constructor(canvas, onGameEnd, qType = 'mixed') {
      this.canvas = canvas;
      this.onGameEnd = onGameEnd;
      this.qType = qType;
      
      this.audio = new MH.Audio();
      this.particles = new MH.Particles();
      this.input = new MH.Input(canvas);
      this.loop = new MH.GameLoop(canvas);
      
      this.stars = [];
      for(let i = 0; i < 90; i++) {
        this.stars.push({
          x: Math.random(),
          y: Math.random(),
          size: U.randomFloat(1, 2.5),
          speed: U.randomFloat(0.5, 1.8),
          phase: Math.random() * Math.PI * 2
        });
      }
      
      this.resetState();
    }
    
    resetState() {
      this.score = 0;
      this.lives = 3;
      this.combo = 0;
      this.correct = 0;
      this.wrong = 0;
      
      // Dalga & Seviye Sistemi (Amaç ve İlerleme Hissi!)
      this.currentWave = 1;
      this.totalWaves = 3; // 3 dalga sonra zafer!
      this.waveQuestionsAnswered = 0;
      this.questionsPerWave = 4;
      this.isBossWave = false;
      this.waveBannerTime = 0;
      this.waveBannerText = '';
      
      this.meteor = null;
      this.shields = [];
      this.lasers = [];
      this.activeQuestion = null;
      
      this.shakeTime = 0;
      this.gameOver = false;
      this.gameWon = false;
      this.endTimer = 0;
      this.time = 0;
    }
    
    start() {
      this.resetState();
      this.showWaveIntro(1);
      this.input.onTap((x, y) => this.handleTap(x, y));
      
      this.loop.start(
        (dt) => this.update(dt),
        (ctx, w, h) => this.render(ctx, w, h)
      );
    }
    
    stop() {
      this.loop.stop();
      this.input.removeAll();
      this.particles.clear();
    }
    
    showWaveIntro(waveNum) {
      this.currentWave = waveNum;
      this.waveQuestionsAnswered = 0;
      this.isBossWave = (waveNum === this.totalWaves);
      this.generateQuestion(); // Kalkanlar ve soru hemen hazır olsun!
      
      if (this.isBossWave) {
        this.waveBannerText = '⚠️ DİKKAT: DEV BOSS METEOR GELİYOR! 👾';
        this.audio.play('gameOver');
      } else {
        this.waveBannerText = `🚀 DALGA ${waveNum} BAŞLIYOR!`;
        this.audio.play('levelup');
      }
      this.waveBannerTime = 1.6;
    }
    
    generateQuestion() {
      // Zorluk dalgaya göre artar
      const diff = this.isBossWave ? 6 : (this.currentWave === 1 ? 3 : 4);
      this.activeQuestion = MH.Questions.generate(this.qType || 'mixed', diff);
      
      this.shields = [];
      for(let i = 0; i < 4; i++) {
        this.shields.push({
          value: this.activeQuestion.choices[i],
          isCorrect: (this.activeQuestion.choices[i] === this.activeQuestion.answer),
          scale: 1.0,
          flashTime: 0,
          flashColor: ''
        });
      }
      
      this.spawnMeteor();
    }
    
    spawnMeteor() {
      if (!this.activeQuestion) return;
      
      // Boss meteoru daha büyük ve daha görkemli
      const isBoss = this.isBossWave && (this.waveQuestionsAnswered >= this.questionsPerWave - 1);
      const duration = isBoss ? 9.0 : 7.0;
      const radius = isBoss ? 65 : 48;
      
      this.meteor = {
        text: this.activeQuestion.text,
        x: U.randomFloat(0.3, 0.7),
        y: 0.12,
        progress: 0,
        duration: duration,
        scale: 1,
        radius: radius,
        isBoss: isBoss
      };
    }
    
    handleTap(x, y) {
      if (this.gameOver || this.gameWon || !this.meteor || this.waveBannerTime > 0) return;
      
      const w = this.loop.width;
      const h = this.loop.height;
      const margin = 16;
      const gap = 12;
      const totalGaps = gap * 3;
      const shieldW = (w - (margin * 2) - totalGaps) / 4;
      const shieldH = Math.min(85, Math.max(68, h * 0.12));
      const startY = h - shieldH - 24;
      
      for(let i = 0; i < 4; i++) {
        const sx = margin + i * (shieldW + gap);
        const sy = startY;
        
        if (U.pointInRect(x, y, sx, sy, shieldW, shieldH)) {
          this.checkAnswer(i, sx + shieldW/2, sy);
          this.shields[i].scale = 0.9;
          break;
        }
      }
    }
    
    checkAnswer(index, sx, sy) {
      const shield = this.shields[index];
      const w = this.loop.width;
      const h = this.loop.height;
      
      if (shield.isCorrect) {
        this.correct++;
        this.combo++;
        this.waveQuestionsAnswered++;
        
        const pts = (this.meteor && this.meteor.isBoss) ? 50 : 20;
        this.score += pts * Math.min(this.combo, 4);
        
        this.audio.play('correct');
        shield.flashTime = 0.4;
        shield.flashColor = '#10B981';
        
        if (this.meteor) {
          const mx = this.meteor.x * w;
          const my = this.meteor.y * h;
          
          this.lasers.push({
            x: sx,
            y: sy,
            targetX: mx,
            targetY: my,
            progress: 0,
            isBoss: this.meteor.isBoss
          });
          this.audio.play('swipe');
        }
        
      } else {
        this.wrong++;
        this.combo = 0;
        this.audio.play('wrong');
        shield.flashTime = 0.35;
        shield.flashColor = '#EF4444';
        this.shakeTime = 0.2;
      }
    }
    
    update(dt) {
      this.time += dt;
      
      if (this.shakeTime > 0) this.shakeTime -= dt;
      if (this.waveBannerTime > 0) this.waveBannerTime -= dt;
      
      if (this.gameOver || this.gameWon) {
        this.endTimer += dt;
        if (this.endTimer >= 2.2) {
          this.endGame();
        }
        this.particles.update(dt);
        return;
      }
      
      for(let s of this.shields) {
        if (s.scale < 1.0) s.scale = Math.min(1.0, s.scale + dt * 3);
        if (s.flashTime > 0) s.flashTime -= dt;
      }
      
      // Meteor süzülüşü
      if (this.meteor && this.waveBannerTime <= 0) {
        this.meteor.progress += dt / this.meteor.duration;
        this.meteor.y = 0.12 + (this.meteor.progress * 0.62);
        
        // Alev kuyruğu
        if (Math.random() < 0.5) {
          const mx = this.meteor.x * this.loop.width;
          const my = this.meteor.y * this.loop.height;
          const col = this.meteor.isBoss ? '#EC4899' : '#F59E0B';
          this.particles.trail(mx + U.randomFloat(-12, 12), my - this.meteor.radius, col);
        }
        
        // Meteor yere çarptı mı?
        if (this.meteor.progress >= 1.0) {
          const mx = this.meteor.x * this.loop.width;
          const my = this.meteor.y * this.loop.height;
          this.particles.shockwave(mx, my, '#EF4444');
          this.audio.play('explosion');
          this.meteor = null;
          this.loseLife();
        }
      }
      
      // Lazer füzeleri
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const l = this.lasers[i];
        l.progress += dt * 4.0;
        l.x = U.lerp(l.x, l.targetX, dt * 9);
        l.y = U.lerp(l.y, l.targetY, dt * 9);
        
        this.particles.trail(l.x, l.y, '#00D2FF', 5);
        
        if (l.progress >= 1.0) {
          this.lasers.splice(i, 1);
          if (this.meteor) {
            const mx = this.meteor.x * this.loop.width;
            const my = this.meteor.y * this.loop.height;
            const count = this.meteor.isBoss ? 70 : 40;
            this.particles.explode(mx, my, this.meteor.isBoss ? '#EC4899' : '#F59E0B', count);
            this.particles.confetti(mx, my, 40);
            this.particles.sparkle(mx, my, '#00D2FF');
            this.audio.play('explosion');
            this.meteor = null;
            
            // Dalga kontrolü
            if (this.waveQuestionsAnswered >= this.questionsPerWave) {
              if (this.currentWave < this.totalWaves) {
                // Sonraki dalgaya geç
                setTimeout(() => {
                  this.showWaveIntro(this.currentWave + 1);
                }, 400);
              } else {
                // ZAFER! TÜM DALGALAR BİTTİ
                this.gameWon = true;
                this.score += 150; // Zafer bonusu
                this.audio.play('levelup');
                this.particles.confetti(this.loop.width/2, this.loop.height/2, 100);
              }
            } else {
              setTimeout(() => {
                if (!this.gameOver && !this.gameWon) this.generateQuestion();
              }, 350);
            }
          }
        }
      }
      
      this.particles.update(dt);
    }
    
    loseLife() {
      this.lives--;
      this.combo = 0;
      this.shakeTime = 0.35;
      this.audio.play('wrong');
      
      if (this.lives <= 0) {
        this.gameOver = true;
        this.audio.play('gameOver');
        const w = this.loop.width;
        const h = this.loop.height;
        this.particles.explode(w/2, h/2, '#EF4444', 80);
      } else {
        setTimeout(() => {
          if (!this.gameOver && !this.gameWon) this.generateQuestion();
        }, 400);
      }
    }
    
    render(ctx, w, h) {
      // Canlı Çizgi Roman Uzay Arka Planı (Karanlık değil, neşeli ve renkli!)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#1E1B4B');
      bgGrad.addColorStop(0.5, '#312E81');
      bgGrad.addColorStop(1, '#4F46E5');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
      
      ctx.save();
      if (this.shakeTime > 0) {
        const amt = this.shakeTime * 15;
        ctx.translate(U.randomFloat(-amt, amt), U.randomFloat(-amt, amt));
      }
      
      // Işıldayan Renkli Yıldızlar ve Gezegen
      for(let s of this.stars) {
        const opacity = 0.3 + 0.7 * Math.abs(Math.sin(this.time * s.speed + s.phase));
        ctx.globalAlpha = opacity;
        ctx.fillStyle = s.phase > 3 ? '#FDE047' : (s.phase > 1.5 ? '#67E8F9' : '#FFFFFF');
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      
      // Sol Üst: Skor (Sıcak 3D Kart)
      MH.Renderer.roundedRect(ctx, 74, 14, 135, 46, 20, '#FAF8F4', '#DCD5CA', 2);
      MH.Renderer.text(ctx, `⭐ ${this.score}`, 141, 37, {color: '#2D3142', size: 21, bold: true});
      
      // Üst Orta: Dalga Göstergesi (Sıcak 3D Kart)
      const waveW = 180;
      MH.Renderer.roundedRect(ctx, w/2 - waveW/2, 14, waveW, 46, 20, '#FAF8F4', '#818CF8', 2);
      MH.Renderer.text(ctx, `🚀 Dalga ${this.currentWave} / ${this.totalWaves}`, w/2, 37, {color: '#4338CA', size: 19, bold: true});
      
      // Sağ Üst: Canlar (Sıcak 3D Kapsül)
      MH.Renderer.roundedRect(ctx, w - 145, 14, 130, 46, 20, '#FAF8F4', '#DCD5CA', 2);
      for(let i = 0; i < 3; i++) {
        const hx = w - 120 + i * 35;
        const icon = (i < this.lives) ? '❤️' : '🤍';
        MH.Renderer.drawIcon(ctx, icon, hx, 37, 24);
      }
      
      // Lazerler
      for (let l of this.lasers) {
        ctx.save();
        ctx.fillStyle = '#38BDF8';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      this.particles.render(ctx);
      
      // Meteor Çizimi
      if (this.meteor && this.waveBannerTime <= 0) {
        const mx = this.meteor.x * w;
        const my = this.meteor.y * h;
        const r = this.meteor.radius;
        
        ctx.save();
        ctx.translate(mx, my);
        
        // Meteor Arkası Alev İzi
        const tailGrad = ctx.createLinearGradient(0, -r, 0, -r - 40);
        tailGrad.addColorStop(0, this.meteor.isBoss ? 'rgba(236, 72, 153, 0.8)' : 'rgba(245, 158, 11, 0.8)');
        tailGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, -r * 0.3);
        ctx.lineTo(0, -r - 45);
        ctx.lineTo(r * 0.7, -r * 0.3);
        ctx.closePath();
        ctx.fill();
        
        const glowCol = this.meteor.isBoss ? '#F43F5E' : '#F59E0B';
        MH.Renderer.glow(ctx, 0, 0, r + 20, glowCol, 0.6);
        
        const grad = ctx.createRadialGradient(-10, -10, 5, 0, 0, r);
        if (this.meteor.isBoss) {
          grad.addColorStop(0, '#FB7185');
          grad.addColorStop(0.7, '#E11D48');
          grad.addColorStop(1, '#9F1239');
        } else {
          grad.addColorStop(0, '#FDE047');
          grad.addColorStop(0.6, '#F97316');
          grad.addColorStop(1, '#C2410C');
        }
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Meteor Üstü Soru Metni (Kalın Konturlu)
        MH.Renderer.text(ctx, this.meteor.text, 0, 0, {
          color: '#FFFFFF',
          stroke: true,
          strokeColor: 'rgba(0, 0, 0, 0.9)',
          strokeWidth: 5,
          size: this.meteor.isBoss ? 32 : 28,
          bold: true
        });
        
        ctx.restore();
      }
      
      // Alttaki Kalkan Butonları (Beyaz 3D Oyuncak Kartlar)
      const margin = 16;
      const gap = 12;
      const totalGaps = gap * 3;
      const shieldW = (w - (margin * 2) - totalGaps) / 4;
      const shieldH = Math.min(85, Math.max(68, h * 0.12));
      const startY = h - shieldH - 24;
      const cardBorderColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
      
      for(let i = 0; i < 4; i++) {
        const s = this.shields[i];
        if (!s) continue;
        const sx = margin + i * (shieldW + gap);
        const sy = startY;
        
        ctx.save();
        ctx.translate(sx + shieldW/2, sy + shieldH/2);
        ctx.scale(s.scale, s.scale);
        
        let cardBg = '#FFFFFF';
        let numColor = '#1E1B4B';
        let borderBottomColor = cardBorderColors[i % 4];
        
        if (s.flashTime > 0) {
          cardBg = s.flashColor;
          numColor = '#FFFFFF';
          borderBottomColor = s.flashColor;
        }
        
        // 3D Gölge ve Kalın Alt Kenar (Oyuncak Tuş Hissi)
        MH.Renderer.roundedRect(ctx, -shieldW/2, -shieldH/2 + 6, shieldW, shieldH, 18, borderBottomColor);
        MH.Renderer.roundedRect(ctx, -shieldW/2, -shieldH/2, shieldW, shieldH, 18, cardBg, '#CBD5E1', 2);
        
        const valStr = s.value.toString();
        const shieldFontSize = valStr.length > 7 ? 19 : (valStr.length > 4 ? 23 : 30);
        
        MH.Renderer.text(ctx, valStr, 0, 0, {
          color: numColor,
          size: shieldFontSize,
          bold: true
        });
        
        ctx.restore();
      }
      
      // DALGA GEÇİŞ BANNERI (Neşeli ve Canlı Kart)
      if (this.waveBannerTime > 0) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, w, h);
        
        const bannerW = Math.min(w - 40, 480);
        MH.Renderer.roundedRect(ctx, w/2 - bannerW/2, h/2 - 60, bannerW, 110, 24, '#FFFFFF', '#818CF8', 4);
        MH.Renderer.text(ctx, this.waveBannerText, w/2, h/2 - 5, {
          color: this.isBossWave ? '#E11D48' : '#4338CA',
          size: 26,
          bold: true
        });
      }
      
      // ZAFER VEYA YENİLGİ EKRANI (Aydınlık & Çocuk Dostu Kartlar)
      if (this.gameWon) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 0, w, h);
        const winW = Math.min(w - 40, 500);
        MH.Renderer.roundedRect(ctx, w/2 - winW/2, h/2 - 100, winW, 180, 28, '#FFFFFF', '#10B981', 5);
        MH.Renderer.text(ctx, '🎉 GEZEGEN KURTULDU! 🌍✨', w/2, h/2 - 50, {color: '#059669', size: 30, bold: true});
        MH.Renderer.text(ctx, `Mükemmel Savunma! Puan: ${this.score}`, w/2, h/2 + 10, {color: '#1E1B4B', size: 24, bold: true});
      } else if (this.gameOver) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 0, w, h);
        const overW = Math.min(w - 40, 460);
        MH.Renderer.roundedRect(ctx, w/2 - overW/2, h/2 - 100, overW, 180, 28, '#FFFFFF', '#EF4444', 5);
        MH.Renderer.text(ctx, 'Gezegen Savunması Bitti!', w/2, h/2 - 50, {color: '#DC2626', size: 28, bold: true});
        MH.Renderer.text(ctx, `Toplam Puan: ${this.score}`, w/2, h/2 + 10, {color: '#1E1B4B', size: 24, bold: true});
      }
      
      ctx.restore();
    }
    
    endGame() {
      this.stop();
      let stars = 1;
      if (this.gameWon) stars = 3;
      else if (this.score >= 100) stars = 2;
      
      this.onGameEnd({
        score: this.score,
        stars: stars,
        correct: this.correct,
        wrong: this.wrong,
        mode: 'meteor'
      });
    }
  }
  
  MH.MeteorMode = MeteorMode;
})();
