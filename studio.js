/* =============================================
   STUDIO
   AI-powered study studio — four tabs:
     Notes     — paste text OR upload files; auto-saves to DB
     Questions — levelled Q&A cards (easy / medium / hard) with filter
     Quiz      — flashcard mode; choose which difficulty level to drill
     Summary   — AI-generated key concepts, takeaways, quick reference

   Data lives in the MS Access DB (backend/).
   Anthropic API key is stored client-side in localStorage (sb_apikey).
   ============================================= */

/* ── PDF.js worker setup ─────────────────────── */
/* Must run before any PDF operation (called by extractPdf). */
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ── Auth guard ─────────────────────────────── */
if (!getToken()) window.location.href = 'login.html';

/* ── URL param ──────────────────────────────── */
const params   = new URLSearchParams(window.location.search);
const courseId = params.get('id');
if (!courseId) window.location.href = 'dashboard.html';

/* ── State ─────────────────────────────────── */
let course    = null;
let questions = [];
let summary   = null;

/* Quiz state */
let quizQueue    = [];
let quizIndex    = 0;
let quizKnown    = 0;
let quizLearning = 0;

/* Current active filter in the questions tab */
let activeFilter = 'all';

/* Debounce handle for notes auto-save */
let notesSaveTimer = null;

/* ── DOM refs ─────────────────────────────────── */
const courseNameEl   = document.getElementById('courseNameDisplay');
const courseEmojiEl  = document.getElementById('courseEmojiDisplay');
const settingsBtn    = document.getElementById('settingsBtn');

const tabBtns  = document.querySelectorAll('.tab-btn');
const panels   = document.querySelectorAll('.tab-panel');

/* Notes */
const notesTextarea  = document.getElementById('notesTextarea');
const charCount      = document.getElementById('charCount');
const generateBtn    = document.getElementById('generateBtn');
const generateStatus = document.getElementById('generateStatus');
const fileDropZone   = document.getElementById('fileDropZone');
const fileBrowseBtn  = document.getElementById('fileBrowseBtn');
const fileInput      = document.getElementById('fileInput');
const uploadedFiles  = document.getElementById('uploadedFiles');
const goToNotesBtn   = document.getElementById('goToNotesBtn');

/* Questions */
const questionsList  = document.getElementById('questionsList');
const qEmptyState    = document.getElementById('qEmptyState');
const qCountEl       = document.getElementById('qCount');
const qFilterBar     = document.getElementById('qFilterBar');

/* Quiz */
const quizLevelPicker = document.getElementById('quizLevelPicker');
const startQuizBtn    = document.getElementById('startQuizBtn');
const quizEmpty       = document.getElementById('quizEmpty');
const quizCard        = document.getElementById('quizCard');
const quizQuestion    = document.getElementById('quizQuestion');
const quizAnswer      = document.getElementById('quizAnswer');
const quizActions     = document.getElementById('quizActions');
const quizRevealBtn   = document.getElementById('quizRevealBtn');
const quizKnownBtn    = document.getElementById('quizKnownBtn');
const quizLearnBtn    = document.getElementById('quizLearnBtn');
const quizProgress    = document.getElementById('quizProgress');
const quizProgBar     = document.getElementById('quizProgressBar');
const quizDiffBadge   = document.getElementById('quizDiffBadge');
const quizDone        = document.getElementById('quizDone');
const quizRestartBtn  = document.getElementById('quizRestartBtn');
const quizEndBtn      = document.getElementById('quizEndBtn');
const quizGoToNotes   = document.getElementById('quizGoToNotesBtn');

/* Summary */
const summaryEmpty   = document.getElementById('summaryEmpty');
const summaryContent = document.getElementById('summaryContent');
const summaryGoNotes = document.getElementById('summaryGoToNotesBtn');
const summaryRegen   = document.getElementById('summaryRegenBtn');
const summaryConcepts  = document.getElementById('summaryConcepts');
const summaryTakeaways = document.getElementById('summaryTakeaways');
const summaryRef       = document.getElementById('summaryRef');

