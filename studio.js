/* =============================================
   STUDIO
   AI-powered study studio. Three tabs:
     Notes     — paste study material + generate questions with Claude
     Questions — review / delete generated Q&A pairs
     Quiz      — flashcard-style self-test with progress tracking

   Storage:
     sb_user    — auth guard
     sb_courses — array of course objects (updated in place)
     sb_apikey  — Anthropic API key (set via the modal)

   Route: studio.html?id=<course-id>
   ============================================= */

/* ── Auth guard ─────────────────────────────── */
const user = JSON.parse(localStorage.getItem('sb_user') || 'null');
if (!user) window.location.href = 'login.html';

/* ── Load course from URL param ─────────────── */
const params   = new URLSearchParams(window.location.search);
const courseId = params.get('id');
if (!courseId) window.location.href = 'dashboard.html';

let courses = JSON.parse(localStorage.getItem('sb_courses') || '[]');
let course  = courses.find((c) => c.id === courseId);
if (!course) window.location.href = 'dashboard.html';

/* ── Quiz state ─────────────────────────────── */
let quizQueue = [];
let quizIndex = 0;
let quizKnown = 0;
let quizLearning = 0;

/* ── DOM refs ─────────────────────────────────── */

/* Navbar */
const courseNameEl  = document.getElementById('courseNameDisplay');
const courseEmojiEl = document.getElementById('courseEmojiDisplay');
const settingsBtn   = document.getElementById('settingsBtn');

/* Tabs */
const tabBtns  = document.querySelectorAll('.tab-btn');
const panels   = document.querySelectorAll('.tab-panel');

/* Notes panel */
const notesTextarea  = document.getElementById('notesTextarea');
const charCount      = document.getElementById('charCount');
const generateBtn    = document.getElementById('generateBtn');
const generateStatus = document.getElementById('generateStatus');
const goToNotesBtn   = document.getElementById('goToNotesBtn');

/* Questions panel */
const questionsList  = document.getElementById('questionsList');
const qEmptyState    = document.getElementById('qEmptyState');
const qCountEl       = document.getElementById('qCount');

/* Quiz panel */
const quizEmpty      = document.getElementById('quizEmpty');
const quizCard       = document.getElementById('quizCard');
const quizQuestion   = document.getElementById('quizQuestion');
const quizAnswer     = document.getElementById('quizAnswer');
const quizActions    = document.getElementById('quizActions');
const quizRevealBtn  = document.getElementById('quizRevealBtn');
const quizKnownBtn   = document.getElementById('quizKnownBtn');
const quizLearnBtn   = document.getElementById('quizLearnBtn');
const quizProgress   = document.getElementById('quizProgress');
const quizProgBar    = document.getElementById('quizProgressBar');
const quizDone       = document.getElementById('quizDone');
const quizRestartBtn = document.getElementById('quizRestartBtn');
const quizGoToNotes  = document.getElementById('quizGoToNotesBtn');

/* API key modal */
const apiKeyModal  = document.getElementById('apiKeyModal');
const apiKeyInput  = document.getElementById('apiKeyInput');
const apiKeySave   = document.getElementById('apiKeySave');
const apiKeyCancel = document.getElementById('apiKeyCancel');
const apiKeyError  = document.getElementById('apiKeyError');

/* ── Initialise ─────────────────────────────── */
courseNameEl.textContent  = course.name;
courseEmojiEl.textContent = course.emoji;
notesTextarea.value       = course.notes || '';
updateCharCount();
renderQuestions();

/* ── Tab switching ──────────────────────────── */
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === tab));
  if (tab === 'quiz') initQuiz();
}

/* =============================================
   NOTES TAB
   ============================================= */
notesTextarea.addEventListener('input', () => {
  updateCharCount();
  /* Auto-save notes to localStorage on every keystroke */
  course.notes = notesTextarea.value;
  saveCourse();
});

function updateCharCount() {
  charCount.textContent = `${notesTextarea.value.length.toLocaleString()} characters`;
}

/* "Go to Notes" from the questions empty state */
goToNotesBtn.addEventListener('click', () => switchTab('notes'));
quizGoToNotes.addEventListener('click', () => switchTab('notes'));

/* =============================================
   GENERATE QUESTIONS
   Calls the Anthropic API (Claude) with the user's notes.
   If no API key is set, opens the key modal first.
   ============================================= */
