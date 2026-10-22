// Holds each page behind a cover until everything on it has loaded, so nothing pops in or shifts.
// First page of a visit: the ring (the C of ZC) spins beside a 000% counter that follows the real loading.
// At 100 the ring slows to a stop with its gap facing right, exactly where the home page's C sits, and the cover lifts.
// Later pages in the same visit are mostly cached, so they get a plain cover with no ring.
// Skipped inside the transition previews (iframes) and right after a transition, when the page is already loaded.
(function () {
  var root = document.documentElement, me = document.currentScript;
  if (window.top !== window || root.classList.contains('no-enter')) return;
  var IFRAME_MS = 12000;   // the live preview is someone else's site: give it this long, then show the still image over it
  var MAX_MS = 30000;      // last-resort failsafe only, so a broken connection can't leave a blank page forever
  var COUNT_MS = 1400;     // fastest the counter may run 0 to 100, so it is readable even when everything is cached
  var V0 = 0.36;           // ring speed in deg/ms, constant until 100 and the speed the slow-down starts from
  var MIN_EXTRA = 90;      // least extra turn after 100 before the gap lands facing right
  var bg = (me && me.getAttribute('data-bg')) || '#fff';
  var reduce = false, full = true;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  try { full = !sessionStorage.getItem('zc-loaded'); } catch (e) {}

  var css = document.createElement('style');
  css.textContent =
    'html.loading{background:' + bg + '}' +
    'html.loading body{visibility:hidden}' +
    'html.loading *{animation-play-state:paused!important}' +
    '#zc-loader{position:fixed;inset:0;z-index:2147483647;background:' + bg + ';display:grid;place-items:center;' +
    'visibility:visible;transition:opacity .5s ease}' +
    '#zc-loader.out{opacity:0;pointer-events:none}' +
    '#zc-loader svg{width:min(46vw,92vh*920/560);height:auto;overflow:visible;display:block}' +
    '#zc-loader text{font-family:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;font-size:72px;' +
    'font-variant-numeric:tabular-nums;opacity:0;transition:opacity .3s ease}' +
    '#zc-loader.ready text{opacity:1}' +
    '#zc-loader p{position:fixed;left:0;right:0;top:50%;margin:0;text-align:center;opacity:0;' +
    'font:clamp(14px,1.15vw,24px)/1 "IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;letter-spacing:.02em;' +
    'animation:zc-load-in .3s ease .4s forwards}' +
    '@keyframes zc-load-in{to{opacity:1}}';
  document.head.appendChild(css);
  root.classList.add('loading');

  var cover = document.createElement('div');
  cover.id = 'zc-loader';
  cover.setAttribute('aria-hidden', 'true');
  if (full) {
    cover.innerHTML =
      '<svg viewBox="540 345 920 560"><defs><mask id="zc-gap" maskUnits="userSpaceOnUse" x="900" y="300" width="600" height="650">' +
      '<rect x="900" y="300" width="600" height="650" fill="#fff"/><rect x="1360" y="596.5" width="120" height="56" fill="#000"/></mask></defs>' +
      '<text id="zc-count" x="875" y="650" text-anchor="end" fill="#000">000%</text>' +
      '<g id="zc-ring"><circle cx="1197" cy="624.5" r="211" fill="none" stroke="#000" stroke-width="56" mask="url(#zc-gap)"/></g></svg>';
  } else {
    cover.innerHTML = '<p>(loading)</p>';
  }
  root.appendChild(cover);
  var ring = document.getElementById('zc-ring'), count = document.getElementById('zc-count');
  function setAngle(a) { if (ring) ring.setAttribute('transform', 'rotate(' + a + ' 1197 624.5)'); }
  function setCount(n) { if (count) count.textContent = String(n).padStart(3, '0') + '%'; }

  // ---- real progress: each thing the page needs is a job; progress is jobs done / jobs known ----
  var total = 0, doneJobs = 0, target = 0, forced = false;
  function job(promise) {
    total++;
    var once = false;
    function ok() { if (once) return; once = true; doneJobs++; target = doneJobs / total; }
    promise.then(ok, ok);
  }
  setTimeout(function () { forced = true; }, MAX_MS);

  var finished = false;
  function finish() {
    if (finished) return; finished = true;
    try { sessionStorage.setItem('zc-loaded', '1'); } catch (e) {}
    root.classList.remove('loading');
    cover.classList.add('out');
    // measuring scripts ran against the hidden page; tell them to measure again now it is showing
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    setTimeout(function () { cover.remove(); css.remove(); }, 600);
  }

  var angle = 0, shown = 0, last = null, loadsDone = false;
  var settleStart = null, settleFrom = 0, settleDist = 0, settleMs = 0;
  function settle(now) {
    if (settleStart === null) {
      settleStart = now; settleFrom = angle;
      settleDist = Math.ceil((angle + MIN_EXTRA) / 360) * 360 - angle;   // land on a multiple of 360: gap facing right, like the logo
      settleMs = 2 * settleDist / V0;                                   // quadratic ease-out starting at exactly V0
    }
    var t = Math.min(1, (now - settleStart) / settleMs);
    setAngle(settleFrom + settleDist * (1 - (1 - t) * (1 - t)));
    if (t < 1) requestAnimationFrame(settle); else { setAngle(0); finish(); }
  }
  function tick(now) {
    if (last === null) last = now;
    var dt = now - last; last = now;
    var goal = (forced || loadsDone) ? 1 : target * 0.99;   // never reads 100 until the page really is ready
    shown = Math.min(goal, shown + dt / COUNT_MS);
    setCount(Math.round(shown * 100));
    if (!reduce) { angle += dt * V0; setAngle(angle); }
    if (shown < 1) { requestAnimationFrame(tick); return; }
    setCount(100);
    if (reduce) { setAngle(0); finish(); } else requestAnimationFrame(settle);
  }

  function begin() {
    // fonts: all three weights up front rather than when first used
    if (document.fonts && document.fonts.load) {
      var first = true;
      ['400', '500', '700'].forEach(function (w) {
        var p = document.fonts.load(w + ' 16px "IBM Plex Mono"');
        job(p);
        if (first) { first = false; p.then(function () { cover.classList.add('ready'); }, function () { cover.classList.add('ready'); }); }
      });
    } else cover.classList.add('ready');
    // images: no lazy loading, and wait until each is decoded so it paints in one go
    document.querySelectorAll('img').forEach(function (img) {
      img.loading = 'eager';
      job(img.decode ? img.decode() : Promise.resolve());
    });
    // logos used as CSS backgrounds or only by the page transition
    var logos = [];
    document.querySelectorAll('[data-logo]').forEach(function (a) { logos.push(a.getAttribute('data-logo')); });
    document.querySelectorAll('[style*="--logo"]').forEach(function (el) {
      var m = /url\(([^)]+)\)/.exec(el.getAttribute('style')); if (m) logos.push(m[1].replace(/["']/g, ''));
    });
    logos.forEach(function (src) {
      job(new Promise(function (ok) { var i = new Image(); i.onload = i.onerror = ok; i.src = src; }));
    });
    // the page itself, including the live preview frame (given IFRAME_MS, then the still image shows over it)
    var frames = document.querySelectorAll('iframe');
    frames.forEach(function (f) { f.loading = 'eager'; });
    job(new Promise(function (ok) {
      if (document.readyState === 'complete') ok(); else window.addEventListener('load', ok);
      if (frames.length) setTimeout(ok, IFRAME_MS);
    }));
    // ready once every job is done, then two frames so the first paint is laid out with the final fonts and sizes
    var wait = setInterval(function () {
      if (doneJobs < total) return;
      clearInterval(wait);
      requestAnimationFrame(function () { requestAnimationFrame(function () { loadsDone = true; }); });
    }, 30);
  }

  requestAnimationFrame(tick);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else begin();
})();
