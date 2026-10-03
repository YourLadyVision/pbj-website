import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// The PB&J mascot: four photo layers that build a sandwich as people scroll.
// Bottom to top: bread, jelly, peanut butter, bread. (The earlier code-built 3D version is in git history.)
//
// Each layer has three nested parts so the effects don't fight each other:
//   .layer  moved and tilted by scrolling (dropping into place)
//   .px     nudged by the mouse (depth parallax) and squashed by the end bounce / click
//   img     floats gently while the pieces are still apart

// Heights are in 1/1000ths of the sandwich's width, up is negative
const STACKED = [0, -30, -48, -92];
const APART = [650, 215, -215, -650]; // spread out like an exploded diagram
const TILT = [3, -12, 10, -8];
const DROP_AT = [0, 0.9, 1.9, 2.9]; // when each layer starts dropping on the scroll timeline

export function createMascot(root) {
  const sandwich = root.querySelector(".sandwich");
  const layers = [...root.querySelectorAll(".layer")];
  const pxs = layers.map((l) => l.querySelector(".px"));
  const imgs = layers.map((l) => l.querySelector("img"));
  const hero = root.closest(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let unit = 0.56; // pixels per 1/1000 of the sandwich width

  // Keep the whole sandwich (even when its pieces are floating apart) inside the hero
  function resize() {
    const { clientWidth: cw, clientHeight: ch } = root;
    if (!cw || !ch) return;
    const w = Math.min(cw * 1.05, ch * 0.62);
    sandwich.style.setProperty("--w", `${w}px`);
    unit = w / 1000;
    tl.invalidate();
  }

  // ---- Scroll timeline: layers drop in one by one, then the whole sandwich bounces ----
  const tl = gsap.timeline({ paused: true });
  layers.forEach((layer, i) => {
    tl.fromTo(
      layer,
      { y: () => APART[i] * unit, rotation: TILT[i] },
      {
        y: () => STACKED[i] * unit,
        rotation: 0,
        duration: i === 0 ? 1 : 1.1,
        ease: i === 0 ? "power2.out" : "bounce.out",
      },
      DROP_AT[i]
    );
  });
  tl.fromTo(sandwich, { scale: 0.7 }, { scale: 1.3, duration: 4, ease: "power2.in" }, 0)
    // Squash and spring back when the last slice lands
    .to(pxs, { scaleY: 0.92, scaleX: 1.03, duration: 0.2, ease: "power2.out", stagger: 0.03 }, 3.9)
    .to(pxs, { scaleY: 1, scaleX: 1, duration: 0.8, ease: "elastic.out(1, 0.35)", stagger: 0.03 }, 4.1);

  resize();
  new ResizeObserver(resize).observe(root);

  if (reduceMotion) {
    tl.progress(1);
    return { resize };
  }

  ScrollTrigger.create({
    trigger: hero,
    // On phones the folder tabs sit at the top, so pin the hero just below them
    start: () => `top ${window.matchMedia("(max-width: 767px)").matches ? document.querySelector(".tabs").offsetHeight : 0}`,
    end: "+=200%",
    pin: true,
    scrub: 0.8,
    invalidateOnRefresh: true,
    animation: tl,
  });

  // ---- Floating: pieces bob gently while apart, settling as they come together ----
  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(root);
  gsap.ticker.add((time) => {
    if (!visible) return;
    const calm = 1 - tl.progress();
    imgs.forEach((img, i) => {
      gsap.set(img, {
        y: Math.sin(time * 1.4 + i * 1.3) * 7 * calm,
        rotation: Math.sin(time * 1.1 + i) * 1.5 * calm,
      });
    });
  });

  // ---- Mouse: the layers shift at different depths, so the stack feels 3D ----
  if (window.matchMedia("(hover: hover)").matches) {
    const moveX = pxs.map((el) => gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" }));
    const moveY = pxs.map((el) => gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" }));
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      pxs.forEach((_, i) => {
        const depth = 0.4 + i * 0.4;
        moveX[i](-nx * depth * 10);
        moveY[i](-ny * depth * 6);
      });
    });
  }

  // ---- Click or tap: the layers hop one after another, like jelly wobbling ----
  root.addEventListener("click", () => {
    gsap.fromTo(
      imgs,
      { scaleY: 1 },
      { scaleY: 0.9, duration: 0.12, yoyo: true, repeat: 1, stagger: 0.06, ease: "power2.out", overwrite: "auto" }
    );
    gsap.fromTo(
      layers,
      { yPercent: 0 },
      { yPercent: -4, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.06, ease: "power2.out", overwrite: "auto" }
    );
  });

  return { resize };
}
