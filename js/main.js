import * as THREE from "three";

// Pastel porcelain colors — unique per sphere, shading preserved via materials
const PASTEL_STAR    = 0xF0D5BB; // warm apricot
const PASTEL_IFO     = 0xC4DDB8; // sage green
const PASTEL_CASTLES = 0xB8CAE0; // periwinkle blue
const PASTEL_EDU     = 0xE0B8C8; // rose blush
const PASTEL_ZONES   = 0xB8DDD8; // soft aqua

const CREAM_DEEP = 0xcdbe96;
const PAPER = 0xffffff;

const STAR_RADIUS = 0.95;

// Economic Zones tilt: [π/3.2, π/5, 0]
// Education is 90° inverted: same X tilt, +π/2 on Y — creates perpendicular orbital planes
const ORBITS = [
  {
    id: "ifo",
    name: "International Festival Orchestra",
    href: "pages/meet-mulvium/international-festival-orchestra.html",
    radius: 3.0,
    radius2D: 2.5,
    planetSize: 0.32,
    planetColor: PASTEL_IFO,
    tilt: [0, 0, 0],
    speed: 0.36,
    phase: 0.0,
  },
  {
    id: "castles",
    name: "Castles",
    href: "pages/meet-mulvium/castles.html",
    radius: 3.8,
    radius2D: 4.5,
    planetSize: 0.4,
    planetColor: PASTEL_CASTLES,
    tilt: [Math.PI / 2, 0, 0],
    speed: 0.26,
    phase: 1.1,
  },
  {
    id: "education",
    name: "Education",
    href: "pages/meet-mulvium/education.html",
    radius: 4.5,
    radius2D: 6.5,
    planetSize: 0.38,
    planetColor: PASTEL_EDU,
    tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0], // 90° offset from Economic Zones
    speed: 0.22,
    phase: 2.4,
  },
  {
    id: "zones",
    name: "Economic Zones",
    href: "pages/meet-mulvium/economic-zones.html",
    radius: 5.0,
    radius2D: 8.5,
    planetSize: 0.42,
    planetColor: PASTEL_ZONES,
    tilt: [Math.PI / 3.2, Math.PI / 5, 0],
    speed: 0.18,
    phase: 3.8,
  },
];

const canvas = document.getElementById("cosmos");
const label = document.getElementById("planet-label");
const navbar = document.getElementById("navbar");
const brandLink = document.getElementById("brand-link");
const body = document.body;

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

function creamMaterial({ color = PASTEL_STAR, roughness = 0.42, metalness = 0.0, transparent = false } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: false, transparent });
}

// Central star — warm apricot pastel
const starGeo = new THREE.SphereGeometry(STAR_RADIUS, 96, 96);
const starMat = creamMaterial({ color: PASTEL_STAR, roughness: 0.38 });
const star = new THREE.Mesh(starGeo, starMat);
star.userData = { type: "star" };
scene.add(star);

// Orbit rings + spokes (starting at star surface) + planets
const orbits = [];

ORBITS.forEach((def) => {
  const pivot = new THREE.Group();
  pivot.rotation.set(def.tilt[0], def.tilt[1], def.tilt[2]);
  pivot.userData.baseTilt = [...def.tilt];
  scene.add(pivot);

  const ringGeo = new THREE.TorusGeometry(def.radius, 0.04, 24, 256);
  const ringMat = creamMaterial({ color: CREAM_DEEP, roughness: 0.35 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  pivot.add(ring);

  const rotator = new THREE.Group();
  rotator.rotation.z = def.phase;
  pivot.add(rotator);

  // Spoke starts at star surface (STAR_RADIUS), not at origin — prevents phasing through center
  const spokeLength = def.radius - STAR_RADIUS;
  const spokeGeo = new THREE.CylinderGeometry(0.025, 0.025, spokeLength, 24, 1);
  const spokeMat = creamMaterial({ color: CREAM_DEEP, roughness: 0.35, transparent: true });
  const spoke = new THREE.Mesh(spokeGeo, spokeMat);
  spoke.rotation.z = -Math.PI / 2;
  spoke.position.x = STAR_RADIUS + spokeLength / 2; // centered between star surface and planet
  rotator.add(spoke);

  const planetGeo = new THREE.SphereGeometry(def.planetSize, 64, 64);
  const planetMat = creamMaterial({ color: def.planetColor, roughness: 0.35 });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  planet.position.x = def.radius;
  planet.userData = { type: "planet", def };
  rotator.add(planet);

  orbits.push({ def, pivot, rotator, ring, spoke, planet, angle: def.phase });
});

// Camera positions — 2D raised high enough to frame the largest 2D orbit (r=8.5)
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
  // Label persists until another sphere is hovered
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
const pointer = new THREE.Vector2();
let pointerInside = false;

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  pointerInside = true;
});

