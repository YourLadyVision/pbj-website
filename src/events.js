import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";
import { Flip } from "gsap/Flip";
import { createCutLetter } from "./cutword.js";
import { EVENTS } from "./eventsData.js";

gsap.registerPlugin(Flip, ScrollTrigger, Observer);

// The Events page: the paper-cut headline, and the lineup of vintage tickets (one per event in eventsData.js).
export function setupEvents(root) {
  setupHeadline(root);
  setupBrowse(root);
}

// ---- List Your Event: GSAP's "Layered pinning" (codepen.io/GreenSock/pen/VwbywPd, see INSPIRATION.md) ----
// Every section is a full screen that ScrollTrigger pins at the top, so the next one slides up over it like a card laid on a pile.
// The page snaps to the nearest section (ScrollTrigger.maxScroll() gives the end of the page). The last section is a closing line that
// types itself out. It does not loop: after it, scrolling on opens the next folder like on every other page.
// (The "Your events" button is switched off for now; see the note beside the sections.)
// (text colour and the hard shadow under it; any white text gets a shadow that is not white)
const LIST_LOOP = [
  { textFx: "mask", stack: true, bg: "var(--cream)", fill: "var(--honey)", shadow: "var(--brown)", name: "WHO ARE YOU TODAY?" },
  { textFx: "mask", bg: "var(--honey)", fill: "var(--cream)", shadow: "var(--crust)", name: "AN ARTIST LOOKING FOR YOUR NEXT AUDIENCE?" },
  { textFx: "mask", bg: "var(--pop)", fill: "var(--cream)", shadow: "var(--brown)", name: "AN ARTIST WITH THE MINDSET OF EXCLUSIVITY?" },
  { textFx: "mask", bg: "var(--strawberry)", fill: "var(--honey)", shadow: "var(--brown)", name: "QUICK-WITTED FOLKS WHO DEVOUR SPONTANEOUS PLANS & LEAVE NO CRUMBS?" },
  { textFx: "mask", bg: "var(--cream)", fill: "var(--pop)", shadow: "var(--crust)", name: "A VENUE BRICKED UP & READY FOR HOMING OFF-THE-TRACK, QUIRKY, BUZZY CROWD?" },
  { textFx: "mask", bg: "var(--crust)", fill: "var(--honey)", shadow: "var(--brown)", name: "HOL' ON! YOU ARE A BRAND THAT KNOWS BEST WHEN TO FILL THE RIGHT ROOMS?" },
  // (the "Your events" button is off for now; to bring it back add to this line: button: { label: "Your events", href: "/dashboard.html" })
  { textFx: "mask", bg: "var(--brown)", fill: "var(--cream)", shadow: "var(--crust)", name: "OH...WE CAUGHT YOUR EYE, & YOU WANT TO GLAZE US WITH YOUR MONEY?" },
  // the closing line types itself out when it comes into view
  { type: true, phoneBreak: true, bg: "var(--cream)", fill: "var(--strawberry)", shadow: "var(--brown)", name: "SO, WHO ARE YOU TODAY..." },
];

// A line that types itself out, letter by letter with a blinking cursor, each time it comes into view
function setupTypewriter(slide, title, auto = true) {
  const letters = [...title.querySelectorAll(".w > *")];
  const cursor = document.createElement("span");
  cursor.className = "ev-cursor";
  cursor.setAttribute("aria-hidden", "true");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tl = null;
  const reset = () => {
    tl?.kill();
    letters.forEach((l) => (l.style.visibility = "hidden"));
    cursor.remove();
  };
  const play = () => {
    reset();
    if (calm) { letters.forEach((l) => (l.style.visibility = "visible")); return; }
    tl = gsap.timeline({ delay: 0.4 });
    // a steady tap-tap-tap, with a beat between words. After a comma the cursor waits, then drops to the start of the next line (or the
    // next word) and blinks there for a moment before the first letter is typed, like a typewriter's carriage return
    const chars = [...title.dataset.text].filter((c) => c !== " ");
    let at = 0;
    letters.forEach((l, i) => {
      if (i) {
        const prev = at;
        at = prev + 0.1;
        if (letters[i - 1].parentNode !== l.parentNode) at += 0.16; // between words
        if (chars[i - 1] === ",") {
          tl.call(() => l.before(cursor), null, prev + 0.4); // the cursor moves first...
          at = prev + 0.95; // ...and the letter follows after it has blinked there
        }
        if (chars[i - 1] === "." && chars[i] === ".") at -= 0.02; // the three dots come a touch quicker
      }
      tl.call(() => { l.style.visibility = "visible"; l.after(cursor); }, null, at);
    });
    tl.call(() => {}, null, "+=0.1");
  };
  reset();
  if (auto) {
    let on = false;
    new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.intersectionRatio >= 0.6 && !on) { on = true; play(); }
      else if (!e.isIntersecting && on) { on = false; reset(); }
    }), { threshold: [0, 0.6] }).observe(slide);
  }
  return { play, reset };
}

// Which scroll effect List Your Event uses (on computers and phones alike):
//  "layered":  one swipe or scroll gesture slides the next section up over the last one (and back); the page itself never scrolls
//  "observer": GSAP's "Animated Continuous Sections with GSAP Observer" (codepen.io/GreenSock/pen/XWzRraJ): the page itself does not scroll;
//              each scroll gesture slides the next section in like a curtain, with the letters flying in
//  "pinned":   GSAP's "Layered pinning with infinite looping" (codepen.io/GreenSock/pen/VwbywPd): ScrollTrigger pins each section
const LOOP_MODE = "layered";

