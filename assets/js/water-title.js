/* ReiseGlück (Demo) – "Fernweh" aus Wasser (WebGL, einmalige Intro-Animation)
   Ablauf: Ein halbtransparenter 3D-Wassertropfen fällt von oben, trifft auf, fließt in die Form
   des Wortes und spritzt dabei kleine Tropfen heraus. Danach steht das Wort still (kein Dauer-Loop).
   Die Buchstaben kommen aus einem Signed Distance Field der echten Schrift (TinySDF-Verfahren),
   gerendert in voller Gerätepixeldichte – scharf in jeder Größe.
   Das echte <h1> bleibt im DOM (Suchmaschinen, Screenreader). Ohne WebGL erscheint es normal weiß;
   bei "Bewegung reduzieren" wird direkt das fertige Wort gezeigt. */
(function () {
  'use strict';
  var wrap = document.querySelector('[data-water-title]');
  if (!wrap) return;
  var h1 = wrap.querySelector('h1');
  var hero = wrap.closest('.hero') || wrap.parentNode;
  // read the word now: motion.js later splits the h1 into a screen-reader copy + animated spans
  var TEXT = h1.textContent.replace(/\s+/g, ' ').trim();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fail() { wrap.classList.add('no-water'); }

  var canvas = document.createElement('canvas');
  canvas.className = 'water-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var opts = { premultipliedAlpha: true, alpha: true, antialias: false };
  // WebGL2 gives filterable half-float textures -> smooth, band-free curvature; WebGL1 is the fallback
  var gl = canvas.getContext('webgl2', opts), isGL2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', opts);
  if (!gl) { fail(); return; }

  var MAXD = 10; // splash droplets
  var VS = 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform sampler2D u_tex;',
    'uniform vec2 u_res, u_t0, u_ts;',
    'uniform float u_fs, u_R, u_k, u_shadow, u_float, u_dsc, u_B;',
    'uniform vec3 u_rev, u_drop, u_tail;',
    'uniform vec2 u_dropS;',
    'uniform vec3 u_dr[' + MAXD + '];',
    'varying vec2 v;',
    'float smin(float a, float b, float k){ float h = clamp(.5+.5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }',
    'vec4 texS(vec2 p){ return texture2D(u_tex, (p - u_t0)/u_ts); }',
    // R: signed distance (texture px as float, or 8-bit encoded), G: smoothed height of the liquid body
    'float textD(vec2 p){',
    '  vec4 s = texS(p); float d = u_float > .5 ? s.r*u_dsc : (s.r - .5)*2.*u_R;',
    '  vec2 o = max(max(u_t0 - p, p - (u_t0 + u_ts)), 0.);',
    '  return d + length(o);',
    '}',
    'float scene(vec2 p){',
    '  float d = 1e5;',
    '  if (u_rev.z > 0.) { float t = textD(p); d = u_rev.z > 1e5 ? t : -smin(-t, -(length(p - u_rev.xy) - u_rev.z), u_k); }',
    '  if (u_drop.z > 0.) {',
    '    vec2 q = (p - u_drop.xy)/u_dropS; float dd = (length(q) - u_drop.z)*min(u_dropS.x, u_dropS.y);',
    '    if (u_tail.z > 0.) dd = smin(dd, length(p - u_tail.xy) - u_tail.z, u_drop.z*.9);',
    '    d = smin(d, dd, u_k);',
    '  }',
    '  for (int i = 0; i < ' + MAXD + '; i++) { if (u_dr[i].z > 0.) d = smin(d, length(p - u_dr[i].xy) - u_dr[i].z, u_k*.7); }',
    '  return d;',
    '}',
    'void main(){',
    '  vec2 p = v*u_res;',
    '  float d = scene(p);',
    '  float ds = scene(p - vec2(0., u_fs*.05));',
    '  float shA = u_shadow*.42*exp(-max(ds, 0.)/(u_fs*.05));',
    '  vec4 shadow = vec4(vec3(.0,.05,.1)*shA, shA);',
    '  if (d > 1.) { gl_FragColor = shadow; return; }',
    '  vec2 g = vec2(scene(p + vec2(1.5,0.)) - scene(p - vec2(1.5,0.)), scene(p + vec2(0.,1.5)) - scene(p - vec2(0.,1.5)));',
    '  g = dot(g, g) > 1e-8 ? normalize(g) : vec2(0.);',
    '  float u = clamp(1. + d/u_B, 0., .985);',
    '  vec3 n = normalize(vec3(g*u/sqrt(1. - u*u), 1.));',
    // inside the finished letters use the smoothed height map: rounded liquid, no corner creases
    '  float dt = textD(p);',
    '  float w = 1. - smoothstep(.5, u_B*.5, abs(dt - d));',
    '  if (w > 0.) {',
    '    vec2 ex = vec2(2.5, 0.);',
    '    vec2 gh = vec2(texS(p + ex).g - texS(p - ex).g, texS(p + ex.yx).g - texS(p - ex.yx).g)/5.;',
    '    vec3 nh = normalize(vec3(-gh*u_B*2.4, 1.));',
    '    n = normalize(mix(n, nh, w));',
    '  }',
    '  vec3 V = vec3(0.,0.,1.);',
    '  vec3 L = normalize(vec3(-.42, -.72, .56));',
    '  vec3 L2 = normalize(vec3(.62, .55, .55));',
    '  float fres = pow(1. - n.z, 2.);',
    '  float nh = max(dot(n, normalize(L + V)), 0.);',
    '  float spec = pow(nh, 160.)*1.6 + pow(nh, 22.)*.22;',
    '  float rim = pow(max(dot(n, normalize(L2 + V)), 0.), 36.)*.45;',
    '  float lam = clamp(dot(n, L)*.5 + .5, 0., 1.);',
    '  vec3 deep = vec3(.0,.30,.52), mid = vec3(.30,.80,.95), pale = vec3(.86,.98,1.);',
    '  vec3 col = mix(deep, mid, lam);',
    '  col = mix(col, pale, fres*.5);',
    '  float a = clamp(.5 - d, 0., 1.);',
    '  float body = mix(.62, .97, fres);',
    '  float inRim = exp(d/(u_fs*.012))*.75;',
    '  float A = clamp(body + spec + rim*.6 + inRim, 0., 1.)*a;',
    '  vec3 c = (col*body + vec3(1.)*spec + pale*(rim + inRim))*a;',
    '  gl_FragColor = vec4(c, A) + shadow*(1. - A);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { fail(); return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['u_tex', 'u_res', 'u_t0', 'u_ts', 'u_fs', 'u_R', 'u_float', 'u_dsc', 'u_B', 'u_k', 'u_shadow', 'u_rev', 'u_drop', 'u_tail', 'u_dropS', 'u_dr']
    .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(U.u_tex, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  /* ---------- signed distance field of the word (TinySDF algorithm, subpixel accurate) ---------- */
  var INF = 1e20;
  function edt1d(grid, offset, stride, length, f, v, z) {
    var q, k, s, r;
    v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = grid[offset];
    for (q = 1, k = 0, s = 0; q < length; q++) {
      f[q] = grid[offset + q * stride];
      var q2 = q * q;
      do { r = v[k]; s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    for (q = 0, k = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      r = v[k]; grid[offset + q * stride] = f[r] + (q - r) * (q - r);
    }
  }
  function edt(data, w, h) {
    var n = Math.max(w, h), f = new Float64Array(n), v = new Uint16Array(n), z = new Float64Array(n + 1), x, y;
    for (x = 0; x < w; x++) edt1d(data, x, w, h, f, v, z);
    for (y = 0; y < h; y++) edt1d(data, y * w, 1, w, f, v, z);
  }

  var geo = null, texScale = 1, R = 1;
  function boxBlur(src, w, h, r, passes) {
    var a = src, b = new Float32Array(src.length), x, y, acc, i0;
    for (var pass = 0; pass < passes; pass++) {
      for (y = 0; y < h; y++) {
        i0 = y * w; acc = 0;
        for (x = -r; x <= r; x++) acc += a[i0 + Math.min(w - 1, Math.max(0, x))];
        for (x = 0; x < w; x++) { b[i0 + x] = acc / (2 * r + 1); acc += a[i0 + Math.min(w - 1, x + r + 1)] - a[i0 + Math.max(0, x - r)]; }
      }
      for (x = 0; x < w; x++) {
        acc = 0;
        for (y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (y = 0; y < h; y++) { a[y * w + x] = acc / (2 * r + 1); acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; }
      }
    }
    return a;
  }

  function layout() {
    // position relative to the hero, ignoring transforms (parallax), so the canvas stays glued to the word
    var x = 0, y = 0, el = wrap;
    while (el && el !== hero) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    var cs = getComputedStyle(h1);
    return { wx: x, wy: y, ww: wrap.offsetWidth, wh: wrap.offsetHeight, hw: hero.clientWidth, hh: hero.clientHeight,
      fs: parseFloat(cs.fontSize), ls: parseFloat(cs.letterSpacing) || 0, lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * .9,
      weight: cs.fontWeight, family: cs.fontFamily };
  }

  function buildSDF() {
    geo = layout();
    texScale = Math.min(window.devicePixelRatio || 1, 2);
    var pad = geo.fs * .3;
    var tw = Math.ceil((geo.ww + pad * 2) * texScale), th = Math.ceil((geo.wh + pad * 2) * texScale);
    geo.tx = geo.wx - pad; geo.ty = geo.wy - pad; geo.tw = tw / texScale; geo.th = th / texScale;
    var c2 = document.createElement('canvas'); c2.width = tw; c2.height = th;
    var ctx = c2.getContext('2d');
    var fsPx = geo.fs * texScale, lsPx = geo.ls * texScale;
    ctx.font = geo.weight + ' ' + fsPx + 'px ' + geo.family;
    ctx.fillStyle = '#000'; ctx.textBaseline = 'alphabetic';
    var m = ctx.measureText(TEXT), total = m.width + lsPx * (TEXT.length - 1);
    var asc = m.fontBoundingBoxAscent || fsPx * .9, desc = m.fontBoundingBoxDescent || fsPx * .25;
    var lineH = geo.lh * texScale;
    var x0 = (tw - total) / 2, y0 = pad * texScale + (lineH - (asc + desc)) / 2 + asc;
    for (var i = 0; i < TEXT.length; i++) ctx.fillText(TEXT[i], x0 + ctx.measureText(TEXT.slice(0, i)).width + lsPx * i, y0);
    var img = ctx.getImageData(0, 0, tw, th).data, n = tw * th;
    var outer = new Float64Array(n), inner = new Float64Array(n);
    for (var k = 0; k < n; k++) {
      var a = img[k * 4 + 3] / 255;
      if (a >= 1) { outer[k] = 0; inner[k] = INF; }        // inside the glyph
      else if (a <= 0) { outer[k] = INF; inner[k] = 0; }  // outside
      else { var dd = .5 - a; outer[k] = dd > 0 ? dd * dd : 0; inner[k] = dd < 0 ? dd * dd : 0; }
    }
    edt(outer, tw, th); edt(inner, tw, th);
    var dist = new Float32Array(n), hgt = new Float32Array(n), Bt = fsPx * .08;
    for (k = 0; k < n; k++) {
      dist[k] = Math.sqrt(outer[k]) - Math.sqrt(inner[k]);
      var t = Math.min(1, Math.max(0, -dist[k] / Bt));
      hgt[k] = Math.sqrt(1 - (1 - t) * (1 - t)); // round "tube" profile
    }
    hgt = boxBlur(hgt, tw, th, Math.max(1, Math.round(Bt * .45)), 2); // soften the creases at corners
    R = Math.max(8, fsPx * .14);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (isGL2) {
      var rg = new Float32Array(n * 2);
      for (k = 0; k < n; k++) { rg[k * 2] = dist[k]; rg[k * 2 + 1] = hgt[k]; }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, tw, th, 0, gl.RG, gl.FLOAT, rg);
    } else {
      var out = new Uint8Array(n * 4);
      for (k = 0; k < n; k++) {
        out[k * 4] = Math.max(0, Math.min(255, Math.round((.5 + dist[k] / (2 * R)) * 255)));
        out[k * 4 + 1] = Math.round(hgt[k] * 255); out[k * 4 + 3] = 255;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, out);
    }
  }

  /* canvas: during the intro it spans from the top of the hero to below the word; afterwards only the word */
  var cScale = 1, cx = 0, cy = 0, cw = 0, ch = 0;
  function sizeCanvas(intro) {
    if (intro) { cx = 0; cy = 0; cw = geo.hw; ch = Math.min(geo.hh, geo.wy + geo.wh + geo.fs * .9); }
    else { cx = geo.tx; cy = geo.ty; cw = geo.tw; ch = geo.th; }
    cScale = Math.min(window.devicePixelRatio || 1, 2);
    if (intro && cw * ch * cScale * cScale > 2.6e6) cScale = Math.sqrt(2.6e6 / (cw * ch)); // intro moves fast; keep it light on 4K
    canvas.width = Math.round(cw * cScale); canvas.height = Math.round(ch * cScale);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.style.left = (cx - geo.wx) + 'px'; canvas.style.top = (cy - geo.wy) + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
    var s = cScale;
    gl.uniform2f(U.u_res, canvas.width, canvas.height);
    gl.uniform2f(U.u_t0, (geo.tx - cx) * s, (geo.ty - cy) * s);
    gl.uniform2f(U.u_ts, geo.tw * s, geo.th * s);
    gl.uniform1f(U.u_fs, geo.fs * s);
    gl.uniform1f(U.u_R, R / texScale * s);
    gl.uniform1f(U.u_float, isGL2 ? 1 : 0); gl.uniform1f(U.u_dsc, s / texScale);
    gl.uniform1f(U.u_B, geo.fs * .08 * s);
    gl.uniform1f(U.u_k, geo.fs * .09 * s);
  }

  /* ---------- timeline (ms) ---------- */
  var T_FALL = 720, T_SPREAD = 760, T_END = T_FALL + 1150;
  function ease3(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var drops = [];
  for (var i = 0; i < MAXD; i++) {
    var ang = -Math.PI / 2 + (i / (MAXD - 1) - .5) * 2.4 + (rnd(i) - .5) * .25; // fan upwards
    drops.push({ ang: ang, sp: .85 + rnd(i + 9) * .9, r: .028 + rnd(i + 3) * .04, life: 520 + rnd(i + 5) * 420, off: (rnd(i + 7) - .5) * .5 });
  }
  var drArr = new Float32Array(MAXD * 3);

  function frame(t) { // t: ms since start; returns true when finished
    var s = cScale, fs = geo.fs, ox = geo.wx - cx, oy = geo.wy - cy;
    var ix = (ox + geo.ww / 2) * s, iy = (oy + geo.wh * .52) * s; // impact point = middle of the word
    var r0 = Math.max(fs * .2, 18) * s; // never smaller than ~36px across, so it reads on phones
    gl.uniform1f(U.u_shadow, 1);
    drArr.fill(0);
    if (t >= T_END) {
      gl.uniform3f(U.u_rev, 0, 0, 2e5); gl.uniform3f(U.u_drop, 0, 0, 0); gl.uniform3f(U.u_tail, 0, 0, 0);
      gl.uniform2f(U.u_dropS, 1, 1);
      gl.uniform3fv(U.u_dr, drArr);
      return true;
    }
    if (t < 0) {
      gl.uniform3f(U.u_rev, 0, 0, -1); gl.uniform3f(U.u_drop, 0, 0, 0); gl.uniform3f(U.u_tail, 0, 0, 0);
      gl.uniform2f(U.u_dropS, 1, 1); gl.uniform1f(U.u_shadow, 0);
    } else if (t < T_FALL) { // falling, accelerating, stretched teardrop
      var k = t / T_FALL, y0 = -r0 * 2.2, y = y0 + (iy - y0) * k * k;
      var st = 1 + .55 * k;
      gl.uniform3f(U.u_rev, 0, 0, -1);
      gl.uniform3f(U.u_drop, ix, y, r0 / Math.sqrt(st));
      gl.uniform2f(U.u_dropS, 1 / Math.sqrt(st), st);
      gl.uniform3f(U.u_tail, ix, y - r0 * (1.05 + .5 * k), r0 * .32 * (.6 + .4 * k));
    } else { // impact: drop flattens and flows into the letters, splash droplets fly out and fall back
      var tt = t - T_FALL, e = ease3(clamp(tt / T_SPREAD, 0, 1));
      var maxR = Math.hypot(geo.ww / 2 + fs * .3, geo.wh) * s;
      gl.uniform3f(U.u_rev, ix, iy, Math.max(.001, maxR * e));
      var sq = clamp(tt / 160, 0, 1), shrink = 1 - ease3(clamp(tt / 520, 0, 1));
      gl.uniform3f(U.u_drop, ix, iy, r0 * shrink);
      gl.uniform2f(U.u_dropS, 1 + .9 * sq, 1 - .45 * sq);
      gl.uniform3f(U.u_tail, 0, 0, 0);
      var g = fs * 5.2 * s / 1e6; // px per ms²
      for (var j = 0; j < MAXD; j++) {
        var d = drops[j], life = clamp(tt / d.life, 0, 1);
        if (life >= 1) continue;
        var v = d.sp * fs * s / 330; // px per ms
        var px = ix + d.off * fs * s + Math.cos(d.ang) * v * tt, py = iy - fs * .1 * s + Math.sin(d.ang) * v * tt + .5 * g * tt * tt;
        var rr = d.r * fs * s * Math.sin(Math.PI * Math.min(1, life * 1.15 + .08)) * (1 - life * .35);
        drArr[j * 3] = px; drArr[j * 3 + 1] = py; drArr[j * 3 + 2] = Math.max(0, rr);
      }
    }
    gl.uniform3fv(U.u_dr, drArr);
    return false;
  }
  function render(t) {
    var done = frame(t);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return done;
  }

  var finished = false;
  function showFinal() { finished = true; sizeCanvas(false); render(1e9); }

  function init() {
    try { buildSDF(); } catch (e) { fail(); return; }
    wrap.appendChild(canvas);
    wrap.classList.add('has-water');
    if (reduce) { showFinal(); } else {
      sizeCanvas(true);
      render(-1);
      var start = performance.now() + 250;
      var step = function (now) {
        if (finished) return;
        var t = now - start;
        if (render(t)) showFinal(); else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    var rt = 0, lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (window.innerWidth === lastW && finished) return; // height-only change (mobile URL bar): nothing to redraw
        lastW = window.innerWidth;
        try { buildSDF(); } catch (e) { return; }
        if (finished) showFinal(); else sizeCanvas(true);
      }, 150);
    });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); canvas.remove(); wrap.classList.remove('has-water'); fail(); });
  }

  var cs0 = getComputedStyle(h1);
  if (document.fonts && document.fonts.load) document.fonts.load(cs0.fontWeight + ' 100px ' + cs0.fontFamily, TEXT).then(init, init);
  else window.addEventListener('load', init);
})();
