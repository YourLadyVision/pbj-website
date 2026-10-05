import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { buildSlab, PHOTO_W, PHOTO_H } from "./slab.js";

// The PB&J mascot: a real 3D sandwich wrapped in your four photos (bread, jelly, peanut butter, bread).
//
// Each photo becomes a solid slab (see slab.js). The photo is painted on from the viewpoint it was
// taken from, so at rest the sandwich looks exactly like the photos, and when it spins the slabs keep
// their thickness, rounded edges and lighting, so it stays 3D from every side.
//
// The scroll timeline, heights, tilts, camera follow, zoom and the 360-degree spin are the same
// numbers as the earlier code-built 3D mascot (see git history).

const ELEVATION = (50 * Math.PI) / 180; // how high above the sandwich we look from (matches the photos)

// Heights of each slab's top face (bread width = 2 units), up is positive
const APART = [-0.8, 0.3, 1.4, 2.5]; // evenly spaced
// Tilts while floating apart (x, y, z radians). Zero: every layer stays level with the others
const TILTS = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];

// bread, jelly, peanut butter, bread: the photo, how tall its visible wall is (photo pixels), its
// fallback side colour, a size fix (the jelly photo is bigger than the others), and a tiny size
// difference so no two layers' walls sit exactly on top of each other (that makes them flicker)
const LAYERS = [
  { src: "/mascot/bread.webp", wall: 70, side: "#c98a43", size: 1, bevel: 0.035, shine: [0.07, 22, 1.2] },
  { src: "/mascot/jelly.webp", wall: 26, side: "#8c0f1c", size: 0.88, bevel: 0.012, shine: [0.4, 80, 3] },
  { src: "/mascot/peanut-butter.webp", wall: 34, side: "#b87f3a", size: 1.012, bevel: 0.016, soften: 5, shine: [0.18, 40, 2] },
  { src: "/mascot/bread.webp", wall: 70, side: "#c98a43", size: 1, bevel: 0.035, shine: [0.07, 22, 1.2] },
];
// The colour wash behind a layer when it comes out front: bold, from the brand colours, chosen so each
// layer pops (bread on brown, peanut butter on grape, jelly on honey)
const BREAD_WASH = "radial-gradient(ellipse at 50% 45%, #5e3a1e 0%, #432611 50%, #2a160a 100%)"; // dark brown, so the cream bread and golden crust stand out
const WASH = [
  BREAD_WASH,
  "radial-gradient(ellipse at 50% 45%, #f0b95e 0%, #e2a64f 45%, #c68b3e 100%)",
  "radial-gradient(ellipse at 50% 45%, #8a3d77 0%, #6b2d5c 45%, #3b1f2b 100%)",
  BREAD_WASH,
];
const GAP = 0.004; // tiny space between layers so touching surfaces never fight over the same pixels

