/* ReiseGlück (Demo) – Scroll-Animationen
   - Überschriften und Intro-Texte werden Wort für Wort mit dem Scrollen eingeblendet (scrubbed)
   - Hero: Wort-Einflug beim Laden, Parallax + Ausblenden beim Scrollen
   - Bild-Parallax, weiche Unschärfe am oberen und unteren Bildschirmrand
   Bei "Bewegung reduzieren" passiert nichts: alle Inhalte bleiben sofort sichtbar. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.classList.add('motion');

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  var INTERACTIVE = 'a, button, input, select, textarea, [tabindex], details';

  /* ---------- Wörter in Spans zerlegen (Original bleibt für Screenreader lesbar) ---------- */
  function splitWords(el, wordClass) {
    if (el.dataset.split || el.querySelector(INTERACTIVE)) return null;
    el.dataset.split = '1';
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var sr = doc.createElement('span'); sr.className = 'sr-only'; sr.textContent = label;
    var vis = doc.createElement('span'); vis.className = 'words'; vis.setAttribute('aria-hidden', 'true');
    var words = [];
    (function walk(src, dst) {
      Array.prototype.slice.call(src.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          n.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { dst.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span'); w.className = wordClass; w.textContent = part;
            dst.appendChild(w); words.push(w);
          });
        } else if (n.nodeType === 1) {
          var c = n.cloneNode(false); dst.appendChild(c); walk(n, c);
        }
      });
    })(el, vis);
    el.textContent = '';
    el.appendChild(sr); el.appendChild(vis);
    return words;
  }

  /* ---------- Gemessene Elemente (Layout nur bei Resize/Load lesen, nicht pro Frame) ---------- */
  var scrubs = [];   // { el, words, start, end, kind, last }
  var parallax = []; // { el, box, top, h, amt }
  var vh = window.innerHeight, maxScroll = 0;

  function measure() {
    vh = window.innerHeight;
    maxScroll = Math.max(0, root.scrollHeight - vh);
    var sy = window.scrollY;
    scrubs.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      s.hidden = !s.el.offsetParent && s.el.getClientRects().length === 0;
      var docY = r.top + sy;
      var end = vh * s.endAt;
      var reachable = docY - maxScroll;       // kleinste erreichbare Position im Viewport
      if (reachable > end) end = reachable;   // Elemente am Seitenende trotzdem voll einblenden
      s.end = end; s.start = end + vh * s.range; s.docY = docY; s.last = -1;
    });
    parallax.forEach(function (p) {
      var r = p.box.getBoundingClientRect();
      p.top = r.top + sy; p.h = r.height;
    });
  }

  function paintScrub(s, sy) {
    var p = s.hidden ? 1 : clamp((s.start - (s.docY - sy)) / (s.start - s.end || 1), 0, 1);
    if (Math.abs(p - s.last) < 0.002) return;
    s.last = p;
    var n = s.words.length, win = s.kind === 'h' ? 0.45 : 0.3;
    for (var i = 0; i < n; i++) {
      var t0 = n > 1 ? (i / (n - 1)) * (1 - win) : 0;
      var wp = ease(clamp((p - t0) / win, 0, 1));
      var st = s.words[i].style;
      if (wp >= 1) { if (st.opacity !== '') { st.opacity = ''; st.transform = ''; st.filter = ''; } continue; }
      if (s.kind === 'h') {
        st.opacity = (0.08 + 0.92 * wp).toFixed(3);
        st.transform = 'translate3d(0,' + ((1 - wp) * 0.32).toFixed(3) + 'em,0)';
        st.filter = 'blur(' + ((1 - wp) * 8).toFixed(2) + 'px)';
      } else {
        st.opacity = (0.18 + 0.82 * wp).toFixed(3);
      }
    }
  }

  /* Überschriften + Intro-Absätze (außerhalb der Heros) */
  function addScrub(el, kind) {
    if (el.closest('.hero, .page-hero, [hidden], form, dialog')) return;
    var words = splitWords(el, kind === 'h' ? 'w' : 'wt');
    if (!words || !words.length) return;
    el.removeAttribute('data-reveal'); el.classList.add('is-in', 'scrub', 'scrub-' + kind);
    scrubs.push({ el: el, words: words, kind: kind, endAt: kind === 'h' ? 0.5 : 0.45, range: kind === 'h' ? 0.38 : 0.42 });
  }
  doc.querySelectorAll('main h2[data-reveal], main .cta-band h2').forEach(function (el) { addScrub(el, 'h'); });
  doc.querySelectorAll('main .sec-head p:not(.label), main .lead, main .cta-band h2 + p').forEach(function (el) { addScrub(el, 'p'); });

  /* ---------- Hero: Wort-Einflug beim Laden ---------- */
  doc.querySelectorAll('.hero h1, .page-hero h1, .detail-head h1').forEach(function (h1) {
    var words = splitWords(h1, 'rw');
    if (!words) return;
    h1.removeAttribute('data-hero'); h1.removeAttribute('data-reveal');
    h1.classList.add('rise');
    words.forEach(function (w, i) {
      var mask = doc.createElement('span'); mask.className = 'rw-mask';
      w.parentNode.insertBefore(mask, w); mask.appendChild(w);
      w.style.setProperty('--i', i);
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { h1.classList.add('rise-in'); }); });
  });

  /* ---------- Hero: Parallax, Inhalt hebt sich und wird unscharf ---------- */
  var hero = doc.querySelector('.hero');
  var heroMedia = hero && hero.querySelector('.hero-media');
  var heroContent = hero && hero.querySelector('.hero-content');
  function paintHero(sy) {
    if (!hero) return;
    var h = hero.offsetHeight || vh;
    if (sy > h * 1.1) return;
    var p = clamp(sy / h, 0, 1);
    heroMedia.style.transform = 'translate3d(0,' + (sy * 0.38).toFixed(1) + 'px,0) scale(' + (1 + p * 0.06).toFixed(4) + ')';
    heroContent.style.transform = 'translate3d(0,' + (-sy * 0.18).toFixed(1) + 'px,0)';
    heroContent.style.opacity = String(clamp(1 - p * 1.6, 0, 1).toFixed(3));
    heroContent.style.filter = p > 0.01 ? 'blur(' + (p * 10).toFixed(2) + 'px)' : '';
  }

  /* ---------- Bild-Parallax ---------- */
  function addParallax(img, box, amt) {
    if (!img || !box) return;
    img.classList.add('plx');
    parallax.push({ el: img, box: box, amt: amt, top: 0, h: 0 });
  }
  doc.querySelectorAll('.cta-band').forEach(function (b) { addParallax(b.querySelector(':scope > img'), b, 0.14); });
  doc.querySelectorAll('.page-hero.with-img').forEach(function (b) { addParallax(b.querySelector(':scope > img'), b, 0.2); });
  doc.querySelectorAll('.dest').forEach(function (d) { addParallax(d.querySelector('img'), d, 0.08); });
  function paintParallax(sy) {
    for (var i = 0; i < parallax.length; i++) {
      var p = parallax[i], top = p.top - sy;
      if (top > vh || top + p.h < 0) continue;
      // -1 (unten im Viewport) … 1 (oben herausgescrollt)
      var c = ((top + p.h / 2) - vh / 2) / (vh / 2 + p.h / 2);
      p.el.style.translate = '0 ' + (c * p.amt * 100).toFixed(2) + '%';
    }
  }

  /* ---------- Weiche Unschärfe an den Bildschirmrändern ---------- */
  function edge(cls) {
    var e = doc.createElement('div'); e.className = 'edge-blur ' + cls; e.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 4; i++) e.appendChild(doc.createElement('i'));
    body.appendChild(e); return e;
  }
  var edgeBottom = null;
  if (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) {
    edge('edge-top'); edgeBottom = edge('edge-bottom');
  }

  /* ---------- Zahlen hochzählen ---------- */
  var counters = [];
  doc.querySelectorAll('.stat-fig').forEach(function (el) {
    var m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m || +m[1] < 2) return;
    el.setAttribute('aria-label', el.textContent);
    counters.push({ el: el, to: +m[1], rest: m[2], done: false });
    el.textContent = '0' + m[2];
  });
  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var c = counters.filter(function (x) { return x.el === en.target; })[0];
        var t0 = performance.now(), dur = 1400;
        (function step(now) {
          var k = ease(clamp((now - t0) / dur, 0, 1));
          c.el.textContent = Math.round(c.to * k) + c.rest;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c.el); });
  } else counters.forEach(function (c) { c.el.textContent = c.to + c.rest; });

  /* ---------- Frame-Loop (nur bei Scroll/Resize) ---------- */
  var ticking = false;
  function frame() {
    ticking = false;
    var sy = window.scrollY;
    for (var i = 0; i < scrubs.length; i++) paintScrub(scrubs[i], sy);
    paintHero(sy);
    paintParallax(sy);
    if (edgeBottom) edgeBottom.classList.toggle('off', sy >= maxScroll - 4);
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function remeasure() { measure(); req(); }

  measure(); frame();
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('orientationchange', remeasure);
  window.addEventListener('load', remeasure);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasure);
  if ('ResizeObserver' in window) {
    var lastH = 0;
    new ResizeObserver(function () { var hgt = root.scrollHeight; if (hgt !== lastH) { lastH = hgt; remeasure(); } }).observe(body);
  }
})();
