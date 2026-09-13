const state = {
  profile: { name: 'Kahraman', avatar: 'ğŸ¦Š', stars: 0, streak: 0, level: 1, xp: 0 },
  progress: { completedTopics: [], completedUnits: {} },
  quiz: { subject: null, topicId: null, questions: [], currentIdx: 0, score: 0, correctStreak: 0 },
  currentTab: 'macera',
  firstLaunch: true
};

const SUBJECTS = {
  matematik:    { title: '1. Matematik',    icon: 'calculate',    color: 'var(--primary-container)',   shadow: '#b37d00', iconBg: 'rgba(255,179,0,0.15)',  textColor: 'var(--primary)',    emoji: 'ğŸ”¢' },
  fen:          { title: '2. Fen Bilimleri',icon: 'science',      color: 'var(--tertiary-fixed)',      shadow: '#2dbb7d', iconBg: 'rgba(72,217,158,0.15)', textColor: 'var(--tertiary)',   emoji: 'ğŸ”¬' },
  turkce:       { title: '3. TÃ¼rkÃ§e',       icon: 'menu_book',    color: 'var(--secondary-fixed)',     shadow: '#7dd3fc', iconBg: 'rgba(0,115,223,0.12)', textColor: 'var(--secondary)', emoji: 'ğŸ“–' },
  hayat:        { title: '4. Hayat Bilgisi',icon: 'emoji_people', color: 'var(--primary-fixed)',       shadow: '#ffba38', iconBg: 'rgba(255,222,172,0.3)', textColor: 'var(--primary)',    emoji: 'ğŸŒ' },
  ingilizce:    { title: '5. Ä°ngilizce',    icon: 'translate',    color: '#ede9fe',                    shadow: '#9333ea', iconBg: 'rgba(155,81,224,0.12)', textColor: '#7c3aed',          emoji: 'ğŸŒ' },
  muzik:        { title: '6. MÃ¼zik',        icon: 'music_note',   color: '#fce7f3',                    shadow: '#db2777', iconBg: 'rgba(219,39,119,0.1)', textColor: '#db2777',          emoji: 'ğŸµ' }
};

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  
  if (state.firstLaunch) {
    showScreen('screen-splash');
    setTimeout(() => {
      showScreen('screen-welcome');
    }, 2000);
  } else {
    showScreen('screen-splash');
    setTimeout(() => {
      goToMain();
    }, 2000);
  }

  document.getElementById('btn-skip-welcome')?.addEventListener('click', goToMain);
  document.getElementById('btn-start-adventure')?.addEventListener('click', goToMain);
  
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
  });

  document.getElementById('btn-quit-quiz')?.addEventListener('click', () => {
    if(confirm('Ã‡Ä±kmak istediÄŸine emin misin?')) goToMain();
  });

  document.getElementById('btn-quiz-next')?.addEventListener('click', nextQuestion);
  document.getElementById('btn-next-mission')?.addEventListener('click', () => alert('SÄ±radaki gÃ¶rev yakÄ±nda!'));
  document.getElementById('btn-back-to-map')?.addEventListener('click', goToMain);
  document.getElementById('btn-avatar-reward')?.addEventListener('click', () => setActiveTab('gelisim'));
  
  document.querySelectorAll('.quick-practice-card').forEach(card => {
    card.addEventListener('click', () => {
      let subj = card.dataset.subject;
      startQuizFromIsland(subj);
    });
  });
  
  document.getElementById('btn-start-focus')?.addEventListener('click', () => {
      startQuizFromIsland('matematik');
  });
});

function loadData() {
  const savedProfile = localStorage.getItem('maarif_profile');
  const savedProgress = localStorage.getItem('maarif_progress');
  const savedFirstLaunch = localStorage.getItem('maarif_firstLaunch');
  
  if (savedProfile) state.profile = JSON.parse(savedProfile);
  if (savedProgress) state.progress = JSON.parse(savedProgress);
  if (savedFirstLaunch !== null) state.firstLaunch = JSON.parse(savedFirstLaunch);
}

