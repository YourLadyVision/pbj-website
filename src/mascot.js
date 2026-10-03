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
const APART = [-0.8, 0.35, 1.45, 2.6];
// Tilts while floating apart (x, y, z radians), then they settle to flat
const TILTS = [
  [0.05, 0, -0.08],
  [-0.25, 0.3, 0.18],
  [0.22, -0.35, -0.2],
  [-0.3, 0.5, 0.25],
];

// bread, jelly, peanut butter, bread: the photo, how thick its visible wall is (photo pixels), its
// side colour, and a size fix (the jelly photo is bigger than the others)
const LAYERS = [
  { src: "/mascot/bread.webp", wall: 70, side: "#c98a43", size: 1 },
  { src: "/mascot/jelly.webp", wall: 26, side: "#8c0f1c", size: 0.88 },
  { src: "/mascot/peanut-butter.webp", wall: 34, side: "#b87f3a", size: 1 },
  { src: "/mascot/bread.webp", wall: 70, side: "#c98a43", size: 1 },
];

// Paints the photo onto the slab by projecting it from the original viewpoint, trims the slab to the
// photo's outline, and adds light that matches the photo at rest but changes as the slab turns.
const vertexShader = /* glsl */ `
  uniform vec3 photoRight;
  uniform vec3 photoUp;
  uniform vec2 photoSize;
  varying vec2 vUv;
  varying vec3 vNormalObj;
  varying vec3 vNormalWorld;
  void main() {
    vec2 screen = vec2(dot(position, photoRight), dot(position, photoUp));
    vUv = screen / photoSize + 0.5;
    vNormalObj = normal;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 toCamera;
  uniform vec3 lightDir;
  uniform vec3 sideColor;
  varying vec2 vUv;
  varying vec3 vNormalObj;
  varying vec3 vNormalWorld;

  float light(vec3 n) { return 0.58 + 0.42 * max(dot(normalize(n), lightDir), 0.0); }

  void main() {
    // Faces we can see in the photo take the photo's colours; the others get the side colour
    bool inPhoto = dot(normalize(vNormalObj), toCamera) > 0.05;
    vec3 col = sideColor;
    if (inPhoto) {
      vec4 t = texture2D(map, vUv);
      if (t.a < 0.5) discard;
      col = t.rgb;
    }
    // Same light as at rest (so the photo is untouched), brighter or darker as the slab turns
    col *= clamp(light(vNormalWorld) / light(vNormalObj), 0.5, 1.3);
    gl_FragColor = vec4(col, 1.0);
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

  // A soft shadow on the ground under the sandwich (a plain element behind the canvas)
  const shadowEl = root.querySelector(".mascot-shadow");
  const ground = new THREE.Vector3();
  let groundY = -0.45;
  let size = { w: 1, h: 1 };

  // ---- The animated values (the timeline moves these; draw() puts them on screen) ----
  const piece = LAYERS.map((_, i) => ({ y: APART[i], x: TILTS[i][0], turn: TILTS[i][1], z: TILTS[i][2] }));
  const cam = { target: 0.9, zoom: 1 };
  const spin = { angle: 0 };
  const hop = LAYERS.map(() => ({ v: 0 }));
  const meshes = [];
  let rest = [0, 0, 0, 0]; // where each slab sits when the sandwich is built
  let stackCenter = 0.1;
  let ppu = 140; // pixels per world unit
  let spread = 1;

  // ---- Scroll timeline: pieces drop in one by one, then the whole sandwich spins ----
  const tl = gsap.timeline({ paused: true });
  const startAt = [0, 0.2, 1.2, 2.2];
  piece.forEach((p, i) => {
    tl.fromTo(
      p,
      { y: () => APART[i] * spread },
      { y: () => rest[i], duration: 1, ease: i === 0 ? "power2.out" : "bounce.out" },
      startAt[i]
    ).to(p, { x: 0, turn: 0, z: 0, duration: i === 0 ? 1 : 0.8 }, startAt[i]);
  });
  tl.to(spin, { angle: Math.PI * 2, duration: 1.2, ease: "back.inOut(1.4)" }, 3.2)
    .fromTo(cam, { target: () => 0.9 * spread }, { target: () => stackCenter, duration: 3.2, ease: "none" }, 0)
    .to(cam, { zoom: 1 / 0.82, duration: 1.2, ease: "power2.inOut" }, 3.2);

  if (import.meta.env.DEV) window.mascotDebug = { spin, cam, piece, tl, turntable, draw: (t) => draw(t) }; // handy for testing in the browser

  function resize() {
    const { clientWidth: cw, clientHeight: ch } = root;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch, false);
    size = { w: cw, h: ch };
    const W = Math.min(cw * 0.95, ch * 0.58); // width of the whole photo on screen
    ppu = W / PHOTO_W;
    // Keep the whole floating-apart stack inside the hero, even on short screens
    spread = Math.min(1, Math.max(0.35, (0.78 * ch / W - 0.54) / 0.73));
    camera.left = -cw / 2 / ppu;
    camera.right = cw / 2 / ppu;
    camera.top = ch / 2 / ppu;
    camera.bottom = -ch / 2 / ppu;
    tl.invalidate();
    tl.progress(tl.progress());
    draw(0);
  }

  function draw(time) {
    if (!meshes.length) return;
    const calm = 1 - tl.progress(); // pieces float less as the sandwich comes together
    meshes.forEach((mesh, i) => {
      const p = piece[i];
      mesh.position.y = p.y + Math.sin(time * 1.4 + i * 1.3) * 0.08 * calm + hop[i].v * 0.12;
      mesh.rotation.set(p.x, p.turn, p.z + Math.sin(time * 1.1 + i) * 0.06 * calm);
    });
    turntable.rotation.y = spin.angle;
    // The camera follows the stack down and zooms in, and the whole thing bobs a little
    const target = new THREE.Vector3(0, cam.target - Math.sin(time * 1.2) * 0.05, 0);
    camera.position.copy(target).addScaledVector(viewDir, 30);
    camera.lookAt(target);
    camera.zoom = cam.zoom;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    // Put the shadow under the sandwich: project the ground point to the screen
    camera.updateMatrixWorld();
    ground.set(0, groundY, 0).project(camera);
    const px = (ground.x * 0.5 + 0.5) * size.w;
    const py = (-ground.y * 0.5 + 0.5) * size.h;
    const diameter = 3.4 * ppu * camera.zoom;
    shadowEl.style.width = shadowEl.style.height = `${diameter}px`;
    shadowEl.style.transform = `translate(${px - diameter / 2}px, ${py - diameter / 2}px) scaleY(${Math.sin(ELEVATION)})`;
  }

  // ---- Build the slabs once the photos have loaded ----
  const slabs = new Map();
  Promise.all(LAYERS.map((l) => loadImage(l.src))).then((images) => {
    LAYERS.forEach((layer, i) => {
      if (!slabs.has(layer.src)) {
        const { geometry, thickness } = buildSlab(images[i], { thickness: layer.wall, elevation: ELEVATION });
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
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(layer.size);
      meshes.push(mesh);
      turntable.add(mesh);
      rest[i] = i === 0 ? 0 : rest[i - 1] + thickness * layer.size;
    });
    // The camera ends up looking at the middle of the finished stack
    stackCenter = (rest[3] - slabs.get(LAYERS[0].src).thickness) / 2;
    groundY = -slabs.get(LAYERS[0].src).thickness - 0.1;
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
    scrub: 0.8,
    invalidateOnRefresh: true,
    animation: tl,
  });

  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(root);
  gsap.ticker.add((time) => visible && draw(time));

  // ---- Click or tap: the layers hop one after another, like jelly wobbling ----
  root.addEventListener("click", () => {
    gsap.fromTo(
      hop,
      { v: 0 },
      { v: 1, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.06, ease: "power2.out", overwrite: "auto" }
    );
  });

  return { resize };
}
