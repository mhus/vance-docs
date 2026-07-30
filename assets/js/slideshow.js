// Minimal, dependency-free slideshow for the how-to walkthroughs.
// Any <div class="vslides"> with .vslide figures becomes a step-through
// (prev/next + counter + arrow keys). Always open — no collapse.
//
// Click a slide image to open a full-screen lightbox showing the WHOLE
// slideshow enlarged and navigable (prev/next, arrow keys, Esc / backdrop /
// ✕ to close), starting at the clicked slide.
(function () {
  // ── Shared lightbox (built once, reused by every slideshow) ──────────────
  var lb, lbImg, lbCap, lbCount, lbPrev, lbNext, lbData = [], lbIdx = 0, lastFocus = null;

  function ensureLB() {
    if (lb) return;
    lb = document.createElement('div');
    lb.className = 'vlightbox';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Slideshow');
    lb.innerHTML =
      '<div class="vlb-backdrop" data-close></div>' +
      '<button class="vlb-close" type="button" data-close aria-label="Close (Esc)">✕</button>' +
      '<button class="vlb-nav vlb-prev" type="button" data-lbprev aria-label="Previous slide">‹</button>' +
      '<figure class="vlb-figure"><img class="vlb-img" alt=""><figcaption class="vlb-cap"></figcaption></figure>' +
      '<button class="vlb-nav vlb-next" type="button" data-lbnext aria-label="Next slide">›</button>' +
      '<div class="vlb-count"></div>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector('.vlb-img');
    lbCap = lb.querySelector('.vlb-cap');
    lbCount = lb.querySelector('.vlb-count');
    Array.prototype.forEach.call(lb.querySelectorAll('[data-close]'), function (el) {
      el.addEventListener('click', closeLB);
    });
    lbPrev = lb.querySelector('[data-lbprev]');
    lbNext = lb.querySelector('[data-lbnext]');
    lbPrev.addEventListener('click', function () { stepLB(-1); });
    lbNext.addEventListener('click', function () { stepLB(1); });
    // Click the enlarged image itself → advance to the next slide.
    lbImg.addEventListener('click', function () { stepLB(1); });
  }

  function renderLB() {
    var d = lbData[lbIdx];
    if (!d) return;
    lbImg.src = d.src;
    lbImg.alt = d.alt;
    lbCap.innerHTML = d.cap;
    lbCap.hidden = !d.cap;
    lbCount.textContent = (lbIdx + 1) + ' / ' + lbData.length;
    // Single-image lightbox: no prev/next/counter, no advance-on-click.
    var multi = lbData.length > 1;
    lbPrev.style.display = multi ? '' : 'none';
    lbNext.style.display = multi ? '' : 'none';
    lbCount.style.display = multi ? '' : 'none';
    lbImg.style.cursor = multi ? 'pointer' : 'default';
  }
  function stepLB(delta) {
    if (!lbData.length) return;
    lbIdx = (lbIdx + delta + lbData.length) % lbData.length;
    renderLB();
  }
  function openLB(data, idx) {
    ensureLB();
    lbData = data;
    lbIdx = idx;
    renderLB();
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    lb.querySelector('.vlb-next').focus();
  }
  function closeLB() {
    if (!lb || lb.hidden) return;
    lb.hidden = true;
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeLB(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLB(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepLB(1); }
  }

  // ── Per-slideshow init ───────────────────────────────────────────────────
  function init(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll('.vslide'));
    if (!slides.length) return;
    var count = root.querySelector('.vslides-count');
    var i = 0;
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.hidden = k !== i; });
      if (count) count.textContent = (i + 1) + ' / ' + slides.length;
    }
    root.querySelectorAll('[data-prev]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); show(i - 1); });
    });
    root.querySelectorAll('[data-next]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); show(i + 1); });
    });
    var stage = root.querySelector('.vslides-stage');
    if (stage) {
      stage.tabIndex = 0;
      stage.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
      });
    }

    // Lightbox: snapshot this slideshow's slides, wire each image to open big.
    var data = slides.map(function (fig) {
      var img = fig.querySelector('img');
      var cap = fig.querySelector('figcaption');
      return {
        src: img ? (img.currentSrc || img.src) : '',
        alt: img ? img.alt : '',
        cap: cap ? cap.innerHTML : ''
      };
    });
    slides.forEach(function (fig, k) {
      var img = fig.querySelector('img');
      if (!img) return;
      img.classList.add('vslide-zoom');
      img.addEventListener('click', function () { openLB(data, k); });
    });

    show(0);
  }

  function initAll() {
    document.querySelectorAll('.vslides').forEach(init);
    // Standalone framed shots (`{: .doc-shot }`) open as a single-image lightbox.
    document.querySelectorAll('img.doc-shot').forEach(function (img) {
      img.classList.add('vslide-zoom');
      img.addEventListener('click', function () {
        openLB([{ src: img.currentSrc || img.src, alt: img.alt, cap: img.alt || '' }], 0);
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