// The letters of a title, drawn one by one in paper-cut style (skip: () => true while they are out of sight)
function buildTitle(title, def, skip) {
  const text = title.dataset.text;
  title.setAttribute("aria-label", text);
  text.split(" ").forEach((word, wi, all) => {
    const w = document.createElement("span");
    w.className = "w";
    w.setAttribute("aria-hidden", "true");
    [...word].forEach((ch) => {
      const letter = createCutLetter(ch, { fill: def.fill, shadow: def.shadow, skip });
      if (letter) w.append(letter.el);
      else w.append(document.createTextNode(ch));
    });
    title.append(w);
    if (wi < all.length - 1) title.append(" ");
    if (wi === 0 && def.phoneBreak) { const br = document.createElement("br"); br.className = "ev-br"; title.append(br); } // (only a line break on phones)
  });
}

// The page itself never scrolls (native scrolling plus pinned layers glitched, and a hard flick could skip sections): one gesture lays
// the next section over the last one with a smooth GSAP slide, the same pile-of-cards look on computers and phones
export function setupLoop(root, lenis, LOOP = LIST_LOOP) {
  if (LOOP_MODE === "pinned") return setupPinnedLoop(root, lenis, LOOP); // ScrollTrigger pinning (page really scrolls)
  return setupObserverLoop(root, LOOP, LOOP_MODE !== "observer"); // "layered" (default) or the curtain version
}

