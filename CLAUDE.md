# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What StudyBudy is

StudyBudy is a web-based study helper that gives students a dedicated space for each of their courses. The core idea: instead of scattered notes and resources, each course gets its own section with organized materials, practice questions, and review tools.

The app is built incrementally — the landing page comes first, then each course gets fleshed out one at a time as the user defines it.

## Current courses

- **Introduction to Computer Science with Java** — fundamentals of programming and problem-solving in Java
- **Linear Algebra** — vectors, matrices, transformations, and their applications

Both courses are listed on the landing page but not yet defined (buttons show "Coming Soon").

## Planned direction

Each course page (once built) should include:
- Course overview and key topics
- Study materials / notes per topic
- Practice questions with answers
- Progress tracking

New courses can be added to the landing page grid at any time by adding a card to `index.html`.

## Git and GitHub — mandatory workflow

**Every change, no matter how small, must be committed and pushed to GitHub.**

Repository: `https://github.com/tamiraro/studybudy` (branch: `master`)

Steps after any edit:
```
git add <changed files>
git commit -m "descriptive message"
git push
```

There is no CI or review process — push directly to `master`.

## Running the app

Open `index.html` directly in a browser — no build step, no server required.

To verify changes headlessly (Edge must be installed):
```
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --screenshot=screenshot.png --window-size=1280,900 --disable-gpu "file:///C:/Users/tamir1/Desktop/Programming/studybudy/index.html"
```

## Architecture

Zero-dependency static web app — three files, no framework, no bundler.

- **`index.html`** — all markup. Sections in order: navbar, hero, features strip, courses grid, footer.
- **`styles.css`** — all styling. Dark theme driven by CSS custom properties on `:root` (`--accent`, `--surface`, etc.).
- **`app.js`** — minimal JS. Currently drives the active nav-link highlight via `IntersectionObserver`.

## Adding a course card

```html
<div class="course-card">
  <div class="course-card-top [color]-bg">
    <span class="course-emoji">[emoji]</span>
  </div>
  <div class="course-card-body">
    <span class="course-tag">[Category]</span>
    <h3>[Course name]</h3>
    <p>[Description]</p>
    <button class="btn-course" disabled>Coming Soon</button>
  </div>
</div>
```

Existing color variants in `styles.css`: `java-bg` (amber), `linalg-bg` (teal). Add new variants there for additional courses.
