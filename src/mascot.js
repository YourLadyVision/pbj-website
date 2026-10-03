import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// The PB&J mascot: a code-built 3D sandwich that assembles itself as people scroll.

const COLORS = {
  breadInside: "#fbe7bf",
  crust: "#b9783a",
  peanut: "#c68b3e",
  jelly: "#7a2e66",
  face: "#2a160c",
  cheek: "#f49aa8",
};

// Classic bread-slice outline: square body with a rounded, slightly wider crown on top
function breadShape(scale = 1) {
  const s = new THREE.Shape();
  const p = (x, y) => [x * scale, y * scale];
  s.moveTo(...p(-0.85, -1));
  s.lineTo(...p(0.85, -1));
  s.quadraticCurveTo(...p(1, -1), ...p(1, -0.85));
  s.lineTo(...p(1, 0.42));
  s.bezierCurveTo(...p(1.28, 0.55), ...p(1.22, 1.08), ...p(0.6, 1.08));
  s.bezierCurveTo(...p(0.3, 1.14), ...p(-0.3, 1.14), ...p(-0.6, 1.08));
  s.bezierCurveTo(...p(-1.22, 1.08), ...p(-1.28, 0.55), ...p(-1, 0.42));
  s.lineTo(...p(-1, -0.85));
  s.quadraticCurveTo(...p(-1, -1), ...p(-0.85, -1));
  return s;
}

// Extrude a slice and lay it flat (thickness along Y, crown pointing away from the camera)
function slab(shape, depth, bevel) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 40,
  });
  geo.center();
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function makeFace() {
  const face = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: COLORS.face, roughness: 0.35 });
  const cheekMat = new THREE.MeshStandardMaterial({ color: COLORS.cheek, roughness: 0.8 });

  const eyes = [];
  for (const x of [-0.32, 0.32]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), ink);
    eye.scale.set(1, 0.5, 1.25);
    eye.position.set(x, 0, -0.05);
    face.add(eye);
    eyes.push(eye);

    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), cheekMat);
    cheek.rotation.x = -Math.PI / 2;
    cheek.position.set(x * 1.55, 0.005, 0.17);
    face.add(cheek);
  }

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 32, Math.PI), ink);
  smile.rotation.x = Math.PI / 2;
  smile.scale.set(1, 1, 0.5);
  smile.position.set(0, -0.01, 0.1);
  face.add(smile);

  return { face, eyes };
}

