import { ScrollTrigger } from "gsap/ScrollTrigger";

// A butter knife spreads peanut butter across the section as you scroll.
// The knife zig-zags down the page; behind it the peanut butter photo is revealed, leaving a thin gap of
// the page colour on all four sides.

const TEXTURE = "/spread/pb-texture.jpg";
const KNIFE = "/spread/knife.jpg";

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

// The knife photo has a plain white background. Cut it out: flood in from the edges through everything
// that is (nearly) white, make that see-through, and soften the cut edge a touch.
function cutOut(img) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, w, h);
  const px = data.data;
  const isBg = new Uint8Array(w * h);
  const near = (i) => px[i * 4] > 246 && px[i * 4 + 1] > 246 && px[i * 4 + 2] > 246;
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (isBg[i] || !near(i)) return;
    isBg[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  // alpha: 0 for background, 255 for the knife, with the outermost knife pixel softened
  for (let i = 0; i < w * h; i++) px[i * 4 + 3] = isBg[i] ? 0 : 255;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (isBg[i]) continue;
      const bgNear = isBg[i - 1] + isBg[i + 1] + isBg[i - w] + isBg[i + w];
      if (bgNear) px[i * 4 + 3] = 255 - bgNear * 55;
    }
  }
  g.putImageData(data, 0, 0);

  // the knife's bounding box and its tip (the top-most solid pixel)
  let minX = w, maxX = 0, minY = h, maxY = 0, tipX = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isBg[y * w + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) {
          minY = y;
          tipX = x;
        }
        if (y > maxY) maxY = y;
      }
    }
  }
  return { canvas: c, box: { minX, maxX, minY, maxY }, tip: { x: tipX, y: minY } };
}

