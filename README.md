# Daniel Butnar — web accessibility for online shops

Portfolio and service site for accessibility audits and remediation (WCAG 2.1 AA, EN 301 549) for online shops and services under the European Accessibility Act, the German BFSG, the Austrian BaFG and Romanian Law 232/2022. Plain HTML, CSS and JS, no build step, no cookies, no analytics. Three languages: `/en/`, `/de/`, `/ro/`.

The site's proof is a real study: on 15 September 2026 the homepages of 44 well-known shops and service providers in Romania and Germany were scanned with axe-core (WCAG 2.1 A/AA rules). 42 answered, 37 fail. The public pages show anonymised results; the named raw data stays in `_private/` (git-ignored).

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | Root redirect to `/en/` with visible language links |
| `en/`, `de/`, `ro/` | One folder per language: `index.html` (landing), `study.html` (the 42-site study), `report.html` (sample audit report), `privacy.html`, `imprint.html` |
| `en/demo.html` | Six barriers before and after, English only (linked from DE and RO) |
| `404.html` | Not-found page (GitHub Pages serves it automatically) |
| `assets/css/style.css` | Design system: tokens at the top, then reset, type, layout, components |
| `assets/css/fonts.css` + `assets/fonts/` | Self-hosted Atkinson Hyperlegible Next (variable) and Atkinson Hyperlegible Mono, OFL 1.1 |
| `assets/js/main.js` | Mobile menu, contact form (FormSubmit), demo page announcer. `CONFIG` at the top |
| `assets/logo/` | `icon.svg`, `icon-512.png`, `apple-touch-icon.png`, `og-image.png` (1200×630) |
| `assets/img/daniel.jpg` | Profile photo |
| `sitemap.xml`, `robots.txt`, `site.webmanifest`, `.nojekyll`, `.well-known/security.txt` | Deployment files, keep them |
| `tools/audit/` | The audit pipeline (Node, playwright-core, axe-core). See below |
| `_private/` | Git-ignored: named audit results, screenshots, summary, font sources |

## Before going live

1. **Fill the placeholders.** Search for `[ADD:` in `en/imprint.html`, `de/imprint.html` and `ro/imprint.html` (postal address, legal form, tax ID). The German Impressum needs a full address.
2. **Check the translations.** The German and Romanian copy was drafted in one pass; read every page once.
3. **Activate the form.** The first submission through the contact form sends a one-time activation e-mail from FormSubmit to the address in `assets/js/main.js` (`CONFIG.email`). Click the link once. To use a different address, change it in `main.js` and in the `action` attribute of every `<form>`.
4. **Base URL.** All canonical, hreflang and Open Graph URLs point to `https://danielbutnar2003.github.io/accessibility-portfolio`. When a custom domain is set, search-and-replace that string in every `.html`, `sitemap.xml`, `robots.txt` and `.well-known/security.txt`, and add a `CNAME` file. The `404.html` uses absolute `/accessibility-portfolio/` paths for the same reason; change them to `/` on a custom domain.
5. **Prices** are in the three landing pages and in the JSON-LD `offers`. Change them in both places.

## Local preview

```bash
npx serve . -l 4173
```

Then open `http://localhost:4173/en/`. Opening the HTML files directly also works.

## Deploy (GitHub Pages)

1. Create the repository `danielbutnar2003/accessibility-portfolio` on GitHub and push `main`.
2. Settings → Pages → Build and deployment: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site is live at `https://danielbutnar2003.github.io/accessibility-portfolio/` within a minute. `.nojekyll` makes GitHub serve the `_private`-free tree as-is.

### Custom domain later

- Apex `A` records to GitHub Pages: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `AAAA`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
- `www` as a `CNAME` to `danielbutnar2003.github.io`.
- On Cloudflare: do not proxy the apex A/AAAA records (grey cloud) until the GitHub certificate exists; SSL mode *Full*.
- Add a `CNAME` file with the domain to the repo root and enable *Enforce HTTPS* in the Pages settings.

## Content Security Policy

Every page carries a CSP meta tag. The only inline script is `document.documentElement.classList.add("js")`, allowed by its sha256 hash (`qOhFsq0QMV2REqNwk5hGH5bZE9SkX6gt6yeyKdYPv+U=`). Do not add other inline scripts or inline event handlers; put JavaScript in `main.js`. FormSubmit is the only external origin (`connect-src`, `form-action`).

## The audit pipeline

```bash
cd tools/audit
pnpm install
node audit.mjs                      # all targets in targets.json, 3 at a time
node audit.mjs --only ro-08,de-02   # a subset
node build-study-table.mjs          # refill the tables in */study.html from _private/summary.json
node make-images.mjs                # regenerate icons and the Open Graph image
```

`audit.mjs` drives the installed Google Chrome through playwright-core, injects axe-core 4.13 with the WCAG 2.0/2.1 A and AA rule set, tries to dismiss cookie banners (reject first, then accept), records violations, "needs review" items, a few structure checks (lang, h1 count, first anchor) and a screenshot. Bot walls are detected and marked as blocked. Results go to `_private/audit-results.json`; the aggregate statistics and anonymised rows in `_private/summary.json` were produced by the one-off script embedded in the session that built the site and can be recreated from the results file.

To use the pipeline for a client, add their pages to a copy of `targets.json`. Homepage-only automated scans are a starting point, not an audit: the sample report shows what the manual part adds.

## Dates to remember

- `.well-known/security.txt` expires 2027-09-15; refresh the `Expires` line before then.
- The study is dated 15 September 2026; re-run it in 2027 for a "one year later" update.
