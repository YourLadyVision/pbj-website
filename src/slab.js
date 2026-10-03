import * as THREE from "three";

// Turns a see-through photo (bread, peanut butter, jelly) into a real 3D slab with thickness and
// rounded edges, so it can spin and still look solid.
//
// How: the photo is a view from above and in front, so its outline is the top face PLUS the strip of
// side wall we can see at the bottom. We cut that strip off to get the top face's outline, extrude it
// (wall height = the strip), and later paint the photo back on from the original viewpoint
// ("projection mapping", done in the shader in mascot.js). At rest it looks exactly like the photo.

export const PHOTO_W = 3; // world units the whole photo is wide (a bread slice is about 2 of them)
export const PHOTO_H = PHOTO_W / 1.5; // the photo is 3:2

// Follow the edge of a mask (1 = inside) around the main blob. Returns the points in order.
function traceOutline(mask, w, h) {
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  // Start in the middle (or the nearest filled pixel on the middle row) and walk left to the edge
  let sx = w >> 1;
  const sy = h >> 1;
  if (!at(sx, sy)) {
    let found = false;
    for (let r = 1; r < w / 2 && !found; r++) {
      if (at(sx + r, sy)) { sx += r; found = true; }
      else if (at(sx - r, sy)) { sx -= r; found = true; }
    }
    if (!found) return [];
  }
  while (at(sx - 1, sy)) sx--;

  // The eight neighbours, clockwise, starting from the west
  const dirs = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const indexOf = (dx, dy) => dirs.findIndex(([a, b]) => a === dx && b === dy);
  const pts = [];
  let x = sx;
  let y = sy;
  let back = 0; // direction (from the current pixel) of the background pixel we came past
  for (let guard = 0; guard < 400000; guard++) {
    pts.push([x, y]);
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (back + k) % 8;
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      if (at(nx, ny)) {
        const prev = (d + 7) % 8; // the background pixel examined just before this one
        const bx = x + dirs[prev][0] - nx;
        const by = y + dirs[prev][1] - ny;
        back = indexOf(bx, by);
        x = nx;
        y = ny;
        moved = true;
        break;
      }
    }
    if (!moved || (x === sx && y === sy && pts.length > 2)) break;
  }
  return pts;
}

// Ramer-Douglas-Peucker: drop points that barely change the line
function simplify(points, epsilon) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let worst = 0;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((by - ay) * points[i][0] - (bx - ax) * points[i][1] + bx * ay - by * ax) / len;
      if (dist > worst) { worst = dist; at = i; }
    }
    if (worst > epsilon && at > 0) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// thickness: how tall the visible side wall is in the photo, in photo pixels (of 1024)
export function buildSlab(img, { thickness, elevation, bevel = 0.02 }) {
  const scale = 1 / 3;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const alpha = ctx.getImageData(0, 0, w, h).data;

  const wall = Math.max(1, Math.round(thickness * (h / img.naturalHeight)));
  const top = new Uint8Array(w * h);
  for (let y = 0; y < h - wall; y++) {
    for (let x = 0; x < w; x++) {
      // Part of the top face: opaque here, and still opaque one wall-height further down
      if (alpha[(y * w + x) * 4 + 3] > 128 && alpha[((y + wall) * w + x) * 4 + 3] > 128) top[y * w + x] = 1;
    }
  }

  const outline = simplify(traceOutline(top, w, h), 0.9);
  const sinE = Math.sin(elevation);
  const cosE = Math.cos(elevation);
  const shape = new THREE.Shape();
  outline.forEach(([mx, my], i) => {
    const X = ((mx + 0.5) / w - 0.5) * PHOTO_W;
    // The photo squashes depth by sin(elevation), so stretch it back to get the real top face
    const Y = (-((my + 0.5) / h - 0.5) * PHOTO_H) / sinE;
    if (i === 0) shape.moveTo(X, Y);
    else shape.lineTo(X, Y);
  });

  // The wall's real height: what we see of it in the photo, divided by cos(elevation)
  const realHeight = ((wall / h) * PHOTO_H) / cosE;
  const depth = Math.max(0.001, realHeight - 2 * bevel);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 1,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
  });
  // Lay it flat (the photo's "up" becomes "far away") and put the top face at height 0
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -(depth + bevel), 0);
  return { geometry, thickness: depth + 2 * bevel };
}
