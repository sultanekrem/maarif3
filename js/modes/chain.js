(function() {
  'use strict';
  window.MH = window.MH || {};
  
  const U = MH.Utils;
  
  class ChainMode {
    constructor(canvas, onGameEnd) {
      this.canvas = canvas;
      this.onGameEnd = onGameEnd;
      
      this.audio = new MH.Audio();
      this.particles = new MH.Particles();
      this.input = new MH.Input(canvas);
      this.loop = new MH.GameLoop(canvas);
      
      this.cols = 5;
      this.rows = 4;
      
      this.bubbleColors = [
        '#FF5C8A', '#8B5CF6', '#3A86FF', '#06D6A0', '#FFB703', '#FB5607'
      ];
      
      this.resetState();
    }
    
    resetState() {
      this.score = 0;
      this.combo = 0;
      this.correct = 0;
      this.wrong = 0;
      
      // Amaç: Sihirli Enerji Reaktörünü Doldurmak!
      this.currentLevel = 1;
      this.totalLevels = 3;
      this.energy = 0; // 0'dan 100'e kadar dolar
      this.supernovaTime = 0; // Süper güç patlama animasyonu
      
      this.target = 0;
      this.grid = [];
      this.chain = [];
      this.currentSum = 0;
      this.isDragging = false;
      
      this.floatingTexts = [];
      this.shakeTime = 0;
      
      this.timeLeft = 75.0;
      this.gameOver = false;
      this.gameWon = false;
      this.endTimer = 0;
      this.time = 0;
    }
    
    start() {
      this.resetState();
      this.generateNewTargetAndGrid();
      
      this.input.onDragStart((x, y) => this.handleDragStart(x, y));
      this.input.onDragMove((x, y) => this.handleDragMove(x, y));
      this.input.onDragEnd((x, y) => this.handleDragEnd(x, y));
      
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

    getLayout(w, h) {
      const isCompact = h < 620;
      const hudY = isCompact ? 8 : 14;
      const hudH = isCompact ? 40 : 46;
      
      const panelY = hudY + hudH + (isCompact ? 6 : 10);
      const panelH = isCompact ? 64 : 86;
      const panelW = Math.min(520, w - 24);
      const panelX = (w - panelW) / 2;
      
      const startY = panelY + panelH + (isCompact ? 10 : 16);
      const gridW = Math.min(isCompact ? 460 : 500, w - 24);
      const maxGridH = h - startY - (isCompact ? 12 : 20);
      const gridH = Math.min(maxGridH, isCompact ? 340 : 400);
      const startX = (w - gridW) / 2;
      
      const cellW = gridW / this.cols;
      const cellH = gridH / this.rows;
      const radius = Math.min(cellW, cellH) * 0.44;
      
      return { isCompact, hudY, hudH, panelX, panelY, panelW, panelH, startX, startY, gridW, gridH, cellW, cellH, radius };
    }
    
    generateNewTargetAndGrid() {
      if (this.currentLevel === 1) this.target = U.randomInt(12, 20);
      else if (this.currentLevel === 2) this.target = U.randomInt(18, 28);
      else this.target = U.randomInt(24, 36);
      
      this.chain = [];
      this.currentSum = 0;
      
      this.grid = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[c] = [];
        for (let r = 0; r < this.rows; r++) {
          this.grid[c][r] = {
            c: c,
            r: r,
            val: U.randomInt(1, 9),
            color: this.bubbleColors[(c + r) % this.bubbleColors.length],
            scale: 1,
            targetScale: 1,
            popping: false,
            animOffsetY: 0,
            fallVelocity: 0,
            id: Math.random()
          };
        }
      }
      
      this.ensureValidPaths();
    }
    
    ensureValidPaths() {
      const startC = U.randomInt(0, 2);
      const startR = U.randomInt(0, 2);
      
      const a = U.randomInt(2, Math.max(3, Math.floor(this.target / 3)));
      const b = U.randomInt(2, Math.max(3, Math.floor(this.target / 3)));
      const c = this.target - a - b;
      
      if (this.grid[startC] && this.grid[startC][startR]) {
        this.grid[startC][startR].val = Math.min(9, Math.max(1, a));
        if (this.grid[startC + 1]) this.grid[startC + 1][startR].val = Math.min(9, Math.max(1, b));
        if (this.grid[startC + 1] && this.grid[startC + 1][startR + 1]) {
          this.grid[startC + 1][startR + 1].val = Math.min(9, Math.max(1, c));
        }
      }
    }
    
    getBubbleAt(x, y) {
      const w = this.loop.width;
      const h = this.loop.height;
      const L = this.getLayout(w, h);
      
      for (let c = 0; c < this.cols; c++) {
        for (let r = 0; r < this.rows; r++) {
          const b = this.grid[c][r];
          if (!b || b.popping) continue;
          
          const bx = L.startX + c * L.cellW + L.cellW / 2;
          const by = L.startY + r * L.cellH + L.cellH / 2 + (b.animOffsetY || 0);
          
          if (U.distance(x, y, bx, by) <= L.radius * 1.25) {
            return { bubble: b, bx, by };
          }
        }
      }
      return null;
    }
    
    handleDragStart(x, y) {
      if (this.gameOver || this.gameWon || this.supernovaTime > 0) return;
      
      const item = this.getBubbleAt(x, y);
      if (item) {
        this.isDragging = true;
        this.chain = [item.bubble];
        this.currentSum = item.bubble.val;
        item.bubble.targetScale = 1.25;
        this.audio.play('click');
      }
    }
    
    handleDragMove(x, y) {
      if (!this.isDragging || this.gameOver || this.gameWon) return;
      
      const item = this.getBubbleAt(x, y);
      if (!item) return;
      
      const b = item.bubble;
      
      // Eğer zincirde önceki elemana geri dönerse geri al
      if (this.chain.length > 1 && this.chain[this.chain.length - 2] === b) {
        const removed = this.chain.pop();
        removed.targetScale = 1.0;
        this.currentSum -= removed.val;
        this.audio.play('swipe');
        return;
      }
      
      if (this.chain.includes(b)) return;
      
      const last = this.chain[this.chain.length - 1];
      const dc = Math.abs(b.c - last.c);
      const dr = Math.abs(b.r - last.r);
      
      if (dc <= 1 && dr <= 1 && (dc + dr > 0)) {
        this.chain.push(b);
        b.targetScale = 1.25;
        this.currentSum += b.val;
        this.audio.play('pop');
        
        if (this.currentSum === this.target) {
          this.audio.play('correct');
        }
      }
    }
    
    handleDragEnd() {
      if (!this.isDragging || this.gameOver || this.gameWon) return;
      this.isDragging = false;
      
      if (this.chain.length >= 2 && this.currentSum === this.target) {
        // BAŞARILI ZİNCİR!
        this.correct++;
        this.combo++;
        
        const bonus = this.chain.length * 15;
        const pts = (35 + bonus) * Math.min(this.combo, 4);
        this.score += pts;
        
        // Enerji Reaktörünü Doldur (%35 artış)
        this.energy += 35;
        this.audio.play('levelup');
        this.shakeTime = 0.22;
        
        const w = this.loop.width;
        const h = this.loop.height;
        const L = this.getLayout(w, h);
        
        let sumX = 0, sumY = 0;
        for (let b of this.chain) {
          b.popping = true;
          const bx = L.startX + b.c * L.cellW + L.cellW / 2;
          const by = L.startY + b.r * L.cellH + L.cellH / 2;
          sumX += bx;
          sumY += by;
          this.particles.confetti(bx, by, 25);
          this.particles.sparkle(bx, by, '#F59E0B');
        }
        
        const avgX = sumX / this.chain.length;
        const avgY = sumY / this.chain.length;
        
        // Yüzen Puan ve Neşeli Ödül Metni!
        this.floatingTexts.push({
          text: `+${pts} ⭐`,
          x: avgX,
          y: avgY - 12,
          vy: -60,
          life: 1.2,
          color: '#F59E0B',
          size: 32
        });
        
        if (this.combo >= 2) {
          const comboMsgs = ['HARİKA! ⚡', 'MUHTEŞEM! 🔥', 'SÜPER EYLÜL! 🚀', 'EFSANEVİ! ✨'];
          const msg = comboMsgs[Math.min(this.combo - 2, comboMsgs.length - 1)];
          this.floatingTexts.push({
            text: msg,
            x: avgX,
            y: avgY - 46,
            vy: -40,
            life: 1.4,
            color: '#059669',
            size: 26
          });
        }
        
        // Enerji %100 doldu mu? SÜPER GÜÇ PATLAMASI!
        if (this.energy >= 100) {
          this.triggerSupernova();
        } else {
          setTimeout(() => {
            this.popChainAndRefill();
          }, 240);
        }
        
      } else {
        if (this.chain.length > 1) {
          this.audio.play('wrong');
        }
        for (let b of this.chain) {
          b.targetScale = 1.0;
        }
      }
      
      this.chain = [];
      this.currentSum = 0;
    }
    
    triggerSupernova() {
      this.energy = 0;
      this.supernovaTime = 1.8;
      this.score += 100;
      this.timeLeft += 20; // Ekstra süre
      this.audio.play('explosion');
      this.audio.play('levelup');
      this.shakeTime = 0.4;
      
      const w = this.loop.width;
      const h = this.loop.height;
      this.particles.confetti(w/2, h/2, 80);
      this.particles.sparkle(w/2, h/2, '#FDE047');
      
      this.floatingTexts.push({
        text: '💥 SÜPER GÜÇ PATLAMASI! +100 ⭐',
        x: w / 2,
        y: h / 2,
        vy: -35,
        life: 1.8,
        color: '#D946EF',
        size: 32
      });
      
      setTimeout(() => {
        if (this.currentLevel < this.totalLevels) {
          this.currentLevel++;
          this.generateNewTargetAndGrid();
        } else {
          // ZAFER!
          this.gameWon = true;
          this.score += 150;
        }
      }, 1600);
    }
    
    popChainAndRefill() {
      // SÜTUN SÜTUN YERÇEKİMLİ KAYMA (Cascade Gravity Drop)
      for (let c = 0; c < this.cols; c++) {
        const surviving = [];
        for (let r = this.rows - 1; r >= 0; r--) {
          const b = this.grid[c][r];
          if (b && !b.popping) {
            surviving.push(b);
          }
        }
        
        const emptyCount = this.rows - surviving.length;
        if (emptyCount === 0) continue; // Patlayan yoksa geç
        
        const newCol = [];
        
        // Hayatta kalanları aşağıya kaydır
        let survIdx = 0;
        for (let r = this.rows - 1; r >= emptyCount; r--) {
          const b = surviving[survIdx++];
          const oldR = b.r;
          b.r = r;
          b.c = c;
          if (oldR !== r) {
            b.animOffsetY = (oldR - r) * 70;
            b.fallVelocity = 0;
          }
          newCol[r] = b;
        }
        
        // Boşalan üst kısımlara gökyüzünden yeni sayılar yağdır!
        for (let r = 0; r < emptyCount; r++) {
          const dropDist = (emptyCount - r);
          newCol[r] = {
            c: c,
            r: r,
            val: U.randomInt(1, 9),
            color: this.bubbleColors[U.randomInt(0, this.bubbleColors.length - 1)],
            scale: 0.85,
            targetScale: 1.0,
            popping: false,
            animOffsetY: -dropDist * 75 - 40,
            fallVelocity: 0,
            id: Math.random()
          };
        }
        
        this.grid[c] = newCol;
      }
      
      this.ensureValidPaths();
      this.audio.play('pop');
    }
    
    update(dt) {
      this.time += dt;
      
      if (this.supernovaTime > 0) this.supernovaTime -= dt;
      
      if (!this.gameOver && !this.gameWon && this.supernovaTime <= 0) {
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
      
      // Yerçekimi, Düşüş ve Yaylanma Fiziği
      for (let c = 0; c < this.cols; c++) {
        for (let r = 0; r < this.rows; r++) {
          const b = this.grid[c][r];
          if (b) {
            b.scale = U.lerp(b.scale, b.targetScale, dt * 12);
            if (b.animOffsetY && b.animOffsetY < 0) {
              b.fallVelocity = (b.fallVelocity || 0) + 2600 * dt;
              b.animOffsetY += b.fallVelocity * dt;
              if (b.animOffsetY >= 0) {
                b.animOffsetY = 0;
                // Minik sevimli yaylanma (bounce)
                if (Math.abs(b.fallVelocity) > 200) {
                  b.fallVelocity = -b.fallVelocity * 0.28;
                } else {
                  b.fallVelocity = 0;
                }
              }
            } else if (b.animOffsetY && b.animOffsetY > 0) {
              b.animOffsetY = U.lerp(b.animOffsetY, 0, dt * 14);
              if (Math.abs(b.animOffsetY) < 1) b.animOffsetY = 0;
            }
          }
        }
      }
      
      // Yüzen Teşvik ve Puan Metinleri
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.life -= dt;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
      
      if (this.shakeTime > 0) this.shakeTime -= dt;
      
      this.particles.update(dt);
    }
    
    render(ctx, w, h) {
      const L = this.getLayout(w, h);
      
      // 1. GÖZ YORMAYAN, YUMUŞAK DOĞAL ARKA PLAN
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#F2EFE9');
      bgGrad.addColorStop(0.6, '#EAE5DC');
      bgGrad.addColorStop(1, '#DFD8CD');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
      
      ctx.save();
      if (this.shakeTime > 0) {
        const sx = (Math.random() - 0.5) * 8;
        const sy = (Math.random() - 0.5) * 8;
        ctx.translate(sx, sy);
      }
      
      // Sol Üst: Sıcak Mat 3D Skor Kartı (x: 74)
      MH.Renderer.roundedRect(ctx, 74, L.hudY, 135, L.hudH, 20, '#FAF8F4', '#DCD5CA', 2);
      MH.Renderer.text(ctx, `⭐ ${this.score}`, 141, L.hudY + L.hudH / 2, {color: '#2D3142', size: L.isCompact ? 18 : 21, bold: true});
      
      // Üst Orta: Şık Gökkuşağı Enerji Reaktörü
      const barW = L.isCompact ? 160 : 190;
      const barH = L.hudH;
      const barX = w/2 - barW/2;
      const barY = L.hudY;
      
      MH.Renderer.roundedRect(ctx, barX, barY, barW, barH, 20, '#FAF8F4', '#DCD5CA', 2);
      
      const fillW = Math.max(0, (barW - 8) * Math.min(1.0, this.energy / 100));
      if (fillW > 0) {
        const energyGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        energyGrad.addColorStop(0, '#059669');
        energyGrad.addColorStop(0.5, '#0284C7');
        energyGrad.addColorStop(1, '#6366F1');
        MH.Renderer.roundedRect(ctx, barX + 4, barY + 4, fillW, barH - 8, 16, energyGrad);
      }
      MH.Renderer.text(ctx, `⚡ Enerji: %${Math.min(100, Math.round(this.energy))}`, w/2, barY + barH/2, {
        color: '#2D3142',
        size: L.isCompact ? 13 : 15,
        bold: true
      });
      
      // Sağ Üst: Sıcak Mat 3D Süre Kartı
      const timerColor = this.timeLeft < 15 ? '#E11D48' : '#059669';
      MH.Renderer.roundedRect(ctx, w - 160, L.hudY, 144, L.hudH, 20, '#FAF8F4', '#DCD5CA', 2);
      MH.Renderer.text(ctx, `⏱️ ${Math.ceil(this.timeLeft)} sn`, w - 88, L.hudY + L.hudH / 2, {color: timerColor, size: L.isCompact ? 18 : 21, bold: true});
      
      // BEMBEYAZ, POFUDUK MODERN HEDEF KARTI
      const panelW = L.panelW;
      const panelH = L.panelH;
      const panelX = L.panelX;
      const panelY = L.panelY;
      
      let panelBorder = '#8B5CF6';
      let statusColor = '#64748B';
      let statusText = 'Parmağını komşu sayıların üstünde kaydır!';
      
      if (this.chain.length > 0) {
        const formula = this.chain.map(b => b.val).join(' + ');
        if (this.currentSum === this.target) {
          panelBorder = '#10B981';
          statusColor = '#059669';
          statusText = `🎉 ${formula} = ${this.currentSum} (TAMAM! Parmağını kaldır!)`;
        } else if (this.currentSum < this.target) {
          const diff = this.target - this.currentSum;
          statusColor = '#D97706';
          statusText = `${formula} = ${this.currentSum} (${diff} daha ekle!)`;
        } else {
          statusColor = '#DC2626';
          statusText = `${formula} = ${this.currentSum} (Aştın! Geri çek)`;
        }
      }
      
      // Kart Gövdesi (3D Sıcak Kart)
      MH.Renderer.roundedRect(ctx, panelX, panelY + 4, panelW, panelH, 20, '#DCD5CA');
      MH.Renderer.roundedRect(ctx, panelX, panelY, panelW, panelH, 20, '#FAF8F4', panelBorder, 3);
      
      MH.Renderer.text(ctx, `🎯 HEDEF SAYI: ${this.target} (Seviye ${this.currentLevel}/${this.totalLevels})`, w / 2, panelY + (L.isCompact ? 22 : 28), {
        color: '#2D3142',
        size: L.isCompact ? 20 : 25,
        bold: true
      });
      
      MH.Renderer.text(ctx, statusText, w / 2, panelY + (L.isCompact ? 46 : 58), {
        color: statusColor,
        size: L.isCompact ? 14 : 16,
        bold: true
      });
      
      // Parlak Şeker Zincir Çizgisi
      if (this.chain.length > 1) {
        ctx.save();
        ctx.strokeStyle = (this.currentSum === this.target) ? '#10B981' : '#8B5CF6';
        ctx.lineWidth = L.isCompact ? 8 : 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        for (let i = 0; i < this.chain.length; i++) {
          const b = this.chain[i];
          const bx = L.startX + b.c * L.cellW + L.cellW / 2;
          const by = L.startY + b.r * L.cellH + L.cellH / 2 + (b.animOffsetY || 0);
          if (i === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        ctx.stroke();
        ctx.restore();
      }
      
      // MODERN POFUDUK 3D ŞEKER TAŞLARI (Squircle Jelly Tiles)
      const tileW = L.cellW - (L.isCompact ? 8 : 12);
      const tileH = L.cellH - (L.isCompact ? 8 : 12);
      const tileRadius = L.isCompact ? 16 : 22;
      
      for (let c = 0; c < this.cols; c++) {
        for (let r = 0; r < this.rows; r++) {
          const b = this.grid[c][r];
          if (!b) continue;
          
          const bx = L.startX + c * L.cellW + L.cellW / 2;
          const by = L.startY + r * L.cellH + L.cellH / 2 + (b.animOffsetY || 0);
          const isSelected = this.chain.includes(b);
          
          ctx.save();
          ctx.translate(bx, by);
          ctx.scale(b.scale, b.scale);
          
          // 3D Alt Taban Gölgesi
          MH.Renderer.roundedRect(ctx, -tileW/2, -tileH/2 + 5, tileW, tileH, tileRadius, 'rgba(0,0,0,0.12)');
          
          // Şeker Gövdesi
          MH.Renderer.roundedRect(ctx, -tileW/2, -tileH/2, tileW, tileH, tileRadius, b.color);
          
          // Seçiliyse Altın Çerçeve & Işık
          if (isSelected) {
            MH.Renderer.glow(ctx, 0, 0, tileW * 0.7, '#FDE047', 0.8);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.stroke();
          } else {
            // Hafif Üst Beyaz Işıltı
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.beginPath();
            ctx.ellipse(0, -tileH * 0.22, tileW * 0.35, tileH * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Kocaman ve Okunaklı Sayı Metni
          MH.Renderer.text(ctx, b.val.toString(), 0, 2, {
            color: '#FFFFFF',
            size: L.isCompact ? 26 : 32,
            bold: true,
            shadow: true,
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowBlur: 4,
            stroke: true,
            strokeColor: 'rgba(0,0,0,0.2)',
            strokeWidth: 2
          });
          
          ctx.restore();
        }
      }
      
      this.particles.render(ctx);
      
      // Yüzen Ödül ve Teşvik Metinleri
      for (const ft of this.floatingTexts) {
        const alpha = Math.min(1.0, ft.life / 0.4);
        ctx.save();
        ctx.globalAlpha = alpha;
        MH.Renderer.text(ctx, ft.text, ft.x, ft.y, {
          color: ft.color,
          size: ft.size || 24,
          bold: true,
          shadow: true,
          shadowColor: 'rgba(0,0,0,0.35)',
          shadowBlur: 6,
          stroke: true,
          strokeColor: '#FFFFFF',
          strokeWidth: 4
        });
        ctx.restore();
      }
      
      // SÜPER GÜÇ PATLAMASI BANNERI
      if (this.supernovaTime > 0) {
        ctx.fillStyle = 'rgba(79, 70, 229, 0.88)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, '⚡ SÜPER ENERJİ PATLAMASI! (+100 Puan +Süre)', w/2, h/2, {
          color: '#FDE047',
          size: L.isCompact ? 24 : 32,
          bold: true,
          shadow: true,
          shadowBlur: 10
        });
      }
      
      // Zafer veya Yenilgi
      if (this.gameWon) {
        ctx.fillStyle = 'rgba(19, 14, 46, 0.9)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, '🎉 TEBRİKLER! ENERJİ ŞAMPİYONU!', w / 2, h / 2 - 40, {color: '#34D399', size: 34, bold: true});
        MH.Renderer.text(ctx, `Müthiş Zincirler! Toplam Skor: ${this.score}`, w / 2, h / 2 + 20, {color: '#FFFFFF', size: 28, bold: true});
      } else if (this.gameOver) {
        ctx.fillStyle = 'rgba(19, 14, 46, 0.9)';
        ctx.fillRect(0, 0, w, h);
        MH.Renderer.text(ctx, 'Süre Bitti!', w / 2, h / 2 - 40, {color: '#EF4444', size: 48, bold: true});
        MH.Renderer.text(ctx, `Toplam Skor: ${this.score}`, w / 2, h / 2 + 20, {color: '#FFFFFF', size: 30, bold: true});
      }
      
      ctx.restore(); // Screen shake end
    }
    
    endGame() {
      this.stop();
      let stars = 1;
      if (this.gameWon) stars = 3;
      else if (this.score >= 150) stars = 2;
      
      this.onGameEnd({
        score: this.score,
        stars: stars,
        correct: this.correct,
        wrong: this.wrong,
        mode: 'chain'
      });
    }
  }
  
  MH.ChainMode = ChainMode;
})();
