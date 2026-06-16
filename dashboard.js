/* =============================================
   DASHBOARD
   Manages the authenticated user's course library.

   Storage:
     sb_user    — { firstName, lastName, username, email }
     sb_courses — Array of course objects

   Each course: { id, name, emoji, color, notes, questions[], createdAt, lastStudied }
   ============================================= */

/* ── Constants ─────────────────────────────── */

/* Preset emojis for the course icon picker */
const EMOJIS = [
  '📚', '🧪', '📐', '💻', '🌍', '📝', '🔬', '🎭',
  '🎨', '🎵', '🏛️', '⚡', '🧠', '🌱', '⚗️', '🔭',
  '🦁', '🏔️', '💡', '🎯',
];

/* Preset colors for the course card banner */
const COLORS = [
  { id: 'purple', hex: '#6c63ff' },
  { id: 'blue',   hex: '#4361ee' },
  { id: 'green',  hex: '#2ec4b6' },
  { id: 'amber',  hex: '#f89820' },
  { id: 'red',    hex: '#e63946' },
  { id: 'pink',   hex: '#f72585' },
];

/* ── Auth guard ─────────────────────────────── */
/* Redirect to login if no user session exists in localStorage */
const user = JSON.parse(localStorage.getItem('sb_user') || 'null');
if (!user) window.location.href = 'login.html';

/* ── State ─────────────────────────────────── */
let selectedEmoji = EMOJIS[0];
let selectedColor = COLORS[0].id;
let courses       = [];

/* ── DOM refs ───────────────────────────────── */
const userGreeting     = document.getElementById('userGreeting');
const logoutBtn        = document.getElementById('logoutBtn');
const btnNewCourse     = document.getElementById('btnNewCourse');
const emptyNewCourse   = document.getElementById('emptyNewCourse');
const dashCoursesGrid  = document.getElementById('dashCoursesGrid');
const emptyState       = document.getElementById('emptyState');
const modalOverlay     = document.getElementById('modalOverlay');
const modalClose       = document.getElementById('modalClose');
const createCourseForm = document.getElementById('createCourseForm');
const courseNameInput  = document.getElementById('courseName');
const courseNameError  = document.getElementById('courseNameError');
const emojiPickerEl    = document.getElementById('emojiPicker');
const colorPickerEl    = document.getElementById('colorPicker');

/* ── Initialise ─────────────────────────────── */
userGreeting.textContent = `Hi, ${user.firstName}`;
loadCourses();
buildEmojiPicker();
buildColorPicker();
renderCourses();

/* ── Logout ─────────────────────────────────── */
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('sb_user');
  window.location.href = 'index.html';
});

/* ── Modal — open / close ───────────────────── */
function openModal() {
  /* Reset the form state before showing */
  courseNameInput.value = '';
  courseNameInput.classList.remove('invalid');
  courseNameError.classList.remove('visible');
  courseNameError.textContent = '';
  selectedEmoji = EMOJIS[0];
  selectedColor = COLORS[0].id;
  buildEmojiPicker(); /* re-render to reset selection highlight */
  buildColorPicker();

  modalOverlay.classList.add('active');
  modalOverlay.setAttribute('aria-hidden', 'false');
  courseNameInput.focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
  modalOverlay.setAttribute('aria-hidden', 'true');
}

btnNewCourse.addEventListener('click', openModal);
emptyNewCourse.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);

/* Close on backdrop click */
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

/* Close on Escape key */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});

/* ── Emoji picker ───────────────────────────── */
function buildEmojiPicker() {
  emojiPickerEl.innerHTML = '';
  EMOJIS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn' + (emoji === selectedEmoji ? ' selected' : '');
    btn.textContent = emoji;
    btn.setAttribute('aria-label', emoji);
    btn.addEventListener('click', () => {
      selectedEmoji = emoji;
      emojiPickerEl.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    emojiPickerEl.appendChild(btn);
  });
}

