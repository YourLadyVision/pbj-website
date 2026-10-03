import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Loading intro:
// 1. Jelly-purple screen with "■ OOZE THE FUN"
// 2. The screen gets vacuumed into a hole in the middle: the page (text and all) stretches
//    and is dragged inward, slowly at first, then faster, with a dark, deep opening at the centre
// 3. The page comes back out of that hole until it fills the screen

// Vacuum shader: pulls a picture of the loading screen into the centre like a sheet down a drain
const vacuumShader = {
  uniforms: {
    tex: { value: null },
    pull: { value: 0 }, // 0 = untouched, 1 = fully sucked in
    time: { value: 0 },
    aspect: { value: 1 },
    night: { value: new THREE.Vector3() },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tex;
    uniform float pull;
    uniform float time;
    uniform float aspect;
    uniform vec3 night;
    varying vec2 vUv;

    void main() {
      float p = pull;
      vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
      float r = length(d);
      float a = atan(d.y, d.x);

      // Each point shows content from further out, so the whole page shrinks into the hole.
      // It is pulled harder near the middle (the page bunches up there), with a slight
      // drain-like twist and a jelly wobble.
      float f = (1.0 + p * 1.2 + p * 4.0 * exp(-r * 5.0)) / max(1.0 - p, 0.001);
      float rs = r * f * (1.0 + 0.03 * p * sin(a * 5.0 + time * 5.0));
      float sa = a + p * 0.9 * exp(-r * 5.0);
      vec2 suv = vec2(cos(sa), sin(sa)) * rs / vec2(aspect, 1.0) + 0.5;
      vec3 col = texture2D(tex, clamp(suv, 0.0, 1.0)).rgb;

      // Depth: the page darkens as it dips into the hole
      float dip = exp(-r * mix(14.0, 5.0, p));
      col = mix(col, night, clamp(p * 1.4, 0.0, 1.0) * dip);

      // Only the page itself is drawn: as its edges are dragged inward, the dark void shows around it
      vec2 inside = smoothstep(vec2(0.0), vec2(0.004), suv) * smoothstep(vec2(0.0), vec2(0.004), 1.0 - suv);
      float alpha = inside.x * inside.y;

      gl_FragColor = vec4(col * alpha, alpha);
    }
  `,
};

// Colours go to the shader as plain 0–1 values (no colour conversion) so they match the CSS exactly
function cssColor(value) {
  const probe = document.createElement("i");
  probe.style.color = value;
  document.body.appendChild(probe);
  const [r, g, b] = getComputedStyle(probe).color.match(/\d+/g).map(Number);
  probe.remove();
  return new THREE.Vector3(r / 255, g / 255, b / 255);
}

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

  // ---- The page's gooey "hole" it comes back out of ----
  const hole = { r: 0, wobble: 1, spin: 0 };
  const maxR = Math.hypot(vw, vh) / 2 + 40;
  function drawHole(t = 0) {
    const top = site.getBoundingClientRect().top; // keep the hole centred on the screen
    const pts = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const wob =
        1 + hole.wobble * (0.07 * Math.sin(a * 3 + hole.spin * 2 - t * 4) + 0.035 * Math.sin(a * 7 + t * 6));
      const r = hole.r * wob;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy - top + Math.sin(a) * r).toFixed(1)}`);
    }
    site.style.clipPath = `path("M${pts.join(" L")} Z")`;
  }
  drawHole();

  // Each piece of the page grows (with a gentle turn) around the centre of the screen
  const layers = [...site.children];
  const originFor = (el) => {
    const r = el.getBoundingClientRect();
    return `${cx - r.left}px ${cy - r.top}px`;
  };

  let cleanup = () => {};
  const finish = () => {
    cleanup();
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

  layers.forEach((el) => gsap.set(el, { rotate: -60, scale: 0.3, transformOrigin: originFor(el) }));

  // ---- A copy of the loading screen that can be vacuumed in, drawn on top of it ----
  const dpr = Math.min(window.devicePixelRatio, 2);
  const canvas = document.createElement("canvas");
  canvas.style.visibility = "hidden";
  overlay.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(vw, vh, false);

  const pic = document.createElement("canvas");
  pic.width = vw * dpr;
  pic.height = vh * dpr;
  const picTexture = new THREE.CanvasTexture(pic);
  picTexture.minFilter = THREE.LinearFilter;

  const material = new THREE.ShaderMaterial({ ...vacuumShader, transparent: true, premultipliedAlpha: true });
  const u = (material.uniforms = THREE.UniformsUtils.clone(vacuumShader.uniforms));
  u.tex.value = picTexture;
  u.aspect.value = vw / vh;
  u.night.value = cssColor("var(--night)");
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();

  // Paint the loading screen (purple + text, exactly where the real text sits) into the picture
  function startVacuum() {
    const ctx = pic.getContext("2d");
    const style = getComputedStyle(text);
    const box = text.getBoundingClientRect();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = getComputedStyle(overlay).backgroundColor;
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = style.color;
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = style.letterSpacing;
    ctx.textBaseline = "middle";
    ctx.fillText(text.textContent.toUpperCase(), box.left, box.top + box.height / 2);
    picTexture.needsUpdate = true;

    renderer.render(scene, camera);
    canvas.style.visibility = "visible";
    text.style.visibility = "hidden";
    overlay.style.background = "transparent";
  }

  const tick = (time) => {
    u.time.value = time;
    if (canvas.style.visibility !== "hidden") renderer.render(scene, camera);
    drawHole(time);
  };
  gsap.ticker.add(tick);

  cleanup = () => {
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
    // 2. Vacuumed in: slow at first, then faster
    .call(startVacuum, null, 1.2)
    .to(u.pull, { value: 1, duration: 1.4, ease: "power3.in" }, 1.2)
    // 3. The page comes back out of the hole
    .to(hole, { r: maxR, duration: 1.4, ease: "power2.inOut" }, 2.55)
    .to(hole, { spin: 2, duration: 1.4, ease: "power1.out" }, 2.55)
    .to(hole, { wobble: 0, duration: 0.6, ease: "power1.in" }, 3.35)
    .to(layers, { rotate: 0, scale: 1, duration: 1.4, ease: "power3.out" }, 2.55);
}