// ---- "Animated Continuous Sections": one scroll gesture = one section. The new section's curtain (outer) slides in one way while
// its content (inner) slides the other way, so the colour appears to be wiped across the screen; the old section's colour drifts away
// and the new letters fly up in random order. The page itself never scrolls. After the last section, scrolling on opens the next
// folder (and scrolling up from the first opens the previous one), like on every other page.
function setupObserverLoop(root, LOOP, layered = false) {
  const stage = document.createElement("div");
  stage.className = "ev-loop obs" + (layered ? " layered" : "");
  stage.innerHTML = LOOP.map((s) => `<section class="ev-loop-slide" aria-label="${esc(s.name)}">
      <div class="ev-outer"><div class="ev-inner"><div class="ev-bg" style="--bg:${s.bg}">
        <h2 class="ev-loop-title${s.stack ? " stack" : ""}" data-text="${esc(s.name)}"></h2>
        ${s.button ? `<p><a class="btn" href="${esc(s.button.href)}">${esc(s.button.label)}</a></p>` : ""}
      </div></div></div>
    </section>`).join("");
  root.prepend(stage);

  const sections = [...stage.querySelectorAll(".ev-loop-slide")];
  const outers = sections.map((s) => s.querySelector(".ev-outer"));
  const inners = sections.map((s) => s.querySelector(".ev-inner"));
  const bgs = sections.map((s) => s.querySelector(".ev-bg"));
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seen = new Set(); // letters of sections that are out of sight stop wobbling
  const typers = [];
  const letters = sections.map((section, i) => {
    const title = section.querySelector(".ev-loop-title");
    buildTitle(title, LOOP[i], () => !seen.has(section));
    typers[i] = LOOP[i].type ? setupTypewriter(section, title, false) : null;
    return [...title.querySelectorAll(".w > *")];
  });

  const resetAll = () => {
    if (layered) { gsap.set([...outers, ...inners], { yPercent: 0 }); gsap.set(sections, { autoAlpha: 0, yPercent: 0, zIndex: 0 }); }
    else { gsap.set(outers, { yPercent: 100 }); gsap.set(inners, { yPercent: -100 }); gsap.set(sections, { autoAlpha: 0 }); }
  };
  resetAll();

  let current = -1;
  let animating = false;
  const last = sections.length - 1;

  // GSAP's "Animate Text" demo (demos.gsap.com/demo/animate-text, a SplitText demo): the text arrives piece by piece. Our titles are
  // already split into words (.w) and letters, so no SplitText is needed. "chars": letters slide in from the right; "words": words
  // drop in from above at random angles, with a little overshoot. (A section opts in with textFx in LIST_LOOP.)
  const fxTween = [];
  const unmask = (title) => title.querySelectorAll(".ev-mask").forEach((mask) => { mask.before(...mask.firstChild.childNodes); mask.remove(); });
  const textFxOut = (i) => {
    fxTween[i]?.revert();
    fxTween[i] = null;
    const title = sections[i].querySelector(".ev-loop-title");
    title.style.perspective = "";
    unmask(title); // lines go back to flowing naturally
  };
  const textFxIn = (i, delay = 0) => {
    const kind = LOOP[i].textFx;
    textFxOut(i);
    if (!kind || calm) return;
    const words = [...sections[i].querySelectorAll(".ev-loop-title .w")];
    if (kind === "mask") {
      // GSAP's "Text Masking" demo (demos.gsap.com/demo/text-masking): every line sits in a mask (a clipping box) and rises up out of it, from
      // below its bottom edge, one line after another. The lines are found by where the words sit now (so it follows the screen size);
      // the masks reach a little past each line (clip-path) so the lettering's shadow and wobble are not clipped.
      const title = sections[i].querySelector(".ev-loop-title");
      unmask(title);
      const found = [];
      words.forEach((w) => {
        const top = Math.round(w.offsetTop);
        const last = found[found.length - 1];
        if (last && last.top === top) last.words.push(w);
        else found.push({ top, words: [w] });
      });
      const lines = found.map(({ words: ws }) => {
        const mask = document.createElement("span");
        const line = document.createElement("span");
        mask.className = "ev-mask";
        line.className = "ev-reveal-line";
        mask.append(line);
        ws[0].before(mask);
        for (let n = ws[0]; n; ) { // the line's words, and the spaces between them
          const next = n.nextSibling;
          line.append(n);
          if (n === ws[ws.length - 1]) break;
          n = next;
        }
        return line;
      });
      // (fromTo, so the hidden starting state is set up at once, even while there is a delay)
      fxTween[i] = gsap.fromTo(lines, { yPercent: 130, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.1, delay });
      return;
    }
    if (kind === "lines") {
      // each line tips up out of the page in 3D, one line after the other (a "line" is whatever words sit at the same height)
      const title = sections[i].querySelector(".ev-loop-title");
      title.style.perspective = "500px";
      const tops = [...new Set(words.map((w) => Math.round(w.offsetTop)))].sort((a, b) => a - b);
      const lineOf = words.map((w) => tops.indexOf(Math.round(w.offsetTop)));
      fxTween[i] = gsap.from(words, { rotationX: -100, transformOrigin: "50% 50% -160px", opacity: 0, duration: 0.8, ease: "power3", immediateRender: true, delay: (n) => delay + lineOf[n] * 0.25 });
      return;
    }
    fxTween[i] = kind === "chars"
      ? gsap.from(letters[i], { x: 150, opacity: 0, duration: 0.7, ease: "power4", stagger: 0.04, delay, immediateRender: true })
      : gsap.from(words, { y: -100, opacity: 0, rotation: "random(-80, 80)", transformOrigin: "0% 60%", duration: 0.7, ease: "back", stagger: 0.15, delay, immediateRender: true });
  };

  // Layered (phones): the new section slides up over the old one; going back, the top section slides away to uncover the one under it
  function gotoLayered(index, direction) {
    animating = true;
    const dur = calm ? 0.01 : 0.9;
    const old = current;
    const forward = direction !== -1;
    typers[old]?.reset();
    seen.add(sections[index]);
    const done = () => { animating = false; typers[index]?.play(); };
    if (old >= 0) textFxOut(old);
    if (old < 0) { gsap.set(sections[index], { autoAlpha: 1, yPercent: 0, zIndex: 1 }); textFxIn(index, 0.15); done(); current = index; return; }
    if (forward) {
      textFxIn(index, dur * 0.5); // the words start dropping in as the section is half way up
      gsap.set(sections[old], { zIndex: 1 });
      gsap.set(sections[index], { autoAlpha: 1, yPercent: 100, zIndex: 2 });
      gsap.to(sections[index], { yPercent: 0, duration: dur, ease: "power2.inOut", onComplete: () => { gsap.set(sections[old], { autoAlpha: 0 }); seen.delete(sections[old]); done(); } });
    } else {
      gsap.set(sections[index], { autoAlpha: 1, yPercent: 0, zIndex: 1 });
      gsap.set(sections[old], { zIndex: 2 });
      gsap.to(sections[old], { yPercent: 100, duration: dur, ease: "power2.inOut", onComplete: () => { gsap.set(sections[old], { autoAlpha: 0, yPercent: 0 }); seen.delete(sections[old]); done(); } });
    }
    current = index;
  }

  function gotoSection(index, direction) {
    if (layered) return gotoLayered(index, direction);
    animating = true;
    const d = direction === -1 ? -1 : 1;
    const dur = calm ? 0.01 : 1.25;
    const tl = gsap.timeline({ defaults: { duration: dur, ease: "power1.inOut" }, onComplete: () => { animating = false; typers[index]?.play(); } });
    if (current >= 0) {
      const old = current;
      typers[old]?.reset();
      gsap.set(sections[old], { zIndex: 0 });
      tl.to(bgs[old], { yPercent: -15 * d }).set(sections[old], { autoAlpha: 0 }).add(() => seen.delete(sections[old]));
    }
    gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 });
    seen.add(sections[index]);
    tl.fromTo([outers[index], inners[index]], { yPercent: (i) => (i ? -100 * d : 100 * d) }, { yPercent: 0 }, 0)
      .fromTo(bgs[index], { yPercent: 15 * d }, { yPercent: 0 }, 0);
    if (!typers[index]) {
      tl.fromTo(letters[index], { autoAlpha: 0, yPercent: 150 * d }, { autoAlpha: 1, yPercent: 0, duration: calm ? 0.01 : 1, ease: "power2", stagger: { each: 0.02, from: "random" } }, 0.2);
    }
    current = index;
  }

  // While the sections are using the scroll, the folder-changing scroll (tabs.js) stays out of it; at the very first or last
  // section, scrolling further in that direction is left to it, so it opens the neighbouring folder
  const root$ = document.documentElement;
  const setLock = (dir) => {
    const atEnd = (dir > 0 && current === last) || (dir < 0 && current === 0);
    root$.toggleAttribute("data-loop-lock", !atEnd);
  };
  let touchY = null;
  // One gesture moves one section. A trackpad keeps sending ever-smaller scrolls for a second or more after the fingers lift (the
  // "coasting"), which would otherwise be read as another gesture and move a second section. A new gesture is recognised by a pause
  // in the scrolling, or by the scrolling suddenly getting stronger again (a fresh flick on top of the coasting), so a deliberate
  // second scroll is never ignored.
  let used = false;
  let lastAt = 0;
  let lastAbs = 0;
  const onWheel = (e) => {
    setLock(Math.sign(e.deltaY));
    const now = performance.now();
    const abs = Math.abs(e.deltaY);
    if (now - lastAt > 110 || (abs > 30 && abs > lastAbs * 1.5)) used = false;
    lastAt = now;
    lastAbs = abs;
  };
  const onTouchStart = (e) => { used = false; touchY = e.touches[0]?.clientY ?? null; };
  const onTouchMove = (e) => {
    if (touchY === null || !e.touches[0]) return;
    setLock(Math.sign(touchY - e.touches[0].clientY)); // a finger moving up means "next"
  };

  let observer = null;
  const start = () => {
    if (observer) return;
    current = -1;
    seen.clear();
    resetAll();
    root$.setAttribute("data-loop-lock", "");
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
    observer = Observer.create({
      type: "wheel,touch,pointer",
      wheelSpeed: -1,
      tolerance: 10,
      preventDefault: true,
      onDown: () => { if (animating || used || current <= 0) return; used = true; gotoSection(current - 1, -1); },
      onUp: () => { if (animating || used || current >= last) return; used = true; gotoSection(current + 1, 1); },
    });
    gotoSection(0, 1);
  };
  const stop = () => {
    if (!observer) return;
    observer.kill();
    observer = null;
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("touchstart", onTouchStart, { capture: true });
    window.removeEventListener("touchmove", onTouchMove, { capture: true });
    root$.removeAttribute("data-loop-lock");
    gsap.killTweensOf([...outers, ...inners, ...bgs, ...sections, ...letters.flat()]);
    typers.forEach((t) => t?.reset());
    sections.forEach((_, i) => textFxOut(i));
    animating = false;
  };
  new MutationObserver(() => (root.hidden ? stop() : start())).observe(root, { attributes: true, attributeFilter: ["hidden"] });
  if (!root.hidden) start();
}

