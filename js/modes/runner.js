(function() {
  'use strict';
  window.MH = window.MH || {};
  
  const U = MH.Utils;
  
  /**
   * Math Slicer (Sayı Dilimleyici)
   * Ekrandan fırlayan sayılardan doğru olanı parmağını kaydırarak dilimleme oyunu!
   */
  class RunnerMode {
    constructor(canvas, onGameEnd, qType = 'mixed') {
      this.canvas = canvas;
      this.onGameEnd = onGameEnd;
      this.qType = qType;
      
      this.audio = new MH.Audio();
      this.particles = new MH.Particles();
      this.input = new MH.Input(canvas);
      this.loop = new MH.GameLoop(canvas);
      
      this.colors = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];
      this.resetState();
    }
    
    resetState() {
      this.score = 0;
      this.lives = 3;
      this.combo = 0;
      this.correct = 0;
      this.wrong = 0;
      
      this.activeQuestion = null;
      this.fruits = [];
      this.slicedHalves = [];
      
      // Dilimleme kılıç izi (blade trail)
      this.bladePoints = [];
      this.isSwiping = false;
      
      this.spawnTimer = 0;
      this.questionSolved = false;
      // Net Seviye Hedefi (7 Doğru Dilimleme Sonrası Zafer!)
      this.targetSlices = 7;
      this.currentSlices = 0;
      
      this.gameOver = false;
      this.gameWon = false;
      this.gameOverTimer = 0;
      this.shakeTime = 0;
      this.time = 0;
    }
    
    start() {
      this.resetState();
      this.generateQuestion();
      
      // Sürükleme / Dilimleme Girdileri
      this.input.onDragStart((x, y) => {
        this.isSwiping = true;
        this.bladePoints = [{x, y, age: 0}];
        this.checkSlice(x, y);
      });
      
      this.input.onDragMove((x, y) => {
        if (!this.isSwiping) return;
        this.bladePoints.push({x, y, age: 0});
        if (this.bladePoints.length > 8) this.bladePoints.shift();
        this.checkSlice(x, y);
      });
      
      this.input.onDragEnd(() => {
        this.isSwiping = false;
      });
      
      // Ekrana doğrudan dokunma (Tap) da dilimleme olarak sayılsın (küçük çocuklar için kolaylık!)
      this.input.onTap((x, y) => {
        this.checkSlice(x, y, 1.4);
      });
      
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
    
    generateQuestion() {
      this.questionSolved = false;
      this.fruits = [];
      this.activeQuestion = MH.Questions.generate(this.qType || 'mixed', U.randomInt(3, 6));
      
      const w = this.loop.width || window.innerWidth;
      const h = this.loop.height || window.innerHeight;
      
      // 3 veya 4 adet meyve hazırla
      const choices = this.activeQuestion.choices;
      const numFruits = choices.length;
      const spacing = (w - 160) / numFruits;
      
      for (let i = 0; i < numFruits; i++) {
        const startX = 80 + i * spacing + spacing / 2 + U.randomFloat(-20, 20);
        const startY = h + 20; // Ekranın altından başlar
        
        // Yukarı doğru fırlatma hızları: Çok sakin ve yavaş süzülsün
        const vx = U.randomFloat(-18, 18);
        const vy = -Math.sqrt(2 * 140 * (h * 0.68)); // Yavaşça yükselir
        
        const fruitIcons = ['🍉', '🍊', '🍎', '🍇', '🍓', '🥝'];
        
        this.fruits.push({
          id: i,
          val: choices[i],
          icon: fruitIcons[i % fruitIcons.length],
          isCorrect: (choices[i] === this.activeQuestion.answer),
          x: startX,
          y: startY,
          vx: vx,
          vy: vy,
          radius: Math.min(64, Math.max(52, w * 0.065)), // Daha büyük meyve!
          color: this.colors[i % this.colors.length],
          rotation: 0,
          rotSpeed: U.randomFloat(-0.8, 0.8),
          sliced: false
        });
      }
      
      this.audio.play('pop');
    }
    
    checkSlice(x, y, tolerance = 1.1) {
      if (this.gameOver || this.questionSolved) return;
      
      for (let f of this.fruits) {
        if (!f.sliced && U.distance(x, y, f.x, f.y) <= f.radius * tolerance) {
          f.sliced = true;
          
          if (f.isCorrect) {
            // DOĞRU SAYI DİLİMLENDİ!
            this.questionSolved = true;
            this.correct++;
            this.currentSlices++;
            this.combo++;
            this.score += 25 * Math.min(this.combo, 4);
            
            this.audio.play('swipe');
            this.audio.play('levelup');
            
            // Meyveyi ikiye bölme efekti
            this.createFruitHalves(f);
            this.particles.confetti(f.x, f.y, 40);
            this.particles.sparkle(f.x, f.y, '#FDE047');
            
            if (this.currentSlices >= this.targetSlices) {
              // ZAFER!
              this.gameWon = true;
              this.score += 100;
              this.audio.play('levelup');
              this.particles.confetti(this.loop.width / 2, this.loop.height / 2, 80);
            } else {
              this.nextQuestionDelay = 0.9;
            }
            break;
          } else {
            // YANLIŞ SAYI DİLİMLENDİ
            this.wrong++;
            this.combo = 0;
            this.shakeTime = 0.25;
            this.audio.play('wrong');
            this.particles.explode(f.x, f.y, '#EF4444', 20);
            
            // Yanlış olan parçalanıp yok olur
            this.createFruitHalves(f, true);
          }
        }
      }
    }
    
    createFruitHalves(f, isWrong = false) {
      // Sol ve sağ iki yarım parça
      this.slicedHalves.push({
        val: f.val,
        x: f.x - 10,
        y: f.y,
        vx: f.vx - 80,
        vy: f.vy * 0.5 - 60,
        radius: f.radius,
        color: isWrong ? '#6B7280' : f.color,
        rot: 0,
        rotSpeed: -5,
        side: 'left'
      });
      
      this.slicedHalves.push({
        val: f.val,
        x: f.x + 10,
        y: f.y,
        vx: f.vx + 80,
        vy: f.vy * 0.5 - 60,
        radius: f.radius,
        color: isWrong ? '#6B7280' : f.color,
        rot: 0,
        rotSpeed: 5,
        side: 'right'
      });
    }
    
    update(dt) {
      this.time += dt;
      
      if (this.shakeTime > 0) this.shakeTime -= dt;
      
      if (this.gameOver || this.gameWon) {
        this.gameOverTimer += dt;
        if (this.gameOverTimer >= 2.2) {
          this.endGame();
        }
        this.particles.update(dt);
        return;
      }
      
      // Kılıç izi söndürme
      for (let i = this.bladePoints.length - 1; i >= 0; i--) {
        this.bladePoints[i].age += dt;
        if (this.bladePoints[i].age > 0.15) {
          this.bladePoints.splice(i, 1);
        }
      }
      
      // Meyvelerin fizik hareketi: Çok tatlı, yavaş süzülen slow-motion yerçekimi!
      const gravity = 140;
      let allFell = true;
      
      for (let f of this.fruits) {
        if (!f.sliced) {
          f.vy += gravity * dt;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.rotation += f.rotSpeed * dt;
          
          if (f.y < this.loop.height + 60) {
            allFell = false;
          }
        }
      }
      
      // Kesilmiş meyve yarımlarının düşüşü
      for (let i = this.slicedHalves.length - 1; i >= 0; i--) {
        const h = this.slicedHalves[i];
        h.vy += gravity * 1.3 * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.rot += h.rotSpeed * dt;
        
        if (h.y > this.loop.height + 100) {
          this.slicedHalves.splice(i, 1);
        }
      }
      
      // Eğer doğru kesilmeden tüm meyveler ekrandan düştüyse yeni meyveler fırlat
      if (allFell && !this.questionSolved) {
        this.lives--;
        this.combo = 0;
        this.audio.play('wrong');
        this.shakeTime = 0.25;
        
        if (this.lives <= 0) {
          this.gameOver = true;
          this.audio.play('gameOver');
        } else {
          this.generateQuestion();
        }
      }
      
      // Yeni soruya geçiş
      if (this.questionSolved) {
        this.nextQuestionDelay -= dt;
        if (this.nextQuestionDelay <= 0) {
          this.generateQuestion();
        }
      }
      
      this.particles.update(dt);
    }
    
    render(ctx, w, h) {
      // Arka plan (Modern canlı dojo gradyanı)
      // Aydınlık ve Neşeli Meyve Ormanı / Piknik Arka Planı
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#ECFDF5');
      bgGrad.addColorStop(0.6, '#D1FAE5');
      bgGrad.addColorStop(1, '#A7F3D0');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
      
      ctx.save();
      if (this.shakeTime > 0) {
        const amt = this.shakeTime * 12;
        ctx.translate(U.randomFloat(-amt, amt), U.randomFloat(-amt, amt));
      }
      
      // Sol Üst: Sıcak 3D Skor Kartı (x: 74)
      MH.Renderer.roundedRect(ctx, 74, 14, 135, 46, 20, '#FAF8F4', '#DCD5CA', 2);
      MH.Renderer.text(ctx, `⭐ ${this.score}`, 141, 37, {color: '#2D3142', size: 21, bold: true});
      
      // Sağ Üst: Canlar (Sıcak Kapsül İçinde)
      MH.Renderer.roundedRect(ctx, w - 145, 14, 130, 46, 20, '#FAF8F4', '#DCD5CA', 2);
      for (let i = 0; i < 3; i++) {
        const hx = w - 120 + i * 35;
        const icon = (i < this.lives) ? '❤️' : '🤍';
        MH.Renderer.drawIcon(ctx, icon, hx, 37, 24);
      }
      
      // Üst Orta Bar: Sıcak 3D Hedef Dilimleme Sayacı
      const goalW = 180;
      MH.Renderer.roundedRect(ctx, w/2 - goalW/2, 14, goalW, 46, 20, '#FAF8F4', '#6EE7B7', 2);
      MH.Renderer.text(ctx, `🍉 Hedef: ${this.currentSlices} / ${this.targetSlices}`, w/2, 37, {color: '#047857', size: 19, bold: true});
      
      // YÜKSEK KONTRASTLI VE OKUNAKLI SORU PANELİ
      const qW = Math.min(520, w - 32);
      const qH = 88;
      const qX = (w - qW) / 2;
      const qY = 70;
      
      MH.Renderer.roundedRect(ctx, qX, qY + 4, qW, qH, 24, '#DCD5CA');
      MH.Renderer.roundedRect(ctx, qX, qY, qW, qH, 24, '#FAF8F4', '#059669', 3);
      
      if (this.activeQuestion) {
        const qTitle = this.activeQuestion.text.includes('?') ? this.activeQuestion.text : `${this.activeQuestion.text} = ?`;
        const qFontSize = qTitle.length > 25 ? 20 : (qTitle.length > 16 ? 24 : 28);
        
        MH.Renderer.text(ctx, `🍉 ${qTitle}`, w / 2, qY + 28, {
          color: '#064E3B',
          size: qFontSize,
          bold: true
        });
        MH.Renderer.text(ctx, 'Doğru sonucun olduğu meyveyi bir ninja gibi dilimle!', w / 2, qY + 60, {
          color: '#545871',
          size: 16,
          bold: true
        });
      }
      
      this.particles.render(ctx);
      
      // Meyveleri Çiz
      for (let f of this.fruits) {
        if (f.sliced) continue;
        
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        
        // Meyve / Balon 3D Şekil
        const grad = ctx.createRadialGradient(-f.radius * 0.3, -f.radius * 0.3, 4, 0, 0, f.radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, f.color);
        grad.addColorStop(1, f.color);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Meyve Emojisi & Kocaman, Net Konturlu Sayı/Kelime Metni
        const fruitStr = f.val.toString();
        const fruitFontSize = fruitStr.length > 6 ? 20 : (fruitStr.length > 3 ? 26 : 34);
        
        MH.Renderer.drawIcon(ctx, f.icon || '🍉', 0, -12, Math.round(f.radius * 0.95));
        MH.Renderer.text(ctx, fruitStr, 0, 18, {
          color: '#FFFFFF',
          stroke: true,
          strokeColor: 'rgba(0, 0, 0, 0.85)',
          strokeWidth: 5,
          size: fruitFontSize,
          bold: true
        });
        
        ctx.restore();
      }
      
      // Kesilmiş Meyve Yarımlarını Çiz
      for (let h of this.slicedHalves) {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rot);
        
        ctx.fillStyle = h.color;
        ctx.beginPath();
        if (h.side === 'left') {
          ctx.arc(0, 0, h.radius, Math.PI * 0.5, Math.PI * 1.5);
        } else {
          ctx.arc(0, 0, h.radius, -Math.PI * 0.5, Math.PI * 0.5);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
      
      // Kılıç Dilimleme İzi (Neon Işık Çizgisi)
      if (this.bladePoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#00D2FF';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00D2FF';
        ctx.shadowBlur = 12;
        
        ctx.beginPath();
        for (let i = 0; i < this.bladePoints.length; i++) {
          const pt = this.bladePoints[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.restore();
      }
      
      // Zafer veya Yenilgi Overlay
      if (this.gameWon) {
        ctx.fillStyle = 'rgba(15, 14, 42, 0.9)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, '🎉 TEBRİKLER! TÜM MEYVELER DİLİMLENDİ!', w / 2, h / 2 - 40, {color: '#34D399', size: 32, bold: true});
        MH.Renderer.text(ctx, `Meyve Ustası! Toplam Skor: ${this.score}`, w / 2, h / 2 + 20, {color: '#FFFFFF', size: 28, bold: true});
      } else if (this.gameOver) {
        ctx.fillStyle = 'rgba(15, 14, 42, 0.85)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, 'Oyun Bitti!', w / 2, h / 2 - 40, {color: '#EF4444', size: 48, bold: true});
        MH.Renderer.text(ctx, `Toplam Skor: ${this.score}`, w / 2, h / 2 + 20, {color: '#FFFFFF', size: 30, bold: true});
      }
      
      ctx.restore();
    }
    
    endGame() {
      this.stop();
      let stars = 1;
      if (this.gameWon) stars = 3;
      else if (this.score >= 80) stars = 2;
      
      this.onGameEnd({
        score: this.score,
        stars: stars,
        correct: this.correct,
        wrong: this.wrong,
        mode: 'runner'
      });
    }
  }
  
  MH.RunnerMode = RunnerMode;
})();
