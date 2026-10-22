// Scales each 1440px-wide site preview down to fit its frame.
(function () {
  function top(el) { var y = 0; for (; el; el = el.offsetParent) y += el.offsetTop; return y; }
  // Put the preview window in the middle of the window's height (at the top of the page).
  function centre() {
    document.querySelectorAll('.browser').forEach(function (b) {
      b.style.marginTop = '0';
      b.style.marginTop = Math.max(0, (window.innerHeight - b.offsetHeight) / 2 - top(b)) + 'px';
    });
  }
  function fit() {
    centre();
    document.querySelectorAll('.viewport').forEach(function (v) {
      var f = v.querySelector('iframe');
      if (f) f.style.transform = 'scale(' + (v.clientWidth / 1440) + ')';
    });
  }
  fit();
  window.zcFit = fit;
  window.addEventListener('resize', fit);
})();

// The ZC mark in the corner turns with the scroll, as on the home page.
(function () {
  var ring = document.getElementById('ring2');
  if (!ring) return;
  function turn() { ring.setAttribute('transform', 'rotate(' + (-window.scrollY * 0.1) + ' 1197 624.5)'); }
  turn();
  window.addEventListener('scroll', turn, { passive: true });
})();
