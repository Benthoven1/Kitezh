import * as THREE from "three";

// Pastel porcelain colors
const PASTEL_STAR    = 0xF0D5BB;
const PASTEL_IFO     = 0xC4DDB8;
const PASTEL_CASTLES = 0xB8CAE0;
const PASTEL_EDU     = 0xE0B8C8;
const PASTEL_ZONES   = 0xB8DDD8;
const CREAM_DEEP     = 0xcdbe96;
const PAPER          = 0xffffff;

const STAR_RADIUS = 0.95;

// ringTube is set per-orbit so that after 2D pivot scaling all rings appear the same
// line weight from the overhead camera (tube_initial × scale_2D ≈ 0.04 for every ring).
// ellipseX is the X-axis stretch applied only in 2D; each orbit traces a distinct
// ellipse while remaining properly nested (no overlaps).
//
// 2D semi-axes in world space (pivot rotation.x = π/2):
//   X semi-axis = radius2D × ellipseX
//   Z semi-axis = radius2D
// Nesting check (must both grow outward): IFO(3.125,2.5) < Castles(3.375,4.5)
//   < Education(7.15,6.5) < Zones(7.65,8.5) — verified non-overlapping.
const ORBITS = [
  {
    id: "ifo",
    name: "International Festival Orchestra",
    href: "pages/meet-mulvium/international-festival-orchestra.html",
    radius: 3.0,  radius2D: 2.5,  ellipseX: 1.25,  ringTube: 0.048,
    planetSize: 0.32, planetColor: PASTEL_IFO,
    tilt: [0, 0, 0],
    speed: 0.36,  phase: 0.0,
  },
  {
    id: "castles",
    name: "Castles",
    href: "pages/meet-mulvium/castles.html",
    radius: 3.8,  radius2D: 4.5,  ellipseX: 0.75,  ringTube: 0.034,
    planetSize: 0.4,  planetColor: PASTEL_CASTLES,
    tilt: [Math.PI / 2, 0, 0],
    speed: 0.26,  phase: 1.1,
  },
  {
    id: "education",
    name: "Education",
    href: "pages/meet-mulvium/education.html",
    radius: 4.5,  radius2D: 6.5,  ellipseX: 1.10,  ringTube: 0.028,
    planetSize: 0.38, planetColor: PASTEL_EDU,
    tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0],
    speed: 0.22,  phase: 2.4,
  },
  {
    id: "zones",
    name: "Economic Zones",
    href: "pages/meet-mulvium/economic-zones.html",
    radius: 5.0,  radius2D: 8.5,  ellipseX: 0.90,  ringTube: 0.024,
    planetSize: 0.42, planetColor: PASTEL_ZONES,
    tilt: [Math.PI / 3.2, Math.PI / 5, 0],
    speed: 0.18,  phase: 3.8,
  },
];

const canvas   = document.getElementById("cosmos");
const label    = document.getElementById("planet-label");
const navbar   = document.getElementById("navbar");
const brandLink = document.getElementById("brand-link");
const body     = document.body;

body.classList.add("cosmos-only");

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

// Soft sculptural lighting
scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
const hemi = new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75);
scene.add(hemi);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 10, 8);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

function porcelainMat(color, roughness = 0.38) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: false });
}

// Central star
const star = new THREE.Mesh(
  new THREE.SphereGeometry(STAR_RADIUS, 96, 96),
  porcelainMat(PASTEL_STAR)
);
star.userData = { type: "star" };
scene.add(star);

// Orbit rings + planets (no spokes)
const orbits = [];