generateBtn.addEventListener('click', async () => {
  const notes = notesTextarea.value.trim();

  if (notes.length < 50) {
    showStatus('Please enter at least 50 characters of notes before generating.', 'error');
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    /* Open key modal; on save, re-run generation automatically */
    openApiKeyModal(() => runGeneration(notes));
    return;
  }

  await runGeneration(notes);
});

async function runGeneration(notes) {
  const apiKey = getApiKey();
  if (!apiKey) return;

  setGenerating(true);
  showStatus('Generating questions…', 'loading');

  try {
    const newQs = await callClaude(notes, apiKey);

    const withIds = newQs.map((q) => ({
      ...q,
      id:     crypto.randomUUID(),
      status: 'learning',
    }));

    course.questions = [...course.questions, ...withIds];
    course.lastStudied = new Date().toISOString();
    saveCourse();
    renderQuestions();
    showStatus(`✓ ${withIds.length} questions added.`, 'success');
    switchTab('questions');
  } catch (err) {
    const msg = err.message || 'Unknown error.';
    /* 401 / auth errors → clear bad key and prompt again */
    if (/401|api.?key|authentication|invalid/i.test(msg)) {
      localStorage.removeItem('sb_apikey');
      showStatus('Invalid API key. Please enter a valid key.', 'error');
      openApiKeyModal(() => runGeneration(notes));
    } else {
      showStatus(`Error: ${msg}`, 'error');
    }
  } finally {
    setGenerating(false);
  }
}

function setGenerating(loading) {
  generateBtn.disabled    = loading;
  generateBtn.textContent = loading ? 'Generating…' : 'Generate Questions';
}

function showStatus(msg, type) {
  generateStatus.textContent = msg;
  generateStatus.className   = `generate-status ${type}`;
}

/* =============================================
   CLAUDE API CALL
   Direct browser call to Anthropic. Requires the
   anthropic-dangerous-direct-browser-access header
   (per Anthropic's client-side usage policy for demos).
   ============================================= */
