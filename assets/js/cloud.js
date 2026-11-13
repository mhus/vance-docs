/* Links to Vancetope Cloud (www.vancetope.eu) and the cloud bar.

   Every link to vancetope.eu on this site is rewritten in one place:
   - to the language the reader picked here (German → /de/, the cloud site has no other languages),
   - with UTM parameters, so the cloud site's statistics show which spot on this site brought the visit
     (utm_content = the nearest data-cloud-at, else "link"),
   - with an Umami event "cloud-link" carrying the same spot.
   Links written into translated texts are covered too: the language menu replaces innerHTML, and a
   MutationObserver decorates the new links.

   The cloud bar sits at the top of every page. Landing pages render it (include sc-cloudbar.html, so it
   is translated); the documentation pages get it from here, in English. Closing it is remembered per
   browser; an inline script in the head hides it before the first paint (class cloud-bar-off). */
(function () {
  var KEY = "vancetope-cloud-bar";
  var ORIGIN = "https://www.vancetope.eu";
  var root = document.documentElement;

  function isCloud(a) {
    try {
      var h = new URL(a.href).hostname;
      return h === "vancetope.eu" || h === "www.vancetope.eu";
    } catch (e) {
      return false;
    }
  }

  function decorate() {
    var de = (root.getAttribute("lang") || "en").toLowerCase().indexOf("de") === 0;
    document.querySelectorAll('a[href*="vancetope.eu"]').forEach(function (a) {
      if (!isCloud(a)) return;
      var u = new URL(a.href);
      var path = u.pathname.replace(/^\/de(\/|$)/, "/");
      if (de) path = "/de" + path;
      var spot = a.closest("[data-cloud-at]");
      var at = (spot && spot.getAttribute("data-cloud-at")) || "link";
      var next = ORIGIN + path + "?utm_source=vancetope.com&utm_medium=referral&utm_campaign=community&utm_content=" +
        encodeURIComponent(at) + u.hash;
      if (a.href !== next) a.href = next;
      a.setAttribute("data-umami-event", "cloud-link");
      a.setAttribute("data-umami-event-at", at);
    });
  }

  function closed() {
    try { return localStorage.getItem(KEY) === "closed"; } catch (e) { return false; }
  }

  function wireBar(bar) {
    var btn = bar.querySelector(".cloud-bar-close");
    if (!btn) return;
    btn.addEventListener("click", function () {
      try { localStorage.setItem(KEY, "closed"); } catch (e) {}
      root.classList.add("cloud-bar-off");
      bar.remove();
    });
  }

  var bar = document.getElementById("cloud-bar");
  if (!bar && !closed() && document.body.getAttribute("data-cloud-bar") !== "off") {
    bar = document.createElement("div");
    bar.id = "cloud-bar";
    bar.setAttribute("data-cloud-at", "bar");
    bar.innerHTML =
      '<p><b>Vancetope Cloud</b> — early access is open: your AI workplace, hosted in the EU, every model included. ' +
      '<a href="https://www.vancetope.eu/">Have a look&nbsp;→</a></p>' +
      '<button class="cloud-bar-close" type="button" aria-label="Hide">×</button>';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (bar) wireBar(bar);

  decorate();
  new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(decorate).observe(root, { attributes: true, attributeFilter: ["lang"] });
})();
