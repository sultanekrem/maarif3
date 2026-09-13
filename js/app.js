/* ============================================================
   MAARIF YILDIZI 3 — App Controller (Stitch v2 Single-Viewport)
   ============================================================ */
(function () {
  'use strict';

  /* ─── STATE ──────────────────────────────────────────────── */
  const state = {
    profile: { name: 'Kahraman', avatar: '🦊', stars: 0, streak: 0, level: 1, xp: 0 },
    progress: { completedTopics: [], completedUnits: {} },
    quiz: { subject: null, topicId: null, topicTitle: '', questions: [], currentIdx: 0, score: 0 },
    currentTab: 'macera',
    firstLaunch: false,
    focusSubject: 'matematik',
    focusTopicId: null
  };

  /* ─── SUBJECT CONFIG ─────────────────────────────────────── */
  const SUBJECTS = {
    matematik:  { title: 'Matematik',    icon: 'calculate',    bg: 'rgba(255,179,0,0.15)',   accent: 'var(--primary)',    emoji: '🔢', shadow: '#b37d00' },
    fen:        { title: 'Fen Bilimleri',icon: 'science',       bg: 'rgba(72,217,158,0.15)',  accent: 'var(--tertiary)',   emoji: '🔬', shadow: '#2dbb7d' },
    turkce:     { title: 'Türkçe',       icon: 'menu_book',     bg: 'rgba(0,115,223,0.12)',   accent: 'var(--secondary)', emoji: '📖', shadow: '#7dd3fc' },
    hayat:      { title: 'Hayat Bilgisi',icon: 'emoji_people',  bg: 'rgba(255,222,172,0.3)',  accent: 'var(--primary)',   emoji: '🌍', shadow: '#ffba38' },
    ingilizce:  { title: 'İngilizce',    icon: 'translate',     bg: 'rgba(155,81,224,0.12)',  accent: '#7c3aed',          emoji: '🌐', shadow: '#9333ea' },
    muzik:      { title: 'Müzik',        icon: 'music_note',    bg: 'rgba(219,39,119,0.1)',   accent: '#db2777',          emoji: '🎵', shadow: '#db2777' }
  };

  const SUBJECT_ORDER = ['matematik','fen','turkce','hayat','ingilizce','muzik'];
  const LEVEL_TITLES = ['Yeni Başlayan','Kaşif','Öğrenci','Yıldız Avcısı','Bilge Kuş','Şampiyon'];

  /* ─── SAVE / LOAD ─────────────────────────────────────────── */
  function saveState() {
    try {
      localStorage.setItem('maarif3_profile', JSON.stringify(state.profile));
      localStorage.setItem('maarif3_progress', JSON.stringify(state.progress));
      localStorage.setItem('maarif3_launched', '1');
    } catch(e) {}
  }

  function loadState() {
    try {
      const p = localStorage.getItem('maarif3_profile');
      const r = localStorage.getItem('maarif3_progress');
      const l = localStorage.getItem('maarif3_launched');
      if (p) Object.assign(state.profile, JSON.parse(p));
      if (r) Object.assign(state.progress, JSON.parse(r));
      if (l) state.firstLaunch = false;
    } catch(e) {}
  }

  /* ─── SCREEN ROUTER ──────────────────────────────────────── */
  const NAV_SCREENS  = ['screen-macera','screen-etkinlik','screen-kitaplik','screen-gelisim'];

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
    const renders = { macera: renderMacera, etkinlik: renderEtkinlik, kitaplik: renderKitaplik, gelisim: renderGelisim };
    if (renders[tab]) renders[tab]();
  }

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

  /* ─── SPLASH & WELCOME ───────────────────────────────────── */
  function initSplash() {
    showScreen('screen-splash');
    setTimeout(() => {
      if (state.firstLaunch) {
        showScreen('screen-welcome');
      } else {
        goToMain();
      }
    }, 1800);
  }

  function goToMain() {
    state.firstLaunch = false;
    saveState();
    setActiveTab('macera');
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
        { question: topic.title + ' ile ilgili alıştırmaya hazır mısın?', options: ['Hazırım 🚀', 'Biraz Bakayım', 'Kolay Gelsin', 'Hadi Başlayalım'], correct: 0, explanation: 'Tebrikler! Maceraya tam gaz devam!' },
        { question: '3. sınıf ' + (SUBJECTS[subjectKey]?.title || '') + ' konularını düzenli tekrar ediyor musun?', options: ['Her Gün', 'Haftada Bir', 'Yeni Başladım', 'Severek'], correct: 0, explanation: 'Harika bir alışkanlık!' },
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
    const q   = state.quiz.questions[state.quiz.currentIdx];
    const len = state.quiz.questions.length;
    if (!q) { finishQuiz(); return; }

    const dotsEl = document.getElementById('quiz-dots');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      for (let i = 0; i < len; i++) {
        const dot = document.createElement('div');
        dot.className = 'quiz-dot' + (i < state.quiz.currentIdx ? ' done' : (i === state.quiz.currentIdx ? ' current' : ''));
        dotsEl.appendChild(dot);
      }
    }

    const badge = document.getElementById('quiz-subject-badge');
    const cfg   = SUBJECTS[state.quiz.subject] || {};
    if (badge) badge.textContent = (cfg.title || '') + ' • ' + state.quiz.topicTitle;

    const qText = document.getElementById('quiz-question-text');
    if (qText) qText.textContent = q.question;

    const streak = document.getElementById('quiz-streak');
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
    const starsEarned = Math.round((state.quiz.score / state.quiz.questions.length) * 30) + 10;

    if (!state.progress.completedTopics.includes(topicId)) {
      state.progress.completedTopics.push(topicId);
    }

    state.profile.stars += starsEarned;
    state.profile.xp    += 100;
    state.profile.level  = Math.floor(state.profile.xp / 200) + 1;
    if (state.quiz.score > 0) state.profile.streak++;
    saveState();
    updateHeader();

    renderVictory(starsEarned);
  }

  /* ─── VICTORY ─────────────────────────────────────────────── */
  function renderVictory(starsEarned) {
    const title = document.getElementById('victory-title');
    const sub   = document.getElementById('victory-subtitle');
    const note  = document.getElementById('victory-note');
    const starsEl = document.getElementById('victory-stars');
    const xpEl    = document.getElementById('victory-xp');
    const levelEl = document.getElementById('victory-level-num');
    const nextEl  = document.getElementById('victory-next-level');
    const badge   = document.getElementById('victory-level-badge');

    if (title) title.textContent = 'HARİKASIN! 🎉';
    if (sub)   sub.textContent   = (SUBJECTS[state.quiz.subject] || {}).title + ' • ' + state.quiz.topicTitle;
    if (note)  note.textContent  = state.quiz.score + ' / ' + state.quiz.questions.length + ' doğru yaptın. Çok başarılı bir çalışma!';
    if (starsEl) starsEl.textContent = '+' + starsEarned;
    if (xpEl)    xpEl.textContent    = '+100';
    if (levelEl) levelEl.textContent = state.profile.level;
    if (nextEl)  nextEl.textContent  = state.profile.level + 1;
    if (badge)   badge.textContent   = state.profile.level;

    setTimeout(() => {
      const bar = document.getElementById('victory-level-bar');
      if (bar) {
        const xpInLevel = state.profile.xp % 200;
        const pct = Math.round((xpInLevel / 200) * 100);
        bar.style.width = pct + '%';
      }
    }, 200);

    showScreen('screen-victory');
    startConfetti();
  }

  function startConfetti() {
    const canvas = document.getElementById('victory-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const colors = ['#ffb300','#0073df','#48d99e','#ba1a1a','#ffba38','#6ffbbe'];
    let pieces = [];
    let frame = 0;

    function resize() {
      canvas.width  = canvas.parentElement ? canvas.parentElement.clientWidth : 400;
      canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : 600;
    }
    resize();

    for (let i = 0; i < 40; i++) {
      pieces.push({
        x: canvas.width / 2 + (Math.random() * 120 - 60),
        y: canvas.height * 0.25,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() * -7) - 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 6,
        g: 0.18,
        op: 1
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.g;
        p.rot += p.rotV; p.op = Math.max(0, p.op - 0.006);
        ctx.save();
        ctx.globalAlpha = p.op;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (frame < 180) requestAnimationFrame(draw);
    }
    draw();
  }

  /* ─── KİTAPLIK ─────────────────────────────────────────────── */
  function renderKitaplik() {
    const list = document.getElementById('story-list');
    if (!list) return;
    list.innerHTML = '';

    const stories = [
      { emoji: '🦊', title: 'Tilki ve Karga', desc: 'Okuma ve anlama masalı', subject: 'turkce' },
      { emoji: '🌱', title: 'Tohumun Yolculuğu', desc: 'Fen Bilimleri masalı', subject: 'fen' },
      { emoji: '🔢', title: 'Sayılar Ülkesi', desc: 'Matematik hikayesi', subject: 'matematik' },
      { emoji: '🌍', title: 'Bizim Mahallemiz', desc: 'Hayat Bilgisi hikayesi', subject: 'hayat' }
    ];

    stories.forEach(s => {
      const cfg = SUBJECTS[s.subject] || {};
      const card = document.createElement('div');
      card.className = 'story-card-compact';
      card.innerHTML = `
        <div class="story-thumb-box" style="background:${cfg.bg || 'var(--surface-container)'}">
          <span>${s.emoji}</span>
        </div>
        <div style="flex:1; min-width:0;">
          <h4 class="story-title-compact">${s.title}</h4>
          <p class="story-desc-compact">${s.desc}</p>
        </div>
        <button class="btn-listen-icon" title="Dinle">
          <span class="material-symbols-outlined icon-fill" style="font-size:18px;">headphones</span>
        </button>`;
      card.addEventListener('click', () => alert(s.title + ' yakında seslendirilecek!'));
      list.appendChild(card);
    });
  }

  /* ─── GELİŞİM ──────────────────────────────────────────────── */
  function renderGelisim() {
    const ss = document.getElementById('stat-stars');
    const sk = document.getElementById('stat-streak');
    const sl = document.getElementById('stat-level');
    const sb = document.getElementById('stat-level-bar');
    const sl2 = document.getElementById('stat-level-label');
    if (ss) ss.textContent = state.profile.stars;
    if (sk) sk.textContent = state.profile.streak;
    if (sl) sl.textContent = state.profile.level;
    if (sl2) sl2.textContent = LEVEL_TITLES[Math.min(state.profile.level - 1, LEVEL_TITLES.length - 1)];
    if (sb) {
      const pct = Math.round(((state.profile.xp % 200) / 200) * 100);
      sb.style.width = pct + '%';
    }

    const avatarArea = document.getElementById('avatar-area');
    if (avatarArea) {
      avatarArea.innerHTML = '';
      const avatars = ['🦊','🦉','🐯','🐸','🦁','🐧'];
      avatars.forEach(av => {
        const opt = document.createElement('div');
        opt.className = 'avatar-chip' + (state.profile.avatar === av ? ' selected' : '');
        opt.innerHTML = `<span style="font-size:24px;">${av}</span>`;
        opt.onclick = () => {
          state.profile.avatar = av;
          saveState();
          updateHeader();
          renderGelisim();
        };
        avatarArea.appendChild(opt);
      });
    }

    const badgeGrid = document.getElementById('badge-grid');
    if (badgeGrid) {
      badgeGrid.innerHTML = '';
      const badges = [
        { emoji: '🌟', name: 'İlk Adım',    earned: state.progress.completedTopics.length >= 1 },
        { emoji: '🔥', name: 'Seri Ustası', earned: state.profile.streak >= 3 },
        { emoji: '🏆', name: 'Şampiyon',    earned: state.profile.stars >= 60 },
        { emoji: '🧠', name: 'Bilge Kaşif', earned: state.profile.level >= 2 },
        { emoji: '🎯', name: 'Keskin Niş',  earned: state.progress.completedTopics.length >= 3 },
        { emoji: '📚', name: 'Kitap Kurdu', earned: false }
      ];
      badges.forEach(b => {
        const item = document.createElement('div');
        item.className = 'badge-chip' + (b.earned ? '' : ' locked');
        item.innerHTML = `
          <div class="badge-chip-icon">${b.emoji}</div>
          <span class="badge-chip-name">${b.name}</span>`;
        badgeGrid.appendChild(item);
      });
    }
  }

  /* ─── EVENT LISTENERS ───────────────────────────────────────── */
  function initEvents() {
    const startBtn = document.getElementById('btn-start-adventure');
    const skipBtn  = document.getElementById('btn-skip-welcome');
    if (startBtn) startBtn.addEventListener('click', goToMain);
    if (skipBtn)  skipBtn.addEventListener('click',  goToMain);

    const guideToggle = document.getElementById('btn-toggle-guide');
    if (guideToggle) {
      guideToggle.addEventListener('click', () => {
        const steps  = document.getElementById('guide-steps');
        const icon   = document.getElementById('guide-toggle-icon');
        if (!steps) return;
        const isHidden = steps.style.display === 'none';
        steps.style.display = isHidden ? 'block' : 'none';
        if (icon) icon.textContent = isHidden ? 'expand_less' : 'expand_more';
      });
    }

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabKey = tab.dataset.tab;
        if (tabKey) setActiveTab(tabKey);
      });
    });

    const qpm = document.getElementById('qp-matematik');
    const qpt = document.getElementById('qp-turkce');
    if (qpm) qpm.addEventListener('click', () => {
      const topic = getFirstActiveTopic('matematik');
      if (topic) startQuiz('matematik', topic.id);
    });
    if (qpt) qpt.addEventListener('click', () => {
      const topic = getFirstActiveTopic('turkce');
      if (topic) startQuiz('turkce', topic.id);
    });

    const quitBtn = document.getElementById('btn-quit-quiz');
    if (quitBtn) quitBtn.addEventListener('click', () => {
      setActiveTab('macera');
    });

    const nextBtn = document.getElementById('btn-quiz-next');
    if (nextBtn) nextBtn.addEventListener('click', () => {
      state.quiz.currentIdx++;
      if (state.quiz.currentIdx >= state.quiz.questions.length) {
        finishQuiz();
      } else {
        renderQuestion();
      }
    });

    const nextMission = document.getElementById('btn-next-mission');
    const backToMap   = document.getElementById('btn-back-to-map');
    const avatarRew   = document.getElementById('btn-avatar-reward');
    if (nextMission) nextMission.addEventListener('click', () => setActiveTab('etkinlik'));
    if (backToMap) backToMap.addEventListener('click', () => setActiveTab('macera'));
    if (avatarRew) avatarRew.addEventListener('click', () => setActiveTab('gelisim'));

    const hAvatar = document.getElementById('header-avatar');
    if (hAvatar) hAvatar.addEventListener('click', () => setActiveTab('gelisim'));

    const fsBtn = document.getElementById('btn-featured-story');
    if (fsBtn) fsBtn.addEventListener('click', () => alert('Sesli hikaye yakında!'));
  }

  /* ─── INITIALIZATION ────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initEvents();
    initSplash();
  });

})();