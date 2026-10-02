import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setupTabs } from "./tabs.js";
import { createMascot } from "./mascot.js";

gsap.registerPlugin(ScrollTrigger);

// Smooth scrolling on computers. On phones Lenis leaves normal touch scrolling alone (its default).
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
if (import.meta.env.DEV) window.lenis = lenis; // handy for testing in the browser

const mascot = createMascot(document.getElementById("mascot-canvas"));

setupTabs({
  onSwitch(name) {
    lenis.scrollTo(0, { immediate: true });
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