/* API key modal */
const apiKeyModal  = document.getElementById('apiKeyModal');
const apiKeyInput  = document.getElementById('apiKeyInput');
const apiKeySave   = document.getElementById('apiKeySave');
const apiKeyCancel = document.getElementById('apiKeyCancel');
const apiKeyError  = document.getElementById('apiKeyError');

/* ── Boot: load course from API ──────────────── */
(async function init() {
  try {
    const data = await apiFetch('GET', `/api/courses/${courseId}`);
    course    = data;
    questions = data.questions || [];
    summary   = data.summary  || null;

    courseNameEl.textContent  = course.name;
    courseEmojiEl.textContent = course.emoji;
    notesTextarea.value       = course.notes || '';
    updateCharCount();
    renderQuestions();
    renderSummary();
    switchTab('notes');
  } catch (err) {
    alert(`Could not load course: ${err.message}`);
    window.location.href = 'dashboard.html';
  }
})();

/* ── Tab switching ──────────────────────────── */
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  panels.forEach((p)  => p.classList.toggle('active', p.dataset.panel === tab));
}

/* =============================================
   NOTES TAB
   ============================================= */

/* Live character counter */
notesTextarea.addEventListener('input', () => {
  updateCharCount();
  /* Debounce: save to DB 1 s after user stops typing */
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(saveNotes, 1000);
});

function updateCharCount() {
  charCount.textContent = `${notesTextarea.value.length.toLocaleString()} characters`;
}

async function saveNotes() {
  try {
    await apiFetch('PUT', `/api/courses/${courseId}/notes`, {
      notes: notesTextarea.value,
    });
  } catch (_) { /* silent — notes re-load on next visit */ }
}

goToNotesBtn.addEventListener('click',   () => switchTab('notes'));
quizGoToNotes.addEventListener('click',  () => switchTab('notes'));
summaryGoNotes.addEventListener('click', () => switchTab('notes'));

/* =============================================
   FILE UPLOAD — drag-and-drop + browse
   Supports .txt .md .csv .pdf .docx
   Text is APPENDED to the notes textarea.
   ============================================= */

/* Click anywhere on the zone to open the file picker */
fileDropZone.addEventListener('click', (e) => {
  if (e.target !== fileBrowseBtn) fileInput.click();
});
fileBrowseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  handleFiles([...fileInput.files]);
  fileInput.value = ''; /* reset so same file can be re-added */
});

/* Drag-and-drop events */
fileDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileDropZone.classList.add('drag-over');
});
fileDropZone.addEventListener('dragleave', () => {
  fileDropZone.classList.remove('drag-over');
});
fileDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  fileDropZone.classList.remove('drag-over');
  const files = [...e.dataTransfer.files].filter((f) =>
    /\.(txt|md|pdf|docx|csv)$/i.test(f.name)
  );
  if (files.length) handleFiles(files);
});

async function handleFiles(files) {
  for (const file of files) {
    const chip = addFileChip(file.name, 'loading');
    try {
      const text = await extractText(file);
      /* Append extracted text to the textarea (with separator) */
      const sep = notesTextarea.value.trim() ? '\n\n---\n\n' : '';
      notesTextarea.value += sep + `[From ${file.name}]\n` + text;
      updateCharCount();
      clearTimeout(notesSaveTimer);
      notesSaveTimer = setTimeout(saveNotes, 1000);
      chip.textContent = `📄 ${file.name}`;
      chip.classList.remove('loading');
    } catch (err) {
      chip.textContent = `⚠ ${file.name}: ${err.message}`;
      chip.classList.add('error');
    }
  }
}

function addFileChip(name, state) {
  const chip = document.createElement('div');
  chip.className = `file-chip${state === 'loading' ? '' : ''}`;
  chip.textContent = `⏳ ${name}`;
  uploadedFiles.appendChild(chip);
  return chip;
}

/* ── Text extraction per file type ── */
async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (['txt', 'md', 'csv'].includes(ext)) {
    return readAsText(file);
  }

  if (ext === 'pdf') {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js not loaded — check your internet connection.');
    }
    return extractPdf(file);
  }

  if (ext === 'docx') {
    if (typeof mammoth === 'undefined') {
      throw new Error('Mammoth.js not loaded — check your internet connection.');
    }
    return extractDocx(file);
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

async function extractPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    /* Join items on the same line; add newline between pages */
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n\n');
}

