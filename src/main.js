import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setupTabs } from "./tabs.js";
import { createMascot } from "./mascot.js";
import { playIntro } from "./intro.js";
import { playHeroOpen } from "./heroOpen.js";
import { setupHosts } from "./hosts.js";

gsap.registerPlugin(ScrollTrigger);

// Smooth scrolling on computers. On phones Lenis leaves normal touch scrolling alone (its default).
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
if (import.meta.env.DEV) window.lenis = lenis; // handy for testing in the browser

const mascot = createMascot(document.querySelector(".mascot"));
// The sandwich starts out tiny and assembled; the hero opening (after the loading screen) grows it and floats the layers apart
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) Object.assign(mascot.opening, { zoom: 0.001, apart: 0 });
const heroOpen = playHeroOpen({ hero: document.querySelector(".hero"), mascot, lenis });
playIntro({ lenis, onDone: heroOpen.start });

const hosts = setupHosts(document.querySelector('[data-panel="hosts"]'));

setupTabs({
  onSwitch(name) {
    if (name === "hosts") hosts.show();
    else hosts.hide();
    lenis.scrollTo(0, { immediate: true });
    mascot.setActive(name === "home");
    if (name === "home") mascot.resize();
  },
});

// "Join the list" jumps smoothly to the signup
document.querySelectorAll('a[href^="#"]').forEach((link) =>
  link.addEventListener("click", (e) => {
    e.preventDefault();
    lenis.scrollTo(link.getAttribute("href"), { offset: -40 });
  })
);

// Signups aren't connected yet (that's a later step)
document.querySelector(".signup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  document.querySelector(".form-note").hidden = false;
});