export function createMascot(canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  const target = new THREE.Vector3(0, 0.9, 0);
  const cam = { zoom: 1 }; // the camera eases in closer once the sandwich is built
  let baseDist = 7.4;
  const viewDir = new THREE.Vector3(0, 0.38, 1).normalize();

  scene.add(new THREE.HemisphereLight("#fff6e5", "#c68b3e", 1.1));
  const key = new THREE.DirectionalLight("#ffffff", 2.0);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#ffd0dc", 1.0);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // Soft blob shadow on the "floor"
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(59,36,20,0.35)");
  grad.addColorStop(1, "rgba(59,36,20,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.0;
  scene.add(shadow);

  // ---- The sandwich ----
  const root = new THREE.Group();
  root.rotation.set(0.42, -0.5, 0);
  scene.add(root);

  const breadGeo = slab(breadShape(), 0.22, 0.08);
  const breadMats = [
    new THREE.MeshStandardMaterial({ color: COLORS.breadInside, roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: COLORS.crust, roughness: 0.75 }),
  ];
  const peanutMat = new THREE.MeshStandardMaterial({ color: COLORS.peanut, roughness: 0.4 });
  const jellyMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.jelly,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });

  const bottom = new THREE.Mesh(breadGeo, breadMats);
  const peanut = new THREE.Mesh(slab(breadShape(0.97), 0.05, 0.05), peanutMat);
  const jelly = new THREE.Mesh(slab(breadShape(1.0), 0.05, 0.05), jellyMat);
  const top = new THREE.Mesh(breadGeo, breadMats);

  // Jelly drips over the front edge
  for (const [x, len] of [[-0.55, 1.6], [0.05, 2.3], [0.6, 1.3]]) {
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), jellyMat);
    drip.scale.set(1, len, 1);
    drip.position.set(x, -0.075 * len + 0.04, 1.02);
    jelly.add(drip);
  }

  const { face, eyes } = makeFace();
  face.position.y = 0.2;
  face.scale.setScalar(0.001);
  top.add(face);

  // Each piece sits in a "holder" (moved by scrolling) wrapping a "floater" (gentle idle bob)
  const pieces = [bottom, peanut, jelly, top].map((mesh, i) => {
    const holder = new THREE.Group();
    const floater = new THREE.Group();
    floater.add(mesh);
    holder.add(floater);
    root.add(holder);
    return { holder, floater, i };
  });

  // Assembled heights vs. floating-apart heights
  const stacked = [0, 0.245, 0.375, 0.62];
  const apart = [-0.8, 0.35, 1.45, 2.6];
  const tilts = [
    [0.05, 0, -0.08],
    [-0.25, 0.3, 0.18],
    [0.22, -0.35, -0.2],
    [-0.3, 0.5, 0.25],
  ];
  pieces.forEach(({ holder }, i) => {
    holder.position.y = apart[i];
    holder.rotation.set(...tilts[i]);
  });

  // ---- Scroll timeline: pieces drop in one by one, then the sandwich comes alive ----
  const tl = gsap.timeline({ paused: true });
  tl.to(pieces[0].holder.position, { y: stacked[0], duration: 1, ease: "power2.out" }, 0)
    .to(pieces[0].holder.rotation, { x: 0, y: 0, z: 0, duration: 1 }, 0)
    .to(pieces[1].holder.position, { y: stacked[1], duration: 1, ease: "bounce.out" }, 0.2)
    .to(pieces[1].holder.rotation, { x: 0, y: 0, z: 0, duration: 0.8 }, 0.2)
    .to(pieces[2].holder.position, { y: stacked[2], duration: 1, ease: "bounce.out" }, 1.2)
    .to(pieces[2].holder.rotation, { x: 0, y: 0, z: 0, duration: 0.8 }, 1.2)
    .to(pieces[3].holder.position, { y: stacked[3], duration: 1, ease: "bounce.out" }, 2.2)
    .to(pieces[3].holder.rotation, { x: 0, y: 0, z: 0, duration: 0.8 }, 2.2)
    .to(root.rotation, { y: -0.5 + Math.PI * 2, duration: 1.2, ease: "back.inOut(1.4)" }, 3.2)
    .to(face.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(3)" }, 3.9)
    .to(target, { y: 0.35, duration: 3.2, ease: "none" }, 0)
    .to(cam, { zoom: 0.82, duration: 1.2, ease: "power2.inOut" }, 3.2);

  const hero = canvas.closest(".hero");
  if (reduceMotion) {
    tl.progress(1);
  } else {
    // On phones the folder tabs sit at the top, so pin the hero just below them
    const tabsHeight = () =>
      window.matchMedia("(max-width: 767px)").matches ? document.querySelector(".tabs").offsetHeight : 0;
    ScrollTrigger.create({
      trigger: hero,
      start: () => `top ${tabsHeight()}`,
      invalidateOnRefresh: true,
      end: "+=180%",
      pin: true,
      scrub: 0.8,
      animation: tl,
    });
  }

  // ---- Sizing: keep the whole sandwich in frame on wide and narrow screens ----
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseDist = Math.max(7.4, 6.0 / camera.aspect);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();

  // ---- Render loop (paused when the hero is off screen) ----
  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);

  const clock = new THREE.Clock();
  let nextBlink = 2.5;
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();

    if (!reduceMotion) {
      const calm = 1 - tl.progress(); // pieces float less as the sandwich comes together
      pieces.forEach(({ floater, i }) => {
        floater.position.y = Math.sin(t * 1.4 + i * 1.3) * 0.08 * calm;
        floater.rotation.z = Math.sin(t * 1.1 + i) * 0.06 * calm;
      });
      root.position.y = Math.sin(t * 1.2) * 0.05;

      // Blink every few seconds
      if (t > nextBlink) {
        eyes.forEach((e) =>
          gsap.fromTo(e.scale, { y: 0.5 }, { y: 0.05, duration: 0.08, yoyo: true, repeat: 1 })
        );
        nextBlink = t + 2.5 + Math.random() * 2.5;
      }
    }

    camera.position.copy(target).addScaledVector(viewDir, baseDist * cam.zoom);
    camera.lookAt(target);
    renderer.render(scene, camera);
  });

  // A still picture of the finished sandwich (with its face), e.g. for the loading intro
  function snapshot(size = 600) {
    const progressBefore = tl.progress();
    tl.progress(1);
    const camAspect = camera.aspect;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    camera.position.copy(target).addScaledVector(viewDir, 6.3 * cam.zoom);
    camera.lookAt(target);
    renderer.render(scene, camera);
    const url = canvas.toDataURL("image/png");

    tl.progress(progressBefore);
    camera.aspect = camAspect;
    resize();
    return url;
  }

  return { resize, snapshot };
}