async function extractDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result      = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/* =============================================
   GENERATE QUESTIONS + SUMMARY
   One Claude call returns both: levelled Q&A and a summary.
   ============================================= */
generateBtn.addEventListener('click', () => startGeneration());
summaryRegen.addEventListener('click', () => startGeneration());

async function startGeneration() {
  const notes = notesTextarea.value.trim();
  if (notes.length < 50) {
    showStatus('Please enter at least 50 characters of notes.', 'error');
    switchTab('notes');
    return;
  }
  const key = getAnthropicKey();
  if (!key) {
    openApiKeyModal(() => runGeneration(notes));
    return;
  }
  await runGeneration(notes);
}

async function runGeneration(notes) {
  const key = getAnthropicKey();
  if (!key) return;

  setGenerating(true);
  showStatus('Generating questions and summary…', 'loading');

  try {
    const result = await callClaude(notes, key);

    /* Persist questions */
    const savedQs = await apiFetch('POST', `/api/courses/${courseId}/questions`, {
      questions: result.questions,
    });
    questions = [...questions, ...savedQs];

    /* Persist summary */
    await apiFetch('PUT', `/api/courses/${courseId}/summary`, {
      summary: result.summary,
    });
    summary = result.summary;

    renderQuestions();
    renderSummary();

    const qLen = savedQs.length;
    showStatus(`${qLen} questions and summary generated.`, 'success');
    switchTab('questions');
  } catch (err) {
    const msg = err.message || 'Unknown error.';
    if (/401|api.?key|authentication|invalid/i.test(msg)) {
      localStorage.removeItem('sb_apikey');
      showStatus('Invalid Anthropic API key. Please update it.', 'error');
      openApiKeyModal(() => runGeneration(notes));
    } else {
      showStatus(`Error: ${msg}`, 'error');
    }
  } finally {
    setGenerating(false);
  }
}

function setGenerating(on) {
  generateBtn.disabled    = on;
  generateBtn.textContent = on ? 'Generating…' : 'Generate';
}

function showStatus(msg, type) {
  generateStatus.textContent = msg;
  generateStatus.className   = `generate-status ${type}`;
}

/* =============================================
   CLAUDE API CALL
   Returns { questions: [...], summary: {...} }
   Questions are distributed 3 easy / 3 medium / 3 hard.
   ============================================= */
async function callClaude(notes, key) {
  const prompt = `You are a study assistant creating exam preparation material from the notes below.

Generate exactly 9 practice questions distributed evenly by difficulty:
  - 3 Easy questions   — basic recall: definitions, facts, key terms
  - 3 Medium questions — conceptual understanding: explain relationships, compare ideas
  - 3 Hard questions   — application/analysis: problem-solving, synthesis, novel scenarios

Also generate a structured summary with:
  - key_concepts: 6–10 key terms or concepts as short phrases
  - main_takeaways: 3–5 sentences summarising the most important ideas
  - quick_reference: important formulas, dates, definitions, or steps (plain text, one per line)

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "questions": [
    {"question":"...","answer":"...","type":"recall|conceptual|application","difficulty":"easy|medium|hard"}
  ],
  "summary": {
    "key_concepts": ["term 1", "term 2"],
    "main_takeaways": "paragraph...",
    "quick_reference": "formula 1\nformula 2\n..."
  }
}

NOTES:
${notes}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${resp.status}`);
  }

  const data    = await resp.json();
  const raw     = data.content[0].text.trim();
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonStr);
}

/* =============================================
   QUESTIONS TAB — grouped by difficulty, filterable
   ============================================= */
function renderQuestions() {
  const count = questions.length;
  qCountEl.textContent = count;

  const qTab = document.querySelector('[data-tab="questions"]');
  if (qTab) qTab.textContent = `Questions (${count})`;

  if (count === 0) {
    qEmptyState.style.display   = 'block';
    questionsList.style.display = 'none';
    return;
  }

  qEmptyState.style.display   = 'none';
  questionsList.style.display = 'block';
  applyFilter(activeFilter);
}

