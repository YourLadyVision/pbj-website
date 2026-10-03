import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Loading intro:
// 1. Jelly-purple screen with "■ OOZE THE FUN"
// 2. A calm violet vortex forms in the jelly and the text is sucked straight into its dark centre
//    (pulled and stretched towards the hole, not spun), then the vortex collapses into a gooey hole
// 3. The page swirls back out of that hole, with a wobbly, gooey edge, until it fills the screen

// Vortex shader: a soft spiral forms in the jelly, the text (its own transparent layer) is pulled
// into the dark centre with a streaky suction smear, then the whole disc collapses into a gooey hole
const vortexShader = {
  uniforms: {
    tex: { value: null },
    vortex: { value: 0 },
    suck: { value: 0 },
    time: { value: 0 },
    aspect: { value: 1 },
    jelly: { value: new THREE.Vector3() },
    deep: { value: new THREE.Vector3() },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tex;
    uniform float vortex;
    uniform float suck;
    uniform float time;
    uniform float aspect;
    uniform vec3 jelly;
    uniform vec3 deep;
    varying vec2 vUv;

    void main() {
      vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
      float r = length(d);
      float a = atan(d.y, d.x);

      // Calm spiral: two soft, low-contrast arms flowing inwards, strongest near the middle
      float arms = sin(2.0 * a + 5.0 * log(r + 0.03) + time * 2.0);
      float nearMiddle = 1.0 - smoothstep(0.15, 0.9, r);
      vec3 col = jelly * (1.0 + arms * 0.13 * vortex * nearMiddle);

      // The dark eye at the centre, opening wider as the suction gets stronger
      float eyeR = (0.04 + 0.1 * suck) * vortex;
      col = mix(col, deep, (1.0 - smoothstep(eyeR * 0.4, eyeR, r)) * vortex);

      // The text, pulled straight in (no spin): it squeezes thin, and streaks trail behind it
      // towards the hole like it's being vacuumed up
      vec2 k = vec2(max(pow(1.0 - suck, 1.6), 0.0005), max(pow(1.0 - suck, 3.0), 0.0005));
      vec4 txt = vec4(0.0);
      float total = 0.0;
      for (int i = 0; i < 14; i++) {
        float s = float(i) / 13.0;
        float f = 1.0 + suck * 2.2 * s;
        float w = 1.0 - 0.75 * s;
        vec2 suv = (d * f / k) / vec2(aspect, 1.0) + 0.5;
        if (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
          vec4 t = texture2D(tex, suv);
          txt += vec4(t.rgb * t.a, t.a) * w;
        }
        total += w;
      }
      txt /= total;
      txt *= 1.0 + suck * 1.5; // keep the streaks bright as they thin out
      txt *= 1.0 - smoothstep(0.85, 1.0, suck);
      col = col * (1.0 - txt.a) + txt.rgb;

      // At the end the whole jelly disc collapses into a wobbly, gooey hole
      float edge = mix(1.3, 0.0, smoothstep(0.55, 1.0, suck));
      edge *= 1.0 + 0.08 * suck * sin(a * 3.0 - time * 5.0) + 0.04 * suck * sin(a * 7.0 + time * 7.0);
      float alpha = 1.0 - smoothstep(edge - 0.015, edge, r);

      gl_FragColor = vec4(col * alpha, alpha);
    }
  `,
};

export function playIntro({ lenis }) {
  const html = document.documentElement;
  if (!html.classList.contains("intro")) return;

  const site = document.getElementById("site");
  const overlay = document.querySelector(".intro-overlay");
  const text = overlay.querySelector("p");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  lenis.stop();
  window.scrollTo(0, 0);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = vw / 2;
  const cy = vh / 2;

  // ---- The page's gooey "hole" it swirls out of ----
  const hole = { r: 0, wobble: 1, spin: 0 };
  const maxR = Math.hypot(vw, vh) / 2 + 40;
  function drawHole(t = 0) {
    const top = site.getBoundingClientRect().top; // keep the hole centred on the screen
    const pts = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const wob =
        1 + hole.wobble * (0.09 * Math.sin(a * 3 + hole.spin * 2 - t * 5) + 0.05 * Math.sin(a * 7 + t * 7));
      const r = hole.r * wob;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy - top + Math.sin(a) * r).toFixed(1)}`);
    }
    site.style.clipPath = `path("M${pts.join(" L")} Z")`;
  }
  drawHole();

  // Each piece of the page spins and grows around the centre of the screen
  const layers = [...site.children];
  const originFor = (el) => {
    const r = el.getBoundingClientRect();
    return `${cx - r.left}px ${cy - r.top}px`;
  };

  let cleanupSwirl = () => {};
  const finish = () => {
    cleanupSwirl();
    html.classList.remove("intro");
    gsap.set(site, { clearProps: "clipPath" });
    gsap.set(layers, { clearProps: "transform,transformOrigin" });
    try {
      sessionStorage.setItem("pbj-intro", "1");
    } catch (e) {}
    lenis.start();
    ScrollTrigger.refresh();
  };

  if (reduceMotion) {
    gsap.set(site, { clearProps: "clipPath" });
    gsap.timeline({ onComplete: finish }).to(overlay, { opacity: 0, duration: 0.4, delay: 1 });
    return;
  }

  layers.forEach((el) => gsap.set(el, { rotate: -160, scale: 0.25, transformOrigin: originFor(el) }));

  // ---- A twistable copy of the loading screen, drawn on top of it ----
  const dpr = Math.min(window.devicePixelRatio, 2);
  const canvas = document.createElement("canvas");
  canvas.className = "intro-swirl";
  canvas.style.visibility = "hidden";
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(vw, vh, false);

  const pic = document.createElement("canvas");
  pic.width = vw * dpr;
  pic.height = vh * dpr;
  const picTexture = new THREE.CanvasTexture(pic);

  const material = new THREE.ShaderMaterial({ ...vortexShader, transparent: true, premultipliedAlpha: true });
  material.uniforms = THREE.UniformsUtils.clone(vortexShader.uniforms);
  material.uniforms.tex.value = picTexture;
  material.uniforms.aspect.value = vw / vh;
  // Pass colours straight through (no colour conversion) so they match the page exactly
  const rgb = (css) => css.match(/\d+/g).slice(0, 3).map((n) => n / 255);
  material.uniforms.jelly.value.set(...rgb(getComputedStyle(overlay).backgroundColor));
  material.uniforms.deep.value.set(...rgb(getComputedStyle(document.body).backgroundColor));
  const { vortex, suck } = material.uniforms;
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();

  // Paint just the text (on a transparent picture), exactly where the real text sits
  function paintPicture() {
    const ctx = pic.getContext("2d");
    const style = getComputedStyle(text);
    const box = text.getBoundingClientRect();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.fillStyle = style.color;
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = style.letterSpacing;
    ctx.textBaseline = "middle";
    ctx.fillText(text.textContent.toUpperCase(), box.left, box.top + box.height / 2);
    picTexture.needsUpdate = true;
  }

  const tick = (time) => {
    material.uniforms.time.value = time;
    if (canvas.style.visibility !== "hidden") renderer.render(scene, camera);
    drawHole(time);
  };
  gsap.ticker.add(tick);

  function swapToSwirl() {
    paintPicture();
    canvas.style.visibility = "visible";
    overlay.style.visibility = "hidden";
    renderer.render(scene, camera);
  }

  cleanupSwirl = () => {
    gsap.ticker.remove(tick);
    picTexture.dispose();
    material.dispose();
    renderer.dispose();
    canvas.remove();
  };

  const tl = gsap.timeline({ onComplete: finish });
  if (import.meta.env.DEV) window.introTl = tl; // handy for testing in the browser
  tl
    // 1. "Ooze the fun" on jelly purple
    .from(text, { opacity: 0, y: 8, duration: 0.4 })
    // 2. The vortex forms, then the text is sucked in (slowly, then fast) and the jelly collapses
    .call(swapToSwirl, null, 0.9)
    .to(vortex, { value: 1, duration: 0.9, ease: "power1.inOut" }, 0.9)
    .to(suck, { value: 1, duration: 1.3, ease: "power3.in" }, 1.5)
    // 3. The page swirls back out of the hole
    .to(hole, { r: maxR, duration: 1.5, ease: "power2.inOut" }, 2.65)
    .to(hole, { spin: 4, duration: 1.5, ease: "power1.out" }, 2.65)
    .to(hole, { wobble: 0, duration: 0.6, ease: "power1.in" }, 3.55)
    .to(layers, { rotate: 0, scale: 1, duration: 1.5, ease: "power3.out" }, 2.65);
}