ORBITS.forEach((def) => {
  const pivot = new THREE.Group();
  pivot.rotation.set(def.tilt[0], def.tilt[1], def.tilt[2]);
  pivot.userData.baseTilt = [...def.tilt];
  scene.add(pivot);

  // Ring: tube radius compensated per orbit so all appear equal weight in 2D overhead view
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(def.radius, def.ringTube, 24, 256),
    porcelainMat(CREAM_DEEP, 0.35)
  );
  pivot.add(ring);

  // Rotator carries the planet around the ring axis (local Z)
  const rotator = new THREE.Group();
  rotator.rotation.z = def.phase;
  pivot.add(rotator);

  // Planet — no spoke
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(def.planetSize, 64, 64),
    porcelainMat(def.planetColor)
  );
  planet.position.x = def.radius;
  planet.userData = { type: "planet", def };
  rotator.add(planet);

  orbits.push({ def, pivot, rotator, ring, planet, angle: def.phase });
});

// Camera — 2D is overhead; Y=24 gives visible radius ≈9.2 which frames max Z semi-axis (8.5)
const CAM_3D = new THREE.Vector3(0, 2.6, 14.5);
const CAM_2D = new THREE.Vector3(0, 24, 0.001);
const LOOK_AT = new THREE.Vector3(0, 0, 0);

camera.position.copy(CAM_3D);
camera.lookAt(LOOK_AT);

const state = {
  mode: "3d",
  t: 0,
  target: 0,
  hoverStar: false,
  hoverPlanet: null,
  labelPlanet: null,
  labelStar: false,
  clock: new THREE.Clock(),
};

let lastW = 0, lastH = 0;
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w === lastW && h === lastH) return;
  lastW = w; lastH = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
let pointerInside = false;

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  pointerInside = true;
});

canvas.addEventListener("pointerleave", () => {
  pointerInside = false;
  state.hoverStar = false;
  state.hoverPlanet = null;
  canvas.style.cursor = "default";
  // Label persists — only cleared when another sphere is hovered or 2D mode starts
});

canvas.addEventListener("click", () => {
  if (state.mode !== "3d") return;
  if (state.hoverPlanet) window.location.href = state.hoverPlanet.def.href;
  else if (state.hoverStar) goTo2D();
});

canvas.setAttribute("tabindex", "0");
canvas.setAttribute("role", "application");
canvas.setAttribute("aria-label", "Mulvium cosmos. Click a planet to explore. Click the center to enter.");
canvas.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && state.mode === "3d") { goTo2D(); e.preventDefault(); }
});

function goTo2D() {
  if (state.mode !== "3d") return;
  state.mode = "transitioning";
  state.target = 1;
  navbar.classList.add("visible");
  navbar.setAttribute("aria-hidden", "false");
  body.classList.remove("cosmos-only");
  body.classList.add("mode-2d");
  label.classList.remove("visible");
  state.labelPlanet = null;
  state.labelStar = false;
}

function goTo3D() {
  if (state.mode !== "2d") return;
  state.mode = "transitioning";
  state.target = 0;
  navbar.classList.remove("visible");
  navbar.setAttribute("aria-hidden", "true");
  body.classList.add("cosmos-only");
  body.classList.remove("mode-2d");
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

brandLink.addEventListener("click", (e) => { e.preventDefault(); goTo3D(); });

document.querySelectorAll(".nav-item.has-dropdown").forEach((item) => {
  const trigger = item.querySelector(".nav-trigger");
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
    if (!wasOpen) { item.classList.add("open"); trigger.setAttribute("aria-expanded", "true"); }
    else           { trigger.setAttribute("aria-expanded", "false"); }
  });
  item.addEventListener("mouseenter", () => {
    if (window.matchMedia("(hover: hover)").matches) {
      document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
      item.classList.add("open");
    }
  });
  item.addEventListener("mouseleave", () => item.classList.remove("open"));
});

document.addEventListener("click", () => {
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
});

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpVec(a, b, t, out) {
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.z = a.z + (b.z - a.z) * t;
  return out;
}
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const tmpVec  = new THREE.Vector3();
const worldPos = new THREE.Vector3();

function projectToCanvas(pos) {
  const v = pos.clone().project(camera);
  const rect = canvas.getBoundingClientRect();
  return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height };
}

