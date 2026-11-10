/* ReiseGlück (Demo) – Terminbuchung mit zwei Beratern
   Verfügbarkeit wird pro Berater, Tag und Uhrzeit deterministisch erzeugt (gleiche Daten bei jedem Besuch).
   Gebuchte Termine liegen nur im localStorage dieses Browsers; es wird nichts gesendet. */
(function () {
  'use strict';
  var root = document.querySelector('[data-cal]');
  if (!root) return;
  var doc = document;
  var $ = function (sel) { return root.querySelector(sel); };

  var ADV = {
    lena: { id: 'lena', name: 'Lena Hoffmann', short: 'Lena', initials: 'LH', color: 'var(--c-lena)',
      hours: { 1: [9, 17.5], 2: [9, 17.5], 3: [9, 17.5], 4: [9, 17.5] }, lunch: 12 },
    jonas: { id: 'jonas', name: 'Jonas Weber', short: 'Jonas', initials: 'JW', color: 'var(--c-jonas)',
      hours: { 2: [10, 18], 3: [10, 18], 4: [10, 18], 5: [9, 18], 6: [9, 13] }, lunch: 13 }
  };
  var ORDER = ['lena', 'jonas'];
  var DAYS_AHEAD = 56, SLOT_MIN = 30, LEAD_HOURS = 2;
  var WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var KEY = 'rg-termine-demo';

  /* ---------- helpers ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dkey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hm(h) { return pad(Math.floor(h)) + ':' + (h % 1 ? '30' : '00'); }
  function plus30(t) { var p = t.split(':'), m = +p[0] * 60 + +p[1] + SLOT_MIN; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function longDate(d) { return WD[d.getDay()] + ', ' + d.getDate() + '. ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function rnd(s) { // deterministic 0..1 from a string
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 1540483477); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* private mode: demo still works for this visit */ } }
  var booked = load();
  function isBooked(adv, date, time) { return booked.some(function (b) { return b.adv === adv && b.date === date && b.time === time; }); }

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + DAYS_AHEAD);

  /* free slots of one advisor on one day */
  function freeSlots(advId, d) {
    var a = ADV[advId], hrs = a.hours[d.getDay()];
    if (!hrs || d < today || d > lastDay) return [];
    var k = dkey(d), out = [], now = new Date(), minTime = now.getTime() + LEAD_HOURS * 3600e3;
    for (var h = hrs[0]; h < hrs[1]; h += 0.5) {
      if (h >= a.lunch && h < a.lunch + 1) continue;
      var t = hm(h);
      var start = new Date(d); start.setHours(Math.floor(h), h % 1 ? 30 : 0, 0, 0);
      if (start.getTime() < minTime) continue;
      if (rnd(advId + k + t) < 0.45) continue; // already taken by someone else (demo)
      if (isBooked(advId, k, t)) continue;
      out.push(t);
    }
    return out;
  }

  /* ---------- state ---------- */
  var state = { mode: 'both', month: new Date(today.getFullYear(), today.getMonth(), 1), day: null, slot: null, last: null };
  function advsInMode() { return state.mode === 'both' ? ORDER : [state.mode]; }
  function dayCounts(d) { var c = {}; advsInMode().forEach(function (id) { c[id] = freeSlots(id, d).length; }); return c; }
  function total(c) { return Object.keys(c).reduce(function (s, k) { return s + c[k]; }, 0); }

  function firstFreeDay(from) {
    var d = new Date(Math.max(from || today, today));
    for (var i = 0; i <= DAYS_AHEAD; i++) { if (total(dayCounts(d))) return d; d.setDate(d.getDate() + 1); }
    return null;
  }

  var el = {
    month: $('[data-cal-month]'), days: $('[data-cal-days]'), prev: $('[data-cal-prev]'), next: $('[data-cal-next]'),
    legend: $('[data-cal-legend]'), dayname: $('[data-cal-dayname]'), slots: $('[data-cal-slots]'),
    formWrap: $('[data-cal-form-wrap]'), form: $('[data-cal-form]'), picked: $('[data-cal-picked]'),
    done: $('[data-cal-done]'), doneText: $('[data-cal-done-text]'), doneTitle: $('[data-cal-done-title]'),
    status: $('[data-cal-status]')
  };
  function say(msg) { el.status.textContent = ''; setTimeout(function () { el.status.textContent = msg; }, 30); }
  function scrollTo(node) {
    if (window.RG_LENIS) window.RG_LENIS.scrollTo(node, { offset: -90 });
    else node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function avatar(id) {
    var s = doc.createElement('span'); s.className = 'avatar avatar-sm'; s.setAttribute('aria-hidden', 'true');
    s.style.setProperty('--c', ADV[id].color); s.textContent = ADV[id].initials; return s;
  }

  /* ---------- month grid ---------- */
  function renderMonth() {
    var m = state.month, y = m.getFullYear(), mo = m.getMonth();
    el.month.textContent = MON[mo] + ' ' + y;
    el.prev.disabled = (y === today.getFullYear() && mo === today.getMonth());
    el.next.disabled = (y > lastDay.getFullYear() || (y === lastDay.getFullYear() && mo >= lastDay.getMonth()));
    el.legend.hidden = state.mode !== 'both';
    el.days.textContent = '';
    var lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    for (var i = 0; i < lead; i++) { var e = doc.createElement('span'); e.className = 'cal-blank'; el.days.appendChild(e); }
    var dim = new Date(y, mo + 1, 0).getDate();
    for (var dnum = 1; dnum <= dim; dnum++) {
      var d = new Date(y, mo, dnum), k = dkey(d), c = dayCounts(d), n = total(c);
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'cal-day'; b.dataset.day = k;
      if (k === dkey(today)) b.classList.add('is-today');
      var num = doc.createElement('span'); num.className = 'cal-num'; num.textContent = dnum; b.appendChild(num);
      var dots = doc.createElement('span'); dots.className = 'cal-dots'; dots.setAttribute('aria-hidden', 'true');
      advsInMode().forEach(function (id) { if (c[id]) { var i2 = doc.createElement('i'); i2.style.setProperty('--c', ADV[id].color); dots.appendChild(i2); } });
      b.appendChild(dots);
      var who = state.mode === 'both' ? advsInMode().filter(function (id) { return c[id]; }).map(function (id) { return ADV[id].short; }).join(' und ') : '';
      b.setAttribute('aria-label', longDate(d) + (n ? ': ' + n + (n === 1 ? ' freier Termin' : ' freie Termine') + (who ? ' bei ' + who : '') : ': keine freien Termine'));
      if (!n) b.disabled = true;
      b.setAttribute('aria-pressed', String(state.day === k));
      el.days.appendChild(b);
    }
  }

  /* ---------- slot list ---------- */
  function renderSlots() {
    el.slots.textContent = '';
    if (!state.day) { el.dayname.textContent = 'Kein freier Termin in den nächsten 8 Wochen.'; return; }
    var d = fromKey(state.day);
    el.dayname.textContent = longDate(d);
    var ids = advsInMode(), byTime = {};
    ids.forEach(function (id) { freeSlots(id, d).forEach(function (t) { (byTime[t] = byTime[t] || []).push(id); }); });
    var times = Object.keys(byTime).sort();
    if (!times.length) { var p = doc.createElement('p'); p.className = 'note'; p.textContent = 'An diesem Tag ist leider nichts mehr frei.'; el.slots.appendChild(p); return; }

    if (state.mode !== 'both') {
      var grid = doc.createElement('div'); grid.className = 'slot-grid';
      times.forEach(function (t) { grid.appendChild(slotBtn(ids[0], t, t, t + ' bis ' + plus30(t) + ' Uhr bei ' + ADV[ids[0]].name)); });
      el.slots.appendChild(grid);
      return;
    }
    var list = doc.createElement('ul'); list.className = 'slot-rows';
    times.forEach(function (t) {
      var li = doc.createElement('li'); li.className = 'slot-row';
      var tl = doc.createElement('span'); tl.className = 'slot-time'; tl.textContent = t; li.appendChild(tl);
      var box = doc.createElement('span'); box.className = 'slot-who';
      byTime[t].forEach(function (id) {
        var b = slotBtn(id, t, ADV[id].short, t + ' bis ' + plus30(t) + ' Uhr bei ' + ADV[id].name);
        b.classList.add('slot-chip'); b.style.setProperty('--c', ADV[id].color);
        b.insertBefore(avatar(id), b.firstChild);
        box.appendChild(b);
      });
      li.appendChild(box); list.appendChild(li);
    });
    el.slots.appendChild(list);
  }
  function slotBtn(id, t, text, label) {
    var b = doc.createElement('button'); b.type = 'button'; b.className = 'slot';
    b.dataset.adv = id; b.dataset.time = t;
    var s = doc.createElement('span'); s.textContent = text; b.appendChild(s);
    b.setAttribute('aria-label', label);
    var sel = state.slot && state.slot.adv === id && state.slot.time === t && state.slot.date === state.day;
    b.setAttribute('aria-pressed', String(!!sel));
    return b;
  }

  function render() { renderMonth(); renderSlots(); }

  function selectFirstDay() {
    var d = firstFreeDay(state.day ? fromKey(state.day) : today) || firstFreeDay(today);
    state.day = d ? dkey(d) : null;
    if (d) state.month = new Date(d.getFullYear(), d.getMonth(), 1);
  }

  /* ---------- events ---------- */
  root.querySelectorAll('input[name="berater"]').forEach(function (r) {
    r.addEventListener('change', function () {
      state.mode = r.value; state.slot = null; el.formWrap.hidden = true;
      var keep = state.day && total(dayCounts(fromKey(state.day)));
      if (!keep) selectFirstDay();
      render();
      say(state.mode === 'both' ? 'Beide Kalender werden angezeigt.' : 'Kalender von ' + ADV[state.mode].name + ' wird angezeigt.');
    });
  });
  el.prev.addEventListener('click', function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderMonth(); });
  el.next.addEventListener('click', function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderMonth(); });
  el.days.addEventListener('click', function (e) {
    var b = e.target.closest('.cal-day'); if (!b || b.disabled) return;
    state.day = b.dataset.day; state.slot = null; el.formWrap.hidden = true;
    render();
    var first = el.slots.querySelector('.slot');
    say(longDate(fromKey(state.day)) + ' gewählt.');
    if (window.matchMedia('(max-width: 899px)').matches) scrollTo(el.dayname);
    if (first && e.detail === 0) first.focus(); // keyboard users jump to the times
  });
  el.slots.addEventListener('click', function (e) {
    var b = e.target.closest('.slot'); if (!b) return;
    state.slot = { adv: b.dataset.adv, time: b.dataset.time, date: state.day };
    renderSlots();
    var d = fromKey(state.day), a = ADV[state.slot.adv];
    el.picked.textContent = '';
    el.picked.appendChild(avatar(a.id));
    var t = doc.createElement('span');
    t.textContent = longDate(d) + ' · ' + state.slot.time + '–' + plus30(state.slot.time) + ' Uhr · mit ' + a.name;
    el.picked.appendChild(t);
    el.formWrap.hidden = false;
    say('Termin gewählt: ' + t.textContent + '. Bitte Angaben ausfüllen.');
    scrollTo(el.formWrap);
    setTimeout(function () { var n = doc.getElementById('t-name'); if (n) n.focus({ preventScroll: true }); }, 500);
  });

  /* ---------- form ---------- */
  var summary = el.form.querySelector('.err-summary');
  function setErr(id, msg) {
    var f = doc.getElementById(id), e = doc.getElementById(id + '-err');
    if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
    if (e) e.textContent = msg || '';
    return msg ? { id: id, msg: msg } : null;
  }
  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!state.slot) return;
    var name = doc.getElementById('t-name').value.trim(), mail = doc.getElementById('t-email').value.trim();
    var errs = [
      setErr('t-name', name ? '' : 'Bitte geben Sie Ihren Namen ein.'),
      setErr('t-email', !mail ? 'Bitte geben Sie Ihre E-Mail-Adresse ein.' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) ? '' : 'Bitte prüfen Sie die E-Mail-Adresse, z. B. name@beispiel.de.')),
      setErr('t-consent', doc.getElementById('t-consent').checked ? '' : 'Bitte stimmen Sie zu, damit wir Sie kontaktieren dürfen.')
    ].filter(Boolean);
    if (errs.length) {
      var ul = summary.querySelector('ul'); ul.textContent = '';
      errs.forEach(function (er) { var li = doc.createElement('li'), a = doc.createElement('a'); a.href = '#' + er.id; a.textContent = er.msg; li.appendChild(a); ul.appendChild(li); });
      summary.hidden = false; summary.focus();
      return;
    }
    summary.hidden = true;
    // a slot could have been taken in another tab meanwhile
    booked = load();
    if (isBooked(state.slot.adv, state.slot.date, state.slot.time)) { state.slot = null; el.formWrap.hidden = true; render(); say('Dieser Termin wurde gerade vergeben. Bitte wählen Sie einen anderen.'); return; }
    var art = (el.form.querySelector('input[name="t-art"]:checked') || {}).value || 'Telefon';
    var entry = { adv: state.slot.adv, date: state.slot.date, time: state.slot.time, art: art, name: name, created: Date.now() };
    booked.push(entry); save(booked);
    state.last = entry; state.slot = null;
    el.form.reset(); el.formWrap.hidden = true;
    var a = ADV[entry.adv];
    el.doneText.textContent = longDate(fromKey(entry.date)) + ', ' + entry.time + '–' + plus30(entry.time) + ' Uhr mit ' + a.name + ' (' + art + ').';
    el.done.hidden = false;
    render();
    scrollTo(el.done);
    setTimeout(function () { el.doneTitle.focus({ preventScroll: true }); }, 450);
  });
  summary.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return; e.preventDefault();
    var t = doc.getElementById(a.getAttribute('href').slice(1)); if (t) t.focus();
  });

  /* ---------- after booking ---------- */
  function ics(entry) {
    var a = ADV[entry.adv], d = entry.date.replace(/-/g, ''), s = entry.time.replace(':', '') + '00', e = plus30(entry.time).replace(':', '') + '00';
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReiseGlueck Demo//Termin//DE', 'BEGIN:VEVENT',
      'UID:' + entry.created + '-' + entry.adv + '@reiseglueck.example', 'DTSTAMP:' + stamp,
      'DTSTART;TZID=Europe/Berlin:' + d + 'T' + s, 'DTEND;TZID=Europe/Berlin:' + d + 'T' + e,
      'SUMMARY:Reiseberatung mit ' + a.name + ' (Demo)',
      'DESCRIPTION:Kostenlose Erstberatung\\, ' + entry.art + '. Demo-Termin\\, nicht echt.',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  $('[data-cal-ics]').addEventListener('click', function () {
    if (!state.last) return;
    var blob = new Blob([ics(state.last)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob), link = doc.createElement('a');
    link.href = url; link.download = 'reiseglueck-termin.ics';
    doc.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  });
  function backToCalendar(msg) {
    el.done.hidden = true; state.last = null;
    render(); say(msg);
    scrollTo(root);
  }
  $('[data-cal-cancel]').addEventListener('click', function () {
    var l = state.last; if (!l) return;
    booked = load().filter(function (b) { return !(b.adv === l.adv && b.date === l.date && b.time === l.time); });
    save(booked);
    backToCalendar('Termin storniert. Die Zeit ist wieder frei.');
  });
  $('[data-cal-new]').addEventListener('click', function () { backToCalendar('Wählen Sie einen weiteren Termin.'); });

  /* ---------- start (optional ?berater=lena|jonas) ---------- */
  var want = new URLSearchParams(location.search).get('berater');
  if (want && ADV[want]) { state.mode = want; var r = root.querySelector('input[name="berater"][value="' + want + '"]'); if (r) r.checked = true; }
  selectFirstDay();
  render();
})();
