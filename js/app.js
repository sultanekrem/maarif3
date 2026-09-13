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

  /* ─── ETKİNLİK SCREEN ─────────────────────────────────────── */
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

    const listContainer = document.createElement('div');
    listContainer.className = 'subject-overview-list';

    SUBJECT_ORDER.forEach((key, subjIdx) => {
      const cfg = SUBJECTS[key];
      const topics = getAllTopics(key);
      const done = topics.filter(t => isTopicCompleted(t.id)).length;
      const pct = topics.length ? Math.round((done / topics.length) * 100) : 0;
      const activeTopic = getFirstActiveTopic(key);

      const item = document.createElement('div');
      item.className = 'subject-row-card';

      item.innerHTML = `
        <div class="subject-row-icon" style="background:${cfg.bg}">
          <span class="material-symbols-outlined" style="color:${cfg.accent}">${cfg.icon}</span>
        </div>
        <div class="subject-row-main">
          <div style="display:flex; justify-content:space-between; align-items:baseline;">
            <h4 class="subject-row-title">${subjIdx+1}. ${cfg.title}</h4>
            <span class="subject-row-pct" style="color:${cfg.accent}">%${pct}</span>
          </div>
          <p class="subject-row-sub">${activeTopic ? activeTopic.title : 'Tüm üniteler bitti'} (${topics.length} Konu)</p>
          <div class="subject-row-bar">
            <div style="width:${pct}%; background:${cfg.accent}; height:100%; border-radius:4px;"></div>
          </div>
        </div>
        <button class="btn-sub-action" style="color:${cfg.accent}; border-color:${cfg.accent};">Konular →</button>
      `;

      item.addEventListener('click', () => {
        openSubjectDetail(key);
      });

      listContainer.appendChild(item);
    });

    tree.appendChild(listContainer);
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

  /* ─── WORKBOOK READER SCREEN ──────────────────────────────── */
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
          <p><strong>Kural:</strong> ${fc.rule || ''}</p>
          ${fc.example ? `<p style="margin-top:4px"><strong>Örnek:</strong> ${fc.example}</p>` : ''}
          ${fc.tip ? `<p style="margin-top:4px;color:#a16207"><strong>⚠️ Dikkat:</strong> ${fc.tip}</p>` : ''}
        </div>
      `;
      contentEl.appendChild(fcCard);
    }

    // 2. Reading Pages (Discovery, Models, Tables)
    if (topic.reading_pages && topic.reading_pages.length) {
      topic.reading_pages.forEach(p => {
        const pCard = document.createElement('div');
        pCard.className = 'workbook-section-card';

        let inner = `<span class="workbook-section-badge">${p.badge || 'DERS KİTABI ANLATIMI'}</span>`;
        if (p.title) inner += `<h3 class="text-headline-sm font-comfortaa" style="font-size:15px;color:var(--primary)">${p.title}</h3>`;
        if (p.story) {
          inner += `<p class="text-body-md" style="line-height:22px;color:var(--on-surface)">${p.story}</p>`;
          fullSpokenText += p.story + ' ';
        }
        if (p.content) {
          inner += `<p class="text-body-sm" style="line-height:20px;color:var(--on-surface-variant)">${p.content}</p>`;
          fullSpokenText += p.content + ' ';
        }
        if (p.model_html) inner += p.model_html;
        if (p.table_html) inner += p.table_html;
        if (p.info_box) {
          inner += `
            <div class="info-box-golden" style="margin-top:8px">
              <div class="info-box-title"><span>🌟</span> ${p.info_box.title || 'BİLGİ KUTUSU'}</div>
              <div class="info-box-content">${p.info_box.content || ''}</div>
            </div>`;
          fullSpokenText += (p.info_box.content || '') + ' ';
        }
        if (p.tip) {
          inner += `<p style="font-size:12px;font-weight:700;color:var(--secondary);margin-top:6px">💡 ${p.tip}</p>`;
        }

        pCard.innerHTML = inner;
        contentEl.appendChild(pCard);
      });
    } else {
      // Fallback descriptive text if no reading_pages
      const descCard = document.createElement('div');
      descCard.className = 'workbook-section-card';
      descCard.innerHTML = `
        <span class="workbook-section-badge">KONU KAZANIMI</span>
        <h3 class="text-headline-sm font-comfortaa">${topic.title}</h3>
        <p class="text-body-md" style="line-height:22px">${topic.desc || 'Bu konuda 3. sınıf MEB müfredatı temel kavramları ve alıştırmaları yer alır.'}</p>
      `;
      contentEl.appendChild(descCard);
      fullSpokenText += topic.desc || '';
    }

    // Audio button for reading the lesson aloud
    const listenBtn = document.getElementById('btn-listen-workbook');
    if (listenBtn) {
      const isEn = subjectKey === 'ingilizce';
      listenBtn.onclick = () => {
        SpeechService.speak(fullSpokenText.slice(0, 500), isEn, listenBtn);
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

  // 1. Multiple Choice Renderer
  function renderChoiceOptions(q, container) {
    const wrap = document.createElement('div');
    wrap.className = 'quiz-options';
    const letters = ['A','B','C','D'];

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.innerHTML = `
        <div class="quiz-option-letter">${letters[idx]}</div>
        <span class="quiz-option-text">${opt}</span>
      `;
      btn.onclick = () => handleChoiceAnswer(idx, q);
      wrap.appendChild(btn);
    });

    container.appendChild(wrap);
  }

  function handleChoiceAnswer(selectedIdx, q) {
    const correct = selectedIdx === q.correct;
    const allBtns = document.querySelectorAll('.quiz-option');

    allBtns.forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === q.correct) btn.classList.add('correct');
      else if (i === selectedIdx && !correct) btn.classList.add('incorrect');
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