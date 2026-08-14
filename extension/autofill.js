/* ── Sari Vault Auto-Login ─────────────────────────────────────────────
   When a password field is present and the user has an unlocked vault entry
   for this site, show a "🔓 Sari" button that fills the login form on click.
   Never auto-submits — the user still presses the site's own login button. */
(() => {
  let autofillBtn = null;

  function dispatch(el) {
    ["input", "change", "blur"].forEach((ev) => {
      try { el.dispatchEvent(new Event(ev, { bubbles: true })); } catch {}
    });
  }

  function showAutofill() {
    if (autofillBtn || document.querySelector("[data-sari-autofill]")) return;
    const pwd = document.querySelector('input[type="password"]');
    if (!pwd || !pwd.offsetParent) return;

    chrome.runtime
      .sendMessage({ type: "GET_AUTOFILL", url: location.href })
      .then((resp) => {
        if (!resp || !resp.ok || !resp.password) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.sariAutofill = "1";
        btn.textContent = "🔓 Sari";
        btn.title = "Sari Auto-Login";
        btn.style.cssText =
          "position:fixed;z-index:2147483647;padding:6px 10px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font:600 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);";
        const rect = pwd.getBoundingClientRect();
        btn.style.top = Math.max(4, rect.top + window.scrollY - 4) + "px";
        btn.style.left = (rect.right + 8) + "px";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const username = resp.username || "";
          const candidates = Array.from(document.querySelectorAll("input")).filter((i) => {
            const t = (i.type || "").toLowerCase();
            const n = ((i.name || "") + " " + (i.id || "") + " " + (i.getAttribute("autocomplete") || "")).toLowerCase();
            return (t === "text" || t === "email" || t === "tel") && /(user|login|email|phone|account|id)/.test(n);
          });
          const user = candidates[0] || document.querySelector('input[type="text"], input[type="email"]');
          if (user) { user.value = username; dispatch(user); }
          pwd.value = resp.password;
          dispatch(pwd);
          btn.remove();
          autofillBtn = null;
        });
        document.body.appendChild(btn);
        autofillBtn = btn;
      })
      .catch(() => {});
  }

  window.addEventListener("load", () => setTimeout(showAutofill, 700));
  document.addEventListener("focusin", (e) => {
    if (e.target && e.target.type === "password") setTimeout(showAutofill, 250);
  });
  document.addEventListener("scroll", () => {
    if (autofillBtn) { autofillBtn.remove(); autofillBtn = null; }
  }, { passive: true });
})();