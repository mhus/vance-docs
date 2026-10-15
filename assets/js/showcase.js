/* Shared behaviour of the showcase pages (landing, apps, agents, connect, trust):
   theme toggle and the EN/DE switch. Each page carries its own German strings
   in <script type="application/json" id="i18n-de">; the shared chrome
   (nav, footer) is translated from COMMON_DE below. English is the markup. */
(function () {
  var root = document.documentElement;

  /* ---- theme toggle — persists choice; default look is light ---- */
  var tStored = null;
  try { tStored = localStorage.getItem("vance-theme"); } catch (e) {}
  if (tStored === "dark" || tStored === "light") root.setAttribute("data-theme", tStored);
  var themeToggle = document.getElementById("theme-toggle");
  var themeIcon = document.getElementById("theme-icon");
  var SUN = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
  var MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  function isDark() { return (root.getAttribute("data-theme") || "light") === "dark"; }
  function paintTheme() { if (themeIcon) themeIcon.innerHTML = isDark() ? SUN : MOON; }
  paintTheme();
  if (themeToggle) themeToggle.addEventListener("click", function () {
    root.setAttribute("data-theme", isDark() ? "light" : "dark");
    try { localStorage.setItem("vance-theme", isDark() ? "dark" : "light"); } catch (e) {}
    paintTheme();
  });

  /* ---- language toggle (DE/EN) — default EN, persisted ---- */
  var COMMON_DE = {
    "nav.apps": "Apps",
    "nav.agents": "Agenten",
    "nav.connect": "Anbinden",
    "nav.trust": "Vertrauen",
    "nav.docs": "Doku",
    "nav.cta": "Loslegen",
    "foot.product": "Produkt",
    "foot.apps": "Apps &amp; Dokumente",
    "foot.agents": "Agenten &amp; Engines",
    "foot.connect": "Clients &amp; Integrationen",
    "foot.trust": "Sicherheit &amp; Self-Hosting",
    "foot.vision": "Was Vancetope ist",
    "foot.learn": "Lernen",
    "foot.start": "Loslegen",
    "foot.tours": "Feature-Touren",
    "foot.stories": "Use-Case-Geschichten",
    "foot.concepts": "Konzepte",
    "foot.architecture": "Architektur",
    "foot.resources": "Ressourcen",
    "foot.community": "Community",
    "footer.copy": "© 2025–2026 Mike Hummel · Doku unter CC BY 4.0"
  };
  var DE = {};
  var k;
  for (k in COMMON_DE) DE[k] = COMMON_DE[k];
  var pageDe = document.getElementById("i18n-de");
  if (pageDe) {
    try {
      var parsed = JSON.parse(pageDe.textContent);
      for (k in parsed) DE[k] = parsed[k];
    } catch (e) { /* a broken page dictionary leaves the page English */ }
  }

  var nodes = document.querySelectorAll("[data-i18n]");
  nodes.forEach(function (el) { el.dataset.en = el.innerHTML; });

  function applyLang(lang) {
    nodes.forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (lang === "de" && DE[key] != null) el.innerHTML = DE[key];
      else el.innerHTML = el.dataset.en;
    });
    root.setAttribute("lang", lang);
    var label = document.getElementById("lang-label");
    if (label) label.textContent = lang === "de" ? "EN" : "DE";
  }

  var lStored = "en";
  try { lStored = localStorage.getItem("vance-lang") || "en"; } catch (e) {}
  if (lStored === "de") applyLang("de");
  else { var l0 = document.getElementById("lang-label"); if (l0) l0.textContent = "DE"; }

  var langToggle = document.getElementById("lang-toggle");
  if (langToggle) langToggle.addEventListener("click", function () {
    var next = (root.getAttribute("lang") === "de") ? "en" : "de";
    applyLang(next);
    try { localStorage.setItem("vance-lang", next); } catch (e) {}
  });
})();
