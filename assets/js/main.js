/* Daniel Butnar — site scripts. No dependencies, no tracking, no inline handlers (CSP). */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     EDIT THESE
     ------------------------------------------------------------------ */
  const CONFIG = {
    email: "daniel.butnar@gmail.com",
    // Contact forms are delivered by FormSubmit (formsubmit.co), no account needed.
    // The first submission triggers a one-time activation e-mail to the address above.
    formEndpoint: "https://formsubmit.co/ajax/daniel.butnar@gmail.com",
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;

  /* ---------- Mobile menu ----------
     The nav is always visible without JS. With JS, on narrow screens it collapses
     behind a button; the collapsed nav is inert so keyboard focus cannot reach it. */
  const burger = document.querySelector(".burger");
  const nav = document.querySelector(".site-nav");
  const narrow = window.matchMedia("(max-width: 800px)");
  const setMenu = (open) => {
    body.classList.toggle("menu-open", open);
    if (burger) {
      burger.setAttribute("aria-expanded", String(open));
      const lbl = burger.querySelector(".burger__label");
      if (lbl) lbl.textContent = open ? burger.dataset.close : burger.dataset.open;
    }
    if (nav) nav.inert = narrow.matches && !open;
  };
  if (burger && nav) {
    setMenu(false);
    burger.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
    narrow.addEventListener("change", () => setMenu(false));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && body.classList.contains("menu-open")) { setMenu(false); burger.focus(); }
    });
  }

  /* ---------- Year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Contact form ----------
     Progressive enhancement over a plain POST to FormSubmit. Validation messages are
     shown next to the field, aria-invalid is kept in sync, and the outcome is announced
     through a polite live region. All user-facing strings come from data-* attributes
     so the same script serves the EN, DE and RO pages. */
  document.querySelectorAll("form[data-form]").forEach((form) => {
    const status = form.querySelector(".form__status");
    const submit = form.querySelector('button[type="submit"]');
    const msg = (key) => form.dataset[key] || "";

    const fieldOf = (input) => input.closest(".field");
    const setError = (input, text) => {
      const field = fieldOf(input);
      const err = field && field.querySelector(".error");
      field && field.classList.toggle("is-invalid", !!text);
      if (err) err.textContent = text || "";
      if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    };
    const validate = (input) => {
      if (input.validity.valid) { setError(input, ""); return true; }
      const field = fieldOf(input);
      const custom = field && field.dataset.error;
      setError(input, custom || input.validationMessage);
      return false;
    };
    const inputs = form.querySelectorAll("input:not([type=hidden]):not([name=_honey]), textarea, select");
    inputs.forEach((input) => {
      input.addEventListener("blur", () => { if (input.value !== "" || input.getAttribute("aria-invalid")) validate(input); });
      input.addEventListener("input", () => { if (input.getAttribute("aria-invalid")) validate(input); });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (status) { status.className = "form__status"; status.textContent = ""; }

      let firstInvalid = null;
      inputs.forEach((input) => { if (!validate(input) && !firstInvalid) firstInvalid = input; });
      if (firstInvalid) {
        firstInvalid.focus();
        if (status) { status.textContent = msg("msgInvalid"); status.classList.add("is-err"); }
        return;
      }

      const fd = new FormData(form);
      if (fd.get("_honey")) return; // bot

      const data = {};
      for (const [key, value] of fd.entries()) {
        if (key === "_honey") continue;
        const v = String(value).trim();
        if (v) data[key] = v;
      }
      data._subject = form.dataset.subject || "New message";
      data._template = "table";
      data._captcha = "false";
      if (data.Email) data._replyto = data.Email;

      const originalLabel = submit ? submit.textContent : "";
      if (submit) { submit.disabled = true; submit.textContent = msg("msgSending"); }
      try {
        const res = await fetch(CONFIG.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || String(json.success) !== "true") throw new Error(json.message || ("HTTP " + res.status));
        form.reset();
        if (status) { status.textContent = msg("msgOk"); status.classList.add("is-ok"); status.setAttribute("tabindex", "-1"); status.focus(); }
      } catch (err) {
        if (status) { status.textContent = msg("msgErr") + " " + CONFIG.email; status.classList.add("is-err"); }
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = originalLabel; }
      }
    });
  });

  /* ---------- Demo page: let people hear what a screen reader gets ---------- */
  document.querySelectorAll("[data-announce]").forEach((btn) => {
    const out = document.getElementById(btn.getAttribute("aria-controls"));
    if (!out) return;
    btn.addEventListener("click", () => {
      out.textContent = "";
      window.setTimeout(() => { out.textContent = btn.dataset.announce; }, reduceMotion ? 0 : 60);
    });
  });
})();