function setupPinnedLoop(root, lenis, LOOP) {


  const stage = document.createElement("div");
  stage.className = "ev-loop";
  const slideHTML = (s) => `<section class="ev-loop-slide" style="--bg:${s.bg}" aria-label="${esc(s.name)}">
      <h2 class="ev-loop-title${s.stack ? " stack" : ""}" data-text="${esc(s.name)}"></h2>
      ${s.button ? `<p><a class="btn" href="${esc(s.button.href)}">${esc(s.button.label)}</a></p>` : ""}
    </section>`;
  stage.innerHTML = LOOP.map(slideHTML).join("");
  root.prepend(stage);

  const slides = [...stage.querySelectorAll(".ev-loop-slide")];
  // letters of sections that are out of sight stop wobbling
  const seen = new Set();
  const watcher = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target))));
  slides.forEach((slide, si) => {
    watcher.observe(slide);
    const def = LOOP[si];
    const title = slide.querySelector(".ev-loop-title");
    buildTitle(title, def, () => !seen.has(slide));
    if (def.type) setupTypewriter(slide, title);
  });

  // jump to another spot on the page (Lenis keeps its own idea of where the page is, so it is told too)
  const jump = (y) => {
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    ScrollTrigger.update();
  };

  // ---- One scroll gesture = one section. The page is moved by us (a smooth, eased glide to the next or previous screen) instead of
  // by the wheel, so a hard flick or a trackpad's long coasting can never carry it past more than one section, and the pinned sections
  // are always left exactly lined up. ScrollTrigger still pins every section; ScrollTrigger.maxScroll() gives the end of the page.
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); // power2.inOut, like the other slides
  let triggers = [];
  let observer = null;
  let gliding = false; // a glide is in progress
  let used = false; // this gesture has already moved a section
  let lastWheel = 0;
  let stopped = false; // true while we are the ones holding Lenis still

  const onWheel = () => {
    const now = performance.now();
    if (now - lastWheel >= 180) used = false; // a new wheel click, or the coasting has died down: a new gesture
    lastWheel = now;
  };
  const onTouchStart = () => { used = false; };

  const glide = (dir) => {
    const vh = window.innerHeight;
    const max = ScrollTrigger.maxScroll(window);
    const here = Math.round(window.scrollY / vh);
    const target = Math.min(max, Math.max(0, (here + dir) * vh));
    if (target === Math.round(window.scrollY)) return;
    gliding = true;
    const done = () => { gliding = false; };
    if (!lenis) { window.scrollTo({ top: target, behavior: calm ? "instant" : "smooth" }); setTimeout(done, calm ? 0 : 900); return; }
    lenis.scrollTo(target, { duration: calm ? 0 : 1, easing: ease, force: true, onComplete: done });
  };

  const step = (dir) => {
    if (gliding || used) return;
    const vh = window.innerHeight;
    const here = Math.round(window.scrollY / vh);
    const atEnd = (dir > 0 && window.scrollY >= ScrollTrigger.maxScroll(window) - 2) || (dir < 0 && here === 0);
    if (atEnd) return; // at the very first or last section the page's folder-changing scroll (tabs.js) takes over
    used = true;
    glide(dir);
  };

  const holdLenis = () => { if (!lenis.isStopped) { lenis.stop(); stopped = true; } };
  const build = () => {
    if (triggers.length) return;
    // pin every section at the top as it arrives (the very last one needs no pin, it is where the page ends)
    slides.slice(0, -1).forEach((slide) => {
      triggers.push(ScrollTrigger.create({ trigger: slide, start: "top top", pin: true, pinSpacing: false }));
    });
    jump(0);
    gsap.delayedCall(0.8, () => triggers.length && ScrollTrigger.refresh()); // the folder slide-in has finished by now
    // the wheel no longer scrolls the page by itself (checked every tick, because the page's opening animation can switch Lenis back on)
    if (lenis) gsap.ticker.add(holdLenis);
    used = false;
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    observer = Observer.create({
      type: "wheel,touch",
      wheelSpeed: -1,
      tolerance: 10,
      preventDefault: true,
      onUp: () => step(1),
      onDown: () => step(-1),
    });
  };
  const teardown = () => {
    observer?.kill();
    observer = null;
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("touchstart", onTouchStart, { capture: true });
    if (lenis) gsap.ticker.remove(holdLenis);
    if (lenis && stopped) { lenis.start(); stopped = false; }
    gliding = false;
    triggers.forEach((t) => t.kill(true));
    triggers = [];
  };

  new MutationObserver(() => (root.hidden ? teardown() : build())).observe(root, { attributes: true, attributeFilter: ["hidden"] });
  if (!root.hidden) build();
}

