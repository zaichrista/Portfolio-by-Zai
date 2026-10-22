// Holds the page behind a plain cover until everything has loaded (fonts, images, the live preview), then lifts it,
// so nothing pops in or shifts while people are looking. Skipped inside the transition previews (iframes) and right
// after a transition, when the page has already been loaded.
(function () {
  var root = document.documentElement, me = document.currentScript;
  if (window.top !== window || root.classList.contains('no-enter')) return;
  var IFRAME_MS = 12000;   // the live preview is someone else's site: give it this long, then show the still image over it
  var MAX_MS = 30000;      // last-resort failsafe only, so a broken connection can't leave a blank page forever
  var bg = (me && me.getAttribute('data-bg')) || '#fff';
  var css = document.createElement('style');
  css.textContent =
    'html.loading{background:' + bg + '}' +
    'html.loading body{visibility:hidden}' +
    'html.loading *{animation-play-state:paused!important}' +
    'html.loading::after{content:"(loading)";position:fixed;left:0;right:0;top:50%;text-align:center;' +
    'font:clamp(14px,1.15vw,24px)/1 "IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;letter-spacing:.02em;' +
    'color:#000;opacity:0;animation:zc-load-in .3s ease .4s forwards;animation-play-state:running!important}' +
    '@keyframes zc-load-in{to{opacity:1}}';
  document.head.appendChild(css);
  root.classList.add('loading');

  var done = false;
  function finish() {
    if (done) return; done = true;
    root.classList.remove('loading');
    css.remove();
    // measuring scripts ran against the hidden page; tell them to measure again now it is showing
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }
  setTimeout(finish, MAX_MS);

  function whenLoaded() {
    var jobs = [];
    // fonts: ask for all three weights up front rather than when first used
    if (document.fonts && document.fonts.load) {
      ['400', '500', '700'].forEach(function (w) { jobs.push(document.fonts.load(w + ' 16px "IBM Plex Mono"').catch(function () {})); });
      jobs.push(document.fonts.ready);
    }
    // images: no lazy loading, and wait until each is decoded so it paints in one go
    document.querySelectorAll('img').forEach(function (img) {
      img.loading = 'eager';
      jobs.push(img.decode ? img.decode().catch(function () {}) : Promise.resolve());
    });
    // logos used as CSS backgrounds or only by the page transition
    var logos = [];
    document.querySelectorAll('[data-logo]').forEach(function (a) { logos.push(a.getAttribute('data-logo')); });
    document.querySelectorAll('[style*="--logo"]').forEach(function (el) {
      var m = /url\(([^)]+)\)/.exec(el.getAttribute('style')); if (m) logos.push(m[1].replace(/["']/g, ''));
    });
    logos.forEach(function (src) {
      jobs.push(new Promise(function (ok) { var i = new Image(); i.onload = i.onerror = ok; i.src = src; }));
    });
    // everything else on the page, including the live preview frame
    var frames = document.querySelectorAll('iframe');
    jobs.push(new Promise(function (ok) {
      if (document.readyState === 'complete') ok(); else window.addEventListener('load', ok);
      if (frames.length) setTimeout(ok, IFRAME_MS);
    }));
    frames.forEach(function (f) { f.loading = 'eager'; });
    Promise.all(jobs).then(function () {
      // two frames, so the first paint is already laid out with the final fonts and sizes
      requestAnimationFrame(function () { requestAnimationFrame(finish); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', whenLoaded); else whenLoaded();
})();