function applyFilter(filter) {
  activeFilter = filter;

  /* Update filter button states */
  qFilterBar.querySelectorAll('.q-filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  const visible = filter === 'all'
    ? questions
    : questions.filter((q) => (q.difficulty || 'medium') === filter);

  if (visible.length === 0) {
    questionsList.innerHTML = `<p style="color:var(--text-muted);padding:24px 0;font-size:0.875rem">
      No ${filter} questions yet.</p>`;
    return;
  }

  /* Group by difficulty for visual separation */
  const LEVELS = ['easy', 'medium', 'hard'];
  const groups  = filter === 'all'
    ? LEVELS.map((lv) => ({ level: lv, items: questions.filter((q) => (q.difficulty || 'medium') === lv) }))
          .filter((g) => g.items.length > 0)
    : [{ level: filter, items: visible }];

  const LEVEL_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

  let html = '';
  let globalIdx = 0; /* for question numbering across groups */

  for (const group of groups) {
    const badgeClass = group.level;
    html += `<div class="q-group-header">
      <span class="q-difficulty ${badgeClass}">${LEVEL_LABEL[group.level]}</span>
      <span>${group.items.length} question${group.items.length !== 1 ? 's' : ''}</span>
    </div>`;

    for (const q of group.items) {
      globalIdx++;
      const qText = q.question_text || '';
      const aText = q.answer_text   || '';
      const qType = sanitizeType(q.question_type || '');

      html += `
        <div class="question-card">
          <div class="question-card-header">
            <div class="q-meta">
              <span class="q-num">${String(globalIdx).padStart(2, '0')}</span>
              <span class="q-type ${qType}">${qType}</span>
              <span class="q-difficulty ${group.level}">${LEVEL_LABEL[group.level]}</span>
            </div>
            <button class="q-delete" data-id="${q.id}" data-course="${courseId}"
                    aria-label="Delete question ${globalIdx}">✕</button>
          </div>
          <div class="q-question">${escapeHtml(qText)}</div>
          <div class="q-answer-row">
            <button class="q-reveal-btn" data-id="${q.id}">Show Answer</button>
            <div class="q-answer hidden" data-answer="${q.id}">${escapeHtml(aText)}</div>
          </div>
        </div>
      `;
    }
  }

  questionsList.innerHTML = html;

  /* Reveal/hide answer */
  questionsList.querySelectorAll('.q-reveal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el     = questionsList.querySelector(`[data-answer="${btn.dataset.id}"]`);
      const hidden = el.classList.toggle('hidden');
      btn.textContent = hidden ? 'Show Answer' : 'Hide Answer';
    });
  });

  /* Delete question */
  questionsList.querySelectorAll('.q-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await apiFetch('DELETE', `/api/courses/${btn.dataset.course}/questions/${btn.dataset.id}`);
        questions = questions.filter((q) => q.id !== btn.dataset.id);
        renderQuestions();
      } catch (err) {
        alert(`Could not delete: ${err.message}`);
      }
    });
  });
}

