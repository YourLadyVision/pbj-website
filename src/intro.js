import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Loading intro:
// 1. Jelly-purple screen: the mascot pops in above "■ OOZE THE FUN"
// 2. The mascot melts down into the jelly
// 3. The jelly slides up like a curtain, its bottom edge dripping, revealing the page
export function playIntro({ lenis, mascot }) {
  const html = document.documentElement;
  if (!html.classList.contains("intro")) return;

  const overlay = document.querySelector(".intro-overlay");
  const text = overlay.querySelector("p");
  const img = overlay.querySelector(".intro-mascot");
  const drips = overlay.querySelector(".intro-drips");
  const dripPath = drips.querySelector("path");
  const melt = document.querySelector("#melt feDisplacementMap");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  img.src = mascot.snapshot();
  lenis.stop();
  window.scrollTo(0, 0);

  const finish = () => {
    html.classList.remove("intro");
    gsap.ticker.remove(wobble);
    try {
      sessionStorage.setItem("pbj-intro", "1");
    } catch (e) {}
    lenis.start();
    ScrollTrigger.refresh();
  };

  // ---- Dripping edge: a scalloped line with rounded drips of different lengths ----
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dripHeight = 220;
  drips.setAttribute("viewBox", `0 0 ${vw} ${dripHeight}`);

  const count = Math.max(5, Math.round(vw / 90));
  const dripList = Array.from({ length: count }, (_, i) => ({
    x: ((i + 0.3 + Math.random() * 0.4) / count) * vw,
    w: 10 + Math.random() * 14, // half-width
    len: 18 + Math.random() * 46, // resting length
    phase: Math.random() * Math.PI * 2,
  }));
  const state = { stretch: 1, time: 0 };

  function drawDrips() {
    const base = 6;
    let d = `M0,0 L${vw},0 L${vw},${base}`;
    for (let i = dripList.length - 1; i >= 0; i--) {
      const { x, w, len, phase } = dripList[i];
      const L = Math.min(dripHeight - 10, (len + Math.sin(state.time * 2.2 + phase) * 5) * state.stretch);
      d += ` L${x + w},${base}`;
      d += ` C${x + w * 0.6},${base + L * 0.25} ${x + w},${base + L} ${x},${base + L}`;
      d += ` C${x - w},${base + L} ${x - w * 0.6},${base + L * 0.25} ${x - w},${base}`;
    }
    d += ` L0,${base} Z`;
    dripPath.setAttribute("d", d);
  }
  function wobble(time) {
    state.time = time;
    drawDrips();
  }
  gsap.ticker.add(wobble);
  drawDrips();

  if (reduceMotion) {
    gsap.timeline({ onComplete: finish }).to(overlay, { opacity: 0, duration: 0.4, delay: 1 });
    return;
  }

  const tl = gsap.timeline({ onComplete: finish });
  if (import.meta.env.DEV) window.introTl = tl; // handy for testing in the browser
  tl
    // 1. Mascot pops in, then the words
    .from(img, { scale: 0.5, opacity: 0, duration: 0.6, ease: "back.out(2)" })
    .from(text, { opacity: 0, y: 8, duration: 0.4 }, 0.25)
    // 2. The mascot melts down into the jelly
    .to(melt, { attr: { scale: 130 }, duration: 1.0, ease: "power2.in" }, 1.4)
    .to(img, { scaleY: 1.9, scaleX: 0.85, y: 110, transformOrigin: "50% 0%", duration: 1.0, ease: "power2.in" }, 1.4)
    .to(img, { opacity: 0, duration: 0.45, ease: "power1.in" }, 2.0)
    .to(text, { opacity: 0, duration: 0.3 }, 1.6)
    // 3. The jelly slides up, its drips stretching as it goes
    .to(state, { stretch: 2.6, duration: 0.7, ease: "power2.in" }, 2.1)
    .to(overlay, { y: -(vh + dripHeight), duration: 1.1, ease: "power3.inOut" }, 2.2);
}
