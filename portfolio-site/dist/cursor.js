// On pointer devices, hovering a project row in the main page's work list turns the cursor into that project's
// logo. Elements opt in with data-logo="path/to/logo.png".
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var style = document.createElement('style');
  style.textContent =
    '[data-logo], [data-logo] *, html.zc-pressed, html.zc-pressed * { cursor: none !important; }' +
    'html.zc-released, html.zc-released * { cursor: auto !important; } html.zc-released a, html.zc-released a * { cursor: pointer !important; }' +
    '.zc-cursor { position: fixed; left: 0; top: 0; width: 300px; height: 210px; margin: -105px 0 0 -150px; pointer-events: none; z-index: 10000;' +
    ' background: center / contain no-repeat; opacity: 0; }' +
    // it grows in when it appears, but vanishes instantly (no fade or shrink) when you leave
    '.zc-cursor.on { opacity: 1; animation: zc-pop .25s cubic-bezier(.2, .7, .2, 1); }' +
    '@keyframes zc-pop { from { scale: .6; } }';
  document.head.appendChild(style);

  var el = document.createElement('div');
  el.className = 'zc-cursor';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  var current = null, pressed = false;
  function show(t) { current = t; el.style.backgroundImage = 'url("' + t.getAttribute('data-logo') + '")'; el.classList.add('on'); }
  function hide() { current = null; el.classList.remove('on'); }

  document.addEventListener('mousemove', function (e) {
    // the translate property (not transform), so the grow-in scales the logo around itself and never shifts it
    el.style.translate = e.clientX + 'px ' + e.clientY + 'px';
    var t = e.target.closest && e.target.closest('[data-logo]');
    if (pressed) return;
    if (t) { if (t !== current) show(t); } else if (current) hide();
  }, { passive: true });
  // Once a project is pressed the cursor disappears, then comes back a little before the transition ends (the logo
// doesn't return; the new page starts clean).
  document.addEventListener('mousedown', function (e) {
    if (e.button || !(e.target.closest && e.target.closest('[data-logo]'))) return;
    pressed = true; hide(); document.documentElement.classList.add('zc-pressed');
    setTimeout(function () { document.documentElement.classList.remove('zc-pressed'); document.documentElement.classList.add('zc-released'); }, 600);
  }, true);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { pressed = false; document.documentElement.classList.remove('zc-pressed', 'zc-released'); }
  });
  document.documentElement.addEventListener('mouseleave', hide);
  window.addEventListener('blur', hide);
})();