function updateHover() {
  if (!pointerInside || state.mode !== "3d") {
    state.hoverStar = false;
    state.hoverPlanet = null;
    canvas.style.cursor = "default";
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([star, ...orbits.map((o) => o.planet)], false);

  if (hits.length > 0) {
    const obj = hits[0].object;
    state.hoverStar   = obj.userData.type === "star";
    state.hoverPlanet = obj.userData.type === "planet" ? orbits.find((o) => o.planet === obj) : null;
    canvas.style.cursor = "pointer";

    if (state.hoverPlanet) {
      state.labelPlanet = state.hoverPlanet;
      state.labelStar   = false;
      state.hoverPlanet.planet.getWorldPosition(worldPos);
      const p = projectToCanvas(worldPos);
      label.textContent = state.hoverPlanet.def.name;
      label.style.left = p.x + "px";
      label.style.top  = p.y + "px";
      label.classList.add("visible");
    } else if (state.hoverStar) {
      state.labelPlanet = null;
      state.labelStar   = true;
      star.getWorldPosition(worldPos);
      const p = projectToCanvas(worldPos);
      label.textContent = "Enter Mulvium";
      label.style.left = p.x + "px";
      label.style.top  = p.y + "px";
      label.classList.add("visible");
    }
  } else {
    state.hoverStar   = false;
    state.hoverPlanet = null;
    canvas.style.cursor = "default";
    // Label stays — pinned to last hovered sphere
  }
}

function trackLabel() {
  if (state.mode !== "3d") return;
  if (state.labelPlanet) {
    state.labelPlanet.planet.getWorldPosition(worldPos);
    const p = projectToCanvas(worldPos);
    label.style.left = p.x + "px";
    label.style.top  = p.y + "px";
  } else if (state.labelStar) {
    star.getWorldPosition(worldPos);
    const p = projectToCanvas(worldPos);
    label.style.left = p.x + "px";
    label.style.top  = p.y + "px";
  }
}

// ---------- Animation loop ----------
function animate() {
  const dt    = Math.min(state.clock.getDelta(), 0.05);
  const eased = easeInOut(state.t);

  // Constant circular orbiting
  orbits.forEach((o) => {
    o.angle += o.def.speed * dt;
    o.rotator.rotation.z = o.angle;
    o.planet.rotation.y += 0.08 * dt;
  });

  // Transition: flatten tilts toward XZ plane (pivot.x → π/2) so overhead camera
  // sees rings as circles/ellipses; apply per-orbit ellipseX for distinct shapes.
  orbits.forEach((o) => {
    const [rx, ry, rz] = o.pivot.userData.baseTilt;
    o.pivot.rotation.x = lerp(rx, Math.PI / 2, eased);
    o.pivot.rotation.y = lerp(ry, 0, eased);
    o.pivot.rotation.z = lerp(rz, 0, eased);

    const s  = lerp(1, o.def.radius2D / o.def.radius, eased);
    const ex = lerp(1, o.def.ellipseX,                eased);
    o.pivot.scale.set(s * ex, s, s);
  });

  // Star pulse + hover bump
  const pulse      = 1 + Math.sin(performance.now() * 0.0011) * 0.01;
  const starTarget = state.hoverStar && state.mode === "3d" ? 1.1 : pulse;
  star.scale.lerp(tmpVec.set(starTarget, starTarget, starTarget), 1 - Math.pow(0.0005, dt));

  orbits.forEach((o) => {
    const target = state.hoverPlanet === o && state.mode === "3d" ? 1.18 : 1;
    o.planet.scale.lerp(tmpVec.set(target, target, target), 1 - Math.pow(0.001, dt));
  });

  if (state.mode === "transitioning") {
    const dir = state.target > state.t ? 1 : -1;
    state.t += dir * dt * 0.85;
    if ((dir === 1 && state.t >= 1) || (dir === -1 && state.t <= 0)) {
      state.t    = state.target;
      state.mode = state.target === 1 ? "2d" : "3d";
    }
  }

  lerpVec(CAM_3D, CAM_2D, eased, camera.position);
  camera.lookAt(LOOK_AT);

  updateHover();
  trackLabel();
  resize();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
