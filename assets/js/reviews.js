/* ReiseGlück (Demo) – Bewertungen
   Sicherheit: Nutzertext wird ausschließlich per textContent ausgegeben (nie innerHTML),
   Länge begrenzt und Links entfernt. Eigene Bewertungen bleiben nur im localStorage
   dieses Browsers. Kein Review-/AggregateRating-Markup (Demo-Daten). */
(function () {
  'use strict';
  var doc = document;
  var UI = window.RG_UI, h = UI.h, icon = UI.icon;
  var DEMO = window.RG_BEWERTUNGEN || [];
  var TYPEN = window.RG_BEWERTUNG_TYPEN || {};
  var LS_KEY = 'rg-bewertungen-v1';
  var LIMITS = { name: 30, titelMin: 3, titel: 80, textMin: 30, text: 800 };

  /* ---------- Sanitizing ---------- */
  var URL_RE = /(?:https?:\/\/|ftp:\/\/|www\.)\S+/gi;
  var DOMAIN_RE = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:de|com|net|org|info|eu|io|at|ch|biz|xyz|ru|co|me|app|shop|online)\b(?:\/\S*)?/gi;
  var MAIL_RE = /\S+@\S+\.\S+/g;
  var CTRL_RE = new RegExp('[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]', 'g');
  function clean(str, max, multiline) {
    var s = String(str == null ? '' : str);
    s = s.replace(CTRL_RE, '');
    s = s.replace(URL_RE, '').replace(MAIL_RE, '').replace(DOMAIN_RE, '');
    s = multiline ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
    s = s.trim();
    return s.slice(0, max);
  }

  function loadOwn() {
    try {
      var raw = window.localStorage.getItem(LS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (r) { return r && typeof r === 'object'; }).map(function (r) {
        var st = parseInt(r.sterne, 10);
        return {
          id: clean(r.id, 40), own: true,
          name: clean(r.name, LIMITS.name), typ: TYPEN[r.typ] ? r.typ : 'pauschal',
          sterne: st >= 1 && st <= 5 ? st : 5,
          datum: /^\d{4}-\d{2}-\d{2}$/.test(r.datum) ? r.datum : new Date().toISOString().slice(0, 10),
          titel: clean(r.titel, LIMITS.titel), text: clean(r.text, LIMITS.text, true), ts: +r.ts || 0
        };
      }).filter(function (r) { return r.titel && r.text; });
    } catch (e) { return []; }
  }
  var memoryOwn = null; // fallback if storage blocked
  function getOwn() { return memoryOwn || loadOwn(); }
  function saveOwn(list) {
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(list)); memoryOwn = null; return true; }
    catch (e) { memoryOwn = list; return false; }
  }

  /* ---------- Render ---------- */
  var monthFmt = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
  function starsEl(n) {
    var wrap = h('span', { class: 'stars', role: 'img', 'aria-label': n + ' von 5 Sternen' });
    for (var i = 1; i <= 5; i++) wrap.appendChild(icon('star', 'i-fill' + (i > n ? ' off' : '')));
    return wrap;
  }
  function reviewEl(r) {
    var tag = r.own
      ? h('span', { class: 'tag-own', text: 'Ihre Bewertung · nur in Ihrem Browser' })
      : h('span', { class: 'tag-demo', text: 'Demo-Beispiel' });
    var date = monthFmt.format(new Date(r.datum + 'T12:00:00'));
    return h('article', { class: 'review', 'data-id': r.id, tabindex: r.own ? '-1' : null }, [
      h('div', { class: 'review-top' }, [starsEl(r.sterne), tag]),
      h('h3', { text: r.titel }),
      h('p', { text: r.text }),
      h('div', { class: 'review-meta' }, [
        h('span', null, [h('b', { text: r.name || 'Anonym' }), ' · ' + (TYPEN[r.typ] || '')]),
        h('span', { text: date })
      ])
    ]);
  }
  window.RG_REVIEWS_UI = { clean: clean, reviewEl: reviewEl };

  /* ---------- Start page highlights ---------- */
  var hl = doc.querySelector('[data-review-highlights]');
  if (hl) {
    DEMO.filter(function (r) { return r.highlight; }).forEach(function (r) { hl.appendChild(h('div', null, [reviewEl(r)])); });
    var car = hl.closest('[data-carousel]');
    if (car) car.dispatchEvent(new CustomEvent('rg:rendered'));
  }

  /* ---------- Full page ---------- */
  var list = doc.getElementById('rv-list');
  if (!list) return;
  var avgEl = doc.getElementById('rv-avg'), avgStars = doc.getElementById('rv-avg-stars'), countEl = doc.getElementById('rv-count');
  var bars = doc.getElementById('rv-bars'), sortSel = doc.getElementById('rv-sort'), status = doc.getElementById('rv-status');
  var chips = doc.querySelector('[data-rv-filter]');
  var state = { filter: 'alle', sort: 'neueste' };
  var nf = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function all() { return getOwn().concat(DEMO.map(function (r) { return Object.assign({ own: false, ts: 0 }, r); })); }

  function render(focusId) {
    var items = all().filter(function (r) { return state.filter === 'alle' || r.typ === state.filter; });
    items.sort(function (a, b) {
      if (state.sort === 'beste' && b.sterne !== a.sterne) return b.sterne - a.sterne;
      if (a.datum !== b.datum) return a.datum < b.datum ? 1 : -1;
      return (b.ts || 0) - (a.ts || 0);
    });
    list.textContent = '';
    if (!items.length) list.appendChild(h('p', { class: 'rv-empty', text: 'Für diese Reiseart gibt es noch keine Bewertungen. Wählen Sie „Alle“ oder schreiben Sie die erste.' }));
    items.forEach(function (r) { list.appendChild(reviewEl(r)); });

    // stats from shown reviews
    var n = items.length, sum = 0, dist = [0, 0, 0, 0, 0];
    items.forEach(function (r) { sum += r.sterne; dist[r.sterne - 1]++; });
    var avg = n ? sum / n : 0;
    avgEl.textContent = n ? nf.format(avg) : '–';
    avgStars.textContent = ''; avgStars.appendChild(starsEl(Math.round(avg)));
    var label = state.filter === 'alle' ? '' : ' (' + TYPEN[state.filter] + ')';
    countEl.textContent = n === 1 ? 'aus 1 Bewertung' + label : 'aus ' + n + ' Bewertungen' + label;
    bars.textContent = '';
    for (var s = 5; s >= 1; s--) {
      var c = dist[s - 1], pct = n ? Math.round(c / n * 100) : 0;
      var fill = h('span'); fill.style.width = pct + '%';
      bars.appendChild(h('li', { 'aria-label': s + (s === 1 ? ' Stern: ' : ' Sterne: ') + c + ' von ' + n }, [
        h('span', { 'aria-hidden': 'true', text: s + ' ★' }),
        h('span', { class: 'rv-bar', 'aria-hidden': 'true' }, [fill]),
        h('span', { 'aria-hidden': 'true', text: String(c) })
      ]));
    }
    if (status) status.textContent = n + (n === 1 ? ' Bewertung' : ' Bewertungen') + ' angezeigt, Durchschnitt ' + (n ? nf.format(avg) : 'keiner') + ' von 5 Sternen.';
    if (focusId) { var el = list.querySelector('[data-id="' + focusId + '"]'); if (el) el.focus(); }
  }

  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    state.filter = b.getAttribute('data-filter');
    chips.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
    render();
  });
  sortSel.addEventListener('change', function () { state.sort = sortSel.value; render(); });

  /* ---------- Form ---------- */
  var form = doc.getElementById('rv-form');
  var sum = form.querySelector('.err-summary');
  var done = doc.getElementById('rv-done');
  var textArea = doc.getElementById('rv-text'), counter = doc.getElementById('rv-text-count');
  function updateCount() { counter.textContent = textArea.value.length + ' / ' + LIMITS.text + ' Zeichen'; }
  textArea.addEventListener('input', updateCount); updateCount();

  function setErr(id, msg) {
    var f = doc.getElementById(id), e = doc.getElementById(id + '-err');
    if (msg) { if (f) f.setAttribute('aria-invalid', 'true'); e.textContent = ''; e.appendChild(icon('alert')); e.appendChild(doc.createTextNode(msg)); }
    else { if (f) f.removeAttribute('aria-invalid'); e.textContent = ''; }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errs = [];
    var name = clean(form.elements['rv-name'].value, LIMITS.name);
    var typ = form.elements['rv-typ'].value;
    var st = form.querySelector('input[name="rv-sterne"]:checked');
    var titel = clean(form.elements['rv-titel'].value, LIMITS.titel);
    var text = clean(textArea.value, LIMITS.text, true);
    var consent = form.elements['rv-consent'].checked;

    var rawName = form.elements['rv-name'].value.trim();
    if (rawName.length > LIMITS.name) errs.push(['rv-name', 'Der Vorname darf höchstens ' + LIMITS.name + ' Zeichen haben.']);
    if (!TYPEN[typ]) errs.push(['rv-typ', 'Bitte wählen Sie die Reiseart aus.']);
    if (!st) errs.push(['rv-sterne', 'Bitte vergeben Sie 1 bis 5 Sterne.']);
    if (titel.length < LIMITS.titelMin) errs.push(['rv-titel', 'Bitte geben Sie einen Titel mit mindestens ' + LIMITS.titelMin + ' Zeichen ein.']);
    if (form.elements['rv-titel'].value.trim().length > LIMITS.titel) errs.push(['rv-titel', 'Der Titel darf höchstens ' + LIMITS.titel + ' Zeichen haben.']);
    if (textArea.value.trim().length > LIMITS.text) errs.push(['rv-text', 'Der Text darf höchstens ' + LIMITS.text + ' Zeichen haben.']);
    else if (text.length < LIMITS.textMin) errs.push(['rv-text', 'Bitte schreiben Sie mindestens ' + LIMITS.textMin + ' Zeichen' + (text.length < textArea.value.trim().length ? ' (Links werden entfernt)' : '') + '.']);
    if (!consent) errs.push(['rv-consent', 'Bitte stimmen Sie zu, damit wir die Bewertung anzeigen dürfen.']);

    ['rv-name', 'rv-typ', 'rv-sterne', 'rv-titel', 'rv-text', 'rv-consent'].forEach(function (id) {
      var hit = errs.filter(function (x) { return x[0] === id; })[0];
      setErr(id, hit ? hit[1] : '');
    });
    if (errs.length) {
      sum.hidden = false;
      sum.querySelector('h2').textContent = errs.length === 1 ? 'Bitte prüfen Sie 1 Angabe:' : 'Bitte prüfen Sie ' + errs.length + ' Angaben:';
      var ul = sum.querySelector('ul'); ul.textContent = '';
      errs.forEach(function (x) { ul.appendChild(h('li', null, [h('a', { href: '#' + (x[0] === 'rv-sterne' ? 'rv-s5' : x[0]), text: x[1] })])); });
      sum.focus();
      return;
    }
    sum.hidden = true;
    var own = getOwn();
    var item = { id: 'u' + Date.now(), name: name, typ: typ, sterne: parseInt(st.value, 10), datum: new Date().toISOString().slice(0, 10), titel: titel, text: text, ts: Date.now() };
    own.unshift(item);
    var stored = saveOwn(own.map(function (r) { return { id: r.id, name: r.name, typ: r.typ, sterne: r.sterne, datum: r.datum, titel: r.titel, text: r.text, ts: r.ts }; }));
    form.reset(); updateCount();
    done.hidden = false;
    doc.getElementById('rv-done-store').textContent = stored ? '' : ' Ihr Browser erlaubt keine lokale Speicherung, daher verschwindet die Bewertung beim Neuladen.';
    state.filter = 'alle';
    chips.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === 'alle')); });
    state.sort = 'neueste'; sortSel.value = 'neueste';
    render(item.id);
  });
  sum.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return; e.preventDefault();
    var t = doc.getElementById(a.getAttribute('href').slice(1)); if (t) t.focus();
  });

  render();
})();
