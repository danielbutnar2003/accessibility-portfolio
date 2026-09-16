// Keyboard, mobile-menu and form behaviour on the landing page (needs the local server).
// Usage: node behaviour-check.mjs [--base http://localhost:4173] [--lang en]
import { chromium } from "playwright-core";
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const BASE = opt("--base", "http://localhost:4173");
const LANG = opt("--lang", "en");
let problems = 0;
const bad = (s) => { problems++; console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

const browser = await chromium.launch({ channel: "chrome", headless: true });

// 1. Keyboard order and visible focus at desktop width
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/" + LANG + "/", { waitUntil: "load" });
  const seq = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    seq.push(await page.evaluate(() => {
      const el = document.activeElement; const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), text: (el.textContent || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 28), outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2, visible: r.width > 0 && r.top >= 0 };
    }));
  }
  console.log("Tab order (first 14):"); seq.forEach((s, i) => console.log("   " + (i + 1) + ". " + s.tag + " \"" + s.text + "\"" + (s.outline ? "" : "  [no outline]")));
  if (seq[0].tag !== "a" || !/skip|springen|sari/i.test(seq[0].text)) bad("first tab stop is not the skip link"); else ok("skip link is the first tab stop and " + (seq[0].visible ? "becomes visible" : "STAYS HIDDEN"));
  if (seq.some((s) => !s.outline)) bad("some tab stops have no focus outline"); else ok("every tab stop has a focus outline");
  // skip link works
  await page.goto(BASE + "/" + LANG + "/", { waitUntil: "load" });
  await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
  const afterSkip = await page.evaluate(() => document.activeElement.id);
  if (afterSkip === "main") ok("skip link moves focus to main"); else bad("skip link did not focus main (active: " + afterSkip + ")");
  // hero toggle hides markers
  await page.uncheck("#show-barriers");
  const hidden = await page.evaluate(() => getComputedStyle(document.querySelector(".marker")).visibility === "hidden");
  if (hidden) ok("hero toggle hides the barrier markers"); else bad("hero toggle did not hide markers");
  await page.close();
}

// 2. Mobile menu
{
  const page = await browser.newPage({ viewport: { width: 375, height: 740 } });
  await page.goto(BASE + "/" + LANG + "/", { waitUntil: "load" });
  const s0 = await page.evaluate(() => ({ navVisible: getComputedStyle(document.querySelector(".site-nav")).display !== "none", inert: document.querySelector(".site-nav").inert, exp: document.querySelector(".burger").getAttribute("aria-expanded") }));
  if (!s0.navVisible && s0.inert && s0.exp === "false") ok("nav collapsed, inert, aria-expanded=false"); else bad("initial mobile nav state " + JSON.stringify(s0));
  await page.click(".burger");
  const s1 = await page.evaluate(() => ({ navVisible: getComputedStyle(document.querySelector(".site-nav")).display !== "none", inert: document.querySelector(".site-nav").inert, exp: document.querySelector(".burger").getAttribute("aria-expanded"), label: document.querySelector(".burger").textContent.trim() }));
  if (s1.navVisible && !s1.inert && s1.exp === "true") ok("menu opens, label now \"" + s1.label + "\""); else bad("open state " + JSON.stringify(s1));
  await page.keyboard.press("Escape");
  const s2 = await page.evaluate(() => ({ exp: document.querySelector(".burger").getAttribute("aria-expanded"), focusOnBurger: document.activeElement.classList.contains("burger") }));
  if (s2.exp === "false" && s2.focusOnBurger) ok("Escape closes the menu and returns focus to the button"); else bad("escape state " + JSON.stringify(s2));
  await page.close();
}

// 3. Form validation (no network: the submit is intercepted)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route("https://formsubmit.co/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: "true" }) }));
  await page.goto(BASE + "/" + LANG + "/#contact", { waitUntil: "load" });
  await page.click("form[data-form] button[type=submit]");
  const v = await page.evaluate(() => ({
    invalid: [...document.querySelectorAll("form [aria-invalid=true]")].map((e) => e.id),
    errors: [...document.querySelectorAll("form .field.is-invalid .error")].map((e) => e.textContent.trim()).filter(Boolean).length,
    status: document.querySelector(".form__status").textContent.trim(), focused: document.activeElement.id,
  }));
  if (v.invalid.length >= 4 && v.errors === v.invalid.length && v.focused === "f-name" && v.status) ok("empty submit: " + v.invalid.length + " fields marked invalid with messages, focus on first, status announced"); else bad("empty submit state " + JSON.stringify(v));
  await page.fill("#f-email", "not-an-email");
  await page.locator("#f-email").blur();
  const em = await page.evaluate(() => document.querySelector("#f-email").getAttribute("aria-invalid"));
  if (em === "true") ok("invalid e-mail flagged on blur"); else bad("invalid e-mail not flagged");
  await page.fill("#f-name", "Test Person"); await page.fill("#f-email", "test@example.com"); await page.fill("#f-site", "https://example.com"); await page.fill("#f-msg", "This is a test message of sufficient length.");
  await page.click("form[data-form] button[type=submit]");
  await page.waitForTimeout(600);
  const done = await page.evaluate(() => ({ status: document.querySelector(".form__status").textContent.trim(), cls: document.querySelector(".form__status").className, focused: document.activeElement.className }));
  if (done.cls.includes("is-ok") && done.focused.includes("form__status")) ok("valid submit: success message \"" + done.status.slice(0, 40) + "…\", focus moved to it"); else bad("valid submit state " + JSON.stringify(done));
  await page.close();
}

await browser.close();
console.log(problems ? "\n" + problems + " behaviour problem(s)" : "\nBehaviour checks passed");
process.exit(problems ? 1 : 0);