// Paints the photo onto the slab by projecting it from the original viewpoint, trims the slab to the
// photo's outline, and adds light that matches the photo at rest but changes as the slab turns.
const vertexShader = /* glsl */ `
  uniform vec3 photoRight;
  uniform vec3 photoUp;
  uniform vec2 photoSize;
  uniform float uKey;   // 0..1: how much of the perspective fix is applied (only when a layer is out front)
  uniform vec3 uKeyBox; // the layer's middle x, front-most z and depth
  uniform float uKeyQ;  // how much wider the near edge is than the far edge in the photo
  uniform vec2 uShear;  // half the layer's width, and how far (in world units) the crown corners are levelled
  attribute float wallU;
  varying float vWallU;
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vNormalObj;
  varying vec3 vNormalWorld;
  varying vec3 vNormalView;
  varying vec3 vPhotoRightV;
  varying vec3 vPhotoUpV;
  void main() {
    vec2 screen = vec2(dot(position, photoRight), dot(position, photoUp));
    vUv = screen / photoSize + 0.5;
    vPos = position;
    vWallU = wallU;
    vNormalObj = normal;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vNormalView = normalize(normalMatrix * normal);
    vPhotoRightV = normalize(normalMatrix * photoRight);
    vPhotoUpV = normalize(normalMatrix * photoUp);
    // The photo was taken in perspective, so the near edge of a slice looks wider than the far edge. When
    // the slice faces us, squeeze the near end and stretch the far end so its sides run straight.
    vec3 shown = position;
    float v = clamp((position.z - uKeyBox.y + uKeyBox.z) / uKeyBox.z, 0.0, 1.0); // 0 = far edge, 1 = near edge
    shown.x = uKeyBox.x + (position.x - uKeyBox.x) * mix(1.0, 1.0 / (1.0 + uKeyQ * (v - 0.5)), uKey);
    // The crown (the rounded top of a slice) was photographed a little lopsided: its right shoulder sits
    // higher than the left. Level it by moving the right side down and the left side up, only up in the crown.
    shown.z += uShear.y * clamp((position.x - uKeyBox.x) / uShear.x, -1.0, 1.0) * smoothstep(0.42, 0.18, v) * uKey;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(shown, 1.0);
  }
`;
const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D wallMap;
  uniform float wallLength;
  uniform float wallHeight;
  uniform vec3 toCamera;
  uniform vec3 lightDir;
  uniform vec3 sideColor;
  uniform float uAlpha;
  uniform float uDim; // 0..1: darkens a layer that is behind the highlighted one
  uniform float uGloss; // 0..1: how much of the 3D shine is switched on (only for a layer that has left the stack)
  uniform vec3 uShine;  // how glossy this food is: strength, sharpness, bumpiness
  uniform vec2 photoSize;
  varying vec3 vNormalView;
  varying vec3 vPhotoRightV;
  varying vec3 vPhotoUpV;
  varying float vWallU;
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vNormalObj;
  varying vec3 vNormalWorld;

  float light(vec3 n) { return 0.58 + 0.42 * max(dot(normalize(n), lightDir), 0.0); }

  void main() {
    vec3 n = normalize(vNormalObj);

    // The side walls: the strip cut from the photo, wrapped around the slab
    vec2 wallUv = vec2(vWallU / wallLength, 1.0 + vPos.y / wallHeight);
    vec3 wall = texture2D(wallMap, wallUv).rgb;

    // The photo itself, painted on from where it was taken (never cut out: a missing pixel is a wall pixel)
    vec4 t = texture2D(map, vUv);
    vec3 photo = mix(wall, t.rgb, smoothstep(0.35, 0.65, t.a));

    // Top faces and the walls we can see in the photo use the photo; the rest use the wrapped wall
    float facing = dot(n, toCamera);
    float usePhoto = max(smoothstep(0.55, 0.75, n.y), smoothstep(0.0, 0.3, facing));
    vec3 col = mix(wall, photo, usePhoto);

    // Same light as at rest (so the photo is untouched), brighter or darker as the slab turns
    // (a layer out front keeps its brightness however it tilts, so its lower edges never darken)
    col *= mix(clamp(light(vNormalWorld) / light(n), 0.5, 1.3), 1.0, uGloss);
    // The 3D look for a layer that is out of the stack. It only ever darkens, brightens or tints the food's
    // own colour (never washes it out with white), and the flat face keeps exactly its photo colour.
    //  - the rounded edge catches the light on one side and falls into shade on the other
    //  - a small, tight glossy highlight catches the surface texture
    // It is all worked out from the camera's point of view, so it is the same however the layer travels.
    if (uGloss > 0.001) {
      vec3 V = vec3(0.0, 0.0, 1.0);
      vec3 L = normalize(vec3(-0.45, 0.65, 0.62));
      vec3 ng = normalize(vNormalView); // the shape's own normal: flat on the face
      // Round the rim: look at how much of the food is around this spot. Near the outline there is food on
      // one side only, so tilt the surface outward there, as if the edge curved over like a real rounded lip.
      vec2 around = vec2(0.0);
      float seen = 0.0;
      for (int k = 0; k < 8; k++) {
        float ang = float(k) * 0.7853982;
        vec2 dir = vec2(cos(ang), sin(ang));
        float a = texture2D(map, vUv + dir * 0.075 / photoSize).a;
        around += dir * a;
        seen += a;
      }
      float rimAmt = 1.0 - smoothstep(0.5, 1.0, seen / 8.0); // 0 inside, 1 right on the outline
      vec2 out2 = -normalize(around + vec2(1e-4));
      vec3 outward = normalize(vPhotoRightV * out2.x + vPhotoUpV * out2.y);
      ng = normalize(ng + vec3(outward.xy, 0.0) * rimAmt * 1.5);
      float flatLit = 0.45 + 0.7 * L.z;
      float lit = 0.45 + 0.7 * max(dot(ng, L), 0.0);
      float edge = 1.0 - clamp(ng.z, 0.0, 1.0); // 0 on the flat face, up to 1 at the very edge
      col *= mix(1.0, clamp(lit / flatLit, 0.96, 1.3), uGloss); // edges facing the light glow a little; none go dark
      float lum = dot(photo, vec3(0.299, 0.587, 0.114));
      vec3 nv = normalize(ng + vec3(-vec2(dFdx(lum), dFdy(lum)) * uShine.z, 0.0)); // texture gives tiny bumps
      float spec = pow(max(dot(nv, normalize(L + V)), 0.0), uShine.y) * uShine.x;
      col += spec * mix(vec3(1.0), col, 0.55) * uGloss; // highlight tinted by the food's own colour
    }
    col *= 1.0 - uDim;
    gl_FragColor = vec4(col, uAlpha);
    #include <colorspace_fragment>
  }