// The Events headline wears the same paper-cut lettering as the layer titles on Home (see cutword.js and mascot.js):
// every letter is a little hand-cut vector shape with a hard brown shadow. Letters we have no outline for stay plain text.
function setupHeadline(root) {
  const title = root.querySelector(".events-intro .story-title");
  if (!title) return;
  const text = title.textContent.replace(/\s+/g, " ").trim();
  title.setAttribute("aria-label", text);
  title.textContent = "";
  text.split(" ").forEach((word, i, all) => {
    const w = document.createElement("span");
    w.className = "w";
    w.setAttribute("aria-hidden", "true");
    [...word].forEach((ch) => {
      const letter = createCutLetter(ch, { fill: "var(--pop)", shadow: "var(--brown)" });
      if (letter) w.append(letter.el);
      else w.append(document.createTextNode(ch));
    });
    title.append(w);
    if (i < all.length - 1) title.append(" ");
  });
}

// ---- The little pictures on the tickets (drawn in the ticket's own colours, over a dark panel) ----
// p = paper colour, a = accent colour, k = dark; lp / la = round-ended lines in paper / accent
const SKYLINE = `<path class="a" d="M0 128V108h12V96h9v12h8V90h6v18h10V100h12v8h8V84h8v24h12V98h9v10h11V92h7v16h12V104h10v4h13V94h8v14h9V86h6v22h10v20z"/>`;
const ART = {
  music: `<circle class="p" cx="100" cy="58" r="30"/><path class="la" d="M24 40q10-9 20 0t20 0M136 30q10-9 20 0t20 0"/><circle class="a" cx="42" cy="76" r="6"/><path class="la" d="M48 76V56l16-4"/>`,
  workshop: `<path class="p" d="M70 42h60q10 0 8 14l-6 34q-2 10-14 10H82q-12 0-14-10l-6-34q-2-14 8-14z"/><ellipse class="a" cx="100" cy="42" rx="30" ry="7"/><path class="la" d="M84 22q-6 8 0 14t0 12M116 22q-6 8 0 14t0 12"/>`,
  comedy: `<rect class="p" x="90" y="26" width="20" height="42" rx="10"/><path class="lp" d="M76 62q0 26 24 26t24-26M100 88v20M84 108h32"/><path class="la" d="M44 36l4 9 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1zM152 30l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/>`,
  vinyl: `<circle class="p" cx="100" cy="62" r="44"/><circle class="a" cx="100" cy="62" r="15"/><circle class="k" cx="100" cy="62" r="3.5"/><circle cx="100" cy="62" r="30" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="2"/><circle cx="100" cy="62" r="38" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="2"/>`,
  film: `<rect class="p" x="38" y="22" width="124" height="76" rx="4"/><rect class="a" x="52" y="36" width="96" height="48" rx="2"/><g class="k"><rect x="44" y="26" width="8" height="6"/><rect x="62" y="26" width="8" height="6"/><rect x="80" y="26" width="8" height="6"/><rect x="98" y="26" width="8" height="6"/><rect x="116" y="26" width="8" height="6"/><rect x="134" y="26" width="8" height="6"/><rect x="44" y="88" width="8" height="6"/><rect x="62" y="88" width="8" height="6"/><rect x="80" y="88" width="8" height="6"/><rect x="98" y="88" width="8" height="6"/><rect x="116" y="88" width="8" height="6"/><rect x="134" y="88" width="8" height="6"/></g>`,
  food: `<path class="p" d="M66 52h64v26q0 22-32 22t-32-22z"/><path class="lp" d="M130 58q22 0 20 16t-22 8"/><ellipse class="a" cx="98" cy="52" rx="32" ry="6"/><path class="la" d="M82 24q-6 8 0 14t0 10M98 20q-6 8 0 14t0 14M114 24q-6 8 0 14t0 10"/>`,
  art: `<path class="p" d="M100 24c-38 0-62 22-62 44 0 18 16 28 34 22 10-3 14 6 10 16-2 8 8 12 22 12 34 0 60-22 60-50 0-26-26-44-64-44z"/><circle class="a" cx="72" cy="50" r="8"/><circle class="k" cx="104" cy="42" r="8"/><circle class="a" cx="136" cy="58" r="8"/><circle class="k" cx="64" cy="76" r="7"/>`,
  games: `<rect class="p" x="68" y="30" width="64" height="64" rx="12" transform="rotate(-12 100 62)"/><g class="k" transform="rotate(-12 100 62)"><circle cx="84" cy="46" r="5"/><circle cx="116" cy="46" r="5"/><circle cx="100" cy="62" r="5"/><circle cx="84" cy="78" r="5"/><circle cx="116" cy="78" r="5"/></g>`,
};
const art = (kind) => `<svg viewBox="0 0 200 128" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${ART[kind] || ART.music}${SKYLINE}</svg>`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const TILTS = [-1.6, 1.2, -0.8, 1.7, -1.3, 0.9, -1.8, 1.4]; // each ticket sits at its own small angle
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function ticket(ev, i) {
  const [y, m, d] = ev.date.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const where = `${ev.area}${ev.venue ? ` · ${ev.venue}` : ""}`;
  const href = ev.link || "#";
  return `
    <article class="tk tk-${esc(ev.paper || "sun")}" style="--tilt:${TILTS[i % TILTS.length]}deg">
      <div class="tk-main">
        <p class="tk-top"><span>★ Admit one ★</span><span>No. ${String(i + 1).padStart(4, "0")}</span></p>
        <div class="tk-art">${art(ev.kind)}<span class="tk-stamp">${esc(ev.category)}</span></div>
        <h3>${esc(ev.title)}</h3>
        <p class="tk-where">${esc(where)}</p>
        <p class="tk-blurb">${esc(ev.blurb)}</p>
      </div>
      <div class="tk-stub">
        <div class="tk-date"><b>${String(d).padStart(2, "0")}</b><span>${MONTHS[m - 1]}<br />${DAYS[day.getDay()]}</span></div>
        <div class="tk-meta"><span>${esc(ev.time)}</span><span class="tk-price">${esc(ev.price)}</span></div>
        <a class="tk-btn" href="${esc(href)}" target="_blank" rel="noopener"${ev.link ? "" : ' aria-disabled="true"'}>Go to event <span aria-hidden="true">→</span></a>
        <span class="tk-bars" aria-hidden="true"></span>
      </div>
    </article>`;
}

