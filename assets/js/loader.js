/* Intro-Ladebildschirm (siehe loader.css). Wartet auf das Ende der Wasser-Animation (Event "water:done"
   aus water-title.js), dann öffnet sich die Seite. Klick, Touch oder Taste überspringt; Sicherheits-Timeouts. */
(function () {
  'use strict';
  var r = document.documentElement, el = document.querySelector('.intro-loader');
  if (!el || !r.classList.contains('intro-run')) return;
  var water = el.querySelector('.intro-water');
  if (!(window.CSS && CSS.registerProperty && CSS.supports('(--a: 1)'))) el.classList.add('fade');
  var went = false, done = false;
  function go() { if (went) return; went = true; r.classList.remove('intro'); el.classList.add('go'); }
  function end() {
    if (done) return; done = true; go();
    r.classList.remove('intro-run');
    try { sessionStorage.setItem('rg-intro', '1'); } catch (e) {}
  }
  if (water) {
    water.addEventListener('water:done', function () { setTimeout(go, 650); });
    // no WebGL: water-title.js marks the word "no-water" (often before this script runs) and shows it plainly
    var noWater = function () { if (water.classList.contains('no-water')) { setTimeout(go, 1200); return true; } };
    if (!noWater()) new MutationObserver(function (m, o) { if (noWater()) o.disconnect(); })
      .observe(water, { attributes: true, attributeFilter: ['class'] });
  }
  el.addEventListener('animationend', function (e) { if (e.animationName === 'intro-reveal' || e.animationName === 'intro-fade') end(); });
  el.addEventListener('pointerdown', end);
  addEventListener('keydown', end);
  setTimeout(go, 4500);  // slow device / font never loads
  setTimeout(end, 7000);
})();