`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function createMascot(root) {
  const canvas = root.querySelector("canvas");
  const hero = root.closest(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const viewDir = new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));

  const turntable = new THREE.Group(); // spins the whole sandwich
  scene.add(turntable);

  // ---- The animated values (the timeline moves these; draw() puts them on screen) ----
  const piece = LAYERS.map((_, i) => ({ y: APART[i], x: TILTS[i][0], turn: TILTS[i][1], z: TILTS[i][2] }));
  const cam = { target: 0.9, zoom: 1 };
  const spin = { angle: 0 };
  const hop = LAYERS.map(() => ({ v: 0 }));
  // Each layer follows its scroll position on a springy "string", so landing and lifting off are a
  // little bouncy in both directions. A floor stops any layer sinking into the one below it.
  const springs = LAYERS.map(() => ({ y: 0, v: 0, ready: false }));
  const MAX_STRAY = 0.22; // the furthest a bounce can go from the scroll position, in sandwich units
  let OMEGA = 13; // how stiff the spring is (higher = snappier)
  let DAMPING = 2 * 0.45 * OMEGA; // 0.45 = slightly bouncy (1 would be no bounce at all)
  const tune = (omega, zeta) => {
    OMEGA = omega;
    DAMPING = 2 * zeta * omega;
  };
  const backdrop = root.parentElement.querySelector(".focus-backdrop");
  const corner = new THREE.Vector3();
  // Tap a layer and it floats out to the front of the screen. focus.i is which layer (-1 = none) and
  // focus.amount goes 0 -> 1 as it travels out
  const focus = { i: -1, amount: 0, dim: 0 };
  const FOCUS_DEPTH = 8; // how far a tapped layer is pulled toward the viewer while it swings round
  const squareYaw = []; // per layer: the turn that makes its edges run level with the screen
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  let lastTime = 0;
  const meshes = [];
  let rest = [0, 0, 0, 0]; // where each slab sits when the sandwich is built
  let stackCenter = 0.1;
  let ppu = 140; // pixels per world unit
  let size = { w: 1, h: 1 }; // the canvas size we last drew at
  let spread = 1;

  // ---- Scroll timeline: pieces drop in one by one, then the whole sandwich spins ----
  const tl = gsap.timeline({ paused: true });
  const startAt = [0, 0.2, 1.2, 2.2];
  piece.forEach((p, i) => {
    tl.fromTo(
      p,
      { y: () => APART[i] * spread },
      { y: () => rest[i], duration: 1, ease: "power3.inOut" }, // smooth both ways (a bounce would jolt when scrolling back up)
      startAt[i]
    ).fromTo(
      p,
      { x: TILTS[i][0], turn: TILTS[i][1], z: TILTS[i][2] },
      { x: 0, turn: 0, z: 0, duration: i === 0 ? 1 : 0.9, ease: "power2.inOut" },
      startAt[i]
    );
  });
  tl.fromTo(spin, { angle: 0 }, { angle: Math.PI * 2, duration: 1.2, ease: "power3.inOut" }, 3.2)
    .fromTo(cam, { target: () => 0.9 * spread }, { target: () => stackCenter, duration: 3.2, ease: "none" }, 0)
    .fromTo(cam, { zoom: 1 }, { zoom: 1 / 0.82, duration: 1.2, ease: "power2.inOut" }, 3.2);

  if (import.meta.env.DEV) window.mascotDebug = { gsap, focus, spin, cam, piece, tl, turntable, renderer, scene, camera, draw: (t, snap) => draw(t, snap), tune }; // handy for testing in the browser

  function resize() {
    const { clientWidth: cw, clientHeight: ch } = root;
    if (!cw || !ch) return;
    // Resizing clears the canvas, so only do it when the size really changed (a no-op resize mid-scroll
    // would flash the sandwich blank for a frame)
    if (cw === size.w && ch === size.h) return;
    renderer.setSize(cw, ch, false);
    size = { w: cw, h: ch };
    const W = Math.min(cw * 0.95, ch * 0.8); // width of the whole photo on screen
    ppu = W / PHOTO_W;
    // Keep the whole floating-apart stack inside the hero, even on short screens
    spread = Math.min(1, Math.max(0.35, (0.97 * ch / W - 0.54) / 0.73));
    camera.left = -cw / 2 / ppu;
    camera.right = cw / 2 / ppu;
    camera.top = ch / 2 / ppu;
    camera.bottom = -ch / 2 / ppu;
    tl.invalidate();
    tl.progress(tl.progress());
    draw(lastTime); // redraw at the same moment, so a resize never makes the sandwich jump
  }

  // snap = jump straight to the scroll position with no spring (used for testing and first draw)
  function draw(time, snap = false) {
    if (!meshes.length) return;
    const dt = Math.min(0.05, Math.max(0, time - lastTime));
    lastTime = time;
    const bounce = hop[0].v * 0.12; // the click hop moves the whole sandwich together
    let belowY = -Infinity;
    meshes.forEach((mesh, i) => {
      const p = piece[i];
      const sp = springs[i];
      if (snap || !sp.ready) {
        sp.y = p.y;
        sp.v = 0;
        sp.ready = true;
      } else if (dt > 0) {
        // Move the spring toward where the scroll says this layer should be (in small, steady steps)
        const steps = Math.ceil(dt * 120);
        const h = dt / steps;
        for (let k = 0; k < steps; k++) {
          sp.v += (-OMEGA * OMEGA * (sp.y - p.y) - DAMPING * sp.v) * h;
          sp.y += sp.v * h;
        }
        // A bounce never strays far from where the scroll puts the layer (keeps it inside the frame)
        const stray = Math.max(-MAX_STRAY, Math.min(MAX_STRAY, sp.y - p.y));
        if (stray !== sp.y - p.y) {
          sp.y = p.y + stray;
          sp.v *= 0.5;
        }
      }
      // A layer only floats while it is still in the air; once landed it moves with the stack
      const apartY = APART[i] * spread;
      const floating = Math.min(1, Math.max(0, (p.y - rest[i]) / (apartY - rest[i] || 1)));
      // A tilted slab dips one corner down, so lift it just enough to stay clear of the layer below
      const clearance = i === 0 ? 0 : 1.3 * (Math.abs(Math.sin(p.x)) + Math.abs(Math.sin(p.z)));
      let y = sp.y + clearance + Math.sin(time * 1.4 + i * 1.3) * 0.08 * floating + bounce;
      // The floor: never lower than resting on the layer below. Hitting it makes a small bounce.
      if (i > 0) {
        const floor = belowY + (rest[i] - rest[i - 1]);
        if (y < floor) {
          sp.y += floor - y;
          y = floor;
          if (sp.v < 0) sp.v *= -0.35;
        }
      }
      belowY = y;
      mesh.position.set(0, y, 0);
      mesh.rotation.set(p.x, p.turn, p.z + Math.sin(time * 1.1 + i) * 0.06 * floating);
    });
    turntable.rotation.y = spin.angle;
    // The camera follows the stack down and zooms in, and the whole thing bobs a little
    const target = new THREE.Vector3(0, cam.target - Math.sin(time * 1.2) * 0.05, 0);
    camera.position.copy(target).addScaledVector(viewDir, 30);
    camera.lookAt(target);
    camera.zoom = cam.zoom;
    camera.updateProjectionMatrix();
    // Keep the whole sandwich inside the frame: if any layer would poke out of the top or bottom, slide
    // the camera just enough to bring it back (smooth, because the layers themselves move smoothly)
    const LIMIT = 0.96;
    const frameShift = () => {
      camera.updateMatrixWorld(true);
      let hi = -Infinity;
      let lo = Infinity;
      meshes.forEach((mesh) => {
        mesh.updateMatrixWorld(true);
        const b = mesh.geometry.boundingBox;
        for (let k = 0; k < 8; k++) {
          corner.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(mesh.matrixWorld).project(camera);
          hi = Math.max(hi, corner.y);
          lo = Math.min(lo, corner.y);
        }
      });
      // Too high pushes the view up, too low pushes it down. Always a smooth blend, never a sudden switch
      return Math.max(0, hi - LIMIT) + Math.min(0, lo + LIMIT);
    };
    for (let pass = 0; pass < 2; pass++) {
      const over = frameShift(); // in screen units: positive = too high
      if (!over) break;
      target.y += over * (camera.top / camera.zoom) / Math.cos(ELEVATION);
      camera.position.copy(target).addScaledVector(viewDir, 30);
      camera.lookAt(target);
    }
    // The tapped layer: slide it to the middle of the screen, pull it in front of the others and make it
    // a little bigger (never wider than the screen). Everything else stays exactly where it was.
    meshes.forEach((mesh, i) => mesh.scale.setScalar(LAYERS[i].size));
    // The tapped layer flows out to the front in one continuous, curving motion:
    //  - it swings out to the side just far enough to clear the stack (a half-circle lobe), then curves
    //    back in to the middle of the screen,
    //  - at the far side of the swing it is moved nearer to us than everything else (nothing on screen
    //    changes when that happens, because it is already clear of the stack), so it passes in front,
    //  - as it comes round it turns to face us square-on.
    // Coming back is the same motion in reverse. On the way it only grows as it arrives (except on a very narrow screen,
    // where the whole view eases out a touch so the swing fits).
    let dimAmount = 0;
    let glossAmount = 0;
    if (focus.i >= 0 && focus.amount > 0.0005 && meshes[focus.i]) {
      const mesh = meshes[focus.i];
      const size_ = LAYERS[focus.i].size;
      const u = focus.amount;
      const ease = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
      const lobe = Math.sin(Math.PI * u); // 0 at both ends, 1 at the far side of the swing
      const sm = ease(u); // 0 -> 1 across the whole trip
      const turn = ease((u - 0.35) / 0.65);
      const box = mesh.geometry.boundingBox;
      const L = (box.max.x - box.min.x) * size_;
      let stackW = 0;
      meshes.forEach((m, j) => (stackW = Math.max(stackW, (m.geometry.boundingBox.max.x - m.geometry.boundingBox.min.x) * LAYERS[j].size)));
      const clearX = 0.52 * (stackW + L); // far enough out to be clear of the stack
      // Only on a narrow screen: ease the view out a little so the swing fits (desktop stays at 1)
      const halfW0 = ((size.w / 2) / (ppu * cam.zoom)) * 0.9;
      const zMin = Math.min(1, Math.max(0.4, halfW0 / (clearX + L / 2)));
      camera.zoom = cam.zoom * (1 - (1 - zMin) * lobe);
      camera.updateProjectionMatrix();
      // Where the layer's middle is on screen to begin with
      mesh.scale.setScalar(size_);
      camera.updateMatrixWorld(true);
      mesh.updateMatrixWorld(true);
      box.getCenter(v1);
      mesh.localToWorld(v1);
      v2.copy(v1).applyMatrix4(camera.matrixWorldInverse);
      const x0 = v2.x;
      const y0 = v2.y;
      // Turn it to face us (tip up, and straighten its edges)
      mesh.rotation.y += squareYaw[focus.i] * turn;
      // Not quite dead flat: it leans back about 10 degrees and rocks very gently, so you can see it has
      // thickness and rounded edges, and the light moves across it
      mesh.rotation.x += (Math.PI / 2 - ELEVATION - 0.17 + Math.sin(time * 1.3) * 0.03) * turn;
      mesh.rotation.y += Math.sin(time * 0.9) * 0.05 * turn;
      mesh.rotation.z *= 1 - turn;
      // Arriving at the front it grows to take a proper share of the screen (it is the star now), a touch
      // past its final size on the way for a soft "breath", and never bigger than the screen allows
      const widthPx = L * ppu * cam.zoom;
      const heightPx = (box.max.z - box.min.z) * size_ * ppu * cam.zoom;
      const grow = Math.min(1.7, (size.w * 0.86) / widthPx, (size.h * 0.8) / heightPx);
      const arrive = ease((u - 0.4) / 0.6);
      mesh.scale.setScalar(size_ * (1 + (grow - 1) * arrive));
      glossAmount = ease(u / 0.2); // the 3D shine switches on as it leaves the stack and stays on
      dimAmount = 0.55 * arrive; // the stack behind it settles back in brightness
      mesh.updateMatrixWorld(true);
      box.getCenter(v1);
      mesh.localToWorld(v1);
      v2.copy(v1).applyMatrix4(camera.matrixWorldInverse); // the middle now (after turning and growing)
      // The path on screen: out to the side and round into the middle
      const swing = clearX * lobe;
      const wantX = x0 * (1 - sm) + swing;
      const wantY = y0 * (1 - sm) + (y0 < 0 ? 0.1 : -0.1) * clearX * lobe;
      // Nearer to us once it is out at the side and clear of the stack (invisible when it happens)
      const toward = FOCUS_DEPTH * (u >= 0.5 ? 1 : ease((swing / clearX - 0.85) / 0.15)); // and it stays in front from then on
      const right = v3.setFromMatrixColumn(camera.matrixWorld, 0);
      const up = v1.setFromMatrixColumn(camera.matrixWorld, 1);
      const move = new THREE.Vector3()
        .addScaledVector(right, wantX - v2.x)
        .addScaledVector(up, wantY - v2.y)
        .addScaledVector(viewDir, toward);
      mesh.position.add(move.applyAxisAngle(Y_AXIS, -spin.angle)); // in the spinning turntable's own directions
    }
    meshes.forEach((mesh, i) => {
      mesh.material.uniforms.uDim.value = i === focus.i ? 0 : dimAmount;
      mesh.material.uniforms.uGloss.value = i === focus.i ? glossAmount : 0;
    });
    renderer.render(scene, camera);
  }

  // ---- Build the slabs once the photos have loaded ----
  const slabs = new Map();
  Promise.all(LAYERS.map((l) => loadImage(l.src))).then((images) => {
    LAYERS.forEach((layer, i) => {
      if (!slabs.has(layer.src)) {
        const { geometry, thickness, wallBand } = buildSlab(images[i], {
          thickness: layer.wall,
          elevation: ELEVATION,
          bevel: layer.bevel,
          sideColor: layer.side,
          soften: layer.soften || 0,
        });
        const wallTexture = new THREE.CanvasTexture(wallBand.canvas);
        wallTexture.colorSpace = THREE.SRGBColorSpace;
        wallTexture.wrapS = THREE.MirroredRepeatWrapping;
        wallTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const texture = new THREE.Texture(images[i]);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        const side = new THREE.Color(layer.side);
        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            map: { value: texture },
            wallMap: { value: wallTexture },
            wallLength: { value: wallBand.length },
            wallHeight: { value: thickness },
            photoRight: { value: new THREE.Vector3(1, 0, 0) },
            photoUp: { value: new THREE.Vector3(0, Math.cos(ELEVATION), -Math.sin(ELEVATION)) },
            photoSize: { value: new THREE.Vector2(PHOTO_W, PHOTO_H) },
            toCamera: { value: viewDir.clone() },
            lightDir: { value: new THREE.Vector3(-0.4, 0.8, 0.5).normalize() },
            sideColor: { value: new THREE.Vector3(side.r, side.g, side.b) },
          },
        });
        slabs.set(layer.src, { geometry, material, thickness });
      }
    });

    // Stack them: each slab sits on the one below (heights are the top faces)
    rest = [0, 0, 0, 0];
    LAYERS.forEach((layer, i) => {
      const { geometry, material, thickness } = slabs.get(layer.src);
      geometry.computeBoundingBox();
      if (squareYaw[i] === undefined) {
        // Find the turn (up to 45 degrees either way) that makes the layer's outline the snuggest rectangle
        const pos = geometry.attributes.position;
        let best = 0;
        let bestArea = Infinity;
        for (let deg = -45; deg <= 45; deg += 0.5) {
          const c = Math.cos((deg * Math.PI) / 180);
          const sn = Math.sin((deg * Math.PI) / 180);
          let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
          for (let v = 0; v < pos.count; v += 3) {
            const x = pos.getX(v) * c + pos.getZ(v) * sn;
            const z = -pos.getX(v) * sn + pos.getZ(v) * c;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (z < z0) z0 = z;
            if (z > z1) z1 = z;
          }
          if ((x1 - x0) * (z1 - z0) < bestArea) {
            bestArea = (x1 - x0) * (z1 - z0);
            best = deg;
          }
        }
        squareYaw[i] = (best * Math.PI) / 180;
      }
      // Each layer gets its own copy of the material (sharing the textures), so one can fade on its own
      const own = material.clone();
      Object.keys(material.uniforms).forEach((k) => (own.uniforms[k] = material.uniforms[k]));
      own.uniforms.uAlpha = { value: 1 };
      own.uniforms.uDim = { value: 0 };
      own.uniforms.uGloss = { value: 0 };
      own.uniforms.uShine = { value: new THREE.Vector3(...(layer.shine || [0.2, 30, 1])) };
      const kb = geometry.boundingBox;
      own.uniforms.uKey = { value: 0 };
      own.uniforms.uKeyQ = { value: layer.key || 0 };
      own.uniforms.uShear = { value: new THREE.Vector2((kb.max.x - kb.min.x) / 2, (layer.shear || 0) * (kb.max.z - kb.min.z)) };
      own.uniforms.uKeyBox = { value: new THREE.Vector3((kb.min.x + kb.max.x) / 2, kb.max.z, kb.max.z - kb.min.z) };
      const mesh = new THREE.Mesh(geometry, own);
      mesh.scale.setScalar(layer.size);
      meshes.push(mesh);
      turntable.add(mesh);
      rest[i] = i === 0 ? 0 : rest[i - 1] + thickness * layer.size + GAP;
    });
    // The camera ends up looking at the middle of the finished stack
    stackCenter = (rest[3] - slabs.get(LAYERS[0].src).thickness) / 2;
    tl.invalidate();
    tl.progress(tl.progress());
    draw(0);
  });

  new ResizeObserver(resize).observe(root);
  resize();

  if (reduceMotion) {
    tl.progress(1);
    return { resize };
  }

  ScrollTrigger.create({
    trigger: hero,
    // On phones the folder tabs sit at the top, so pin the hero just below them
    start: () => `top ${window.matchMedia("(max-width: 767px)").matches ? document.querySelector(".tabs").offsetHeight : 0}`,
    end: "+=180%",
    pin: true,
    scrub: 0.3, // light smoothing only: the page already smooths scrolling, and more would make it trail behind
    invalidateOnRefresh: true,
    animation: tl,
  });

  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(root);
  gsap.ticker.add((time) => visible && draw(time));

  // ---- Tap a layer: it floats out to the front. Tap anywhere (or scroll) to put it back. ----
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const layerAt = (clientX, clientY) => {
    const rect = root.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? meshes.indexOf(hit.object) : -1;
  };

  let scrollAtFocus = 0;
  // The layer travels out along its path (slide, half-circle, turn) as `amount` goes 0 -> 1, and home again
  // along the same path as it goes 1 -> 0.
  let focusTl = null;
  const release = () => {
    if (focus.i < 0) return;
    focusTl?.kill();
    focusTl = gsap.timeline({ onComplete: () => (focus.i = -1) }).to(focus, { amount: 0, duration: 1.2, ease: "sine.inOut" });
  };
  const bringToFront = (i) => {
    scrollAtFocus = window.scrollY;
    const go = () => {
      focus.i = i;
      if (backdrop) backdrop.style.background = WASH[i];
      focusTl?.kill();
      focusTl = gsap.timeline().to(focus, { amount: 1, duration: 1.4, ease: "sine.inOut" });
    };
    if (focus.i >= 0 && focus.i !== i) {
      focusTl?.kill();
      focusTl = gsap.timeline({ onComplete: go }).to(focus, { amount: 0, duration: 1, ease: "power1.inOut" });
    } else go();
  };
  // Scrolling puts the layer back, so the sandwich can carry on building itself
  window.addEventListener("scroll", () => {
    if (focus.i >= 0 && Math.abs(window.scrollY - scrollAtFocus) > 12) release();
  }, { passive: true });

  // A tap is a quick press that barely moves. A scroll or drag is not a tap.
  let down = null;
  root.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
  root.addEventListener("pointerup", (e) => {
    if (!down) return;
    const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 600;
    down = null;
    if (!tap) return;
    const i = layerAt(e.clientX, e.clientY);
    if (i < 0 || i === focus.i) release();
    else bringToFront(i);
  });
  root.addEventListener("pointercancel", () => (down = null));
  // Show a pointing hand over the layers (mouse only)
  root.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") root.style.cursor = layerAt(e.clientX, e.clientY) >= 0 ? "pointer" : "default";
  });

  return { resize };
}
