/* ReiseGlück (Demo) – gemeinsame Funktionen für alle Seiten */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- DOM helper (nur textContent, kein innerHTML für Daten) ---------- */
  function h(tag, attrs, kids) {
    var el = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'class') el.className = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return el;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function icon(name, cls) {
    var s = doc.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'i' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    var u = doc.createElementNS(SVGNS, 'use');
    u.setAttribute('href', 'assets/icons.svg#' + name);
    s.appendChild(u); return s;
  }
  window.RG_UI = { h: h, icon: icon };

  /* ---------- Smooth scrolling (Lenis, self-hosted) ---------- */
  var lenis = null;
  if (window.Lenis && !reduce.matches) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, syncTouch: false, gestureOrientation: 'vertical' });
    var rafLoop = function (time) { lenis.raf(time); requestAnimationFrame(rafLoop); };
    requestAnimationFrame(rafLoop);
    // same-page anchors: smooth scroll with header offset, then move focus for keyboard and screen-reader users
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.classList.contains('skip') || e.defaultPrevented) return;
      var id = a.getAttribute('href').slice(1); if (!id) return;
      var target = doc.getElementById(id); if (!target) return;
      e.preventDefault();
      var offset = -((doc.querySelector('.site-header') || { offsetHeight: 72 }).offsetHeight + 16);
      lenis.scrollTo(target, { offset: offset, onComplete: function () {
        if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      } });
      if (history.replaceState) history.replaceState(history.state, '', '#' + id);
    });
  }
  window.RG_LENIS = lenis;
  window.RG_UI.scrollToY = function (y) { if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo({ top: y, behavior: 'auto' }); };

  var body = doc.body;

  /* ---------- Header tone: transparent glass header, light text over dark sections ---------- */
  var header = doc.querySelector('.site-header');
  if (header) {
    var DARK = '.on-dark, .hero, .page-hero, .cta-band, .site-footer, .intro-loader';
    var toneTick = false;
    var tone = function () {
      toneTick = false;
      var y = Math.round(header.offsetHeight / 2), x = Math.round(window.innerWidth / 2), dark = false;
      var stack = doc.elementsFromPoint ? doc.elementsFromPoint(x, y) : [];
      for (var i = 0; i < stack.length; i++) {
        if (header.contains(stack[i])) continue;
        dark = !!stack[i].closest(DARK); break;
      }
      body.classList.toggle('header-on-dark', dark);
      body.classList.toggle('scrolled', window.scrollY > 8);
    };
    var reqTone = function () { if (!toneTick) { toneTick = true; requestAnimationFrame(tone); } };
    tone();
    window.addEventListener('scroll', reqTone, { passive: true });
    window.addEventListener('resize', reqTone);
    window.addEventListener('load', reqTone);
  }

  /* ---------- Menu drawer ---------- */
  var drawer = doc.getElementById('drawer');
  var openBtn = doc.querySelector('[data-menu-open]');
  if (drawer && openBtn) {
    var lastFocus = null;
    var focusables = function () { return drawer.querySelectorAll('a[href], button:not([disabled])'); };
    var close = function () {
      drawer.classList.remove('open'); drawer.hidden = true; body.classList.remove('lock'); if (lenis) lenis.start();
      openBtn.setAttribute('aria-expanded', 'false');
      if (lastFocus) lastFocus.focus();
    };
    var open = function () {
      lastFocus = doc.activeElement;
      drawer.hidden = false; drawer.classList.add('open'); body.classList.add('lock'); if (lenis) lenis.stop();
      openBtn.setAttribute('aria-expanded', 'true');
      var f = drawer.querySelector('button[data-menu-close]'); if (f) f.focus();
    };
    openBtn.addEventListener('click', open);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) { e.preventDefault(); close(); } });
    drawer.querySelectorAll('[data-menu-close]').forEach(function (b) { b.addEventListener('click', close); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- Opening hours: highlight today ---------- */
  var dayIdx = new Date().getDay(); // 0 = So
  doc.querySelectorAll('.hours li[data-day]').forEach(function (li) {
    var days = li.getAttribute('data-day').split(',').map(Number);
    if (days.indexOf(dayIdx) !== -1) {
      li.classList.add('today');
      li.setAttribute('aria-current', 'date');
      var label = li.querySelector('.day');
      if (label) label.appendChild(h('span', { class: 'today-tag', text: 'heute' }));
    }
  });

  /* ---------- Year ---------- */
  doc.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Catalog rendering (single source: data/offers.js) ---------- */
  var K = window.RG_KATALOG;
  var HERO_IMGS = { 'bucht-mittelmeer': 1, 'strand-palmen': 1 };
  function imgFor(name, alt, sizes) {
    var small = HERO_IMGS[name] ? 1200 : 800, big = HERO_IMGS[name] ? 2400 : 1600;
    return h('img', {
      src: 'assets/img/' + name + '-' + small + '.webp',
      srcset: 'assets/img/' + name + '-' + small + '.webp ' + small + 'w, assets/img/' + name + '-' + big + '.webp ' + big + 'w',
      sizes: sizes || '(min-width: 1100px) 400px, (min-width: 700px) 50vw, 100vw',
      alt: alt || '', width: '800', height: '600', loading: 'lazy', decoding: 'async'
    });
  }
  window.RG_UI.imgFor = imgFor;
  window.RG_UI.card = function (it, i) { return card(it, i); };

  function bookHref(id) { return 'buchen.html?item=' + encodeURIComponent(id); }
  function detailHref(id) { return 'reise.html?id=' + encodeURIComponent(id); }

  function detailRow(label, value, ic) {
    return h('li', null, [h('span', { class: 'd-label', text: label }), h('span', { class: 'd-val', text: value }), icon(ic)]);
  }

  function card(it, i) {
    var media = h('a', { class: 'card-media', href: detailHref(it.id), tabindex: '-1', 'aria-hidden': 'true' }, [imgFor(it.bild, it.bildAlt)]);
    media.appendChild(h('span', { class: 'card-photos' }, [icon('plus'), 'Fotos & Details']));
    if (it.badge) media.appendChild(h('span', { class: 'badge' }, [it.badge]));
    var incl = it.inklusive || ['Flug', 'Hotel'];
    if (it.id === 'deutschland') incl = ['Hotel', 'Anreise nach Wunsch'];
    if (it.id === 'kreuzfahrt') incl = ['Kabine', 'Vollpension an Bord'];
    var zimmer = it.id === 'kreuzfahrt' ? 'p. P. in der Doppelkabine' : 'p. P. im Doppelzimmer';
    var details = h('ul', { class: 'details', 'aria-label': 'Details' }, [
      detailRow('Dauer', it.dauer, 'calendar'),
      detailRow('Leistungen', incl.join(' · '), 'suitcase'),
      detailRow('Basis', zimmer, 'bed')
    ]);
    if (it.zusatz) details.appendChild(detailRow('Hinweis', it.zusatz, 'info'));
    var price = h('div', { class: 'price-row' }, [
      h('span', { class: 'price-meta mono', text: 'Beispielpreis (Demo)' }),
      h('span', null, [h('span', { class: 'price', text: K.preisText(it) }), h('span', { class: 'price-unit', text: ' ' + it.einheit })])
    ]);
    var a = h('a', { class: 'btn btn-block', href: bookHref(it.id), 'aria-label': 'Reise buchen: ' + it.name }, ['Reise buchen', icon('arrow', 'i-arrow')]);
    var body = h('div', { class: 'card-body' }, [h('h3', null, [h('a', { href: detailHref(it.id), class: 'card-title' }, [it.name])]), h('p', { text: it.kurz }), details, price, a]);
    return h('article', { class: 'card', 'data-reveal': '', style: '--d:' + (i % 4), 'data-id': it.id }, [media, body]);
  }

  if (K) {
    doc.querySelectorAll('[data-cards]').forEach(function (box) {
      var ids = box.getAttribute('data-cards').split(',').map(function (s) { return s.trim(); });
      var list = ids[0] === 'alle' ? K.angebote.concat(K.pakete) : ids.map(K.finde).filter(Boolean);
      list.forEach(function (it, i) { box.appendChild(card(it, i)); });
    });

    /* filter chips on Reisen page */
    var chipBar = doc.querySelector('[data-card-filter]');
    if (chipBar) {
      var grid = doc.querySelector('[data-cards]');
      var status = doc.getElementById('filter-status');
      chipBar.addEventListener('click', function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        chipBar.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
        var want = b.getAttribute('data-filter').split(',');
        var shown = 0;
        grid.querySelectorAll('.card').forEach(function (c) {
          var ok = want[0] === 'alle' || want.indexOf(c.getAttribute('data-id')) !== -1;
          c.hidden = !ok; if (ok) { shown++; c.classList.add('is-in'); }
        });
        if (status) status.textContent = shown + (shown === 1 ? ' Reise' : ' Reisen') + ' angezeigt';
      });
    }

    /* price tables */
    doc.querySelectorAll('[data-price-table]').forEach(function (tb) {
      var key = tb.getAttribute('data-price-table');
      var list = key === 'services' ? K.services : K.angebote.concat(K.pakete);
      list.forEach(function (it) {
        var th = h('th', { scope: 'row' }, [key === 'services' ? it.name : h('a', { href: detailHref(it.id), class: 'row-link' }, [it.name]), h('small', { text: it.kurz + (it.dauer ? ' · ' + it.dauer : '') })]);
        var price = h('td', { class: 'num', text: K.preisText(it) });
        var unit = h('td', { class: 'unit', text: it.einheit });
        var btn = h('a', { class: 'btn btn-sm' + (key === 'services' ? ' btn-ghost' : ''), href: bookHref(it.id), 'aria-label': 'Reise buchen: ' + it.name }, ['Reise buchen']);
        tb.appendChild(h('tr', null, [th, price, unit, h('td', null, [btn])]));
      });
    });
  }

  /* ---------- Gallery credits (Bildnachweise) ---------- */
  var gcBody = doc.querySelector('[data-gallery-credits]');
  if (gcBody && window.RG_GALERIEN) {
    Object.keys(window.RG_GALERIEN).forEach(function (key) {
      window.RG_GALERIEN[key].fotos.forEach(function (p) {
        if (p.haupt) return;
        gcBody.appendChild(h('tr', null, [
          h('th', { scope: 'row', text: p.alt }),
          h('td', { text: p.foto }),
          h('td', null, [h('img', { src: 'assets/img/' + p.bild + '-800.webp', alt: '', width: '96', height: '64', loading: 'lazy' })]),
          h('td', null, [h('a', { href: p.quelle, rel: 'noopener', text: 'Unsplash' })])
        ]));
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  function setupReveal() {
    var els = doc.querySelectorAll('[data-reveal]:not(.is-in)');
    if (!('IntersectionObserver' in window) || reduce.matches) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }
  window.RG_UI.reveal = setupReveal;
  setupReveal();

  /* ---------- Marquee pause button ---------- */
  doc.querySelectorAll('[data-marquee-toggle]').forEach(function (btn) {
    var m = doc.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var paused = m.classList.toggle('paused');
      btn.setAttribute('aria-pressed', String(paused));
      btn.querySelector('span').textContent = paused ? 'Laufband abspielen' : 'Laufband anhalten';
      btn.querySelector('use').setAttribute('href', 'assets/icons.svg#' + (paused ? 'play' : 'pause'));
    });
  });

  /* ---------- Carousel prev/next ---------- */
  doc.querySelectorAll('[data-carousel]').forEach(function (c) {
    var track = c.querySelector('.carousel-track');
    var prev = c.querySelector('[data-prev]'), next = c.querySelector('[data-next]');
    if (!track || !prev || !next) return;
    var step = function () { var f = track.firstElementChild; return f ? f.getBoundingClientRect().width + 20 : 300; };
    var update = function () {
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    var beh = reduce.matches ? 'auto' : 'smooth';
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: beh }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: beh }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    c.addEventListener('rg:rendered', update);
    update();
  });

  /* ---------- Flight route (signature) ---------- */
  var proc = doc.querySelector('[data-route]');
  if (proc) {
    var svg = proc.querySelector('.route-svg');
    var path = proc.querySelector('.route-draw');
    var plane = proc.querySelector('.route-plane');
    if (svg && path && plane) {
      var len = 0, ticking = false;
      var layout = function () {
        var w = proc.clientWidth;
        svg.setAttribute('viewBox', '0 0 ' + w + ' 120');
        var d = 'M 8 96 C ' + (w * 0.22) + ' 10, ' + (w * 0.38) + ' 10, ' + (w * 0.5) + ' 56 S ' + (w * 0.78) + ' 104, ' + (w - 20) + ' 18';
        path.setAttribute('d', d);
        proc.querySelector('.route-base').setAttribute('d', d);
        len = path.getTotalLength();
        path.style.strokeDasharray = len + ' ' + len;
        update();
      };
      var update = function () {
        ticking = false;
        var r = proc.getBoundingClientRect(), vh = window.innerHeight;
        var p = reduce.matches ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.2)));
        path.style.strokeDashoffset = String(len * (1 - p));
        var at = Math.max(0.5, len * p);
        var pt = path.getPointAtLength(at), pt2 = path.getPointAtLength(Math.min(len, at + 1));
        var ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
        var off = svg.getBoundingClientRect(), base = proc.getBoundingClientRect();
        var sx = off.width / (svg.viewBox.baseVal.width || 1);
        // plane icon points to upper right (45°), rotate to path tangent
        plane.style.transform = 'translate(' + (pt.x * sx + off.left - base.left - 17) + 'px,' + (pt.y * sx + off.top - base.top - 17) + 'px) rotate(' + (ang + 45) + 'deg)';
      };
      var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      layout();
      window.addEventListener('scroll', req, { passive: true });
      window.addEventListener('resize', layout);
    }
  }

  /* ---------- Demo forms (Beratung) ---------- */
  doc.querySelectorAll('form[data-demo-form]').forEach(function (form) {
    var summary = form.querySelector('.err-summary');
    var done = doc.getElementById(form.getAttribute('data-done'));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errors = [];
      form.querySelectorAll('[data-rule]').forEach(function (f) {
        var v = (f.type === 'checkbox') ? f.checked : f.value.trim();
        var rule = f.getAttribute('data-rule'), msg = '';
        if (rule === 'required' && !v) msg = f.getAttribute('data-msg');
        if (rule === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = v ? 'Bitte prüfen Sie die E-Mail-Adresse, z. B. name@beispiel.de.' : f.getAttribute('data-msg');
        if (rule === 'phone-opt' && v && !/^[+()0-9\s/-]{6,20}$/.test(v)) msg = 'Bitte nur Ziffern, Leerzeichen, + oder - verwenden.';
        if (rule === 'contact') {
          var other = form.querySelector('#' + f.getAttribute('data-pair'));
          if (!v && !other.value.trim()) msg = f.getAttribute('data-msg');
        }
        if (rule === 'date-future' && v) { var t = new Date(); t.setHours(0, 0, 0, 0); if (new Date(v + 'T00:00') < t) msg = 'Bitte wählen Sie ein Datum ab heute.'; }
        if (rule === 'date-future' && !v) msg = f.getAttribute('data-msg');
        if (rule === 'consent' && !v) msg = f.getAttribute('data-msg');
        var errEl = doc.getElementById(f.id + '-err');
        if (msg) { errors.push({ id: f.id, msg: msg }); f.setAttribute('aria-invalid', 'true'); if (errEl) { errEl.textContent = ''; errEl.appendChild(icon('alert')); errEl.appendChild(doc.createTextNode(msg)); } }
        else { f.removeAttribute('aria-invalid'); if (errEl) errEl.textContent = ''; }
      });
      if (errors.length) {
        summary.hidden = false;
        var ul = summary.querySelector('ul'); ul.textContent = '';
        errors.forEach(function (er) { ul.appendChild(h('li', null, [h('a', { href: '#' + er.id, text: er.msg })])); });
        summary.querySelector('h2').textContent = errors.length === 1 ? 'Bitte prüfen Sie 1 Angabe:' : 'Bitte prüfen Sie ' + errors.length + ' Angaben:';
        summary.focus();
        return;
      }
      summary.hidden = true;
      form.hidden = true;
      if (done) { done.hidden = false; var hd = done.querySelector('h2, h3'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus(); } }
    });
    if (summary) summary.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return; e.preventDefault();
      var t = doc.getElementById(a.getAttribute('href').slice(1)); if (t) t.focus();
    });
  });
  doc.querySelectorAll('[data-reset-form]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = doc.getElementById(b.getAttribute('data-reset-form')); var box = b.closest('[hidden], .success-box');
      if (f) { f.reset(); f.hidden = false; if (box) box.hidden = true; var first = f.querySelector('input, select, textarea'); if (first) first.focus(); }
    });
  });
})();
