// Minimal, dependency-free slideshow for the how-to walkthroughs.
// Any <div class="vslides"> with .vslide figures becomes a step-through
// (prev/next + counter + arrow keys). Always open — no collapse.
(function () {
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
    show(0);
  }
  function initAll() {
    document.querySelectorAll('.vslides').forEach(init);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
