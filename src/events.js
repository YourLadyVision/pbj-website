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
