(function(){
  'use strict';
  window.MH = window.MH || {};
  
  /** @namespace */
  MH.Utils = {
    /**
     * @param {Array} arr 
     * @returns {Array} Shuffled array
     */
    shuffle: function(arr) {
      const result = arr.slice();
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
      }
      return result;
    },
    
    /**
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    randomInt: function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    randomFloat: function(min, max) {
      return Math.random() * (max - min) + min;
    },
    
    /**
     * @param {number} a 
     * @param {number} b 
     * @param {number} t 
     * @returns {number}
     */
    lerp: function(a, b, t) {
      return a + (b - a) * t;
    },
    
    /**
     * @param {number} val 
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    clamp: function(val, min, max) {
      return Math.max(min, Math.min(max, val));
    },
    
    /**
     * @param {number} seconds 
     * @returns {string}
     */
    formatTime: function(seconds) {
      const s = Math.max(0, Math.floor(seconds));
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return m + ':' + (rem < 10 ? '0' : '') + rem;
    },
    
    /**
     * @param {number} t 
     * @returns {number}
     */
    easeOutQuad: function(t) {
      return t * (2 - t);
    },
    
    /**
     * @param {number} t 
     * @returns {number}
     */
    easeOutBack: function(t) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    
    /**
     * @param {number} t 
     * @returns {number}
     */
    easeOutElastic: function(t) {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    
    /**
     * @param {number} t 
     * @returns {number}
     */
    easeInOutCubic: function(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    
    /**
     * @param {string} hex 
     * @param {number} alpha 
     * @returns {string}
     */
    hexToRgba: function(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    },
    
    /**
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {number}
     */
    distance: function(x1, y1, x2, y2) {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
    
    /**
     * @param {number} px 
     * @param {number} py 
     * @param {number} rx 
     * @param {number} ry 
     * @param {number} rw 
     * @param {number} rh 
     * @returns {boolean}
     */
    pointInRect: function(px, py, rx, ry, rw, rh) {
      return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },
    
    /**
     * @param {number} px 
     * @param {number} py 
     * @param {number} cx 
     * @param {number} cy 
     * @param {number} r 
     * @returns {boolean}
     */
    pointInCircle: function(px, py, cx, cy, r) {
      return this.distance(px, py, cx, cy) <= r;
    },
    
    COLORS: {
      Background: '#0a0a1a', bg: '#0a0a1a',
      Primary: '#6C5CE7', primary: '#6C5CE7',
      Secondary: '#00D2FF', secondary: '#00D2FF',
      Success: '#00E676', success: '#00E676',
      Warning: '#FF6B35', warning: '#FF6B35',
      Danger: '#FF5252', danger: '#FF5252',
      Gold: '#FFD700', gold: '#FFD700',
      Text: '#FFFFFF', text: '#FFFFFF'
    }
  };
})();
