/* =============================================
   DASHBOARD
   Loads and manages the user's course library via the REST API.

   All data lives in the MS Access database (backend/).
   The only things still in localStorage are:
     sb_token — bearer token for API auth
     sb_user  — public user info for display (name, etc.)
     sb_apikey — the user's Anthropic API key (not ours)
   ============================================= */

/* ── Constants ─────────────────────────────── */
const EMOJIS = [
  '📚', '🧪', '📐', '💻', '🌍', '📝', '🔬', '🎭',
  '🎨', '🎵', '🏛️', '⚡', '🧠', '🌱', '⚗️', '🔭',
  '🦁', '🏔️', '💡', '🎯',
];

const COLORS = [
  { id: 'purple', hex: '#6c63ff' },
  { id: 'blue',   hex: '#4361ee' },
  { id: 'green',  hex: '#2ec4b6' },
  { id: 'amber',  hex: '#f89820' },
  { id: 'red',    hex: '#e63946' },
  { id: 'pink',   hex: '#f72585' },
];

/* ── Auth guard ─────────────────────────────── */
/* apiFetch (from api.js) already handles 401, but guard here too
   so unauthenticated users never even see the page flash */
if (!getToken()) window.location.href = 'login.html';

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
const user = getUser();
userGreeting.textContent = user ? `Hi, ${user.first_name || user.firstName}` : '';

buildEmojiPicker();
buildColorPicker();
loadCourses();

/* ── Logout ─────────────────────────────────── */
logoutBtn.addEventListener('click', async () => {
  /* Best-effort server-side token invalidation */
  try { await apiFetch('DELETE', '/api/auth/logout'); } catch (_) {}
  clearSession();
  window.location.href = 'index.html';
});

/* ── Load courses from API ──────────────────── */
async function loadCourses() {
  try {
    courses = await apiFetch('GET', '/api/courses');
    renderCourses();
  } catch (err) {
    dashCoursesGrid.innerHTML =
      `<p style="color:var(--text-muted);padding:24px">
        Could not load courses: ${escapeHtml(err.message)}
      </p>`;
    emptyState.style.display = 'none';
  }
}

/* ── Modal open / close ─────────────────────── */
function openModal() {
  courseNameInput.value = '';
  courseNameInput.classList.remove('invalid');
  courseNameError.classList.remove('visible');
  courseNameError.textContent = '';
  selectedEmoji = EMOJIS[0];
  selectedColor = COLORS[0].id;
  buildEmojiPicker();
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
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});

/* ── Emoji / color pickers ──────────────────── */
function buildEmojiPicker() {
  emojiPickerEl.innerHTML = '';
  EMOJIS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn' + (emoji === selectedEmoji ? ' selected' : '');
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      selectedEmoji = emoji;
      emojiPickerEl.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    emojiPickerEl.appendChild(btn);
  });
}

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
createCourseForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = courseNameInput.value.trim();
  if (!name) {
    courseNameInput.classList.add('invalid');
    courseNameError.textContent = 'Please enter a course name.';
    courseNameError.classList.add('visible');
    courseNameInput.focus();
    return;
  }

  courseNameInput.classList.remove('invalid');
  courseNameError.classList.remove('visible');

  const submitBtn = createCourseForm.querySelector('.btn-submit-modal');
  submitBtn.disabled   = true;
  submitBtn.textContent = 'Creating…';

  try {
    const course = await apiFetch('POST', '/api/courses', {
      name,
      emoji: selectedEmoji,
      color: selectedColor,
    });
    closeModal();
    /* Navigate straight to the new course's studio */
    window.location.href = `studio.html?id=${course.id}`;
  } catch (err) {
    courseNameError.textContent = err.message || 'Failed to create course.';
    courseNameError.classList.add('visible');
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Create Course';
  }
});

/* ── Render courses grid ────────────────────── */
function renderCourses() {
  const hasCourses = courses.length > 0;
  emptyState.style.display      = hasCourses ? 'none'  : 'block';
  dashCoursesGrid.style.display = hasCourses ? 'grid'  : 'none';

  if (!hasCourses) return;

  const colorMap = Object.fromEntries(COLORS.map((c) => [c.id, c.hex]));

  dashCoursesGrid.innerHTML = courses.map((course) => {
    const hex      = colorMap[course.color] || '#6c63ff';
    const qCount   = course.question_count  || 0;
    const lastDate = course.last_studied
      ? formatRelativeDate(new Date(course.last_studied))
      : 'Never';

    return `
      <div class="dash-course-card" data-id="${course.id}">
        <div class="dash-card-top"
             style="background:linear-gradient(135deg,${hex}26,${hex}0f);
                    border-bottom:1px solid ${hex}40;">
          <span class="dash-card-emoji">${course.emoji}</span>
          <button class="dash-card-delete" data-id="${course.id}"
                  aria-label="Delete ${escapeHtml(course.name)}">✕</button>
        </div>
        <div class="dash-card-body">
          <h3>${escapeHtml(course.name)}</h3>
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

  /* Delete buttons */
  dashCoursesGrid.querySelectorAll('.dash-card-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id         = btn.getAttribute('data-id');
      const courseName = courses.find((c) => c.id === id)?.name || 'this course';
      if (!confirm(`Delete "${courseName}"? This cannot be undone.`)) return;
      try {
        await apiFetch('DELETE', `/api/courses/${id}`);
        courses = courses.filter((c) => c.id !== id);
        renderCourses();
      } catch (err) {
        alert(`Could not delete: ${err.message}`);
      }
    });
  });
}

/* ── Helpers ────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRelativeDate(date) {
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