export function setupSpread() {
  const section = document.querySelector(".spread-section");
  if (!section) return;
  const stage = section.querySelector(".spread-stage");
  const canvas = stage.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mask = document.createElement("canvas");
  const mctx = mask.getContext("2d");

  let img = null;
  let knife = null; // { canvas, box, tip }
  let W = 0;
  let H = 0;
  let dpr = 1;
  let path = []; // knife path: [x, y, dirX]
  let rect = { x: 0, y: 0, w: 0, h: 0 };
  let band = 0; // how tall the knife's swipe is
  let klen = 0; // knife length on screen
  let progress = 0;

  function layout() {
    // (client sizes, not the on-screen box, so the loading-intro zoom doesn't shrink our measurements)
    W = stage.clientWidth;
    H = stage.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = mask.width = Math.round(W * dpr);
    canvas.height = mask.height = Math.round(H * dpr);
    const gap = Math.max(12, Math.min(28, W * 0.018));
    rect = { x: gap, y: gap, w: W - 2 * gap, h: H - 2 * gap };

    // The knife is about two thirds of the page height long; its blade is as wide as one swipe
    const kb = knife.box;
    const kh = kb.maxY - kb.minY;
    const kwid = kb.maxX - kb.minX;
    klen = Math.min(rect.w * 0.7, Math.max(rect.h * 0.62, 260));
    const scale = klen / kh;
    band = Math.max(kwid * scale * 0.95, rect.h / 7);
    const swipes = Math.max(3, Math.ceil((rect.h - band) / (band * 0.72)) + 1);

    const pad = klen * 0.35;
    const xL = rect.x - pad;
    const xR = rect.x + rect.w + pad;
    const span = rect.h - band;
    const ys = Array.from({ length: swipes }, (_, k) => rect.y + band * 0.5 + (span * k) / (swipes - 1));
    const pts = [];
    const straight = (x0, x1, y, dir) => {
      const n = Math.max(40, Math.round(Math.abs(x1 - x0) / 6));
      for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y, dir]);
    };
    const turn = (x, y0, y1, side, d0, d1) => {
      const n = 16;
      const rr = (y1 - y0) / 2;
      for (let i = 1; i < n; i++) {
        const a = (Math.PI * i) / n;
        pts.push([x + side * Math.sin(a) * rr * 0.5, y0 + (1 - Math.cos(a)) * rr, d0 + (d1 - d0) * smooth(i / n)]);
      }
    };
    ys.forEach((y, k) => {
      const dir = k % 2 === 0 ? 1 : -1;
      if (dir === 1) straight(xL, xR, y, 1);
      else straight(xR, xL, y, -1);
      if (k < ys.length - 1) turn(dir === 1 ? xR : xL, y, ys[k + 1], dir, dir, -dir);
    });
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
    if (!img || !knife || !path.length) return;
    const last = Math.min(path.length - 1, Math.max(0, Math.floor(p * (path.length - 1))));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 1. The area the knife has covered: a row of overlapping blobs along its path, with a slightly wobbly edge
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = "#000";
    mctx.beginPath();
    for (let i = 0; i <= last; i += 2) {
      const [x, y] = path[i];
      const wob = Math.sin(i * 0.11) * 0.04 + Math.sin(i * 0.037 + 1.3) * 0.05;
      const r = (band / 2) * (0.98 + wob);
      const yy = y + Math.sin(i * 0.05 + 0.6) * band * 0.03;
      mctx.moveTo(x + r, yy);
      mctx.arc(x, yy, r, 0, Math.PI * 2);
    }
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
    ctx.shadowColor = "rgba(70, 35, 5, 0.32)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(mask, 0, 0, W, H);
    ctx.restore();
    ctx.drawImage(mask, 0, 0, W, H);

    // 3. The peanut butter the knife is pushing ahead of its tip: a soft, lumpy mound
    const [kx, ky, dir] = path[last];
    const moving = Math.abs(dir) > 0.5 ? Math.sign(dir) : 0;
    const pile = (1 - 0.45 * p) * band * 0.46;
    const mx = kx + moving * pile * 0.35;
    const my = ky;
    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, Math.min(22, rect.w * 0.02));
    ctx.clip();
    const blob = () => {
      ctx.beginPath();
      const n = 36;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const lump = 1 + 0.1 * Math.sin(a * 3 + p * 20) + 0.06 * Math.sin(a * 5 - p * 31);
        const px = mx + Math.cos(a) * pile * 1.2 * lump;
        const py = my + Math.sin(a) * pile * 0.95 * lump;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };
    ctx.shadowColor = "rgba(60, 30, 5, 0.5)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 9;
    blob();
    ctx.fillStyle = "#c08a3e";
    ctx.fill();
    ctx.shadowColor = "transparent";
    blob();
    ctx.save();
    ctx.clip();
    ctx.drawImage(img, t.x, t.y, t.w, t.h);
    const g = ctx.createRadialGradient(mx - pile * 0.4, my - pile * 0.45, pile * 0.05, mx, my, pile * 1.4);
    g.addColorStop(0, "rgba(255, 240, 200, 0.55)");
    g.addColorStop(0.4, "rgba(255, 225, 160, 0.1)");
    g.addColorStop(1, "rgba(70, 35, 0, 0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(mx - pile * 2, my - pile * 2, pile * 4, pile * 4);
    ctx.restore();
    ctx.restore();

    // 4. The knife, tip first. It slides away off the right edge at the very end.
    const leave = smooth((p - 0.94) / 0.06);
    const kk = klen / (knife.box.maxY - knife.box.minY);
    const lean = (dir > 0 ? 8 : -8) * (Math.abs(dir) > 0.5 ? 1 : 0);
    ctx.save();
    ctx.globalAlpha = p <= 0 ? 0 : 1 - leave;
    ctx.translate(kx + dir * leave * klen * 1.1, ky);
    // the photo has the knife upright with its tip at the top; turn it so the tip leads (right, or left when going back)
    ctx.rotate(((dir > 0 ? 90 : -90) + lean) * (Math.PI / 180));
    if (dir < 0) ctx.scale(-1, 1);
    // squash through the turn at each end, as the knife swings round
    ctx.scale(1, Math.max(0.15, Math.abs(dir)));
    ctx.scale(kk, kk);
    ctx.translate(-knife.tip.x, -knife.tip.y);
    ctx.shadowColor = "rgba(50, 25, 5, 0.5)";
    ctx.shadowBlur = 18 / kk;
    ctx.shadowOffsetX = 14 / kk;
    ctx.shadowOffsetY = 22 / kk;
    ctx.drawImage(knife.canvas, 0, 0);
    ctx.restore();
  }

  Promise.all([loadImage(TEXTURE), loadImage(KNIFE)]).then(([texture, knifeImg]) => {
    img = texture;
    knife = cutOut(knifeImg);
    if (import.meta.env.DEV) window.__spread = { get knife() { return knife; }, draw, get info() { return { W, H, band, klen, rect, n: path.length }; } };
    layout();
    new ResizeObserver(() => layout()).observe(stage);
    if (reduceMotion) {
      draw(1);
      return;
    }
    ScrollTrigger.create({
      trigger: section,
      // On phones the folder tabs sit along the top, so pin just below them
      start: () => `top ${window.matchMedia("(max-width: 767px)").matches ? document.querySelector(".tabs").offsetHeight : 0}`,
      end: "+=260%",
      pin: true,
      scrub: 0.4,
      invalidateOnRefresh: true,
      onUpdate: (self) => draw(self.progress),
    });
  });
}
