# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What StudyBudy is

StudyBudy is an AI-powered study tool where users create their own courses, upload or paste study material, and let Claude AI generate levelled practice questions and a structured summary. Users then quiz themselves with a built-in flashcard mode.

The concept is similar to NotebookLM but focused specifically on generating high-quality, difficulty-levelled practice questions for exam prep.

---

## Running the app

**Two steps — both must be done every session:**

**1. Start the backend** (keep the terminal open while using the app):
```
cd backend
start.bat          # double-click or run from terminal
# or directly:
python app.py
```

**2. Open the frontend** — double-click `index.html` (no build step, no server needed).

Health check: http://127.0.0.1:5000/api/health

Headless screenshot (Edge):
```
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --screenshot=screenshot.png --window-size=1280,900 --disable-gpu --no-sandbox "file:///C:/Users/tamir1/Desktop/Programming/studybudy/index.html"
```

---

## First-time / fresh-install setup

```
cd backend
pip install -r requirements.txt   # flask, flask-cors, pyodbc, pywin32
python setup_db.py                 # creates StudyBudy.accdb + tables
python app.py                      # start the server
```

**After a schema migration** (e.g. pulling a commit that adds new columns):
```
cd backend
python migrate_db.py   # idempotent — safe to re-run
```

---

## Git and GitHub — mandatory workflow

**Every change, no matter how small, must be committed and pushed to GitHub.**

Repository: `https://github.com/tamiraro/studybudy` (branch: `master`)

```
git add <changed files>
git commit -m "descriptive message"
git push
```

No CI — push directly to `master`. The `.accdb` database file is gitignored.

---

## Full file structure

```
index.html          — landing page ("Turn Your Notes Into Perfect Practice Questions")
styles.css          — global CSS tokens, reset, navbar, modals, shared utilities
app.js              — scroll-driven nav highlight (IntersectionObserver)
api.js              — shared API client: apiFetch(), saveSession(), getToken(), clearSession()
                      API_BASE is the single line to change when deploying to a real server

signup.html/css/js  — registration page; POSTs to /api/auth/signup; redirects to dashboard
login.html          — login page (uses styles.css + signup.css + login.css)
login.css           — login-specific layout and overrides
login.js            — validation + POST /api/auth/login + redirect to dashboard

dashboard.html      — authenticated course library (auth-guarded)
dashboard.css       — course cards, create-course modal, emoji/color pickers
dashboard.js        — loads courses from API, create/delete, redirects to studio

studio.html         — AI study studio with four tabs (auth-guarded, route: ?id=<course-id>)
studio.css          — tab bar, notes layout, file-upload zone, question cards,
                      difficulty badges, quiz flashcard, summary section
studio.js           — file extraction (PDF.js / Mammoth), Claude API call,
                      question rendering with difficulty filter, quiz level picker,
                      summary rendering, API key modal

backend/
  app.py            — Flask entry point; registers blueprints; CORS config
  config.py         — DB_DRIVER, DB_PATH, SECRET_KEY, PORT (all env-var overridable)
  setup_db.py       — creates StudyBudy.accdb and all 4 tables (run once)
  migrate_db.py     — adds new columns to existing DB (idempotent; run after pulling migrations)
  start.bat         — Windows launcher (double-click to start)
  requirements.txt  — flask, flask-cors, pyodbc, pywin32
  StudyBudy.accdb   — MS Access database (gitignored; recreated by setup_db.py)

  db/
    base.py         — Abstract repo interfaces: UserRepo, SessionRepo, CourseRepo, QuestionRepo
                      All routes talk only to these interfaces — never raw SQL
    access_db.py    — MS Access (Jet/ACE) implementation via pyodbc
    __init__.py     — get_repos() factory: reads DB_DRIVER, returns the right repo instances

  api/
    auth.py         — POST /api/auth/signup, /api/auth/login; DELETE /api/auth/logout
    courses.py      — GET/POST /api/courses
                      GET/DELETE /api/courses/<id>
                      PUT /api/courses/<id>/notes
                      PUT /api/courses/<id>/summary
    questions.py    — GET/POST /api/courses/<id>/questions
                      DELETE /api/courses/<id>/questions/<qid>
    middleware.py   — @require_auth decorator (validates Bearer token against sessions table)

courses/            — legacy static course pages; no longer linked from the main app
  course.css
  java/index.html
```

---

## Database schema (MS Access — StudyBudy.accdb)

| Table | Key columns |
|---|---|
| `users` | id (AUTOINCREMENT PK), first_name, last_name, username, email, phone, role, password_hash, created_at |
| `sessions` | id, user_id, token (64-char hex), created_at, expires_at |
| `courses` | id (UUID PK), user_id, name, emoji, color, notes (MEMO), summary (MEMO, JSON string), created_at, last_studied |
| `questions` | id (UUID PK), course_id, question_text (MEMO), answer_text (MEMO), question_type, difficulty, created_at |

**question_type** values: `recall` | `conceptual` | `application`
**difficulty** values: `easy` | `medium` | `hard`

