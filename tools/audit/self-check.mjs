// QA for this site itself: axe (WCAG 2.x A/AA + best practice), console errors, broken links,
// head checks, horizontal overflow at 375 px, and screenshots at 1440 and 375.
// Usage: node self-check.mjs [--base http://localhost:4173] [--shots]
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const AXE_SRC = await readFile(AXE_PATH, "utf8"); // evaluated over CDP, so the page CSP stays in force
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, "../../_private/qa-shots");
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const BASE = opt("--base", "http://localhost:4173");
const WANT_SHOTS = args.includes("--shots");

const PAGES = ["/", "/404.html",
  "/en/", "/en/study.html", "/en/report.html", "/en/demo.html", "/en/privacy.html", "/en/imprint.html",
  "/de/", "/de/study.html", "/de/report.html", "/de/privacy.html", "/de/imprint.html",
  "/ro/", "/ro/study.html", "/ro/report.html", "/ro/privacy.html", "/ro/imprint.html"];

async function waitForServer() {
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    try { const r = await fetch(BASE + "/en/"); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server not reachable at " + BASE);
}
await waitForServer();
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const checked = new Map(); // url -> status
let problems = 0;
const say = (s) => { problems++; console.log("  ✗ " + s); };

for (const p of PAGES) {
  const url = BASE + p;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
  const resp = await page.goto(url, { waitUntil: "load" });
  console.log("\n== " + p + " (" + resp.status() + ")");
  if (p === "/") { await ctx.close(); continue; } // meta refresh page

  // Head and structure checks
  const head = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const ids = new Set([...document.querySelectorAll("[id]")].map((e) => e.id));
    const hashLinks = [...document.querySelectorAll("a[href^='#']")].map((a) => a.getAttribute("href").slice(1)).filter((h) => h && !ids.has(h));
    return {
      lang: document.documentElement.lang, title: document.title,
      desc: (q("meta[name=description]") || {}).content || "",
      canonical: (q("link[rel=canonical]") || {}).href || "", og: !!q("meta[property='og:image']"),
      h1: document.querySelectorAll("h1").length, main: !!q("main#main"),
      skip: !!q("a.skip[href='#main']"), csp: !!q("meta[http-equiv='Content-Security-Policy']"),
      imgsNoDims: [...document.images].filter((i) => !i.getAttribute("width") || !i.getAttribute("height")).map((i) => i.getAttribute("src")),
      badHash: hashLinks,
    };
  });
  if (!head.lang) say("no lang");
  if (head.title.length > 60) say("title > 60 chars: " + head.title.length);
  if (head.desc.length < 50 || head.desc.length > 160) say("description length " + head.desc.length);
  if (p !== "/404.html" && !head.canonical) say("no canonical");
  if (p !== "/404.html" && !head.og) say("no og:image");
  if (head.h1 !== 1) say("h1 count " + head.h1);
  if (!head.main || !head.skip) say("missing main#main or skip link");
  if (!head.csp) say("no CSP");
  if (head.imgsNoDims.length) say("img without width/height: " + head.imgsNoDims.join(", "));
  if (head.badHash.length) say("hash links to missing ids: " + head.badHash.join(", "));

  // axe
  await page.evaluate(AXE_SRC);
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
    return { v: r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 3).map((x) => x.target.join(" ")), s: v.nodes[0] && v.nodes[0].failureSummary })), inc: r.incomplete.map((v) => v.id + "(" + v.nodes.length + ") " + v.nodes.slice(0, 2).map((x) => x.target.join(" ")).join(", ")) };
  });
  for (const v of axe.v) say("axe " + v.id + " [" + v.impact + "] ×" + v.n + " " + v.t.join(" | ") + (v.s ? "\n      " + v.s.replace(/\s+/g, " ").slice(0, 200) : ""));
  if (axe.inc.length) console.log("  ? needs review: " + axe.inc.join(", "));

  // Links and assets
  const refs = await page.evaluate(() => {
    const out = new Set();
    document.querySelectorAll("a[href], link[href]").forEach((e) => out.add(e.href));
    document.querySelectorAll("img[src], script[src]").forEach((e) => out.add(e.src));
    return [...out];
  });
  for (const r of refs) {
    if (!r.startsWith(BASE)) continue;
    // 404.html uses the deployed project prefix in its absolute paths; map it to the local root.
    const clean = r.split("#")[0].replace(BASE + "/accessibility-portfolio/", BASE + "/");
    if (!checked.has(clean)) {
      try { const res = await fetch(clean, { method: "GET" }); checked.set(clean, res.status); } catch (e) { checked.set(clean, "ERR"); }
    }
    if (checked.get(clean) !== 200) say("link " + clean.replace(BASE, "") + " -> " + checked.get(clean));
  }

  if (consoleErrors.length) say("console: " + consoleErrors.join(" || ").slice(0, 400));

  if (WANT_SHOTS) await page.screenshot({ path: path.join(SHOTS, p.replace(/\//g, "_").replace(/^_/, "") .replace(/\.html$/, "") + "-1440.jpg"), type: "jpeg", quality: 55, fullPage: true });

  // Mobile overflow
  await page.setViewportSize({ width: 375, height: 740 });
  await page.waitForTimeout(200);
  const over = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  if (over.sw > over.iw + 1) say("horizontal overflow at 375: scrollWidth " + over.sw);
  if (WANT_SHOTS) await page.screenshot({ path: path.join(SHOTS, p.replace(/\//g, "_").replace(/^_/, "").replace(/\.html$/, "") + "-375.jpg"), type: "jpeg", quality: 55, fullPage: true });

  await ctx.close();
}
await browser.close();
console.log("\n" + (problems ? problems + " problem(s) found" : "No problems found"));
process.exit(problems ? 1 : 0);
