# Accessibility portfolio site

Static site (plain HTML/CSS/JS, no build step, no dependencies at runtime, no cookies, no analytics) selling web accessibility audits and remediation for online shops under the EAA, BFSG, BaFG and Legea 232/2022. Hosted on GitHub Pages from `main`. README.md holds deployment, placeholders and the audit pipeline; read it first.

## Layout
- Three language folders `en/`, `de/`, `ro/`, same file names in each (`index`, `study`, `report`, `privacy`, `imprint`); `en/demo.html` exists only in English. Header, nav and footer are duplicated in the 16 language pages: a change to shared chrome must be applied to all 16 (`rg` for the snippet first).
- Two pages stand apart. `404.html` is self-contained (inline CSS, data-URI icon, its own small header, `script-src 'none'`) so it renders under any path on the project site; edit it on its own. Root `index.html` is a `noindex` meta-refresh stub to `en/` with a language list: no shared chrome, no skip link, no script, and no CSP.
- `assets/css/style.css` is the design system: tokens at the top (`--ink` navy, `--paper`, `--signal` yellow, `--slate`, `--fail`, `--warn`, `--pass`, type scale `--t-*`). Yellow is only ever a background or marker, never a text colour. Add new colours or spacing as tokens.
- Fonts are self-hosted Atkinson Hyperlegible Next and Mono in `assets/fonts/` (`fonts.css`). No Google Fonts, no third-party assets.
- `assets/js/main.js`: mobile menu (`inert` + `aria-expanded`), contact form via FormSubmit with per-field validation, demo announcer. Strings for the form live in `data-msg-*` attributes on each `<form>`, so the script is language-neutral.
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, `.nojekyll`, `.well-known/security.txt` must stay. Adding a page means adding it to `sitemap.xml`, to the nav in every page of that language, and to the language switcher of its siblings.

## Hard rules
- This site sells accessibility; it must pass its own audit. Every page: one `h1`, landmarks, skip link to `#main` (`tabindex="-1"`), visible focus, AA contrast, no motion that cannot be turned off (`prefers-reduced-motion` is honoured in CSS). Run the self-check before finishing (commands under "Working here"); it covers every page and must end with "No problems found".
- The 16 language pages and `404.html` carry a CSP meta tag. On the language pages the only inline script is `document.documentElement.classList.add("js")` with its sha256 hash in the CSP; `404.html` allows no script at all. No other inline scripts or inline handlers. Exemption: root `index.html` has no CSP because it runs no script and leaves at once; if it ever gets a script or real content, give it the same CSP first. `self-check.mjs` skips `/`, so nothing tests that page.
- The study numbers on the landing and study pages come from `_private/summary.json` (git-ignored). Do not change a number by hand; re-run the pipeline and `build-study-table.mjs`, then update the prose.
- Study sites stay anonymised on the public pages. Named results and the list of audited sites are only in `_private/` (`_private/targets.json`; the repo tracks just `tools/audit/targets.example.json`). Never commit a file that names a study site.
- Deliberately broken examples on `en/demo.html` sit inside `inert` containers so the page itself stays conformant. Keep that.
- German and Romanian copy: formal "Sie" in German, informal "tu" in Romanian, consistently. Flag translated copy for the owner's review.

## Working here
- Preview: `npx serve . -l 4173` or `.claude/launch.json` config `site`.
- Checks, run from the repo root with the preview up on port 4173 (first time: `pnpm install` in `tools/audit/`; they drive the installed Chrome):
  - `node tools/audit/self-check.mjs --base http://localhost:4173` (same as `pnpm --dir tools/audit run check`): axe, head tags, links, console and CSP errors, and overflow at 375 px on all pages. `--shots` adds screenshots in `_private/qa-shots/`.
  - `node tools/audit/behaviour-check.mjs --base http://localhost:4173` (same as `pnpm --dir tools/audit run check:behaviour`): tab order and focus ring, skip link, mobile menu, contact form with FormSubmit mocked. `--lang de` or `--lang ro` checks the other landing pages.
  - `tools/audit/audit.mjs` is the study pipeline for external shops. It has no `--base` option and does not check this site.
- Before finishing UI changes: check 375 px and 1440 px, keyboard-only navigation, the console (CSP violations show there), and run the `web-qa` skill before a deploy.
- The site is live: a push to `main` publishes it within about a minute.