/* Bind filter buttons */
qFilterBar.querySelectorAll('.q-filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

/* =============================================
   QUIZ TAB — level picker + flashcard
   ============================================= */

startQuizBtn.addEventListener('click', () => {
  const level = document.querySelector('input[name="quizLevel"]:checked')?.value || 'all';
  initQuiz(level);
});

quizGoToNotes.addEventListener('click', () => switchTab('notes'));
quizEndBtn.addEventListener('click', endQuiz);

function initQuiz(level) {
  const pool = level === 'all'
    ? questions
    : questions.filter((q) => (q.difficulty || 'medium') === level);

  if (pool.length === 0) {
    quizLevelPicker.style.display = 'flex';
    quizEmpty.style.display       = 'block';
    quizCard.style.display        = 'none';
    quizDone.style.display        = 'none';
    return;
  }

  quizLevelPicker.style.display = 'none';
  quizEmpty.style.display       = 'none';
  quizDone.style.display        = 'none';

  quizQueue    = shuffle([...pool]);
  quizIndex    = 0;
  quizKnown    = 0;
  quizLearning = 0;
  showCard();
}

function endQuiz() {
  quizCard.style.display        = 'none';
  quizDone.style.display        = 'none';
  quizLevelPicker.style.display = 'flex';
}

function showCard() {
  if (quizIndex >= quizQueue.length) {
    quizCard.style.display = 'none';
    quizDone.style.display = 'block';
    document.getElementById('quizDoneKnown').textContent  = quizKnown;
    document.getElementById('quizDoneLearn').textContent  = quizLearning;
    return;
  }

  quizCard.style.display = 'block';
  const q     = quizQueue[quizIndex];
  const total = quizQueue.length;
  const diff  = q.difficulty || 'medium';

  quizQuestion.textContent = q.question_text || '';
  quizAnswer.textContent   = q.answer_text   || '';

  /* Difficulty badge on the flashcard */
  quizDiffBadge.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
  quizDiffBadge.className   = `flashcard-difficulty ${diff}`;

  /* Reset reveal state */
  quizAnswer.style.display    = 'none';
  quizRevealBtn.style.display = 'block';
  quizActions.classList.remove('visible');

  quizProgress.textContent = `${quizIndex + 1} / ${total}`;
  quizProgBar.style.width  = `${(quizIndex / total) * 100}%`;
}

quizRevealBtn.addEventListener('click', () => {
  quizAnswer.style.display    = 'block';
  quizRevealBtn.style.display = 'none';
  quizActions.classList.add('visible');
});

quizKnownBtn.addEventListener('click', () => { quizKnown++;    quizIndex++; showCard(); });
quizLearnBtn.addEventListener('click', () => {
  quizLearning++;
  quizQueue.push(quizQueue[quizIndex]); /* loop back */
  quizIndex++;
  showCard();
});

quizRestartBtn.addEventListener('click', () => {
  /* Restart with same level selection */
  const level = document.querySelector('input[name="quizLevel"]:checked')?.value || 'all';
  initQuiz(level);
});

/* =============================================
   SUMMARY TAB
   ============================================= */
function renderSummary() {
  if (!summary) {
    summaryEmpty.style.display   = 'block';
    summaryContent.style.display = 'none';

    /* Also update tab label */
    const sTab = document.querySelector('[data-tab="summary"]');
    if (sTab) sTab.textContent = 'Summary';
    return;
  }

  summaryEmpty.style.display   = 'none';
  summaryContent.style.display = 'block';

  const sTab = document.querySelector('[data-tab="summary"]');
  if (sTab) sTab.textContent = 'Summary ✓';

  /* Key concepts — pill tags */
  const concepts = Array.isArray(summary.key_concepts) ? summary.key_concepts : [];
  summaryConcepts.innerHTML = concepts
    .map((c) => `<span class="concept-tag">${escapeHtml(c)}</span>`)
    .join('');

  /* Main takeaways — paragraph */
  summaryTakeaways.textContent = summary.main_takeaways || '';

  /* Quick reference — preformatted */
  summaryRef.textContent = summary.quick_reference || '';
}

/* =============================================
   ANTHROPIC API KEY MODAL
   ============================================= */
function openApiKeyModal(onSave) {
  apiKeyInput.value       = getAnthropicKey();
  apiKeyError.textContent = '';
  apiKeyError.classList.remove('visible');
  apiKeyModal.classList.add('active');
  apiKeyModal.setAttribute('aria-hidden', 'false');
  apiKeyInput.focus();

  apiKeySave.onclick    = () => handleSave(onSave);
  apiKeyInput.onkeydown = (e) => { if (e.key === 'Enter') handleSave(onSave); };
}

function handleSave(onSave) {
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
apiKeyModal.addEventListener('click', (e) => { if (e.target === apiKeyModal) closeApiKeyModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && apiKeyModal.classList.contains('active')) closeApiKeyModal();
});

function getAnthropicKey() { return localStorage.getItem('sb_apikey') || ''; }

/* =============================================
   UTILITIES
   ============================================= */
function sanitizeType(type) {
  return ['recall', 'conceptual', 'application'].includes(type) ? type : 'recall';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
