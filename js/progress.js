(function(){
  'use strict';
  window.MH = window.MH || {};

  const STORAGE_KEY = 'mathhero_save';

  const BADGE_DEFS = {
    'first_game': { name: 'İlk Adım', icon: '🎯', desc: 'İlk oyununu oyna' },
    'ten_games': { name: 'Deneyimli', icon: '🎮', desc: '10 oyun oyna' },
    'hundred_correct': { name: 'Matematik Avcısı', icon: '🧮', desc: '100 doğru cevap ver' },
    'five_hundred_correct': { name: 'Süper Beyin', icon: '🧠', desc: '500 doğru cevap ver' },
    'streak_3': { name: 'Kararlı', icon: '🔥', desc: '3 gün üst üste oyna' },
    'streak_7': { name: 'Alışkanlık', icon: '💪', desc: '7 gün üst üste oyna' },
    'meteor_master': { name: 'Meteor Ustası', icon: '☄️', desc: 'Meteor modunda 1000+ puan' },
    'balloon_master': { name: 'Balon Avcısı', icon: '🎈', desc: 'Balon modunda 1000+ puan' },
    'runner_master': { name: 'Hız Canavarı', icon: '🏃', desc: 'Koşu modunda 1000+ puan' },
    'match_master': { name: 'Eşleştirme Pro', icon: '⚡', desc: 'Eşleştirme modunda 1000+ puan' },
    'chain_master': { name: 'Zincir Ustası', icon: '🔗', desc: 'Zincir modunda 1000+ puan' },
    'all_modes': { name: 'Tam Donanım', icon: '🌟', desc: 'Tüm 5 modu oyna' },
    'star_collector': { name: 'Yıldız Toplayıcı', icon: '⭐', desc: '50 yıldız topla' },
    'level_5': { name: 'Seviye 5', icon: '🏅', desc: '5. seviyeye ulaş' },
    'level_10': { name: 'Seviye 10', icon: '👑', desc: '10. seviyeye ulaş' }
  };

  class Progress {
    constructor() {
      this.data = {
        highScores: { meteor: 0, balloon: 0, runner: 0, match: 0, chain: 0 },
        totalStars: 0,
        xp: 0,
        unlockedBadges: [],
        stats: {
          gamesPlayed: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          totalPlayTime: 0,
          modesPlayed: []
        },
        streakDays: 0,
        lastPlayDate: ''
      };
      this.load();
    }

    get highScores() { return this.data.highScores; }
    get totalStars() { return this.data.totalStars; }
    get xp() { return this.data.xp; }
    get level() { return Math.floor(this.data.xp / 200) + 1; }
    get stats() { return this.data.stats; }
    get streakDays() { return this.data.streakDays; }
    get lastPlayDate() { return this.data.lastPlayDate; }
    
    get badges() {
      const res = [];
      for (const id in BADGE_DEFS) {
        const b = BADGE_DEFS[id];
        const unlockedObj = this.data.unlockedBadges.find(ub => ub.id === id);
        res.push({
          id: id,
          name: b.name,
          icon: b.icon,
          desc: b.desc,
          unlocked: !!unlockedObj,
          unlockedAt: unlockedObj ? unlockedObj.date : null
        });
      }
      return res;
    }

    submitGame(mode, score, stars, correct, wrong, playTime) {
      let isHigh = false;
      if (score > (this.data.highScores[mode] || 0)) {
        this.data.highScores[mode] = score;
        isHigh = true;
      }
      
      this.data.totalStars += stars;
      this.data.stats.gamesPlayed++;
      this.data.stats.correctAnswers += correct;
      this.data.stats.wrongAnswers += wrong;
      this.data.stats.totalPlayTime += playTime;
      
      if (!this.data.stats.modesPlayed.includes(mode)) {
        this.data.stats.modesPlayed.push(mode);
      }

      const today = new Date().toDateString();
      if (this.data.lastPlayDate !== today) {
        if (this.data.lastPlayDate) {
          const lastDate = new Date(this.data.lastPlayDate);
          const diff = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            this.data.streakDays++;
          } else if (diff > 1) {
            this.data.streakDays = 1;
          }
        } else {
          this.data.streakDays = 1;
        }
        this.data.lastPlayDate = today;
      }

      const xpGained = (correct * 10) + (stars * 50) + (isHigh ? 100 : 0);
      this.data.xp += xpGained;

      this._checkBadges();
      this.save();

      return { isHighScore: isHigh, xpGained: xpGained };
    }

    _checkBadges() {
      const award = (id) => {
        if (!this.data.unlockedBadges.find(b => b.id === id)) {
          this.data.unlockedBadges.push({ id: id, date: new Date().toISOString() });
        }
      };

      const s = this.data.stats;
      if (s.gamesPlayed >= 1) award('first_game');
      if (s.gamesPlayed >= 10) award('ten_games');
      if (s.correctAnswers >= 100) award('hundred_correct');
      if (s.correctAnswers >= 500) award('five_hundred_correct');
      if (this.data.streakDays >= 3) award('streak_3');
      if (this.data.streakDays >= 7) award('streak_7');
      
      if (this.data.highScores.meteor >= 1000) award('meteor_master');
      if (this.data.highScores.balloon >= 1000) award('balloon_master');
      if (this.data.highScores.runner >= 1000) award('runner_master');
      if (this.data.highScores.match >= 1000) award('match_master');
      if (this.data.highScores.chain >= 1000) award('chain_master');
      
      if (s.modesPlayed.length >= 5) award('all_modes');
      if (this.data.totalStars >= 50) award('star_collector');
      if (this.level >= 5) award('level_5');
      if (this.level >= 10) award('level_10');
    }

    getBadges() {
      return this.badges;
    }

    getHighScore(mode) {
      return this.data.highScores[mode] || 0;
    }

    isNewHighScore(mode, score) {
      return score > (this.data.highScores[mode] || 0);
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch(e) {
        console.warn('Could not save progress', e);
      }
    }

    load() {
      try {
        const str = localStorage.getItem(STORAGE_KEY);
        if (str) {
          const parsed = JSON.parse(str);
          this.data = Object.assign(this.data, parsed);
        }
      } catch(e) {
        console.warn('Could not load progress', e);
      }
    }

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      this.data = {
        highScores: { meteor: 0, balloon: 0, runner: 0, match: 0, chain: 0 },
        totalStars: 0,
        xp: 0,
        unlockedBadges: [],
        stats: {
          gamesPlayed: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          totalPlayTime: 0,
          modesPlayed: []
        },
        streakDays: 0,
        lastPlayDate: ''
      };
      this.save();
    }
  }

  MH.Progress = Progress;
})();
