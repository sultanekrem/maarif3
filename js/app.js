/* ============================================================
   MAARIF YILDIZI 3 — Refactored Logic (3-Tab Architecture)
   ============================================================ */
(function (window) {
  'use strict';

  const state = {
    profile: { name: 'Kahraman', avatar: '🦊', stars: 50, streak: 1, level: 1, xp: 0 },
    progress: { completedTopics: [] },
    quiz: {
      subject: null, topicId: null, topicTitle: '', questions: [], currentIdx: 0, score: 0
    },
    currentTab: 'home',
    currentSubjectKey: 'matematik',
  };

  const SUBJECTS = {
    matematik:    { title: 'Matematik',    emoji: '🔢', color: 'mat' },
    fenbilimleri: { title: 'Fen Bilimleri',emoji: '🔬', color: 'fen' },
    turkce:       { title: 'Türkçe',       emoji: '📖', color: 'tur' },
    hayatbilgisi: { title: 'Hayat Bilgisi',emoji: '🌍', color: 'hay' },
    ingilizce:    { title: 'İngilizce',    emoji: '🌐', color: 'ing' },
    muzik:        { title: 'Müzik',        emoji: '🎵', color: 'muz' }
  };
  const SUBJECT_ORDER = ['matematik','fenbilimleri','turkce','hayatbilgisi','ingilizce','muzik'];

  // --- SPEECH SERVICE (Real dual-voice TTS) ---
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
      } catch(e) {}
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
        try { this.audioPlayer.pause(); this.audioPlayer.currentTime = 0; this.audioPlayer.removeAttribute('src'); } catch(e) {}
      }
      if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch(e) {} }
      this.isSpeaking = false;
      if (this.activeButton) { this._resetBtn(this.activeButton); this.activeButton = null; }
    },

    _resetBtn: function(btn) {
      if (!btn) return;
      btn.classList.remove('is-speaking');
      const t = btn.querySelector('.v-text');
      if (t) t.textContent = btn.dataset.defaultText || 'Sesli Oku';
    },

    speak: function(text, isEnglish, btnEl) {
      if (!text) return;
      if (this.isSpeaking && this.activeButton === btnEl) { this.stop(); return; }
      this.stop();
      this.isSpeaking = true;
      this.activeButton = btnEl;
      if (btnEl) {
        if (!btnEl.dataset.defaultText) btnEl.dataset.defaultText = btnEl.textContent || 'Sesli Oku';
        btnEl.classList.add('is-speaking');
      }
      const voice = isEnglish ? 'jenny' : 'emel';
      if (navigator.onLine !== false && this.audioPlayer) {
        try {
          const url = '/api/tts?text=' + encodeURIComponent(text.slice(0, 500)) + '&voice=' + voice;
          this.audioPlayer.src = url;
          const p = this.audioPlayer.play();
          if (p && p.catch) p.catch(() => this._fallbackTTS(text, isEnglish));
          return;
        } catch(e) {}
      }
      this._fallbackTTS(text, isEnglish);
    },

    _fallbackTTS: function(text, isEnglish) {
      if (!('speechSynthesis' in window)) { this.stop(); return; }
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = isEnglish ? 'en-US' : 'tr-TR';
      utt.rate = 0.9;
      const voices = this.cachedVoices;
      const preferred = voices.find(v => isEnglish ? v.lang.startsWith('en') : v.lang.startsWith('tr'));
      if (preferred) utt.voice = preferred;
      utt.onend = () => this.stop();
      utt.onerror = () => this.stop();
      window.speechSynthesis.speak(utt);
    }
  };

  // --- DATA CLEANERS ---
  const PDF_NOISE = /===\s*PAGE\s*\d+\s*===.*$|\d+\s*ÖLÇME.*$|ÖLÇME,?\s*DEĞERLENDİRME.*$|SINAV\s*HİZMETLERİ.*$|GENEL\s*MÜDÜRLÜĞÜ.*$/gi;
  const ANSWER_SPOILER = /MEB\s*Kazanımı\s*:\s*Doğru\s*cevap\s+.*?\([A-D]\s*seçeneği\)\.?|MEB\s*Kazanımı\s*:\s*/gi;
  const GENERIC_HINTS = [
    'Soruyu dikkatlice oku ve tüm şıkları karşılaştır! 🦉',
    'Konuyu hatırla ve adım adım düşün. Yapabilirsin! 💪',
    'İlk önce kesin yanlış olanları elemeyi dene! 🎯',
    'Bu konuyu çalışma kitabından gözden geçirebilirsin! 📖',
    'Her şık için "Bu doğru mu?" diye kendine sor! 🤔',
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

  function getCurriculum() { return window.CURRICULUM_TERM1 || {}; }
  function getAllTopics(subj) {
    const data = getCurriculum()[subj];
    if (!data || !data.themes) return [];
    let topics = [];
    data.themes.forEach(th => { if (th.topics) topics.push(...th.topics); });
    return topics;
  }
  function isTopicDone(id) { return state.progress.completedTopics.includes(id); }

  // --- NAVIGATION ---
  function showScreen(id) {
    SpeechService.stop();
    document.querySelectorAll('.maarif-screen').forEach(s => s.classList.remove('active'));
    const scr = document.getElementById(id);
    if(scr) scr.classList.add('active');

    const header = document.getElementById('maarif-header');
    const nav = document.getElementById('maarif-nav');
    
    if (['screen-home', 'screen-subjects', 'screen-profile'].includes(id)) {
      if(header) header.classList.remove('hidden');
      if(nav) nav.classList.remove('hidden');
      updateHeader();
    } else {
      if(header) header.classList.add('hidden');
      if(nav) nav.classList.add('hidden');
    }
    window.scrollTo(0,0);
  }

  function setActiveTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    showScreen('screen-' + tab);
    if (tab === 'home') renderHome();
    else if (tab === 'subjects') renderSubjects();
    else if (tab === 'profile') renderProfile();
  }
  window.setActiveTab = setActiveTab;

  function updateHeader() {
    document.getElementById('header-stars-val').textContent = state.profile.stars;
    document.getElementById('header-streak-val').textContent = state.profile.streak;
  }

  // --- TAB 1: HOME ---
  function renderHome() {
    document.getElementById('home-greeting').textContent = `Merhaba, ${state.profile.name}! 🚀`;
    
    // Find next task
    let nextTopic = null;
    let nextSubj = null;
    for (let k of SUBJECT_ORDER) {
      const tops = getAllTopics(k);
      const firstUndone = tops.find(t => !isTopicDone(t.id));
      if (firstUndone) { nextTopic = firstUndone; nextSubj = k; break; }
    }
    
    const taskDesc = document.getElementById('home-task-desc');
    const btnCta = document.getElementById('btn-home-cta');
    if (nextTopic && nextSubj) {
      taskDesc.innerHTML = `<strong>${SUBJECTS[nextSubj].title}</strong>: ${nextTopic.title}`;
      btnCta.onclick = () => startQuiz(nextSubj, nextTopic.id);
      btnCta.style.display = 'inline-flex';
    } else {
      taskDesc.textContent = 'Harika! Tüm görevleri tamamladın.';
      btnCta.style.display = 'none';
    }

    const doneCount = state.progress.completedTopics.length;
    const goal = 5;
    const todayDone = doneCount % goal;
    document.getElementById('home-progress-text').textContent = `${todayDone}/${goal}`;
    document.getElementById('home-progress-bar').style.width = `${(todayDone/goal)*100}%`;

    // Quick Subjects
    const row = document.querySelector('.home-subjects-row');
    row.innerHTML = '';
    SUBJECT_ORDER.forEach(k => {
      const b = document.createElement('div');
      b.className = 'quick-subj-btn';
      b.textContent = SUBJECTS[k].emoji;
      b.onclick = () => openSubject(k);
      row.appendChild(b);
    });
  }

  // --- TAB 2: SUBJECTS ---
  function renderSubjects() {
    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = '';
    SUBJECT_ORDER.forEach(k => {
      const s = SUBJECTS[k];
      const div = document.createElement('div');
      div.className = `subject-card ${s.color}`;
      div.innerHTML = `<div class="subj-icon">${s.emoji}</div><div class="subj-title">${s.title}</div>`;
      div.onclick = () => openSubject(k);
      grid.appendChild(div);
    });
  }

  function openSubject(key) {
    const subj = getCurriculum()[key];
    if (!subj) return;
    state.currentSubjectKey = key;
    showScreen('screen-unit-list');
    document.getElementById('unit-list-title').textContent = SUBJECTS[key].title;
    
    const acc = document.getElementById('unit-accordion');
    acc.innerHTML = '';
    
    (subj.themes || []).forEach((th, idx) => {
      const card = document.createElement('div');
      card.className = 'unit-card';
      const isDone = th.topics && th.topics.every(t => isTopicDone(t.id));
      card.innerHTML = `
        <h3>${idx+1}. ${th.title}</h3>
        <div class="status">${isDone ? '✅ Tamam' : '📍 Devam'}</div>
      `;
      card.onclick = () => openUnit(key, th);
      acc.appendChild(card);
    });
  }
  window.openSubject = openSubject;

  function openUnit(subjKey, themeObj) {
    showScreen('screen-topic-list');
    document.getElementById('topic-list-title').textContent = themeObj.title;
    document.getElementById('btn-back-topic-list').onclick = () => openSubject(subjKey);

    const list = document.getElementById('topic-list');
    list.innerHTML = '';
    
    (themeObj.topics || []).forEach(t => {
      const done = isTopicDone(t.id);
      const row = document.createElement('div');
      row.className = 'topic-row';
      row.innerHTML = `
        <div class="topic-row-title">${done ? '✅' : '📍'} ${t.title}</div>
        <div class="topic-actions">
          <button class="btn-topic-read" onclick="openWorkbook('${subjKey}','${t.id}')">📖 Oku</button>
          <button class="btn-topic-quiz" onclick="startQuiz('${subjKey}','${t.id}')">🎯 Sınav</button>
        </div>
      `;
      list.appendChild(row);
    });
  }
  window.openUnit = openUnit;
  window.openTopic = function(s,t) { openWorkbook(s,t); };

  // --- WORKBOOK ---
  function openWorkbook(subjKey, topicId) {
    const topics = getAllTopics(subjKey);
    const topic = topics.find(t => t.id === topicId) || topics[0];
    if(!topic) return;

    showScreen('screen-workbook');
    document.getElementById('btn-back-workbook').onclick = () => openSubject(subjKey);
    document.getElementById('wb-subject-badge').textContent = SUBJECTS[subjKey].title;
    document.getElementById('wb-title').textContent = topic.title;
    
    const wbContent = document.getElementById('wb-content');
    wbContent.innerHTML = '';

    // Simplify reading pages
    if (topic.fact_card) {
      wbContent.innerHTML += `
        <div class="wb-rule-box">
          <h4>💡 Ana Kural</h4>
          <p>${cleanOption(topic.fact_card.rule)}</p>
        </div>
      `;
    }

    if (topic.reading_pages && topic.reading_pages.length) {
      topic.reading_pages.forEach(p => {
        if(p.example_box) {
           wbContent.innerHTML += `
             <div class="wb-example">
               <strong style="display:block;margin-bottom:5px;">📝 Örnek</strong>
               <p>${cleanOption(p.example_box.question || p.example_box.problem)}</p>
               <p style="margin-top:5px; color:#1d4ed8;"><strong>Çözüm:</strong> ${cleanOption(p.example_box.solution)}</p>
             </div>
           `;
        }
        if(p.key_points) {
           wbContent.innerHTML += `
             <div class="wb-bullets">
               <strong style="display:block;margin-bottom:5px;">⭐ Önemli Noktalar</strong>
               <ul>${p.key_points.map(k=>`<li>${cleanOption(k)}</li>`).join('')}</ul>
             </div>
           `;
        }
        if(p.try_box) {
           const ansId = 'ans-'+Math.random().toString(36).substr(2,5);
           wbContent.innerHTML += `
             <div class="wb-try">
               <strong style="display:block;margin-bottom:5px;">✏️ Sen de Dene!</strong>
               <p>${cleanOption(p.try_box.question)}</p>
               <button class="btn-show-ans" onclick="document.getElementById('${ansId}').style.display='block'">Cevabı Gör</button>
               <div id="${ansId}" style="display:none; margin-top:10px; font-weight:700;">Doğru Cevap: ${cleanOption(p.try_box.answer)}</div>
             </div>
           `;
        }
      });
    }

    document.getElementById('btn-start-exam-wb').onclick = () => startQuiz(subjKey, topicId);
    document.getElementById('btn-read-wb').onclick = () => SpeechService.speak(topic.title, false, document.getElementById('btn-read-wb'));
  }
  window.openWorkbook = openWorkbook;


  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (type === 'correct') { osc.frequency.value = 880; gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4); }
      else if (type === 'wrong') { osc.frequency.value = 220; gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4); }
      else { osc.frequency.value = 440; gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2); }
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
  }

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

  function buildQuestions(subjKey, topic) {
    const list = [];
    const tasks = topic.tasks || [];

    tasks.forEach(task => {
      const qText = task.q || task.question;
      const opts = (task.options || []).map(cleanOption).filter(o => o.length > 0);
      const ans = typeof task.ans === 'number' ? task.ans : (typeof task.correct === 'number' ? task.correct : 0);
      const hint = cleanHint(task.hint || task.explanation);
      if (qText && opts.length >= 2) {
        list.push({ type: 'choice', question: qText, options: opts, correct: Math.min(ans, opts.length - 1), hint, isEnglish: subjKey === 'ingilizce' });
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
      list.push({ type: 'choice', question: '"' + topic.title + '" konusuna hazır mısın?', options: ['Evet, Hazırım! 🚀', 'Önce Tekrar Bakayım 📖', 'Hadi Başlayalım! 💪', 'Kolay Gelsin! ⭐'], correct: 0, hint: 'Harika, devam et!', isEnglish: false });
    }
    return list;
  }

  // --- QUIZ SCREEN ---
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
      showScreen('screen-topic-list');
    };
    document.getElementById('btn-quiz-next').onclick = () => {
      playSound('click');
      state.quiz.currentIdx++;
      if (state.quiz.currentIdx >= state.quiz.questions.length) finishQuiz();
      else renderQuizQuestion();
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

    document.getElementById('quiz-subject-indicator').textContent = `${SUBJECTS[state.quiz.subject].title} • ${cur+1}/${total}`;
    document.getElementById('quiz-progress-bar').style.width = `${((cur)/total)*100}%`;
    document.getElementById('quiz-question-text').textContent = cleanOption(q.question);
    
    const readBtn = document.getElementById('btn-read-question');
    readBtn.onclick = () => SpeechService.speak(cleanOption(q.question), q.isEnglish, readBtn);

    document.getElementById('quiz-feedback-banner').style.display = 'none';
    document.getElementById('btn-quiz-next').style.display = 'none';

    const area = document.getElementById('quiz-interactive-area');
    area.innerHTML = '';

    if (q.type === 'choice' || !q.type) {
      const letters = ['A','B','C','D'];
      (q.options||[]).forEach((opt, i) => {
        const b = document.createElement('button');
        b.className = 'quiz-option-tactile';
        b.innerHTML = `
          <div class="opt-letter-badge">${letters[i]}</div>
          <div class="opt-text">${cleanOption(opt)}</div>
        `;
        b.onclick = () => handleChoiceAnswer(i, q, b);
        area.appendChild(b);
      });
    } else if (q.type === 'true_false') {
        renderTrueFalseOptions(q, area);
    } else if (q.type === 'matching') {
        renderMatchingExercise(q, area);
    }
  }
  window.renderQuizQuestion = renderQuizQuestion;

  function handleChoiceAnswer(selIdx, q, clickedBtn) {
    const correct = selIdx === q.correct;
    const allBtns = document.querySelectorAll('.quiz-option-tactile');
    
    allBtns.forEach((b,i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add('correct');
      else if (i === selIdx && !correct) b.classList.add('incorrect');
    });

    showFeedback(correct, correct ? 'Harika!' : 'Yanlış!', cleanHint(q.hint));
  }
  window.handleChoiceAnswer = handleChoiceAnswer;

  function renderTrueFalseOptions(q, container) {
     const wrap = document.createElement('div');
     wrap.style.display = 'flex'; wrap.style.gap = '10px'; wrap.style.width = '100%';
     
     const bT = document.createElement('button');
     bT.className = 'quiz-option-tactile'; bT.innerHTML = `<div class="opt-text" style="text-align:center">✅ DOĞRU</div>`;
     const bF = document.createElement('button');
     bF.className = 'quiz-option-tactile'; bF.innerHTML = `<div class="opt-text" style="text-align:center">❌ YANLIŞ</div>`;
     
     bT.onclick = () => handleTFAnswer(true, q, bT, bF);
     bF.onclick = () => handleTFAnswer(false, q, bF, bT);
     
     wrap.appendChild(bT); wrap.appendChild(bF);
     container.appendChild(wrap);
  }
  window.renderTrueFalseOptions = renderTrueFalseOptions;

  function handleTFAnswer(selBool, q, selBtn, otherBtn) {
     selBtn.disabled = true; otherBtn.disabled = true;
     const correct = selBool === q.isTrue;
     if (correct) selBtn.classList.add('correct');
     else selBtn.classList.add('incorrect');
     showFeedback(correct, correct ? 'Doğru!' : 'Dikkat!', cleanHint(q.hint));
  }

  function renderMatchingExercise(q, container) {
      container.innerHTML = `<div style="padding:15px; background:#fff; border-radius:12px; border:2px dashed #ccc; text-align:center; font-weight:bold;">Eşleştirme Modülü (Basitleştirildi)</div>`;
      showFeedback(true, 'Eşleştirme Tamam', cleanHint(q.hint));
  }
  window.renderMatchingExercise = renderMatchingExercise;

  function showFeedback(isCorrect, title, desc) {
    if(isCorrect) playSound('correct'); else playSound('wrong');
    const fb = document.getElementById('quiz-feedback-banner');
    fb.className = 'quiz-feedback-banner ' + (isCorrect ? 'correct' : 'wrong');
    document.getElementById('feedback-icon').textContent = isCorrect ? '✅' : '❌';
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('feedback-desc').textContent = desc || '';
    fb.style.display = 'flex';
    document.getElementById('btn-quiz-next').style.display = 'block';
  }

  function finishQuiz() {
    if (!isTopicDone(state.quiz.topicId)) {
      state.progress.completedTopics.push(state.quiz.topicId);
    }
    state.profile.stars += 50;
    state.profile.xp += 100;
    state.profile.level = Math.floor(state.profile.xp / 100) + 1;
    saveState();
    updateHeader();
    renderVictory();
  }
  window.finishQuiz = finishQuiz;

  function renderVictory() {
    playSound('levelup');
    showScreen('screen-victory');
    document.getElementById('victory-desc').textContent = `${SUBJECTS[state.quiz.subject].title} - ${state.quiz.topicTitle} tamamlandı!`;
  }
  window.renderVictory = renderVictory;

  // --- TAB 3: PROFILE ---
  function renderProfile() {
    document.getElementById('profile-name').textContent = state.profile.name;
    document.getElementById('profile-avatar').textContent = state.profile.avatar;
    document.getElementById('profile-level-val').textContent = state.profile.level;
    document.getElementById('profile-stars').textContent = state.profile.stars;
    document.getElementById('profile-streak').textContent = state.profile.streak;
    
    const list = document.getElementById('profile-progress-list');
    list.innerHTML = '';
    
    SUBJECT_ORDER.forEach(k => {
      const tops = getAllTopics(k);
      const done = tops.filter(t => isTopicDone(t.id)).length;
      const total = tops.length;
      const pct = total ? Math.round((done/total)*100) : 0;
      
      const div = document.createElement('div');
      div.className = 'prog-item';
      div.innerHTML = `
        <div class="prog-item-header">
          <span>${SUBJECTS[k].emoji} ${SUBJECTS[k].title}</span>
          <span>%${pct}</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width:${pct}%; background:var(--color-${SUBJECTS[k].color})"></div>
        </div>
      `;
      list.appendChild(div);
    });
  }


  // --- INIT ---
  function startApp() {
    loadState();
    showScreen('screen-splash');
    setTimeout(() => setActiveTab('home'), 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }

})(window);