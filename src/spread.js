import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// A butter knife spreads peanut butter across the section as you scroll.
// The knife zig-zags down the page; behind it the peanut butter photo is revealed, leaving a thin gap of
// the page colour on all four sides.

const TEXTURE = "/spread/pb-texture.jpg";

// A steel butter knife seen from above, pointing right. The tip sits at the right end.
const KNIFE_SVG = `
<svg viewBox="0 0 700 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f9fb"/>
      <stop offset="0.18" stop-color="#d7dde3"/>
      <stop offset="0.45" stop-color="#8e98a3"/>
      <stop offset="0.62" stop-color="#e6eaee"/>
      <stop offset="1" stop-color="#6f7882"/>
    </linearGradient>
    <linearGradient id="steelH" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef1f4"/>
      <stop offset="0.3" stop-color="#b9c1c9"/>
      <stop offset="0.5" stop-color="#7d8791"/>
      <stop offset="0.75" stop-color="#d9dee3"/>
      <stop offset="1" stop-color="#8a949e"/>
    </linearGradient>
    <linearGradient id="glint" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-5%" y="-30%" width="110%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <!-- soft shadow on the surface -->
  <path d="M30 98 C30 78 90 74 190 78 L330 66 L620 62 C672 66 690 82 660 106 L330 110 L190 118 C90 124 30 118 30 98Z" fill="rgba(60,30,5,0.38)" filter="url(#soft)" transform="translate(10 18)"/>
  <!-- handle -->
  <path d="M8 74 C8 52 40 44 96 46 L238 52 L262 60 L262 96 L238 104 L96 106 C40 108 8 100 8 74Z" fill="url(#steelH)" stroke="#5f6770" stroke-width="1.2"/>
  <path d="M30 60 L240 62" stroke="#fff" stroke-opacity="0.7" stroke-width="2" stroke-linecap="round"/>
  <path d="M30 88 L240 90" stroke="#4f575f" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>
  <!-- neck -->
  <path d="M250 60 L300 54 L300 100 L250 96Z" fill="url(#steel)" stroke="#5f6770" stroke-width="1"/>
  <!-- blade -->
  <path d="M296 54 L560 38 C640 34 690 52 690 76 C690 102 640 118 560 114 L296 100Z" fill="url(#steel)" stroke="#5f6770" stroke-width="1.2"/>
  <path d="M320 52 L600 40" stroke="url(#glint)" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  <path d="M330 64 L640 56" stroke="#fff" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M330 96 L640 100" stroke="#4a525a" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>
</svg>`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const smooth = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export function setupSpread() {
  const section = document.querySelector(".spread-section");
  if (!section) return;
  const stage = section.querySelector(".spread-stage");
  const canvas = stage.querySelector("canvas");
  const knife = stage.querySelector(".knife");
  knife.innerHTML = KNIFE_SVG;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mask = document.createElement("canvas");
  const mctx = mask.getContext("2d");

  let img = null;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let path = []; // knife path: [x, y, dirX]
  let rect = { x: 0, y: 0, w: 0, h: 0 };
  let band = 0; // how tall the knife's swipe is
  let kw = 0; // knife length on screen
  let progress = 0;

  function layout() {
    const r = stage.getBoundingClientRect();
    W = Math.round(r.width);
    H = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = mask.width = Math.round(W * dpr);
    canvas.height = mask.height = Math.round(H * dpr);
    const gap = Math.max(12, Math.min(28, W * 0.018));
    rect = { x: gap, y: gap, w: W - 2 * gap, h: H - 2 * gap };
    band = rect.h * 0.42;
    kw = Math.min(rect.w * 0.62, band * 3.4);
    knife.style.width = kw + "px";

    // Three swipes, left to right, back, left to right, joined by wide turns at each end
    const pad = band * 0.7;
    const ys = [0, 1, 2].map((k) => rect.y + band * 0.45 + k * (rect.h - band * 0.9) / 2);
    const xL = rect.x - pad;
    const xR = rect.x + rect.w + pad;
    const pts = [];
    const straight = (x0, x1, y, dir) => {
      const n = Math.max(40, Math.round(Math.abs(x1 - x0) / 7));
      for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y, dir]);
    };
    const turn = (x, y0, y1, side, d0, d1) => {
      const n = 30;
      const r = (y1 - y0) / 2;
      for (let i = 1; i < n; i++) {
        const a = (Math.PI * i) / n;
        pts.push([x + side * Math.sin(a) * r * 0.55, y0 + (1 - Math.cos(a)) * r, d0 + (d1 - d0) * smooth(i / n)]);
      }
    };
    straight(xL, xR, ys[0], 1);
    turn(xR, ys[0], ys[1], 1, 1, -1);
    straight(xR, xL, ys[1], -1);
    turn(xL, ys[1], ys[2], -1, -1, 1);
    straight(xL, xR, ys[2], 1);
    path = pts;
    draw(progress);
  }

  function textureRect() {
    // the photo, scaled to fill the inset rectangle ("cover")
    const s = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    return { x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2, w, h };
  }

  function roundRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function draw(p) {
    progress = p;
    if (!img || !path.length) return;
    const last = Math.min(path.length - 1, Math.max(0, Math.floor(p * (path.length - 1))));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 1. The area the knife has covered: a row of overlapping blobs along its path, with a slightly wobbly edge
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = "#000";
    const blobs = [];
    for (let i = 0; i <= last; i += 2) {
      const [x, y] = path[i];
      const wob = Math.sin(i * 0.11) * 0.035 + Math.sin(i * 0.037 + 1.3) * 0.045;
      const r = (band / 2) * (0.96 + wob);
      const off = Math.sin(i * 0.05 + 0.6) * band * 0.025;
      blobs.push([x, y + off, r]);
    }
    mctx.beginPath();
    blobs.forEach(([x, y, r]) => {
      mctx.moveTo(x + r, y);
      mctx.arc(x, y, r, 0, Math.PI * 2);
    });
    mctx.fill();

    // keep only the inset rectangle (a gap of page colour on all four sides)
    mctx.globalCompositeOperation = "destination-in";
    roundRectPath(mctx, rect.x, rect.y, rect.w, rect.h, Math.min(22, rect.w * 0.02));
    mctx.fill();
    mctx.globalCompositeOperation = "source-in";
    const t = textureRect();
    mctx.drawImage(img, t.x, t.y, t.w, t.h);
    mctx.globalCompositeOperation = "source-over";

    // 2. A soft shadow under the spread, then the peanut butter itself
    ctx.save();
    ctx.shadowColor = "rgba(70, 35, 5, 0.35)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(mask, 0, 0, W, H);
    ctx.restore();
    ctx.drawImage(mask, 0, 0, W, H);

    // 3. A raised, glossy lip along the leading edge of the spread (the peanut butter the knife is pushing)
    const [kx, ky, dir] = path[last];
    const pile = (1 - 0.55 * p) * band * 0.36;
    const ahead = Math.abs(dir) < 0.2 ? 0 : Math.sign(dir);
    const mx = kx + ahead * pile * 0.5;
    const my = ky;
    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, Math.min(22, rect.w * 0.02));
    ctx.clip();
    ctx.shadowColor = "rgba(60, 30, 5, 0.45)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.ellipse(mx, my, pile * 1.25, pile * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#b9763a";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.ellipse(mx, my, pile * 1.25, pile * 0.95, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, t.x, t.y, t.w, t.h);
    const g = ctx.createRadialGradient(mx - pile * 0.35, my - pile * 0.4, pile * 0.1, mx, my, pile * 1.3);
    g.addColorStop(0, "rgba(255, 236, 196, 0.6)");
    g.addColorStop(0.35, "rgba(255, 220, 160, 0.12)");
    g.addColorStop(1, "rgba(60, 25, 0, 0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(mx - pile * 2, my - pile * 2, pile * 4, pile * 4);
    ctx.restore();

    // 4. The knife
    const tipX = 0.985 * kw;
    const tipY = 0.5 * (kw * 150) / 700;
    const lean = -9 * Math.sign(dir || 1) * (Math.abs(dir) > 0.2 ? 1 : 0.3);
    // At the very end the knife slides away off the right edge
    const leave = smooth((p - 0.94) / 0.06);
    const kxx = kx + dir * leave * kw * 1.1;
    knife.style.transform = `translate(${kxx}px, ${ky}px) rotate(${lean}deg) scale(${dir}, 1) translate(${-tipX}px, ${-tipY}px)`;
    knife.style.opacity = p <= 0 ? "0" : String(1 - leave);
  }

  loadImage(TEXTURE).then((image) => {
    img = image;
    layout();
    new ResizeObserver(() => layout()).observe(stage);
    if (reduceMotion) {
      knife.style.display = "none";
      draw(1);
      return;
    }
    ScrollTrigger.create({
      trigger: section,
      // On phones the folder tabs sit along the top, so pin just below them
      start: () => `top ${window.matchMedia("(max-width: 767px)").matches ? document.querySelector(".tabs").offsetHeight : 0}`,
      end: "+=220%",
      pin: true,
      scrub: 0.4,
      invalidateOnRefresh: true,
      onUpdate: (self) => draw(self.progress),
    });
  });
}
