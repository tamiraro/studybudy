# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Open `index.html` directly in a browser — no build step, no server required.

To verify changes headlessly (Edge must be installed):
```
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --screenshot=screenshot.png --window-size=1280,900 --disable-gpu "file:///C:/Users/tamir1/Desktop/Programming/studybudy/index.html"
```

## Architecture

This is a zero-dependency static web app — three files, no framework, no bundler.

- **`index.html`** — all markup and page structure. Sections in order: navbar, hero, features strip, courses grid, footer.
- **`styles.css`** — all styling. Uses CSS custom properties (`--accent`, `--surface`, etc.) defined on `:root` for the dark theme. No preprocessor.
- **`app.js`** — minimal JS. Currently only drives the active nav-link highlight via `IntersectionObserver`.

## Adding a course

Course cards live in the `#courses` section of `index.html`. Each card follows this structure:

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

Color variants defined in `styles.css`: `java-bg` (amber) and `linalg-bg` (teal). Add new color variants there for additional courses.

## Git workflow

Every change must be committed and pushed to `https://github.com/tamiraro/studybudy`. There is no CI — push directly to `master`.
