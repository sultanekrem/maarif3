(function() {
  'use strict';
  window.MH = window.MH || {};

  // 1. Uygulama Durumu (State)
  const state = {
    studentProfile: {
      name: '',
      class: '3-A',
      no: '',
      avatar: '👧',
      isRegistered: false
    },
    currentScreen: 'screen-splash',
    currentSubjectKey: 'matematik',
    currentThemeIndex: 0,
    currentTopic: null,
    currentTaskIndex: 0,
    quizScore: 0,
    quizCorrectCount: 0,
    streak: 0,
    // Sınav Durumu
    currentExam: null,
    currentExamQIndex: 0,
    examScore: 0,
    examCorrectCount: 0,
    examWrongCount: 0,
    soundEnabled: true,
    progress: {
      stars: 0,
      score: 0,
      completedTopics: {}, // topicId: { stars: 3, completedAt: date }
      completedExams: {},   // examKey: { attempts: 2, firstScore: 80, lastScore: 100, bestScore: 100, history: [...] }
      mistakeBank: []       // Yanlış yapılan sorular kumbarası
    }
  };

  // 2. LocalStorage Kalıcılığı
  function loadSavedProgress() {
    try {
      const isRegisteredFlag = localStorage.getItem('maarif_student_registered_2026') === 'true';
      const savedProfile = localStorage.getItem('maarif_student_profile_2026');
      if (savedProfile && isRegisteredFlag) {
        state.studentProfile = Object.assign(state.studentProfile, JSON.parse(savedProfile));
        state.studentProfile.isRegistered = true;
      } else {
        state.studentProfile.isRegistered = false;
        state.studentProfile.name = '';
      }

      const saved = localStorage.getItem('maarif_progress_2026_v5') || localStorage.getItem('maarif_progress_2026_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.progress = Object.assign(state.progress, parsed);
        state.progress.mistakeBank = state.progress.mistakeBank || [];
      }
    } catch(e) {
      console.warn('Progress load error:', e);
    }
    updateStudentProfileDisplay();
    updateHeaderStats();
    updateClassroomSummary();
  }

  function saveProgress() {
    try {
      localStorage.setItem('maarif_student_profile_2026', JSON.stringify(state.studentProfile));
      localStorage.setItem('maarif_progress_2026_v5', JSON.stringify(state.progress));
    } catch(e) {
      console.warn('Progress save error:', e);
    }
    updateHeaderStats();
    updateClassroomSummary();
  }

  function updateStudentProfileDisplay() {
    const prof = state.studentProfile;
    const displayName = (prof.isRegistered && prof.name) ? prof.name : 'Giriş Yapılmadı';
    
    // Header Avatar & İsim
    const avatarEl = document.getElementById('header-avatar-emoji');
    if (avatarEl) avatarEl.textContent = prof.avatar || '👧';

    const nameEl = document.getElementById('header-student-name');
    if (nameEl) nameEl.textContent = displayName;

    const metaEl = document.getElementById('header-student-meta');
    if (metaEl) {
      metaEl.textContent = prof.isRegistered 
        ? `${prof.class || '3-A'} • No: ${prof.no || '—'}`
        : 'Giriş Yapılmadı • Tıkla';
    }

    // Genel Öğrenci İsmi Alanları
    document.querySelectorAll('.student-name').forEach(el => {
      if (el.id !== 'header-student-name') {
        el.textContent = displayName;
      }
    });
  }

  function updateHeaderStats() {
    const starsEl = document.getElementById('menu-stars');
    const scoreEl = document.getElementById('menu-score');
    if (starsEl) starsEl.textContent = state.progress.stars;
    if (scoreEl) scoreEl.textContent = state.progress.score;
  }

  function updateClassroomSummary() {
    const topicCountEl = document.getElementById('stat-completed-topics-count');
    const examCountEl = document.getElementById('stat-exams-taken-count');
    const titleEl = document.getElementById('class-summary-title');

    let totalTopics = 0;
    let totalExams = 0;
    if (window.CURRICULUM_TERM1) {
      Object.keys(window.CURRICULUM_TERM1).forEach(k => {
        if (k === 'general_exam') return;
        const subj = window.CURRICULUM_TERM1[k];
        if (subj.themes) {
          subj.themes.forEach(t => {
            if (t.topics) totalTopics += t.topics.length;
            if (t.exam) totalExams++;
          });
        }
        if (subj.final_exam) totalExams++;
      });
      if (window.CURRICULUM_TERM1.general_exam) totalExams++;
    }

    if (titleEl) {
      titleEl.textContent = `${totalTopics} Resmî MEB Kazanımı Hazır`;
    }
    if (topicCountEl) {
      const completedCount = Object.keys(state.progress.completedTopics).length;
      topicCountEl.textContent = `${completedCount} / ${totalTopics}`;
    }
    if (examCountEl) {
      const examCount = Object.keys(state.progress.completedExams).length;
      examCountEl.textContent = `${examCount} / ${totalExams}`;
    }
  }


  // ==========================================================================
  // 🔊 AKILLI DOĞAL TÜRKÇE SES MOTORU (Web Speech API - Hızlı, Güvenilir & Doğal)
  // ==========================================================================
  const SpeechService = {
    isSpeaking: false,
    activeButton: null,
    cachedVoices: [],

    init: function() {
      if (!('speechSynthesis' in window)) return;
      this.loadVoices();
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    },

    loadVoices: function() {
      if (!('speechSynthesis' in window)) return;
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
    },

    getBestTurkishVoice: function() {
      if (!this.cachedVoices || this.cachedVoices.length === 0) {
        this.loadVoices();
      }
      const voices = this.cachedVoices;
      if (!voices || voices.length === 0) return null;

      const scored = [];
      for (let i = 0; i < voices.length; i++) {
        const v = voices[i];
        const lang = (v.lang || '').toLowerCase().replace('_', '-');
        const name = (v.name || '').toLowerCase();

        const isTr = lang.startsWith('tr') || name.includes('turkish') || name.includes('türkçe');
        if (!isTr) continue;

        let score = 20;
        if (name.includes('natural')) score += 70;
        if (name.includes('neural')) score += 60;
        if (name.includes('online')) score += 35;
        if (name.includes('enhanced') || name.includes('premium')) score += 50;
        if (name.includes('google')) score += 45;
        if (name.includes('siri') || name.includes('yelda')) score += 40;
        if (name.includes('emel') || name.includes('ahmet')) score += 30;
        if (v.localService === false) score += 25;
        if (name.includes('desktop')) score -= 30;
        if (name.includes('tolga') && !name.includes('natural')) score -= 20;

        scored.push({ voice: v, score: score });
      }

      scored.sort((a, b) => b.score - a.score);
      return scored.length > 0 ? scored[0].voice : null;
    },

    cleanText: function(text) {
      if (!text) return '';
      let res = String(text)
        .replace(/\+/g, ' artı ')
        .replace(/-/g, ' eksi ')
        .replace(/×|\*/g, ' çarpı ')
        .replace(/÷|\//g, ' bölü ')
        .replace(/=/g, ' eşittir ');

      // Sayıların ardındaki noktayı kaldır (347. -> üç yüz kırk yedinci olmasını kesinlikle önler!)
      // Sadece "3. sınıf", "1. tema" gibi kelimelerden önce geliyorsa sıra sayısı olarak koru
      res = res.replace(/(\d+)\.(?!\d)/g, (match, p1, offset, fullStr) => {
        const after = fullStr.slice(offset + match.length).trim();
        if (/^(sınıf|tema|ünite|adım|soru|sıra|kat|madde|bölüm)/i.test(after)) {
          return match;
        }
        return p1 + ' ';
      });

      // Sondaki noktaları kaldır
      res = res.replace(/\.+$/, '');
      return res.replace(/\s+/g, ' ').trim();
    },

    formatQuestion: function(qData) {
      if (!qData) return '';
      let qText = this.cleanText(qData.q);
      
      let speech = qText + '. ';

      if (Array.isArray(qData.options) && qData.options.length > 0) {
        const letters = ['A', 'B', 'C', 'D'];
        const optParts = [];
        qData.options.forEach((opt, idx) => {
          let optClean = this.cleanText(opt);
          optParts.push(letters[idx] + ' şıkkı ' + optClean);
        });
        // Şıklar arasına virgül koy (asla nokta değil! Sayıların ardına nokta gelmez!)
        speech += optParts.join(', ');
      }

      return speech.trim();
    },

    resetButton: function(btn) {
      if (!btn) return;
      btn.classList.remove('is-speaking');
      const txt = btn.querySelector('.v-text');
      if (txt) txt.textContent = 'Soruyu ve Şıkları Sesli Dinle';
      const icon = btn.querySelector('.v-icon');
      if (icon) icon.textContent = '🔊';
    },

    setButtonSpeaking: function(btn) {
      if (!btn) return;
      btn.classList.add('is-speaking');
      const txt = btn.querySelector('.v-text');
      if (txt) txt.textContent = 'Okumayı Durdur';
      const icon = btn.querySelector('.v-icon');
      if (icon) icon.textContent = '⏹️';
    },

    stop: function() {
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch(e) {}
      }
      this.isSpeaking = false;
      if (this.activeButton) {
        this.resetButton(this.activeButton);
        this.activeButton = null;
      }
    },

    toggleQuestion: function(qData, btnElement) {
      if (this.isSpeaking && this.activeButton === btnElement) {
        this.stop();
        return;
      }
      const text = this.formatQuestion(qData);
      this.speak(text, btnElement);
    },

    speak: function(text, btnElement) {
      if (!('speechSynthesis' in window) || !text) {
        return;
      }

      this.stop();

      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'tr-TR';
      u.rate = 1.0; // 1.0: Doğal, akıcı, gerçek konuşma hızı (asla yavaş ve robotik değil)
      u.pitch = 1.0; // 1.0: Orijinal doğal ses perdesi

      const bestVoice = this.getBestTurkishVoice();
      if (bestVoice) {
        u.voice = bestVoice;
      }

      this.isSpeaking = true;
      this.activeButton = btnElement;

      if (btnElement) {
        this.setButtonSpeaking(btnElement);
      }

      const onEndOrError = () => {
        this.isSpeaking = false;
        if (this.activeButton) {
          this.resetButton(this.activeButton);
          this.activeButton = null;
        }
      };

      u.onend = onEndOrError;
      u.onerror = (e) => {
        console.warn('Speech error:', e);
        onEndOrError();
      };

      try {
        window.speechSynthesis.speak(u);
      } catch (err) {
        console.warn('SpeechSynthesis speak failed:', err);
        onEndOrError();
      }
    }
  };

  // Ses motorunu sayfa açılışında derhal başlat
  SpeechService.init();

  // 📳 Haptik Dokunmatik Titreşim (Destekleyen telefonlar için)
  function triggerHaptic(type) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (type === 'success') {
          navigator.vibrate([30, 40, 60]);
        } else if (type === 'warning') {
          navigator.vibrate([40, 50]);
        }
      } catch(e) {}
    }
  }

  // 🧠 YILDIZ KUMBARASI (Hata Kumbarası) YÖNETİMİ
  function updateKumbaraBadge() {
    const badgeEl = document.getElementById('kumbara-counter-badge');
    if (!badgeEl) return;
    const count = (state.progress.mistakeBank && state.progress.mistakeBank.length) || 0;
    badgeEl.textContent = count;
    if (count > 0) {
      badgeEl.classList.remove('hidden');
    } else {
      badgeEl.classList.add('hidden');
    }
  }

  function addToMistakeBank(qData, subjectKey, page) {
    if (!state.progress.mistakeBank) state.progress.mistakeBank = [];
    const exists = state.progress.mistakeBank.some(item => item.q === qData.q);
    if (!exists) {
      state.progress.mistakeBank.push({
        id: 'mb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        q: qData.q,
        options: [...qData.options],
        ans: qData.ans,
        hint: qData.hint || 'MEB Ders Kitabındaki ilgili konuyu ve örnekleri inceleyebilirsin.',
        subjectKey: subjectKey || state.currentSubjectKey || 'matematik',
        page: page || (state.currentTopic ? state.currentTopic.page : 12)
      });
      saveProgress();
      updateKumbaraBadge();
    }
  }

  // 💡 "AHA! ŞİMDİ ANLADIM!" AKILLI ÇÖZÜM KARTI
  function openSolutionCard(qData, page, onRetry, onNext) {
    const modal = document.getElementById('modal-solution-card');
    if (!modal) return;

    const correctTextEl = document.getElementById('sol-correct-text');
    if (correctTextEl) {
      correctTextEl.textContent = qData.options[qData.ans];
    }

    const hintBodyEl = document.getElementById('sol-hint-body');
    if (hintBodyEl) {
      hintBodyEl.textContent = qData.hint || 'Bu sorunun püf noktasını dikkatle inceleyerek tekrar çözebilirsin!';
    }

    const bookRefEl = document.getElementById('sol-book-ref-pill');
    if (bookRefEl) {
      bookRefEl.textContent = page ? `📖 MEB Kitabı s. ${page}` : '📖 Resmî MEB Ders Kitabı';
    }

    const closeSolution = () => {
      modal.classList.remove('open');
      SpeechService.stop();
    };

    const btnRetry = document.getElementById('btn-sol-retry');
    if (btnRetry) {
      btnRetry.onclick = () => {
        closeSolution();
        if (typeof onRetry === 'function') onRetry();
      };
    }

    const btnNext = document.getElementById('btn-sol-next');
    if (btnNext) {
      btnNext.onclick = () => {
        closeSolution();
        if (typeof onNext === 'function') onNext();
      };
    }

    const btnCloseX = document.getElementById('btn-close-solution-x');
    if (btnCloseX) {
      btnCloseX.onclick = () => {
        closeSolution();
        if (typeof onNext === 'function') onNext();
      };
    }

    modal.classList.add('open');
  }

  // 🧠 YILDIZ KUMBARASI ARENA MODALI
  let currentKumbaraIndex = 0;

  function openKumbaraArena() {
    const modal = document.getElementById('modal-kumbara-arena');
    if (!modal) return;
    currentKumbaraIndex = 0;
    renderKumbaraCurrent();
    modal.classList.add('open');
  }

  function closeKumbaraArena() {
    const modal = document.getElementById('modal-kumbara-arena');
    if (modal) modal.classList.remove('open');
    SpeechService.stop();
  }

  function renderKumbaraCurrent() {
    const activeArea = document.getElementById('kumbara-active-area');
    const emptyState = document.getElementById('kumbara-empty-state');
    const bank = state.progress.mistakeBank || [];

    if (bank.length === 0) {
      if (activeArea) activeArea.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
      updateKumbaraBadge();
      return;
    }

    if (activeArea) activeArea.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    if (currentKumbaraIndex >= bank.length) {
      currentKumbaraIndex = 0;
    }

    const item = bank[currentKumbaraIndex];
    const subjNames = {
      'turkce': 'Türkçe 📖',
      'matematik': 'Matematik 📐',
      'fenbilimleri': 'Fen Bilimleri 🔬',
      'hayatbilgisi': 'Hayat Bilgisi 🌱',
      'ingilizce': 'İngilizce 🔤'
    };

    const subjEl = document.getElementById('kumbara-q-subject');
    if (subjEl) subjEl.textContent = subjNames[item.subjectKey] || 'Ders';

    const bookEl = document.getElementById('kumbara-q-book');
    if (bookEl) bookEl.textContent = item.page ? `📖 MEB s. ${item.page}` : '📖 MEB Kitabı';

    const countEl = document.getElementById('kumbara-count-text');
    if (countEl) countEl.textContent = `Kalan Soru: ${bank.length}`;

    const qTextEl = document.getElementById('kumbara-q-text');
    if (qTextEl) qTextEl.textContent = item.q;

    // 🔊 Kumbara Sorusu Sesli Oku Butonu
    const btnReadKumbara = document.getElementById('btn-read-kumbara-q');
    if (btnReadKumbara) {
      SpeechService.resetButton(btnReadKumbara);
      btnReadKumbara.onclick = () => {
        SpeechService.toggleQuestion(item, btnReadKumbara);
      };
    }

    const optGrid = document.getElementById('kumbara-options-grid');
    if (optGrid) {
      optGrid.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];
      item.options.forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.className = `option-btn letter-btn-${letters[optIdx].toLowerCase()}`;
        btn.innerHTML = `
          <span class="option-letter">${letters[optIdx]}</span>
          <span class="option-text">${optText}</span>
        `;

        btn.onclick = () => {
          handleKumbaraAnswer(optIdx, btn, item);
        };
        optGrid.appendChild(btn);
      });
    }

    const fbBox = document.getElementById('kumbara-feedback-box');
    if (fbBox) fbBox.classList.add('hidden');
  }

  function handleKumbaraAnswer(selectedIdx, btnElement, item) {
    const allBtns = document.querySelectorAll('#kumbara-options-grid .option-btn');
    allBtns.forEach(b => b.disabled = true);

    const isCorrect = selectedIdx === item.ans;
    const fbBox = document.getElementById('kumbara-feedback-box');
    const fbTitle = document.getElementById('kumbara-feedback-title');
    const fbMsg = document.getElementById('kumbara-feedback-message');
    const btnNext = document.getElementById('btn-kumbara-next');

    if (isCorrect) {
      btnElement.classList.add('is-correct-choice');
      btnElement.innerHTML = `
        <span class="option-letter">✔</span>
        <span class="option-text">${item.options[selectedIdx]}</span>
        <span class="answer-badge badge-win">DOĞRU! +2 ⭐</span>
      `;
      playAudioChime('correct');
      triggerHaptic('success');

      // Kumbaradan temizle & +2 Yıldız ver!
      state.progress.stars += 2;
      state.progress.score += 50;
      state.progress.mistakeBank = state.progress.mistakeBank.filter(q => q.id !== item.id);
      saveProgress();
      updateHeaderStats();
      updateKumbaraBadge();

      if (fbBox) {
        fbBox.className = 'feedback-box feedback-correct';
        if (fbTitle) fbTitle.textContent = '🌟 Harika! Bu Soruyu Yendin (+2 ⭐)!';
        if (fbMsg) fbMsg.textContent = 'Doğru mantığı kavradın ve soruyu kumbarandan temizledin!';
        fbBox.classList.remove('hidden');
      }

      btnNext.textContent = state.progress.mistakeBank.length > 0 ? 'Sıradaki Kumbaraya Geç →' : 'Kumbarayı Tamamla 🎉';
      btnNext.onclick = () => {
        renderKumbaraCurrent();
      };
    } else {
      btnElement.classList.add('is-wrong-choice');
      btnElement.innerHTML = `
        <span class="option-letter">✖</span>
        <span class="option-text">${item.options[selectedIdx]}</span>
        <span class="answer-badge badge-fail">BİR DAHA DENE</span>
      `;
      playAudioChime('wrong');
      triggerHaptic('warning');

      if (fbBox) {
        fbBox.className = 'feedback-box feedback-wrong';
        if (fbTitle) fbTitle.textContent = '💡 İpucu:';
        if (fbMsg) fbMsg.textContent = item.hint || 'Soruyu tekrar dikkatle incele.';
        fbBox.classList.remove('hidden');
      }

      btnNext.textContent = '🔄 Tekrar Dene';
      btnNext.onclick = () => {
        renderKumbaraCurrent();
      };
    }
  }

  // Ekran Değiştirici
  function showScreen(screenId) {
    SpeechService.stop();
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      state.currentScreen = screenId;
    }
  }

  // Tam Ekran Yönetimi
  function requestAppFullscreen() {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen();
    }
  }

  // 🎵 ÇOK TATLI, NEŞELİ VE YUMUŞAK SES SENTEZLEYİCİSİ
  function playAudioChime(type) {
    if (!state.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'correct') {
        // Yumuşak Marimba / Çan Melodisi (C6, E6, G6, C7 - Saf Tatlı Sinüs Dalgası)
        const notes = [1046.50, 1318.51, 1567.98, 2093.00];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);

          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.35);
        });
      } else if (type === 'wrong') {
        // Yumuşak Ahşap / Baloncuk "Pop" Sesi (Cezalandırmayan, sevimli tık)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'fanfare') {
        // Neşeli 5 Notalı Başarı Jingle'ı (F4, A4, C5, D5, F5)
        const fanNotes = [349.23, 440.00, 523.25, 587.33, 698.46];
        fanNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);

          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.24, now + i * 0.1 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + (i === fanNotes.length - 1 ? 0.7 : 0.3));

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.7);
        });
      }
    } catch(e) {}
  }

  // 3. Zengin, Canlı & Karakterli 4 Ders Kartı
  function renderSubjectCards() {
    const container = document.getElementById('subjects-grid-container');
    if (!container || !window.CURRICULUM_TERM1) return;

    container.innerHTML = '';
    const subjects = window.CURRICULUM_TERM1;

    Object.keys(subjects).forEach(key => {
      if (key === 'general_exam') return;
      const subj = subjects[key];
      
      let totalTopics = 0;
      let completedTopics = 0;
      subj.themes.forEach(th => {
        th.topics.forEach(tp => {
          totalTopics++;
          if (state.progress.completedTopics[tp.id]) {
            completedTopics++;
          }
        });
      });

      const percent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      let themesHtml = '';
      subj.themes.forEach((th, i) => {
        themesHtml += `
          <div class="theme-preview-item">
            <span class="t-dot" style="background: ${subj.accent};"></span>
            <span class="t-title">${th.title}</span>
          </div>
        `;
      });

      const card = document.createElement('div');
      card.className = `subject-card subject-card-${key}`;

      card.innerHTML = `
        <div class="subject-card-top">
          <div class="subject-icon-box" style="background: ${subj.bg_light}; color: ${subj.accent};">
            ${subj.icon}
          </div>
          <span class="subject-badge-pill" style="background: ${subj.bg_light}; color: ${subj.accent};">
            ${subj.badge}
          </span>
        </div>

        <h3 class="subject-card-title">${subj.title}</h3>
        <p class="subject-card-sub">${subj.subtitle}</p>

        <!-- Üniteler Listesi -->
        <div class="subject-themes-preview">
          ${themesHtml}
        </div>

        <div class="subject-progress-container">
          <div class="subject-progress-labels">
            <span>Kazanım İlerlemesi</span>
            <span>${completedTopics}/${totalTopics} Konu (%${percent})</span>
          </div>
          <div class="subject-progress-bar-track">
            <div class="subject-progress-bar-fill" style="width: ${percent}%; background: ${subj.accent};"></div>
          </div>
        </div>

        <!-- İki İşlevsel Buton (3D Dokunmatik) -->
        <div class="subject-card-actions">
          <button class="btn-card-primary" data-action="topics" style="background: ${subj.accent};">
            <span>📖 Konu ve Etkinlikler</span>
          </button>
          <button class="btn-card-exam" data-action="exam" style="color: ${subj.accent}; border-color: ${subj.accent};">
            <span>📝 Tema Değerlendirme Sınavı</span>
          </button>
        </div>
      `;

      card.querySelector('[data-action="topics"]').addEventListener('click', (e) => {
        e.stopPropagation();
        openSubjectExplorer(key);
      });

      card.querySelector('[data-action="exam"]').addEventListener('click', (e) => {
        e.stopPropagation();
        openSubjectExplorer(key);
        const firstTheme = subj.themes[0];
        if (firstTheme && firstTheme.exam) {
          startThemeExam(firstTheme.exam);
        }
      });

      card.addEventListener('click', () => {
        openSubjectExplorer(key);
      });

      container.appendChild(card);
    });

    updateClassroomSummary();
  }

  // 4. Ünite ve Konu Gezgini (Subject Explorer)
  function openSubjectExplorer(subjectKey) {
    state.currentSubjectKey = subjectKey;
    state.currentThemeIndex = 0;
    const subj = window.CURRICULUM_TERM1[subjectKey];
    if (!subj) return;

    document.getElementById('current-subject-icon').textContent = subj.icon;
    document.getElementById('current-subject-title').textContent = subj.title;
    document.getElementById('current-subject-subtitle').textContent = subj.subtitle;

    // DERSİN BÜYÜK FİNAL SINAVI BANNER'I
    const finalExamBanner = document.getElementById('subject-final-exam-banner');
    if (finalExamBanner) {
      if (subj.final_exam) {
        finalExamBanner.style.display = 'flex';
        document.getElementById('final-exam-title').textContent = subj.final_exam.title;
        document.getElementById('final-exam-sub').textContent = `${subj.final_exam.book_ref} • Tüm üniteleri kapsayan dönem finali!`;
        
        const btnFinal = document.getElementById('btn-start-subject-final-exam');
        btnFinal.onclick = () => {
          startThemeExam(subj.final_exam);
        };
      } else {
        finalExamBanner.style.display = 'none';
      }
    }

    renderThemeTabs();
    renderTopicsList();
    showScreen('screen-topics');
  }

  function renderThemeTabs() {
    const tabsContainer = document.getElementById('theme-tabs-container');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    const subj = window.CURRICULUM_TERM1[state.currentSubjectKey];
    if (!subj) return;

    let totalTopics = 0;
    let completedTopics = 0;
    subj.themes.forEach(th => {
      th.topics.forEach(tp => {
        totalTopics++;
        if (state.progress.completedTopics[tp.id]) completedTopics++;
      });
    });
    document.getElementById('subject-progress-count').textContent = `${completedTopics} / ${totalTopics} Konu`;

    subj.themes.forEach((th, idx) => {
      const tab = document.createElement('button');
      tab.className = 'theme-tab-item' + (idx === state.currentThemeIndex ? ' active' : '');
      tab.innerHTML = `<span>${th.title}</span>`;
      tab.addEventListener('click', () => {
        state.currentThemeIndex = idx;
        renderThemeTabs();
        renderTopicsList();
      });
      tabsContainer.appendChild(tab);
    });
  }

  function renderTopicsList() {
    const listContainer = document.getElementById('topics-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const subj = window.CURRICULUM_TERM1[state.currentSubjectKey];
    if (!subj || !subj.themes[state.currentThemeIndex]) return;

    const currentTheme = subj.themes[state.currentThemeIndex];

    // Ünite Sınavı Banner'ı
    const examBanner = document.getElementById('unit-exam-banner');
    if (currentTheme.exam) {
      examBanner.style.display = 'flex';
      document.getElementById('exam-banner-title').textContent = currentTheme.exam.title;
      document.getElementById('exam-banner-ref').textContent = `Resmî ${currentTheme.exam.book_ref} Soruları ile Kendini Dene!`;
      
      const btnExam = document.getElementById('btn-start-unit-exam');
      btnExam.onclick = () => {
        startThemeExam(currentTheme.exam);
      };
    } else {
      examBanner.style.display = 'none';
    }

    // Konuları Render Et
    currentTheme.topics.forEach((topic, idx) => {
      const isCompleted = state.progress.completedTopics[topic.id];
      const card = document.createElement('div');
      card.className = 'topic-card-item';

      card.innerHTML = `
        <div>
          <div class="topic-meta-row">
            <span class="topic-page-pill">📖 Kitap Sayfa ${topic.page}</span>
            <span class="topic-status-pill">${isCompleted ? '✅ Tamamlandı' : '⭐ Yeni'}</span>
          </div>
          <h4 class="topic-name">${idx + 1}. ${topic.title}</h4>
          <p class="topic-desc">${topic.desc}</p>
        </div>
        <div class="topic-card-footer">
          <button class="btn-topic-fact" data-topic-id="${topic.id}">
            <span>💡 3 Adımlı Hap Bilgi</span>
          </button>
          <button class="btn-start-topic" style="background: ${subj.accent};">
            <span>Çalış & Oyna</span>
            <span>▶</span>
          </button>
        </div>
      `;

      // Hap Bilgi Kartı Butonu (3 Adımlı Gerçek Öğretici Modal)
      card.querySelector('.btn-topic-fact').addEventListener('click', (e) => {
        e.stopPropagation();
        openFactCard(topic);
      });

      // Çalış & Oyna Butonu
      card.querySelector('.btn-start-topic').addEventListener('click', (e) => {
        e.stopPropagation();
        startTopicQuiz(topic);
      });

      listContainer.appendChild(card);
    });
  }

  // 💡 3 ADIMLI HAP BİLGİ & KEŞFET KARTI MODALI (Overlay Popup)
  function openFactCard(topic) {
    state.currentTopic = topic;
    const fact = topic.fact_card || {
      title: topic.title,
      emoji: '💡',
      rule: topic.desc,
      example: 'Ders kitabındaki ilgili sayfadaki örnekleri dikkatle incele.',
      tip: 'Sınavda soruyu sonuna kadar oku ve seçenekleri ele!'
    };

    const emojiEl = document.getElementById('fact-card-emoji');
    if (emojiEl) emojiEl.textContent = fact.emoji || '💡';

    const titleEl = document.getElementById('fact-card-title');
    if (titleEl) titleEl.textContent = fact.title || topic.title;

    const refEl = document.getElementById('fact-book-page-ref');
    if (refEl) refEl.textContent = `📖 MEB Kitabı s. ${topic.page}`;

    // 3 Kartı Doldur (Öğretici & Somut İçerik)
    const ruleEl = document.getElementById('fact-card-rule');
    if (ruleEl) ruleEl.textContent = fact.rule || topic.desc;

    const exampleEl = document.getElementById('fact-card-example');
    if (exampleEl) exampleEl.textContent = fact.example || 'Ders kitabındaki etkinlikleri adım adım uygula.';

    const tipEl = document.getElementById('fact-card-tip');
    if (tipEl) tipEl.textContent = fact.tip || 'Sınavda dikkatli ol ve acele etme!';

    const modal = document.getElementById('modal-fact-card');
    if (modal) {
      modal.classList.add('open');
    }

    const btnStart = document.getElementById('btn-fact-start-quiz');
    btnStart.onclick = () => {
      closeFactCard();
      startTopicQuiz(topic);
    };

    const btnClose = document.getElementById('btn-close-fact');
    btnClose.onclick = closeFactCard;

    const btnCloseX = document.getElementById('btn-close-fact-x');
    if (btnCloseX) btnCloseX.onclick = closeFactCard;
  }

  function closeFactCard() {
    const modal = document.getElementById('modal-fact-card');
    if (modal) {
      modal.classList.remove('open');
    }
  }

  // 5. İnteraktif Soru ve Etkinlik Ekranı (Konu Bazlı Quiz)
  function startTopicQuiz(topic) {
    state.currentTopic = topic;
    state.currentTaskIndex = 0;
    state.quizScore = 0;
    state.quizCorrectCount = 0;
    state.streak = 0;

    document.getElementById('quiz-topic-title').textContent = topic.title;
    document.getElementById('quiz-book-page').textContent = `📖 Kitap Sayfa ${topic.page}`;
    
    renderCurrentQuestion();
    showScreen('screen-quiz');
  }

  function renderCurrentQuestion() {
    const topic = state.currentTopic;
    if (!topic || !topic.tasks || topic.tasks.length === 0) return;

    const task = topic.tasks[state.currentTaskIndex];
    const totalTasks = topic.tasks.length;

    document.getElementById('quiz-progress-text').textContent = `Soru ${state.currentTaskIndex + 1} / ${totalTasks}`;
    const fillPercent = ((state.currentTaskIndex + 1) / totalTasks) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${fillPercent}%`;

document.getElementById('quiz-question-text').textContent = task.q;
    document.getElementById('quiz-streak-badge').textContent = `🔥 ${state.streak} Seri`;

    // 🔊 Sesli Oku Butonu
    const btnReadQuiz = document.getElementById('btn-read-quiz-q');
    if (btnReadQuiz) {
      SpeechService.resetButton(btnReadQuiz);
      btnReadQuiz.onclick = () => {
        SpeechService.toggleQuestion(task, btnReadQuiz);
      };
    }

    const feedbackBox = document.getElementById('quiz-feedback-box');
    feedbackBox.classList.add('hidden');

    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];

    task.options.forEach((optText, optIdx) => {
      const btn = document.createElement('button');
      btn.className = `option-btn letter-btn-${letters[optIdx].toLowerCase()}`;
      btn.innerHTML = `
        <span class="option-letter">${letters[optIdx]}</span>
        <span class="option-text">${optText}</span>
      `;

      btn.addEventListener('click', () => {
        handleTaskAnswer(optIdx, btn, task);
      });

      optionsContainer.appendChild(btn);
    });
  }

  // ÇOK BELİRGİN & CANLI DOĞRU/YANLIŞ GERİBİLDİRİMİ
  function handleTaskAnswer(selectedIdx, btnElement, task) {
    const allBtns = document.querySelectorAll('#quiz-options-container .option-btn');
    allBtns.forEach(b => b.disabled = true);

    const isCorrect = selectedIdx === task.ans;
    const feedbackBox = document.getElementById('quiz-feedback-box');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackMsg = document.getElementById('feedback-message');
    const feedbackIcon = document.getElementById('feedback-icon');

    if (isCorrect) {
      btnElement.classList.add('is-correct-choice');
      btnElement.innerHTML = `
        <span class="option-letter">✔</span>
        <span class="option-text">${task.options[selectedIdx]}</span>
        <span class="answer-badge badge-win">DOĞRU! 🎉</span>
      `;

      state.quizCorrectCount++;
      state.streak++;
      state.quizScore += 25;
      playAudioChime('correct');
      triggerHaptic('success');

      feedbackIcon.textContent = '🌟';
      feedbackTitle.textContent = 'Mükemmel, Doğru Cevap!';
      feedbackMsg.textContent = task.hint || 'Bu kazanımı harika bir şekilde anladın, tebrikler!';
      feedbackBox.className = 'feedback-box feedback-correct';
    } else {
      btnElement.classList.add('is-wrong-choice');
      btnElement.innerHTML = `
        <span class="option-letter">✖</span>
        <span class="option-text">${task.options[selectedIdx]}</span>
        <span class="answer-badge badge-fail">YANLIŞ</span>
      `;

      // Gerçek doğru şıkkı parlat
      const correctBtn = allBtns[task.ans];
      if (correctBtn) {
        correctBtn.classList.add('is-correct-reveal');
        correctBtn.innerHTML = `
          <span class="option-letter">✔</span>
          <span class="option-text">${task.options[task.ans]}</span>
          <span class="answer-badge badge-win">DOĞRU CEVAP</span>
        `;
      }

      state.streak = 0;
      playAudioChime('wrong');
      triggerHaptic('warning');

      // 🧠 Yıldız Kumbarasına Kaydet
      addToMistakeBank(task, state.currentSubjectKey, state.currentTopic ? state.currentTopic.page : 12);

      feedbackIcon.textContent = '💡';
      feedbackTitle.textContent = 'Önemli Hatırlatma:';
      feedbackMsg.textContent = task.hint || 'Üzülme, dikkatini toplayarak bir dahaki sefere doğru yapacaksın!';
      feedbackBox.className = 'feedback-box feedback-wrong';

      // 💡 "Aha! Şimdi Anladım!" Çözüm Kartını 650ms sonra aç
      setTimeout(() => {
        openSolutionCard(task, state.currentTopic ? state.currentTopic.page : 12,
          // Tekrar Dene
          () => {
            renderCurrentQuestion();
          },
          // Sonraki Soru
          () => {
            if (state.currentTaskIndex < state.currentTopic.tasks.length - 1) {
              state.currentTaskIndex++;
              renderCurrentQuestion();
            } else {
              finishTopicQuiz();
            }
          }
        );
      }, 650);
    }

    feedbackBox.classList.remove('hidden');

    const btnNext = document.getElementById('btn-quiz-next');
    btnNext.onclick = () => {
      if (state.currentTaskIndex < state.currentTopic.tasks.length - 1) {
        state.currentTaskIndex++;
        renderCurrentQuestion();
      } else {
        finishTopicQuiz();
      }
    };
  }

  function finishTopicQuiz() {
    const topic = state.currentTopic;
    const earnedStars = 3;
    const bonusScore = 100;

    state.progress.stars += earnedStars;
    state.progress.score += state.quizScore + bonusScore;
    state.progress.completedTopics[topic.id] = {
      stars: earnedStars,
      score: state.quizScore + bonusScore,
      completedAt: new Date().toISOString()
    };
    saveProgress();

    TelemetryService.sendEvent('Konu Bitirme', {
      topic_title: topic.title,
      subject: state.currentSubjectKey,
      quiz_score: state.quizScore + bonusScore,
      correct_count: state.quizCorrectCount
    });

    document.getElementById('result-title').textContent = `Tebrikler ${state.studentProfile.name}! 🎉`;
    document.getElementById('result-subtitle').textContent = `"${topic.title}" konusunu başarıyla tamamladın!`;
    document.getElementById('result-correct').textContent = `${state.quizCorrectCount} / ${topic.tasks.length}`;
    document.getElementById('result-score').textContent = `+${state.quizScore + bonusScore}`;
    document.getElementById('result-earned-stars').textContent = `+${earnedStars}`;

    playAudioChime('fanfare');
    showScreen('screen-results');
  }

  // 6. MEB TEMA VE GENEL DEĞERLENDİRME SINAVI MOTORU
  function startThemeExam(examData) {
    state.currentExam = examData;
    state.currentExamQIndex = 0;
    state.examScore = 0;
    state.examCorrectCount = 0;
    state.examWrongCount = 0;

    document.getElementById('exam-current-title').textContent = examData.title;
    document.getElementById('exam-book-badge').textContent = examData.book_ref;

    renderExamQuestion();
    showScreen('screen-exam');
  }

  function renderExamQuestion() {
    const exam = state.currentExam;
    const qIndex = state.currentExamQIndex;
    const qData = exam.questions[qIndex];
    const totalQ = exam.questions.length;

    document.getElementById('exam-counter-text').textContent = `Soru ${qIndex + 1} / ${totalQ}`;
    document.getElementById('exam-score-live').textContent = `Doğru: ${state.examCorrectCount}`;
document.getElementById('exam-question-text').textContent = qData.q;

    // 🔊 Sınav Sorusu Sesli Oku Butonu
    const btnReadExam = document.getElementById('btn-read-exam-q');
    if (btnReadExam) {
      SpeechService.resetButton(btnReadExam);
      btnReadExam.onclick = () => {
        SpeechService.toggleQuestion(qData, btnReadExam);
      };
    }

    const container = document.getElementById('exam-options-container');
    container.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    qData.options.forEach((optText, optIdx) => {
      const btn = document.createElement('button');
      btn.className = `option-btn letter-btn-${letters[optIdx].toLowerCase()}`;
      btn.innerHTML = `
        <span class="option-letter">${letters[optIdx]}</span>
        <span class="option-text">${optText}</span>
      `;

      btn.addEventListener('click', () => {
        handleExamAnswer(optIdx, btn, qData);
      });

      container.appendChild(btn);
    });
  }

  function handleExamAnswer(selectedIdx, btnElement, qData) {
    const allBtns = document.querySelectorAll('#exam-options-container .option-btn');
    allBtns.forEach(b => b.disabled = true);

    const isCorrect = selectedIdx === qData.ans;
    if (isCorrect) {
      btnElement.classList.add('is-correct-choice');
      btnElement.innerHTML = `
        <span class="option-letter">✔</span>
        <span class="option-text">${qData.options[selectedIdx]}</span>
        <span class="answer-badge badge-win">DOĞRU! 🎉</span>
      `;
      state.examCorrectCount++;
      playAudioChime('correct');
      triggerHaptic('success');

      setTimeout(() => {
        if (state.currentExamQIndex < state.currentExam.questions.length - 1) {
          state.currentExamQIndex++;
          renderExamQuestion();
        } else {
          finishThemeExam();
        }
      }, 1000);
    } else {
      btnElement.classList.add('is-wrong-choice');
      btnElement.innerHTML = `
        <span class="option-letter">✖</span>
        <span class="option-text">${qData.options[selectedIdx]}</span>
        <span class="answer-badge badge-fail">YANLIŞ</span>
      `;

      const correctBtn = allBtns[qData.ans];
      if (correctBtn) {
        correctBtn.classList.add('is-correct-reveal');
        correctBtn.innerHTML = `
          <span class="option-letter">✔</span>
          <span class="option-text">${qData.options[qData.ans]}</span>
          <span class="answer-badge badge-win">DOĞRU CEVAP</span>
        `;
      }
      state.examWrongCount++;
      playAudioChime('wrong');
      triggerHaptic('warning');

      // 🧠 Yıldız Kumbarasına Kaydet
      addToMistakeBank(qData, state.currentSubjectKey, state.currentExam ? state.currentExam.page : 12);

      // 💡 Çözüm Kartı Aç
      setTimeout(() => {
        openSolutionCard(qData, state.currentExam ? state.currentExam.page : 12,
          // Tekrar Dene
          () => {
            renderExamQuestion();
          },
          // Sonraki Soru
          () => {
            if (state.currentExamQIndex < state.currentExam.questions.length - 1) {
              state.currentExamQIndex++;
              renderExamQuestion();
            } else {
              finishThemeExam();
            }
          }
        );
      }, 650);
    }
  }

  function finishThemeExam() {
    const exam = state.currentExam;
    const totalQ = exam.questions.length;
    const finalScore = Math.round((state.examCorrectCount / totalQ) * 100);

    // Hile Önleme / Deneme Geçmişi Kaydı (Attempt History)
    const examKey = exam.title;
    const prevExam = state.progress.completedExams[examKey] || null;
    const attemptNumber = prevExam ? (prevExam.attempts + 1) : 1;
    const history = (prevExam && prevExam.history) ? [...prevExam.history] : [];
    
    const nowStr = new Date().toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    history.push({
      attempt: attemptNumber,
      score: finalScore,
      correct: state.examCorrectCount,
      wrong: state.examWrongCount,
      date: nowStr
    });

    state.progress.completedExams[examKey] = {
      title: examKey,
      attempts: attemptNumber,
      firstScore: prevExam ? prevExam.firstScore : finalScore,
      firstDate: prevExam ? prevExam.firstDate : nowStr,
      bestScore: prevExam ? Math.max(prevExam.bestScore, finalScore) : finalScore,
      lastScore: finalScore,
      lastDate: nowStr,
      history: history
    };

    state.progress.score += finalScore * 2;
    state.progress.stars += (finalScore >= 70 ? 5 : 2);
    saveProgress();

    TelemetryService.sendEvent('MEB Tema Sınavı', {
      exam_title: exam.title,
      score: finalScore,
      correct_count: state.examCorrectCount,
      wrong_count: state.examWrongCount,
      attempt_number: attemptNumber
    });

    // Karne Ekranını Doldur
    document.getElementById('report-exam-title').textContent = exam.title;
    document.getElementById('report-date').textContent = new Date().toLocaleDateString('tr-TR');
    
    // Öğrenci Kimliği
    const rAvatar = document.getElementById('report-student-avatar');
    if (rAvatar) rAvatar.textContent = state.studentProfile.avatar || '👧';
    
    const rName = document.getElementById('report-student-name');
    if (rName) rName.textContent = state.studentProfile.name;

    const rClass = document.getElementById('report-student-class');
    if (rClass) rClass.textContent = `${state.studentProfile.class || '3-A'} Sınıfı • Okul No: ${state.studentProfile.no || '—'}`;

    // Not ve İstatistikler
    document.getElementById('report-score-num').textContent = finalScore;
    document.getElementById('report-correct-val').textContent = state.examCorrectCount;
    document.getElementById('report-wrong-val').textContent = state.examWrongCount;

    // Deneme & Hile Denetim Rozeti
    const attemptBadge = document.getElementById('report-attempt-badge');
    if (attemptBadge) attemptBadge.textContent = `📝 Deneme #${attemptNumber}`;

    const attemptComp = document.getElementById('report-attempt-comparison');
    if (attemptComp) {
      if (attemptNumber > 1) {
        attemptComp.textContent = `İlk Not: ${prevExam.firstScore} | En Yüksek: ${Math.max(prevExam.bestScore, finalScore)}`;
      } else {
        attemptComp.textContent = `İlk Çözüm Kaydedildi`;
      }
    }

    const historyList = document.getElementById('report-audit-history');
    if (historyList) {
      historyList.innerHTML = '';
      if (history.length > 1) {
        history.slice(-3).forEach(item => {
          const div = document.createElement('div');
          div.className = 'audit-item';
          div.innerHTML = `<span>Deneme ${item.attempt}: <strong>${item.score} Puan</strong> (${item.correct}D / ${item.wrong}Y)</span><span>${item.date}</span>`;
          historyList.appendChild(div);
        });
      }
    }

    let starsGrade = '⭐';
    let teacherNote = '';
    if (finalScore >= 85) {
      starsGrade = '⭐⭐⭐⭐⭐';
      teacherNote = `"Tebrikler sevgili ${state.studentProfile.name}! 2026-2027 MEB müfredat kazanımlarını eksiksiz özümsedin. Bu sınavın gerçek yıldızı oldun!"`;
    } else if (finalScore >= 60) {
      starsGrade = '⭐⭐⭐';
      teacherNote = `"Gayet başarılı ${state.studentProfile.name}! Birkaç sorudaki dikkatsizliğini giderirsen tam 100 puan alabilirsin. Tebrik ederim!"`;
    } else {
      starsGrade = '⭐⭐';
      teacherNote = `"Konuyu tekrar inceleyip bu sınava yeniden girmelisin sevgili ${state.studentProfile.name}. İnanırsan başaracaksın!"`;
    }

    document.getElementById('report-stars-val').textContent = starsGrade;
    document.getElementById('report-teacher-note').textContent = teacherNote;

    playAudioChime('fanfare');
    showScreen('screen-report-card');
  }

  
  // ==========================================================================
  // 🌟 VELİ & ÖĞRETMEN TAKİP / TELEMETRİ SERVİSİ (Google E-Tablolar & Cihaz Denetimi)
  // ==========================================================================
  const TelemetryService = {
    getUrl: function() {
      return localStorage.getItem('maarif_telemetry_webhook_url') || '';
    },
    setUrl: function(url) {
      localStorage.setItem('maarif_telemetry_webhook_url', url.trim());
    },
    sendEvent: function(eventType, eventData) {
      const payload = {
        event: eventType,
        timestamp: new Date().toLocaleString('tr-TR'),
        student_name: state.studentProfile.name || 'Öğrenci',
        student_class: state.studentProfile.class || '3-A',
        student_no: state.studentProfile.no || '—',
        avatar: state.studentProfile.avatar || '👧',
        total_stars: state.progress.stars || 0,
        total_score: state.progress.score || 0,
        ...eventData
      };

      // 1. Cihaz içi denetim günlüğüne kaydet (Local Activity Log)
      try {
        const logs = JSON.parse(localStorage.getItem('maarif_activity_logs') || '[]');
        logs.unshift(payload);
        if (logs.length > 150) logs.pop();
        localStorage.setItem('maarif_activity_logs', JSON.stringify(logs));
      } catch(e) {}

      // 2. Google E-Tablo Webhook'u tanımlıysa ve internet varsa sessizce gönder
      const url = this.getUrl();
      if (url && navigator.onLine) {
        try {
          fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(err => {
            console.log('Telemetry sync notice:', err);
          });
        } catch(e) {}
      }
    },
    exportCsv: function() {
      try {
        const logs = JSON.parse(localStorage.getItem('maarif_activity_logs') || '[]');
        if (logs.length === 0) {
          alert('Henüz indirilmeye hazır bir sınav kaydı bulunmuyor.');
          return;
        }

        let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Turkish support
        csvContent += 'Tarih / Saat;Öğrenci Adı Soyadı;Sınıf / Şube;Okul No;Faaliyet Türü;Ders / Sınav / Konu;Puan;Doğru;Yanlış;Deneme #;Toplam Yıldız\n';

        logs.forEach(log => {
          const row = [
            `"${log.timestamp || ''}"`,
            `"${log.student_name || ''}"`,
            `"${log.student_class || ''}"`,
            `"${log.student_no || ''}"`,
            `"${log.event || ''}"`,
            `"${log.exam_title || log.topic_title || log.action || ''}"`,
            `"${log.score !== undefined ? log.score : (log.quiz_score !== undefined ? log.quiz_score : '')}"`,
            `"${log.correct_count !== undefined ? log.correct_count : ''}"`,
            `"${log.wrong_count !== undefined ? log.wrong_count : ''}"`,
            `"${log.attempt_number ? 'Deneme ' + log.attempt_number : '1'}"`,
            `"${log.total_stars || 0}"`
          ];
          csvContent += row.join(';') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Maarif_Yildizi_3_Ogrenci_Raporu_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
      } catch(e) {
        alert('CSV dışa aktarma hatası: ' + e);
      }
    }
  };

  function openParentDashboardModal() {
    const modal = document.getElementById('modal-parent-dashboard');
    if (!modal) return;

    const urlInput = document.getElementById('input-telemetry-url');
    if (urlInput) {
      urlInput.value = TelemetryService.getUrl();
    }

    renderParentLogs();
    modal.classList.add('open');
  }

  function closeParentDashboardModal() {
    const modal = document.getElementById('modal-parent-dashboard');
    if (modal) modal.classList.remove('open');
  }

  function renderParentLogs() {
    const listEl = document.getElementById('parent-logs-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const logs = JSON.parse(localStorage.getItem('maarif_activity_logs') || '[]');
    if (logs.length === 0) {
      listEl.innerHTML = '<div class="no-logs-msg">Henüz bir sınav kaydı bulunmuyor. Bir öğrenci sınava girdiğinde notları burada listelenecektir.</div>';
      return;
    }

    logs.slice(0, 30).forEach(log => {
      const item = document.createElement('div');
      item.className = 'parent-log-row';
      const scoreTxt = log.score !== undefined ? `${log.score} Puan` : (log.quiz_score !== undefined ? `${log.quiz_score} Puan` : 'Kayıt');
      const titleTxt = log.exam_title || log.topic_title || log.action || 'Etkinlik';
      
      item.innerHTML = `
        <div class="log-row-left">
          <span class="log-avatar">${log.avatar || '👧'}</span>
          <div class="log-text-meta">
            <strong class="log-student-name">${log.student_name} (${log.student_class} • No: ${log.student_no})</strong>
            <span class="log-activity-info">${titleTxt} • <small>${log.timestamp}</small></span>
          </div>
        </div>
        <div class="log-row-right">
          <span class="log-score-pill">${scoreTxt}</span>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  // 7. ÖĞRENCİ KAYIT & PROFİL YÖNETİMİ
  let tempSelectedAvatar = '👧';

  function initStudentProfileModal() {
    // Akıllı Klavye Açılma / Kapanma Algılayıcı (Modal Centering & Sliding)
    const registerModal = document.getElementById('modal-student-register');
    const registerInputs = document.querySelectorAll('#modal-student-register input');

    function onKeyboardShow() {
      if (registerModal && registerModal.classList.contains('open')) {
        registerModal.classList.add('keyboard-open');
        setTimeout(() => {
          if (document.activeElement && document.activeElement.tagName === 'INPUT') {
            document.activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
    }

    function onKeyboardHide() {
      if (registerModal) {
        registerModal.classList.remove('keyboard-open');
      }
    }

    registerInputs.forEach(input => {
      input.addEventListener('focus', onKeyboardShow);
      input.addEventListener('blur', () => {
        setTimeout(() => {
          const isAnotherInputFocused = Array.from(registerInputs).some(i => i === document.activeElement);
          if (!isAnotherInputFocused) {
            onKeyboardHide();
          }
        }, 100);
      });
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (window.visualViewport.height < window.innerHeight * 0.75) {
          onKeyboardShow();
        } else {
          onKeyboardHide();
        }
      });
    }

    const modal = document.getElementById('modal-student-register');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal && state.studentProfile.isRegistered) {
          closeStudentRegisterModal();
        }
      });
    }

    // Avatar Seçimi Dinleyicileri
    const avatarOpts = document.querySelectorAll('#avatar-picker-grid .avatar-opt');
    avatarOpts.forEach(btn => {
      btn.addEventListener('click', () => {
        avatarOpts.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        tempSelectedAvatar = btn.dataset.avatar || '👧';
      });
    });

    // Enter tuşu ile kaydetme & Sanal klavyede ortalama
    ['input-student-name', 'input-student-class', 'input-student-no'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            saveStudentProfileFromModal();
          }
        });
        el.addEventListener('focus', () => {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        });
      }
    });

    // Kaydet Butonu
    const btnSave = document.getElementById('btn-save-profile');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        saveStudentProfileFromModal();
      });
    }

    // Vazgeç Butonu
    const btnCancel = document.getElementById('btn-cancel-profile');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        if (state.studentProfile.isRegistered) {
          closeStudentRegisterModal();
        }
      });
    }

    // Header Profil Tıklaması
    const headerProfile = document.getElementById('header-profile-card');
    if (headerProfile) {
      headerProfile.addEventListener('click', () => {
        openStudentRegisterModal(false);
      });
    }

    // Splash Profil Butonu
    const btnSplashProfile = document.getElementById('btn-splash-profile');
    if (btnSplashProfile) {
      btnSplashProfile.addEventListener('click', () => {
        openStudentRegisterModal(!state.studentProfile.isRegistered);
      });
    }

    // 👑 GENEL SINAV BUTONU DİNLEYİCİSİ
    const btnGrandExam = document.getElementById('btn-start-general-exam');
    if (btnGrandExam) {
      btnGrandExam.addEventListener('click', () => {
        if (window.CURRICULUM_TERM1 && window.CURRICULUM_TERM1.general_exam) {
          startThemeExam(window.CURRICULUM_TERM1.general_exam);
        }
      });
    }
  }

  function openStudentRegisterModal(isFirstTime = false) {
    const modal = document.getElementById('modal-student-register');
    if (!modal) return;

    const nameInput = document.getElementById('input-student-name');
    const classInput = document.getElementById('input-student-class');
    const noInput = document.getElementById('input-student-no');
    const btnCancel = document.getElementById('btn-cancel-profile');

    nameInput.value = state.studentProfile.name || '';
    nameInput.style.borderColor = '';
    nameInput.style.boxShadow = '';
    classInput.value = state.studentProfile.class || '3-A';
    noInput.value = state.studentProfile.no || '';

    tempSelectedAvatar = state.studentProfile.avatar || '👧';
    document.querySelectorAll('#avatar-picker-grid .avatar-opt').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.avatar === tempSelectedAvatar);
    });

    const isMandatory = !state.studentProfile.isRegistered || isFirstTime;
    if (btnCancel) {
      btnCancel.style.display = isMandatory ? 'none' : 'inline-block';
    }

    modal.classList.add('open');
    if (window.innerWidth > 600) {
      setTimeout(() => {
        if (nameInput) nameInput.focus();
      }, 150);
    }
  }

  function closeStudentRegisterModal() {
    const modal = document.getElementById('modal-student-register');
    if (modal) modal.classList.remove('open');
  }

  function saveStudentProfileFromModal() {
    const nameInput = document.getElementById('input-student-name');
    const classInput = document.getElementById('input-student-class');
    const noInput = document.getElementById('input-student-no');

    const enteredName = nameInput.value.trim();
    if (!enteredName || enteredName.length < 2) {
      nameInput.style.borderColor = '#EF4444';
      nameInput.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.7)';
      nameInput.focus();
      alert('Lütfen geçerli bir Öğrenci Adı ve Soyadı giriniz!');
      return;
    }

    state.studentProfile.name = enteredName;
    state.studentProfile.class = classInput.value.trim() || '3-A';
    state.studentProfile.no = noInput.value.trim() || '—';
    state.studentProfile.avatar = tempSelectedAvatar || '👧';
    state.studentProfile.isRegistered = true;

    localStorage.setItem('maarif_student_registered_2026', 'true');
    saveProgress();
    updateStudentProfileDisplay();
    closeStudentRegisterModal();

    TelemetryService.sendEvent('Öğrenci Kaydı', { action: 'Profil Oluşturuldu / Güncellendi' });

    // Eğer splash ekranındaysa ana menüye geçir
    if (state.currentScreen === 'screen-splash') {
      renderSubjectCards();
      showScreen('screen-menu');
    }
  }

  // 8. Genel Olay Dinleyicileri
  function initEventListeners() {
    initStudentProfileModal();

    // Splash Başlat Butonu
    const btnStart = document.getElementById('btn-start-app');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        requestAppFullscreen();
        if (!state.studentProfile.isRegistered) {
          openStudentRegisterModal(true);
        } else {
          renderSubjectCards();
          showScreen('screen-menu');
        }
      });
    }

    // İlk dokunuşta tam ekran
    window.addEventListener('touchstart', function onFirstTouch() {
      requestAppFullscreen();
      window.removeEventListener('touchstart', onFirstTouch);
    }, { passive: true });

    // Tam Ekran Butonu
    const btnFs = document.getElementById('btn-fullscreen');
    if (btnFs) {
      btnFs.addEventListener('click', () => {
        requestAppFullscreen();
      });
    }

    // Ses Butonu
    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        btnSound.textContent = state.soundEnabled ? '🔊' : '🔇';
      });
    }

    // Derslere geri dön
    const btnBackSubjects = document.getElementById('btn-back-to-subjects');
    if (btnBackSubjects) {
      btnBackSubjects.addEventListener('click', () => {
        renderSubjectCards();
        showScreen('screen-menu');
      });
    }

    // Konu listesine geri dön
    const btnBackTopics = document.getElementById('btn-back-to-topics');
    if (btnBackTopics) {
      btnBackTopics.addEventListener('click', () => {
        renderThemeTabs();
        renderTopicsList();
        showScreen('screen-topics');
      });
    }

    // Sınavdan çıkış
    const btnCancelExam = document.getElementById('btn-cancel-exam');
    if (btnCancelExam) {
      btnCancelExam.addEventListener('click', () => {
        renderThemeTabs();
        renderTopicsList();
        showScreen('screen-topics');
      });
    }

    // Karneyi kapat & Sınavdan dön
    const handleCloseReport = () => {
      if (state.currentSubjectKey && window.CURRICULUM_TERM1 && window.CURRICULUM_TERM1[state.currentSubjectKey]) {
        renderThemeTabs();
        renderTopicsList();
        showScreen('screen-topics');
      } else {
        renderSubjects();
        showScreen('screen-menu');
      }
    };

    const btnCloseReport = document.getElementById('btn-close-report');
    if (btnCloseReport) {
      btnCloseReport.addEventListener('click', handleCloseReport);
    }
    const btnCloseReportX = document.getElementById('btn-close-report-x');
    if (btnCloseReportX) {
      btnCloseReportX.addEventListener('click', handleCloseReport);
    }

    // Sonuç Ekranı Butonları (Quiz bitimi)
    const handleCloseResults = () => {
      renderThemeTabs();
      renderTopicsList();
      showScreen('screen-topics');
    };

    const btnResBack = document.getElementById('btn-result-back-topics');
    if (btnResBack) {
      btnResBack.addEventListener('click', handleCloseResults);
    }
    const btnResCloseX = document.getElementById('btn-close-results-x');
    if (btnResCloseX) {
      btnResCloseX.addEventListener('click', handleCloseResults);
    }

    const btnResNext = document.getElementById('btn-result-next-topic');
    if (btnResNext) {
      btnResNext.addEventListener('click', () => {
        const subj = window.CURRICULUM_TERM1[state.currentSubjectKey];
        const currentTheme = subj.themes[state.currentThemeIndex];
        const currentIdx = currentTheme.topics.findIndex(t => t.id === state.currentTopic.id);
        
        if (currentIdx >= 0 && currentIdx < currentTheme.topics.length - 1) {
          startTopicQuiz(currentTheme.topics[currentIdx + 1]);
        } else {
          renderThemeTabs();
          renderTopicsList();
          showScreen('screen-topics');
        }
      });
    }


    // 🧠 Yıldız Kumbarası Butonları
    const btnKumbara = document.getElementById('btn-kumbara');
    if (btnKumbara) {
      btnKumbara.addEventListener('click', () => {
        openKumbaraArena();
      });
    }

    const btnCloseKumbaraX = document.getElementById('btn-close-kumbara-x');
    if (btnCloseKumbaraX) {
      btnCloseKumbaraX.addEventListener('click', closeKumbaraArena);
    }

    const btnCloseKumbaraBottom = document.getElementById('btn-close-kumbara-bottom');
    if (btnCloseKumbaraBottom) {
      btnCloseKumbaraBottom.addEventListener('click', closeKumbaraArena);
    }

    // Başarılar ekranı
    const btnBadges = document.getElementById('btn-badges-nav');
    if (btnBadges) {
      btnBadges.addEventListener('click', () => {
        renderBadges();
        showScreen('screen-badges');
      });
    }

    const btnCloseBadges = document.getElementById('btn-close-badges');
    if (btnCloseBadges) {
      btnCloseBadges.addEventListener('click', () => {
        showScreen('screen-menu');
      });
    }
  }

  function getTotalTopicsCount() {
    let count = 0;
    if (window.CURRICULUM_TERM1) {
      Object.keys(window.CURRICULUM_TERM1).forEach(k => {
        if (k === 'general_exam') return;
        const subj = window.CURRICULUM_TERM1[k];
        if (subj.themes) {
          subj.themes.forEach(t => {
            if (t.topics) count += t.topics.length;
          });
        }
      });
    }
    return count || 69;
  }

  function renderBadges() {
    const completedCount = Object.keys(state.progress.completedTopics).length;
    const totalTopics = getTotalTopicsCount();
    const badgesEl = document.getElementById('badges-total-topics');
    if (badgesEl) badgesEl.textContent = `${completedCount} / ${totalTopics}`;
    document.getElementById('badges-total-stars').textContent = state.progress.stars;
    document.getElementById('badges-total-score').textContent = state.progress.score;

    const badges = [
      { name: 'İlk Adım', desc: 'İlk MEB konusunu tamamla', icon: '🌱', req: completedCount >= 1 },
      { name: 'Matematik Kaşifi', desc: '5 Matematik konusunu bitir', icon: '📐', req: completedCount >= 5 },
      { name: 'Türkçe Kitap Kurdu', desc: '5 Türkçe konusunu bitir', icon: '📖', req: completedCount >= 5 },
      { name: 'Sınav Şampiyonu', desc: 'İlk Tema Sınavından 80+ al', icon: '🏆', req: Object.keys(state.progress.completedExams).length >= 1 },
      { name: 'Yıldız Koleksiyoncusu', desc: '30 yıldız kazan', icon: '⭐', req: state.progress.stars >= 30 },
      { name: '1. Dönem Onur Belgesi', desc: `Tüm ${totalTopics} MEB konusunu tamamla`, icon: '👑', req: completedCount >= totalTopics }
    ];

    const container = document.getElementById('badges-container');
    if (!container) return;
    container.innerHTML = '';

    badges.forEach(b => {
      const bCard = document.createElement('div');
      bCard.className = 'badge-item-card' + (b.req ? '' : ' locked');
      bCard.innerHTML = `
        <div class="badge-icon-box">${b.icon}</div>
        <div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-condition">${b.desc}</div>
        </div>
      `;
      container.appendChild(bCard);
    });
  }

  // Başlatma
  document.addEventListener('DOMContentLoaded', () => {
    loadSavedProgress();
    initEventListeners();
  });

})();
