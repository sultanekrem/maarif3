/* ============================================================
   MAARIF YILDIZI 3 — Comprehensive App Controller (v73)
   Dual-Voice TTS, Curriculum Explorer, Workbook Reader,
   Varied Interactive Exercises (Choice, True/False, Matching)
   ============================================================ */
(function (window) {
  'use strict';

  /* ─── STATE ──────────────────────────────────────────────── */
  const state = {
    profile: { name: 'Kahraman', avatar: '🦊', stars: 0, streak: 1, level: 1, xp: 0 },
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

    const grid = document.createElement('div');
    grid.className = 'island-compact-grid';

    SUBJECT_ORDER.forEach((key) => {
      const cfg = SUBJECTS[key];
      const pct = getSubjectProgress(key);
      const isFullDone = pct === 100;
      const activeTopic = getFirstActiveTopic(key);
      const isCurrent = state.focusSubject === key && !isFullDone;

      const card = document.createElement('div');
      card.className = 'island-card-stitch' + (isCurrent ? ' island-active' : (isFullDone ? ' island-done' : ''));

      card.innerHTML = `
        <div class="island-icon-box" style="background:${cfg.bg}">
          <span>${cfg.emoji}</span>
        </div>
        <div class="island-info">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="island-subject-name" style="color:${cfg.accent}">${cfg.title}</span>
            <span class="island-badge-status">${pct}%</span>
          </div>
          <div class="island-topic-title">${activeTopic ? activeTopic.title : 'Tamamlandı'}</div>
          <div class="island-progress-line">
            <div class="island-progress-fill" style="width:${pct}%; background:${cfg.accent}"></div>
          </div>
        </div>
      `;

      // Clicking an island opens the complete subject explorer!
      card.addEventListener('click', () => {
        openSubjectDetail(key);
      });

      grid.appendChild(card);
    });

    map.appendChild(grid);
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
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:14px">${isDone ? '✅' : '📍'}</span>
                <span class="topic-title-span">${t.title}</span>
                <span class="section-label" style="font-size:10px;padding:1px 6px">s. ${t.page || ''}</span>
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

    if (badgeEl) badgeEl.textContent = (cfg ? cfg.title : '') + (topic.page ? ' • Sayfa ' + topic.page : '');
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

  /* ─── QUIZ ENGINE (CHOICE, TRUE/FALSE, MATCHING) ───────────── */
  function buildQuestionsForTopic(subjectKey, topic) {
    const list = [];
    const tasks = topic.tasks || [];

    // 1. Multiple Choice Questions from genuine tasks
    tasks.forEach(task => {
      const qText = task.q || task.question;
      const opts  = task.options || [];
      const ans   = typeof task.ans === 'number' ? task.ans : (typeof task.correct === 'number' ? task.correct : 0);
      const hint  = task.hint || task.explanation || 'Tebrikler, doğru cevap!';

      if (qText && opts.length >= 2) {
        list.push({
          type: 'choice',
          question: qText,
          options: opts,
          correct: ans,
          hint: hint,
          isEnglish: subjectKey === 'ingilizce'
        });
      }
    });

    // 2. True / False (Evet / Hayır) Exercise
    if (topic.fact_card && topic.fact_card.rule) {
      list.push({
        type: 'true_false',
        question: 'DOĞRU MU, YANLIŞ MI? ' + topic.fact_card.rule.slice(0, 140),
        isTrue: true,
        hint: topic.fact_card.tip || 'Kuralı hatırla: Her zaman dikkatle oku!',
        isEnglish: false
      });
    } else if (tasks.length > 0 && tasks[0].options) {
      const sample = tasks[0];
      const correctOpt = sample.options[sample.ans || 0];
      list.push({
        type: 'true_false',
        question: 'BİLGİ KONTROLÜ: "' + sample.q + '" sorusunun doğru yanıtı "' + correctOpt + '" dir.',
        isTrue: true,
        hint: sample.hint || 'Kazanım bilgisini pekiştiriyoruz!',
        isEnglish: subjectKey === 'ingilizce'
      });
    }

    // 3. Matching (Eşleştirme) Exercise
    if (tasks.length >= 3) {
      const pairs = [];
      tasks.slice(0, 3).forEach(t => {
        const left = (t.q || '').replace(/Modellenen|sayıyı bulun:|Okunuşu|olan sayının rakamla yazılışı nedir\?|sayısında/g, '').trim().slice(0, 24) || 'Soru';
        const right = t.options && t.options[t.ans || 0] ? String(t.options[t.ans || 0]).slice(0, 24) : 'Cevap';
        pairs.push({ left: left, right: right });
      });
      list.push({
        type: 'matching',
        question: 'KAVRAM EŞLEŞTİRME: Sol taraftaki ifadeleri sağdaki doğru karşılıklarıyla eşleştir!',
        pairs: pairs,
        hint: 'Harika eşleştirmeler yaptın!',
        isEnglish: subjectKey === 'ingilizce'
      });
    }

    // If completely empty, generate robust subject questions
    if (!list.length) {
      list.push({
        type: 'choice',
        question: topic.title + ' konusundaki alıştırmaya hazır mısın?',
        options: ['Hazırım 🚀', 'Tekrar Bakayım', 'Kolay Gelsin', 'Hadi Başlayalım'],
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

    // 1. Bilge Kuş Mascot Tip Bubble
    if (mascotTipRow && mascotTipText) {
      const tipContent = q.hint || 'Soruyu dikkatle oku, doğru cevabı kolayca bulacaksın! 🦉';
      mascotTipText.textContent = tipContent;
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
      const icon = btn.querySelector('.opt-indicator-icon');
      if (i === q.correct) {
        btn.classList.add('correct');
        if (icon) icon.textContent = 'check_circle';
      } else if (i === selectedIdx && !correct) {
        btn.classList.add('incorrect');
        if (icon) icon.textContent = 'cancel';
      }
    });

    if (correct) {
      playSound('correct');
      state.quiz.score++;
      showFeedback(true, 'Tebrikler! Doğru Cevap! 🎉', q.hint);
    } else {
      playSound('wrong');
      showFeedback(false, 'Neredeyse! Doğru Yanıt: ' + q.options[q.correct], q.hint);
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

  /* ─── KİTAPLIK SCREEN ─────────────────────────────────────── */
  function renderKitaplik() {
    const list = document.getElementById('story-list');
    if (!list) return;
    list.innerHTML = '';
    list.className = 'story-grid-responsive';

    const stories = [
      { id: 'masal-1', title: 'Tilki ile Bilge Leylek', subject: 'Türkçe • Anlama Masalı', emoji: '🦊', time: '4 dk', text: 'Bir varmış, bir yokmuş. Ormanın derinliklerinde bilge bir leylek ile kurnaz bir tilki yaşarmış. Leylek herkese yardım eder, tilki ise oyunlar oynarmış. Bir gün paylaşmanın en büyük erdem olduğunu öğrenmişler.' },
      { id: 'masal-2', title: 'Küçük Tohumun Yolculuğu', subject: 'Fen Bilimleri • Canlılar', emoji: '🌱', time: '5 dk', text: 'Toprağın altında uyuyan küçük tohum, güneşin ılık ışıklarını hissetti. Yağmur damlaları ona can verdi. Önce köklerini saldı, sonra gökyüzüne doğru yemyeşil yapraklarını uzattı.' },
      { id: 'masal-3', title: 'Sayılar Diyarı ve Gizemli Sıfır', subject: 'Matematik • Sayı Macerası', emoji: '🔢', time: '6 dk', text: 'Sayılar Diyarında her sayının bir basamağı vardı. Sıfır bazen tek başına bir şey ifade etmese de, diğer sayıların yanına geldiğinde onları on kat büyütür, değerlerine değer katardı.' },
      { id: 'masal-4', title: 'Bizim Güzel Mahallemiz', subject: 'Hayat Bilgisi • Birlikte Yaşam', emoji: '🌍', time: '4 dk', text: 'Mahallemizde herkes birbirini tanır, sabahları neşeyle selamlaşırdı. Birlikte kurulan oyunlar ve yardımlaşma, mahallemizi dünyanın en huzurlu yeri yapardı.' }
    ];

    stories.forEach(s => {
      const item = document.createElement('div');
      item.className = 'story-card-compact';
      item.innerHTML = `
        <div class="story-icon-box">${s.emoji}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h4 class="story-title-compact">${s.title}</h4>
            <span style="font-size:11px;color:var(--secondary);font-weight:700">${s.time}</span>
          </div>
          <p class="story-desc-compact">${s.subject}</p>
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

    const fsBtn = document.getElementById('btn-featured-story');
    if (fsBtn) {
      fsBtn.onclick = () => {
        SpeechService.speak(stories[0].text, false, fsBtn);
      };
    }
  }

  /* ─── GELİŞİM SCREEN ──────────────────────────────────────── */
  function renderGelisim() {
    const stStars  = document.getElementById('stat-stars');
    const stStreak = document.getElementById('stat-streak');
    const stLevel  = document.getElementById('stat-level');
    const stLabel  = document.getElementById('stat-level-label');
    const stBar    = document.getElementById('stat-level-bar');

    if (stStars)  stStars.textContent  = state.profile.stars;
    if (stStreak) stStreak.textContent = state.profile.streak;
    if (stLevel)  stLevel.textContent  = state.profile.level;

    const titleIdx = Math.min(LEVEL_TITLES.length - 1, state.profile.level - 1);
    if (stLabel) stLabel.textContent = LEVEL_TITLES[titleIdx];
    const lvlPct = Math.min(100, Math.round(((state.profile.xp % 100) / 100) * 100));
    if (stBar) stBar.style.width = Math.max(15, lvlPct) + '%';

    // Avatars
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
          renderGelisim();
        };
        avatarArea.appendChild(chip);
      });
    }

    // Badges
    const badgeGrid = document.getElementById('badge-grid');
    if (badgeGrid) {
      badgeGrid.innerHTML = '';
      const badges = [
        { id: 'first_topic', name: 'İlk Adım', emoji: '🌟', desc: 'İlk konuyu bitir', earned: state.progress.completedTopics.length >= 1 },
        { id: 'streak_3',    name: 'Seri Ustası', emoji: '🔥', desc: '3 gün seri yap', earned: state.profile.streak >= 3 },
        { id: 'star_60',     name: 'Şampiyon', emoji: '🏆', desc: '60 Yıldız topla', earned: state.profile.stars >= 60 },
        { id: 'level_2',     name: 'Bilge Kaşif', emoji: '🦉', desc: 'Seviye 2 ol', earned: state.profile.level >= 2 },
        { id: 'focus_done',  name: 'Keskin Nişancı', emoji: '🎯', desc: '3 görev tamamla', earned: state.progress.completedTopics.length >= 3 },
        { id: 'reader',      name: 'Kitap Kurdu', emoji: '📚', desc: 'Masalları dinle', earned: true }
      ];
      badges.forEach(b => {
        const item = document.createElement('div');
        item.className = 'badge-chip' + (b.earned ? '' : ' locked');
        item.innerHTML = `
          <div class="badge-chip-icon">${b.emoji}</div>
          <span class="badge-chip-name">${b.name}</span>
          <span style="font-size:9px; color:${b.earned ? 'var(--tertiary)' : 'var(--outline)'}; font-weight:700;">
            ${b.earned ? 'Kazanıldı ✓' : b.desc}
          </span>`;
        badgeGrid.appendChild(item);
      });
    }
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