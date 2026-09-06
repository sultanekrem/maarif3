(function(){
  'use strict';
  window.MH = window.MH || {};

  /**
   * @class
   * Audio Manager for MatematikHero
   */
  class Audio {
    constructor() {
      this.ctx = null;
      this._muted = false;
      this.musicInterval = null;
      this.isMusicPlaying = false;
      this.noteIndex = 0;
    }

    /**
     * Initializes AudioContext on first interaction
     */
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    /**
     * @returns {boolean}
     */
    get muted() {
      return this._muted;
    }

    /**
     * Efekt seslerini açıp kapatır
     */
    toggleMute() {
      this._muted = !this._muted;
      return this._muted;
    }

    /**
     * Müziği açıp kapatır
     */
    toggleMusic() {
      if (this.isMusicPlaying) {
        this.stopMusic();
        return false;
      } else {
        this.startMusic();
        return true;
      }
    }

    /**
     * Çok yumuşak, sakinleştirici Müzik Kutusu / Kalimba Fon Akorları
     * Kesinlikle hızlı 'dıt dıt' döngüsü yoktur. Her 3.5 saniyede bir
     * düşük frekanslı, kadifemsi ve sakin bir akor arpeji çalar.
     */
    startMusic() {
      if (this.isMusicPlaying) return;
      this.init();
      this.isMusicPlaying = true;
      
      // Sıcak, sakin ve huzurlu lofi çocuk akorları (Frekans dizileri)
      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
        [220.00, 261.63, 329.63, 392.00], // Am7   (A3, C4, E4, G4)
        [174.61, 261.63, 329.63, 440.00], // Fmaj7 (F3, C4, E4, A4)
        [196.00, 246.94, 293.66, 392.00]  // G6    (G3, B3, D4, G4)
      ];
      
      let chordIndex = 0;
      
      const playWarmChord = () => {
        if (!this.isMusicPlaying || !this.ctx) return;
        
        const currentChord = chords[chordIndex % chords.length];
        chordIndex++;
        
        // Akor içindeki 3-4 notayı 220ms aralıklarla usulca arpejle
        currentChord.forEach((freq, noteIdx) => {
          setTimeout(() => {
            if (!this.isMusicPlaying || !this.ctx) return;
            
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            // Düşük geçiren filtre ile sivri/rahatsız edici tizleri yok et (sıcak kadife ton)
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, t);
            
            osc.type = 'sine'; // Saf, yumuşacık ninni tonu
            osc.frequency.setValueAtTime(freq, t);
            
            // Fısıltı seviyesinde, yavaşça yükselip 1.8 saniyede sönen huzurlu çan sesi
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.015, t + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.00005, t + 1.8);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t);
            osc.stop(t + 1.85);
          }, noteIdx * 240);
        });
      };
      
      // İlk akoru hemen çal, ardından her 3.4 saniyede bir sakin nefes alarak tekrarla
      playWarmChord();
      this.musicInterval = setInterval(playWarmChord, 3400);
    }

    stopMusic() {
      this.isMusicPlaying = false;
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
    }

    /**
     * Plays a sound by type
     * @param {string} type 
     */
    play(type) {
      if (this._muted) return;
      this.init();
      
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      switch(type) {
        case 'correct':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, t); // C5
          osc.frequency.setValueAtTime(659.25, t + 0.075); // E5
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
          osc.start(t);
          osc.stop(t + 0.15);
          break;
        case 'wrong':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, t); // A3
          osc.frequency.linearRampToValueAtTime(174.61, t + 0.2); // F3
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
          osc.start(t);
          osc.stop(t + 0.2);
          break;
        case 'combo':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, t);
          osc.frequency.setValueAtTime(659.25, t + 0.06);
          osc.frequency.setValueAtTime(783.99, t + 0.12);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
          osc.start(t);
          osc.stop(t + 0.2);
          break;
        case 'explosion': {
          const bufferSize = this.ctx.sampleRate * 0.3;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1000, t);
          filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);
          const noiseGain = this.ctx.createGain();
          noiseGain.gain.setValueAtTime(0.8, t);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.ctx.destination);
          noise.start(t);
          noise.stop(t + 0.3);
          return;
        }
        case 'pop':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
          osc.start(t);
          osc.stop(t + 0.05);
          break;
        case 'swipe':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
          osc.start(t);
          osc.stop(t + 0.15);
          break;
        case 'levelup':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, t); // C5
          osc.frequency.setValueAtTime(659.25, t + 0.125); // E5
          osc.frequency.setValueAtTime(783.99, t + 0.25); // G5
          osc.frequency.setValueAtTime(1046.50, t + 0.375); // C6
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
          osc.start(t);
          osc.stop(t + 0.5);
          break;
        case 'click':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.2, t + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
          osc.start(t);
          osc.stop(t + 0.03);
          break;
        case 'gameOver':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(329.63, t); // E4
          osc.frequency.setValueAtTime(261.63, t + 0.2); // C4
          osc.frequency.setValueAtTime(220, t + 0.4); // A3
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
          osc.start(t);
          osc.stop(t + 0.6);
          break;
        case 'tick':
          osc.type = 'square';
          osc.frequency.setValueAtTime(1000, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.1, t + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.02);
          osc.start(t);
          osc.stop(t + 0.02);
          break;
      }
    }
  }

  MH.Audio = Audio;
})();