/* ── Color picker ───────────────────────────── */
function buildColorPicker() {
  colorPickerEl.innerHTML = '';
  COLORS.forEach((color) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-btn' + (color.id === selectedColor ? ' selected' : '');
    btn.style.setProperty('--c', color.hex);
    btn.setAttribute('aria-label', `${color.id} color`);
    btn.addEventListener('click', () => {
      selectedColor = color.id;
      colorPickerEl.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    colorPickerEl.appendChild(btn);
  });
}

/* ── Create course ──────────────────────────── */
createCourseForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = courseNameInput.value.trim();

  if (!name) {
    courseNameInput.classList.add('invalid');
    courseNameError.textContent = 'Please enter a course name.';
    courseNameError.classList.add('visible');
    courseNameInput.focus();
    return;
  }

  /* Clear any previous error */
  courseNameInput.classList.remove('invalid');
  courseNameError.classList.remove('visible');

  const course = {
    id:          crypto.randomUUID(),
    name,
    emoji:       selectedEmoji,
    color:       selectedColor,
    notes:       '',
    questions:   [],
    createdAt:   new Date().toISOString(),
    lastStudied: null,
  };

  /* Add newest course first */
  courses.unshift(course);
  saveCourses();
  closeModal();

  /* Navigate immediately to the new course's studio */
  window.location.href = `studio.html?id=${course.id}`;
});

/* ── Load / save ────────────────────────────── */
function loadCourses() {
  courses = JSON.parse(localStorage.getItem('sb_courses') || '[]');
}

function saveCourses() {
  localStorage.setItem('sb_courses', JSON.stringify(courses));
}

/* ── Render courses grid ────────────────────── */
function renderCourses() {
  const hasCourses = courses.length > 0;

  emptyState.style.display       = hasCourses ? 'none'  : 'block';
  dashCoursesGrid.style.display  = hasCourses ? 'grid'  : 'none';

  if (!hasCourses) return;

  /* Build hex lookup from COLORS constant */
  const colorMap = Object.fromEntries(COLORS.map((c) => [c.id, c.hex]));

  dashCoursesGrid.innerHTML = courses.map((course) => {
    const hex        = colorMap[course.color] || '#6c63ff';
    const qCount     = course.questions.length;
    const lastDate   = course.lastStudied ? formatRelativeDate(new Date(course.lastStudied)) : 'Never';
    const nameHtml   = escapeHtml(course.name);

    return `
      <div class="dash-course-card" data-id="${course.id}">
        <div class="dash-card-top"
             style="background: linear-gradient(135deg,${hex}26,${hex}0f);
                    border-bottom: 1px solid ${hex}40;">
          <span class="dash-card-emoji">${course.emoji}</span>
          <button class="dash-card-delete" data-id="${course.id}" aria-label="Delete ${nameHtml}">✕</button>
        </div>
        <div class="dash-card-body">
          <h3>${nameHtml}</h3>
          <div class="dash-card-meta">
            <span>${qCount} question${qCount !== 1 ? 's' : ''}</span>
            <span class="meta-dot">·</span>
            <span>${lastDate}</span>
          </div>
          <a href="studio.html?id=${course.id}" class="btn-study">Study →</a>
        </div>
      </div>
    `;
  }).join('');

  /* Bind delete buttons after rendering */
  dashCoursesGrid.querySelectorAll('.dash-card-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const courseName = courses.find((c) => c.id === id)?.name || 'this course';
      if (!confirm(`Delete "${courseName}"? This cannot be undone.`)) return;
      courses = courses.filter((c) => c.id !== id);
      saveCourses();
      renderCourses();
    });
  });
}

/* ── Helpers ────────────────────────────────── */

/* Escapes HTML special chars to prevent XSS from user-entered course names */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Returns a human-readable relative date ("Today", "Yesterday", "3 days ago") */
function formatRelativeDate(date) {
  const diffMs   = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
