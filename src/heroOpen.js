import { gsap } from "gsap";

// The hero opening, after the loading screen:
// 1. "PEANUT BUTTER JELLY" sits in one line (dark yellow, light yellow, red)
// 2. The words split into three lines, one under the other, and stretch across the hero with room on every edge
// 3. The assembled sandwich grows out of the middle, in front of the words, then its layers float apart
// After that the page works exactly as before (one scroll, one step).

const STEP = 0.84; // how far apart stacked words sit, in word-heights (line boxes are taller than capitals)
const TOP_TRIM = 0.1; // capitals sit a little low inside their box; pull them up by this much

// Call it straight away (it lays the title out in one line, ready for the loading screen to reveal);
// call the returned start() when the loading screen is done.
export function playHeroOpen({ hero, mascot, lenis }) {
  const title = hero.querySelector(".hero-title");
  if (!title) return { start() {} };
  const words = [...title.querySelectorAll(".ht")];
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const { opening } = mascot;
  let widths = [];
  let layoutA = [];
  let layoutB = [];
  let t = 0; // 0 = one line, 1 = three lines

  const measure = () => {
    words.forEach((w) => {
      w.style.fontSize = "100px";
      w.style.letterSpacing = "-1.44px";
    });
    widths = words.map((w) => w.offsetWidth);
    const W = hero.clientWidth; // not getBoundingClientRect: the loading screen scales the page while it swirls out
    const H = hero.clientHeight;
    const mx = W * 0.06;
    const my = H * 0.07;
    const availW = W - 2 * mx;
    const availH = H - 2 * my;

    // 1. one line, centred
    const gap = 28; // a word space at 100px
    const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    const sA = Math.min((availW * 0.8) / total, 1.6);
    let x = (W - total * sA) / 2;
    layoutA = widths.map((w) => {
      const l = { x, y: H / 2 - 50 * sA, s: sA };
      x += (w + gap) * sA;
      return l;
    });

    // 3 lines, all the same size and evenly spaced: the widest word spans the full width, unless
    // three lines would then be too tall for the hero, in which case the size is limited by the height
    const sB = Math.min(
      availW / Math.max(...widths),
      availH / (words.length * 100 * STEP),
    );
    const usedH = words.length * sB * 100 * STEP;
    layoutB = widths.map((w, i) => ({
      x: (W - w * sB) / 2,
      y: my + (availH - usedH) / 2 + i * sB * 100 * STEP - sB * 100 * TOP_TRIM,
      s: sB,
    }));
  };

  const apply = () => {
    words.forEach((w, i) => {
      const a = layoutA[i];
      const b = layoutB[i];
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const s = a.s + (b.s - a.s) * t;
      // real font size (not a scale), so the letters are redrawn sharp at every size
      w.style.fontSize = `${100 * s}px`;
      w.style.letterSpacing = `${-1.44 * s}px`;
      w.style.transform = `translate(${x}px, ${y}px)`;
    });
  };

  const relayout = () => {
    measure();
    apply();
  };

  document.fonts.ready.then(() => {
    relayout();
    title.style.visibility = "visible";
  });
  title.style.visibility = "hidden";
  measure();
  apply();
  window.addEventListener("resize", relayout);

  const start = () => {
    if (reduceMotion) {
      t = 1;
      apply();
      return;
    }
    mascot.hold(true);
    lenis.stop();
    gsap
      .timeline({
        delay: 0.5,
        onComplete() {
          mascot.hold(false);
          lenis.start();
        },
      })
      .to(
        {},
        {
          duration: 1.2,
          ease: "power3.inOut",
          onUpdate() {
            t = this.progress();
            apply();
          },
        },
      )
      .to(opening, { zoom: 1, duration: 1.1, ease: "back.out(1.3)" }, "+=0.15")
      .to(opening, { apart: 1, duration: 1.3, ease: "power2.inOut" }, "<0.65");
  };
  return { start };
}
