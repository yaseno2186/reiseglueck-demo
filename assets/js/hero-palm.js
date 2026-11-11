/* Palme vor der Überschrift: .hero-palm (die maskierte Palme des Hero-Fotos) wird auf den Kasten der h1 zugeschnitten,
   damit nur "Fernweh" hinter den Blättern liegt, Untertitel und Button aber davor bleiben. */
(function () {
  'use strict';
  var palm = document.querySelector('.hero-palm'), h1 = document.getElementById('hero-title');
  if (!palm || !h1) return;
  var queued = false;
  function clip() {
    queued = false;
    var p = palm.getBoundingClientRect(), r = h1.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
    var pad = r.height * .12; // glyph tops (F, h) reach a little above the tight line box
    palm.style.clipPath = 'inset(' + Math.max(0, r.top - p.top - pad) + 'px ' + Math.max(0, p.right - r.right) + 'px ' +
      Math.max(0, p.bottom - r.bottom) + 'px ' + Math.max(0, r.left - p.left) + 'px)';
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(clip); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  if (window.ResizeObserver) new ResizeObserver(queue).observe(h1);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  addEventListener('load', queue);
  queue();
})();
