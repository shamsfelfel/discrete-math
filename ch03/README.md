# Chapter 3 — Algorithms (drop-in)

Bilingual (EN/AR) lesson pages for Rosen, *Discrete Mathematics and Its
Applications*, 8th ed., Chapter 3. Same shared-assets architecture as
Chapter 1, so these drop straight into your existing site.

## Install

Copy the `ch03/` folder into your site root, next to `ch01/` and `ch02/`:

```
site/
├── assets/            (your existing site.css, lesson.js, mermaid.min.js)
├── index.en.html
├── index.ar.html
├── ch01/
├── ch02/
└── ch03/              ← drop this in
    ├── index.en.html
    ├── index.ar.html
    ├── lesson-3.1.en.html   lesson-3.1.ar.html
    ├── lesson-3.2.en.html   lesson-3.2.ar.html
    └── lesson-3.3.en.html   lesson-3.3.ar.html
```

No new assets are included — every page references your shared
`../assets/site.css`, `../assets/lesson.js`, and `../assets/mermaid.min.js`.

## Activate the Chapter 3 card on the root index

On `site/index.en.html` and `site/index.ar.html`, replace the disabled
Chapter 3 placeholder with a real link (GENERATION_NOTES §3):

```html
<!-- EN -->
<a class="lesson-link" href="ch03/index.en.html">Chapter 3 — Algorithms</a>
<!-- AR -->
<a class="lesson-link" href="ch03/index.ar.html">الفصل ٣ — الخوارزميات</a>
```

## Lessons

| #   | English                        | Arabic                       |
|-----|--------------------------------|------------------------------|
| 3.1 | Algorithms                     | الخوارزميات                  |
| 3.2 | The Growth of Functions        | نمو الدوال                   |
| 3.3 | The Complexity of Algorithms   | تعقيد الخوارزميات            |

Each lesson: 6 concept cards + 11 questions across all five types
(MCQ, T/F, fill-in-blank, short answer, reorder) at three levels
(Basic / Applied / Challenge), with full Arabic RTL translations.

## Conformance

Built to the canonical `window.LESSON_DATA` schema your `lesson.js`
consumes (GENERATION_NOTES §1): `concepts`/`body`/`{type:…}`, `lede`,
`chapter`, numeric `level`, per-type fields, `reorder.answer` present,
`fillblank` placeholders mapped to blank ids, `UI_STRINGS.qLevels` an
array. Fully offline — no CDN links, no Google Fonts, no sourcemap
references, no duplicate element ids. Validated before packaging.
