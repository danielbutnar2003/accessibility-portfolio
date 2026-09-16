// Homepage accessibility audit: axe-core (WCAG 2.1 A/AA rules) via Playwright and the installed Chrome.
// Usage: node audit.mjs [--only ro-01,de-02] [--concurrency 3]
// Writes ../../_private/audit-results.json (named, never published) and screenshots to ../../_private/shots/.
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, "../../_private");
const SHOTS = path.join(OUT_DIR, "shots");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const only = opt("--only", "").split(",").filter(Boolean);
const concurrency = Number(opt("--concurrency", 3));

const targets = JSON.parse(await readFile(path.join(HERE, "targets.json"), "utf8"))
  .filter((t) => !only.length || only.includes(t.slug));

// Privacy-preserving first: try "reject", then fall back to "accept" so the page content becomes visible to axe.
const REJECT = ["Respinge", "Refuz", "Doar necesare", "Doar cele necesare", "Ablehnen", "Alle ablehnen", "Nur notwendige", "Nur erforderliche", "Reject all", "Reject", "Decline", "Necessary only"];
const ACCEPT = ["Accept", "Acceptă", "Accepta", "Sunt de acord", "De acord", "Akzeptieren", "Alle akzeptieren", "Zustimmen", "Einverstanden", "Accept all", "I agree", "OK"];

async function dismissConsent(page) {
  for (const list of [REJECT, ACCEPT]) {
    for (const label of list) {
      const loc = page.getByRole("button", { name: new RegExp("^\\s*" + label, "i") }).first();
      try {
        if (await loc.isVisible({ timeout: 300 })) {
          await loc.click({ timeout: 2000 });
          await page.waitForTimeout(1200);
          return label;
        }
      } catch {}
    }
  }
  return null;
}

async function runAxe(page) {
  await page.addScriptTag({ path: AXE_PATH });
  const r = await page.evaluate(async (tags) => {
    const res = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete", "passes"] });
    const slim = (v) => ({
      id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, tags: v.tags, nodes: v.nodes.length,
      samples: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 220), summary: (n.failureSummary || "").slice(0, 300) })),
    });
    return { violations: res.violations.map(slim), incomplete: res.incomplete.map(slim), passes: res.passes.length };
  }, TAGS);
  const extras = await page.evaluate(() => {
    const first = document.body.querySelector("a[href^='#']");
    return {
      lang: document.documentElement.getAttribute("lang"),
      title: document.title,
      h1: document.querySelectorAll("h1").length,
      images: document.images.length,
      imagesNoAlt: Array.from(document.images).filter((i) => !i.hasAttribute("alt")).length,
      skipLink: first ? first.textContent.trim().slice(0, 60) : null,
      elements: document.getElementsByTagName("*").length,
    };
  });
  return { ...r, extras };
}

function summarize(v) {
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  let nodes = 0;
  for (const x of v) { byImpact[x.impact] = (byImpact[x.impact] || 0) + x.nodes; nodes += x.nodes; }
  return { rules: v.length, nodes, byImpact };
}

async function auditOne(browser, t) {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    locale: t.country === "DE" ? "de-DE" : "ro-RO",
    userAgent: (await browser.version()) ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + (await browser.version()) + " Safari/537.36" : undefined,
  });
  const page = await ctx.newPage();
  const out = { ...t, auditedAt: new Date().toISOString(), ok: false };
  try {
    const resp = await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    out.status = resp ? resp.status() : null;
    await page.waitForTimeout(4000);
    out.finalUrl = page.url();
    const probe = await page.evaluate(() => ({ title: document.title, elements: document.getElementsByTagName("*").length }));
    // Bot walls (403 pages, "Just a moment", "Access denied") are not audits of the shop; mark them and skip.
    if ((out.status && out.status >= 400) || probe.elements < 150 || /forbidden|access denied|just a moment|attention required|blocked|robot|captcha|verify you are/i.test(probe.title)) {
      out.blocked = true;
      out.error = "blocked: status " + out.status + ", title \"" + probe.title + "\", " + probe.elements + " elements";
      throw new Error(out.error);
    }
    out.asLanded = await runAxe(page);
    out.asLanded.summary = summarize(out.asLanded.violations);
    out.consentClicked = await dismissConsent(page);
    if (out.consentClicked) {
      out.afterConsent = await runAxe(page);
      out.afterConsent.summary = summarize(out.afterConsent.violations);
    }
    await page.screenshot({ path: path.join(SHOTS, t.slug + ".jpg"), type: "jpeg", quality: 70 });
    out.ok = true;
  } catch (e) {
    out.error = String(e && e.message ? e.message : e).slice(0, 300);
  } finally {
    await ctx.close();
  }
  const main = out.afterConsent || out.asLanded;
  const s = main ? main.summary : null;
  console.log((out.ok ? "ok  " : "ERR ") + t.slug + " " + t.url + " " + (s ? "rules=" + s.rules + " nodes=" + s.nodes + " crit=" + s.byImpact.critical + " ser=" + s.byImpact.serious : out.error));
  return out;
}

await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-blink-features=AutomationControlled"] });
const results = [];
let i = 0;
async function worker() { while (i < targets.length) { const t = targets[i++]; results.push(await auditOne(browser, t)); } }
await Promise.all(Array.from({ length: concurrency }, worker));
await browser.close();
results.sort((a, b) => a.slug.localeCompare(b.slug));
await writeFile(path.join(OUT_DIR, "audit-results.json"), JSON.stringify({ axeTags: TAGS, generatedAt: new Date().toISOString(), results }, null, 2));
console.log("\nDone: " + results.filter((r) => r.ok).length + "/" + results.length + " audited -> " + path.join(OUT_DIR, "audit-results.json"));
