// Scales each 1440px-wide site preview down to fit its frame.
(function () {
  function top(el) { var y = 0; for (; el; el = el.offsetParent) y += el.offsetTop; return y; }
  function fit() {
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
  if (!ring || window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;   // no spinning on touch: it costs a repaint per scroll event
  function turn() { ring.setAttribute('transform', 'rotate(' + (-window.scrollY * 0.1) + ' 1197 624.5)'); }
  turn();
  window.addEventListener('scroll', turn, { passive: true });
})();
