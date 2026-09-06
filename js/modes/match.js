(function() {
  'use strict';
  window.MH = window.MH || {};
  
  const U = MH.Utils;
  
  class MatchMode {
    constructor(canvas, onGameEnd) {
      this.canvas = canvas;
      this.onGameEnd = onGameEnd;
      
      this.audio = new MH.Audio();
      this.particles = new MH.Particles();
      this.input = new MH.Input(canvas);
      this.loop = new MH.GameLoop(canvas);
      
      this.resetState();
    }
    
    resetState() {
      this.score = 0;
      this.currentRound = 1;
      this.totalRounds = 3;
      this.combo = 0;
      this.correct = 0;
      this.wrong = 0;
      
      this.target = 0;
      this.cards = [];
      this.totalCorrect = 0;
      this.foundCorrect = 0;
      
      this.timeLeft = 60.0;
      this.roundIntroTime = 0;
      this.roundIntroText = '';
      
      this.gameOver = false;
      this.gameWon = false;
      this.endTimer = 0;
      this.time = 0;
    }
    
    start() {
      this.resetState();
      this.startRound(1);
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
    
    startRound(roundNum) {
      this.currentRound = roundNum;
      this.foundCorrect = 0;
      this.timeLeft += 15; // Tur geçince ekstra süre!
      
      // Seviye hedefleri
      const targetsByRound = [
        [12, 15, 16, 18, 20],      // Tur 1
        [24, 25, 30, 32, 36],      // Tur 2
        [40, 42, 45, 48, 50]       // Tur 3
      ];
      const list = targetsByRound[roundNum - 1] || targetsByRound[0];
      this.target = list[U.randomInt(0, list.length - 1)];
      
      this.totalCorrect = 3 + roundNum; // Tur 1: 4 adet, Tur 2: 5 adet, Tur 3: 6 adet doğru
      
      this.roundIntroText = `🌟 TUR ${roundNum}: HEDEF ${this.target}!`;
      this.roundIntroTime = 1.8;
      this.audio.play('levelup');
      
      // 12 adet büyük, modern Arcade Kartı (3 sütun x 4 satır)
      const totalCards = 12;
      const usedExpressions = new Set();
      const expressions = [];
      
      // Doğru kartlar
      for (let i = 0; i < this.totalCorrect; i++) {
        let expr = this.generateCorrectExpr(i);
        while (usedExpressions.has(expr)) {
          expr = this.generateCorrectExpr(i + 5);
        }
        usedExpressions.add(expr);
        expressions.push({ text: expr, isCorrect: true });
      }
      
      // Yanlış kartlar
      while (expressions.length < totalCards) {
        const diff = (Math.random() < 0.5 ? 1 : -1) * U.randomInt(1, 4);
        const wrongVal = Math.max(1, this.target + diff);
        let expr = '';
        
        if (Math.random() < 0.5) {
          const a = U.randomInt(1, wrongVal - 1 || 1);
          expr = `${a} + ${wrongVal - a}`;
        } else {
          const b = U.randomInt(2, 10);
          expr = `${wrongVal + b} - ${b}`;
        }
        
        if (!usedExpressions.has(expr)) {
          usedExpressions.add(expr);
          expressions.push({ text: expr, isCorrect: false });
        }
      }
      
      const shuffled = U.shuffle(expressions);
      this.cards = [];
      
      for (let i = 0; i < totalCards; i++) {
        this.cards.push({
          id: i,
          text: shuffled[i].text,
          isCorrect: shuffled[i].isCorrect,
          state: 'idle', // 'idle', 'found', 'wrong'
          scale: 0.1, // Giriş animasyonu (pop-in)
          targetScale: 1.0,
          animDelay: i * 0.05,
          flashTime: 0
        });
      }
    }
    
    generateCorrectExpr(seed) {
      if (seed % 3 === 0) {
        // Toplama
        const a = U.randomInt(2, this.target - 2);
        return `${a} + ${this.target - a}`;
      } else if (seed % 3 === 1) {
        // Çıkarma
        const sub = U.randomInt(3, 15);
        return `${this.target + sub} - ${sub}`;
      } else {
        // Çarpma veya Bölme
        const factors = [];
        for (let i = 2; i <= 10; i++) {
          if (this.target % i === 0 && (this.target / i) <= 10) {
            factors.push([i, this.target / i]);
          }
        }
        if (factors.length > 0) {
          const f = factors[U.randomInt(0, factors.length - 1)];
          return `${f[0]} × ${f[1]}`;
        } else {
          const d = U.randomInt(2, 3);
          return `${this.target * d} ÷ ${d}`;
        }
      }
    }
    
    handleTap(x, y) {
      if (this.gameOver || this.gameWon || this.roundIntroTime > 0) return;
      
      const w = this.loop.width;
      const h = this.loop.height;
      
      // 3 Sütun x 4 Satır (Çok daha büyük ve tablet dostu!)
      const gridW = Math.min(540, w - 32);
      const gridH = Math.min(400, h - 230);
      const startX = (w - gridW) / 2;
      const startY = 175;
      
      const cols = 3;
      const rows = 4;
      const gap = 12;
      const cardW = (gridW - (gap * (cols - 1))) / cols;
      const cardH = (gridH - (gap * (rows - 1))) / rows;
      
      for (let i = 0; i < this.cards.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const cx = startX + col * (cardW + gap);
        const cy = startY + row * (cardH + gap);
        
        if (U.pointInRect(x, y, cx, cy, cardW, cardH)) {
          this.checkCard(this.cards[i], cx + cardW/2, cy + cardH/2);
          break;
        }
      }
    }
    
    checkCard(card, cx, cy) {
      if (card.state === 'found') return;
      
      if (card.isCorrect) {
        // DOĞRU KART!
        card.state = 'found';
        card.scale = 1.25;
        this.correct++;
        this.foundCorrect++;
        this.combo++;
        this.score += 30 * Math.min(this.combo, 4);
        
        this.audio.play('correct');
        this.audio.play('pop');
        this.particles.sparkle(cx, cy, '#10B981');
        this.particles.confetti(cx, cy, 25);
        
        // Tur tamamlandı mı?
        if (this.foundCorrect >= this.totalCorrect) {
          if (this.currentRound < this.totalRounds) {
            setTimeout(() => {
              this.startRound(this.currentRound + 1);
            }, 600);
          } else {
            // ZAFER!
            this.gameWon = true;
            this.score += 150;
            this.audio.play('levelup');
            this.particles.confetti(this.loop.width / 2, this.loop.height / 2, 80);
          }
        }
      } else {
        // YANLIŞ KART
        this.wrong++;
        this.combo = 0;
        card.state = 'wrong';
        card.flashTime = 0.4;
        card.scale = 0.85;
        this.audio.play('wrong');
        this.particles.explode(cx, cy, '#EF4444', 15);
      }
    }
    
    update(dt) {
      this.time += dt;
      
      if (this.roundIntroTime > 0) this.roundIntroTime -= dt;
      
      if (!this.gameOver && !this.gameWon && this.roundIntroTime <= 0) {
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
      
      // Kart animasyonları (Pop-in & Pulse)
      for (let c of this.cards) {
        if (c.animDelay > 0) {
          c.animDelay -= dt;
        } else {
          c.scale = U.lerp(c.scale, c.state === 'found' ? 1.05 : 1.0, dt * 10);
        }
        
        if (c.flashTime > 0) {
          c.flashTime -= dt;
          if (c.flashTime <= 0 && c.state === 'wrong') {
            c.state = 'idle';
          }
        }
      }
      
      this.particles.update(dt);
    }
    
    render(ctx, w, h) {
      // Aydınlık ve Ferah Zümrüt Hazine Arka Planı
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#F0F9FF');
      bgGrad.addColorStop(0.6, '#E0F2FE');
      bgGrad.addColorStop(1, '#BAE6FD');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
      
      // Sol Üst: Sıcak 3D Skor Kartı (x: 74)
      MH.Renderer.roundedRect(ctx, 74, 14, 135, 46, 20, '#FAF8F4', '#DCD5CA', 2);
      MH.Renderer.text(ctx, `⭐ ${this.score}`, 141, 37, {color: '#2D3142', size: 21, bold: true});
      
      // Üst Orta: Sıcak 3D Tur Göstergesi
      const roundW = 160;
      MH.Renderer.roundedRect(ctx, w/2 - roundW/2, 14, roundW, 46, 20, '#FAF8F4', '#7DD3FC', 2);
      MH.Renderer.text(ctx, `💎 Tur ${this.currentRound} / ${this.totalRounds}`, w/2, 37, {color: '#0369A1', size: 19, bold: true});
      
      // Sağ Üst: Sıcak 3D Süre Kartı
      const timerColor = this.timeLeft < 15 ? '#E11D48' : '#059669';
      MH.Renderer.roundedRect(ctx, w - 160, 14, 144, 46, 20, '#FAF8F4', '#DCD5CA', 2);
      MH.Renderer.text(ctx, `⏱️ ${Math.ceil(this.timeLeft)} sn`, w - 88, 37, {color: timerColor, size: 21, bold: true});
      
      // YÜKSEK KONTRASTLI VE OKUNAKLI HEDEF KARTI
      const panelW = Math.min(540, w - 32);
      const panelH = 88;
      const panelX = (w - panelW) / 2;
      const panelY = 70;
      
      MH.Renderer.roundedRect(ctx, panelX, panelY + 4, panelW, panelH, 24, '#DCD5CA');
      MH.Renderer.roundedRect(ctx, panelX, panelY, panelW, panelH, 24, '#FAF8F4', '#0284C7', 3);
      
      MH.Renderer.text(ctx, `🎯 HEDEF SAYI: ${this.target}`, w / 2, panelY + 28, {
        color: '#0C4A6E',
        size: 28,
        bold: true
      });
      
      // İlerleme Rozetleri (Elmaslar 💎)
      let diamondText = '';
      for (let i = 0; i < this.totalCorrect; i++) {
        diamondText += (i < this.foundCorrect) ? '💎 ' : '⚪ ';
      }
      MH.Renderer.text(ctx, `${diamondText} (${this.foundCorrect} / ${this.totalCorrect} Bulundu)`, w / 2, panelY + 60, {
        color: '#545871',
        size: 17,
        bold: true
      });
      
      this.particles.render(ctx);
      
      // 3 Sütun x 4 Satır Bembeyaz 3D Kartlar
      const gridW = Math.min(540, w - 32);
      const gridH = Math.min(400, h - 230);
      const startX = (w - gridW) / 2;
      const startY = 175;
      
      const cols = 3;
      const rows = 4;
      const gap = 12;
      const cardW = (gridW - (gap * (cols - 1))) / cols;
      const cardH = (gridH - (gap * (rows - 1))) / rows;
      
      for (let i = 0; i < this.cards.length; i++) {
        const c = this.cards[i];
        if (c.scale <= 0.05) continue;
        
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const cx = startX + col * (cardW + gap) + cardW/2;
        const cy = startY + row * (cardH + gap) + cardH/2;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(c.scale, c.scale);
        
        let cardBg = '#FFFFFF';
        let borderCol = '#BAE6FD';
        let shadowCol = '#7DD3FC';
        let textCol = '#0F172A';
        
        if (c.state === 'found') {
          cardBg = '#10B981';
          borderCol = '#059669';
          shadowCol = '#047857';
          textCol = '#FFFFFF';
          MH.Renderer.glow(ctx, 0, 0, cardW * 0.6, '#10B981', 0.5);
        } else if (c.state === 'wrong') {
          cardBg = '#FEE2E2';
          borderCol = '#EF4444';
          shadowCol = '#DC2626';
          textCol = '#991B1B';
        }
        
        // 3D Kart Tabanı
        MH.Renderer.roundedRect(ctx, -cardW/2, -cardH/2 + 5, cardW, cardH, 18, shadowCol);
        
        // Kart Gövdesi
        MH.Renderer.roundedRect(ctx, -cardW/2, -cardH/2, cardW, cardH, 18, cardBg, borderCol, 2);
        
        // Kart Metni
        const label = (c.state === 'found') ? `✅ ${c.text}` : c.text;
        MH.Renderer.text(ctx, label, 0, 0, {
          color: textCol,
          size: Math.min(26, Math.max(20, cardW * 0.19)),
          bold: true
        });
        
        ctx.restore();
      }
      
      // Tur Başlama Bannerı
      if (this.roundIntroTime > 0) {
        ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, this.roundIntroText, w/2, h/2, {
          color: '#FDE047',
          size: 34,
          bold: true
        });
      }
      
      // Zafer veya Yenilgi
      if (this.gameWon) {
        ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, '🎉 TEBRİKLER! TÜM HEDEFLERİ BULDUN!', w/2, h/2 - 40, {color: '#34D399', size: 34, bold: true});
        MH.Renderer.text(ctx, `Eşleştirme Ustası! Puan: ${this.score}`, w/2, h/2 + 20, {color: '#FFFFFF', size: 28, bold: true});
      } else if (this.gameOver) {
        ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, 'Süre Bitti!', w/2, h/2 - 40, {color: '#EF4444', size: 48, bold: true});
        MH.Renderer.text(ctx, `Toplam Puan: ${this.score}`, w/2, h/2 + 20, {color: '#FFFFFF', size: 30, bold: true});
      }
    }
    
    endGame() {
      this.stop();
      let stars = 1;
      if (this.gameWon) stars = 3;
      else if (this.score >= 140) stars = 2;
      
      this.onGameEnd({
        score: this.score,
        stars: stars,
        correct: this.correct,
        wrong: this.wrong,
        mode: 'match'
      });
    }
  }
  
  MH.MatchMode = MatchMode;
})();
