// Page transitions.
//  - Main page -> project: the C grows from the click point and opens onto the project.
//  - Project -> main page (all work, home, the menu): the reverse. The C spins clockwise and zooms back out,
//    uncovering the main page.
//  - Project -> project (links marked data-slide): the page slides sideways, passing through any projects in
//    between, while the project strip stays where it is.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // The full circle transitions load a live copy of the next page in an iframe, which is heavy on a phone. Phones get
  // irisLite instead (the ring and a cream disc, nothing else), and plain navigation when leaving a project.
  var LIGHT = window.matchMedia('(max-width: 860px), (hover: none) and (pointer: coarse)').matches;
  var R_OUT = 239, R_IN = 183, busy = false;
  var RING_SVG = '<svg viewBox="958 385.5 478 478" width="100%" height="100%" aria-hidden="true">' +
    '<defs><mask id="iris-gap" maskUnits="userSpaceOnUse" x="900" y="300" width="600" height="650"><rect x="900" y="300" width="600" height="650" fill="#fff"/><rect x="1360" y="596.5" width="120" height="56" fill="#000"/></mask></defs>' +
    '<circle cx="1197" cy="624.5" r="211" fill="none" stroke="#000" stroke-width="56" mask="url(#iris-gap)"/></svg>';

  // The ring opens onto a live copy of the next page (in an iframe), so its content is already rising into place
  // while the C is still growing. When both are done we go to the real page, which skips its own entrance.
  function iris(a, e) {
    var x, y;
    if (e.clientX || e.clientY) { x = e.clientX; y = e.clientY; }
    else { var r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    var w = window.innerWidth, h = window.innerHeight;
    var far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y));
    var S = 1.15 * far / R_IN, dir = a.getAttribute('data-dir') === 'prev' ? 1 : -1, DUR = 950;
    var loadedAt = null, animDone = false, leaving = false;
    busy = true;   // ignore further clicks while this plays

    // Usually the page was already loaded in the background when the pointer reached the link (see warm), so the
    // animation doesn't have to share the main thread with parsing and laying out the next page.
    var page = warmed && warmed.href === a.href ? warmed.frame : null; warmed = null;
    var fresh = !page;
    if (fresh) {
      page = document.createElement('iframe');
      page.className = 'zc-iris-page';
      page.setAttribute('aria-hidden', 'true'); page.tabIndex = -1;
      page.src = a.href;
      document.body.appendChild(page);
    }
    page.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9998;pointer-events:none;clip-path:circle(' + R_IN * .02 + 'px at ' + x + 'px ' + y + 'px)';
    // the entrance of a page that loaded in the background has already played unseen: play it again as the ring opens
    if (!fresh) { try { page.contentDocument.getAnimations().forEach(function (an) { an.currentTime = 0; an.play(); }); } catch (er) {} }
    whenReady(page, function () { loadedAt = performance.now(); finish(); });

    var ring = document.createElement('div');
    ring.className = 'zc-iris';
    ring.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;width:' + 2 * R_OUT + 'px;height:' + 2 * R_OUT + 'px;left:' + (x - R_OUT) + 'px;top:' + (y - R_OUT) + 'px;will-change:transform';
    ring.innerHTML = RING_SVG;
    document.body.appendChild(ring);

    ring.animate([{ transform: 'scale(.02) rotate(0deg)' }, { transform: 'scale(' + S + ') rotate(' + dir * 260 + 'deg)' }], { duration: DUR, easing: ease, fill: 'forwards' });
    page.animate([{ clipPath: 'circle(' + R_IN * .02 + 'px at ' + x + 'px ' + y + 'px)' }, { clipPath: 'circle(' + R_IN * S + 'px at ' + x + 'px ' + y + 'px)' }], { duration: DUR, easing: ease, fill: 'forwards' })
      .finished.then(function () { animDone = true; finish(); });

    // go once the ring has finished and the preview page has had time to settle (or after a short wait if it never loads)
    setTimeout(function () { loadedAt = loadedAt || performance.now(); finish(); }, 2500);
    function finish() {
      if (!animDone || loadedAt === null || leaving) return;
      var wait = Math.max(0, loadedAt + 650 - performance.now());
      leaving = true;
      setTimeout(function () { try { sessionStorage.setItem('zc-iris', '1'); } catch (er) {} window.location.href = a.href; }, wait);
    }
  }

  var ease = 'cubic-bezier(.65, 0, .35, 1)';

  // Call back once the page in the iframe has parsed (its own HTML and scripts), without waiting for the full load
  // event, which also waits for the live site embedded in each project page.
  function whenReady(frame, cb) {
    var done = false;
    function go() { if (done) return; done = true; cb(); }
    frame.addEventListener('load', go);
    (function poll() {
      if (done) return;
      try {
        var d = frame.contentDocument;
        if (d && frame.contentWindow.location.href !== 'about:blank' && d.readyState !== 'loading' && d.body) { go(); return; }
      } catch (er) { return; }   // cross-origin: rely on the load event
      requestAnimationFrame(poll);   // not attached or still loading: check again next frame
    })();
  }

  // Load the next page in its iframe as soon as the pointer is over a link (or a finger touches it), so by the time of
  // the click it is ready and nothing heavy happens while the ring is growing. Only one at a time.
  var warmed = null;
  function warm(e) {
    if (LIGHT || busy) return;
    var a = e.target.closest && e.target.closest('a[data-iris]');
    if (!a || (warmed && warmed.href === a.href)) return;
    if (warmed) warmed.frame.remove();
    var f = document.createElement('iframe');
    f.className = 'zc-iris-page';
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9998;pointer-events:none;clip-path:circle(0px at 0 0);visibility:hidden';
    f.src = a.href;
    document.body.appendChild(f);
    warmed = { href: a.href, frame: f };
  }
  document.addEventListener('pointerover', warm, { passive: true });

  // Warm the cache for the pages a visitor is likely to open next.
  function prefetch() {
    var seen = {};
    [].slice.call(document.querySelectorAll('a[data-iris], a.tile')).forEach(function (a) {
      if (seen[a.href]) return; seen[a.href] = 1;
      var l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
    });
  }
  if ('requestIdleCallback' in window) requestIdleCallback(prefetch); else setTimeout(prefetch, 1500);

  // ---- phones, main page -> project: the ring grows from the tap with a disc in the project page's colour inside it.
  // Only transforms move, and nothing from the next page is loaded until the ring has covered the screen. ----
  var PAGE_BG = '#f4eedd';   // keep in step with --page in project.css
  function irisLite(a, e) {
    var x, y;
    if (e.clientX || e.clientY) { x = e.clientX; y = e.clientY; }
    else { var r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    var w = window.innerWidth, h = window.innerHeight;
    var far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y));
    var S = 1.15 * far / R_IN, DUR = 800;
    busy = true;
    var disc = document.createElement('div');
    disc.className = 'zc-iris-page';
    disc.style.cssText = 'position:fixed;z-index:9998;pointer-events:none;border-radius:50%;background:' + PAGE_BG + ';will-change:transform;width:' + 2 * R_IN + 'px;height:' + 2 * R_IN + 'px;left:' + (x - R_IN) + 'px;top:' + (y - R_IN) + 'px';
    var ring = document.createElement('div');
    ring.className = 'zc-iris';
    ring.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;will-change:transform;width:' + 2 * R_OUT + 'px;height:' + 2 * R_OUT + 'px;left:' + (x - R_OUT) + 'px;top:' + (y - R_OUT) + 'px';
    ring.innerHTML = RING_SVG;
    document.body.appendChild(disc); document.body.appendChild(ring);
    disc.animate([{ transform: 'scale(.02)' }, { transform: 'scale(' + S + ')' }], { duration: DUR, easing: ease, fill: 'forwards' });
    ring.animate([{ transform: 'scale(.02) rotate(0deg)' }, { transform: 'scale(' + S + ') rotate(' + (a.getAttribute('data-dir') === 'prev' ? 1 : -1) * 260 + 'deg)' }], { duration: DUR, easing: ease, fill: 'forwards' })
      .finished.then(function () { window.location.href = a.href; });
  }

  // ---- project -> main page: the zoom in reverse. The project stays inside the shrinking C; the main page
  // (in an iframe on top) shows through everywhere outside it. ----
  function zoomOut(a, e) {
    if (!(window.CSS && CSS.registerProperty)) { iris(a, e); return; }
    try { CSS.registerProperty({ name: '--zc-r', syntax: '<length>', inherits: false, initialValue: '0px' }); } catch (er) {}
    var x, y;
    if (e.clientX || e.clientY) { x = e.clientX; y = e.clientY; }
    else { var r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    var w = window.innerWidth, h = window.innerHeight;
    var far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y));
    var S = 1.15 * far / R_IN, DUR = 950, started = false;
    busy = true;

    var hole = 'radial-gradient(circle at ' + x + 'px ' + y + 'px, transparent var(--zc-r), #000 calc(var(--zc-r) + 1px))';
    var page = document.createElement('iframe');
    page.className = 'zc-iris-page';
    page.setAttribute('aria-hidden', 'true'); page.tabIndex = -1;
    page.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9998;pointer-events:none;--zc-r:' + R_IN * S + 'px;-webkit-mask-image:' + hole + ';mask-image:' + hole;
    document.body.appendChild(page);

    var ring = document.createElement('div');
    ring.className = 'zc-iris';
    ring.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;width:' + 2 * R_OUT + 'px;height:' + 2 * R_OUT + 'px;left:' + (x - R_OUT) + 'px;top:' + (y - R_OUT) + 'px;will-change:transform;transform:scale(' + S + ')';
    ring.innerHTML = RING_SVG;
    document.body.appendChild(ring);

    function start() {
      if (started) return; started = true;
      var opts = { duration: DUR, easing: ease, fill: 'forwards' };
      ring.animate([{ transform: 'scale(' + S + ') rotate(0deg)' }, { transform: 'scale(.02) rotate(260deg)' }], opts);   // clockwise
      page.animate([{ '--zc-r': R_IN * S + 'px' }, { '--zc-r': R_IN * .02 + 'px' }], opts).finished.then(function () {
        try { sessionStorage.setItem('zc-iris', '1'); } catch (er) {}
        window.location.href = a.href;
      });
    }
    whenReady(page, function () { setTimeout(start, 150); });   // let the main page draw first
    setTimeout(start, 1500);
    page.src = a.href;
  }

  // ---- project -> HOME: the same move as pressing Home on the main page. The C comes back out of the zoom, turning
  // clockwise, and settles exactly where the logo's C sits (gap facing right) as the project page shrinks away inside
  // it. The main page, in an iframe on top, shows everywhere outside it. ----
  function homeZoom(a) {
    if (!(window.CSS && CSS.registerProperty)) { iris(a, { clientX: 0, clientY: 0 }); return; }
    ['--zc-x', '--zc-y', '--zc-r'].forEach(function (n) { try { CSS.registerProperty({ name: n, syntax: '<length>', inherits: false, initialValue: '0px' }); } catch (er) {} });
    var w = window.innerWidth, h = window.innerHeight;
    // where the logo's C sits on the home page (see .lockup in home.css: 920 x 560 units, centred; the C is at 1197,624.5)
    var unit = Math.min(.46 * w, .92 * h * 920 / 560) / 920;
    var homeX = w / 2 + (1197 - 1000) * unit, homeY = h / 2 + (624.5 - 625) * unit;
    var far = Math.hypot(w / 2, h / 2), S = 1.15 * far / R_IN, DUR = 1150, started = false;
    busy = true;

    var hole = 'radial-gradient(circle at var(--zc-x) var(--zc-y), transparent var(--zc-r), #000 calc(var(--zc-r) + 1px))';
    var page = document.createElement('iframe');
    page.className = 'zc-iris-page';
    page.setAttribute('aria-hidden', 'true'); page.tabIndex = -1;
    page.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9998;pointer-events:none;--zc-x:' + w / 2 + 'px;--zc-y:' + h / 2 + 'px;--zc-r:' + R_IN * S + 'px;-webkit-mask-image:' + hole + ';mask-image:' + hole;
    document.body.appendChild(page);

    var ring = document.createElement('div');
    ring.className = 'zc-iris';
    ring.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;width:' + 2 * R_OUT + 'px;height:' + 2 * R_OUT + 'px;left:' + -R_OUT + 'px;top:' + -R_OUT + 'px;will-change:transform;transform:translate(' + w / 2 + 'px,' + h / 2 + 'px) scale(' + S + ')';
    ring.innerHTML = RING_SVG;
    document.body.appendChild(ring);

    function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
    function frame(now, t0) {
      var t = Math.min(1, (now - t0) / DUR), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var s = S + (unit - S) * e, cx = w / 2 + (homeX - w / 2) * e, cy = h / 2 + (homeY - h / 2) * e;
      ring.style.transform = 'translate(' + cx + 'px,' + cy + 'px) rotate(' + 360 * e + 'deg) scale(' + s + ')';
      // the project page inside the ring shrinks away with it, and is gone by the time the ring is home
      page.style.setProperty('--zc-x', cx + 'px'); page.style.setProperty('--zc-y', cy + 'px');
      page.style.setProperty('--zc-r', R_IN * s * (1 - smooth01((e - .5) / .4)) + 'px');
      if (t < 1) requestAnimationFrame(function (n) { frame(n, t0); });
      else setTimeout(function () { try { sessionStorage.setItem('zc-iris', '1'); } catch (er) {} window.location.href = a.href; }, 120);
    }
    function start() { if (started) return; started = true; requestAnimationFrame(function (n) { frame(n, n); }); }
    whenReady(page, function () {
      // the travelling ring stands in for the logo's C until it lands, so hide the page's own copy meanwhile
      try { var own = page.contentDocument.getElementById('ring'); if (own) own.style.visibility = 'hidden'; } catch (er) {}
      setTimeout(start, 150);
    });
    setTimeout(start, 1500);
    page.src = a.href;
  }

  // ---- project -> project: swap the page in sideways without touching the strip ----
  function tiles() { return [].slice.call(document.querySelectorAll('.tile')); }
  function indexOf(url) { var u = new URL(url, location.href).href; return tiles().findIndex(function (t) { return t.href === u; }); }

  // Slide through every project between here and the target, in order, as one continuous move.
  function slideTo(urls, dir, push) {
    busy = true;
    var target = urls[urls.length - 1];
    Promise.all(urls.map(function (u) { return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.text(); }); })).then(function (htmls) {
      var docs = htmls.map(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
      var mains = docs.map(function (d) { var m = document.importNode(d.querySelector('main.project'), true); m.classList.add('no-enter'); return m; });
      var pages = document.querySelector('.pages'), old = pages.querySelector('.project');
      var W = pages.clientWidth, k = mains.length;
      old.classList.add('no-enter');   // moving it into the row would otherwise replay its entrance animation
      // Glide back to the top while the page slides, rather than snapping there first (which flashed the other page).
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });

      // lay the pages side by side in travel order and slide the row
      var track = document.createElement('div');
      track.style.cssText = 'grid-area:1/1;display:flex;width:' + (k + 1) * W + 'px';
      var row = dir > 0 ? [old].concat(mains) : mains.slice().reverse().concat([old]);
      row.forEach(function (m) { m.style.cssText = 'flex:0 0 ' + W + 'px;width:' + W + 'px'; track.appendChild(m); });
      pages.appendChild(track);

      document.title = docs[k - 1].title;
      if (push) history.pushState({}, '', target);

      // strip: only the highlighted tile and the arrows' targets change
      var list = tiles(), idx = indexOf(target), n = list.length;
      list.forEach(function (t, i) { if (i === idx) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
      var arrows = document.querySelectorAll('.more .arrow'), p = list[(idx + n - 1) % n], q = list[(idx + 1) % n];
      arrows[0].href = p.href; arrows[0].setAttribute('aria-label', 'Previous project: ' + p.getAttribute('aria-label'));
      arrows[1].href = q.href; arrows[1].setAttribute('aria-label', 'Next project: ' + q.getAttribute('aria-label'));
      if (window.zcFit) window.zcFit();

      var from = dir > 0 ? 0 : -k * W, to = dir > 0 ? -k * W : 0;
      track.animate([{ transform: 'translateX(' + from + 'px)' }, { transform: 'translateX(' + to + 'px)' }],
                    { duration: 800 + 380 * (k - 1), easing: ease, fill: 'forwards' }).finished.then(function () {
        var final = mains[k - 1];
        final.style.cssText = '';
        pages.appendChild(final);
        track.remove();
        busy = false;
      });
    }).catch(function () { window.location.href = target; });
  }

  function slide(a) {
    var list = tiles(), cur = list.findIndex(function (t) { return t.hasAttribute('aria-current'); }), tgt = indexOf(a.href);
    if (tgt === cur) return;
    if (a.classList.contains('arrow')) { slideTo([a.href], a.getAttribute('data-dir') === 'prev' ? -1 : 1, true); return; }   // arrows wrap round
    var dir = tgt > cur ? 1 : -1, urls = [];
    for (var i = cur + dir; i !== tgt + dir; i += dir) urls.push(list[i].href);
    slideTo(urls, dir, true);
  }

  window.addEventListener('popstate', function () {
    if (!document.querySelector('.pages') || busy) { location.reload(); return; }
    var list = tiles(), cur = list.findIndex(function (t) { return t.hasAttribute('aria-current'); }), tgt = indexOf(location.href);
    if (tgt < 0) { location.reload(); return; }
    var dir = tgt > cur ? 1 : -1, urls = [];
    for (var i = cur + dir; i !== tgt + dir; i += dir) urls.push(list[i].href);
    slideTo(urls, dir, false);
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || busy || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button || a.target === '_blank' || a.hasAttribute('download')) return;
    if (a.hasAttribute('data-slide') && document.querySelector('.pages')) { e.preventDefault(); slide(a); return; }
    if (a.hasAttribute('data-iris')) { e.preventDefault(); if (LIGHT) irisLite(a, e); else iris(a, e); return; }
    if (LIGHT) return;
    var u = new URL(a.href, location.href);
    if (document.querySelector('.more, .research-page') && u.origin === location.origin && !/(the-reach-riverside|the-reach-catering|mandaloun|oxford-fashion-gala|zaira-christa\/index|zc-studios)\.html$/.test(u.pathname)) {
      e.preventDefault();
      if (!u.hash || u.hash === '#') homeZoom(a); else zoomOut(a, e);   // home lands as the logo; the other sections zoom out to the click
    }
  });

  // Coming back with the browser's back button can restore the page mid-transition.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    busy = false; warmed = null;
    document.querySelectorAll('.zc-iris, .zc-iris-page').forEach(function (n) { n.remove(); });
  });
})();
