/* Lavender Capital — WebGL hero: live glass refraction.
   Progressive enhancement: the static <img> stays for SEO / no-WebGL /
   reduced-motion; the canvas fades in over it once the first frame renders. */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var figure = document.querySelector(".hero-visual");
  var img = figure && figure.querySelector("img");
  if (!figure || !img) return;

  var canvas = document.createElement("canvas");
  canvas.className = "hero-gl";
  canvas.setAttribute("aria-hidden", "true");
  figure.insertBefore(canvas, figure.firstChild ? figure.firstChild.nextSibling : null);

  var gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" })
        || canvas.getContext("experimental-webgl");
  if (!gl) { canvas.remove(); return; }

  var VERT = [
    "attribute vec2 a_pos;",
    "void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "uniform sampler2D u_tex;",
    "uniform vec2 u_res;",
    "uniform vec2 u_texres;",
    "uniform float u_time;",
    "uniform vec2 u_mouse;",
    "uniform float u_mstr;",
    "",
    "vec2 coverUV(vec2 uv){",
    "  float ca = u_res.x / u_res.y;",
    "  float ta = u_texres.x / u_texres.y;",
    "  vec2 s = (ca > ta) ? vec2(1.0, ta / ca) : vec2(ca / ta, 1.0);",
    "  return (uv - 0.5) * s + 0.5;",
    "}",
    "",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / u_res;",
    "  uv.y = 1.0 - uv.y;",
    "  float t = u_time;",
    "",
    "  /* slow breathing zoom (replaces the Ken Burns drift) */",
    "  float zoom = 1.07 + 0.035 * sin(t * 0.24);",
    "  vec2 p = (uv - 0.5) / zoom + 0.5;",
    "",
    "  /* layered glass waves — slow, small amplitude */",
    "  vec2 w = vec2(",
    "    sin(p.y * 9.0 + t * 0.55) + 0.6 * sin(p.y * 17.0 - t * 0.34),",
    "    cos(p.x * 8.0 - t * 0.47) + 0.6 * sin(p.x * 15.0 + t * 0.4)",
    "  ) * 0.0032;",
    "",
    "  /* cursor lens ripple */",
    "  vec2 d = uv - u_mouse;",
    "  d.x *= u_res.x / u_res.y;",
    "  float dist = length(d);",
    "  vec2 dir = d / max(dist, 1e-4);",
    "  float ripple = sin(dist * 26.0 - t * 2.6) * exp(-dist * 4.2) * 0.013 * u_mstr;",
    "  float lens = exp(-dist * 5.0) * 0.010 * u_mstr;",
    "  vec2 mo = dir * (ripple - lens);",
    "",
    "  vec2 duv = coverUV(p) + w + mo;",
    "",
    "  /* chromatic aberration scaled by local displacement */",
    "  float ab = (length(w) * 0.8 + abs(ripple) + lens) * 1.5;",
    "  float r = texture2D(u_tex, duv + dir * ab).r;",
    "  float g = texture2D(u_tex, duv).g;",
    "  float b = texture2D(u_tex, duv - dir * ab).b;",
    "",
    "  /* faint lavender bloom that follows the cursor */",
    "  vec3 col = vec3(r, g, b);",
    "  col += vec3(0.70, 0.63, 0.92) * exp(-dist * 3.4) * 0.07 * u_mstr;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["u_tex", "u_res", "u_texres", "u_time", "u_mouse", "u_mstr"].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var texW = 0, texH = 0;

  function resize() {
    var r = figure.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width * DPR));
    var h = Math.max(1, Math.round(r.height * DPR));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  /* ---- state ---- */
  var running = false, started = false, revealed = false;
  var t0 = performance.now();
  var mouse = { x: 0.34, y: 0.3 };
  var mstr = 0;

  function frame(now) {
    if (!running) return;
    resize();
    gl.uniform2f(U.u_res, canvas.width, canvas.height);
    gl.uniform2f(U.u_texres, texW, texH);
    gl.uniform1f(U.u_time, (now - t0) / 1000);
    gl.uniform2f(U.u_mouse, mouse.x, mouse.y);
    gl.uniform1f(U.u_mstr, mstr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!revealed) {
      revealed = true;
      figure.classList.add("gl-on");
      canvas.classList.add("on");
      /* the shader owns the drift now — stop tweening the hidden img */
      if (window.gsap) window.gsap.killTweensOf(img);
    }
    requestAnimationFrame(frame);
  }

  function setRunning(on) {
    if (on && !running && started) { running = true; requestAnimationFrame(frame); }
    if (!on) running = false;
  }

  /* pause offscreen + hidden tab */
  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      setRunning(visible && !document.hidden);
    }, { rootMargin: "80px" }).observe(figure);
  }
  document.addEventListener("visibilitychange", function () {
    setRunning(visible && !document.hidden);
  });

  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    running = false;
    figure.classList.remove("gl-on");
    canvas.classList.remove("on");
  });

  /* ---- texture ---- */
  var tex = gl.createTexture();
  var texImg = new Image();
  texImg.decoding = "async";
  texImg.onload = function () {
    texW = texImg.naturalWidth; texH = texImg.naturalHeight;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texImg);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(U.u_tex, 0);
    started = true;
    setRunning(visible && !document.hidden);
  };
  texImg.src = img.currentSrc || img.src;
})();