The `summary` column stores a JSON string:
```json
{
  "key_concepts": ["term 1", "term 2"],
  "main_takeaways": "prose paragraph...",
  "quick_reference": "formula 1\nformula 2\n..."
}
```

---

## Switching databases (no code changes needed in routes)

1. Create `backend/db/<name>.py` and subclass `UserRepo`, `SessionRepo`, `CourseRepo`, `QuestionRepo` from `base.py`
2. Add an `elif driver == "<name>"` block in `db/__init__.py`
3. Set `DB_DRIVER=<name>` in `config.py` (or `SB_DB_DRIVER` env var)
4. Write a setup script for the new DB using the same schema above

---

## Auth flow

- **Signup**: validates form → POST `/api/auth/signup` → stores `{sb_token, sb_user}` in localStorage → redirect to dashboard
- **Login**: validates form → POST `/api/auth/login` → stores `{sb_token, sb_user}` → redirect to dashboard
- **Auth guard**: `dashboard.js` and `studio.js` check `getToken()` (from `api.js`) on load; redirect to `login.html` if missing
- **API auth**: every protected request sends `Authorization: Bearer <token>`; 401 response clears session and redirects to login
- **Logout**: DELETE `/api/auth/logout` (invalidates server-side token) + `clearSession()` + redirect to landing

Password storage: `salt:sha256(password+salt)` — swap to bcrypt by editing `_hash_password` / `_verify_password` in `api/auth.py`.

---

## localStorage keys (client-side only)

| Key | Contents |
|---|---|
| `sb_token` | Bearer token for API auth (set on login/signup; cleared on logout) |
| `sb_user` | `{ id, first_name, last_name, username, email, role }` — display only |
| `sb_apikey` | User's own Anthropic API key (never sent to our backend; sent only to Anthropic) |

`sb_courses` no longer exists — course data lives in the database.

---

## Studio tabs

| Tab | What it does |
|---|---|
| **Notes** | Paste text or upload files. Supports `.txt .md .csv .pdf .docx`. Files are read client-side (PDF.js for PDFs, Mammoth.js for Word), text appended to the textarea. Notes auto-save to the DB 1 s after the user stops typing. |
| **Questions** | Shows all Q&A pairs grouped by difficulty (Easy → Medium → Hard) with a filter bar. Each card has a type badge (recall / conceptual / application) and a difficulty badge (easy / medium / hard). Answers are revealed on click. Individual questions can be deleted. |
| **Quiz** | Level picker (All / Easy / Medium / Hard) → flashcard mode. Each card shows the difficulty. "Still Learning" loops the card back; "Know It" advances. Session ends when all cards are seen; results show known vs. still-learning count. |
| **Summary** | Key concept pills, main-takeaways paragraph, and quick-reference preformatted block. Generated alongside questions in a single Claude call. "Regenerate" button re-runs the full generation. |

---

## AI generation (studio.js → callClaude)

- **Model**: `claude-haiku-4-5-20251001` via direct browser fetch
- **Header required**: `anthropic-dangerous-direct-browser-access: true`
- **Output**: single JSON object with `questions` array + `summary` object
- **Questions**: exactly 9 — 3 easy / 3 medium / 3 hard
- **Prompt location**: `studio.js → callClaude()` — edit there to change count, style, or format

To change the question count or distribution, edit the prompt string in `callClaude()`.

External libraries loaded from CDN in `studio.html`:
- PDF.js `3.11.174` — worker URL must be set before use (done at top of `studio.js`)
- Mammoth.js `1.6.0` — no configuration needed

---

## CSS architecture

`styles.css` defines all global tokens (`--accent`, `--surface`, `--bg`, etc.) and shared components:
- Modals (`.modal-overlay`, `.modal`, `.modal-header`, `.modal-close`, `.modal-field`)
- Buttons (`.btn-primary`, `.btn-ghost`, `.btn-primary-sm`, `.btn-submit-modal`)
- `.field-error`, `.nav-link-btn`, `.user-greeting`, `.hero-badge`, how-it-works section

No other file may redefine `:root` variables. Page-specific files (`dashboard.css`, `studio.css`, `login.css`, `signup.css`) inherit from `styles.css` and only add page-specific rules.

**Modal pattern**: add `.active` to `.modal-overlay` to open; remove to close. Backdrop click and Escape key close all modals (wired in each page's JS).

---

## Signup field validation rules

| Field | Rules |
|---|---|
| First / Last name | Required, letters only (incl. accented), min 2 chars |
| Username | 3–20 chars, letters/numbers/`_`/`-`, must start and end with letter or number |
| Email | Standard `x@x.x` pattern |
| Phone | 7–15 digits; allows `+`, spaces, `-`, `()`, `.` |
| Role | Must select Student or Teacher |
| Password | Min 8 chars, ≥1 uppercase, ≥1 digit |
| Confirm password | Must match password |

---

## Code comments policy

All HTML, CSS, and JS must include comments that help a future debugger understand what is happening and why:
- Label every major section or block so its purpose is immediately clear
- Explain non-obvious logic, calculations, or CSS tricks
- Note cross-file dependencies (e.g. "this class is toggled by studio.js")
- Never write comments that just restate what the code already says
