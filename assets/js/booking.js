/* ReiseGlück (Demo) – geführte Buchungsanfrage
   - Vorauswahl per buchen.html?item=<id>
   - Fortschritt in sessionStorage (nach Bestätigung gelöscht)
   - Nichts wird gesendet oder gespeichert (Demo) */
(function () {
  'use strict';
  var doc = document;
  var K = window.RG_KATALOG, UI = window.RG_UI, h = UI.h, icon = UI.icon;
  var form = doc.getElementById('book-form');
  if (!form || !K) return;

  var SS_KEY = 'rg-buchung-v1';
  var MAX_ERW = 9, MAX_KIND = 6, MAX_WUNSCH = 1000;
  var STEP_NAMES = ['Auswahl', 'Reisedetails', 'Kontakt', 'Zusammenfassung'];
  var df = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  /* ---------- date helpers (local time, ISO yyyy-mm-dd) ---------- */
  function iso(d) { var m = d.getMonth() + 1, day = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day; }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function parse(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null; var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }
  function fmt(s) { var d = parse(s); return d ? df.format(d) : ''; }

  /* ---------- state ---------- */
  var DEFAULTS = { step: 1, item: '', modus: 'fest', abreise: '', rueckreise: '', zeitraum: '', flexibel: false, erwachsene: 2, kinder: 0, kinderAlter: [], abflug: 'Berlin (BER)', zimmer: 'Doppelzimmer', wuensche: '', name: '', email: '', telefon: '', kontaktzeit: 'Egal' };
  var state = Object.assign({}, DEFAULTS);
  try { var saved = JSON.parse(window.sessionStorage.getItem(SS_KEY) || 'null'); if (saved && typeof saved === 'object') state = Object.assign({}, DEFAULTS, saved); } catch (e) { /* storage blocked: start fresh */ }
  var param = new URLSearchParams(window.location.search).get('item');
  if (param && K.finde(param)) { if (param !== state.item) { state.item = param; state.step = 1; } }
  if (!K.finde(state.item)) state.item = '';
  state.step = Math.min(4, Math.max(1, state.step | 0));
  if (!state.item) state.step = 1;
  function save() { try { window.sessionStorage.setItem(SS_KEY, JSON.stringify(state)); } catch (e) { } }
  function clearSaved() { try { window.sessionStorage.removeItem(SS_KEY); } catch (e) { } }

  function item() { return K.finde(state.item); }
  function isService() { var it = item(); return it && it.gruppe === 'service'; }
  function isLM() { var it = item(); return it && it.lastMinuteTage; }
  function reisende() { return state.erwachsene + state.kinder; }

  /* ---------- Step 1: pick cards (from catalog) ---------- */
  var groups = [
    { key: 'angebote', title: 'Beispielangebote', list: K.angebote },
    { key: 'pakete', title: 'Pakete', list: K.pakete },
    { key: 'services', title: 'Services', list: K.services }
  ];
  var pickWrap = doc.getElementById('pick-groups');
  groups.forEach(function (g) {
    var fs = h('fieldset', { class: 'pick-group' }, [h('legend', { text: g.title })]);
    var grid = h('div', { class: 'picks' });
    g.list.forEach(function (it) {
      var id = 'pick-' + it.id;
      var input = h('input', { type: 'radio', name: 'item', id: id, value: it.id, 'aria-describedby': id + '-d' });
      var meta = it.basis === 'pp' ? (it.einheit + ' · ' + it.dauer) : 'pauschal';
      var lab = h('label', { class: 'pick' }, [input, h('span', { class: 'pick-card' }, [
        h('strong', { text: it.name }), h('span', { class: 'pp', text: K.preisText(it) }),
        h('small', { id: id + '-d', text: it.kurz + ' · ' + meta })
      ])]);
      grid.appendChild(lab);
    });
    fs.appendChild(grid); pickWrap.appendChild(fs);
  });

  /* ---------- field refs ---------- */
  var F = function (id) { return doc.getElementById(id); };
  var steps = form.querySelectorAll('.book-step');
  var progress = F('progress').querySelectorAll('li');
  var errBox = F('book-errors');
  var btnBack = F('btn-back'), btnNext = F('btn-next');

  /* ---------- write state -> form ---------- */
  function hydrate() {
    var r = form.querySelector('input[name="item"][value="' + state.item + '"]'); if (r) r.checked = true;
    form.querySelectorAll('input[name="modus"]').forEach(function (x) { x.checked = x.value === state.modus; });
    F('abreise').value = state.abreise; F('rueckreise').value = state.rueckreise; F('zeitraum').value = state.zeitraum;
    F('flexibel').checked = !!state.flexibel;
    F('abflug').value = state.abflug; F('zimmer').value = state.zimmer; F('wuensche').value = state.wuensche;
    F('name').value = state.name; F('email').value = state.email; F('telefon').value = state.telefon;
    form.querySelectorAll('input[name="kontaktzeit"]').forEach(function (x) { x.checked = x.value === state.kontaktzeit; });
    renderCounts(); renderKids(); applyItemRules(); updateWishCount();
  }

  function renderCounts() {
    F('erwachsene').textContent = String(state.erwachsene);
    F('kinder').textContent = String(state.kinder);
    form.querySelector('[data-count="erwachsene"][data-delta="-1"]').disabled = state.erwachsene <= 1;
    form.querySelector('[data-count="erwachsene"][data-delta="1"]').disabled = state.erwachsene >= MAX_ERW;
    form.querySelector('[data-count="kinder"][data-delta="-1"]').disabled = state.kinder <= 0;
    form.querySelector('[data-count="kinder"][data-delta="1"]').disabled = state.kinder >= MAX_KIND;
  }

  function renderKids() {
    var wrap = F('kids-ages'), fs = F('kids-ages-wrap');
    state.kinderAlter = state.kinderAlter.slice(0, state.kinder);
    while (state.kinderAlter.length < state.kinder) state.kinderAlter.push('');
    fs.hidden = state.kinder === 0;
    wrap.textContent = '';
    state.kinderAlter.forEach(function (age, i) {
      var id = 'kind-' + (i + 1);
      var sel = h('select', { class: 'input', id: id, 'data-kid': String(i), 'aria-describedby': id + '-err' }, [h('option', { value: '', text: 'Bitte wählen' })]);
      for (var a = 0; a <= 17; a++) sel.appendChild(h('option', { value: String(a), text: a === 0 ? 'unter 1 Jahr' : a + (a === 1 ? ' Jahr' : ' Jahre') }));
      sel.value = age;
      wrap.appendChild(h('div', { class: 'field', style: 'margin:0' }, [h('label', { for: id, text: 'Kind ' + (i + 1) }), sel, h('p', { class: 'err', id: id + '-err' })]));
    });
  }

  function applyItemRules() {
    var t = today(), svc = isService(), lm = isLM();
    var ab = F('abreise'), rk = F('rueckreise');
    ab.min = iso(t);
    if (lm) ab.max = iso(addDays(t, lm)); else ab.removeAttribute('max');
    var abD = parse(state.abreise);
    rk.min = iso(addDays(abD && abD >= t ? abD : t, 1));
    F('abreise-hint').textContent = lm ? 'Zwischen heute und ' + fmt(iso(addDays(t, lm))) + '.' : 'Frühestens heute.';
    F('lm-note').hidden = !lm;
    // Last Minute needs fixed dates
    F('modus-zeitraum-wrap').hidden = !!lm;
    if (lm && state.modus !== 'fest') { state.modus = 'fest'; form.querySelector('input[name="modus"][value="fest"]').checked = true; }
    F('dates-fixed').hidden = state.modus !== 'fest';
    F('dates-range').hidden = state.modus !== 'zeitraum';
    form.querySelectorAll('[data-opt-service]').forEach(function (s) { s.hidden = !svc; });
    F('step2-intro').textContent = svc
      ? 'Für einen Service reichen grobe Angaben. Reisedaten sind optional, falls sie noch nicht feststehen.'
      : 'Grobe Angaben reichen. Ihr Berater klärt Details persönlich mit Ihnen.';
    updateAside();
  }

  function updateWishCount() { F('wuensche-count').textContent = F('wuensche').value.length + ' / ' + MAX_WUNSCH + ' Zeichen'; }

  /* ---------- read form -> state ---------- */
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.name === 'item') { state.item = t.value; applyItemRules(); clearFieldErr('item'); }
    else if (t.name === 'modus') { state.modus = t.value; applyItemRules(); }
    else if (t.name === 'kontaktzeit') state.kontaktzeit = t.value;
    else if (t.hasAttribute('data-kid')) state.kinderAlter[+t.getAttribute('data-kid')] = t.value;
    else if (t.id === 'flexibel') state.flexibel = t.checked;
    else if (t.id && Object.prototype.hasOwnProperty.call(DEFAULTS, t.id)) {
      state[t.id] = t.value;
      if (t.id === 'abreise') applyItemRules();
      if (t.id === 'wuensche') updateWishCount();
    }
    if (t.id === 'consent') clearFieldErr('consent');
    save();
  });
  form.addEventListener('change', function (e) { if (e.target.hasAttribute('data-kid')) { state.kinderAlter[+e.target.getAttribute('data-kid')] = e.target.value; save(); } });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-count]'); if (!b) return;
    var k = b.getAttribute('data-count'), d = +b.getAttribute('data-delta');
    var max = k === 'erwachsene' ? MAX_ERW : MAX_KIND, min = k === 'erwachsene' ? 1 : 0;
    state[k] = Math.min(max, Math.max(min, state[k] + d));
    renderCounts();
    if (k === 'kinder') renderKids();
    updateAside(); save();
    if (b.disabled) { var other = b.parentNode.querySelector('button:not([disabled])'); if (other) other.focus(); }
  });

  /* ---------- validation ---------- */
  function setFieldErr(id, msg) {
    var f = F(id), e = F(id + '-err');
    if (f && f.tagName !== 'DIV') f.setAttribute('aria-invalid', 'true');
    if (e) { e.textContent = ''; e.appendChild(icon('alert')); e.appendChild(doc.createTextNode(msg)); }
  }
  function clearFieldErr(id) { var f = F(id), e = F(id + '-err'); if (f) f.removeAttribute('aria-invalid'); if (e) e.textContent = ''; }

  function validate(step) {
    var errs = [], t = today(), svc = isService(), lm = isLM();
    if (step === 1) {
      if (!item()) errs.push({ id: 'item', focus: 'pick-' + (K.angebote[0].id), msg: 'Bitte wählen Sie ein Angebot, ein Paket oder einen Service.' });
    }
    if (step === 2) {
      if (state.modus === 'fest') {
        var a = parse(state.abreise), r = parse(state.rueckreise);
        var rawA = F('abreise').value, rawR = F('rueckreise').value;
        if (!a) { if (!svc || rawA) errs.push({ id: 'abreise', msg: rawA ? 'Bitte geben Sie ein gültiges Abreisedatum ein.' : 'Bitte wählen Sie Ihren Abreisetag.' }); }
        else if (a < t) errs.push({ id: 'abreise', msg: 'Die Abreise liegt in der Vergangenheit. Bitte wählen Sie ein Datum ab heute.' });
        else if (lm && a > addDays(t, lm)) errs.push({ id: 'abreise', msg: 'Last Minute gilt nur für Abreisen bis ' + fmt(iso(addDays(t, lm))) + '. Für spätere Termine wählen Sie bitte ein anderes Paket.' });
        if (!r) { if (!svc || rawR || a) errs.push({ id: 'rueckreise', msg: rawR ? 'Bitte geben Sie ein gültiges Rückreisedatum ein.' : 'Bitte wählen Sie Ihren Rückreisetag.' }); }
        else if (a && r <= a) errs.push({ id: 'rueckreise', msg: 'Die Rückreise muss nach der Abreise liegen.' });
        else if (r < t) errs.push({ id: 'rueckreise', msg: 'Die Rückreise liegt in der Vergangenheit.' });
      } else {
        var z = state.zeitraum.trim();
        if (!svc && z.length < 3) errs.push({ id: 'zeitraum', msg: 'Bitte beschreiben Sie Ihren Wunschzeitraum, z. B. „Juli, 2 Wochen“.' });
      }
      state.kinderAlter.forEach(function (age, i) { if (age === '') errs.push({ id: 'kind-' + (i + 1), msg: 'Bitte wählen Sie das Alter von Kind ' + (i + 1) + '.' }); });
      if (state.wuensche.length > MAX_WUNSCH) errs.push({ id: 'wuensche', msg: 'Bitte kürzen Sie Ihre Wünsche auf höchstens ' + MAX_WUNSCH + ' Zeichen.' });
    }
    if (step === 3) {
      var n = state.name.trim();
      if (n.length < 2) errs.push({ id: 'name', msg: 'Bitte geben Sie Ihren Namen ein.' });
      var em = state.email.trim();
      if (!em) errs.push({ id: 'email', msg: 'Bitte geben Sie Ihre E-Mail-Adresse ein, damit Ihr Berater antworten kann.' });
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) errs.push({ id: 'email', msg: 'Bitte prüfen Sie die E-Mail-Adresse, z. B. name@beispiel.de.' });
      var tel = state.telefon.trim();
      if (tel && !/^[+()0-9\s/-]{6,20}$/.test(tel)) errs.push({ id: 'telefon', msg: 'Bitte nur Ziffern, Leerzeichen, + oder - verwenden (6 bis 20 Zeichen).' });
    }
    if (step === 4) {
      if (!F('consent').checked) errs.push({ id: 'consent', msg: 'Bitte stimmen Sie der Verwendung Ihrer Angaben zu, damit wir die Anfrage bearbeiten können.' });
    }
    return errs;
  }

  function showErrors(step, errs) {
    var stepEl = steps[step - 1];
    stepEl.querySelectorAll('.err').forEach(function (e) { e.textContent = ''; });
    stepEl.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); });
    if (step === 4) clearFieldErr('consent');
    if (!errs.length) { errBox.hidden = true; return; }
    errs.forEach(function (er) { setFieldErr(er.id, er.msg); });
    errBox.hidden = false;
    errBox.querySelector('h2').textContent = errs.length === 1 ? 'Bitte prüfen Sie 1 Angabe:' : 'Bitte prüfen Sie ' + errs.length + ' Angaben:';
    var ul = errBox.querySelector('ul'); ul.textContent = '';
    errs.forEach(function (er) { ul.appendChild(h('li', null, [h('a', { href: '#' + (er.focus || er.id), text: er.msg })])); });
    errBox.focus();
  }
  errBox.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return; e.preventDefault();
    var t = F(a.getAttribute('href').slice(1)); if (t) { t.focus(); t.scrollIntoView({ block: 'center' }); }
  });

  /* ---------- summary (boarding pass) ---------- */
  function field(label, value, cls) { return h('div', { class: 'pass-field' + (cls ? ' ' + cls : '') }, [h('dt', { text: label }), h('dd', { text: value || '–' })]); }
  function editBtn(step) { return h('button', { type: 'button', class: 'link-arrow', style: 'background:none;border:0;padding:0;cursor:pointer;font-size:.875rem', 'data-goto': String(step) }, [STEP_NAMES[step - 1] + ' bearbeiten']); }

  function zeitraumText() {
    var flex = state.flexibel ? ' (flexibel)' : '';
    if (state.modus === 'fest') {
      if (!state.abreise && !state.rueckreise) return 'noch offen' + flex;
      var nights = '';
      var a = parse(state.abreise), r = parse(state.rueckreise);
      if (a && r) { var n = Math.round((r - a) / 86400000); nights = ' · ' + n + (n === 1 ? ' Nacht' : ' Nächte'); }
      return fmt(state.abreise) + ' bis ' + fmt(state.rueckreise) + nights + flex;
    }
    return (state.zeitraum.trim() || 'noch offen') + flex;
  }
  function reisendeText() {
    var t = state.erwachsene + (state.erwachsene === 1 ? ' Erwachsene/r' : ' Erwachsene');
    if (state.kinder) t += ', ' + state.kinder + (state.kinder === 1 ? ' Kind' : ' Kinder') + ' (' + state.kinderAlter.map(function (a) { return a === '0' ? 'unter 1' : a; }).join(', ') + ' J.)';
    return t;
  }

  function buildPass(ref) {
    var it = item(), est = K.schaetzung(it, reisende());
    var head = h('div', { class: 'pass-head' }, [
      h('img', { class: 'logo-white', src: 'assets/logo/logo-white.svg', alt: 'ReiseGlück Reisebüro', width: '132', height: '30' }),
      h('img', { class: 'logo-dark', src: 'assets/logo/logo.svg', alt: '', width: '132', height: '30', style: 'display:none' }),
      h('span', { class: 'mono', text: ref ? 'Referenz ' + ref : 'Unverbindliche Anfrage' })
    ]);
    var main = h('dl', { class: 'pass-main' }, [
      field('Auswahl', it.name, 'wide big'),
      field('Preisbasis', K.preisText(it) + ' ' + it.einheit + (it.dauer ? ' · ' + it.dauer : '')),
      field('Zeitraum', zeitraumText()),
      field('Reisende', reisendeText()),
      field('Abflughafen', state.abflug),
      field('Zimmerwunsch', state.zimmer),
      field('Ihre Wünsche', state.wuensche.trim() || 'keine Angabe', 'wide'),
      field('Kontakt', state.name.trim() + ' · ' + state.email.trim() + (state.telefon.trim() ? ' · ' + state.telefon.trim() : '')),
      field('Erreichbar', state.kontaktzeit)
    ]);
    main.querySelector('.pass-field dd').classList.add('big');
    var detail = est.detail;
    if (it.basis === 'pp' && state.kinder) detail += (/\.$/.test(detail) ? ' ' : '. ') + 'Kinderpreise prüft Ihr Berater, die Schätzung rechnet mit dem Erwachsenenpreis.';
    var total = h('dl', { class: 'pass-total' }, [h('dt', { text: 'Preis-Schätzung (Beispielpreis, Demo)' }), h('dd', null, [est.text, h('span', { class: 'detail', text: detail })])]);
    var foot = h('div', { class: 'pass-foot' }, [total, h('div', { class: 'barcode', 'aria-hidden': 'true' })]);
    var pass = h('div', { class: 'pass' }, [head, main, h('div', { class: 'pass-tear', 'aria-hidden': 'true' }), foot]);
    return pass;
  }

  function renderSummary() {
    var box = F('summary'); box.textContent = '';
    var edits = h('p', { class: 'note', style: 'display:flex;gap:18px;flex-wrap:wrap;margin:0 0 12px' }, [editBtn(1), editBtn(2), editBtn(3)]);
    box.appendChild(edits);
    box.appendChild(buildPass(null));
    box.appendChild(h('p', { class: 'note', style: 'margin-top:12px', text: K.hinweis + ' Die Schätzung ist kein verbindlicher Preis.' }));
  }
  F('summary').addEventListener('click', function (e) { var b = e.target.closest('[data-goto]'); if (b) go(+b.getAttribute('data-goto')); });

  /* ---------- aside ---------- */
  function updateAside() {
    var it = item();
    F('aside-empty').hidden = !!it; F('aside-sel').hidden = !it;
    if (!it) return;
    var est = K.schaetzung(it, reisende());
    F('aside-name').textContent = it.name;
    F('aside-price').textContent = est.text;
    var kurz = state.erwachsene + (state.erwachsene === 1 ? ' Erwachsene/r' : ' Erwachsene') + (state.kinder ? ', ' + state.kinder + (state.kinder === 1 ? ' Kind' : ' Kinder') : '');
    F('aside-detail').textContent = (it.basis === 'pp' ? kurz + ' · ' : '') + 'Beispielpreis (Demo)';
  }

  /* ---------- navigation ---------- */
  function render(focus) {
    steps.forEach(function (s, i) { s.hidden = (i + 1) !== state.step; });
    progress.forEach(function (li, i) {
      var n = i + 1;
      li.classList.toggle('done', n < state.step);
      if (n === state.step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    btnBack.hidden = state.step === 1;
    btnNext.textContent = '';
    if (state.step === 4) { btnNext.appendChild(doc.createTextNode('Unverbindlich anfragen')); }
    else { btnNext.appendChild(doc.createTextNode('Weiter zu ' + STEP_NAMES[state.step])); btnNext.appendChild(icon('arrow', 'i-arrow')); }
    if (state.step === 4) renderSummary();
    doc.title = 'Schritt ' + state.step + ' von 4: ' + STEP_NAMES[state.step - 1] + ' | Reise buchen | ReiseGlück';
    if (focus) {
      var hd = steps[state.step - 1].querySelector('h2');
      hd.focus({ preventScroll: true });
      var top = F('book-flow').getBoundingClientRect().top + window.scrollY - 100;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'auto' });
    }
  }
  function go(step, push) {
    state.step = step; save();
    errBox.hidden = true;
    if (push !== false) { try { history.pushState({ rgStep: step }, '', window.location.pathname + '?item=' + encodeURIComponent(state.item || '') + '#schritt-' + step); } catch (e) { } }
    render(true);
  }
  window.addEventListener('popstate', function (e) {
    var s = e.state && e.state.rgStep;
    if (s && s !== state.step && F('book-done').hidden) { state.step = s; save(); errBox.hidden = true; render(true); }
  });

  btnBack.addEventListener('click', function () { if (state.step > 1) go(state.step - 1); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errs = validate(state.step);
    showErrors(state.step, errs);
    if (errs.length) return;
    if (state.step < 4) { go(state.step + 1); return; }
    finish();
  });

  function finish() {
    var ref = 'RG-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));
    var pass = buildPass(ref);
    F('done-pass').textContent = ''; F('done-pass').appendChild(pass);
    F('done-ref-inline').textContent = ref;
    F('book-flow').hidden = true;
    F('book-done').hidden = false;
    clearSaved();
    doc.title = 'Anfrage ' + ref + ' erstellt | ReiseGlück';
    try { history.replaceState({ rgDone: true }, '', window.location.pathname); } catch (e) { }
    var t = F('done-title'); t.focus({ preventScroll: true });
    window.scrollTo({ top: F('booking').getBoundingClientRect().top + window.scrollY - 100, behavior: 'auto' });
  }
  F('btn-print').addEventListener('click', function () { window.print(); });

  /* ---------- init ---------- */
  hydrate();
  try { history.replaceState({ rgStep: state.step }, '', window.location.pathname + (state.item ? '?item=' + encodeURIComponent(state.item) : '') + (state.step > 1 ? '#schritt-' + state.step : '')); } catch (e) { }
  render(false);
  window.RG_BOOKING_TEST = { state: function () { return state; }, schaetzung: K.schaetzung };
})();
