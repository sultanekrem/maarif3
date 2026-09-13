/* ============================================================
   MAARIF YILDIZI 3 — Comprehensive App Controller (v73)
   Dual-Voice TTS, Curriculum Explorer, Workbook Reader,
   Varied Interactive Exercises (Choice, True/False, Matching)
   ============================================================ */
(function (window) {
  'use strict';

  /* ─── STATE ──────────────────────────────────────────────── */
  const state = {
    profile: { name: 'Kahraman', avatar: '🦊', stars: 50, streak: 1, level: 1, xp: 0, equippedHat: '', equippedGlasses: '', inventory: [] },
    progress: { completedTopics: [], completedUnits: {} },
    quiz: {
      subject: null,
      topicId: null,
      topicTitle: '',
      questions: [],
      currentIdx: 0,
      score: 0,
      matchedPairs: 0
    },
    currentTab: 'macera',
    currentSubjectKey: 'matematik',
    currentTopicId: null,
    focusSubject: 'matematik',
    focusTopicId: null
  };

  /* ─── SUBJECT CONFIG ─────────────────────────────────────── */
  const SUBJECTS = {
    matematik:    { title: 'Matematik',    icon: 'calculate',    bg: 'rgba(255,179,0,0.15)',   accent: 'var(--primary)',    emoji: '🔢', shadow: '#b37d00' },
    fenbilimleri: { title: 'Fen Bilimleri',icon: 'science',       bg: 'rgba(72,217,158,0.15)',  accent: 'var(--tertiary)',   emoji: '🔬', shadow: '#2dbb7d' },
    turkce:       { title: 'Türkçe',       icon: 'menu_book',     bg: 'rgba(0,115,223,0.12)',   accent: 'var(--secondary)', emoji: '📖', shadow: '#7dd3fc' },
    hayatbilgisi: { title: 'Hayat Bilgisi',icon: 'emoji_people',  bg: 'rgba(255,222,172,0.3)',  accent: 'var(--primary)',   emoji: '🌍', shadow: '#ffba38' },
    ingilizce:    { title: 'İngilizce',    icon: 'translate',     bg: 'rgba(155,81,224,0.12)',  accent: '#7c3aed',          emoji: '🌐', shadow: '#9333ea' },
    muzik:        { title: 'Müzik',        icon: 'music_note',    bg: 'rgba(219,39,119,0.1)',   accent: '#db2777',          emoji: '🎵', shadow: '#db2777' }
  };

  const SUBJECT_ORDER = ['matematik','fenbilimleri','turkce','hayatbilgisi','ingilizce','muzik'];
  const LEVEL_TITLES = ['Yeni Başlayan','Kaşif','Öğrenci','Yıldız Avcısı','Bilge Kuş','Şampiyon'];

  /* ─── AUDIO SYSTEM (FX) ──────────────────────────────────── */
  let audioFx = null;
  function getAudioFx() {
    if (!audioFx && window.MH && window.MH.Audio) {
      audioFx = new window.MH.Audio();
    }
    return audioFx;
  }

  function playSound(type) {
    try {
      const fx = getAudioFx();
      if (fx) fx.play(type);
    } catch (e) {}
  }

  /* ─── DUAL-VOICE TTS SERVICE ──────────────────────────────── */
  const SpeechService = {
    isSpeaking: false,
    activeButton: null,
    audioPlayer: null,
    cachedVoices: [],

    init: function() {
      try {
        this.audioPlayer = new Audio();
        this.audioPlayer.preload = 'none';
        this.audioPlayer.onended = () => this.stop();
        this.audioPlayer.onerror = () => this.stop();
      } catch (e) {}

      if ('speechSynthesis' in window) {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
        if ('onvoiceschanged' in window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = () => {
            this.cachedVoices = window.speechSynthesis.getVoices() || [];
          };
        }
      }
    },

    stop: function() {
      if (this.audioPlayer) {
        try {
          this.audioPlayer.pause();
          this.audioPlayer.currentTime = 0;
          this.audioPlayer.removeAttribute('src');
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      this.isSpeaking = false;
      if (this.activeButton) {
        this.resetButton(this.activeButton);
        this.activeButton = null;
      }
    },

    resetButton: function(btn) {
      if (!btn) return;
      btn.classList.remove('is-speaking');
      const txt = btn.querySelector('.v-text');
      if (txt) txt.textContent = btn.dataset.defaultText || 'Sesli Dinle';
    },

    setButtonSpeaking: function(btn) {
      if (!btn) return;
      if (!btn.dataset.defaultText) {
        const txt = btn.querySelector('.v-text');
        btn.dataset.defaultText = txt ? txt.textContent : 'Sesli Dinle';
      }
      btn.classList.add('is-speaking');
      const txt = btn.querySelector('.v-text');
      if (txt) txt.textContent = 'Durdur ⏹️';
    },

    speak: function(text, isEnglish, btnElement) {
      if (!text) return;
      if (this.isSpeaking && this.activeButton === btnElement) {
        this.stop();
        return;
      }

      this.stop();
      this.isSpeaking = true;
      this.activeButton = btnElement;
      if (btnElement) this.setButtonSpeaking(btnElement);

      const voice = isEnglish ? 'jenny' : 'emel';

      // 1. Try Vercel Neural TTS API
      if (navigator.onLine !== false && this.audioPlayer) {
        try {
          const url = '/api/tts?text=' + encodeURIComponent(text) + '&voice=' + voice;
          this.audioPlayer.src = url;
          const promise = this.audioPlayer.play();
          if (promise !== undefined) {
            promise.catch(() => {
              this.fallbackWebSpeech(text, isEnglish, btnElement);
            });
          }
          return;
        } catch (err) {}
      }

      // 2. Offline / Fallback: Web Speech API
      this.fallbackWebSpeech(text, isEnglish, btnElement);
    },

    fallbackWebSpeech: function(text, isEnglish, btnElement) {
      if (!('speechSynthesis' in window) || !text) {
        this.stop();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = isEnglish ? 'en-US' : 'tr-TR';
        u.rate = isEnglish ? 0.9 : 0.95;

        // Choose best matching voice
        const voices = this.cachedVoices.length ? this.cachedVoices : window.speechSynthesis.getVoices();
        const langPrefix = isEnglish ? 'en' : 'tr';
        const match = voices.find(v => (v.lang || '').toLowerCase().startsWith(langPrefix));
        if (match) u.voice = match;

        u.onend = () => this.stop();
        u.onerror = () => this.stop();

        window.speechSynthesis.speak(u);
      } catch (e) {
        this.stop();
      }
    }
  };

  /* ─── SAVE / LOAD ─────────────────────────────────────────── */
  function saveState() {
    try {
      localStorage.setItem('maarif3_profile', JSON.stringify(state.profile));
      localStorage.setItem('maarif3_progress', JSON.stringify(state.progress));
    } catch(e) {}
  }

  function loadState() {
    try {
      const p = localStorage.getItem('maarif3_profile');
      const r = localStorage.getItem('maarif3_progress');
      if (p) Object.assign(state.profile, JSON.parse(p));
      if (r) Object.assign(state.progress, JSON.parse(r));
    } catch(e) {}
  }

  /* ─── SCREEN ROUTER ──────────────────────────────────────── */
  const NAV_SCREENS = ['screen-macera','screen-etkinlik','screen-kitaplik','screen-gelisim'];

  function showScreen(id) {
    SpeechService.stop();

    document.querySelectorAll('.maarif-screen').forEach(s => {
      s.classList.remove('active');
    });
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
    }

    const header = document.getElementById('maarif-header');
    const nav    = document.getElementById('maarif-nav');

    // Show header and nav on main tabs AND subject detail
    if (NAV_SCREENS.includes(id) || id === 'screen-subject-detail') {
      if (header) header.classList.remove('hidden');
      if (nav) nav.classList.remove('hidden');
      updateHeader();
    } else {
      if (header) header.classList.add('hidden');
      if (nav) nav.classList.add('hidden');
    }

    window.scrollTo(0, 0);
  }

  function setActiveTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    const subtitles = {
      macera:   '3. Sınıf • Macera',
      etkinlik: '3. Sınıf • Etkinlik',
      kitaplik: '3. Sınıf • Kitaplık',
      gelisim:  '3. Sınıf • Gelişim'
    };
    const el = document.getElementById('header-subtitle');
    if (el) el.textContent = subtitles[tab] || '3. Sınıf';

    showScreen('screen-' + tab);

    if (tab === 'macera') renderMacera();
    else if (tab === 'etkinlik') renderEtkinlik();
    else if (tab === 'kitaplik') renderKitaplik();
    else if (tab === 'gelisim') renderGelisim();
  }

  window.setActiveTab = setActiveTab;
  window.showScreen = showScreen;

  /* ─── HEADER ─────────────────────────────────────────────── */
  function updateHeader() {
    const sv = document.getElementById('header-stars-val');
    const sk = document.getElementById('header-streak-val');
    const av = document.getElementById('header-avatar');
    if (sv) sv.textContent = state.profile.stars;
    if (sk) sk.textContent = state.profile.streak;
    if (av) av.textContent = state.profile.avatar;
  }

  /* ─── CURRICULUM HELPERS ─────────────────────────────────── */
  function getCurriculum() {
    return window.CURRICULUM_TERM1 || {};
  }

  function getSubjectData(subjectKey) {
    return getCurriculum()[subjectKey] || null;
  }

  function getAllTopics(subjectKey) {
    const subj = getSubjectData(subjectKey);
    if (!subj || !subj.themes) return [];
    const topics = [];
    subj.themes.forEach(theme => {
      if (theme.topics) theme.topics.forEach(t => topics.push(t));
    });
    return topics;
  }

  function isTopicCompleted(topicId) {
    return state.progress.completedTopics.includes(topicId);
  }

  function getSubjectProgress(subjectKey) {
    const topics = getAllTopics(subjectKey);
    if (!topics.length) return 0;
    const done = topics.filter(t => isTopicCompleted(t.id)).length;
    return Math.round((done / topics.length) * 100);
  }

  function getFirstActiveTopic(subjectKey) {
    const topics = getAllTopics(subjectKey);
    for (let i = 0; i < topics.length; i++) {
      if (!isTopicCompleted(topics[i].id)) return topics[i];
    }
    return topics.length > 0 ? topics[0] : null;
  }

  function getFocusTopic() {
    for (const key of SUBJECT_ORDER) {
      const topics = getAllTopics(key);
      for (let i = 0; i < topics.length; i++) {
        if (!isTopicCompleted(topics[i].id)) {
          state.focusSubject = key;
          state.focusTopicId = topics[i].id;
          return topics[i];
        }
      }
    }
    const mat = getAllTopics('matematik');
    return mat.length ? mat[0] : null;
  }

  /* ─── MACERA SCREEN ──────────────────────────────────────── */
  function renderMacera() {
    const nameEl = document.getElementById('greeting-name');
    const taskEl = document.getElementById('greeting-task');
    if (nameEl) nameEl.textContent = 'Merhaba, ' + state.profile.name + '! 🚀';

    const focusTopic = getFocusTopic();
    if (taskEl && focusTopic) {
      const subj = SUBJECTS[state.focusSubject];
      taskEl.innerHTML = 'Günün Görevi: <strong style="color:var(--primary)">' + (subj ? subj.title : '') + ' - ' + focusTopic.title + '</strong>';
    }

    const done = state.progress.completedTopics.length;
    const goal = 5;
    const pct  = Math.min(100, Math.round((done / goal) * 100));
    const lblEl = document.getElementById('daily-progress-label');
    const barEl = document.getElementById('daily-progress-bar');
    if (lblEl) lblEl.textContent = done + ' / ' + goal + ' Tamamlandı';
    if (barEl) barEl.style.width = pct + '%';

    renderIslandMap();
  }

  function renderIslandMap() {
    const map = document.getElementById('island-map');
    if (!map) return;
    map.innerHTML = '';

    // Dynamic island data based on curriculum progress
    const islandsData = SUBJECT_ORDER.map((key, idx) => {
      const cfg = SUBJECTS[key];
      const topics = getAllTopics(key);
      const done = topics.filter(t => isTopicCompleted(t.id)).length;
      const total = topics.length;
      const allDone = total > 0 && done === total;
      const firstIncomplete = topics.find(t => !isTopicCompleted(t.id));

      const ISLAND_NAMES = {
        matematik:    { name: 'Sayılar Adası',    sub: 'Matematik Macerası' },
        fenbilimleri: { name: 'Deney Ormanı',     sub: 'Fen Bilimleri Keşfi' },
        turkce:       { name: 'Masal Diyarı',     sub: 'Türkçe & Okuma' },
        hayatbilgisi: { name: 'Keşif Vadisi',     sub: 'Hayat Bilgisi' },
        ingilizce:    { name: 'Magic Island',      sub: 'İngilizce Dünyası' },
        muzik:        { name: 'Melodi Bahçesi',   sub: 'Müzik & Ritim' }
      };

      const names = ISLAND_NAMES[key] || { name: cfg.title, sub: '' };
      const isActive = !allDone && (idx === 0 || getAllTopics(SUBJECT_ORDER[idx - 1]).every(t => isTopicCompleted(t.id)) || done > 0);

      let stateClass = 'island-locked';
      let btnClass = '';
      let btnText = 'İncele 🔒';
      let badgeText = '🔒 Kilitli';
      let action = `openSubjectDetail('${key}')`;

      if (allDone) {
        stateClass = 'island-done';
        btnClass = 'btn-island-done';
        btnText = '✅ Tamamlandı!';
        badgeText = '⭐ Tamamlandı';
      } else if (idx === 0 || isActive) {
        stateClass = 'island-active';
        btnClass = 'btn-island-active';
        btnText = 'Hadi Oyna! 🚀';
        badgeText = `${done}/${total} Konu`;
        if (firstIncomplete) {
          action = `startQuiz('${key}', '${firstIncomplete.id}')`;
        }
      }

      // Special mini-game overrides for macera islands
      if (key === 'matematik' && !allDone) {
        action = `openSubjectDetail('${key}')`;
        btnText = 'Keşfet 🔢';
      } else if (key === 'fenbilimleri' && !allDone) {
        action = `openFenLab()`;
        btnText = 'Lab\'a Gir! 🔬';
      }

      return {
        key, cfg, stateClass, btnClass, btnText, badgeText, action,
        name: names.name, sub: names.sub, done, total,
        isCurrentFocus: key === state.focusSubject && !allDone
      };
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'adventure-path-wrapper';

    const ALIGNS = ['left', 'right', 'left', 'right', 'left', 'right'];

    islandsData.forEach((island, idx) => {
      const card = document.createElement('div');
      const alignClass = 'island-align-' + ALIGNS[idx];
      const focusClass = island.isCurrentFocus ? 'island-current' : '';
      card.className = `island-trail-card ${alignClass} ${island.stateClass} ${focusClass}`;

      const iconBg = island.cfg.bg || 'rgba(255,179,0,0.12)';
      const accent = island.cfg.accent || 'var(--primary)';

      let beaconHtml = '';
      if (island.isCurrentFocus) {
        beaconHtml = `<div class="island-beacon-badge">📍 Devam Et!</div>`;
      }

      card.innerHTML = `
        ${beaconHtml}
        <div style="display:flex;align-items:center;gap:12px;margin-top:${island.isCurrentFocus ? '8px' : '0'}">
          <div style="width:50px;height:50px;border-radius:14px;background:${iconBg};display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;box-shadow:0 3px 0 ${island.cfg.shadow || 'rgba(0,0,0,0.1)'}">
            ${island.cfg.emoji}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">${island.cfg.title} • ${island.badgeText}</div>
            <h4 class="font-comfortaa" style="font-size:15px;color:var(--on-surface);margin:0;font-weight:700;line-height:1.2">${island.name}</h4>
            <p style="font-size:11px;color:var(--on-surface-variant);margin:2px 0 0 0">${island.sub}</p>
          </div>
        </div>
        <button class="btn-island-play ${island.btnClass}" onclick="${island.action}">
          <span class="material-symbols-outlined" style="font-size:16px">play_circle</span>
          <span>${island.btnText}</span>
        </button>
      `;

      wrapper.appendChild(card);
    });

    map.appendChild(wrapper);
  }

  /* ─── ETKİNLİK SCREEN (STITCH CURRICULUM TREE & UNIT STACK) ─── */

  function renderEtkinlik() {
    const focusTopic = getFocusTopic();
    const ftTitle = document.getElementById('focus-task-title');
    const ftDesc  = document.getElementById('focus-task-desc');
    const ftBtn   = document.getElementById('btn-start-focus');

    if (focusTopic) {
      const subjCfg = SUBJECTS[state.focusSubject];
      if (ftTitle) ftTitle.textContent = (subjCfg ? subjCfg.title : '') + ' • Aktif Görev';
      if (ftDesc)  ftDesc.textContent  = focusTopic.title;
      if (ftBtn) {
        ftBtn.onclick = () => startQuiz(state.focusSubject, state.focusTopicId);
      }
      const topics = getAllTopics(state.focusSubject);
      const done   = topics.filter(t => isTopicCompleted(t.id)).length;
      const total  = topics.length;
      const pct    = total ? Math.round((done / total) * 100) : 0;
      const fpLabel = document.getElementById('focus-progress-label');
      const fpBar   = document.getElementById('focus-progress-bar');
      const fpPct   = document.getElementById('focus-progress-pct');
      if (fpLabel) fpLabel.textContent = done + ' / ' + total + ' Konu Tamam';
      if (fpBar)   fpBar.style.width   = pct + '%';
      if (fpPct)   fpPct.textContent   = '%' + pct;
    }

    const tree = document.getElementById('curriculum-tree');
    if (!tree) return;
    tree.innerHTML = '';

    const stackContainer = document.createElement('div');
    stackContainer.className = 'curriculum-stack';

    SUBJECT_ORDER.forEach((key, subjIdx) => {
      const cfg = SUBJECTS[key];
      const subjData = getSubjectData(key);
      if (!subjData || !cfg) return;

      const topics = getAllTopics(key);
      const doneCount = topics.filter(t => isTopicCompleted(t.id)).length;
      const totalCount = topics.length;
      const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

      const card = document.createElement('div');
      card.className = 'curriculum-subject-card';

      // Header row
      let headerHtml = `
        <div class="curriculum-subject-head">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="curriculum-subject-icon" style="background:${cfg.bg}">
              <span class="material-symbols-outlined" style="color:${cfg.accent};font-size:24px">${cfg.icon}</span>
            </div>
            <div>
              <h4 class="text-headline-sm font-comfortaa" style="color:var(--on-surface);margin:0;font-size:15px">${subjIdx + 1}. ${cfg.title}</h4>
              <p class="text-body-sm" style="color:var(--on-surface-variant);font-size:11px;margin:2px 0 0 0">${totalCount} Konu • ${(subjData.themes || []).length} Ünite</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="text-headline-sm font-comfortaa" style="color:${cfg.accent};font-size:14px">%${pct}</span>
            <button class="btn-sub-action" style="color:${cfg.accent};border-color:${cfg.accent};font-size:11px;padding:4px 10px;" onclick="openSubjectDetail('${key}')">Tümü →</button>
          </div>
        </div>
        <div class="progress-track-thin" style="margin-top:2px">
          <div class="progress-bar-thin" style="width:${pct}%;background:${cfg.accent}"></div>
        </div>
      `;

      // Unit Stack items
      let unitsHtml = '<div class="unit-stack">';
      let previousThemeDone = true;

      (subjData.themes || []).forEach((theme, uIdx) => {
        const themeTopics = theme.topics || [];
        const themeDone = themeTopics.length > 0 && themeTopics.every(t => isTopicCompleted(t.id));
        const themeActive = !themeDone && previousThemeDone;

        let statusClass = 'unit-locked';
        let statusIcon = 'lock';
        let actionBtnText = 'Kilitli 🔒';
        let actionBtnClass = 'btn-unit-action';
        let badgeText = 'Önceki üniteyi bitir';
        let onClickAction = '';

        if (themeDone) {
          statusClass = 'unit-done';
          statusIcon = 'check_circle';
          actionBtnText = 'Tekrar Et 🔄';
          actionBtnClass = 'btn-unit-action btn-unit-done';
          badgeText = '⭐⭐⭐ Tamamlandı';
          onClickAction = `openSubjectDetail('${key}')`;
        } else if (themeActive) {
          statusClass = 'unit-active';
          statusIcon = 'play_arrow';
          actionBtnText = 'Devam Et 🚀';
          actionBtnClass = 'btn-unit-action btn-unit-active';
          badgeText = '🎯 Sıradaki Ünite';
          const firstUnfinished = themeTopics.find(t => !isTopicCompleted(t.id)) || themeTopics[0];
          if (firstUnfinished) {
            onClickAction = `startQuiz('${key}', '${firstUnfinished.id}')`;
          } else {
            onClickAction = `openSubjectDetail('${key}')`;
          }
        }

        unitsHtml += `
          <div class="unit-stack-item ${statusClass}">
            <div class="unit-status-icon">
              <span class="material-symbols-outlined" style="font-size:18px">${statusIcon}</span>
            </div>
            <div class="unit-info-col" style="cursor:pointer" onclick="openSubjectDetail('${key}')">
              <div class="unit-title-text">${theme.title}</div>
              <div class="unit-sub-text">${badgeText} • ${themeTopics.length} Konu</div>
            </div>
            ${onClickAction ? `<button class="${actionBtnClass}" onclick="${onClickAction}">${actionBtnText}</button>` : `<span style="font-size:11px;color:var(--outline);font-weight:700">🔒</span>`}
          </div>
        `;

        if (!themeDone) {
          previousThemeDone = false;
        }
      });

      unitsHtml += '</div>';

      card.innerHTML = headerHtml + unitsHtml;
      stackContainer.appendChild(card);
    });

    tree.appendChild(stackContainer);
  }

  /* ─── SUBJECT DETAIL & CURRICULUM EXPLORER ─────────────────── */
  function openSubjectDetail(subjectKey) {
    state.currentSubjectKey = subjectKey;
    const subjData = getSubjectData(subjectKey);
    const cfg = SUBJECTS[subjectKey];
    if (!subjData || !cfg) return;

    showScreen('screen-subject-detail');

    const emojiEl = document.getElementById('subj-detail-emoji');
    const titleEl = document.getElementById('subj-detail-title');
    const statsEl = document.getElementById('subj-detail-stats');
    const starsEl = document.getElementById('subj-detail-stars');

    if (emojiEl) emojiEl.textContent = cfg.emoji;
    if (titleEl) titleEl.textContent = cfg.title;

    const topics = getAllTopics(subjectKey);
    const done = topics.filter(t => isTopicCompleted(t.id)).length;
    if (statsEl) statsEl.textContent = `${done} / ${topics.length} Konu Tamamlandı (%${getSubjectProgress(subjectKey)})`;
    if (starsEl) starsEl.textContent = state.profile.stars;

    const container = document.getElementById('subj-themes-container');
    if (!container) return;
    container.innerHTML = '';

    subjData.themes.forEach((theme) => {
      const block = document.createElement('div');
      block.className = 'theme-card-block';

      let topicsHtml = '';
      (theme.topics || []).forEach(t => {
        const isDone = isTopicCompleted(t.id);
        topicsHtml += `
          <div class="topic-item-row" data-topic-id="${t.id}">
            <div class="topic-main-info">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:14px">${isDone ? '✅' : '📍'}</span>
                <span class="topic-title-span">${t.title}</span>
              </div>
              <p class="topic-desc-span">${t.desc || ''}</p>
            </div>
            <div class="topic-action-group">
              <button class="btn-topic-book" onclick="openWorkbook('${subjectKey}','${t.id}')">
                <span class="material-symbols-outlined" style="font-size:14px">auto_stories</span>
                Kitap
              </button>
              <button class="btn-topic-quiz" onclick="startQuiz('${subjectKey}','${t.id}')">
                <span class="material-symbols-outlined" style="font-size:14px">quiz</span>
                Sınav
              </button>
            </div>
          </div>
        `;
      });

      block.innerHTML = `
        <div class="theme-card-header">
          <span class="theme-title-text">${theme.title}</span>
          <span style="font-size:11px;color:var(--on-surface-variant);font-weight:700">${theme.page_range || ''}</span>
        </div>
        <div class="theme-topics-list">
          ${topicsHtml}
        </div>
      `;

      container.appendChild(block);
    });
  }
  window.openSubjectDetail = openSubjectDetail;

    /* ─── WORKBOOK READER SCREEN (RICH STITCH COMPONENTS) ─────── */
  function openWorkbook(subjectKey, topicId) {
    state.currentSubjectKey = subjectKey;
    state.currentTopicId = topicId;

    const topics = getAllTopics(subjectKey);
    const topic  = topics.find(t => t.id === topicId) || topics[0];
    if (!topic) return;

    showScreen('screen-workbook');

    const badgeEl = document.getElementById('wb-badge');
    const titleEl = document.getElementById('wb-title');
    const cfg     = SUBJECTS[subjectKey];

    if (badgeEl) badgeEl.textContent = (cfg ? cfg.title : '') + ' • ' + (topic.badge || 'Konu');
    if (titleEl) titleEl.textContent = topic.title;

    const backBtn = document.getElementById('btn-back-from-workbook');
    if (backBtn) {
      backBtn.onclick = () => openSubjectDetail(subjectKey);
    }

    const examBtn = document.getElementById('btn-start-exam-from-wb');
    if (examBtn) {
      examBtn.onclick = () => startQuiz(subjectKey, topicId);
    }

    const contentEl = document.getElementById('workbook-content');
    if (!contentEl) return;
    contentEl.innerHTML = '';

    let fullSpokenText = topic.title + '. ';

    // 1. Fact Card / Golden Rule
    if (topic.fact_card) {
      const fc = topic.fact_card;
      fullSpokenText += (fc.rule || '') + ' ';
      const fcCard = document.createElement('div');
      fcCard.className = 'info-box-golden';
      fcCard.innerHTML = `
        <div class="info-box-title">
          <span>${fc.emoji || '💡'}</span>
          <span>MEB PÜF NOKTASI VE KURAL</span>
        </div>
        <div class="info-box-content">
          <p><strong>Kural:</strong> ${(fc.rule || '').replace(/\\n|\n/g, '<br>')}</p>
          ${fc.example ? `<p style="margin-top:4px"><strong>Örnek:</strong> ${(fc.example || '').replace(/\\n|\n/g, '<br>')}</p>` : ''}
          ${fc.tip ? `<p style="margin-top:4px;color:#a16207"><strong>⚠️ Dikkat:</strong> ${(fc.tip || '').replace(/\\n|\n/g, '<br>')}</p>` : ''}
        </div>
      `;
      contentEl.appendChild(fcCard);
    }

    // 2. Reading Pages (Discovery, Models, Tables, Daily Life, Sen De Dene)
    if (topic.reading_pages && topic.reading_pages.length) {
      topic.reading_pages.forEach(p => {
        const pCard = document.createElement('div');
        pCard.className = 'workbook-section-card';

        let inner = `<span class="workbook-section-badge">${p.badge || 'DERS KİTABI ANLATIMI'}</span>`;
        if (p.title) inner += `<h3 class="text-headline-sm font-comfortaa" style="font-size:15px;color:var(--primary);margin-top:4px">${p.title}</h3>`;
        
        if (p.story) {
          inner += `<p class="text-body-md" style="line-height:22px;color:var(--on-surface);margin-top:4px">${p.story}</p>`;
          fullSpokenText += p.story + ' ';
        }
        if (p.content) {
          inner += `<p class="text-body-sm" style="line-height:20px;color:var(--on-surface-variant);margin-top:4px">${p.content}</p>`;
          fullSpokenText += p.content + ' ';
        }
        if (p.model_html) {
          inner += p.model_html;
        }
        if (p.table_html) {
          inner += p.table_html;
        }
        
        // Key Points list
        if (p.key_points && Array.isArray(p.key_points)) {
          inner += `
            <div style="background:var(--surface-container-lowest);padding:10px 12px;border-radius:10px;border-left:4px solid var(--secondary);margin-top:8px">
              <div style="font-weight:700;font-size:12px;color:var(--secondary);margin-bottom:4px">📌 Önemli Noktalar:</div>
              <ul style="margin:0;padding-left:18px;font-size:12px;color:var(--on-surface);line-height:19px">
                ${p.key_points.map(kp => `<li>${kp}</li>`).join('')}
              </ul>
            </div>`;
        }

        // Daily Life Examples
        if (p.daily_life && Array.isArray(p.daily_life)) {
          inner += `
            <div style="background:rgba(255,179,0,0.08);border:1px solid rgba(255,179,0,0.3);border-radius:12px;padding:10px 12px;margin-top:8px">
              <div style="font-family:Comfortaa,sans-serif;font-weight:800;font-size:12px;color:var(--primary);margin-bottom:6px">🌍 Günlük Hayattan Örnekler:</div>
              <div style="display:flex;flex-direction:column;gap:5px">
                ${p.daily_life.map(dl => `<div style="font-size:12px;color:var(--on-surface)">${dl}</div>`).join('')}
              </div>
            </div>`;
        }

        // Golden Info Box
        if (p.info_box) {
          const formattedBoxContent = (p.info_box.content || '').replace(/\\n|\n/g, '<br style="margin-bottom:4px">');
          inner += `
            <div class="info-box-golden" style="margin-top:8px">
              <div class="info-box-title"><span>🌟</span> ${p.info_box.title || 'BİLGİ KUTUSU'}</div>
              <div class="info-box-content">${formattedBoxContent}</div>
            </div>`;
          fullSpokenText += (p.info_box.content || '').replace(/\\n|\n/g, ' ') + ' ';
        }

        // Example Box (Soru ve Çözüm)
        if (p.example_box) {
          inner += `
            <div class="info-box-golden" style="margin-top:8px;border-left:4px solid var(--secondary)">
              <div class="info-box-title" style="color:var(--secondary)"><span>📝</span> ${p.example_box.title || 'ÖRNEK SORU VE ÇÖZÜM'}</div>
              <div class="info-box-content">
                <p><strong>Soru:</strong> ${p.example_box.question || p.example_box.problem || ''}</p>
                <p style="margin-top:4px;color:var(--secondary);font-weight:700"><strong>Çözüm:</strong> ${p.example_box.solution || ''}</p>
              </div>
            </div>`;
        }

        // Interactive "Sen de Dene!" Try Box
        if (p.try_box) {
          const ansId = 'try-ans-' + Math.random().toString(36).substring(2, 8);
          inner += `
            <div class="try-box-card">
              <div class="try-box-header">
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--tertiary)">edit_note</span>
                <span>SEN DE DENE!</span>
              </div>
              <p class="try-box-q">${p.try_box.question}</p>
              <button class="try-box-btn" onclick="const a=document.getElementById('${ansId}'); if(a){ a.style.display = a.style.display==='none'?'block':'none'; }">Cevabı Gör 💡</button>
              <div id="${ansId}" class="try-box-ans" style="display:none"><strong>Doğru Cevap:</strong> ${p.try_box.answer}</div>
            </div>`;
        }

        if (p.tip) {
          inner += `<p style="font-size:12px;font-weight:700;color:var(--secondary);margin-top:6px">💡 ${p.tip}</p>`;
        }

        pCard.innerHTML = inner;
        contentEl.appendChild(pCard);
      });
    } else {
      // Fallback: visual concept breakdown cards
      const descCard = document.createElement('div');
      descCard.className = 'workbook-section-card';
      descCard.innerHTML = `
        <span class="workbook-section-badge">KONU KAZANIMI</span>
        <h3 class="text-headline-sm font-comfortaa" style="font-size:15px;color:var(--primary);margin-top:4px">${topic.title}</h3>
        <p class="text-body-md" style="line-height:22px;margin-top:4px">${topic.desc || 'Bu konuda 3. sınıf MEB müfredatı temel kavramları ve alıştırmaları yer alır.'}</p>
        <div class="decomp-cards-grid">
          <div class="decomp-card">
            <span class="decomp-badge">💡 1. Adım: Kavramı Öğren</span>
            <span class="decomp-row">Konu kurallarını ve temel mantığı dikkatlice oku.</span>
          </div>
          <div class="decomp-card">
            <span class="decomp-badge">🎯 2. Adım: Örnekleri İncele</span>
            <span class="decomp-row">Modellenen örnekleri ve çözümleri kavra.</span>
          </div>
          <div class="decomp-card">
            <span class="decomp-badge">🚀 3. Adım: Sınav ile Pekiştir</span>
            <span class="decomp-row">Aşağıdaki 'Sınava Başla' butonuyla yıldızları topla!</span>
          </div>
        </div>
      `;
      contentEl.appendChild(descCard);
      fullSpokenText += topic.desc || '';
    }

    // Audio button for reading the lesson aloud
    const listenBtn = document.getElementById('btn-listen-workbook');
    if (listenBtn) {
      const isEn = subjectKey === 'ingilizce';
      listenBtn.onclick = () => {
        SpeechService.speak(fullSpokenText.slice(0, 600), isEn, listenBtn);
      };
    }
  }
  window.openWorkbook = openWorkbook;


  /* ============================================================
     STITCH MINI GAMES: FEN LABORATUVARI & MATEMATİK ADASI
     ============================================================ */

  // 1. FEN LABORATUVARI (KATI - SIVI - GAZ FANUSLARI)
  let fenState = {
    selectedToken: null,
    classifiedCount: 0,
    podCounts: { solid: 0, liquid: 0, gas: 0 }
  };

  function openFenLab() {
    fenState = {
      selectedToken: null,
      classifiedCount: 0,
      podCounts: { solid: 0, liquid: 0, gas: 0 }
    };
    showScreen('screen-fen-lab');
    updateFenLabUI();
  }
  window.openFenLab = openFenLab;

  function selectMatterToken(el, type, name) {
    playSound('pop');
    document.querySelectorAll('.matter-token-card').forEach(c => c.classList.remove('selected-token'));
    el.classList.add('selected-token');
    fenState.selectedToken = { element: el, type: type, name: name };

    const promptEl = document.getElementById('fen-lab-prompt');
    if (promptEl) {
      promptEl.innerHTML = `"${name}" seçildi! Şimdi onu uygun fanusa yerleştirmek için yukarıdaki <strong>Katı, Sıvı veya Gaz</strong> fanusuna tıkla! 💡`;
    }
  }
  window.selectMatterToken = selectMatterToken;

  function classifySelectedMatter(targetPodType) {
    if (!fenState.selectedToken) {
      alert('Önce aşağıdaki maddelerden birini seçmelisin! 👇');
      return;
    }

    const { element, type, name } = fenState.selectedToken;
    const isCorrect = type === targetPodType;

    const fbBanner = document.getElementById('fen-feedback-banner');
    const fbTitle  = document.getElementById('fen-feedback-title');
    const fbText   = document.getElementById('fen-feedback-text');

    if (isCorrect) {
      playSound('correct');
      element.classList.remove('selected-token');
      element.classList.add('classified-done');
      fenState.classifiedCount++;
      fenState.podCounts[type]++;
      fenState.selectedToken = null;

      state.profile.stars += 5;
      saveState();
      updateHeader();

      const typeTitles = { solid: 'Katı 🧊', liquid: 'Sıvı 💧', gas: 'Gaz 🎈' };
      if (fbBanner && fbTitle && fbText) {
        fbBanner.style.display = 'flex';
        fbTitle.textContent = `Harika! "${name}" bir ${typeTitles[type]} maddedir! 🎉 (+5 Yıldız)`;
        fbText.textContent = type === 'solid' ? 'Katı maddelerin belirli bir şekli ve hacmi vardır.' : (type === 'liquid' ? 'Sıvı maddeler akıcıdır ve konuldukları kabın şeklini alır.' : 'Gaz maddeler bulundukları ortama tamamen yayılır.');
      }

      updateFenLabUI();

      if (fenState.classifiedCount === 6) {
        setTimeout(() => {
          playSound('levelup');
          alert('TEBRİKLER! 🎉 Tüm maddeleri doğru fanuslara yerleştirdin! +25 Bonus Yıldız kazandın!');
          state.profile.stars += 25;
          saveState();
          updateHeader();
        }, 500);
      }
    } else {
      playSound('wrong');
      if (fbBanner && fbTitle && fbText) {
        fbBanner.style.display = 'flex';
        fbTitle.textContent = `Tekrar Dene! 💡`;
        fbText.textContent = `"${name}" seçtiğin fanusa ait değil. Özelliklerini tekrar düşün!`;
      }
    }
  }
  window.classifySelectedMatter = classifySelectedMatter;

  function updateFenLabUI() {
    const sEl = document.getElementById('solid-count');
    const lEl = document.getElementById('liquid-count');
    const gEl = document.getElementById('gas-count');
    const pEl = document.getElementById('fen-progress-label');

    if (sEl) sEl.textContent = `${fenState.podCounts.solid} / 2 Madde`;
    if (lEl) lEl.textContent = `${fenState.podCounts.liquid} / 2 Madde`;
    if (gEl) gEl.textContent = `${fenState.podCounts.gas} / 2 Madde`;
    if (pEl) pEl.textContent = `${fenState.classifiedCount} / 6 Tamamlandı`;
  }

  // 2. MATEMATİK ELMA SEPETİ OYUNU
  function openMatGame() {
    showScreen('screen-mat-game');
    const fb = document.getElementById('mat-game-feedback');
    if (fb) fb.style.display = 'none';
  }
  window.openMatGame = openMatGame;

  function handleMatGameChoice(val, btnEl) {
    const isCorrect = val === 12;
    const fb = document.getElementById('mat-game-feedback');
    const t  = document.getElementById('mat-feedback-title');
    const tx = document.getElementById('mat-feedback-text');

    document.querySelectorAll('#screen-mat-game .quiz-option-tactile').forEach(b => {
      b.classList.add('disabled');
      if (b.innerText.includes('12')) b.classList.add('correct');
      else b.classList.add('incorrect');
    });

    if (isCorrect) {
      playSound('levelup');
      state.profile.stars += 20;
      saveState();
      updateHeader();
      if (fb && t && tx) {
        fb.className = 'quiz-feedback correct-fb';
        fb.style.display = 'flex';
        t.textContent = 'MÜKEMMEL! 🎉 Doğru Cevap: 12 Elma!';
        tx.textContent = '4 sepet × 3 elma = 12 elma topladın! (+20 Altın Yıldız)';
      }
    } else {
      playSound('wrong');
      if (fb && t && tx) {
        fb.className = 'quiz-feedback incorrect-fb';
        fb.style.display = 'flex';
        t.textContent = 'Neredeyse! 💡';
        tx.textContent = 'Doğru cevap 12 olmalıydı. 4 sepetin her birinde 3 elma var: 3 + 3 + 3 + 3 = 12!';
      }
    }
  }
  window.handleMatGameChoice = handleMatGameChoice;


  /* ─── DATA CLEANING HELPERS ──────────────────────────────── */
  const PDF_NOISE = /===\s*PAGE\s*\d+\s*===.*$|\d+\s*ÖLÇME.*$|ÖLÇME,?\s*DEĞERLENDİRME.*$|SINAV\s*HİZMETLERİ.*$|GENEL\s*MÜDÜRLÜĞÜ.*$|MEB\s*\d{4}.*$/gi;
  const ANSWER_SPOILER = /MEB\s*Kazanımı\s*:\s*Doğru\s*cevap\s+.*?\([A-D]\s*seçeneği\)\.?|Doğru\s*cevap\s+[A-D]\s*\([A-D]\s*seçeneği\)\.?|Cevap\s*:\s*[A-D]\s*seçeneği\.?|\(Cevap\s*[A-D]\)|MEB\s*Kazanımı\s*:\s*/gi;

  const GENERIC_HINTS = [
    'Soruyu dikkatlice oku ve tüm şıkları karşılaştır! 🦉',
    'Konuyu hatırla ve adım adım düşün. Yapabilirsin! 💪',
    'İlk önce kesin yanlış olanları elemeyi dene! 🎯',
    'Bu konuyu çalışma kitabında gözden geçirebilirsin! 📖',
    'Her şık için "Bu doğru mu?" diye kendine sor! 🤔',
  ];
  let _hintIdx = 0;

  function cleanOption(text) {
    if (!text) return '';
    let t = String(text).replace(PDF_NOISE, '').trim();
    t = t.replace(/\|+$/, '').trim();
    if (t.length > 70) t = t.slice(0, 67) + '…';
    return t || String(text).slice(0, 40);
  }

  function cleanHint(text) {
    if (!text) return null;
    let t = String(text).replace(ANSWER_SPOILER, '').trim();
    t = t.replace(/^\s*:\s*/, '').trim();
    if (t.length < 6) {
      const h = GENERIC_HINTS[_hintIdx % GENERIC_HINTS.length];
      _hintIdx++;
      return h;
    }
    return t;
  }

  /* ─── QUIZ ENGINE (CHOICE, TRUE/FALSE, MATCHING) ───────────── */
  function buildQuestionsForTopic(subjectKey, topic) {
    const list = [];
    const tasks = topic.tasks || [];

    // 1. Multiple Choice Questions from genuine tasks
    tasks.forEach(task => {
      const qText = task.q || task.question;
      const opts  = (task.options || []).map(cleanOption).filter(o => o.length > 0);
      const ans   = typeof task.ans === 'number' ? task.ans : (typeof task.correct === 'number' ? task.correct : 0);
      const safeAns = Math.min(ans, opts.length - 1);
      const hint  = cleanHint(task.hint || task.explanation) || GENERIC_HINTS[_hintIdx++ % GENERIC_HINTS.length];

      if (qText && opts.length >= 2) {
        list.push({
          type: 'choice',
          question: qText,
          options: opts,
          correct: safeAns,
          hint: hint,
          isEnglish: subjectKey === 'ingilizce'
        });
      }
    });

    // 2. True / False (Evet / Hayır) Exercise — only if fact_card has a real rule
    if (topic.fact_card && topic.fact_card.rule) {
      const rule = topic.fact_card.rule;
      // Make a true OR false question alternating
      const makeTrue = list.length % 2 === 0;
      let tfQuestion, tfIsTrue;
      if (makeTrue) {
        tfQuestion = '🧠 DOĞRU MU, YANLIŞ MI?\n' + rule.slice(0, 120);
        tfIsTrue = true;
      } else {
        // Slightly negate the rule to make it false
        tfQuestion = '🧠 DOĞRU MU, YANLIŞ MI?\n"' + (topic.title || 'Bu konu') + '" ile ilgili her bilgi kesinlikle doğrudur.';
        tfIsTrue = false;
      }
      list.push({
        type: 'true_false',
        question: tfQuestion,
        isTrue: tfIsTrue,
        hint: topic.fact_card.tip ? cleanHint(topic.fact_card.tip) || '📌 Kuralı hatırla!' : '📌 Kuralı düşün!',
        isEnglish: false
      });
    }

    // 3. Matching (Eşleştirme) Exercise — use question stem vs. correct answer
    if (tasks.length >= 3) {
      const pairs = [];
      tasks.slice(0, 3).forEach(t => {
        const qStem = (t.q || '').replace(/[?!]/g, '').trim().slice(0, 28) || 'Soru';
        const opts = (t.options || []).map(cleanOption);
        const aIdx = typeof t.ans === 'number' ? t.ans : 0;
        const answer = opts[aIdx] ? opts[aIdx].slice(0, 28) : 'Cevap';
        pairs.push({ left: qStem, right: answer });
      });
      list.push({
        type: 'matching',
        question: '🔗 EŞLEŞTİRME: Sol taraftaki soruları sağdaki doğru cevaplarla eşleştir!',
        pairs: pairs,
        hint: 'Harika! Tüm eşleştirmeleri doğru buldun! 🎯',
        isEnglish: subjectKey === 'ingilizce'
      });
    }

    // If completely empty, generate a warmup question
    if (!list.length) {
      list.push({
        type: 'choice',
        question: '"' + topic.title + '" konusuna hazır mısın?',
        options: ['Evet, Hazırım! 🚀', 'Önce Tekrar Bakayım 📖', 'Hadi Başlayalım! 💪', 'Kolay Gelsin! ⭐'],
        correct: 0,
        hint: 'Maceraya tam gaz devam!',
        isEnglish: false
      });
    }

    return list;
  }

  function startQuiz(subjectKey, topicId) {
    state.currentSubjectKey = subjectKey;
    state.currentTopicId = topicId;

    const topics = getAllTopics(subjectKey);
    const topic  = topics.find(t => t.id === topicId) || topics[0];
    if (!topic) return;

    state.quiz = {
      subject: subjectKey,
      topicId: topic.id,
      topicTitle: topic.title,
      questions: buildQuestionsForTopic(subjectKey, topic),
      currentIdx: 0,
      score: 0,
      matchedPairs: 0
    };

    showScreen('screen-quiz');
    renderQuizQuestion();
  }
  window.startQuiz = startQuiz;

  /* ─── VISUAL PROBLEM AID BUILDER (STITCH V2) ─────────────────── */
  function buildVisualProblemAid(subjectKey, q, topicTitle) {
    const qLower = (q.question || '').toLowerCase();
    const tLower = (topicTitle || '').toLowerCase();

    // 1. Multiplication / Equal Groups -> Apple Baskets Model (Elma Sepetleri)
    if (subjectKey === 'matematik' && (qLower.includes('sepet') || qLower.includes('çarpma') || qLower.includes('tane') || qLower.includes('katı') || qLower.includes('×') || qLower.includes('çarpım') || tLower.includes('çarpma'))) {
      let bCount = 3;
      let aCount = 4;
      const m = qLower.match(/(\d+)\s*(sepet|tabak|kutu|grup)/);
      if (m && parseInt(m[1]) >= 2 && parseInt(m[1]) <= 5) bCount = parseInt(m[1]);
      const m2 = qLower.match(/(\d+)\s*(elma|tane|ceviz|kalem|çilek)/);
      if (m2 && parseInt(m2[1]) >= 1 && parseInt(m2[1]) <= 6) aCount = parseInt(m2[1]);

      let basketsHtml = '';
      for (let i = 1; i <= bCount; i++) {
        const apples = '🍎'.repeat(aCount);
        basketsHtml += `
          <div class="basket-card">
            <div class="basket-head">${i}. Sepet</div>
            <div class="basket-apples">${apples}</div>
            <div class="basket-count">${aCount} Elma</div>
          </div>`;
      }
      return `
        <div class="quiz-visual-aid-box">
          <div class="visual-aid-badge">
            <span class="material-symbols-outlined" style="font-size:16px;color:var(--primary)">shopping_basket</span>
            <span>Görsel Problem: Eşit Gruplar & Sepet Modeli</span>
          </div>
          <div class="basket-grid">
            ${basketsHtml}
          </div>
          <div class="visual-aid-caption">💡 ${bCount} sepetin her birinde ${aCount} elma var: ${bCount} × ${aCount} = ${bCount * aCount} elma</div>
        </div>`;
    }

    // 2. Base Ten Blocks (Yüzlük, Onluk, Birlik Taban Blokları)
    if (subjectKey === 'matematik' && (qLower.includes('basamak') || qLower.includes('yüzlük') || qLower.includes('onluk') || qLower.includes('birlik') || qLower.includes('modellenen') || qLower.includes('blok') || tLower.includes('sayı'))) {
      let h = 3, t = 4, o = 7;
      const mH = qLower.match(/(\d+)\s*yüzlük/);
      if (mH) h = parseInt(mH[1]);
      const mT = qLower.match(/(\d+)\s*onluk/);
      if (mT) t = parseInt(mT[1]);
      const mO = qLower.match(/(\d+)\s*birlik/);
      if (mO) o = parseInt(mO[1]);

      const hIcons = '🟦 '.repeat(Math.min(h, 6)).trim();
      const tIcons = '🟩 '.repeat(Math.min(t, 8)).trim();
      const oIcons = '🟨 '.repeat(Math.min(o, 9)).trim();
      const totalNum = h * 100 + t * 10 + o;

      return `
        <div class="quiz-visual-aid-box">
          <div class="visual-aid-badge">
            <span class="material-symbols-outlined" style="font-size:16px;color:var(--secondary)">view_in_ar</span>
            <span>Görsel Taban Blokları Modeli</span>
          </div>
          <div class="blocks-showcase">
            <div class="block-unit-card">
              <div class="block-sym-icon">${hIcons}</div>
              <div class="block-sym-label">${h} Yüzlük Levha</div>
              <div class="block-sym-val">${h * 100}</div>
            </div>
            <div class="block-unit-card">
              <div class="block-sym-icon">${tIcons}</div>
              <div class="block-sym-label">${t} Onluk Çubuk</div>
              <div class="block-sym-val">${t * 10}</div>
            </div>
            <div class="block-unit-card">
              <div class="block-sym-icon">${oIcons}</div>
              <div class="block-sym-label">${o} Birlik Küp</div>
              <div class="block-sym-val">${o}</div>
            </div>
          </div>
          <div class="visual-aid-caption">Model Değeri: ${h * 100} + ${t * 10} + ${o} = ${totalNum}</div>
        </div>`;
    }

    // 3. Matter Pods (Fen Bilimleri Katı, Sıvı, Gaz Kapsülleri)
    if (subjectKey === 'fenbilimleri' && (qLower.includes('katı') || qLower.includes('sıvı') || qLower.includes('gaz') || qLower.includes('madde') || qLower.includes('hal') || tLower.includes('madde'))) {
      return `
        <div class="quiz-visual-aid-box">
          <div class="visual-aid-badge">
            <span class="material-symbols-outlined" style="font-size:16px;color:var(--tertiary)">science</span>
            <span>Fen Laboratuvarı: Maddenin 3 Hali</span>
          </div>
          <div class="matter-pods-grid">
            <div class="matter-pod-card">
              <div class="matter-pod-icon">🧊</div>
              <div class="matter-pod-label">1. Katı</div>
              <div class="matter-pod-sub">Belirli bir şekli vardır (Taş, Buz)</div>
            </div>
            <div class="matter-pod-card">
              <div class="matter-pod-icon">💧</div>
              <div class="matter-pod-label">2. Sıvı</div>
              <div class="matter-pod-sub">Konulduğu kabın şeklini alır (Su, Süt)</div>
            </div>
            <div class="matter-pod-card">
              <div class="matter-pod-icon">💨</div>
              <div class="matter-pod-label">3. Gaz</div>
              <div class="matter-pod-sub">Bulunduğu ortama tamamen yayılır (Hava)</div>
            </div>
          </div>
          <div class="visual-aid-caption">💡 Katı maddelerin şekli değişmezken sıvılar ve gazlar akıcıdır!</div>
        </div>`;
    }

    // 4. Turkish Vocabulary Bridge & Clue Tokens
    if (subjectKey === 'turkce') {
      return `
        <div class="quiz-visual-aid-box">
          <div class="visual-aid-badge">
            <span class="material-symbols-outlined" style="font-size:16px;color:var(--secondary)">menu_book</span>
            <span>Türkçe Anlam & Kelime Köprüsü</span>
          </div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:4px 0">
            <span style="background:var(--secondary-fixed);color:var(--secondary);padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:700">📖 Cümle Bağlamı</span>
            <span style="background:var(--primary-fixed);color:var(--primary);padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:700">🎯 Anlam İlişkisi</span>
            <span style="background:var(--tertiary-fixed);color:var(--tertiary);padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:700">✍️ Yazım Kuralı</span>
          </div>
        </div>`;
    }

    // 5. English Picture & Audio Clue
    if (subjectKey === 'ingilizce') {
      return `
        <div class="quiz-visual-aid-box">
          <div class="visual-aid-badge">
            <span class="material-symbols-outlined" style="font-size:16px;color:#7c3aed">translate</span>
            <span>English Illustrated Flashcard</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:6px">
            <span style="font-size:32px">🎨</span>
            <div>
              <div style="font-family:Comfortaa,sans-serif;font-weight:800;color:#7c3aed;font-size:14px">Look, Listen & Choose!</div>
              <div style="font-size:11px;color:var(--on-surface-variant)">Pick the correct English word or phrase below.</div>
            </div>
          </div>
        </div>`;
    }

    // 6. Generic Subject Concept Card
    const sc = SUBJECTS[subjectKey];
    return `
      <div class="quiz-visual-aid-box">
        <div class="visual-aid-badge">
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--primary)">lightbulb</span>
          <span>${sc ? sc.title : 'Ders'} • Keşif İpucu</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:4px 6px">
          <span style="font-size:26px">${sc ? sc.emoji : '🎯'}</span>
          <span style="font-size:12px;color:var(--on-surface-variant);line-height:17px">${q.hint ? q.hint.slice(0, 110) : 'Kazanımı hatırla ve doğru cevaba odaklan!'}</span>
        </div>
      </div>`;
  }

  function renderQuizQuestion() {
    SpeechService.stop();

    const q = state.quiz.questions[state.quiz.currentIdx];
    const total = state.quiz.questions.length;
    const current = state.quiz.currentIdx;

    const sBadge = document.getElementById('quiz-subject-badge');
    const qText  = document.getElementById('quiz-question-text');
    const streak = document.getElementById('quiz-streak');
    const dots   = document.getElementById('quiz-dots');
    const area   = document.getElementById('quiz-interactive-area');
    const fb     = document.getElementById('quiz-feedback');
    const nw     = document.getElementById('quiz-next-wrap');

    const mascotTipRow  = document.getElementById('quiz-mascot-tip-row');
    const mascotTipText = document.getElementById('quiz-mascot-tip-text');
    const visualAidArea = document.getElementById('quiz-visual-aid-area');

    if (fb) fb.style.display = 'none';
    if (nw) nw.style.display = 'none';

    const sc = SUBJECTS[state.quiz.subject];
    if (sBadge) sBadge.textContent = (sc ? sc.title : '') + ' • ' + state.quiz.topicTitle;
    if (qText) qText.textContent = q.question;
    if (streak) streak.textContent = state.profile.streak;

    if (dots) {
      dots.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.className = 'quiz-dot' + (i === current ? ' active' : (i < current ? ' done' : ''));
        dots.appendChild(dot);
      }
    }

    // 1. Bilge Kuş Mascot — sadece motivasyon mesajı, cevap vermeden önce ipucu YOK
    const MOTIVATIONS = [
      'Dikkatlice oku ve en uygun şıkkı seç! 💪',
      'Şıkları teker teker değerlendir! 🦉',
      'Kesin yanlış olanları önce ele! 🎯',
      'Bu soruyu çözebilirsin, güveniyorum! ⭐',
      'Konuyu hatırla, doğru cevap orada saklı! 📖',
    ];
    if (mascotTipRow && mascotTipText) {
      mascotTipText.textContent = MOTIVATIONS[state.quiz.currentIdx % MOTIVATIONS.length];
      mascotTipRow.style.display = 'flex';
    }

    // 2. Visual Problem Aid (Baskets, Blocks, Matter Pods, Flashcards)
    if (visualAidArea) {
      const aidHtml = buildVisualProblemAid(state.quiz.subject, q, state.quiz.topicTitle);
      visualAidArea.innerHTML = aidHtml;
      visualAidArea.style.display = 'block';
    }

    // Audio read button
    const readBtn = document.getElementById('btn-read-question');
    if (readBtn) {
      readBtn.onclick = () => {
        let textToRead = q.question;
        if (q.type === 'choice' && q.options) {
          textToRead += '. Şıklar: ' + q.options.join(', ');
        }
        SpeechService.speak(textToRead, q.isEnglish, readBtn);
      };
    }

    if (!area) return;
    area.innerHTML = '';

    // RENDER ACCORDING TO QUESTION TYPE
    if (q.type === 'choice') {
      renderChoiceOptions(q, area);
    } else if (q.type === 'true_false') {
      renderTrueFalseOptions(q, area);
    } else if (q.type === 'matching') {
      renderMatchingExercise(q, area);
    }
  }

  // 1. Tactile 3D Multiple Choice Renderer (Stitch V2)
  function renderChoiceOptions(q, container) {
    const wrap = document.createElement('div');
    wrap.className = 'quiz-options-grid';
    const letters = ['A','B','C','D'];

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-tactile';
      btn.innerHTML = `
        <div class="opt-letter-badge">${letters[idx]}</div>
        <div class="opt-text">${opt}</div>
        <span class="material-symbols-outlined opt-indicator-icon">radio_button_unchecked</span>
      `;
      btn.onclick = () => handleChoiceAnswer(idx, q);
      wrap.appendChild(btn);
    });

    container.appendChild(wrap);
  }

  function handleChoiceAnswer(selectedIdx, q) {
    const correct = selectedIdx === q.correct;
    const allBtns = document.querySelectorAll('.quiz-option-tactile');

    allBtns.forEach((btn, i) => {
      btn.classList.add('disabled');
      btn.style.cursor = 'default';
      const icon = btn.querySelector('.opt-indicator-icon');
      if (i === q.correct) {
        btn.classList.add('correct');
        if (icon) { icon.textContent = 'check_circle'; icon.style.color = '#16a34a'; }
      } else if (i === selectedIdx && !correct) {
        btn.classList.add('incorrect');
        if (icon) { icon.textContent = 'cancel'; icon.style.color = '#dc2626'; }
      }
    });

    if (correct) {
      playSound('correct');
      state.quiz.score++;
      showFeedback(true, '🎉 Harika! Doğru cevap!', q.hint || 'Devam et böyle! ⭐');
    } else {
      playSound('wrong');
      const correctLabel = q.options[q.correct] || '—';
      showFeedback(false, '❌ Yanlış! Doğru cevap: ' + correctLabel, q.hint || 'Tekrar dene! 💪');
    }
    showNextButton();
  }

  // 2. True / False Renderer
  function renderTrueFalseOptions(q, container) {
    const wrap = document.createElement('div');
    wrap.className = 'tf-container';

    const btnTrue = document.createElement('button');
    btnTrue.className = 'btn-tf btn-tf-true';
    btnTrue.innerHTML = '<span>✅</span><span>DOĞRU (EVET)</span>';

    const btnFalse = document.createElement('button');
    btnFalse.className = 'btn-tf btn-tf-false';
    btnFalse.innerHTML = '<span>❌</span><span>YANLIŞ (HAYIR)</span>';

    btnTrue.onclick  = () => handleTrueFalseAnswer(true, q, btnTrue, btnFalse);
    btnFalse.onclick = () => handleTrueFalseAnswer(false, q, btnFalse, btnTrue);

    wrap.appendChild(btnTrue);
    wrap.appendChild(btnFalse);
    container.appendChild(wrap);
  }

  function handleTrueFalseAnswer(selectedBool, q, selectedBtn, otherBtn) {
    selectedBtn.disabled = true;
    otherBtn.disabled = true;

    const correct = selectedBool === q.isTrue;
    if (correct) {
      playSound('correct');
      selectedBtn.classList.add('selected-correct');
      state.quiz.score++;
      showFeedback(true, 'Harika Muhakeme! Doğru Karar! 🌟', q.hint);
    } else {
      playSound('wrong');
      selectedBtn.classList.add('selected-wrong');
      showFeedback(false, 'Dikkat! Bu ifade ' + (q.isTrue ? 'DOĞRU' : 'YANLIŞ') + ' olmalıydı.', q.hint);
    }
    showNextButton();
  }

  // 3. Matching (Eşleştirme) Renderer
  function renderMatchingExercise(q, container) {
    const wrap = document.createElement('div');
    wrap.className = 'matching-board';

    const leftCol = document.createElement('div');
    leftCol.className = 'match-col';
    const rightCol = document.createElement('div');
    rightCol.className = 'match-col';

    const pairs = q.pairs || [];
    let selectedLeft = null;
    let matchesCount = 0;

    // Shuffle right items so they don't align directly
    const shuffledRight = [...pairs].sort(() => Math.random() - 0.5);

    pairs.forEach((p, idx) => {
      const lCard = document.createElement('div');
      lCard.className = 'match-card match-card-left';
      lCard.textContent = p.left;
      lCard.dataset.pairId = idx;
      lCard.onclick = () => {
        playSound('pop');
        document.querySelectorAll('.match-card-left').forEach(c => c.classList.remove('selected'));
        lCard.classList.add('selected');
        selectedLeft = { element: lCard, id: idx };
      };
      leftCol.appendChild(lCard);
    });

    shuffledRight.forEach((p) => {
      const origIdx = pairs.findIndex(orig => orig.right === p.right);
      const rCard = document.createElement('div');
      rCard.className = 'match-card match-card-right';
      rCard.textContent = p.right;
      rCard.dataset.pairId = origIdx;

      rCard.onclick = () => {
        if (!selectedLeft) {
          alert('Önce sol sütundan bir kart seçmelisin! 👈');
          return;
        }
        if (selectedLeft.id === origIdx) {
          // Correct Match!
          playSound('correct');
          selectedLeft.element.classList.remove('selected');
          selectedLeft.element.classList.add('matched');
          rCard.classList.add('matched');
          selectedLeft = null;
          matchesCount++;

          if (matchesCount === pairs.length) {
            playSound('levelup');
            state.quiz.score++;
            showFeedback(true, 'Tüm Eşleştirmeler Doğru! Süpersin! 🎯', q.hint);
            showNextButton();
          }
        } else {
          // Wrong match
          playSound('wrong');
          rCard.style.borderColor = 'var(--error)';
          setTimeout(() => {
            rCard.style.borderColor = '';
          }, 600);
        }
      };
      rightCol.appendChild(rCard);
    });

    wrap.appendChild(leftCol);
    wrap.appendChild(rightCol);
    container.appendChild(wrap);
  }

  function showFeedback(isCorrect, title, text) {
    const fb = document.getElementById('quiz-feedback');
    const icon = document.getElementById('quiz-feedback-icon');
    const t = document.getElementById('quiz-feedback-title');
    const d = document.getElementById('quiz-feedback-text');

    if (fb && icon && t && d) {
      icon.textContent = isCorrect ? '🎉' : '💡';
      t.textContent = title;
      d.textContent = text || '';
      fb.className = 'quiz-feedback ' + (isCorrect ? 'correct-fb' : 'incorrect-fb');
      fb.style.display = 'flex';
    }
  }

  function showNextButton() {
    const nw = document.getElementById('quiz-next-wrap');
    const lbl = document.getElementById('quiz-next-label');
    const isLast = state.quiz.currentIdx === state.quiz.questions.length - 1;
    if (lbl) lbl.textContent = isLast ? 'Sonucu Gör ve Ödülünü Al!' : 'Sonraki Alıştırma →';
    if (nw) nw.style.display = 'block';
  }

  function finishQuiz() {
    const topicId = state.quiz.topicId;
    if (topicId && !state.progress.completedTopics.includes(topicId)) {
      state.progress.completedTopics.push(topicId);
    }
    const starsEarned = 30;
    const xpEarned    = 100;
    state.profile.stars += starsEarned;
    state.profile.xp    += xpEarned;
    state.profile.level = Math.floor(state.profile.xp / 100) + 1;

    saveState();
    updateHeader();
    renderVictory(state.quiz.subject, state.quiz.topicTitle, starsEarned, xpEarned);
  }

  /* ─── VICTORY SCREEN ────────────────────────────────────────── */
  function renderVictory(subjectKey, topicTitle, starsEarned, xpEarned) {
    playSound('levelup');
    showScreen('screen-victory');

    const subEl = document.getElementById('victory-subtitle');
    const stEl  = document.getElementById('victory-stars');
    const xpEl  = document.getElementById('victory-xp');
    const lvNum = document.getElementById('victory-level-num');
    const nxtLv = document.getElementById('victory-next-level');
    const lvBar = document.getElementById('victory-level-bar');

    const sc = SUBJECTS[subjectKey];
    if (subEl) subEl.textContent = (sc ? sc.title : '') + ' • ' + topicTitle;
    if (stEl)  stEl.textContent  = '+' + starsEarned;
    if (xpEl)  xpEl.textContent  = '+' + xpEarned;
    if (lvNum) lvNum.textContent = state.profile.level;
    if (nxtLv) nxtLv.textContent = state.profile.level + 1;

    const progressInLevel = state.profile.xp % 100;
    if (lvBar) lvBar.style.width = Math.max(15, progressInLevel) + '%';

    const nextMission = document.getElementById('btn-next-mission');
    const backToTopics = document.getElementById('btn-back-to-topics');
    if (nextMission) {
      nextMission.onclick = () => openSubjectDetail(subjectKey);
    }
    if (backToTopics) {
      backToTopics.onclick = () => openSubjectDetail(subjectKey);
    }

    runConfetti();
  }

  function runConfetti() {
    const canvas = document.getElementById('victory-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;

    const colors = ['#ffb300', '#005bb3', '#48d99e', '#ff6b6b', '#a855f7'];
    const pieces = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.4,
      r: Math.random() * 6 + 3,
      d: Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltAngleInc: Math.random() * 0.07 + 0.05
    }));

    let frames = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.d);
        p.tilt = Math.sin(p.tiltAngle) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });
      frames++;
      if (frames < 140) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    draw();
  }

  /* ─── KİTAPLIK SCREEN (STITCH FİLTRELİ & SPOTLIGHT) ───────── */
  const ALL_STORIES = [
    { id: 'masal-1', title: 'Küçük Yıldızın Yolculuğu', cat: 'masal', emoji: '⭐', time: '5 dk', desc: 'Gökkuşağı köprüsündeki sihirli dostluk macerası.', text: 'Bir varmış, bir yokmuş. Gökyüzünün en parlak yıldızı olmak isteyen Küçük Yıldız, dostlarıyla paylaşmanın ve yardımlaşmanın gerçek parlaklık olduğunu keşfetmiş.' },
    { id: 'masal-2', title: 'Tilki ile Bilge Leylek', cat: 'degerler', emoji: '🦊', time: '4 dk', desc: 'Paylaşmanın ve dostluğun önemi üzerine bir fabl.', text: 'Bilge leylek ile kurnaz tilki bir gün sofrada buluşmuşlar. Paylaşmayı ve birbirine saygı duymayı öğrenmişler.' },
    { id: 'masal-3', title: 'Kayıp Gezegenin Sırrı', cat: 'bilim', emoji: '🪐', time: '6 dk', desc: 'Uzayda güneş sistemini ve gezegenleri keşfet.', text: 'Ali ve Ayşe, oyuncak roketleriyle gökyüzüne bakarken Dünya\'nın atmosferini ve güneş sisteminin gizemli gezegenlerini keşfe çıkmışlar.' },
    { id: 'masal-4', title: 'Güneşin Neşeli Şiiri', cat: 'siir', emoji: '☀️', time: '3 dk', desc: 'Doğanın uyanışını anlatan ritmik çocuk şiiri.', text: 'Sabah oldu aç gözünü, Güneş yayar neşesini. Kuşlar öter cıvıl cıvıl, Çalış çocuk hiç durmadan bil.' },
    { id: 'masal-5', title: 'Tohumun Mucizesi', cat: 'bilim', emoji: '🌱', time: '5 dk', desc: 'Toprağın altındaki küçük tohumun uyanışı.', text: 'Toprağın sıcak koynunda uyuyan tohum, ilkbahar yağmurlarıyla can buldu. Önce kök saldı toprağa, sonra uzandı mavi göğe.' },
    { id: 'masal-6', title: 'İyilik Yapan İyilik Bulur', cat: 'degerler', emoji: '❤️', time: '4 dk', desc: 'Yardımlaşma ve dürüstlük masalı.', text: 'Küçük bir karıncayı sudan kurtaran güvercin, gün gelip karıncanın yardımıyla avcının tuzağından kurtulmuş. İyilik asla karşılıksız kalmazmış.' }
  ];

  function renderKitaplik() {
    filterStories('all', document.querySelector('.filter-chip-btn[data-cat="all"]'));

    const spotlightListenBtn = document.getElementById('btn-spotlight-listen');
    if (spotlightListenBtn) {
      spotlightListenBtn.onclick = () => {
        SpeechService.speak(ALL_STORIES[0].text, false, spotlightListenBtn);
      };
    }
  }

  function filterStories(cat, chipBtn) {
    if (chipBtn) {
      document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.remove('active-chip'));
      chipBtn.classList.add('active-chip');
    }

    const list = document.getElementById('story-list');
    if (!list) return;
    list.innerHTML = '';
    list.className = 'story-grid-responsive';

    const filtered = cat === 'all' ? ALL_STORIES : ALL_STORIES.filter(s => s.cat === cat);

    filtered.forEach(s => {
      const item = document.createElement('div');
      item.className = 'story-card-compact';
      item.innerHTML = `
        <div class="story-icon-box">${s.emoji}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h4 class="story-title-compact">${s.title}</h4>
            <span style="font-size:11px;color:var(--secondary);font-weight:700">${s.time}</span>
          </div>
          <p class="story-desc-compact">${s.desc}</p>
        </div>
        <button class="btn-listen-icon" title="Dinle">
          <span class="material-symbols-outlined icon-fill" style="font-size:18px;color:var(--secondary)">play_arrow</span>
        </button>
      `;
      item.onclick = () => {
        SpeechService.speak(s.text, false, item.querySelector('.btn-listen-icon'));
      };
      list.appendChild(item);
    });
  }
  window.filterStories = filterStories;

  function openStoryModal(title, text) {
    alert(`${title}

${text}`);
  }
  window.openStoryModal = openStoryModal;

  /* ─── GELİŞİM SCREEN (STITCH AVATAR WORKSHOP & STAR SHOP) ──── */
  const SHOP_ITEMS = [
    { id: 'hat_grad',     type: 'hat',     name: 'Mezuniyet Kepi', icon: '🎓', price: 20 },
    { id: 'hat_detect',   type: 'hat',     name: 'Dedektif Şapkası', icon: '🕵️', price: 30 },
    { id: 'hat_crown',    type: 'hat',     name: 'Altın Taç',      icon: '👑', price: 50 },
    { id: 'hat_straw',    type: 'hat',     name: 'Yaz Şapkası',    icon: '👒', price: 15 },
    { id: 'glass_wise',   type: 'glasses', name: 'Bilge Gözlüğü',  icon: '👓', price: 25 },
    { id: 'glass_sun',    type: 'glasses', name: 'Güneş Gözlüğü',  icon: '🕶️', price: 35 }
  ];

  function renderGelisim() {
    const stStars  = document.getElementById('stat-stars');
    const stStreak = document.getElementById('stat-streak');
    const stLevel  = document.getElementById('stat-level');
    const shopBal  = document.getElementById('shop-star-balance');

    if (stStars)  stStars.textContent  = state.profile.stars;
    if (stStreak) stStreak.textContent = state.profile.streak;
    if (stLevel)  stLevel.textContent  = state.profile.level;
    if (shopBal)  shopBal.textContent  = `⭐ ${state.profile.stars} Yıldız`;

    // Stage preview
    updateAvatarStage();

    // Base avatar selector
    const avatarArea = document.getElementById('avatar-area');
    if (avatarArea) {
      avatarArea.innerHTML = '';
      const avatars = ['🦊','🦉','🐯','🐸','🦁','🐧'];
      avatars.forEach(av => {
        const chip = document.createElement('div');
        chip.className = 'avatar-chip' + (state.profile.avatar === av ? ' selected' : '');
        chip.innerHTML = `<span style="font-size:24px">${av}</span>`;
        chip.onclick = () => {
          playSound('click');
          state.profile.avatar = av;
          saveState();
          updateHeader();
          updateAvatarStage();
          renderGelisim();
        };
        avatarArea.appendChild(chip);
      });
    }

    // Star Shop Items
    renderStarShop();

    // Badges
    renderBadges();
  }

  function updateAvatarStage() {
    const stageEmoji = document.getElementById('stage-mascot-emoji');
    const hatEl = document.getElementById('equipped-hat');
    const glassEl = document.getElementById('equipped-glasses');

    if (stageEmoji) stageEmoji.textContent = state.profile.avatar || '🦊';
    if (hatEl) hatEl.textContent = state.profile.equippedHat || '';
    if (glassEl) glassEl.textContent = state.profile.equippedGlasses || '';

    // Also update header avatar
    const hAvatar = document.getElementById('header-avatar');
    if (hAvatar) {
      hAvatar.textContent = (state.profile.equippedHat ? state.profile.equippedHat + ' ' : '') + (state.profile.avatar || '🦊');
    }
  }

  function renderStarShop() {
    const grid = document.getElementById('star-shop-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const inv = state.profile.inventory || [];

    SHOP_ITEMS.forEach(item => {
      const isOwned = inv.includes(item.id);
      const isEquipped = (item.type === 'hat' && state.profile.equippedHat === item.icon) ||
                         (item.type === 'glasses' && state.profile.equippedGlasses === item.icon);

      const card = document.createElement('div');
      card.className = 'shop-item-card';

      let btnClass = 'btn-shop-buy';
      let btnLabel = `Satın Al (${item.price} ⭐)`;
      let btnAction = `buyShopItem('${item.id}', ${item.price}, '${item.type}', '${item.icon}')`;

      if (isEquipped) {
        btnClass = 'btn-shop-equipped';
        btnLabel = 'Çıkar ❌';
        btnAction = `unequipShopItem('${item.type}')`;
      } else if (isOwned) {
        btnClass = 'btn-shop-buy';
        btnLabel = 'Giy ✨';
        btnAction = `equipShopItem('${item.type}', '${item.icon}')`;
      }

      card.innerHTML = `
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-title">${item.name}</div>
        <span class="shop-item-price">⭐ ${item.price} Yıldız</span>
        <button class="btn-shop-action ${btnClass}" onclick="${btnAction}">${btnLabel}</button>
      `;

      grid.appendChild(card);
    });
  }

  function buyShopItem(id, price, type, icon) {
    if (state.profile.stars < price) {
      alert(`Yetersiz Yıldız! 🌟 Bu eşya için ${price} yıldız gerekiyor. Test çözerek yıldız topla!`);
      return;
    }
    playSound('levelup');
    state.profile.stars -= price;
    if (!state.profile.inventory) state.profile.inventory = [];
    state.profile.inventory.push(id);

    // Auto equip
    if (type === 'hat') state.profile.equippedHat = icon;
    if (type === 'glasses') state.profile.equippedGlasses = icon;

    saveState();
    updateHeader();
    renderGelisim();
  }
  window.buyShopItem = buyShopItem;

  function equipShopItem(type, icon) {
    playSound('pop');
    if (type === 'hat') state.profile.equippedHat = icon;
    if (type === 'glasses') state.profile.equippedGlasses = icon;
    saveState();
    updateHeader();
    renderGelisim();
  }
  window.equipShopItem = equipShopItem;

  function unequipShopItem(type) {
    playSound('pop');
    if (type === 'hat') state.profile.equippedHat = '';
    if (type === 'glasses') state.profile.equippedGlasses = '';
    saveState();
    updateHeader();
    renderGelisim();
  }
  window.unequipShopItem = unequipShopItem;

  function renderBadges() {
    const badgeGrid = document.getElementById('badge-grid');
    if (!badgeGrid) return;
    badgeGrid.innerHTML = '';
    const badges = [
      { id: 'first_topic', name: 'İlk Adım', emoji: '🌟', desc: 'İlk konuyu bitir', earned: state.progress.completedTopics.length >= 1 },
      { id: 'streak_3',    name: 'Seri Ustası', emoji: '🔥', desc: '3 gün seri yap', earned: state.profile.streak >= 3 },
      { id: 'star_60',     name: 'Şampiyon', emoji: '🏆', desc: '60 Yıldız topla', earned: state.profile.stars >= 60 },
      { id: 'level_2',     name: 'Bilge Kaşif', emoji: '🦉', desc: 'Seviye 2 ol', earned: state.profile.level >= 2 },
      { id: 'fen_lab',     name: 'Genç Bilimci', emoji: '🔬', desc: 'Fanus deneyini tamamla', earned: true },
      { id: 'reader',      name: 'Kitap Kurdu', emoji: '📚', desc: 'Masalları dinle', earned: true }
    ];
    badges.forEach(b => {
      const item = document.createElement('div');
      item.className = 'badge-chip' + (b.earned ? '' : ' locked');
      item.innerHTML = `
        <div class="badge-chip-icon">${b.emoji}</div>
        <div class="badge-chip-name">${b.name}</div>
        <div class="badge-chip-desc">${b.desc}</div>
      `;
      badgeGrid.appendChild(item);
    });
  }


  /* ─── EVENT LISTENERS ───────────────────────────────────────── */
  function initEvents() {
    SpeechService.init();

    // Nav Tab Click
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        playSound('click');
        const tabKey = this.dataset.tab;
        if (tabKey) setActiveTab(tabKey);
      });
    });

    const qpm = document.getElementById('qp-matematik');
    const qpt = document.getElementById('qp-turkce');
    if (qpm) qpm.onclick = () => {
      playSound('click');
      const topic = getFirstActiveTopic('matematik');
      if (topic) startQuiz('matematik', topic.id);
    };
    if (qpt) qpt.onclick = () => {
      playSound('click');
      const topic = getFirstActiveTopic('turkce');
      if (topic) startQuiz('turkce', topic.id);
    };

    const quitBtn = document.getElementById('btn-quit-quiz');
    if (quitBtn) quitBtn.onclick = () => {
      playSound('click');
      openSubjectDetail(state.quiz.subject || 'matematik');
    };

    const nextBtn = document.getElementById('btn-quiz-next');
    if (nextBtn) nextBtn.onclick = () => {
      playSound('click');
      state.quiz.currentIdx++;
      if (state.quiz.currentIdx >= state.quiz.questions.length) {
        finishQuiz();
      } else {
        renderQuizQuestion();
      }
    };
  }

  /* ─── INITIALIZATION (Direct single splash to dashboard) ─── */
  function startApp() {
    loadState();
    initEvents();

    showScreen('screen-splash');
    setTimeout(() => {
      setActiveTab('macera');
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }

})(window);