async function callClaude(notes, apiKey) {
  const prompt = `You are a study assistant helping a student prepare for exams. Based on the notes below, generate exactly 8 practice questions that test deep understanding of the material. Include a balanced mix of:
- recall: test memory of definitions, facts, and key terms
- conceptual: test understanding of ideas and relationships
- application: test ability to use knowledge in new situations

Return ONLY a valid JSON array — no markdown fences, no prose, just the array:
[{"question":"...","answer":"...","type":"recall|conceptual|application"}]

NOTES:
${notes}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       apiKey,
      'anthropic-version': '2023-06-01',
      /* Required for direct browser access per Anthropic's SDK docs */
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const raw  = data.content[0].text.trim();

  /* Strip markdown code fences if the model wrapped the JSON */
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonStr);
}

/* =============================================
   QUESTIONS TAB
   ============================================= */
function renderQuestions() {
  const count = course.questions.length;
  qCountEl.textContent = count;

  /* Sync the tab button label */
  const qTab = document.querySelector('[data-tab="questions"]');
  if (qTab) qTab.textContent = `Questions (${count})`;

  if (count === 0) {
    qEmptyState.style.display  = 'block';
    questionsList.style.display = 'none';
    return;
  }

  qEmptyState.style.display  = 'none';
  questionsList.style.display = 'block';

  questionsList.innerHTML = course.questions.map((q, i) => `
    <div class="question-card">
      <div class="question-card-header">
        <div class="q-meta">
          <span class="q-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="q-type ${sanitizeType(q.type)}">${sanitizeType(q.type)}</span>
        </div>
        <button class="q-delete" data-id="${q.id}" aria-label="Delete question ${i + 1}">✕</button>
      </div>
      <div class="q-question">${escapeHtml(q.question)}</div>
      <div class="q-answer-row">
        <button class="q-reveal-btn" data-id="${q.id}">Show Answer</button>
        <div class="q-answer hidden" data-answer="${q.id}">${escapeHtml(q.answer)}</div>
      </div>
    </div>
  `).join('');

  /* Bind show/hide answer toggles */
  questionsList.querySelectorAll('.q-reveal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ansEl = questionsList.querySelector(`[data-answer="${btn.dataset.id}"]`);
      const hidden = ansEl.classList.toggle('hidden');
      btn.textContent = hidden ? 'Show Answer' : 'Hide Answer';
    });
  });

  /* Bind delete buttons */
  questionsList.querySelectorAll('.q-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      course.questions = course.questions.filter((q) => q.id !== btn.dataset.id);
      saveCourse();
      renderQuestions();
    });
  });
}

/* Ensure q.type is one of the three valid values */
function sanitizeType(type) {
  return ['recall', 'conceptual', 'application'].includes(type) ? type : 'recall';
}

/* =============================================
   QUIZ TAB
   ============================================= */
function initQuiz() {
  if (course.questions.length === 0) {
    quizEmpty.style.display = 'block';
    quizCard.style.display  = 'none';
    quizDone.style.display  = 'none';
    return;
  }

  quizEmpty.style.display = 'none';
  quizDone.style.display  = 'none';

  /* Shuffle a fresh copy of the questions for this session */
  quizQueue    = shuffle([...course.questions]);
  quizIndex    = 0;
  quizKnown    = 0;
  quizLearning = 0;
  showCard();
}

function showCard() {
  if (quizIndex >= quizQueue.length) {
    /* All cards seen — show completion screen */
    quizCard.style.display = 'none';
    quizDone.style.display = 'block';
    document.getElementById('quizDoneKnown').textContent  = quizKnown;
    document.getElementById('quizDoneLearn').textContent  = quizLearning;
    return;
  }

  quizCard.style.display = 'block';
  const q     = quizQueue[quizIndex];
  const total = quizQueue.length;

  /* Populate card content */
  quizQuestion.textContent = q.question;
  quizAnswer.textContent   = q.answer;

  /* Reset reveal state */
  quizAnswer.style.display   = 'none';
  quizRevealBtn.style.display = 'block';
  quizActions.classList.remove('visible');

  /* Update progress */
  quizProgress.textContent   = `${quizIndex + 1} / ${total}`;
  quizProgBar.style.width    = `${(quizIndex / total) * 100}%`;
}

quizRevealBtn.addEventListener('click', () => {
  quizAnswer.style.display    = 'block';
  quizRevealBtn.style.display = 'none';
  quizActions.classList.add('visible');
});

quizKnownBtn.addEventListener('click', () => {
  quizKnown++;
  quizIndex++;
  showCard();
});

quizLearnBtn.addEventListener('click', () => {
  quizLearning++;
  /* Push the card to the end for another round */
  quizQueue.push(quizQueue[quizIndex]);
  quizIndex++;
  showCard();
});

quizRestartBtn.addEventListener('click', initQuiz);

/* =============================================
   API KEY MODAL
   ============================================= */
function openApiKeyModal(onSave) {
  apiKeyInput.value      = getApiKey();
  apiKeyError.textContent = '';
  apiKeyError.classList.remove('visible');
  apiKeyModal.classList.add('active');
  apiKeyModal.setAttribute('aria-hidden', 'false');
  apiKeyInput.focus();

  /* Replace previous save handler to avoid stacking listeners */
  apiKeySave.onclick = () => handleApiKeySave(onSave);
  /* Also allow Enter key in the input */
  apiKeyInput.onkeydown = (e) => { if (e.key === 'Enter') handleApiKeySave(onSave); };
}

function handleApiKeySave(onSave) {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-ant-')) {
    apiKeyError.textContent = 'Key must start with sk-ant-';
    apiKeyError.classList.add('visible');
    return;
  }
  localStorage.setItem('sb_apikey', key);
  closeApiKeyModal();
  if (typeof onSave === 'function') onSave();
}

function closeApiKeyModal() {
  apiKeyModal.classList.remove('active');
  apiKeyModal.setAttribute('aria-hidden', 'true');
}

apiKeyCancel.addEventListener('click', closeApiKeyModal);
settingsBtn.addEventListener('click', () => openApiKeyModal(null));
apiKeyModal.addEventListener('click', (e) => {
  if (e.target === apiKeyModal) closeApiKeyModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && apiKeyModal.classList.contains('active')) closeApiKeyModal();
});

function getApiKey() {
  return localStorage.getItem('sb_apikey') || '';
}

/* =============================================
   PERSISTENCE
   ============================================= */
function saveCourse() {
  const idx = courses.findIndex((c) => c.id === courseId);
  if (idx !== -1) courses[idx] = course;
  localStorage.setItem('sb_courses', JSON.stringify(courses));
}

/* =============================================
   UTILITIES
   ============================================= */

/* Fisher-Yates shuffle — mutates and returns the array */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* Prevents XSS from user-generated question/answer text in innerHTML */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
