/* Bewegtes Wasser im Hero-Foto: ein WebGL-Canvas zeichnet das Foto neu und lässt nur das Meer wogen
   (Maske assets/img/strand-palmen-wasser.png: Rot = Wasser, Grün = Brandungs-/Schaumband).
   Sand und Palmen bleiben still. Ohne WebGL oder bei "Bewegung reduzieren" bleibt das normale Foto. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var media = document.querySelector('.hero-media'), img = media && media.querySelector('img');
  if (!img) return;
  var canvas = document.createElement('canvas');
  var opts = { alpha: false, antialias: false, premultipliedAlpha: false };
  // WebGL2 can mipmap the non-power-of-two photo, so it stays crisp without shimmering when drawn smaller than its file
  var gl = canvas.getContext('webgl2', opts), gl2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', opts);
  if (!gl) return;
  var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  canvas.className = 'hero-water';
  canvas.setAttribute('aria-hidden', 'true');

  var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
  var FS = [
    'precision highp float;',
    'uniform sampler2D u_img, u_mask; uniform vec2 u_res; uniform vec4 u_rect; uniform float u_t;',
    'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }',
    'float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);',
    '  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }',
    'float fbm(vec2 p){ return .55*n(p) + .3*n(p*2.03+7.1) + .15*n(p*4.01+3.7); }',
    'void main(){',
    '  vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);',
    '  vec2 uv = (px - u_rect.xy)/u_rect.zw;',
    '  vec3 m = texture2D(u_mask, uv).rgb; float w = m.r, s = m.g;',
    // the photo is always sampled outside the branch: texture lookups inside non-uniform control flow get broken
    // mip-level derivatives on the GPU, which showed as a dotted line of wrong pixels along the edge of the water
    '  vec2 off = vec2(0.); float mul = 1.; vec3 add = vec3(0.);',
    '  if (w + s > .003) {',                              // sand and palms skip the water maths
    '    vec2 q = uv*vec2(u_rect.z/u_rect.w, 1.);',      // aspect-correct, 1 unit = image height
    '    float t = u_t;',
    // open water: drifting swell + small choppy ripples
    '    vec2 d = vec2(fbm(q*7. + vec2(t*.10, t*.06)) - .5, fbm(q*7. + vec2(5.2, 1.3) - vec2(t*.07, t*.11)) - .5)*2.;',
    '    d += vec2(.35, 1.)*sin(q.y*38. + q.x*9. - t*1.3 + 3.*n(q*3. + t*.05))*.35;',
    '    off = d*w*4.;',                                  // up to ~4 px
    // surf band: foam rolls up the beach and back
    '    float sw = sin(t*.55 + q.x*2.4) + .5*sin(t*.9 - q.x*4.1);',
    '    off += vec2(.15, 1.)*sw*s*7.;',
    // light on the water: slow brighter/darker swell patches and thin, irregular caustic ridges
    '    float sl = fbm(q*3.5 + vec2(t*.05, -t*.08)) - .5;',
    '    vec2 wq = q*11. + 1.6*vec2(fbm(q*4. + t*.09), fbm(q*4. + 9.3 - t*.07));',
    '    float rd = 1. - abs(fbm(wq + vec2(t*.12, t*.05))*2. - 1.);',
    '    float ca = pow(rd, 9.)*smoothstep(.35, .75, fbm(q*2.5 - t*.04));',
    '    mul = 1. + sl*.16*w;',
    '    add = vec3(.85, 1., .97)*ca*.10*w + vec3(.06)*s*max(sw, 0.)*.6;', // foam brightens a little as each wave comes in
    '  }',
    '  vec3 c = texture2D(u_img, uv + off/u_rect.zw).rgb*mul + add;',
    '  gl_FragColor = vec4(c, 1.);',
    '}'
  ].join('\n');

  function sh(type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['u_img', 'u_mask', 'u_res', 'u_rect', 'u_t'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
  gl.uniform1i(U.u_img, 0); gl.uniform1i(U.u_mask, 1);

  function texture(unit, source, mip) {
    var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip && gl2) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  function loadImage(src) {
    return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = no; i.src = src; });
  }

  // where the object-fit: cover photo sits, in canvas pixels (same crop as the <img>)
  var W = 0, H = 0, iw = 2400, ih = 1656;
  function size() {
    var cw = media.clientWidth, ch = media.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 3), max = 8.4e6; // full device resolution up to 4K
    if (cw * ch * dpr * dpr > max) dpr = Math.sqrt(max / (cw * ch));
    W = Math.round(cw * dpr); H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
    var pos = getComputedStyle(img).objectPosition.split(' ');
    var px = parseFloat(pos[0]) / 100, py = parseFloat(pos[1] || pos[0]) / 100;
    if (isNaN(px)) px = .5; if (isNaN(py)) py = .5;
    gl.uniform2f(U.u_res, W, H);
    // the browser lays the cover-fitted <img> out on whole CSS pixels; do the same so the canvas and the palm cut-out line up exactly
    var sc = Math.max(cw / iw, ch / ih), dw = iw * sc, dh = ih * sc, k = W / cw;
    var x = Math.round((cw - dw) * px), y = Math.round((ch - dh) * py);
    gl.uniform4f(U.u_rect, x * k, y * k, (Math.round(x + dw) - x) * k, (Math.round(y + dh) - y) * k);
  }

  var raf = 0, visible = true, t0 = performance.now();
  function draw(now) { gl.uniform1f(U.u_t, (now - t0) / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  function loop(now) { raf = 0; if (!visible || document.hidden) return; draw(now); raf = requestAnimationFrame(loop); }
  function start() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); }

  // only fade the moving water in once the photo's intro zoom is over, so nothing has to be kept in sync
  function zoomDone() {
    return new Promise(function (ok) {
      var a = img.getAnimations ? img.getAnimations() : null;
      if (a && !a.length) return ok();
      img.addEventListener('animationend', function () { ok(); }, { once: true });
      if (!a) setTimeout(ok, 3500);
    });
  }

  // pick the photo file for the size it is drawn at (device pixels), within the GPU's texture limit
  function pickSource() {
    var cw = media.clientWidth, ch = media.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 3);
    var need = Math.max(cw, ch * 2400 / 1656) * dpr, maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    var files = [1200, 2400, 3840].filter(function (w) { return w <= maxTex; });
    for (var i = 0; i < files.length; i++) if (files[i] >= need * .9) break;
    return 'assets/img/strand-palmen-' + files[Math.min(i, files.length - 1)] + '.webp?v=2';
  }
  Promise.all([loadImage(pickSource()), loadImage('assets/img/strand-palmen-wasser.png'), zoomDone()]).then(function (r) {
    iw = r[0].naturalWidth; ih = r[0].naturalHeight;
    texture(0, r[0], true); texture(1, r[1], false);
    media.appendChild(canvas);
    size(); draw(performance.now());
    requestAnimationFrame(function () { canvas.classList.add('on'); });
    start();
    addEventListener('resize', function () { size(); if (!raf) draw(performance.now()); });
    document.addEventListener('visibilitychange', start);
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; start(); }).observe(media.parentNode);
  }).catch(function () {});
})();
