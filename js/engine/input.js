(function(){
  'use strict';
  window.MH = window.MH || {};

  class Input {
    constructor(canvas) {
      this.canvas = canvas;
      this.handlers = {
        tap: new Map(),
        swipe: new Map(),
        dragStart: new Map(),
        dragMove: new Map(),
        dragEnd: new Map()
      };
      this.nextId = 1;
      
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.touchStartTime = 0;
      this.isDragging = false;
      this.pointers = new Map();

      this._bindEvents();
    }

    _bindEvents() {
      const opts = { passive: false };
      this.canvas.addEventListener('mousedown', this._onStart.bind(this), opts);
      this.canvas.addEventListener('mousemove', this._onMove.bind(this), opts);
      this.canvas.addEventListener('mouseup', this._onEnd.bind(this), opts);
      this.canvas.addEventListener('touchstart', this._onStart.bind(this), opts);
      this.canvas.addEventListener('touchmove', this._onMove.bind(this), opts);
      this.canvas.addEventListener('touchend', this._onEnd.bind(this), opts);
    }

    toCanvas(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    _getPointer(e) {
      if (e.changedTouches) {
        return {
          id: e.changedTouches[0].identifier,
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY
        };
      }
      return { id: 'mouse', x: e.clientX, y: e.clientY };
    }

    _onStart(e) {
      e.preventDefault();
      const p = this._getPointer(e);
      const pos = this.toCanvas(p.x, p.y);
      
      this.touchStartX = p.x;
      this.touchStartY = p.y;
      this.touchStartTime = Date.now();
      this.isDragging = true;
      this.pointers.set(p.id, pos);

      this.handlers.dragStart.forEach(fn => fn(pos.x, pos.y));
    }

    _onMove(e) {
      e.preventDefault();
      if (!this.isDragging) return;
      const p = this._getPointer(e);
      const pos = this.toCanvas(p.x, p.y);
      this.pointers.set(p.id, pos);

      this.handlers.dragMove.forEach(fn => fn(pos.x, pos.y));
    }

    _onEnd(e) {
      e.preventDefault();
      const p = this._getPointer(e);
      const pos = this.toCanvas(p.x, p.y);
      this.isDragging = false;
      this.pointers.delete(p.id);

      const dx = p.x - this.touchStartX;
      const dy = p.y - this.touchStartY;
      const dt = Date.now() - this.touchStartTime;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.handlers.dragEnd.forEach(fn => fn(pos.x, pos.y));

      if (dist < 25 && dt < 450) {
        this.handlers.tap.forEach(fn => fn(pos.x, pos.y));
      } else if (dist >= 30 && dt <= 450) {
        let dir = '';
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 0 ? 'right' : 'left';
        } else {
          dir = dy > 0 ? 'down' : 'up';
        }
        const velocity = dist / dt;
        const startPos = this.toCanvas(this.touchStartX, this.touchStartY);
        this.handlers.swipe.forEach(fn => fn(dir, velocity, startPos.x, startPos.y));
      }
    }

    _add(type, fn) {
      const id = this.nextId++;
      this.handlers[type].set(id, fn);
      return id;
    }

    onTap(fn) { return this._add('tap', fn); }
    onSwipe(fn) { return this._add('swipe', fn); }
    onDragStart(fn) { return this._add('dragStart', fn); }
    onDragMove(fn) { return this._add('dragMove', fn); }
    onDragEnd(fn) { return this._add('dragEnd', fn); }

    off(id) {
      for (const map of Object.values(this.handlers)) {
        if (map.delete(id)) return true;
      }
      return false;
    }

    removeAll() {
      for (const map of Object.values(this.handlers)) {
        map.clear();
      }
    }
  }

  MH.Input = Input;
})();
