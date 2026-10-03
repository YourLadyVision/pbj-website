import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Loading intro, modelled on noartmusic.com:
// 1. Black screen with "■ OOZE THE FUN"
// 2. Cut to the page: a small square with viewfinder corners appears in the middle
// 3. The square grows to about half the screen
// 4. Then it opens up to the full page, which zooms out into place
export function playIntro({ lenis }) {
  const html = document.documentElement;
  if (!html.classList.contains("intro")) return;

  const site = document.getElementById("site");
  const overlay = document.querySelector(".intro-overlay");
  const text = overlay.querySelector("p");
  const frame = document.querySelector(".intro-frame");
  const tile = frame.querySelector(".intro-tile");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  lenis.stop();
  window.scrollTo(0, 0);

  const finish = () => {
    html.classList.remove("intro");
    gsap.set(site, { clearProps: "clipPath" });
    gsap.set(site.children, { clearProps: "transform,transformOrigin" });
    gsap.set([frame, tile], { clearProps: "all" });
    try {
      sessionStorage.setItem("pbj-intro", "1");
    } catch (e) {}
    lenis.start();
    ScrollTrigger.refresh();
  };

  if (reduceMotion) {
    gsap.timeline({ onComplete: finish }).to(overlay, { opacity: 0, duration: 0.4, delay: 1 });
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // The square clips the whole site; the zoom happens on the pieces inside it,
  // each scaled around the centre of the screen
  const layers = [...site.children];
  const originFor = (el) => {
    const r = el.getBoundingClientRect();
    return `${vw / 2 - r.left}px ${vh / 2 - r.top}px`;
  };
  const pad = 12; // gap between the square and its corner marks

  // One box (width x height, centred on screen) drives both the page clip and the corner marks
  const box = { w: 0, h: 0 };
  const drawBox = () => {
    const x = (vw - box.w) / 2;
    const y = (vh - box.h) / 2;
    site.style.clipPath = `inset(${y}px ${x}px calc(100% - ${y + box.h}px) ${x}px)`;
    gsap.set(frame, { width: box.w + pad * 2, height: box.h + pad * 2, left: x - pad, top: y - pad });
  };

  const small = 110;
  const medium = Math.min(vw, vh) * 0.55;

  drawBox();
  layers.forEach((el) => gsap.set(el, { scale: 1.8, transformOrigin: originFor(el) }));

  const tl = gsap.timeline({ onComplete: finish });
  if (import.meta.env.DEV) window.introTl = tl; // handy for testing in the browser
  tl
    // 1. "Ooze the fun" on black
    .from(text, { opacity: 0, duration: 0.3 })
    .set(overlay, { display: "none" }, "+=1.2")
    // 2. Small framed square pops in
    .to(box, { w: small, h: small, duration: 0.35, ease: "power2.out", onUpdate: drawBox })
    // 3. Grows to about half the screen
    .to(box, { w: medium, h: medium, duration: 0.6, ease: "power3.inOut", onUpdate: drawBox }, "+=0.35")
    .to(layers, { scale: 1.4, duration: 0.6, ease: "power3.inOut" }, "<")
    // The tile flicks through the PB&J colours, like No Art's square flicking through images
    .set(tile, { backgroundColor: "var(--strawberry)" }, "-=0.3")
    .set(tile, { backgroundColor: "var(--peanut)" }, "+=0.3")
    // 4. Opens up to the full page and settles into place
    .to(box, { w: vw, h: vh, duration: 0.9, ease: "power3.inOut", onUpdate: drawBox }, "+=0.25")
    .to(layers, { scale: 1, duration: 0.9, ease: "power3.inOut" }, "<")
    .to(frame, { opacity: 0, duration: 0.9, ease: "power3.in" }, "<")
    .to(tile, { opacity: 0, duration: 0.35, ease: "power1.out" }, "<");
}
