import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// The folder stack along the top (the Mosby's Files look).
// Six folders. The open one is the body of the page; the other five sit in the strips above it.

const PAGES = [
  { id: "home", label: "Home", fill: "#fffdf8", on: "#1f1200" },
  { id: "events", label: "Events", fill: "#c82828", on: "#fffdf8" },
  { id: "about", label: "About", fill: "#e8af45", on: "#1f1200" },
  { id: "list", label: "List Your Event", fill: "#563201", on: "#fffdf8" },
  { id: "partner", label: "Be Our Partner", fill: "#8f1f1f", on: "#fffdf8" },
  { id: "secret", label: "Our Secret", fill: "#2b1a08", on: "#fffdf8" },
];

// Short lines on the right of each strip, like the group names on mosbyfiles.com
const LABELS = ["Mining hidden gems  <", "Be part of it  <", "Behind the scenes  <"];

// Arrangement for a given open folder: tabs per strip are 2, 1, 2, then the open one on its own
function arrange(active) {
  const o = PAGES.filter((p) => p.id !== active);
  return [[o[0], o[1]], [o[2]], [o[3], o[4]], [PAGES.find((p) => p.id === active)]];
}

// One tab: a flat label with a curved shoulder each side (the same curve as mosbyfiles.com)
const SHOULDER =
  '<svg class="sh" viewBox="0 0 62 44" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="M1.1449 0L-521 0C-531 0 -540.3 4.9 -545.9 13.1L-558.5 31.6C-563.8 39.4 -572.6 44 -582 44L62 44C52.6 44 43.8 39.4 38.5 31.6L25.9 13.1C20.3 4.9 11.1 0 1.1449 0Z"/></svg>';

function tabEl(page, isActive) {
  const b = document.createElement("button");
  b.className = "tab";
  b.dataset.tab = page.id;
  b.style.setProperty("--tab", page.fill);
  b.style.setProperty("--on", page.on);
  if (isActive) b.setAttribute("aria-current", "page");
  b.innerHTML = `${SHOULDER.replace('class="sh"', 'class="sh l"')}<span class="mid">${page.label}</span>${SHOULDER.replace('class="sh"', 'class="sh r"')}`;
  return b;
}

export function setupTabs({ onSwitch } = {}) {
  const stack = document.getElementById("stack");
  const folder = document.querySelector(".folder");
  const panels = [...document.querySelectorAll(".panel")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = "home";
  let busy = false;

  // Build the strips for the open folder and colour the page body
  function render(active) {
    const rows = arrange(active);
    stack.replaceChildren();
    const colours = [null, rows[0][0].fill, rows[1][0].fill, rows[2][0].fill]; // each strip is the colour of the first tab above it
    rows.forEach((tabs, r) => {
      const reg = document.createElement("div");
      reg.className = "reg";
      if (colours[r]) {
        reg.style.setProperty("--band", colours[r]);
        const on = PAGES.find((p) => p.fill === colours[r])?.on;
        reg.style.setProperty("--band-on", on || "#fffdf8");
        const label = document.createElement("p");
        label.className = "reg-label";
        label.textContent = LABELS[r - 1];
        reg.append(label);
      }
      const line = document.createElement("div");
      line.className = "reg-tabs";
      tabs.forEach((p) => line.append(tabEl(p, p.id === active)));
      reg.append(line);
      reg.style.zIndex = r;
      stack.append(reg);
    });
    const page = PAGES.find((p) => p.id === active);
    folder.style.setProperty("--fill", page.fill);
    folder.style.setProperty("--on", page.on);
  }

  function showPanel(name) {
    panels.forEach((p) => (p.hidden = p.dataset.panel !== name));
    onSwitch?.(name);
    ScrollTrigger.refresh();
  }

  // Opening a folder: the strips under the one you tapped slide away downward one after another, the
  // page changes colour and content, then the new strips rise back up into place.
  function open(name, fromRow) {
    if (busy || name === current) return;
    busy = true;
    const swap = () => {
      current = name;
      render(name);
      showPanel(name);
      const regs = [...stack.children];
      if (reduceMotion) {
        busy = false;
        return;
      }
      gsap.fromTo(
        regs,
        { yPercent: 180 },
        { yPercent: 0, duration: 0.75, ease: "power3.out", stagger: { each: 0.08, from: "start" }, clearProps: "transform", onComplete: () => (busy = false) }
      );
      gsap.fromTo(folder.children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: "power3.out", clearProps: "transform,opacity" });
    };
    if (reduceMotion) return swap();
    const below = [...stack.children].slice(fromRow + 1);
    gsap.to(folder.children, { opacity: 0, duration: 0.25, ease: "power1.in" });
    if (below.length) {
      gsap.to(below, {
        y: () => window.innerHeight,
        duration: 0.6,
        ease: "power2.in",
        stagger: { each: 0.1, from: "start" },
        onComplete: swap,
      });
    } else {
      gsap.delayedCall(0.3, swap);
    }
  }

  stack.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    const row = [...stack.children].indexOf(tab.closest(".reg"));
    open(tab.dataset.tab, row);
  });

  render(current);
  showPanel(current);
}
