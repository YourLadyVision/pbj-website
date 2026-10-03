import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// The PB&J mascot: four photo layers that build a sandwich as people scroll.
// Bottom to top: bread, jelly, peanut butter, bread.
//
// Every number and the timeline below come from the earlier code-built 3D version (see git history),
// so it moves exactly like it did: the same floating-apart heights and tilts, the same drops, the same
// camera that follows the stack down and zooms in, and the same 360-degree turntable spin.
//
// To make flat photos spin like a turntable, each photo lies flat in 3D space (a "plane"), the whole
// stack is tilted back to look down on it, and the spin turns the stack around its vertical axis.
// The photos are stretched vertically by exactly the amount the tilt squashes them, so at rest they
// look just like the original photos.

const TILT = 50; // degrees the stack is tipped back (50 means looking down from 40 degrees above)
const SIN = Math.sin((TILT * Math.PI) / 180);
const UNPROJECT = 1 / Math.cos((TILT * Math.PI) / 180); // cancels the tilt's squash at rest

// Heights in the old world units (half the sandwich's width = 1 unit), up is positive
const STACKED = [0, 0.245, 0.375, 0.62];
const APART = [-0.8, 0.35, 1.45, 2.6];
// Tilts (old x, y, z radians): in the old model y was the vertical axis, so it is the in-plane turn here
const TILTS = [
  [0.05, 0, -0.08],
  [-0.25, 0.3, 0.18],
  [0.22, -0.35, -0.2],
  [-0.3, 0.5, 0.25],
];
const DEG = 180 / Math.PI;

export function createMascot(root) {
  const sandwich = root.querySelector(".sandwich");
  const tilt = root.querySelector(".tilt");
  const spin = root.querySelector(".spin");
  const layers = [...root.querySelectorAll(".layer")];
  const hero = root.closest(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 400; // width of the sandwich in pixels
  let spread = 1; // how far the pieces float apart (shrunk a little on short screens)

  // ---- The animated values (the timeline moves these; draw() puts them on screen) ----
  const piece = layers.map((_, i) => ({
    y: APART[i],
    x: TILTS[i][0] * DEG,
    z: TILTS[i][2] * DEG,
    turn: TILTS[i][1] * DEG,
  }));
  const cam = { target: 0.9, zoom: 1 };
  const turntable = { angle: 0 };
  const hop = layers.map(() => ({ v: 0 }));

  function resize() {
    const { clientWidth: cw, clientHeight: ch } = root;
    if (!cw || !ch) return;
    W = Math.min(cw * 0.95, ch * 0.58);
    // Keep the whole exploded stack inside the hero, even on short screens
    spread = Math.min(1, Math.max(0.35, ((0.76 * ch) / W - 0.58) / 1.27));
    sandwich.style.setProperty("--w", `${W}px`);
    sandwich.style.setProperty("--h", `${(W / 1.5) * UNPROJECT}px`);
    tl.invalidate();
    tl.progress(tl.progress());
    draw(0);
  }

  // ---- Scroll timeline: pieces drop in one by one, then the whole sandwich spins ----
  const tl = gsap.timeline({ paused: true });
  const startAt = [0, 0.2, 1.2, 2.2];
  piece.forEach((p, i) => {
    tl.fromTo(
      p,
      { y: () => APART[i] * spread },
      { y: STACKED[i], duration: 1, ease: i === 0 ? "power2.out" : "bounce.out" },
      startAt[i]
    ).to(p, { x: 0, z: 0, turn: 0, duration: i === 0 ? 1 : 0.8 }, startAt[i]);
  });
  tl.to(turntable, { angle: 360, duration: 1.2, ease: "back.inOut(1.4)" }, 3.2)
    .fromTo(cam, { target: () => 0.9 * spread }, { target: 0.35, duration: 3.2, ease: "none" }, 0)
    .to(cam, { zoom: 1 / 0.82, duration: 1.2, ease: "power2.inOut" }, 3.2);

  // ---- Put the current values on screen ----
  function draw(time) {
    const calm = 1 - tl.progress(); // pieces float less as the sandwich comes together
    const unit = W / 2;
    layers.forEach((layer, i) => {
      const p = piece[i];
      const bob = Math.sin(time * 1.4 + i * 1.3) * 0.08 * calm;
      gsap.set(layer, {
        z: (p.y + bob + hop[i].v * 0.12) * unit,
        rotationX: p.x,
        rotationY: p.turn,
        rotationZ: p.z + Math.sin(time * 1.1 + i) * 0.06 * DEG * calm,
      });
    });
    // The camera follows the stack down, and the whole thing bobs a little
    const lift = cam.target - Math.sin(time * 1.2) * 0.05;
    gsap.set(sandwich, { y: lift * unit * SIN, scale: cam.zoom });
    gsap.set(spin, { rotationZ: turntable.angle });
  }

  gsap.set(tilt, { rotationX: TILT });
  resize();
  new ResizeObserver(resize).observe(root);

  if (reduceMotion) {
    tl.progress(1);
    draw(0);
    return { resize };
  }

  ScrollTrigger.create({
    trigger: hero,
    // On phones the folder tabs sit at the top, so pin the hero just below them
    start: () => `top ${window.matchMedia("(max-width: 767px)").matches ? document.querySelector(".tabs").offsetHeight : 0}`,
    end: "+=180%",
    pin: true,
    scrub: 0.8,
    invalidateOnRefresh: true,
    animation: tl,
  });

  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(root);
  gsap.ticker.add((time) => visible && draw(time));

  // ---- Click or tap: the layers hop one after another, like jelly wobbling ----
  root.addEventListener("click", () => {
    gsap.fromTo(
      hop,
      { v: 0 },
      { v: 1, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.06, ease: "power2.out", overwrite: "auto" }
    );
  });

  return { resize };
}
