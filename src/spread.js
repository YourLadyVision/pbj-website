// Layout section: a thick slab of peanut butter. The cursor (or a finger) acts like a finger pressed
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
  vec2 e = 1.0 / uSize;
  vec4 s = texture(uPrev, uv);
  vec4 avg = (texture(uPrev, uv + vec2(e.x, 0.0)) + texture(uPrev, uv - vec2(e.x, 0.0))
            + texture(uPrev, uv + vec2(0.0, e.y)) + texture(uPrev, uv - vec2(0.0, e.y))) * 0.25;
  s = mix(s, avg, 0.1) * uDecay;
  vec2 v = uSeg.zw - uSeg.xy;
  float len = length(v);
  if (uAmt > 0.0 && len > 0.0) {
    float step = clamp(len / 8.0 / (uR * 0.35), 0.0, 1.0);
    for (int i = 0; i < 8; i++) {
      float t = (float(i) + 0.5) / 8.0;
      vec2 d = px - mix(uSeg.xy, uSeg.zw, t);
      float r2 = dot(d, d) / (uR * uR);
      float g = exp(-r2 * 1.6);
      float g2 = exp(-r2 * 0.45);
      s.xy += (v / 8.0) / uSize * g * 0.9;
      s.xy += vec2(-d.y, d.x) / uR * (len / 8.0 / uSize) * g * 0.7;
      s.z += (-g + 0.26 * g2) * 0.2 * step;
    }
  }
  s.xy = clamp(s.xy, -0.3, 0.3);
  s.z = clamp(s.z, -1.6, 1.6);
  o = s;
}`;

const DRAW_FS = `#version 300 es
precision highp float;
uniform sampler2D uPhoto, uState;
uniform vec2 uRes;
uniform vec4 uRect;
uniform float uRad, uBevel, uDepth, uDpr, uPhotoAspect;
uniform vec3 uPage;
out vec4 o;

float sdIn(vec2 p){
  vec2 c = uRect.xy + uRect.zw * 0.5;
  vec2 q = abs(p - c) - (uRect.zw * 0.5 - uRad);
  return -(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRad);
}
float prof(float t){ t = clamp(t, 0.0, 1.0); return sqrt(1.0 - (1.0 - t) * (1.0 - t)); }
float hb(vec2 p){ return prof(sdIn(p) / uBevel); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main(){
  vec2 P = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float d = sdIn(P);
  // soft shadow of the slab on the page
  float sh = 1.0 - smoothstep(-6.0 * uDpr, 34.0 * uDpr, -sdIn(P - vec2(5.0, 16.0) * uDpr));
  vec3 col = uPage * (1.0 - 0.30 * sh * sh);
  float alpha = smoothstep(-0.5, 1.0, d);
  if (alpha <= 0.0) { o = vec4(col, 1.0); return; }

  vec2 ruv = (P - uRect.xy) / uRect.zw;
  vec2 epsUV = 2.0 * uDpr / uRect.zw;
  vec2 st = texture(uState, ruv).xy;
  float hL = texture(uState, ruv - vec2(epsUV.x, 0.0)).z;
  float hR = texture(uState, ruv + vec2(epsUV.x, 0.0)).z;
  float hU = texture(uState, ruv - vec2(0.0, epsUV.y)).z;
  float hD = texture(uState, ruv + vec2(0.0, epsUV.y)).z;
  float ep = 2.0 * uDpr;
  vec2 ex = vec2(ep, 0.0), ey = vec2(0.0, ep);
  float bh = uBevel * 0.55;
  float gx = (hb(P + ex) - hb(P - ex)) / (2.0 * ep) * bh + (hR - hL) / (2.0 * ep) * uDepth;
  float gy = (hb(P + ey) - hb(P - ey)) / (2.0 * ep) * bh + (hD - hU) / (2.0 * ep) * uDepth;
  vec3 n = normalize(vec3(-gx, -gy, 1.0));

  // the picture rides with the pushed butter and tucks in around the rounded edge
  float t = clamp(d / uBevel, 0.0, 1.0);
  vec2 src = ruv - st;
  src = vec2(0.5) + (src - vec2(0.5)) * (1.0 - 0.05 * (1.0 - t));
  src += vec2(gx, gy) * 0.0015;
  float ra = uRect.z / uRect.w;
  vec2 sc = ra > uPhotoAspect ? vec2(1.0, uPhotoAspect / ra) : vec2(ra / uPhotoAspect, 1.0);
  vec2 uv = (src - 0.5) * sc + 0.5;
  uv = 1.0 - abs(1.0 - mod(uv, 2.0));
  vec3 base = texture(uPhoto, uv).rgb;
  base *= 1.0 + (hash(P) - 0.5) * 0.03;

  vec3 L = normalize(vec3(-0.55, -0.65, 0.75));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float flatD = L.z;
  float diff = clamp(dot(n, L) / flatD, 0.45, 1.45);
  float lit = mix(1.0, diff, 0.8);
  float spec = pow(max(dot(n, H), 0.0), 70.0) * 0.55 + pow(max(dot(n, H), 0.0), 18.0) * 0.1;
  float specFlat = pow(H.z, 70.0) * 0.55 + pow(H.z, 18.0) * 0.1;
  spec = max(spec - specFlat, 0.0);
  float edgeShade = mix(0.88, 1.0, smoothstep(0.0, 0.7, t));
  vec3 c = base * lit * edgeShade + vec3(1.0, 0.93, 0.78) * spec;
  c = mix(c, c * c * 1.0 + c * 0.0, 0.0);
  o = vec4(mix(col, c, alpha), 1.0);
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
  const page = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--page") || "#fffdf8");

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
    const gap = Math.max(12 * dpr, cw * 0.018);
    const w = cw - gap * 2, h = ch - gap * 2;
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
    gl.uniform1f(sim.u.uDecay, Math.pow(0.5, dt / 5));
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
    gl.uniform4f(draw.u.uRect, L.x, L.y, L.w, L.h);
    gl.uniform1f(draw.u.uRad, L.rad);
    gl.uniform1f(draw.u.uBevel, L.bevel);
    gl.uniform1f(draw.u.uDepth, L.w * 0.02);
    gl.uniform1f(draw.u.uDpr, L.dpr);
    gl.uniform1f(draw.u.uPhotoAspect, photoAspect);
    gl.uniform3f(draw.u.uPage, page[0], page[1], page[2]);
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
