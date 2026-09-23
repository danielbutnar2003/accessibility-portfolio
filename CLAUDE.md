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

## Design
Draft 2026-09-23, owner to edit. The tokens in `assets/css/style.css` are the source of truth; update this section when they change.
- Palette, token → role → hex. Light only, no dark mode. The CSS header says every pair is AA or better; the ratios are from its comments.
  - `--ink` → text, primary button, `.section--ink`, footer, focus ring → #0F1F3D (16:1 on white); `--ink-2` → button hover → #1B2E52.
  - `--paper` → background → #FFFFFF; `--paper-2` → tinted sections, code, featured table row → #F2F4F8.
  - `--slate` → secondary text → #475467 (7.6:1 on white); `--muted-d` → secondary text on ink → #B8C2D6 (9:1).
  - `--signal` → accent, background or marker only, never text → #FFD100 (ink on it 11:1); `--signal-2` → its hover → #FFE566.
  - `--fail` → danger → #B42318 (6.6:1), `--warn` → #B54708 (5.4:1), `--pass` → #067647 (5.7:1), each with a `-bg` tint (#FDEDEB, #FFF3E6, #E6F4EC). On ink, error and success text are the literals #FFB4A8 and #8CE0B0 (above 9:1).
- Type: one family, Atkinson Hyperlegible Next (variable 200-800), chosen for low-vision legibility; Atkinson Hyperlegible Mono only for code. Headings weight 750. Scale `--t-s` to `--t-5`, a major third from 18 px (`html` at 112.5%): use a token, not a new size.
- Spacing and radius: no spacing tokens. `--wrap` 1180px, `--gutter` clamp(18px, 4vw, 48px), `--header-h` 68px, `.section` padding clamp(3.2rem, 7vw, 6rem). Radius `--r` 6px; 10px on the mock shop, the report `.doc` and the photo; 999px pills for badges and tool tags.
- Motion: `--ease` cubic-bezier(.2, .7, .1, 1), 0.2s colour transitions. The one animation is the hero mock: four barrier markers appear once, in sequence, only under `prefers-reduced-motion: no-preference`. No scroll reveals.
- Voice: owners and operators of online shops and services in DE, AT and RO. First person singular ("I find the barriers and fix them in the code"), plain and factual, laws and dates named exactly, numbers only from the study. Sie in German, tu in Romanian. Banned words: none named yet (owner to add).
- Keep: the tactile-paving strip (`.paving`, between header and `main`) as the one brand ornament; numbered steps only because the process is a real sequence; packages as a comparison table, not cards; findings with a severity badge and a left border in the status colour; the mock shop's abstract bars instead of real low-contrast text.
- Avoid: yellow text; a second ornament; motion outside the hero mock; cards for things that compare; new hex literals where a token exists; any third-party asset.
- References: owner to add. The one named reference is tactile paving (the `--signal` comment in the CSS).
- Tried and rejected: none recorded yet. One line per rejected direction: what, when, why.
- Redesign, new page or new page type: present two or three directions first (4-6 named hex values, type pairing, hero concept as an ASCII wireframe, one sentence on the memorable element) and wait for the owner's pick.
- Mechanical check: `design-lint.json` (web-qa `design-lint.mjs`, a ratchet).

## Working here
- Preview: `npx serve . -l 4173` or `.claude/launch.json` config `site`.
- Checks, run from the repo root with the preview up on port 4173 (first time: `pnpm install` in `tools/audit/`; they drive the installed Chrome):
  - `node tools/audit/self-check.mjs --base http://localhost:4173` (same as `pnpm --dir tools/audit run check`): axe, head tags, links, console and CSP errors, and overflow at 375 px on all pages. `--shots` adds screenshots in `_private/qa-shots/`.
  - `node tools/audit/behaviour-check.mjs --base http://localhost:4173` (same as `pnpm --dir tools/audit run check:behaviour`): tab order and focus ring, skip link, mobile menu, contact form with FormSubmit mocked. `--lang de` or `--lang ro` checks the other landing pages.
  - `tools/audit/audit.mjs` is the study pipeline for external shops. It has no `--base` option and does not check this site.
- Before finishing UI changes: check 375 px and 1440 px, keyboard-only navigation, the console (CSP violations show there), and run the `web-qa` skill before a deploy.
- The site is live: a push to `main` publishes it within about a minute.
