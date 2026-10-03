import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Loading intro:
// 1. Jelly-purple screen with "■ OOZE THE FUN"
// 2. The purple turns into a spinning jelly vortex, and the text is sucked straight into its centre
// 3. The whole vortex collapses into a gooey hole over a dark backdrop
// 4. The page swirls back out of that hole until it fills the screen

// Vortex shader: glossy spiral bands flowing into a dark eye, which can collapse into a wobbling disc
const vortexShader = {
  uniforms: {
    time: { value: 0 },
    vortex: { value: 0 }, // 0 = flat jelly, 1 = full spiral
    collapse: { value: 0 }, // 0 = full screen, 1 = sucked into the centre
    aspect: { value: 1 },
    grape: { value: new THREE.Vector3() },
    light: { value: new THREE.Vector3() },
    glow: { value: new THREE.Vector3() },
    night: { value: new THREE.Vector3() },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform float time;
    uniform float vortex;
    uniform float collapse;
    uniform float aspect;
    uniform vec3 grape;
    uniform vec3 light;
    uniform vec3 glow;
    uniform vec3 night;
    varying vec2 vUv;

    void main() {
      vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
      float r = length(d);
      float a = atan(d.y, d.x);
      float c = collapse;

      // Spiral arms that flow inward; they tighten and speed up as everything is sucked in
      float rr = r * (1.0 + c * c * 6.0);
      float flow = time * (1.2 + vortex * 2.0) + c * c * 18.0;
      float s = a * 3.0 + log(rr + 0.001) * 6.0 + flow;
      float band = 0.5 + 0.5 * sin(s);
      float gloss = pow(band, 8.0);
      vec3 spiral = mix(grape * 0.65, light, band);
      spiral = mix(spiral, glow, gloss * 0.55);
      spiral = mix(night, spiral, smoothstep(0.02, 0.3, rr)); // the dark eye in the middle
      vec3 col = mix(grape, spiral, vortex);

      // Collapse: the jelly shrinks into a wobbly, gooey disc
      float edge = 1.1 * (1.0 - c);
      edge *= 1.0 + 0.10 * c * sin(a * 3.0 - time * 6.0) + 0.05 * c * sin(a * 7.0 + time * 8.0);
      float alpha = 1.0 - smoothstep(edge - 0.015, edge, r);

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

  let cleanupVortex = () => {};
  const finish = () => {
    cleanupVortex();
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

  // ---- The vortex, drawn behind the text ----
  const dpr = Math.min(window.devicePixelRatio, 2);
  const canvas = document.createElement("canvas");
  overlay.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(vw, vh, false);

  const material = new THREE.ShaderMaterial({ ...vortexShader, transparent: true, premultipliedAlpha: true });
  const u = (material.uniforms = THREE.UniformsUtils.clone(vortexShader.uniforms));
  u.aspect.value = vw / vh;
  u.grape.value = cssColor("var(--grape)");
  u.light.value = cssColor("#a85a96"); // lighter, glossy jelly
  u.glow.value = cssColor("var(--cheek, #f49aa8)");
  u.night.value = cssColor("var(--night)");
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();

  const tick = (time) => {
    u.time.value = time;
    renderer.render(scene, camera);
    drawHole(time);
  };
  gsap.ticker.add(tick);
  tick(gsap.ticker.time);
  overlay.style.background = "transparent"; // the vortex canvas now paints the jelly

  cleanupVortex = () => {
    gsap.ticker.remove(tick);
    material.dispose();
    renderer.dispose();
    canvas.remove();
  };

  const tl = gsap.timeline({ onComplete: finish });
  if (import.meta.env.DEV) window.introTl = tl; // handy for testing in the browser
  tl
    // 1. "Ooze the fun" on jelly purple
    .from(text, { opacity: 0, y: 8, duration: 0.4 })
    // 2. The jelly starts to spiral, and the text is pulled straight into the middle
    .to(u.vortex, { value: 1, duration: 1.0, ease: "power2.inOut" }, 0.6)
    .to(
      text,
      { scale: 0, letterSpacing: "-0.5em", opacity: 0, filter: "blur(2px)", duration: 0.9, ease: "power3.in" },
      1.4
    )
    // 3. The whole vortex is sucked into a gooey hole
    .to(u.collapse, { value: 1, duration: 0.9, ease: "power2.inOut" }, 2.0)
    // 4. The page swirls back out of the hole
    .to(hole, { r: maxR, duration: 1.5, ease: "power2.inOut" }, 2.8)
    .to(hole, { spin: 4, duration: 1.5, ease: "power1.out" }, 2.8)
    .to(hole, { wobble: 0, duration: 0.6, ease: "power1.in" }, 3.7)
    .to(layers, { rotate: 0, scale: 1, duration: 1.5, ease: "power3.out" }, 2.8);
}
