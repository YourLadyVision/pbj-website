// Layout section: a layer of peanut butter. The cursor (or a finger) acts like a finger pressed
// into it: it pushes the butter along, swirls it and leaves impressions that slowly settle.
// WebGL2: a small "state" texture (push + dent height) is updated every frame, then drawn as lit butter.

const PHOTO = "/spread/pb-swirl.jpg";
const SIM_W = 512;

const VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

const SIM_FS = `#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uSize;
uniform vec4 uSeg;
uniform float uR, uAmt, uDecay;
out vec4 o;
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uSize;
  // finger flow at this pixel: pushes along its path and curls around it
  vec2 u = vec2(0.0);
  vec2 v = uSeg.zw - uSeg.xy;
  float len = length(v);
  if (uAmt > 0.0 && len > 0.0) {
    for (int i = 0; i < 8; i++) {
      float t = (float(i) + 0.5) / 8.0;
      vec2 d = px - mix(uSeg.xy, uSeg.zw, t);
      float g = exp(-dot(d, d) / (uR * uR) * 1.4);
      u += (v / 8.0) / uSize * g * 1.0;
      u += vec2(-d.y, d.x) / uR * (len / 8.0 / uSize) * g * 0.9;
    }
  }
  // advect: the butter at this spot came from where it was one step ago
  vec2 s = texture(uPrev, uv - u).xy - u;
  s = clamp(s * uDecay, -0.6, 0.6);
  o = vec4(s, 0.0, 1.0);
}`;

const DRAW_FS = `#version 300 es
precision highp float;
uniform sampler2D uPhoto, uState;
uniform vec2 uRes;
uniform float uPhotoAspect;
out vec4 o;
void main(){
  vec2 ruv = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes;
  vec2 src = ruv - texture(uState, ruv).xy;
  float ra = uRes.x / uRes.y;
  vec2 sc = ra > uPhotoAspect ? vec2(1.0, uPhotoAspect / ra) : vec2(ra / uPhotoAspect, 1.0);
  vec2 uv = (src - 0.5) * sc + 0.5;
  uv = 1.0 - abs(1.0 - mod(uv, 2.0));
  o = vec4(texture(uPhoto, uv).rgb, 1.0);
}`;

function makeProgram(gl, fs) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name;
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

function hexToRgb(hex) {
  const h = hex.trim().replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

export function setupSpread() {
  const stage = document.querySelector(".spread-stage");
  const canvas = stage?.querySelector("canvas");
  if (!canvas) return;
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
  if (!gl || !(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"))) {
    stage.style.background = "var(--page)";
    return;
  }
  gl.getExtension("OES_texture_float_linear");

  const sim = makeProgram(gl, SIM_FS);
  const draw = makeProgram(gl, DRAW_FS);
  gl.bindVertexArray(gl.createVertexArray());

  // photo
  const photoTex = gl.createTexture();
  let photoAspect = 736 / 866;
  let photoReady = false;
  const img = new Image();
  img.onload = () => {
    photoAspect = img.naturalWidth / img.naturalHeight;
    gl.bindTexture(gl.TEXTURE_2D, photoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    photoReady = true;
    render();
  };
  img.src = PHOTO;

  // state textures (ping-pong)
  let tex = [], fbo = [], cur = 0;
  let L = { x: 0, y: 0, w: 1, h: 1, rad: 10, bevel: 30, dpr: 1, sw: SIM_W, sh: 300 };

  function makeState() {
    tex.forEach((t) => gl.deleteTexture(t));
    fbo.forEach((f) => gl.deleteFramebuffer(f));
    tex = []; fbo = [];
    for (let i = 0; i < 2; i++) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, L.sw, L.sh, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      tex.push(t); fbo.push(f);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(2, Math.round(stage.clientWidth * dpr));
    const ch = Math.max(2, Math.round(stage.clientHeight * dpr));
    canvas.width = cw;
    canvas.height = ch;
    const gap = 0;
    const w = cw, h = ch;
    L = {
      x: gap, y: gap, w, h, dpr,
      rad: Math.min(w, h) * 0.06,
      bevel: Math.min(w, h) * 0.075,
      sw: SIM_W, sh: Math.max(8, Math.round((SIM_W * h) / w)),
    };
    makeState();
    render();
  }

  // pointer -> segment in state pixels
  let last = null, next = null, hint = null;
  const toSim = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    const px = ((cx - r.left) / r.width) * canvas.width;
    const py = ((cy - r.top) / r.height) * canvas.height;
    return [((px - L.x) / L.w) * L.sw, ((py - L.y) / L.h) * L.sh];
  };
  const inside = (p) => p[0] >= 0 && p[1] >= 0 && p[0] <= L.sw && p[1] <= L.sh;
  const aim = (cx, cy) => {
    const p = toSim(cx, cy);
    next = inside(p) ? p : null;
    if (!next) last = null;
  };
  canvas.addEventListener("pointermove", (e) => { hint = null; aim(e.clientX, e.clientY); });
  canvas.addEventListener("pointerdown", (e) => { hint = null; last = null; aim(e.clientX, e.clientY); });
  canvas.addEventListener("pointerleave", () => { next = null; last = null; });

  let lastT = performance.now();
  function step(dt) {
    if (hint) {
      hint.t += dt;
      const k = hint.t / 3.2;
      if (k >= 1) hint = null;
      else {
        const a = k * Math.PI * 2 * 1.25;
        next = [L.sw * (0.5 + 0.28 * Math.sin(a + 0.6)) , L.sh * (0.5 + 0.26 * Math.sin(a * 1.6))];
        if (k < 0.04) last = null;
      }
    }
    const seg = last && next ? [last[0], last[1], next[0], next[1]] : [0, 0, 0, 0];
    const amt = last && next ? 1 : 0;
    if (next) last = next;
    const r = L.sw * 0.05;
    gl.useProgram(sim.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]);
    gl.viewport(0, 0, L.sw, L.sh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
    gl.uniform1i(sim.u.uPrev, 0);
    gl.uniform2f(sim.u.uSize, L.sw, L.sh);
    gl.uniform4f(sim.u.uSeg, seg[0], seg[1], seg[2], seg[3]);
    gl.uniform1f(sim.u.uR, r);
    gl.uniform1f(sim.u.uAmt, amt);
    gl.uniform1f(sim.u.uDecay, Math.pow(0.5, dt / 25));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cur = 1 - cur;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    next = hint ? next : (amt ? next : next);
  }

  function render() {
    if (!photoReady) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(draw.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, photoTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
    gl.uniform1i(draw.u.uPhoto, 0);
    gl.uniform1i(draw.u.uState, 1);
    gl.uniform2f(draw.u.uRes, canvas.width, canvas.height);
    gl.uniform1f(draw.u.uPhotoAspect, photoAspect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // run only while the section is on screen
  let running = false;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    step(dt);
    render();
    requestAnimationFrame(loop);
  }
  let hinted = false;
  new IntersectionObserver(([en]) => {
    const vis = en.isIntersecting;
    if (vis && !running) {
      running = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
      if (!hinted && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        hinted = true;
        hint = { t: 0 };
      }
    } else if (!vis) running = false;
  }, { threshold: 0.4 }).observe(stage);

  new ResizeObserver(resize).observe(stage);
  resize();

  if (import.meta.env?.DEV) {
    window.__spread = {
      move(cx, cy) { aim(cx, cy); },
      frame(dt = 1 / 60) { step(dt); render(); },
      stop() { hint = null; running = false; },
    };
  }
}