function saveData() {
  localStorage.setItem('maarif_profile', JSON.stringify(state.profile));
  localStorage.setItem('maarif_progress', JSON.stringify(state.progress));
  localStorage.setItem('maarif_firstLaunch', JSON.stringify(state.firstLaunch));
}

function showScreen(id) {
  document.querySelectorAll('.maarif-screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  
  const header = document.getElementById('maarif-header');
  const nav = document.getElementById('maarif-nav');
  
  if (['screen-splash', 'screen-welcome', 'screen-quiz', 'screen-victory'].includes(id)) {
    if (header) header.classList.add('hidden');
    if (nav) nav.classList.add('hidden');
  } else {
    if (header) header.classList.remove('hidden');
    if (nav) nav.classList.remove('hidden');
    updateHeader();
  }
}

function setActiveTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabName);
  });
  
  showScreen('screen-' + tabName);
  
  if (tabName === 'macera') renderMacera();
  else if (tabName === 'etkinlik') renderEtkinlik();
  else if (tabName === 'kitaplik') renderKitaplik();
  else if (tabName === 'gelisim') renderGelisim();
}

function goToMain() {
  state.firstLaunch = false;
  saveData();
  setActiveTab('macera');
}

function updateHeader() {
  const elStreak = document.getElementById('header-streak-val');
  const elStars = document.getElementById('header-stars-val');
  const elAvatar = document.getElementById('header-avatar');
  const elSub = document.getElementById('header-subtitle');

  if (elStreak) elStreak.innerText = state.profile.streak;
  if (elStars) elStars.innerText = state.profile.stars;
  if (elAvatar) elAvatar.innerText = state.profile.avatar;
  
  let subtitleMap = {
      'macera': '3. SÄ±nÄ±f â€¢ Macera',
      'etkinlik': '3. SÄ±nÄ±f â€¢ Etkinlik',
      'kitaplik': '3. SÄ±nÄ±f â€¢ KitaplÄ±k',
      'gelisim': '3. SÄ±nÄ±f â€¢ GeliÅŸim'
  };
  if (elSub) elSub.innerText = subtitleMap[state.currentTab] || '3. SÄ±nÄ±f';
}

function getCurriculumTopic(subjKey) {
  let data = window.CURRICULUM_TERM1?.[subjKey];
  if(!data) return null;
  for(let theme of (data.themes || [])) {
      for(let topic of (theme.topics || [])) {
          if(!state.progress.completedTopics.includes(topic.id)) {
              return topic;
          }
      }
  }
  return data.themes?.[0]?.topics?.[0] || null;
}

function renderMacera() {
  const mapEl = document.getElementById('island-map');
  if (!mapEl) return;
  mapEl.innerHTML = '';
  
  const curr = window.CURRICULUM_TERM1 || {};
  let i = 0;
  for (let key in SUBJECTS) {
    if (!curr[key]) continue;
    let subj = SUBJECTS[key];
    let topic = getCurriculumTopic(key) || {title: 'TamamlandÄ±'};
    
    let isRight = i % 2 === 1;
    let html = `
      <div style="display:flex; justify-content: ${isRight ? 'flex-end' : 'flex-start'}; margin-bottom: 24px;">
        <div class="maarif-card" style="width: 85%; cursor: pointer; box-shadow: 0 4px 0 var(--surface-dim);" onclick="startQuizFromIsland('${key}')">
          <div style="display:flex; align-items:center; gap:12px;">
             <div style="font-size:32px;">${subj.emoji}</div>
             <div>
                <p class="text-label-sm" style="color:${subj.textColor}">${subj.title}</p>
                <p class="text-headline-sm font-comfortaa">${topic.title}</p>
             </div>
          </div>
        </div>
      </div>
    `;
    mapEl.innerHTML += html;
    i++;
  }
}

