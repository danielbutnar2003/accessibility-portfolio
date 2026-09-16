// Renders the PNG icons and the Open Graph image from HTML/SVG with the installed Chrome.
// Usage: node make-images.mjs  (writes into ../../assets/logo/)
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const LOGO = path.join(ROOT, "assets/logo");
const svg = await readFile(path.join(LOGO, "icon.svg"), "utf8");
const fontsCss = pathToFileURL(path.join(ROOT, "assets/css/fonts.css")).href;

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function icon(size, file) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;background:#FFD100}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: path.join(LOGO, file), type: "png" });
  await page.close();
}
await icon(512, "icon-512.png");
await icon(180, "apple-touch-icon.png");

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.setContent(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fontsCss}">
<style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{font-family:"Atkinson Hyperlegible Next",Arial,sans-serif;background:#0F1F3D;color:#fff;position:relative}
.paving{position:absolute;left:0;right:0;top:0;height:22px;background-color:#FFD100;background-image:radial-gradient(circle,rgba(15,31,61,.3) 3px,transparent 4px);background-size:22px 22px;background-position:11px 11px}
.box{position:absolute;left:72px;top:96px;right:72px}
h1{font-size:64px;line-height:1.08;font-weight:800;letter-spacing:-.02em;margin:0 0 28px;max-width:960px}
p{font-size:30px;line-height:1.35;margin:0;color:#B8C2D6;max-width:900px}
.who{position:absolute;left:72px;bottom:64px;display:flex;align-items:center;gap:22px;font-size:30px;font-weight:700}
.who svg{width:64px;height:64px}
.law{position:absolute;right:72px;bottom:72px;font-size:24px;color:#B8C2D6}
</style></head><body>
<div class="paving"></div>
<div class="box"><h1>Your online shop has to be accessible by law. I find the barriers and fix them in the code.</h1>
<p>WCAG 2.1 AA audits and remediation for shops and services in Germany and Romania.</p></div>
<div class="who">${svg}<span>Daniel Butnar</span></div>
<div class="law">EAA, BFSG, Legea 232/2022</div>
</body></html>`);
await og.evaluate(() => document.fonts.ready);
await og.screenshot({ path: path.join(LOGO, "og-image.png"), type: "png" });
await og.close();
await browser.close();
console.log("wrote icon-512.png, apple-touch-icon.png, og-image.png");
