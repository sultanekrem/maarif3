(function(){
  'use strict';
  window.MH = window.MH || {};

  MH.Renderer = {
    roundedRect: function(ctx, x, y, w, h, radius, fillColor, strokeColor, lineWidth) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (strokeColor) {
        ctx.lineWidth = lineWidth || 1;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
      }
    },

    text: function(ctx, str, x, y, options = {}) {
      let font = options.font;
      if (!font) {
        const size = options.size || 20;
        const weight = options.bold ? 'bold ' : '';
        const family = options.family || "'Nunito', 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        font = weight + size + 'px ' + family;
      }
      ctx.font = font;
      ctx.textAlign = options.align || 'center';
      ctx.textBaseline = options.baseline || 'middle';
      
      // Metin Etrafına Keskin Kontur (Hafif veya Koyu Zeminlerde Kusursuz Okunurluk)
      if (options.stroke) {
        ctx.save();
        ctx.strokeStyle = options.strokeColor || 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = options.strokeWidth || 4;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(str, x, y, options.maxWidth);
        ctx.restore();
      }

      ctx.fillStyle = options.color || '#FFFFFF';
      if (options.shadow) {
        ctx.shadowColor = options.shadowColor || 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = options.shadowBlur || 8;
      }
      ctx.fillText(str, x, y, options.maxWidth);
      ctx.shadowBlur = 0;
    },

    multiLineText: function(ctx, str, x, y, maxWidth, lineHeight, options = {}) {
      ctx.font = options.font || "20px 'Nunito', 'Quicksand', sans-serif";
      ctx.fillStyle = options.color || '#FFFFFF';
      ctx.textAlign = options.align || 'center';
      ctx.textBaseline = options.baseline || 'top';
      
      const words = str.split(' ');
      let line = '';
      let testLine = '';
      let currentY = y;

      for(let n = 0; n < words.length; n++) {
        testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
    },

    glow: function(ctx, x, y, radius, color, intensity = 0.5) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const rgba = MH.Utils ? MH.Utils.hexToRgba(color, intensity) : color;
      const rgbaZero = MH.Utils ? MH.Utils.hexToRgba(color, 0) : 'transparent';
      gradient.addColorStop(0, rgba);
      gradient.addColorStop(1, rgbaZero);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    },

    progressBar: function(ctx, x, y, w, h, progress, fgColor, bgColor, radius) {
      radius = radius !== undefined ? radius : h / 2;
      this.roundedRect(ctx, x, y, w, h, radius, bgColor);
      if (progress > 0) {
        const pw = Math.max(radius * 2, w * progress);
        this.roundedRect(ctx, x, y, pw, h, radius, fgColor);
      }
    },

    button: function(ctx, x, y, w, h, label, options = {}) {
      const color = options.color || '#6C5CE7';
      const textColor = options.textColor || '#FFFFFF';
      const radius = options.radius || 10;
      const fontSize = options.fontSize || '24px Arial';
      const pressed = options.pressed || false;
      const offset = pressed ? 4 : 0;
      
      if (options.glow) {
        this.glow(ctx, x + w/2, y + h/2, w, color, 0.3);
      }

      if (!pressed) {
        const darkColor = MH.Utils ? MH.Utils.hexToRgba(color, 0.6) : '#000';
        this.roundedRect(ctx, x, y + 6, w, h, radius, darkColor);
      }
      
      this.roundedRect(ctx, x, y + offset, w, h, radius, color);
      
      this.text(ctx, label, x + w / 2, y + h / 2 + offset, {
        font: fontSize,
        color: textColor,
        align: 'center',
        baseline: 'middle'
      });

      return {x, y, w, h};
    },

    starRating: function(ctx, x, y, size, filled, total = 3, color = '#FFD700') {
      const spacing = size * 1.5;
      const startX = x - (spacing * (total - 1)) / 2;
      for (let i = 0; i < total; i++) {
        const cx = startX + i * spacing;
        this.text(ctx, i < filled ? '⭐' : '☆', cx, y, {
          font: size + 'px Arial',
          color: color,
          align: 'center',
          baseline: 'middle'
        });
      }
    },

    hexagon: function(ctx, cx, cy, size, fillColor, strokeColor) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i - Math.PI / 2;
        const hx = cx + size * Math.cos(angle);
        const hy = cy + size * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(hx, hy);
        } else {
          ctx.lineTo(hx, hy);
        }
      }
      ctx.closePath();
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },

    drawIcon: function(ctx, emoji, x, y, size) {
      this.text(ctx, emoji, x, y, {
        font: size + 'px Arial',
        align: 'center',
        baseline: 'middle'
      });
    }
  };
})();