function renderEtkinlik() {
  const tree = document.getElementById('curriculum-tree');
  if(!tree) return;
  tree.innerHTML = '';
  
  const curr = window.CURRICULUM_TERM1 || {};
  for(let key in SUBJECTS) {
      if(!curr[key]) continue;
      let subj = SUBJECTS[key];
      
      let html = `
        <div class="maarif-card" style="margin-bottom:8px; cursor:pointer;" onclick="startQuizFromIsland('${key}')">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:40px;height:40px;border-radius:8px;background:${subj.iconBg};display:flex;align-items:center;justify-content:center;">
               <span class="material-symbols-outlined" style="color:${subj.textColor}">${subj.icon}</span>
            </div>
            <div style="flex:1;">
              <p class="text-headline-sm font-comfortaa" style="color:${subj.textColor}">${subj.title}</p>
              <div style="height:6px;background:var(--surface-container);border-radius:3px;margin-top:4px;">
                <div style="width:30%;height:100%;background:${subj.color};border-radius:3px;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
      tree.innerHTML += html;
  }
}

function renderKitaplik() {
  const list = document.getElementById('story-list');
  if(!list) return;
  list.innerHTML = '<div class="maarif-card"><p style="color:var(--on-surface-variant)">Okuma metinleri burada listelenecek.</p></div>';
}

function renderGelisim() {
  const badgeGrid = document.getElementById('badge-grid');
  if(badgeGrid) badgeGrid.innerHTML = '<div class="maarif-card" style="text-align:center;color:var(--on-surface-variant)">YakÄ±nda rozetlerin burada!</div>';
  
  const elStars = document.getElementById('stat-stars');
  const elStreak = document.getElementById('stat-streak');
  const elLevel = document.getElementById('stat-level');
  
  if (elStars) elStars.innerText = state.profile.stars;
  if (elStreak) elStreak.innerText = state.profile.streak;
  if (elLevel) elLevel.innerText = state.profile.level;
}

function startQuizFromIsland(subjectKey) {
  let topic = getCurriculumTopic(subjectKey);
  if(!topic) {
      alert("Bu dersin iÃ§eriÄŸi bulunamadÄ±.");
      return;
  }
  let tasks = topic.tasks || [];
  if (tasks.length === 0) {
      tasks = [
          { question: 'Ã–rnek Soru 1?', options: ['A','B','C','D'], correct: 0, explanation: 'Cevap A' },
          { question: 'Ã–rnek Soru 2?', options: ['A','B','C','D'], correct: 1, explanation: 'Cevap B' },
          { question: 'Ã–rnek Soru 3?', options: ['A','B','C','D'], correct: 2, explanation: 'Cevap C' }
      ];
  }
  startQuiz(subjectKey, topic, tasks);
}

function startQuiz(subjKey, topic, tasks) {
  state.quiz = {
      subject: subjKey,
      topicId: topic.id,
      topicTitle: topic.title,
      questions: tasks,
      currentIdx: 0,
      score: 0,
      correctStreak: 0
  };
  
  let subj = SUBJECTS[subjKey];
  const badge = document.getElementById('quiz-subject-badge');
  if (badge) {
    badge.innerText = subj.title;
    badge.style.background = subj.iconBg;
    badge.style.color = subj.textColor;
  }
  
  const str = document.getElementById('quiz-streak');
  if (str) str.innerText = state.profile.streak;
  
  let dotsHTML = '';
  for(let i=0; i<tasks.length; i++) {
      dotsHTML += `<div class="quiz-dot" id="quiz-dot-${i}" style="width:12px;height:12px;border-radius:50%;background:var(--surface-dim);margin:0 4px; display:inline-block;"></div>`;
  }
  const dotsEl = document.getElementById('quiz-dots');
  if (dotsEl) dotsEl.innerHTML = dotsHTML;
  
  renderQuestion();
  showScreen('screen-quiz');
}

function renderQuestion() {
  document.getElementById('quiz-feedback').style.display = 'none';
  document.getElementById('btn-quiz-next').style.display = 'none';
  
  let qIdx = state.quiz.currentIdx;
  let q = state.quiz.questions[qIdx];
  
  for(let i=0; i<state.quiz.questions.length; i++) {
      let dot = document.getElementById(`quiz-dot-${i}`);
      if (!dot) continue;
      if(i === qIdx) dot.style.background = 'var(--primary)';
      else if(i < qIdx) dot.style.background = 'var(--tertiary)';
      else dot.style.background = 'var(--surface-dim)';
  }
  
  const qText = document.getElementById('quiz-question-text');
  if (qText) qText.innerText = q.question;
  
  let optsHTML = '';
  q.options.forEach((opt, idx) => {
      optsHTML += `<button class="quiz-option" style="width:100%;text-align:left;padding:12px;margin-bottom:8px;border-radius:8px;border:2px solid var(--outline-variant);background:var(--surface-container-lowest);font-family:Comfortaa,sans-serif;font-weight:700;color:var(--on-surface);cursor:pointer;" onclick="handleAnswer(${idx})">${opt}</button>`;
  });
  const optsEl = document.getElementById('quiz-options');
  if (optsEl) optsEl.innerHTML = optsHTML;
}

function handleAnswer(idx) {
  let q = state.quiz.questions[state.quiz.currentIdx];
  let isCorrect = (idx === q.correct);
  
  let options = document.querySelectorAll('.quiz-option');
  options.forEach((opt, i) => {
      opt.disabled = true;
      if (i === q.correct) {
          opt.style.background = 'var(--tertiary-container)';
          opt.style.borderColor = 'var(--tertiary)';
      }
      else if (i === idx && !isCorrect) {
          opt.style.background = 'var(--error-container)';
          opt.style.borderColor = 'var(--error)';
      }
  });
  
  let feedback = document.getElementById('quiz-feedback');
  if (feedback) {
      feedback.style.display = 'flex';
      feedback.style.background = isCorrect ? 'var(--tertiary-container)' : 'var(--error-container)';
      feedback.style.color = isCorrect ? 'var(--on-tertiary-container)' : 'var(--on-error-container)';
      feedback.style.padding = '12px';
      feedback.style.borderRadius = '8px';
      feedback.style.alignItems = 'center';
      feedback.style.gap = '12px';
      feedback.style.marginTop = '16px';
  }
  
  const ft = document.getElementById('quiz-feedback-title');
  const fx = document.getElementById('quiz-feedback-text');
  const fi = document.getElementById('quiz-feedback-icon');
  
  if (ft) ft.innerText = isCorrect ? 'Harika!' : 'Hata!';
  if (fx) fx.innerText = q.explanation || (isCorrect ? 'DoÄŸru cevap.' : 'Tekrar dene.');
  if (fi) {
      fi.innerText = isCorrect ? 'âœ…' : 'âŒ';
      fi.style.fontSize = '24px';
  }
  
  if (isCorrect) state.quiz.score++;
  
  document.getElementById('btn-quiz-next').style.display = 'inline-flex';
}

function nextQuestion() {
  state.quiz.currentIdx++;
  if(state.quiz.currentIdx >= state.quiz.questions.length) {
      finishQuiz();
  } else {
      renderQuestion();
  }
}

function finishQuiz() {
  let earnedStars = state.quiz.score * 10;
  state.profile.stars += earnedStars;
  if(earnedStars > 0) state.profile.streak++;
  if(!state.progress.completedTopics.includes(state.quiz.topicId)) {
      state.progress.completedTopics.push(state.quiz.topicId);
  }
  saveData();
  
  renderVictory(state.quiz.subject, state.quiz.topicTitle, earnedStars);
}

function renderVictory(subjKey, topicTitle, stars) {
  showScreen('screen-victory');
  const elSub = document.getElementById('victory-subtitle');
  const elStars = document.getElementById('victory-stars');
  const elXp = document.getElementById('victory-xp');
  
  if (elSub) elSub.innerText = SUBJECTS[subjKey].title + ' â€¢ ' + topicTitle;
  if (elStars) elStars.innerText = '+' + stars;
  if (elXp) elXp.innerText = '+' + (stars * 2);
  
  let canvas = document.getElementById('victory-canvas');
  if (canvas) {
      let ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0,0,canvas.width, canvas.height);
  }
}