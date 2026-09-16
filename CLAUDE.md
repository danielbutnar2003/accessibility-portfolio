# Accessibility portfolio site

Static site (plain HTML/CSS/JS, no build step, no dependencies at runtime, no cookies, no analytics) selling web accessibility audits and remediation for online shops under the EAA, BFSG, BaFG and Legea 232/2022. Hosted on GitHub Pages from `main`. README.md holds deployment, placeholders and the audit pipeline; read it first.

## Layout
- Three language folders `en/`, `de/`, `ro/`, same file names in each (`index`, `study`, `report`, `privacy`, `imprint`); `en/demo.html` exists only in English. Root `index.html` redirects to `/en/`. Header, nav and footer are duplicated in every page: a change to shared chrome must be applied to all 17 pages (`rg` for the snippet first).
- `assets/css/style.css` is the design system: tokens at the top (`--ink` navy, `--paper`, `--signal` yellow, `--slate`, `--fail`, `--warn`, `--pass`, type scale `--t-*`). Yellow is only ever a background or marker, never a text colour. Add new colours or spacing as tokens.
- Fonts are self-hosted Atkinson Hyperlegible Next and Mono in `assets/fonts/` (`fonts.css`). No Google Fonts, no third-party assets.
- `assets/js/main.js`: mobile menu (`inert` + `aria-expanded`), contact form via FormSubmit with per-field validation, demo announcer. Strings for the form live in `data-msg-*` attributes on each `<form>`, so the script is language-neutral.
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, `.nojekyll`, `.well-known/security.txt` must stay. Adding a page means adding it to `sitemap.xml`, to the nav in every page of that language, and to the language switcher of its siblings.

## Hard rules
- This site sells accessibility; it must pass its own audit. Every page: one `h1`, landmarks, skip link to `#main` (`tabindex="-1"`), visible focus, AA contrast, no motion that cannot be turned off (`prefers-reduced-motion` is honoured in CSS). Run the axe scan on every changed page before finishing (the pipeline in `tools/audit/` can point at `http://localhost:4173`).
- Every page carries a CSP meta tag. The only inline script is `document.documentElement.classList.add("js")` with its sha256 hash in the CSP. No other inline scripts or inline handlers.
- The study numbers on the landing and study pages come from `_private/summary.json` (git-ignored). Do not change a number by hand; re-run the pipeline and `build-study-table.mjs`, then update the prose.
- Study sites stay anonymised on the public pages. Named results are only in `_private/`.
- Deliberately broken examples on `en/demo.html` sit inside `inert` containers so the page itself stays conformant. Keep that.
- German and Romanian copy: formal "Sie" in German, informal "tu" in Romanian, consistently. Flag translated copy for the owner's review.

## Working here
- Preview: `npx serve . -l 4173` or `.claude/launch.json` config `site`.
- Before finishing UI changes: check 375 px and 1440 px, keyboard-only navigation, the console (CSP violations show there), and run the `web-qa` skill before a deploy.
- Do not commit or push unless asked.
