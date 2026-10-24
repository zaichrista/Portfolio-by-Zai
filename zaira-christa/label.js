(function () {
  // landing: the look beside the index follows the collection under the pointer
  var links = document.querySelectorAll('.menu a[data-look]'), looks = document.querySelectorAll('.look img');
  links.forEach(function (a) {
    function on() { looks.forEach(function (im, k) { im.classList.toggle('on', k === +a.dataset.look); }); }
    a.addEventListener('mouseenter', on); a.addEventListener('focus', on);
  });
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // first collection: plates fade in, and the counter beside the text follows the plate in view
  var plates = document.querySelectorAll('.plates figure');
  if (plates.length && 'IntersectionObserver' in window) {
    var cur = document.getElementById('cur');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (cur && e.target.dataset.n) cur.textContent = e.target.dataset.n;
      });
    }, { rootMargin: '-35% 0px -35% 0px' });
    plates.forEach(function (f) { io.observe(f); });
  }
  // ss24: contact sheet with a viewer
  var sheet = document.querySelectorAll('.sheet button'), view = document.querySelector('.view');
  if (sheet.length && view) {
    var img = view.querySelector('img'), num = view.querySelector('.n'), i = 0, last;
    function show(k) {
      i = (k + sheet.length) % sheet.length;
      img.src = sheet[i].dataset.full; img.alt = sheet[i].dataset.alt;
      num.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(sheet.length).padStart(2, '0');
    }
    function open(k) { last = document.activeElement; show(k); view.classList.add('open'); document.body.style.overflow = 'hidden'; view.querySelector('.close').focus(); }
    function close() { view.classList.remove('open'); document.body.style.overflow = ''; if (last) last.focus(); }
    sheet.forEach(function (b, k) { b.addEventListener('click', function () { open(k); }); });
    view.querySelector('.prev').onclick = function () { show(i - 1); };
    view.querySelector('.nxt').onclick = function () { show(i + 1); };
    view.querySelector('.close').onclick = close;
    addEventListener('keydown', function (e) {
      if (!view.classList.contains('open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(i + 1); else if (e.key === 'ArrowLeft') show(i - 1);
    });
  }
  // enquiries: posts to the Wix form endpoint once data-endpoint is set on the form; until then it opens an email to the address
  var enq = document.getElementById('enq');
  if (enq) {
    var st = document.getElementById('status');
    enq.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(enq);
      if (d.get('company')) return;                               // honeypot
      var endpoint = enq.dataset.endpoint;
      if (!endpoint) {
        var body = 'Name: ' + d.get('name') + '\nEmail: ' + d.get('email') + '\n\n' + d.get('message');
        location.href = 'mailto:' + enq.dataset.mailto + '?subject=' + encodeURIComponent(d.get('type') + ' | Zaira Christa') + '&body=' + encodeURIComponent(body);
        return;
      }
      st.textContent = 'Sending…';
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: d.get('name'), email: d.get('email'), type: d.get('type'), message: d.get('message') }) })
        .then(function (r) { if (!r.ok) throw 0; enq.reset(); st.textContent = 'Thank you. We will be in touch.'; })
        .catch(function () { st.textContent = 'Something went wrong. Please email ' + enq.dataset.mailto + '.'; });
    });
  }
})();
