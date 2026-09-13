/* ============================================================
   MAARIF YILDIZI 3 — Complete App Controller (v72)
   Robust Multi-Screen SPA, Responsive Layout & Educational Game
   ============================================================ */
(function (window) {
  'use strict';

  /* ─── STATE ──────────────────────────────────────────────── */
  const state = {
    profile: { name: 'Kahraman', avatar: '🦊', stars: 0, streak: 1, level: 1, xp: 0 },
    progress: { completedTopics: [], completedUnits: {} },
    quiz: { subject: null, topicId: null, topicTitle: '', questions: [], currentIdx: 0, score: 0 },
    currentTab: 'macera',
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
    document.querySelectorAll('.maarif-screen').forEach(s => {
      s.classList.remove('active');
    });
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
    }

    const header = document.getElementById('maarif-header');
    const nav    = document.getElementById('maarif-nav');

    if (NAV_SCREENS.includes(id)) {
      if (header) header.classList.remove('hidden');
      if (nav) nav.classList.remove('hidden');
      updateHeader();
    } else {
      if (header) header.classList.add('hidden');
      if (nav) nav.classList.add('hidden');
    }

    // Scroll to top of active screen
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

  // EXPOSE GLOBALLY FOR INLINE ONCLICK & CONSOLE
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

  function getAllTopics(subjectKey) {
    const c = getCurriculum();
    const subj = c[subjectKey];
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

  function isTopicUnlocked(subjectKey, topicIndex) {
    if (topicIndex === 0) return true;
    const topics = getAllTopics(subjectKey);
    const prev = topics[topicIndex - 1];
    return prev && isTopicCompleted(prev.id);
  }

  function getFirstActiveTopic(subjectKey) {
    const topics = getAllTopics(subjectKey);
    for (let i = 0; i < topics.length; i++) {
      if (!isTopicCompleted(topics[i].id)) return topics[i];
    }
    return topics.length > 0 ? topics[0] : null;
  }

  function getSubjectProgress(subjectKey) {
    const topics = getAllTopics(subjectKey);
    if (!topics.length) return 0;
    const done = topics.filter(t => isTopicCompleted(t.id)).length;
    return Math.round((done / topics.length) * 100);
  }

  function getFocusTopic() {
    for (const key of SUBJECT_ORDER) {
      const topics = getAllTopics(key);
      for (let i = 0; i < topics.length; i++) {
        if (!isTopicCompleted(topics[i].id) && isTopicUnlocked(key, i)) {
          state.focusSubject = key;
          state.focusTopicId = topics[i].id;
          return topics[i];
        }
      }
    }
    const matTopics = getAllTopics('matematik');
    if (matTopics.length) {
      state.focusSubject = 'matematik';
      state.focusTopicId = matTopics[0].id;
      return matTopics[0];
    }
    return null;
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
      const topics = getAllTopics(key);
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

      card.addEventListener('click', () => {
        if (activeTopic) {
          startQuiz(key, activeTopic.id);
        }
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
          <p class="subject-row-sub">${activeTopic ? activeTopic.title : 'Tüm üniteler bitti'}</p>
          <div class="subject-row-bar">
            <div style="width:${pct}%; background:${cfg.accent}; height:100%; border-radius:4px;"></div>
          </div>
        </div>
        <button class="btn-sub-action" style="color:${cfg.accent}; border-color:${cfg.accent};">Başla</button>
      `;

      item.addEventListener('click', () => {
        if (activeTopic) {
          startQuiz(key, activeTopic.id);
        }
      });

      listContainer.appendChild(item);
    });

    tree.appendChild(listContainer);
  }

  /* ─── QUIZ ──────────────────────────────────────────────────── */
  function buildQuestionsFromTasks(tasks) {
    const questions = [];
    if (!tasks || !tasks.length) return questions;
    tasks.forEach(task => {
      if (task.question && task.options && task.options.length >= 2) {
        questions.push({
          question: task.question,
          options:  task.options,
          correct:  typeof task.correct === 'number' ? task.correct : 0,
          explanation: task.explanation || 'Harika! Bir sonraki soruya geçebilirsin.'
        });
      }
    });
    return questions;
  }

  function startQuiz(subjectKey, topicId) {
    const topics   = getAllTopics(subjectKey);
    const topic    = topics.find(t => t.id === topicId) || topics[0];
    if (!topic) return;

    const tasks     = topic.tasks || [];
    let questions   = buildQuestionsFromTasks(tasks);

    if (!questions.length) {
      questions = [
        { question: topic.title + ' ile ilgili MEB alıştırmasına hazır mısın?', options: ['Hazırım 🚀', 'Biraz Bakayım', 'Kolay Gelsin', 'Hadi Başlayalım'], correct: 0, explanation: 'Tebrikler! Maceraya tam gaz devam!' },
        { question: '3. sınıf ' + (SUBJECTS[subjectKey]?.title || '') + ' konularını düzenli tekrar ediyor musun?', options: ['Her Gün Düzenli ⭐', 'Haftada Bir', 'Yeni Başladım', 'Severek'], correct: 0, explanation: 'Harika bir alışkanlık!' },
        { question: 'Günün hedefini tamamlamak için son adım!', options: ['Tamamla 🌟', 'Sonra', 'Mola Ver', 'Görüşürüz'], correct: 0, explanation: 'Muhteşem performans!' }
      ];
    }

    state.quiz = {
      subject:    subjectKey,
      topicId:    topic.id,
      topicTitle: topic.title,
      questions:  questions,
      currentIdx: 0,
      score:      0
    };

    showScreen('screen-quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q       = state.quiz.questions[state.quiz.currentIdx];
    const total   = state.quiz.questions.length;
    const current = state.quiz.currentIdx;

    const sBadge = document.getElementById('quiz-subject-badge');
    const qText  = document.getElementById('quiz-question-text');
    const streak = document.getElementById('quiz-streak');
    const dots   = document.getElementById('quiz-dots');

    if (sBadge) {
      const sc = SUBJECTS[state.quiz.subject];
      sBadge.textContent = (sc ? sc.title : '') + ' • ' + state.quiz.topicTitle;
    }
    if (qText) qText.textContent = q.question;

    if (dots) {
      dots.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.className = 'quiz-dot' + (i === current ? ' active' : (i < current ? ' done' : ''));
        dots.appendChild(dot);
      }
    }
    if (streak) streak.textContent = state.profile.streak;

    const optionsEl = document.getElementById('quiz-options');
    if (optionsEl) {
      optionsEl.innerHTML = '';
      const letters = ['A','B','C','D'];
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.innerHTML = `
          <div class="quiz-option-letter">${letters[i]}</div>
          <span class="quiz-option-text">${opt}</span>`;
        btn.addEventListener('click', () => handleAnswer(i));
        optionsEl.appendChild(btn);
      });
    }

    const fb = document.getElementById('quiz-feedback');
    const nw = document.getElementById('quiz-next-wrap');
    if (fb) { fb.className = 'quiz-feedback'; fb.style.display = 'none'; }
    if (nw) nw.style.display = 'none';
  }

  function handleAnswer(selectedIdx) {
    const q        = state.quiz.questions[state.quiz.currentIdx];
    const correct  = selectedIdx === q.correct;
    const options  = document.querySelectorAll('.quiz-option');
    const fb       = document.getElementById('quiz-feedback');
    const fbIcon   = document.getElementById('quiz-feedback-icon');
    const fbTitle  = document.getElementById('quiz-feedback-title');
    const fbText   = document.getElementById('quiz-feedback-text');
    const nw       = document.getElementById('quiz-next-wrap');

    options.forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === q.correct) btn.classList.add('correct');
      else if (i === selectedIdx && !correct) btn.classList.add('incorrect');
    });

    if (correct) {
      state.quiz.score++;
      if (fbIcon)  fbIcon.textContent  = '🎉';
      if (fbTitle) fbTitle.textContent = 'Harika! Doğru Cevap!';
      if (fbText)  fbText.textContent  = q.explanation || 'Süpersin!';
      if (fb) { fb.style.display = 'flex'; fb.className = 'quiz-feedback show correct-fb'; }
    } else {
      if (fbIcon)  fbIcon.textContent  = '💙';
      if (fbTitle) fbTitle.textContent = 'Neredeyse! Doğru: ' + q.options[q.correct];
      if (fbText)  fbText.textContent  = q.explanation || 'Bir sonrakini dene!';
      if (fb) { fb.style.display = 'flex'; fb.className = 'quiz-feedback show incorrect-fb'; }
    }

    const isLast = state.quiz.currentIdx === state.quiz.questions.length - 1;
    const nextLabel = document.getElementById('quiz-next-label');
    if (nextLabel) nextLabel.textContent = isLast ? 'Sonucu Gör!' : 'Sonraki Soru';
    if (nw) nw.style.display = 'block';
  }

  function finishQuiz() {
    const topicId = state.quiz.topicId;
    if (topicId && !state.progress.completedTopics.includes(topicId)) {
      state.progress.completedTopics.push(topicId);
    }
    const starsEarned = 30;
    const xpEarned    = 100;
    state.profile.stars  += starsEarned;
    state.profile.xp     += xpEarned;
    state.profile.level   = Math.floor(state.profile.xp / 100) + 1;

    saveState();
    updateHeader();
    renderVictory(state.quiz.subject, state.quiz.topicTitle, starsEarned, xpEarned);
  }

  /* ─── VICTORY SCREEN ────────────────────────────────────────── */
  function renderVictory(subjectKey, topicTitle, starsEarned, xpEarned) {
    showScreen('screen-victory');

    const subEl = document.getElementById('victory-subtitle');
    const stEl  = document.getElementById('victory-stars');
    const xpEl  = document.getElementById('victory-xp');
    const lvNum = document.getElementById('victory-level-num');
    const nxtLv = document.getElementById('victory-next-level');
    const lvBar = document.getElementById('victory-level-bar');
    const note  = document.getElementById('victory-note');

    const sc = SUBJECTS[subjectKey];
    if (subEl) subEl.textContent = (sc ? sc.title : '') + ' • ' + topicTitle;
    if (stEl)  stEl.textContent  = '+' + starsEarned;
    if (xpEl)  xpEl.textContent  = '+' + xpEarned;
    if (lvNum) lvNum.textContent = state.profile.level;
    if (nxtLv) nxtLv.textContent = state.profile.level + 1;

    const progressInLevel = state.profile.xp % 100;
    if (lvBar) lvBar.style.width = Math.max(15, progressInLevel) + '%';

    const notes = [
      'Günün hedefine bir adım daha yaklaştın! Harikasın!',
      'Yeni bir konu tamamlandı, kütüphanede yeni masallar seni bekliyor!',
      'Tebrikler! Düzenli çalışarak serini artırıyorsun.'
    ];
    if (note) note.textContent = notes[Math.floor(Math.random() * notes.length)];

    runConfetti();
  }

  function runConfetti() {
    const canvas = document.getElementById('victory-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;

    const colors = ['#ffb300', '#005bb3', '#48d99e', '#ff6b6b', '#a855f7'];
    const pieces = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.4,
      r: Math.random() * 6 + 3,
      d: Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltAngleInc: Math.random() * 0.07 + 0.05
    }));

    let animationFrame;
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
      if (frames < 120) {
        animationFrame = requestAnimationFrame(draw);
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
      { id: 'masal-1', title: 'Tilki ile Bilge Leylek', subject: 'Türkçe • Anlama Masalı', emoji: '🦊', time: '4 dk', desc: 'Paylaşmanın ve dostluğun önemi' },
      { id: 'masal-2', title: 'Küçük Tohumun Yolculuğu', subject: 'Fen Bilimleri • Canlılar', emoji: '🌱', time: '5 dk', desc: 'Bitkilerin büyüme serüveni' },
      { id: 'masal-3', title: 'Sayılar Diyarı ve Gizemli Sıfır', subject: 'Matematik • Sayı Macerası', emoji: '🔢', time: '6 dk', desc: 'Basamak değeri ve basamaklar' },
      { id: 'masal-4', title: 'Bizim Güzel Mahallemiz', subject: 'Hayat Bilgisi • Birlikte Yaşamak', emoji: '🌍', time: '4 dk', desc: 'Komşuluk ve yardımlaşma' }
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
        alert('📖 ' + s.title + ' masalı başlıyor! MEB 3. sınıf okuma-anlama alıştırması.');
      };
      list.appendChild(item);
    });
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
    // Nav Tab Click
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const tabKey = this.dataset.tab;
        if (tabKey) {
          setActiveTab(tabKey);
        }
      });
    });

    const qpm = document.getElementById('qp-matematik');
    const qpt = document.getElementById('qp-turkce');
    if (qpm) qpm.onclick = () => {
      const topic = getFirstActiveTopic('matematik');
      if (topic) startQuiz('matematik', topic.id);
    };
    if (qpt) qpt.onclick = () => {
      const topic = getFirstActiveTopic('turkce');
      if (topic) startQuiz('turkce', topic.id);
    };

    const quitBtn = document.getElementById('btn-quit-quiz');
    if (quitBtn) quitBtn.onclick = () => {
      setActiveTab('macera');
    };

    const nextBtn = document.getElementById('btn-quiz-next');
    if (nextBtn) nextBtn.onclick = () => {
      state.quiz.currentIdx++;
      if (state.quiz.currentIdx >= state.quiz.questions.length) {
        finishQuiz();
      } else {
        renderQuestion();
      }
    };

    const nextMission = document.getElementById('btn-next-mission');
    const backToMap   = document.getElementById('btn-back-to-map');
    const avatarRew   = document.getElementById('btn-avatar-reward');
    if (nextMission) nextMission.onclick = () => setActiveTab('etkinlik');
    if (backToMap) backToMap.onclick = () => setActiveTab('macera');
    if (avatarRew) avatarRew.onclick = () => setActiveTab('gelisim');

    const hAvatar = document.getElementById('header-avatar');
    if (hAvatar) hAvatar.onclick = () => setActiveTab('gelisim');

    const fsBtn = document.getElementById('btn-featured-story');
    if (fsBtn) fsBtn.onclick = () => alert('Günün sesli masalı başlıyor! 🎧');
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