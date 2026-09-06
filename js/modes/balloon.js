(function() {
  'use strict';
  window.MH = window.MH || {};
  
  const U = MH.Utils;
  
  class BalloonMode {
    constructor(canvas, onGameEnd) {
      this.canvas = canvas;
      this.onGameEnd = onGameEnd;
      
      this.audio = new MH.Audio();
      this.particles = new MH.Particles();
      this.input = new MH.Input(canvas);
      this.loop = new MH.GameLoop(canvas);
      
      this.palette = [
        '#EF4444', '#3B82F6', '#10B981', '#F59E0B', 
        '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
      ];
      
      this.resetState();
    }
    
    resetState() {
      this.score = 0;
      this.combo = 0;
      this.correct = 0;
      this.wrong = 0;
      
      // Tur ve Seviye Sistemi
      this.currentLevel = 1;
      this.totalLevels = 3;
      this.matchesInLevel = 0;
      this.matchesRequired = 3; // Her seviye için 3 doğru eşleşme
      this.levelBannerTime = 0;
      this.levelBannerText = '';
      
      this.balloons = [];
      this.specialBalloon = null; // 💣 Bomba veya ❄️ Kar Tanesi
      this.targetSum = 0;
      this.selectedBalloon = null;
      
      this.timeLeft = 60.0;
      this.freezeTimer = 0; // Süre donması
      this.bombs = 1; // Her seviye 1 bomba jokeri
      this.freezes = 1; // Her seviye 1 buz jokeri
      
      this.gameOver = false;
      this.gameWon = false;
      this.endTimer = 0;
      this.time = 0;
    }
    
    start() {
      this.resetState();
      this.showLevelIntro(1);
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
    
    showLevelIntro(lvl) {
      this.currentLevel = lvl;
      this.matchesInLevel = 0;
      this.timeLeft += 20; // Seviye atlayınca ekstra 20 saniye hediye!
      
      this.levelBannerText = `🎉 SEVİYE ${lvl} BAŞLADI! (+20 sn Süre)`;
      this.levelBannerTime = 2.0;
      this.audio.play('levelup');
      
      setTimeout(() => {
        if (!this.gameOver && !this.gameWon) {
          this.generateTargetAndBalloons();
        }
      }, 1600);
    }
    
    generateTargetAndBalloons() {
      // Seviyeye göre hedef aralığı
      if (this.currentLevel === 1) this.targetSum = U.randomInt(12, 22);
      else if (this.currentLevel === 2) this.targetSum = U.randomInt(20, 35);
      else this.targetSum = U.randomInt(30, 48);
      
      this.selectedBalloon = null;
      this.balloons = [];
      this.specialBalloon = null;
      
      const w = this.loop.width || window.innerWidth;
      const h = this.loop.height || window.innerHeight;
      
      // En az 2 çift doğru cevap oluştur
      const pair1_a = U.randomInt(2, this.targetSum - 2);
      const pair1_b = this.targetSum - pair1_a;
      
      const pair2_a = U.randomInt(3, this.targetSum - 3);
      const pair2_b = this.targetSum - pair2_a;
      
      const values = [pair1_a, pair1_b, pair2_a, pair2_b];
      
      // Kalanları rastgele tamamla
      while (values.length < 8) {
        const d = U.randomInt(1, this.targetSum + 5);
        if (d !== this.targetSum) values.push(d);
      }
      
      const shuffled = U.shuffle(values);
      
      const cols = 4;
      const rows = 2;
      const colWidth = (w - 80) / cols;
      const rowHeight = (h - 260) / rows;
      
      for(let i = 0; i < shuffled.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const baseX = 40 + col * colWidth + colWidth / 2 + U.randomFloat(-12, 12);
        const baseY = 180 + row * rowHeight + rowHeight / 2 + U.randomFloat(-12, 12);
        
        this.balloons.push({
          id: i,
          value: shuffled[i],
          x: baseX,
          y: baseY,
          baseX: baseX,
          baseY: baseY,
          radius: Math.min(48, Math.max(38, w * 0.045)),
          color: this.palette[i % this.palette.length],
          floatPhase: Math.random() * Math.PI * 2,
          floatSpeed: U.randomFloat(1.2, 2.2),
          scale: 1,
          popping: false
        });
      }
      
      // %40 ihtimalle Sihirli Balon (Bomba 💣 veya Buz ❄️) ekle!
      if (Math.random() < 0.45 && this.currentLevel >= 2) {
        const isBomb = Math.random() < 0.5;
        this.specialBalloon = {
          type: isBomb ? 'bomb' : 'freeze',
          icon: isBomb ? '💣' : '❄️',
          x: w / 2,
          y: h - 110,
          baseX: w / 2,
          baseY: h - 110,
          radius: 36,
          floatPhase: 0,
          scale: 1
        };
      }
    }
    
    handleTap(x, y) {
      if (this.gameOver || this.gameWon || this.levelBannerTime > 0) return;
      
      const w = this.loop.width;
      const h = this.loop.height;
      const btnH = 50;
      const btnY = h - btnH - 14;
      const btnW = Math.min(220, (w - 48) / 2);
      
      // Bomba Butonu Tıklandı mı?
      const bombX = w / 2 - btnW - 10;
      if (this.bombs > 0 && U.pointInRect(x, y, bombX, btnY, btnW, btnH)) {
        this.bombs--;
        this.useBomb();
        return;
      }
      
      // Buz Butonu Tıklandı mı?
      const freezeX = w / 2 + 10;
      if (this.freezes > 0 && U.pointInRect(x, y, freezeX, btnY, btnW, btnH)) {
        this.freezes--;
        this.useFreeze();
        return;
      }
      
      // Normal balonlara dokunma
      let tapped = null;
      for (let b of this.balloons) {
        if (!b.popping && U.pointInCircle(x, y, b.x, b.y, b.radius * 1.2)) {
          tapped = b;
          break;
        }
      }
      
      if (!tapped) return;
      
      if (!this.selectedBalloon) {
        this.selectedBalloon = tapped;
        this.audio.play('pop');
        return;
      }
      
      if (this.selectedBalloon.id === tapped.id) {
        this.selectedBalloon = null;
        this.audio.play('click');
        return;
      }
      
      const sum = this.selectedBalloon.value + tapped.value;
      if (sum === this.targetSum) {
        // DOĞRU ÇİFT!
        this.correct++;
        this.combo++;
        this.matchesInLevel++;
        this.score += 25 * Math.min(this.combo, 4);
        this.audio.play('correct');
        this.audio.play('explosion');
        
        const b1 = this.selectedBalloon;
        const b2 = tapped;
        b1.popping = true;
        b2.popping = true;
        
        this.particles.confetti(b1.x, b1.y, 25);
        this.particles.confetti(b2.x, b2.y, 25);
        this.particles.sparkle((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#FBBF24');
        
        this.selectedBalloon = null;
        
        // Seviye bitti mi?
        if (this.matchesInLevel >= this.matchesRequired) {
          if (this.currentLevel < this.totalLevels) {
            setTimeout(() => {
              this.showLevelIntro(this.currentLevel + 1);
            }, 500);
          } else {
            // ZAFER!
            this.gameWon = true;
            this.score += 150;
            this.audio.play('levelup');
            this.particles.confetti(this.loop.width / 2, this.loop.height / 2, 80);
          }
        } else {
          setTimeout(() => {
            if (!this.gameOver && !this.gameWon) this.generateTargetAndBalloons();
          }, 450);
        }
        
      } else {
        // YANLIŞ ÇİFT
        this.wrong++;
        this.combo = 0;
        this.audio.play('wrong');
        this.selectedBalloon = null;
      }
    }
    
    useBomb() {
      this.audio.play('explosion');
      const w = this.loop.width;
      const h = this.loop.height;
      this.particles.explode(w / 2, h / 2, '#F97316', 50);
      
      // Doğru ikiliyi bul ve patlat
      for (let i = 0; i < this.balloons.length; i++) {
        for (let j = i + 1; j < this.balloons.length; j++) {
          if (this.balloons[i].value + this.balloons[j].value === this.targetSum) {
            this.balloons[i].popping = true;
            this.balloons[j].popping = true;
            this.particles.confetti(this.balloons[i].x, this.balloons[i].y, 30);
            this.particles.confetti(this.balloons[j].x, this.balloons[j].y, 30);
            this.correct++;
            this.matchesInLevel++;
            this.score += 30;
            this.audio.play('levelup');
            
            if (this.matchesInLevel >= this.matchesRequired) {
              if (this.currentLevel < this.totalLevels) {
                setTimeout(() => this.showLevelIntro(this.currentLevel + 1), 500);
              } else {
                this.gameWon = true;
              }
            } else {
              setTimeout(() => this.generateTargetAndBalloons(), 500);
            }
            return;
          }
        }
      }
    }
    
    useFreeze() {
      this.freezeTimer = 6.0;
      this.audio.play('swipe');
      const w = this.loop.width;
      const h = this.loop.height;
      this.particles.sparkle(w / 2, h / 2, '#00D2FF');
    }
    
    update(dt) {
      this.time += dt;
      
      if (this.levelBannerTime > 0) this.levelBannerTime -= dt;
      
      if (this.freezeTimer > 0) {
        this.freezeTimer -= dt;
      } else if (!this.gameOver && !this.gameWon && this.levelBannerTime <= 0) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.gameOver = true;
          this.audio.play('gameOver');
        }
      }
      
      if (this.gameOver || this.gameWon) {
        this.endTimer += dt;
        if (this.endTimer >= 2.2) {
          this.endGame();
        }
        this.particles.update(dt);
        return;
      }
      
      // Balonların sakin salınımı
      for (let b of this.balloons) {
        if (b.popping) {
          b.scale = Math.max(0, b.scale - dt * 5);
        } else {
          b.y = b.baseY + Math.sin(this.time * b.floatSpeed + b.floatPhase) * 12;
          b.x = b.baseX + Math.cos(this.time * (b.floatSpeed * 0.7) + b.floatPhase) * 8;
        }
      }
      
      this.particles.update(dt);
    }
    
    render(ctx, w, h) {
      // Masmavi Açık Gökyüzü ve Puf Bulutlar Arka Planı
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, this.freezeTimer > 0 ? '#BAE6FD' : '#E0F2FE');
      skyGrad.addColorStop(1, this.freezeTimer > 0 ? '#7DD3FC' : '#BAE6FD');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);
      
      // Sol Üst: Sıcak 3D Skor Kartı (x: 74)
      MH.Renderer.roundedRect(ctx, 74, 14, 135, 46, 20, '#FAF8F4', '#DCD5CA', 2);
      MH.Renderer.text(ctx, `⭐ ${this.score}`, 141, 37, {color: '#2D3142', size: 21, bold: true});
      
      // Üst Orta: Sıcak 3D Seviye Kartı
      const lvlW = 170;
      MH.Renderer.roundedRect(ctx, w/2 - lvlW/2, 14, lvlW, 46, 20, '#FAF8F4', '#F472B6', 2);
      MH.Renderer.text(ctx, `🎈 Seviye ${this.currentLevel} / ${this.totalLevels}`, w/2, 37, {color: '#9D174D', size: 19, bold: true});
      
      // Sağ Üst: Sıcak 3D Süre Kartı
      const isFrozen = this.freezeTimer > 0;
      const timerColor = isFrozen ? '#0284C7' : (this.timeLeft < 15 ? '#E11D48' : '#059669');
      const timerText = isFrozen ? `❄️ DONDU (${Math.ceil(this.freezeTimer)}s)` : `⏱️ ${Math.ceil(this.timeLeft)} sn`;
      
      MH.Renderer.roundedRect(ctx, w - 165, 14, 150, 46, 20, '#FAF8F4', '#DCD5CA', 2);
      MH.Renderer.text(ctx, timerText, w - 90, 37, {color: timerColor, size: isFrozen ? 17 : 21, bold: true});
      
      // YÜKSEK KONTRASTLI, KUSURSUZ OKUNABİLİR HEDEF KARTI
      const targetW = Math.min(540, w - 32);
      const targetH = 88;
      const targetX = (w - targetW) / 2;
      const targetY = 70;
      
      MH.Renderer.roundedRect(ctx, targetX, targetY + 4, targetW, targetH, 24, '#DCD5CA');
      MH.Renderer.roundedRect(ctx, targetX, targetY, targetW, targetH, 24, '#FAF8F4', '#D946EF', 3);
      
      if (!this.selectedBalloon) {
        MH.Renderer.text(ctx, `🎯 HEDEF TOPLAM: ${this.targetSum}`, w / 2, targetY + 28, {
          color: '#1E1B4B',
          size: 27,
          bold: true
        });
        MH.Renderer.text(ctx, `İlerleme: ${this.matchesInLevel} / ${this.matchesRequired} doğru çift eşleşti`, w / 2, targetY + 58, {
          color: '#545871',
          size: 17,
          bold: true
        });
      } else {
        MH.Renderer.text(ctx, `Seçilen: ${this.selectedBalloon.value}  ➕  [ ? ]  =  ${this.targetSum}`, w / 2, targetY + 28, {
          color: '#0284C7',
          size: 27,
          bold: true
        });
        MH.Renderer.text(ctx, `Toplamı ${this.targetSum} yapan ikinci balona dokun!`, w / 2, targetY + 58, {
          color: '#9D174D',
          size: 17,
          bold: true
        });
      }
      
      this.particles.render(ctx);
      
      // Balonları Çiz
      for (let b of this.balloons) {
        if (b.scale <= 0.01) continue;
        
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.scale(b.scale, b.scale);
        
        const isSelected = this.selectedBalloon && (this.selectedBalloon.id === b.id);
        
        if (isSelected) {
          MH.Renderer.glow(ctx, 0, 0, b.radius + 20, '#FBBF24', 0.8);
        }
        
        // İp
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, b.radius + 4);
        ctx.quadraticCurveTo(6, b.radius + 18, 0, b.radius + 28);
        ctx.stroke();
        
        // Balon
        const grad = ctx.createRadialGradient(-b.radius * 0.3, -b.radius * 0.3, 4, 0, 0, b.radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, b.color);
        grad.addColorStop(1, b.color);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        
        if (isSelected) {
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        
        // Düğüm
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(-5, b.radius);
        ctx.lineTo(5, b.radius);
        ctx.lineTo(0, b.radius + 7);
        ctx.closePath();
        ctx.fill();
        
        // Sayı Metni (Kalın Konturlu ve Büyük!)
        MH.Renderer.text(ctx, b.value.toString(), 0, 2, {
          color: '#FFFFFF',
          stroke: true,
          strokeColor: 'rgba(0, 0, 0, 0.65)',
          strokeWidth: 4,
          size: 30,
          bold: true
        });
        
        ctx.restore();
      }
      
      // Alttaki 2 Net Joker Butonu (Yüksek Kontrastlı 3D Butonlar)
      const btnH = 50;
      const btnY = h - btnH - 14;
      const btnW = Math.min(220, (w - 48) / 2);
      
      // Bomba Butonu
      const bombX = w / 2 - btnW - 10;
      const bombActive = this.bombs > 0;
      MH.Renderer.roundedRect(ctx, bombX, btnY + 4, btnW, btnH, 16, '#EA580C');
      MH.Renderer.roundedRect(ctx, bombX, btnY, btnW, btnH, 16, '#FAF8F4', '#F97316', 2.5);
      MH.Renderer.text(ctx, `💣 Çifti Patlat (${this.bombs})`, bombX + btnW / 2, btnY + btnH / 2, {
        color: bombActive ? '#C2410C' : '#94A3B8',
        size: 17,
        bold: true
      });
      
      // Buz Butonu
      const freezeX = w / 2 + 10;
      const freezeActive = this.freezes > 0;
      MH.Renderer.roundedRect(ctx, freezeX, btnY + 4, btnW, btnH, 16, '#0284C7');
      MH.Renderer.roundedRect(ctx, freezeX, btnY, btnW, btnH, 16, '#FAF8F4', '#06B6D4', 2.5);
      MH.Renderer.text(ctx, `❄️ Dondur (${this.freezes})`, freezeX + btnW / 2, btnY + btnH / 2, {
        color: freezeActive ? '#0369A1' : '#94A3B8',
        size: 17,
        bold: true
      });
      
      // Seviye Geçiş Bannerı (Aydınlık & Sevimli Kart)
      if (this.levelBannerTime > 0) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, w, h);
        const banW = Math.min(w - 40, 480);
        MH.Renderer.roundedRect(ctx, w/2 - banW/2, h/2 - 50, banW, 100, 24, '#FAF8F4', '#F472B6', 3.5);
        MH.Renderer.text(ctx, this.levelBannerText, w/2, h/2, {
          color: '#9D174D',
          size: 28,
          bold: true
        });
      }
      
      // Zafer veya Yenilgi
      if (this.gameWon) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, '🎉 TEBRİKLER! TÜM BALONLARI YAKALADIN!', w/2, h/2 - 40, {color: '#34D399', size: 34, bold: true});
        MH.Renderer.text(ctx, `Balon Ustası! Puan: ${this.score}`, w/2, h/2 + 20, {color: '#FFFFFF', size: 28, bold: true});
      } else if (this.gameOver) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, 'Süre Bitti!', w/2, h/2 - 40, {color: '#EF4444', size: 48, bold: true});
        MH.Renderer.text(ctx, `Toplam Skor: ${this.score}`, w/2, h/2 + 20, {color: '#FFFFFF', size: 30, bold: true});
      }
    }
    
    endGame() {
      this.stop();
      let stars = 1;
      if (this.gameWon) stars = 3;
      else if (this.score >= 120) stars = 2;
      
      this.onGameEnd({
        score: this.score,
        stars: stars,
        correct: this.correct,
        wrong: this.wrong,
        mode: 'balloon'
      });
    }
  }
  
  MH.BalloonMode = BalloonMode;
})();
