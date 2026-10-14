import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Loading intro (timed from a screen recording of the reference site, about 1.25 seconds in all):
// 1. A jelly-purple circle bursts open from the middle of the screen and covers it (0.3s, fast then easing off)
// 2. A placeholder flower grows in the middle, tilting and spinning as it settles
// 3. The flower shrinks and spins away, and the circle closes to a dot, revealing the page

export function playIntro({ lenis }) {
  const html = document.documentElement;
  if (!html.classList.contains("intro")) return;

  const site = document.getElementById("site");
  const overlay = document.querySelector(".intro-overlay");
  const flower = overlay.querySelector(".intro-flower");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  lenis.stop();
  window.scrollTo(0, 0);

  const finish = () => {
    html.classList.remove("intro");
    gsap.set([overlay, flower, site], { clearProps: "all" });
    try {
      sessionStorage.setItem("pbj-intro", "1");
    } catch (e) {}
    lenis.start();
    ScrollTrigger.refresh();
  };

  if (reduceMotion) {
    site.style.visibility = "visible";
    gsap.timeline({ onComplete: finish }).to(overlay, { opacity: 0, duration: 0.4, delay: 0.6 });
    return;
  }

  // The circle's radius, in pixels, reaches the screen corners at its biggest
  const circle = { r: 0 };
  const maxR = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 4;
  const draw = () => (overlay.style.clipPath = `circle(${circle.r.toFixed(1)}px at 50% 50%)`);
  draw();

  gsap.set(flower, { scale: 0, transformPerspective: 600 });

  const tl = gsap.timeline({ onComplete: finish, delay: 0.1 });
  if (import.meta.env.DEV) window.introTl = tl; // handy for testing in the browser
  tl
    // 1. The circle bursts open
    .to(circle, { r: maxR, duration: 0.3, ease: "power2.out", onUpdate: draw }, 0)
    // 2. The flower grows in, spinning and tilting until it settles
    .to(flower, { scale: 1, rotateZ: 14, rotateY: -12, rotateX: 8, duration: 0.45, ease: "power3.out" }, 0.05)
    .set(flower, { rotateZ: -106, rotateY: 75, rotateX: 0 }, 0)
    // The page is put in place behind the circle while it covers the screen
    .call(() => (site.style.visibility = "visible"), null, 0.75)
    // 3. The flower spins away and the circle closes to a dot
    .to(flower, { scale: 0, rotateZ: 100, rotateY: 75, rotateX: 0, duration: 0.22, ease: "power2.in" }, 0.8)
    .to(circle, { r: 0, duration: 0.28, ease: "power1.inOut", onUpdate: draw }, 0.98);
}
