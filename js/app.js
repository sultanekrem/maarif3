/* ============================================================
   MAARIF YILDIZI 3 — STITCH V2 KONTROLCÜSÜ (4-SEKME AKIŞI)
   Macera • Etkinlik • Kitaplık • Gelişim
   ============================================================ */

(function (window) {
  'use strict';

  // --- STATE ---
  const state = {
    profile: {
      name: 'Efe',
      avatar: '🤠',
      stars: 380,
      streak: 5,
      level: 5,
      xp: 450,
      equipped: {
        caps: 'Kaşif Şapkası',
        glasses: null,
        mascots: '🦉 Bilge Kuş',
        badges: 'Kusursuz Çarpma Ustası'
      }
    },
    progress: {
      completedTopics: ['mat_t1_1', 'tur_t1_1'],
      unlockedUnits: ['mat_theme_1', 'mat_theme_2', 'tur_theme_1', 'fen_theme_1']
    },
    quiz: {
      subject: null,
      topicId: null,
      topicTitle: '',
      questions: [],
      currentIdx: 0,
      score: 0
    },
    currentTab: 'macera',
    activeWardrobeCategory: 'caps'
  };

  const SUBJECTS = {
    matematik:    { title: 'Matematik',     emoji: '🔢', color: '#ffb300', bg: '#fef3c7', islandName: 'Geometri Şatosu', islandSub: 'Çarpım Tablosu Alıştırması', iconBg: '#ffdeac' },
    fenbilimleri: { title: 'Fen Bilimleri', emoji: '🔬', color: '#10b981', bg: '#d1fae5', islandName: 'Kuvvet Laboratuvarı', islandSub: '5 Duyu & İtme Çekme', iconBg: '#6ffbbe' },
    turkce:       { title: 'Türkçe',        emoji: '📖', color: '#0284c7', bg: '#e0f2fe', islandName: 'Masal Ormanı', islandSub: 'Eş Anlamlı Sözcükler', iconBg: '#d6e3ff' },
    hayatbilgisi: { title: 'Hayat Bilgisi', emoji: '🌍', color: '#f43f5e', bg: '#ffe4e6', islandName: 'Toplum Vadisi', islandSub: 'Okulumuzda Hayat', iconBg: '#fed7aa' },
    ingilizce:    { title: 'İngilizce',     emoji: '🌐', color: '#8b5cf6', bg: '#ede9fe', islandName: 'Magic Words', islandSub: 'Ünite 3 Hazırlık', iconBg: '#ddd6fe' },
    muzik:        { title: 'Müzik',         emoji: '🎵', color: '#ec4899', bg: '#fce7f3', islandName: 'Ritim Vadisi', islandSub: 'Notalar ve Sesler', iconBg: '#fbcfe8' }
  };

  const SUBJECT_ORDER = ['matematik', 'fenbilimleri', 'turkce', 'hayatbilgisi', 'ingilizce', 'muzik'];

  // --- AUDIO SYSTEM ---
  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'levelup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {}
  }

  // --- TTS SPEECH SERVICE (Real dual voice) ---
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
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      this.isSpeaking = false;
      if (this.activeButton) {
        this.activeButton.classList.remove('is-speaking');
        this.activeButton = null;
      }
    },

    speak: function(text, isEnglish, btnEl) {
      if (!text) return;
      if (this.isSpeaking && this.activeButton === btnEl) {
        this.stop();
        return;
      }
      this.stop();
      this.isSpeaking = true;
      this.activeButton = btnEl;
      if (btnEl) btnEl.classList.add('is-speaking');

      const voice = isEnglish ? 'jenny' : 'emel';
      if (navigator.onLine !== false && this.audioPlayer) {
        try {
          const url = '/api/tts?text=' + encodeURIComponent(text.slice(0, 500)) + '&voice=' + voice;
          this.audioPlayer.src = url;
          const p = this.audioPlayer.play();
          if (p && p.catch) p.catch(() => this._fallbackTTS(text, isEnglish));
          return;
        } catch (e) {}
      }
      this._fallbackTTS(text, isEnglish);
    },

    _fallbackTTS: function(text, isEnglish) {
      if (!('speechSynthesis' in window)) { this.stop(); return; }
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = isEnglish ? 'en-US' : 'tr-TR';
      utt.rate = 0.9;
      const voices = this.cachedVoices;
      const pref = voices.find(v => isEnglish ? v.lang.startsWith('en') : v.lang.startsWith('tr'));
      if (pref) utt.voice = pref;
      utt.onend = () => this.stop();
      utt.onerror = () => this.stop();
      window.speechSynthesis.speak(utt);
    }
  };

  // --- DATA SANITIZERS ---
  const PDF_NOISE = /===\s*PAGE\s*\d+\s*===.*$|\d+\s*ÖLÇME.*$|ÖLÇME,?\s*DEĞERLENDİRME.*$|SINAV\s*HİZMETLERİ.*$|GENEL\s*MÜDÜRLÜĞÜ.*$/gi;
  const ANSWER_SPOILER = /MEB\s*Kazanımı\s*:\s*Doğru\s*cevap\s+.*?\([A-D]\s*seçeneği\)\.?|MEB\s*Kazanımı\s*:\s*/gi;
  const GENERIC_HINTS = [
    'Soruyu dikkatlice oku ve tüm şıkları karşılaştır! 🦉',
    'Konuyu hatırla ve adım adım düşün. Yapabilirsin! 💪',
    'İlk önce kesin yanlış olanları elemeyi dene! 🎯',
    'Bu konuyu çalışma kitabından gözden geçirebilirsin! 📖',
    'Her şık için "Bu doğru mu?" diye kendine sor! 🤔'
  ];
  let _hintIdx = 0;

  function cleanOption(text) {
    if (!text) return '';
    let t = String(text).replace(PDF_NOISE, '').trim().replace(/\|+$/, '').trim();
    return t.length > 70 ? t.slice(0, 67) + '…' : (t || String(text).slice(0, 40));
  }

  function cleanHint(text) {
    if (!text) return GENERIC_HINTS[_hintIdx++ % GENERIC_HINTS.length];
    let t = String(text).replace(ANSWER_SPOILER, '').replace(/^\s*:\s*/, '').trim();
    return t.length < 6 ? GENERIC_HINTS[_hintIdx++ % GENERIC_HINTS.length] : t;
  }

  // --- CURRICULUM HELPERS ---
  function getCurriculum() {
    return window.CURRICULUM_TERM1 || {};
  }

  function getAllTopics(subj) {
    const data = getCurriculum()[subj];
    if (!data || !data.themes) return [];
    let topics = [];
    data.themes.forEach(th => {
      if (th.topics) topics.push(...th.topics);
    });
    return topics;
  }

  function isTopicDone(id) {
    return state.progress.completedTopics.includes(id);
  }

  function saveState() {
    try {
      localStorage.setItem('maarif3_v2_profile', JSON.stringify(state.profile));
      localStorage.setItem('maarif3_v2_progress', JSON.stringify(state.progress));
    } catch (e) {}
  }

  function loadState() {
    try {
      const p = localStorage.getItem('maarif3_v2_profile');
      const r = localStorage.getItem('maarif3_v2_progress');
      if (p) Object.assign(state.profile, JSON.parse(p));
      if (r) Object.assign(state.progress, JSON.parse(r));
    } catch (e) {}
  }

  // --- NAVIGATION ---
  function showScreen(id) {
    SpeechService.stop();
    document.querySelectorAll('.maarif-screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    const header = document.getElementById('maarif-header');
    const nav = document.getElementById('maarif-nav');

    if (['screen-macera', 'screen-etkinlik', 'screen-kitaplik', 'screen-gelisim'].includes(id)) {
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

    showScreen('screen-' + tab);

    if (tab === 'macera') renderMacera();
    else if (tab === 'etkinlik') renderEtkinlik();
    else if (tab === 'kitaplik') renderKitaplik();
    else if (tab === 'gelisim') renderGelisim();
  }
  window.setActiveTab = setActiveTab;

  function updateHeader() {
    const starsEl = document.getElementById('header-stars-val');
    const streakEl = document.getElementById('header-streak-val');
    const avatarEl = document.getElementById('header-avatar-preview');
    if (starsEl) starsEl.textContent = state.profile.stars;
    if (streakEl) streakEl.textContent = state.profile.streak;
    if (avatarEl) avatarEl.textContent = state.profile.avatar;
  }

  // --- 1. SEKME: MACERA (ANA SAYFA) ---
  function renderMacera() {
    // 1. Karşılama Kartı
    const greetingTitle = document.getElementById('home-greeting');
    if (greetingTitle) greetingTitle.textContent = `Harika gidiyorsun, ${state.profile.name}! 🚀`;

    const doneCount = state.progress.completedTopics.length;
    const todayGoal = 5;
    const todayDone = Math.min(doneCount, todayGoal);
    const pct = Math.round((todayDone / todayGoal) * 100);

    const progText = document.getElementById('home-progress-text');
    const progBar = document.getElementById('home-progress-bar');
    if (progText) progText.textContent = `${todayDone} / ${todayGoal} Tamamlandı`;
    if (progBar) progBar.style.width = `${pct}%`;

    // 2. Kavisli Ada Haritası Renderı
    const mapArea = document.getElementById('adventure-map-area');
    if (mapArea) {
      mapArea.innerHTML = '';

      // SVG Patika Çizgisi
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'adventure-svg-track');
      svg.setAttribute('viewBox', '0 0 320 600');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.innerHTML = `
        <path d="M 80,60 C 260,110 260,200 240,260 C 210,330 70,360 80,450 C 90,520 260,540 240,580" 
              stroke="#d6c4ac" stroke-width="10" stroke-linecap="round" stroke-dasharray="14 14" fill="none" opacity="0.7"/>
      `;
      mapArea.appendChild(svg);

      // Adaları Yerleştir
      const islands = [
        { key: 'matematik', align: 'right', active: true, done: false },
        { key: 'fenbilimleri', align: 'left', active: false, done: false },
        { key: 'turkce', align: 'right', active: false, done: true },
        { key: 'hayatbilgisi', align: 'left', active: false, done: false },
        { key: 'ingilizce', align: 'right', active: false, done: false }
      ];

      islands.forEach((isl, i) => {
        const subj = SUBJECTS[isl.key];
        const card = document.createElement('div');
        const alignClass = isl.align === 'left' ? 'align-left' : 'align-right';
        let stateClass = isl.done ? 'done-island' : (isl.active ? 'active-island' : 'locked-island');

        card.className = `island-tile-card ${alignClass} ${stateClass}`;
        
        let beaconHtml = isl.active ? `<div class="beacon-pin-badge">📍 Şu Anki Durak!</div>` : '';
        let btnText = isl.done ? 'Tekrar Et 🔄' : (isl.active ? 'Hadi Oyna! 🚀' : '🔒 Kilitli');
        let btnClass = isl.active ? 'play' : 'review';

        card.innerHTML = `
          ${beaconHtml}
          <div class="island-top-info">
            <div class="island-icon-box" style="background:${subj.iconBg}">
              <span>${subj.emoji}</span>
            </div>
            <div class="island-text-col">
              <span class="island-subj-tag" style="color:${subj.color}">${subj.title}</span>
              <h4 class="island-name">${subj.islandName}</h4>
              <p class="island-topic-sub">${subj.islandSub}</p>
            </div>
          </div>
          <button class="btn-island-action ${btnClass}">
            ${btnText}
          </button>
        `;

        card.onclick = () => {
          playSound('click');
          openSubjectInCurriculum(isl.key);
        };

        mapArea.appendChild(card);
      });
    }

    // 3. Bilgi Çarkı Buton Olayı
    const btnOpenWheel = document.getElementById('btn-open-wheel');
    if (btnOpenWheel) {
      btnOpenWheel.onclick = () => openWheelModal();
    }
  }

  // --- 2. SEKME: ETKİNLİK (MÜFREDAT AĞACI) ---
  function renderEtkinlik() {
    const stack = document.getElementById('curriculum-subjects-stack');
    if (!stack) return;
    stack.innerHTML = '';

    const curr = getCurriculum();

    SUBJECT_ORDER.forEach((key, index) => {
      const subj = SUBJECTS[key];
      const data = curr[key];
      if (!data) return;

      const block = document.createElement('div');
      block.className = 'curriculum-subj-block';

      const topics = getAllTopics(key);
      const doneCount = topics.filter(t => isTopicDone(t.id)).length;
      const totalCount = topics.length;
      const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

      // Başlık
      const head = document.createElement('div');
      head.className = 'curriculum-subj-head';
      head.innerHTML = `
        <div class="subj-head-left">
          <div class="subj-icon-bubble" style="background:${subj.bg}">
            <span>${subj.emoji}</span>
          </div>
          <div>
            <h4 class="subj-title-text">${index + 1}. ${subj.title}</h4>
            <span class="subj-status-sub">${doneCount}/${totalCount} Konu Tamam</span>
          </div>
        </div>
        <div class="subj-progress-right">
          <span class="subj-pct-val">%${pct}</span>
        </div>
      `;

      // Ünite Listesi
      const unitList = document.createElement('div');
      unitList.className = 'subj-unit-list';

      (data.themes || []).forEach((th, thIdx) => {
        const item = document.createElement('div');
        const isDone = th.topics && th.topics.every(t => isTopicDone(t.id));
        const isActive = thIdx === 0 || isDone; // ilk ünite veya biten
        const stateCls = isDone ? 'done' : (isActive ? 'active' : 'locked');

        item.className = `unit-row-item ${stateCls}`;
        item.innerHTML = `
          <div class="unit-left-flex">
            <span>${isDone ? '✅' : (isActive ? '▶️' : '🔒')}</span>
            <span class="unit-title-span">${th.title}</span>
          </div>
          <button class="unit-btn-action ${isActive ? 'btn-continue' : 'btn-review'}">
            ${isDone ? 'Tekrar' : (isActive ? 'Devam Et' : 'Kilitli')}
          </button>
        `;

        if (isActive) {
          item.onclick = () => {
            playSound('click');
            const firstTopic = th.topics && th.topics[0];
            if (firstTopic) openWorkbook(key, firstTopic.id);
          };
        }

        unitList.appendChild(item);
      });

      block.appendChild(head);
      block.appendChild(unitList);
      stack.appendChild(block);
    });

    // Günün Odak Görevi Butonu
    const btnFocus = document.getElementById('btn-start-focus');
    if (btnFocus) {
      btnFocus.onclick = () => {
        playSound('click');
        startQuiz('matematik', 'mat_t1_4');
      };
    }

    // Rehber Aç/Kapat Butonu
    const btnToggleGuide = document.getElementById('btn-toggle-guide');
    const guideBox = document.getElementById('guide-steps-box');
    if (btnToggleGuide && guideBox) {
      btnToggleGuide.onclick = () => {
        const isHidden = guideBox.classList.contains('hidden');
        guideBox.classList.toggle('hidden');
        btnToggleGuide.textContent = isHidden ? 'Rehber ▼' : 'Rehber ▲';
      };
    }
  }

  function openSubjectInCurriculum(subjKey) {
    setActiveTab('etkinlik');
  }

  // --- 3. SEKME: KİTAPLIK ---
  function renderKitaplik() {
    const list = document.getElementById('library-books-grid');
    if (!list) return;
    list.innerHTML = '';

    const books = [
      { id: 'kucuk_yildiz', title: 'Küçük Yıldızın Yolculuğu', topic: 'MEB Hikaye Dizisi', time: '12 dk', icon: '🌟' },
      { id: 'kayip_gezegen', title: 'Kayıp Gezegenin Sırrı', topic: 'Doğa ve Çevre', time: '15 dk', icon: '🪐' },
      { id: 'dostluk_ormani', title: 'Dostluk Ormanı Macerası', topic: 'Empati & Yardımlaşma', time: '10 dk', icon: '🌳' },
      { id: 'mimar_sinan', title: 'Mimar Sinan ve Kuş Evleri', topic: 'Tarih & Kültür Mirası', time: '8 dk', icon: '🏛️' }
    ];

    books.forEach(b => {
      const card = document.createElement('div');
      card.className = 'book-card-horizontal';
      card.innerHTML = `
        <div class="book-thumb-icon">${b.icon}</div>
        <div class="book-card-info">
          <span class="book-topic-tag">${b.topic}</span>
          <h4 class="book-card-title">${b.title}</h4>
          <span class="book-card-time">⏱️ ${b.time} okuma</span>
        </div>
        <button class="btn-book-read">Oku ➔</button>
      `;
      card.onclick = () => {
        playSound('click');
        openStoryReader(b.id);
      };
      list.appendChild(card);
    });
  }

  function openStoryReader(bookId) {
    showScreen('screen-workbook');
    document.getElementById('wb-subject-pill').textContent = 'KİTAPLIK & MASAL';
    document.getElementById('wb-title').textContent = 'Küçük Yıldızın Yolculuğu';

    const wbContent = document.getElementById('wb-content');
    wbContent.innerHTML = `
      <div class="wb-rule-box">
        <h4>✨ 1. Bölüm: Gökyüzünün En Parlak Işığı</h4>
        <p>Bir varmış, bir yokmuş. Gökyüzünün derin maviliklerinde pırıl pırıl parlayan minik bir yıldız yaşarmış. Adı Işıltı'ymış. Işıltı, her gece Dünya'daki çocuklara tatlı rüyalar fısıldar, onlara rehberlik edermiş...</p>
      </div>
      <div class="wb-bullets-card">
        <strong style="display:block;margin-bottom:6px;">📖 Anlama Sorusu:</strong>
        <p>Işıltı geceleri Dünya'daki çocuklara ne yaparmış?</p>
      </div>
    `;

    document.getElementById('btn-wb-start-quiz').onclick = () => {
      startQuiz('turkce', 'tur_t1_1');
    };
  }
  window.openStoryReader = openStoryReader;

  // --- 4. SEKME: GELİŞİM (AVATAR & ROZETLER) ---
  function renderGelisim() {
    const streakEl = document.getElementById('atelier-streak-val');
    const starsEl = document.getElementById('atelier-stars-val');
    const lvlEl = document.getElementById('atelier-level-val');
    const avatarFace = document.getElementById('podium-avatar-face');

    if (streakEl) streakEl.textContent = `${state.profile.streak} Gün`;
    if (starsEl) starsEl.textContent = state.profile.stars;
    if (lvlEl) lvlEl.textContent = state.profile.level;
    if (avatarFace) avatarFace.textContent = state.profile.avatar;

    switchWardrobeCategory(state.activeWardrobeCategory || 'caps');
  }

  const WARDROBE_ITEMS = {
    caps: [
      { id: 'cap_1', name: 'Kaşif Şapkası', desc: 'Doğa Gezgini', price: 0, icon: '🤠' },
      { id: 'cap_2', name: 'Sihirli Şapka', desc: 'Gizemli Bilge', price: 80, icon: '🧙‍♂️' },
      { id: 'cap_3', name: 'Mezuniyet Kepi', desc: '10. Seviye', price: 150, icon: '🎓' },
      { id: 'cap_4', name: 'Uzay Kaskı', desc: 'Galaksi Kaşifi', price: 200, icon: '🧑‍🚀' }
    ],
    glasses: [
      { id: 'gl_1', name: 'Bilgin Gözlüğü', desc: 'Dahi Bakışlar', price: 50, icon: '👓' },
      { id: 'gl_2', name: 'Güneş Gözlüğü', desc: 'Süper Havalı', price: 90, icon: '🕶️' }
    ],
    mascots: [
      { id: 'mas_1', name: 'Bilge Kuş', desc: 'Matematik Rehberi', price: 0, icon: '🦉' },
      { id: 'mas_2', name: 'Neşeli Tilki', desc: 'Hızlı Problem Çözücü', price: 120, icon: '🦊' },
      { id: 'mas_3', name: 'Astronot Kedi', desc: 'Uzay Yolcusu', price: 250, icon: '🐱' }
    ],
    badges: [
      { id: 'bd_1', name: 'Çarpma Ustası', desc: '3. Sınıf Madalyası', price: 0, icon: '🏆' },
      { id: 'bd_2', name: 'Kitap Kurdu', desc: '5 Masal Dinlendi', price: 0, icon: '🏅' }
    ]
  };

  function switchWardrobeCategory(cat) {
    state.activeWardrobeCategory = cat;
    document.querySelectorAll('.wardrobe-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });

    const grid = document.getElementById('wardrobe-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const items = WARDROBE_ITEMS[cat] || [];
    items.forEach(item => {
      const isEquipped = state.profile.equipped[cat] === item.name || (cat === 'caps' && item.name === 'Kaşif Şapkası');
      const card = document.createElement('div');
      card.className = 'wardrobe-item-card';

      card.innerHTML = `
        <div class="wardrobe-item-icon">${item.icon}</div>
        <h4 class="wardrobe-item-name">${item.name}</h4>
        <p class="wardrobe-item-desc">${item.desc}</p>
        <button class="btn-wardrobe-action ${isEquipped ? 'equipped' : 'buy'}">
          ${isEquipped ? '✓ Kuşanıldı' : (item.price === 0 ? 'Kuşan' : item.price + ' ⭐')}
        </button>
      `;

      card.onclick = () => {
        playSound('click');
        if (!isEquipped && state.profile.stars >= item.price) {
          if (item.price > 0) state.profile.stars -= item.price;
          state.profile.equipped[cat] = item.name;
          if (cat === 'caps') state.profile.avatar = item.icon;
          saveState();
          updateHeader();
          renderGelisim();
          playSound('levelup');
        }
      };

      grid.appendChild(card);
    });
  }
  window.switchWardrobeCategory = switchWardrobeCategory;

  function openChest(type) {
    playSound('levelup');
    if (type === 'bronze') {
      state.profile.stars += 20;
      alert('🎉 Tebrikler! Bronz Sandıktan +20 Altın Yıldız kazandın!');
    } else {
      if (state.profile.stars >= 100) {
        state.profile.stars -= 100;
        state.profile.stars += 150;
        alert('🎉 Harika! Gümüş Sandıktan +150 Yıldız ve Özel Rozet kazandın!');
      } else {
        alert('Bu sandığı açmak için 100 yıldıza ihtiyacın var! Görevleri tamamlayıp yıldız topla. ⭐');
        return;
      }
    }
    saveState();
    updateHeader();
    renderGelisim();
  }
  window.openChest = openChest;

  // --- MODAL: GÜNÜN BİLGİ ÇARKI ---
  function openWheelModal() {
    const m = document.getElementById('modal-wheel');
    if (m) m.classList.remove('hidden');
    const disk = document.getElementById('wheel-spinner-disk');
    if (disk) disk.style.transform = 'rotate(0deg)';
    const qBox = document.getElementById('wheel-question-box');
    if (qBox) qBox.classList.add('hidden');
  }
  window.openWheelModal = openWheelModal;

  function closeWheelModal() {
    const m = document.getElementById('modal-wheel');
    if (m) m.classList.add('hidden');
  }
  window.closeWheelModal = closeWheelModal;

  function spinLuckyWheel() {
    playSound('click');
    const disk = document.getElementById('wheel-spinner-disk');
    const randRot = 1440 + Math.floor(Math.random() * 360);
    disk.style.transform = `rotate(${randRot}deg)`;

    setTimeout(() => {
      playSound('levelup');
      const qBox = document.getElementById('wheel-question-box');
      if (qBox) {
        qBox.classList.remove('hidden');
        const optsArea = document.getElementById('wheel-q-opts');
        optsArea.innerHTML = `
          <button class="wheel-opt-btn" onclick="answerWheelQuestion(true)">A) 28</button>
          <button class="wheel-opt-btn" onclick="answerWheelQuestion(false)">B) 24</button>
          <button class="wheel-opt-btn" onclick="answerWheelQuestion(false)">C) 32</button>
        `;
      }
    }, 3600);
  }
  window.spinLuckyWheel = spinLuckyWheel;

  function answerWheelQuestion(isCorrect) {
    if (isCorrect) {
      playSound('correct');
      state.profile.stars += 25;
      saveState();
      updateHeader();
      alert('🎉 Doğru cevap! Çarktan +25 Altın Yıldız kazandın!');
    } else {
      playSound('wrong');
      alert('Tekrar dene! 7 kere 4 = 28 eder.');
    }
    closeWheelModal();
  }
  window.answerWheelQuestion = answerWheelQuestion;

  // --- WORKBOOK (DERS ANLATIMI) ---
  function openWorkbook(subjKey, topicId) {
    const topics = getAllTopics(subjKey);
    const topic = topics.find(t => t.id === topicId) || topics[0];
    if (!topic) return;

    showScreen('screen-workbook');
    const pill = document.getElementById('wb-subject-pill');
    const title = document.getElementById('wb-title');
    if (pill) pill.textContent = (SUBJECTS[subjKey] ? SUBJECTS[subjKey].title : 'DERS').toUpperCase();
    if (title) title.textContent = topic.title;

    const ttsBtn = document.getElementById('btn-wb-tts');
    if (ttsBtn) {
      ttsBtn.onclick = () => SpeechService.speak(topic.title, subjKey === 'ingilizce', ttsBtn);
    }

    const content = document.getElementById('wb-content');
    content.innerHTML = '';

    if (topic.fact_card && topic.fact_card.rule) {
      content.innerHTML += `
        <div class="wb-rule-box">
          <h4>💡 Altın Kural</h4>
          <p>${cleanOption(topic.fact_card.rule)}</p>
        </div>
      `;
    }

    if (topic.reading_pages && topic.reading_pages.length) {
      topic.reading_pages.forEach(p => {
        if (p.example_box) {
          content.innerHTML += `
            <div class="wb-example-card">
              <strong style="color:#0369a1;display:block;margin-bottom:4px;">📝 Örnek</strong>
              <p>${cleanOption(p.example_box.question || p.example_box.problem)}</p>
              <p style="margin-top:6px;color:#1d4ed8;font-weight:700;">Çözüm: ${cleanOption(p.example_box.solution)}</p>
            </div>
          `;
        }
        if (p.key_points && p.key_points.length) {
          content.innerHTML += `
            <div class="wb-bullets-card">
              <strong style="display:block;margin-bottom:6px;">⭐ Önemli Noktalar:</strong>
              <ul>${p.key_points.map(k => `<li>${cleanOption(k)}</li>`).join('')}</ul>
            </div>
          `;
        }
        if (p.try_box) {
          const ansId = 'try-ans-' + Math.random().toString(36).substr(2, 5);
          content.innerHTML += `
            <div class="wb-try-box">
              <strong style="color:#15803d;display:block;margin-bottom:4px;">✏️ Sen de Dene!</strong>
              <p>${cleanOption(p.try_box.question)}</p>
              <button class="btn-show-try-ans" onclick="document.getElementById('${ansId}').style.display='block'">Cevabı Gör</button>
              <div id="${ansId}" style="display:none;margin-top:8px;font-weight:800;color:#15803d;">
                Doğru Cevap: ${cleanOption(p.try_box.answer)}
              </div>
            </div>
          `;
        }
      });
    }

    document.getElementById('btn-wb-start-quiz').onclick = () => {
      playSound('click');
      startQuiz(subjKey, topic.id);
    };
  }
  window.openWorkbook = openWorkbook;
  window.openTopic = function(s, t) { openWorkbook(s, t); };

  // --- QUIZ MOTORU ---
  function buildQuestions(subjKey, topic) {
    const list = [];
    const tasks = topic.tasks || [];

    tasks.forEach(task => {
      const qText = task.q || task.question;
      const opts = (task.options || []).map(cleanOption).filter(o => o.length > 0);
      const ans = typeof task.ans === 'number' ? task.ans : (typeof task.correct === 'number' ? task.correct : 0);
      const hint = cleanHint(task.hint || task.explanation);
      if (qText && opts.length >= 2) {
        list.push({
          type: 'choice',
          question: qText,
          options: opts,
          correct: Math.min(ans, opts.length - 1),
          hint: hint,
          isEnglish: subjKey === 'ingilizce'
        });
      }
    });

    if (topic.fact_card && topic.fact_card.rule && list.length > 0) {
      list.push({
        type: 'true_false',
        question: '🧠 DOĞRU MU, YANLIŞ MI?\n' + topic.fact_card.rule.slice(0, 120),
        isTrue: true,
        hint: cleanHint(topic.fact_card.tip),
        isEnglish: false
      });
    }

    if (!list.length) {
      list.push({
        type: 'choice',
        question: `"${topic.title}" konusunu öğrenmeye hazır mısın?`,
        options: ['Evet, Çok Hazırım! 🚀', 'Tekrar Bakmak İsterim 📖', 'Hadi Başlayalım! 💪', 'Kolay Gelsin! ⭐'],
        correct: 0,
        hint: 'Harika bir başlangıç!',
        isEnglish: false
      });
    }
    return list;
  }

  function startQuiz(subjKey, topicId) {
    const tops = getAllTopics(subjKey);
    const top = tops.find(t => t.id === topicId) || tops[0];
    if (!top) return;

    const questions = buildQuestions(subjKey, top);

    state.quiz = {
      subject: subjKey,
      topicId: topicId,
      topicTitle: top.title,
      questions: questions,
      currentIdx: 0,
      score: 0
    };

    document.getElementById('btn-quit-quiz').onclick = () => {
      playSound('click');
      setActiveTab('etkinlik');
    };

    document.getElementById('btn-quiz-next').onclick = () => {
      playSound('click');
      state.quiz.currentIdx++;
      if (state.quiz.currentIdx >= state.quiz.questions.length) {
        finishQuiz();
      } else {
        renderQuizQuestion();
      }
    };

    showScreen('screen-quiz');
    renderQuizQuestion();
  }
  window.startQuiz = startQuiz;

  function renderQuizQuestion() {
    SpeechService.stop();
    const q = state.quiz.questions[state.quiz.currentIdx];
    const total = state.quiz.questions.length;
    const cur = state.quiz.currentIdx;

    const stepTag = document.getElementById('quiz-subject-step');
    const stepBar = document.getElementById('quiz-step-bar');
    const qText = document.getElementById('quiz-question-text');
    const readBtn = document.getElementById('btn-read-question');
    const fbBanner = document.getElementById('quiz-feedback-banner');
    const nextBtn = document.getElementById('btn-quiz-next');

    if (stepTag) stepTag.textContent = `${SUBJECTS[state.quiz.subject].title} • ${cur + 1}/${total}`;
    if (stepBar) stepBar.style.width = `${((cur) / total) * 100}%`;
    if (qText) qText.textContent = cleanOption(q.question);

    if (readBtn) {
      readBtn.onclick = () => SpeechService.speak(cleanOption(q.question), q.isEnglish, readBtn);
    }

    if (fbBanner) fbBanner.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');

    const area = document.getElementById('quiz-interactive-area');
    area.innerHTML = '';

    if (q.type === 'choice' || !q.type) {
      const letters = ['A', 'B', 'C', 'D'];
      (q.options || []).forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-tactile';
        btn.innerHTML = `
          <div class="opt-letter-badge">${letters[i]}</div>
          <div class="opt-text">${cleanOption(opt)}</div>
        `;
        btn.onclick = () => handleChoiceAnswer(i, q, btn);
        area.appendChild(btn);
      });
    } else if (q.type === 'true_false') {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '10px';
      row.innerHTML = `
        <button class="quiz-option-tactile" style="justify-content:center;text-align:center;">✅ DOĞRU</button>
        <button class="quiz-option-tactile" style="justify-content:center;text-align:center;">❌ YANLIŞ</button>
      `;
      const [btnT, btnF] = row.querySelectorAll('button');
      btnT.onclick = () => handleTFAnswer(true, q, btnT, btnF);
      btnF.onclick = () => handleTFAnswer(false, q, btnF, btnT);
      area.appendChild(row);
    }
  }

  function handleChoiceAnswer(selIdx, q, clickedBtn) {
    const correct = selIdx === q.correct;
    const allBtns = document.querySelectorAll('.quiz-option-tactile');

    allBtns.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add('correct');
      else if (i === selIdx && !correct) b.classList.add('incorrect');
    });

    showFeedback(correct, correct ? 'Harika! Doğru Cevap 🎉' : 'Dikkat! Yanlış Cevap 🤔', cleanHint(q.hint));
  }

  function handleTFAnswer(selBool, q, selBtn, otherBtn) {
    selBtn.disabled = true;
    otherBtn.disabled = true;
    const correct = selBool === q.isTrue;
    if (correct) selBtn.classList.add('correct');
    else selBtn.classList.add('incorrect');
    showFeedback(correct, correct ? 'Doğru Bildin! 👏' : 'Tekrar Düşünelim! 💡', cleanHint(q.hint));
  }

  function showFeedback(isCorrect, title, desc) {
    if (isCorrect) playSound('correct');
    else playSound('wrong');

    const fb = document.getElementById('quiz-feedback-banner');
    fb.className = `quiz-result-banner ${isCorrect ? 'correct' : 'wrong'}`;
    document.getElementById('feedback-icon').textContent = isCorrect ? '🎉' : '💡';
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('feedback-desc').textContent = desc || '';
    fb.classList.remove('hidden');

    const nextBtn = document.getElementById('btn-quiz-next');
    if (nextBtn) nextBtn.classList.remove('hidden');
  }

  function finishQuiz() {
    playSound('levelup');
    if (!isTopicDone(state.quiz.topicId)) {
      state.progress.completedTopics.push(state.quiz.topicId);
    }
    state.profile.stars += 50;
    state.profile.xp += 100;
    state.profile.level = Math.floor(state.profile.xp / 100) + 1;
    saveState();
    updateHeader();

    showScreen('screen-victory');
    const vDesc = document.getElementById('victory-desc');
    if (vDesc) {
      vDesc.textContent = `${SUBJECTS[state.quiz.subject].title} • "${state.quiz.topicTitle}" başarıyla tamamlandı!`;
    }
  }

  // --- BAŞLATMA ---
  function startApp() {
    SpeechService.init();
    loadState();
    showScreen('screen-splash');

    // Splash Simülasyonu (2 saniye zarif dolum)
    const pctEl = document.getElementById('splash-pct');
    const barEl = document.getElementById('splash-progress-bar');
    let p = 20;
    const timer = setInterval(() => {
      p += 20;
      if (pctEl) pctEl.textContent = `%${p}`;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setActiveTab('macera');
        }, 300);
      }
    }, 280);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }

})(window);
