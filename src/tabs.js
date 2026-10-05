import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const phoneQuery = window.matchMedia("(max-width: 767px)");

// Folder tabs. Computers: click opens. Phones: first tap peeks, second tap opens.
export function setupTabs({ onSwitch } = {}) {
  const tabs = [...document.querySelectorAll(".tab")];
  const panels = [...document.querySelectorAll(".panel")];
  let current = "home";

  tabs.forEach((tab, i) => tab.style.setProperty("--i", i));

  const clearPeek = () => tabs.forEach((t) => t.classList.remove("peek"));

  function open(name) {
    clearPeek();
    if (name === current) return;
    const from = panels.find((p) => p.dataset.panel === current);
    const to = panels.find((p) => p.dataset.panel === name);
    current = name;

    tabs.forEach((t) =>
      t.dataset.tab === name ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current")
    );

    from.hidden = true;
    to.hidden = false;
    onSwitch?.(name);
    ScrollTrigger.refresh();

    // Folder shuffle: the new page slides in like a folder pulled to the front
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(
        to,
        { xPercent: phoneQuery.matches ? 0 : 6, yPercent: phoneQuery.matches ? 4 : 0, rotate: 1.5, opacity: 0 },
        { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)", clearProps: "transform,opacity" }
      );
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      const name = tab.dataset.tab;
      if (phoneQuery.matches && !tab.classList.contains("peek") && name !== current) {
        clearPeek();
        tab.classList.add("peek");
        return;
      }
      open(name);
    });
  });

  document.addEventListener("click", clearPeek);
  tabs[0].setAttribute("aria-current", "page");
}
