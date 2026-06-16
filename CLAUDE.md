# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What StudyBudy is

StudyBudy is an AI-powered study tool where users create their own courses, paste study notes, and let Claude AI generate targeted practice questions. Users then quiz themselves with a built-in flashcard mode that tracks progress.

The concept is similar to NotebookLM but focused specifically on generating high-quality practice questions for exam prep.

## Current state

**Pages:**
- `index.html` — landing page explaining the product and how it works
- `signup.html` — registration (first name, last name, username, email, phone, role, password). On success, saves user to localStorage and redirects to `dashboard.html`.
- `login.html` — login (username or email + password). Checks localStorage for a stored account. On success, redirects to `dashboard.html`.
- `dashboard.html` — authenticated user's course library. Shows all created courses; lets user create new ones via a modal. Auth-guarded: redirects to `login.html` if no session.
- `studio.html?id=<course-id>` — the main AI study tool. Three tabs: Notes (paste material + generate questions), Questions (review Q&A), Quiz (flashcard mode). Auth-guarded.

**AI integration:**
- Calls the Anthropic API (`claude-haiku-4-5-20251001`) directly from the browser using `fetch`.
- Requires the user to supply their own Anthropic API key via the ⚙ API Key button.
- Key is stored in `localStorage` as `sb_apikey` and sent only to Anthropic's servers.
- The `anthropic-dangerous-direct-browser-access: true` header is required for direct browser calls.

**Data storage (all localStorage, no backend):**
- `sb_user` — `{ firstName, lastName, username, email, phone, role }` — set on signup/login.
- `sb_courses` — array of course objects: `{ id, name, emoji, color, notes, questions[], createdAt, lastStudied }`.
- `sb_apikey` — the user's Anthropic API key.

## Code comments

All code — HTML, CSS, and JS — must include comments that help a debugger understand what is happening and why:
- Label each major section or block so its purpose is immediately clear
- Explain non-obvious logic, calculations, or CSS tricks
- Note dependencies between files (e.g. "this class is toggled by app.js")

## Git and GitHub — mandatory workflow

**Every change, no matter how small, must be committed and pushed to GitHub.**

Repository: `https://github.com/tamiraro/studybudy` (branch: `master`)

```
git add <changed files>
git commit -m "descriptive message"
git push
```

No CI — push directly to `master`.

## Running the app

Open `index.html` directly in a browser — no build step, no server required.

Headless screenshot (Edge):
```
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --screenshot=screenshot.png --window-size=1280,900 --disable-gpu --no-sandbox "file:///C:/Users/tamir1/Desktop/Programming/studybudy/index.html"
```

## File structure and CSS architecture

```
index.html          — landing page
styles.css          — global CSS variables, reset, navbar, modals, shared utilities
app.js              — scroll-driven nav highlight (IntersectionObserver)

signup.html/css/js  — registration page
login.html          — login page (uses styles.css + signup.css + login.css)
login.css           — login page layout
login.js            — login validation + localStorage auth

dashboard.html      — authenticated course library
dashboard.css       — dashboard layout, course cards, create-course modal
dashboard.js        — course CRUD (localStorage), emoji/color pickers, auth guard

studio.html         — AI study studio (Notes / Questions / Quiz tabs)
studio.css          — studio layout, tab bar, flashcard, quiz, API key modal
studio.js           — AI generation (Anthropic API), quiz logic, auth guard

courses/            — legacy course pages (no longer linked from the main app)
  course.css
  java/index.html
```

**CSS layering rule:** `styles.css` defines all global tokens (`--accent`, `--surface`, etc.) and shared components (modals, `.field-error`, `.nav-link-btn`, `.btn-primary`, `.btn-ghost`). Every other CSS file inherits from it and must not redefine `:root` variables. `signup.css` doubles as the shared form-component library — `login.html` links to it for that reason.

**Modal pattern:** Both `dashboard.html` and `studio.html` use the shared `.modal-overlay` / `.modal` / `.modal-header` styles defined in `styles.css`. Modals open by adding `.active` to `.modal-overlay`; close on backdrop click or Escape key.

## Signup field validation rules

| Field | Rules |
|---|---|
| First / Last name | Required, letters only (incl. accented), min 2 chars |
| Username | 3–20 chars, letters/numbers/`_`/`-`, must start and end with letter or number |
| Email | Standard `x@x.x` pattern |
| Phone | 7–15 digits; allows `+`, spaces, `-`, `()`, `.` |
| Role | Must pick Student or Teacher |
| Password | Min 8 chars, ≥1 uppercase, ≥1 digit |
| Confirm password | Must match password |

## Adding a new course color

In `dashboard.js`, add an entry to the `COLORS` array:
```javascript
{ id: 'newcolor', hex: '#rrggbb' }
```
The hex value is used inline via CSS custom property `--c` on `.color-btn`.

## AI question generation prompt

The prompt in `studio.js → callClaude()` instructs Claude to return exactly 8 questions as a JSON array:
```json
[{"question":"...","answer":"...","type":"recall|conceptual|application"}]
```
To adjust the number or style of questions, edit the prompt string in `callClaude()`.
