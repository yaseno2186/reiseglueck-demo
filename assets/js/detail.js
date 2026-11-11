/* ReiseGlück (Demo) – Reise-Detailseite: reise?id=<id>
   Daten: data/offers.js (Preis, Leistungen) + data/galleries.js (Fotos, Texte). */
(function () {
  'use strict';
  var doc = document;
  var K = window.RG_KATALOG, G = window.RG_GALERIEN || {}, UI = window.RG_UI;
  if (!K || !UI) return;
  var h = UI.h, icon = UI.icon;
  var F = function (id) { return doc.getElementById(id); };

  var id = new URLSearchParams(window.location.search).get('id');
  var it = K.finde(id);
  var g = it && G[it.id];

  if (!it || !g) {
    F('page-title').textContent = 'Diese Reise haben wir nicht gefunden.';
    F('crumb-name').textContent = 'Nicht gefunden';
    F('gallery').remove();
    var main = doc.querySelector('.detail-layout');
    main.textContent = '';
    main.appendChild(h('p', { class: 'lead' }, ['Vielleicht hat sich der Link geändert. Alle Reisen finden Sie unter ', h('a', { href: 'reisen', text: 'Reisen' }), '.']));
    F('more-section').remove();
    return;
  }

  /* ---------- head ---------- */
  doc.title = it.name + ' | ReiseGlück Reisebüro';
  F('page-title').textContent = it.name;
  F('crumb-name').textContent = it.name;
  F('detail-sub').textContent = (it.badge ? it.badge + ' · ' : '') + it.dauer + ' · ' + K.preisText(it) + ' ' + it.einheit + ' · Beispielpreis (Demo)';
  var meta = doc.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', it.name + ': ' + it.kurz + ' Beispielpreis (Demo), persönlich geplant von ReiseGlück.');

  /* ---------- photos ---------- */
  var photos = g.fotos.map(function (p) {
    return { bild: p.bild, alt: p.haupt ? (it.bildAlt || it.name) : p.alt, foto: p.foto };
  });
  function src(p, size) {
    var hero = p.bild === 'bucht-mittelmeer' || p.bild === 'strand-palmen';
    var s = size === 'big' ? (hero ? 2400 : 1600) : (hero ? 1200 : 800);
    return 'assets/img/' + p.bild + '-' + s + '.webp';
  }
  var gal = F('gallery');
  photos.forEach(function (p, i) {
    var img = h('img', { src: src(p, 'small'), srcset: src(p, 'small') + ' 800w, ' + src(p, 'big') + ' 1600w', sizes: i === 0 ? '(min-width: 900px) 60vw, 100vw' : '(min-width: 900px) 25vw, 50vw', alt: p.alt, width: '800', height: '533', loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' });
    if (i === 0) img.setAttribute('fetchpriority', 'high');
    var btn = h('button', { type: 'button', class: 'gal-item gal-' + i, 'aria-label': 'Foto ' + (i + 1) + ' von ' + photos.length + ' vergrößern: ' + p.alt, 'data-index': String(i) }, [img]);
    if (i === photos.length - 1) btn.appendChild(h('span', { class: 'gal-more', 'aria-hidden': 'true' }, [icon('plus'), photos.length + ' Fotos']));
    gal.appendChild(btn);
  });

  /* ---------- text + lists ---------- */
  g.text.forEach(function (t) { F('detail-text').appendChild(h('p', { text: t })); });
  var incl = (it.inklusive || ['Flug', 'Hotel']).slice();
  if (it.id === 'deutschland') incl = ['Hotel oder Ferienwohnung'];
  if (it.id === 'kreuzfahrt') incl = ['Kabine', 'Vollpension an Bord'];
  incl = incl.concat(['Persönlicher Berater vor, während und nach der Reise', 'Alle Reiseunterlagen gebündelt']);
  incl.forEach(function (x) { F('detail-incl').appendChild(h('li', null, [icon('check'), x])); });
  g.highlights.forEach(function (x) { F('detail-hl').appendChild(h('li', null, [icon('sun'), x])); });
  g.nichtInklusive.forEach(function (x) { F('detail-nicht').appendChild(h('li', null, [icon('plus'), x])); });
  F('detail-hinweis').textContent = K.hinweis + (it.zusatz ? ' Preis ' + it.zusatz + '.' : '');

  /* ---------- aside ---------- */
  F('aside-price').textContent = K.preisText(it);
  F('aside-unit').textContent = it.einheit;
  var zimmer = it.id === 'kreuzfahrt' ? 'p. P. in der Doppelkabine' : 'p. P. im Doppelzimmer';
  [['Dauer', it.dauer, 'calendar'], ['Leistungen', (it.inklusive || ['Flug', 'Hotel']).join(' · '), 'suitcase'], ['Basis', zimmer, 'bed']].concat(it.zusatz ? [['Hinweis', it.zusatz, 'info']] : []).forEach(function (r) {
    F('aside-details').appendChild(h('li', null, [h('span', { class: 'd-label', text: r[0] }), h('span', { class: 'd-val', text: r[1] }), icon(r[2])]));
  });
  F('aside-book').setAttribute('href', 'buchen?item=' + encodeURIComponent(it.id));
  F('aside-book').setAttribute('aria-label', 'Reise buchen: ' + it.name);

  /* ---------- related ---------- */
  var pool = K.angebote.concat(K.pakete).filter(function (x) { return x.id !== it.id && G[x.id]; });
  var start = Math.max(0, pool.findIndex(function (x) { return x.gruppe === it.gruppe; }));
  var picks = [];
  for (var k = 0; picks.length < 3 && k < pool.length; k++) picks.push(pool[(start + k + (it.id.length % 3)) % pool.length]);
  picks.forEach(function (x, i) { F('more-cards').appendChild(UI.card(x, i)); });
  if (UI.reveal) UI.reveal();

  /* ---------- lightbox ---------- */
  var lb = F('lightbox'), lbImg = F('lb-img'), lbCap = F('lb-cap'), lbCount = F('lb-count');
  var cur = 0, opener = null;
  function show(i) {
    cur = (i + photos.length) % photos.length;
    var p = photos[cur];
    lbImg.src = src(p, 'big'); lbImg.alt = p.alt;
    lbCap.textContent = p.alt + ' · Foto: ' + p.foto + ' / Unsplash';
    lbCount.textContent = 'Foto ' + (cur + 1) + ' von ' + photos.length;
    // preload neighbour
    var n = new Image(); n.src = src(photos[(cur + 1) % photos.length], 'big');
  }
  function open(i) {
    opener = doc.activeElement;
    show(i);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    doc.body.classList.add('lock');
    if (window.RG_LENIS) window.RG_LENIS.stop();
    F('lb-close').focus();
  }
  function close() { if (lb.open) lb.close(); }
  lb.addEventListener('close', function () {
    doc.body.classList.remove('lock');
    if (window.RG_LENIS) window.RG_LENIS.start();
    if (opener) opener.focus();
  });
  gal.addEventListener('click', function (e) { var b = e.target.closest('.gal-item'); if (b) open(+b.getAttribute('data-index')); });
  F('lb-close').addEventListener('click', close);
  F('lb-prev').addEventListener('click', function () { show(cur - 1); });
  F('lb-next').addEventListener('click', function () { show(cur + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
  });
  // swipe on touch screens
  var x0 = null;
  lb.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  lb.addEventListener('pointerup', function (e) {
    if (x0 === null) return; var dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });
  window.RG_DETAIL_TEST = { open: open, close: close, show: show, count: photos.length };
})();