function setupLineup(root) {
  const track = root.querySelector(".lineup-track");
  if (!track) return;

  // Only events that haven't happened yet, soonest first (a ticket vanishes by itself once its day has passed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = EVENTS.filter((ev) => {
    const [y, m, d] = ev.date.split("-").map(Number);
    return new Date(y, m - 1, d) >= today;
  }).sort((a, b) => a.date.localeCompare(b.date));

  if (!upcoming.length) {
    track.innerHTML = `<p class="lineup-empty">The next lineup is being mined. Check back soon.</p>`;
    root.querySelector(".lineup-bar")?.setAttribute("hidden", "");
    return;
  }
  track.innerHTML = upcoming.map(ticket).join("");

  // A "Go to event" with no link yet does nothing
  track.addEventListener("click", (e) => {
    const link = e.target.closest(".tk-btn");
    if (link && link.getAttribute("aria-disabled") === "true") e.preventDefault();
  });

  // Arrows: one ticket at a time
  const step = () => (track.querySelector(".tk")?.getBoundingClientRect().width || 300) + 24;
  root.querySelector(".lineup-prev")?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
  root.querySelector(".lineup-next")?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));

  // Drag to scroll with a mouse (fingers already scroll it on phones)
  let down = null;
  let moved = false;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    down = { x: e.clientX, left: track.scrollLeft };
    moved = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (!moved && Math.abs(dx) > 5) {
      moved = true;
      track.classList.add("dragging");
    }
    if (moved) track.scrollLeft = down.left - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!down) return;
    down = null;
    track.classList.remove("dragging");
  });
  // a drag must not count as a click on a ticket's button
  track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
}


