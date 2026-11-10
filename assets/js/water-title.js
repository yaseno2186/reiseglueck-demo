/* ReiseGlück (Demo) – "Fernweh" aus Wasser (WebGL)
   Die Buchstaben werden als Wasserkörper gerendert: wellige, sich bewegende Kanten, gewölbte
   glänzende Oberfläche mit Lichtreflexen und wandernde Lichtnetze (Kaustiken) wie am Poolboden.
   Das echte <h1> bleibt im DOM (Suchmaschinen, Screenreader) und wird nur optisch ersetzt.
   Ohne WebGL bleibt die normale weiße Überschrift stehen; bei "Bewegung reduzieren" ein stilles Bild. */
(function () {
  'use strict';
  var wrap = document.querySelector('[data-water-title]');
  if (!wrap) return;
  var h1 = wrap.querySelector('h1');
  // read the word now: motion.js later splits the h1 into a screen-reader copy + animated word spans
  var TEXT = h1.textContent.replace(/\s+/g, ' ').trim();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.className = 'water-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }) ||
           canvas.getContext('experimental-webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) return; // fallback: plain white headline stays visible

  var VS = 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }';
  var FS = [
    'precision mediump float;',
    'uniform sampler2D u_tex; uniform vec2 u_res; uniform float u_t; uniform float u_fs; uniform float u_in;',
    'varying vec2 v;',
    // classic tileable water caustic (thin bright light network)
    'float caustic(vec2 uv, float t){',
    '  vec2 p = mod(uv*6.28318, 6.28318) - 250.0; vec2 i = p; float c = 1.0; float inten = .005;',
    '  for (int n = 0; n < 4; n++) { float tt = t*(1.0-(3.5/float(n+1)));',
    '    i = p + vec2(cos(tt-i.x)+sin(tt+i.y), sin(tt-i.y)+cos(tt+i.x));',
    '    c += 1.0/length(vec2(p.x/(sin(i.x+tt)/inten), p.y/(cos(i.y+tt)/inten))); }',
    '  c /= 4.0; c = 1.17 - pow(c, 1.4); return clamp(pow(abs(c), 8.0), 0.0, 1.0);',
    '}',
    'void main(){',
    '  vec2 px = v*u_res; vec2 q = px/u_fs;',
    // rippling edges like text seen through moving water (stronger while the word "settles" on load)
    '  float amp = u_fs*(0.016 + 0.10*(1.0-u_in));',
    '  vec2 w = vec2(sin(q.y*5.0 + u_t*1.7) + .6*sin(q.y*11.0 - q.x*3.0 + u_t*2.3),',
    '                cos(q.x*4.0 + u_t*1.3) + .6*sin(q.x*9.0 + q.y*4.0 - u_t*1.9))*amp;',
    '  vec2 uv = (px + w)/u_res;',
    '  vec4 s = texture2D(u_tex, uv);',
    '  float m = s.r; float h = s.g;',
    '  float a = smoothstep(.32, .68, m);',
    // soft drop shadow so the water stays readable on the bright beach
    '  float sh = texture2D(u_tex, uv - vec2(0.0, u_fs*.06)/u_res).g;',
    '  vec4 shadow = vec4(vec3(.01,.08,.16)*sh*.38, sh*.38);',
    '  if (a < .003) { gl_FragColor = shadow*u_in; return; }',
    // surface normal from the blurred height channel -> rounded, liquid body
    '  vec2 ex = vec2(1.5/u_res.x, 0.0); vec2 ey = vec2(0.0, 1.5/u_res.y);',
    '  float hx = texture2D(u_tex, uv+ex).g - texture2D(u_tex, uv-ex).g;',
    '  float hy = texture2D(u_tex, uv+ey).g - texture2D(u_tex, uv-ey).g;',
    '  vec3 n = normalize(vec3(-hx*7.0, -hy*7.0, 1.0));',
    '  vec3 L = normalize(vec3(-.45, -.65, .62));',
    '  float diff = clamp(dot(n, L), 0.0, 1.0);',
    '  float spec = pow(max(dot(n, normalize(L + vec3(0.,0.,1.))), 0.0), 70.0);',
    '  float spec2 = pow(max(dot(n, normalize(vec3(.5,.55,.7) + vec3(0.,0.,1.))), 0.0), 40.0);',
    // caustics, refracted by the surface normal, two layers drifting at different speeds
    '  vec2 cu = q*.42 + n.xy*.18;',
    '  float c = caustic(cu, u_t*.55)*.9 + caustic(cu*1.6 + 3.7, u_t*.4)*.55;',
    '  vec3 deep = vec3(.0,.20,.40); vec3 shallow = vec3(.10,.62,.86);',
    '  vec3 col = mix(deep, shallow, clamp(smoothstep(.15,.95,h)*.65 + diff*.45, 0.0, 1.0));',
    '  col += vec3(.78,.97,1.0)*c*1.05;',
    '  float edge = smoothstep(.40,.55,m)*(1.0 - smoothstep(.45,.80,h));',
    '  col += vec3(.75,.95,1.0)*edge*.55;',
    '  col += vec3(1.0)*spec*1.1 + vec3(.85,.97,1.0)*spec2*.35;',
    '  float A = a*clamp(.80 + .2*(c + spec), 0.0, 1.0)*u_in;',
    '  gl_FragColor = vec4(col*A, A) + shadow*u_in*(1.0 - A);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['u_tex', 'u_res', 'u_t', 'u_fs', 'u_in'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(U.u_tex, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  /* separable box blur (3 passes ≈ gaussian) for the height channel */
  function blur(src, w, hgt, r) {
    var a = src, b = new Float32Array(src.length);
    for (var pass = 0; pass < 3; pass++) {
      for (var y = 0; y < hgt; y++) { // horizontal
        var row = y * w, acc = 0, x;
        for (x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
        for (x = 0; x < w; x++) {
          b[row + x] = acc / (2 * r + 1);
          acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
        }
      }
      for (var xx = 0; xx < w; xx++) { // vertical
        var acc2 = 0, yy;
        for (yy = -r; yy <= r; yy++) acc2 += b[Math.min(hgt - 1, Math.max(0, yy)) * w + xx];
        for (yy = 0; yy < hgt; yy++) {
          a[yy * w + xx] = acc2 / (2 * r + 1);
          acc2 += b[Math.min(hgt - 1, yy + r + 1) * w + xx] - b[Math.max(0, yy - r) * w + xx];
        }
      }
    }
    return a;
  }

  var fsPx = 0, W = 0, H = 0, ready = false;
  function build() {
    var cs = getComputedStyle(h1);
    var fs = parseFloat(cs.fontSize), ls = parseFloat(cs.letterSpacing) || 0;
    var box = h1.getBoundingClientRect();
    var pad = Math.round(fs * 0.22);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var cssW = Math.ceil(box.width + pad * 2), cssH = Math.ceil(box.height + pad * 2);
    if (cssW * cssH * dpr * dpr > 2.4e6) dpr = Math.sqrt(2.4e6 / (cssW * cssH));
    W = Math.max(2, Math.round(cssW * dpr)); H = Math.max(2, Math.round(cssH * dpr));
    canvas.width = W; canvas.height = H;
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    canvas.style.left = -pad + 'px'; canvas.style.top = -pad + 'px';
    fsPx = fs * dpr;

    // draw the word (with the page font, kerning kept, letter-spacing added per glyph)
    var c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    var ctx = c2.getContext('2d');
    var text = TEXT;
    ctx.font = cs.fontWeight + ' ' + fsPx + 'px ' + cs.fontFamily;
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    var lsd = ls * dpr, full = ctx.measureText(text), total = full.width + lsd * (text.length - 1);
    var asc = full.actualBoundingBoxAscent || fsPx * .72, desc = full.actualBoundingBoxDescent || 0;
    var x0 = (W - total) / 2, y0 = H / 2 + (asc - desc) / 2;
    for (var i = 0; i < text.length; i++) ctx.fillText(text[i], x0 + ctx.measureText(text.slice(0, i)).width + lsd * i, y0);

    var img = ctx.getImageData(0, 0, W, H), d = img.data, n = W * H;
    var mask = new Float32Array(n);
    for (var k = 0; k < n; k++) mask[k] = d[k * 4 + 3] / 255;
    var height = blur(mask.slice(), W, H, Math.max(2, Math.round(fsPx * 0.055)));
    var mx = 0; for (k = 0; k < n; k++) if (height[k] > mx) mx = height[k];
    mx = mx || 1;
    for (k = 0; k < n; k++) { d[k * 4] = mask[k] * 255; d[k * 4 + 1] = Math.min(1, height[k] / mx) * 255; d[k * 4 + 2] = 0; d[k * 4 + 3] = 255; }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.u_res, W, H); gl.uniform1f(U.u_fs, fsPx);
    ready = true;
  }

  var t0 = performance.now(), introStart = 0, running = false, visible = true, raf = 0;
  function draw(now) {
    if (!ready) return;
    var t = reduce ? 2.0 : (now - t0) / 1000;
    var k = reduce ? 1 : Math.min(1, Math.max(0, (now - introStart) / 1800));
    var intro = 1 - Math.pow(1 - k, 3);
    gl.uniform1f(U.u_t, t); gl.uniform1f(U.u_in, intro);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop(now) { draw(now); if (running) raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function init() {
    try { build(); } catch (e) { return; }
    wrap.appendChild(canvas);
    wrap.classList.add('has-water');
    introStart = performance.now() + (reduce ? 0 : 350);
    if (reduce) draw(performance.now()); else start();

    var rt = 0;
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      clearTimeout(rt); rt = setTimeout(function () { build(); if (!running) draw(performance.now()); }, 120);
    }).observe(wrap);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; if (visible) start(); else stop();
    }).observe(wrap);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); wrap.classList.remove('has-water'); canvas.remove(); });
  }

  var font = getComputedStyle(h1);
  var fontStr = font.fontWeight + ' 100px ' + font.fontFamily;
  if (document.fonts && document.fonts.load) document.fonts.load(fontStr, TEXT).then(init, init);
  else window.addEventListener('load', init);
})();
