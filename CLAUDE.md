# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What StudyBudy is

StudyBudy is a web-based study helper that gives students a dedicated space for each of their courses. The core idea: instead of scattered notes and resources, each course gets its own section with organized materials, practice questions, and review tools.

The app is built incrementally — the landing page and user system come first, then each course is fleshed out one topic at a time.

## Current state

**Courses on the landing page:**
- **Introduction to Computer Science with Java** — live, links to `courses/java/index.html`. Has a course intro and a Recursion topic stub (Coming Soon).
- **Linear Algebra** — listed on the landing page, button still disabled (no course page yet).

**User system:**
- `signup.html` — registration form (first name, last name, username, email, phone, role, courses, password). Client-side validation only; no backend yet.
- `login.html` — login form (username or email + password). Client-side validation only.

**Planned direction for each course page:**
- Course overview and intro
- Topics list, each topic linking to its own page with study materials, notes, and practice questions
- Progress tracking

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
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --screenshot=screenshot.png --window-size=1280,900 --disable-gpu "file:///C:/Users/tamir1/Desktop/Programming/studybudy/index.html"
```

## File structure and CSS architecture

```
index.html          — landing page
styles.css          — global CSS variables, reset, navbar, hero, courses grid, footer
app.js              — scroll-driven nav highlight (IntersectionObserver)

signup.html/css/js  — registration page
login.html          — login page (uses styles.css + signup.css + login.css)
login.css           — login page layout; signup.css provides shared form component styles
login.js            — login validation

courses/
  course.css        — shared layout for all course pages (hero, sections, subject cards)
  java/
    index.html      — Java course overview (intro + topics list)
```

**CSS layering rule:** `styles.css` defines all global tokens (`--accent`, `--surface`, etc.). Every other CSS file inherits from it and must not redefine `:root` variables. `signup.css` doubles as the shared form-component library (inputs, errors, buttons) — `login.html` links to it for that reason.

**CSS cascade note:** When two classes on the same element conflict, the one declared *later* in the file wins. `.btn-course-active` must stay after `.btn-course` in `styles.css` so its `cursor: pointer` overrides `cursor: not-allowed`.

## Signup field validation rules

| Field | Rules |
|---|---|
| First / Last name | Required, letters only (incl. accented), min 2 chars |
| Username | 3–20 chars, letters/numbers/`_`/`-`, must start and end with letter or number |
| Email | Standard `x@x.x` pattern |
| Phone | 7–15 digits; allows `+`, spaces, `-`, `()`, `.` |
| Role | Must pick Student or Teacher |
| Courses | At least one selected |
| Password | Min 8 chars, ≥1 uppercase, ≥1 digit |
| Confirm password | Must match password |

## Adding a course card to the landing page

```html
<div class="course-card">
  <div class="course-card-top [color]-bg">
    <span class="course-emoji">[emoji]</span>
  </div>
  <div class="course-card-body">
    <span class="course-tag">[Category]</span>
    <h3>[Course name]</h3>
    <p>[Description]</p>
    <!-- disabled until the course page exists: -->
    <button class="btn-course" disabled>Coming Soon</button>
    <!-- once the page exists, replace the button with: -->
    <!-- <a href="courses/[name]/index.html" class="btn-course btn-course-active">Open Course</a> -->
  </div>
</div>
```

Color variants in `styles.css`: `java-bg` (amber), `linalg-bg` (teal). Add new variants for additional courses.

## Adding a topic to a course page

In the course `index.html`, inside `.subjects-grid`:

```html
<div class="subject-card">
  <div class="subject-card-left">
    <span class="subject-number">01</span>
    <span class="subject-name">Topic Name</span>
  </div>
  <span class="subject-status coming-soon">Coming Soon</span>
</div>
```

When the topic page is ready, add class `available` to `.subject-card` and wrap it in an `<a>` tag. Subject card styles live in `courses/course.css`.