canvas.addEventListener("pointerleave", () => {
  pointerInside = false;
  state.hoverStar = false;
  state.hoverPlanet = null;
  // Label stays visible — only clears when another sphere is hovered or 2D mode
  canvas.style.cursor = "default";
});

canvas.addEventListener("click", () => {
  if (state.mode !== "3d") return;
  if (state.hoverPlanet) window.location.href = state.hoverPlanet.def.href;
  else if (state.hoverStar) goTo2D();
});

canvas.setAttribute("tabindex", "0");
canvas.setAttribute("role", "application");
canvas.setAttribute("aria-label", "Mulvium cosmos. Click a planet to open a division. Click the center star to enter Mulvium.");
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
    else { trigger.setAttribute("aria-expanded", "false"); }
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

const tmpVec = new THREE.Vector3();
const worldPos = new THREE.Vector3();

function projectToCanvas(pos) {
  const v = pos.clone().project(camera);
  const rect = canvas.getBoundingClientRect();
  return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height, behind: v.z > 1 };
}

function updateHover() {
  if (!pointerInside || state.mode !== "3d") {
    state.hoverStar = false;
    state.hoverPlanet = null;
    canvas.style.cursor = "default";
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const targets = [star, ...orbits.map((o) => o.planet)];
  const hits = raycaster.intersectObjects(targets, false);

  if (hits.length > 0) {
    const obj = hits[0].object;
    state.hoverStar = obj.userData.type === "star";
    state.hoverPlanet = obj.userData.type === "planet" ? orbits.find((o) => o.planet === obj) : null;
    canvas.style.cursor = "pointer";

    // Update label only when we land on a new target
    if (state.hoverPlanet) {
      state.labelPlanet = state.hoverPlanet;
      state.labelStar = false;
      state.labelPlanet.planet.getWorldPosition(worldPos);
      const p = projectToCanvas(worldPos);
      label.textContent = state.labelPlanet.def.name;
      label.style.left = p.x + "px";
      label.style.top = p.y + "px";
      label.classList.add("visible");
    } else if (state.hoverStar) {
      state.labelPlanet = null;
      state.labelStar = true;
      star.getWorldPosition(worldPos);
      const p = projectToCanvas(worldPos);
      label.textContent = "Enter Mulvium";
      label.style.left = p.x + "px";
      label.style.top = p.y + "px";
      label.classList.add("visible");
    }
  } else {
    // Not hovering anything — scale targets reset, label stays pinned to last sphere
    state.hoverStar = false;
    state.hoverPlanet = null;
    canvas.style.cursor = "default";
  }
}

// Keep label anchored to its last sphere as it moves
function trackLabel() {
  if (state.mode !== "3d") return;
  if (state.labelPlanet) {
    state.labelPlanet.planet.getWorldPosition(worldPos);
    const p = projectToCanvas(worldPos);
    label.style.left = p.x + "px";
    label.style.top = p.y + "px";
  } else if (state.labelStar) {
    star.getWorldPosition(worldPos);
    const p = projectToCanvas(worldPos);
    label.style.left = p.x + "px";
    label.style.top = p.y + "px";
  }
}

// ---------- Animation loop ----------
function animate() {
  const dt = Math.min(state.clock.getDelta(), 0.05);
  const eased = easeInOut(state.t);

  const speedScale = state.t > 0.5 ? 0.55 : 1;
  orbits.forEach((o) => {
    o.angle += o.def.speed * dt * speedScale;
    o.rotator.rotation.z = o.angle;
    o.planet.rotation.y += 0.25 * dt;
  });

  // Flatten tilts for 2D and scale pivots for solar-system spacing
  orbits.forEach((o) => {
    const [rx, ry, rz] = o.pivot.userData.baseTilt;
    o.pivot.rotation.x = lerp(rx, 0, eased);
    o.pivot.rotation.y = lerp(ry, 0, eased);
    o.pivot.rotation.z = lerp(rz, 0, eased);

    // Scale pivot for spaced 2D orbits — ensures no circle overlap
    const s = lerp(1, o.def.radius2D / o.def.radius, eased);
    o.pivot.scale.setScalar(s);

    // Fade spokes out in 2D (spoke start position doesn't scale with star surface)
    o.spoke.material.opacity = lerp(1, 0, eased);
  });

  // Star pulse + hover bump
  const idlePulse = 1 + Math.sin(performance.now() * 0.0011) * 0.01;
  const starTarget = state.hoverStar && state.mode === "3d" ? 1.1 : idlePulse;
  star.scale.lerp(tmpVec.set(starTarget, starTarget, starTarget), 1 - Math.pow(0.0005, dt));

  orbits.forEach((o) => {
    const target = state.hoverPlanet === o && state.mode === "3d" ? 1.18 : 1;
    o.planet.scale.lerp(tmpVec.set(target, target, target), 1 - Math.pow(0.001, dt));
  });

  if (state.mode === "transitioning") {
    const dir = state.target > state.t ? 1 : -1;
    state.t += dir * dt * 0.85;
    if ((dir === 1 && state.t >= 1) || (dir === -1 && state.t <= 0)) {
      state.t = state.target;
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

// ---------- Paper rip scroll effect ----------
(function initRip() {
  const ripSection = document.getElementById("rip-section");
  const paperLeft = document.getElementById("paper-rip-left");
  const paperRight = document.getElementById("paper-rip-right");
  if (!ripSection || !paperLeft || !paperRight) return;

  // Pre-computed tear profile: x offsets (%) from the 50% center split
  const TEAR = [0, 2.1, -1.5, 3.2, -2.0, 4.1, -1.2, 2.8, -2.5, 3.6,
                -1.8, 4.3, -2.2, 3.0, -1.6, 4.5, -2.1, 2.9, -1.9, 3.7,
                -2.4, 3.1, -1.7, 4.0, -2.3, 2.7, -1.4, 3.8, -2.0, 3.4, 0];
  const n = TEAR.length;

  // Left panel: from left edge to jagged right edge (centered at ~50%)
  const leftPts = ['0% 0%'];
  for (let i = 0; i < n; i++) {
    leftPts.push(`${(50 + TEAR[i]).toFixed(2)}% ${(i / (n - 1) * 100).toFixed(1)}%`);
  }
  leftPts.push('0% 100%');
  paperLeft.style.clipPath = `polygon(${leftPts.join(', ')})`;

  // Right panel: mirror of left — jagged left edge
  const rightPts = ['100% 0%'];
  for (let i = 0; i < n; i++) {
    rightPts.push(`${(50 - TEAR[i]).toFixed(2)}% ${(i / (n - 1) * 100).toFixed(1)}%`);
  }
  rightPts.push('100% 100%');
  paperRight.style.clipPath = `polygon(${rightPts.join(', ')})`;

  let lastProgress = -1;

  function onScroll() {
    const rect = ripSection.getBoundingClientRect();
    const sectionH = ripSection.offsetHeight;
    const viewH = window.innerHeight;
    const maxScroll = sectionH - viewH;
    if (maxScroll <= 0) return;
    const scrolled = Math.max(0, -rect.top);
    const progress = Math.min(1, scrolled / maxScroll);
    if (Math.abs(progress - lastProgress) < 0.001) return;
    lastProgress = progress;

    // Ease the slide: slow start, accelerate
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const shift = eased * 58; // slide up to 58% off-screen
    paperLeft.style.transform = `translateX(${-shift}%)`;
    paperRight.style.transform = `translateX(${shift}%)`;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