// ---- The browse layout: banner of posters, category bar, filters on the left, event cards on the right ----
const PAPER = { sun: ["#ffe386", "#463721"], jam: ["#c2184f", "#f8f8f0"], cream: ["#f8f8f0", "#463721"], peanut: ["#f0a830", "#463721"], brown: ["#463721", "#ffe386"] };
const priceNum = (p) => (/free/i.test(p) ? 0 : Number(String(p).replace(/[^\d]/g, "")) || 0);
const dateOf = (ev) => { const [y, m, d] = ev.date.split("-").map(Number); return new Date(y, m - 1, d); };
const longDate = (ev) => { const d = dateOf(ev); return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

// For now every card is empty, with only "Coming soon" on it in the same paper-cut lettering as the page headline
const SHOWN = 5; // cards in the line on the brown belt
const slideHTML = (i) => `<div class="ev-slide" data-i="${i}">${emptyCard()}</div>`;
const emptyCard = () => `<div class="ev-poster ev-empty"><span class="ev-soon" aria-label="Coming soon">Coming soon</span></div>`;
function poster() { return emptyCard(); }
function card() { return `<div class="ev-card-b">${emptyCard()}</div>`; }
// (the cards in the big grid are drawn once and then keep still, so twenty of them don't slow the page down; the belt's cards still wobble)
function cutSoon(scope, still = false) {
  scope.querySelectorAll(".ev-soon:not([data-cut])").forEach((el) => {
    el.dataset.cut = "1";
    const text = el.textContent;
    el.textContent = "";
    text.split(" ").forEach((word) => {
      const w = document.createElement("span");
      w.className = "w";
      w.setAttribute("aria-hidden", "true");
      [...word].forEach((ch) => {
        const letter = createCutLetter(ch, { fill: "var(--pop)", shadow: "var(--brown)" });
        if (letter) { w.append(letter.el); if (still) letter.dispose(); }
        else w.append(document.createTextNode(ch));
      });
      el.append(w);
    });
  });
}

// Until the real events arrive, the cards are placeholders with made-up details, spread out at random (the same spread every visit)
// so every category and every filter option has a different, uneven number of cards (some a lot, some only one or two).
function makePlaceholders(today) {
  let seed = 20261024;
  const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const shuffle = (arr) => arr.map((v) => [rand(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
  const cats = [...new Set(EVENTS.map((e) => e.category))];
  const areas = [...new Set(EVENTS.map((e) => e.area))];
  const prices = ["Free", "₹300", "₹400", "₹500", "₹600", "₹800", "₹1,200", "₹1,500"];
  const N = 20;
  const catOrder = shuffle(cats);
  const areaOrder = shuffle(areas);
  const out = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(today);
    // the first few land on today, tomorrow and the weekend, the rest are spread over the next ten weeks
    d.setDate(d.getDate() + (i === 0 ? 0 : i === 1 ? 1 : Math.floor(rand() * 70)));
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({
      category: i < cats.length ? catOrder[i] : pick(cats), // every category gets at least one, then it is up to chance
      area: i < areas.length ? areaOrder[i] : pick(areas),
      price: i < prices.length ? prices[i] : pick(prices),
      date,
      time: "7:00 PM",
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const FILTERS = {
  sort: { label: "Sort By", opts: [["soon", "Soonest first"], ["low", "Price: low to high"], ["high", "Price: high to low"]], def: "soon" },
  day: { label: "Day", opts: [["today", "Today"], ["tomorrow", "Tomorrow"], ["weekend", "This weekend"]] },
  month: { label: "Filter By Month", opts: null },
  area: { label: "Search by your area", opts: null },
  price: { label: "Price", opts: [["free", "Free"], ["u500", "Under ₹500"], ["u1000", "₹500 to ₹1,000"], ["o1000", "Over ₹1,000"]] },
};

function setupBrowse(root) {
  const host = root.querySelector(".ev-browse");
  if (!host) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = makePlaceholders(today);
  if (!upcoming.length) {
    host.innerHTML = `<p class="lineup-empty">The next lineup is being mined. Check back soon.</p>`;
    return;
  }
  const uniq = (arr) => [...new Set(arr)];
  FILTERS.month.opts = uniq(upcoming.map((e) => e.date.slice(0, 7))).map((k) => { const [y, m] = k.split("-").map(Number); return [k, `${MONTHS[m - 1]} ${y}`]; });
  FILTERS.area.opts = uniq(upcoming.map((e) => e.area)).sort().map((a) => [a, a]);
  const cats = uniq(upcoming.map((e) => e.category));

  const state = { cat: "", sort: "soon", day: "", month: "", area: "", price: "" };
  const banner = upcoming.slice(0, 8);

  host.innerHTML = `
    <div class="ev-banner">
      <button class="ev-arrow prev" aria-label="Previous">←</button>
      <div class="ev-banner-track">${banner.slice(0, SHOWN).map((ev, i) => slideHTML(i)).join("")}</div>
      <button class="ev-arrow next" aria-label="Next">→</button>
    </div>
    <div class="ev-cats"><button class="ev-arrow sm prev" aria-label="Previous">←</button>
      <div class="ev-cats-track"><button class="on" data-cat="">All events</button><button data-cat="PBJ Exclusive Events">PBJ Exclusive Events</button>${cats.map((c) => `<button data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <button class="ev-arrow sm next" aria-label="Next">→</button></div>
    <div class="ev-body">
      <aside class="ev-filters">
        <div class="ev-filters-head"><h2>Filter Options</h2><button class="ev-clear" data-clear="all">clear</button></div>
        ${Object.entries(FILTERS).map(([key, f]) => {
          const opts = key === "sort" ? f.opts : [["", "Any"], ...f.opts];
          return `
          <div class="ev-dd" data-key="${key}">
            <p class="ev-dd-label">${f.label}</p>
            <button class="ev-dd-btn" type="button" aria-haspopup="listbox" aria-expanded="false"><span></span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <ul class="ev-dd-list" role="listbox" hidden>${opts.map(([v, l]) => `<li><button type="button" role="option" data-value="${esc(v)}">${esc(l)}</button></li>`).join("")}</ul>
          </div>`;
        }).join("")}
      </aside>
      <div class="ev-results"><p class="ev-count"></p><div class="ev-grid"></div><p class="lineup-empty" hidden>Nothing matches yet. Try clearing a filter.</p></div>
    </div>`;

  cutSoon(host);
  const grid = host.querySelector(".ev-grid");
  const count = host.querySelector(".ev-count");
  const emptyMsg = host.querySelector(".lineup-empty");
  // one card per event, made once; filtering only hides, shows and re-orders them (so they can glide, like GSAP's "Flexbox Filtering")
  grid.innerHTML = upcoming.map(card).join("");
  cutSoon(grid, true);
  const cardEls = [...grid.children];
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let firstRender = true;
  let token = 0; // numbers each move, so only the latest one tidies up
  let flipTL = null; // the move in progress, and the little grow/shrink tweens that belong to it
  let extra = [];
  const settle = () => {
    if (flipTL) { flipTL.progress(1).kill(); flipTL = null; }
    extra.forEach((t) => t.kill());
    extra = [];
    gsap.set(cardEls, { clearProps: "opacity,scale,transform,position,top,left,width,height,margin,padding,gridArea,transition,translate,rotate" });
    grid.style.minHeight = "";
  };
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const same = (a, b) => a.getTime() === b.getTime();

  const render = () => {
    let list = upcoming.filter((ev) => {
      const d = dateOf(ev), p = priceNum(ev.price);
      // (PBJ Exclusive Events has no real events yet, so for now it shows the same "Coming soon" cards)
      if (state.cat && state.cat !== "PBJ Exclusive Events" && ev.category !== state.cat) return false;
      if (state.day === "today" && !same(d, today)) return false;
      if (state.day === "tomorrow" && !same(d, tomorrow)) return false;
      if (state.day === "weekend" && ![0, 6].includes(d.getDay())) return false;
      if (state.month && ev.date.slice(0, 7) !== state.month) return false;
      if (state.area && ev.area !== state.area) return false;
      if (state.price === "free" && p !== 0) return false;
      if (state.price === "u500" && !(p > 0 && p < 500)) return false;
      if (state.price === "u1000" && !(p >= 500 && p <= 1000)) return false;
      if (state.price === "o1000" && p <= 1000) return false;
      return true;
    });
    if (state.sort === "low") list = [...list].sort((a, b) => priceNum(a.price) - priceNum(b.price));
    if (state.sort === "high") list = [...list].sort((a, b) => priceNum(b.price) - priceNum(a.price));
    const shown = new Set(list.map((ev) => cardEls[upcoming.indexOf(ev)]));
    // if a move is still going when the next filter is picked, finish it off first, so cards never get stuck half way
    settle();
    const state0 = !firstRender && !calm ? Flip.getState(cardEls) : null;
    if (state0) grid.style.minHeight = grid.offsetHeight + "px"; // the page below shouldn't jump while cards fly about
    // order: the matching cards in their new order first, then the hidden ones
    list.forEach((ev) => grid.append(cardEls[upcoming.indexOf(ev)]));
    cardEls.forEach((el) => { if (!shown.has(el)) grid.append(el); el.style.display = shown.has(el) ? "" : "none"; });
    emptyMsg.hidden = list.length > 0;
    const mine = ++token;
    if (state0) {
      flipTL = Flip.from(state0, {
        duration: 0.7,
        ease: "power1.inOut",
        stagger: 0.05,
        absolute: true,
        scale: true,
        onEnter: (els) => { extra.push(gsap.fromTo(els, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power1.inOut" })); },
        onLeave: (els) => { extra.push(gsap.to(els, { opacity: 0, scale: 0, duration: 0.5, ease: "power1.inOut" })); },
        onComplete: () => { if (mine === token) settle(); },
      });
      // belt and braces: whatever happens, once the move should be over every card goes back to plain, clean positions
      setTimeout(() => { if (mine === token) settle(); }, 3200);
    }
    firstRender = false;
    count.textContent = `${list.length} event${list.length === 1 ? "" : "s"} in Mumbai`;
  };
  const sync = () => {
    host.querySelectorAll(".ev-cats-track button").forEach((b) => b.classList.toggle("on", b.dataset.cat === state.cat));
    host.querySelectorAll(".ev-dd").forEach((d) => {
      const k = d.dataset.key;
      const picked = d.querySelector(`.ev-dd-list button[data-value="${state[k]}"]`);
      d.querySelector(".ev-dd-btn span").textContent = picked ? picked.textContent : "Any";
      d.classList.toggle("active", !!state[k] && k !== "sort");
      d.querySelectorAll(".ev-dd-list button").forEach((o) => {
        o.classList.toggle("on", o === picked);
        o.setAttribute("aria-selected", String(o === picked));
      });
    });
    render();
  };

  host.addEventListener("click", (e) => {
    const cat = e.target.closest("[data-cat]");
    if (cat) { state.cat = cat.dataset.cat; sync(); return; }
    const dd = e.target.closest(".ev-dd");
    const optBtn = e.target.closest(".ev-dd-list button");
    if (optBtn) { state[dd.dataset.key] = optBtn.dataset.value; closeDD(); sync(); return; }
    if (e.target.closest(".ev-dd-btn")) {
      const list = dd.querySelector(".ev-dd-list");
      const open = list.hidden;
      closeDD();
      list.hidden = !open;
      dd.classList.toggle("open", open);
      dd.querySelector(".ev-dd-btn").setAttribute("aria-expanded", String(open));
      return;
    }
    const clr = e.target.closest("[data-clear]");
    if (clr) {
      e.preventDefault();
      const k = clr.dataset.clear;
      if (k === "all") Object.assign(state, { cat: "", sort: "soon", day: "", month: "", area: "", price: "" });
      else state[k] = k === "sort" ? "soon" : "";
      sync(); return;
    }
    const link = e.target.closest("a[aria-disabled], a[href='#']");
    if (link) e.preventDefault();
  });
  // dropdowns close when you click anywhere else or press Escape
  const closeDD = () => host.querySelectorAll(".ev-dd").forEach((d) => {
    d.querySelector(".ev-dd-list").hidden = true;
    d.classList.remove("open");
    d.querySelector(".ev-dd-btn").setAttribute("aria-expanded", "false");
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".ev-dd")) closeDD(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDD(); });

  // arrows scroll their row
  const scroller = (btn, track, amount) => btn.addEventListener("click", () => track.scrollBy({ left: amount(), behavior: "smooth" }));
  const ct = host.querySelector(".ev-cats-track");
  setupCaterpillar(host.querySelector(".ev-banner"), banner.length);
  scroller(host.querySelector(".ev-cats .prev"), ct, () => -ct.clientWidth * 0.6);
  scroller(host.querySelector(".ev-cats .next"), ct, () => ct.clientWidth * 0.6);
  sync();
}


// ---- The belt of cards: GSAP's "Flip Carousel" (see INSPIRATION.md). Next: the first card shrinks away into its bottom-left
// corner, the others glide one place left, and a new card grows in at the end from its bottom-right corner. Previous does it backwards.
function setupCaterpillar(banner, total) {
  const track = banner.querySelector(".ev-banner-track");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let busy = false;

  const step = (forward) => {
    if (busy) return;
    const cards = gsap.utils.toArray(".ev-slide", track);
    const first = cards[0];
    const last = cards[cards.length - 1];
    const wrap = (n) => (n + total) % total;
    const make = (i) => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = slideHTML(i);
      cutSoon(wrapper);
      return wrapper.firstElementChild;
    };
    const newCard = make(wrap(forward ? Number(last.dataset.i) + 1 : Number(first.dataset.i) - 1));
    if (calm) {
      forward ? (first.remove(), track.append(newCard)) : (last.remove(), track.prepend(newCard));
      return;
    }
    busy = true;
    const state = Flip.getState(cards);
    gsap.set(newCard, { scale: 0, opacity: 0 });
    if (forward) {
      track.append(newCard);
      first.classList.add("hide");
    } else {
      track.prepend(newCard);
      last.classList.add("hide");
    }
    Flip.from(state, {
      targets: ".ev-slide",
      fade: true,
      absoluteOnLeave: true,
      duration: 0.7,
      ease: "power2.inOut",
      onEnter: (els) => { gsap.to(els, { opacity: 1, scale: 1, duration: 0.7, ease: "power2.inOut", transformOrigin: forward ? "bottom right" : "bottom left" }); },
      onLeave: (els) => { gsap.to(els, {
        opacity: 0,
        scale: 0,
        duration: 0.7,
        ease: "power2.inOut",
        transformOrigin: forward ? "bottom left" : "bottom right",
        onComplete: () => { els.forEach((el) => el.remove()); busy = false; },
      }); },
    });
  };

  banner.querySelector(".prev").addEventListener("click", () => step(false));
  banner.querySelector(".next").addEventListener("click", () => step(true));
  // fingers and mice can swipe the belt too
  let startX = null;
  track.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  window.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) step(dx < 0);
  });
}
