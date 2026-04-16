import * as THREE from "three";

// Cream/ivory palette for the kinetic sculpture
const CREAM = 0xede3c1;
const CREAM_DEEP = 0xcdbe96;
const CREAM_SHADOW = 0x8f825d;
const PAPER = 0xffffff;

// Four tilted orbit rings, gimbal-style. Radii kept modest so planets never
// leave the frame; speeds tuned so orbits re-emerge quickly.
const ORBITS = [
  {
    id: "ifo",
    name: "International Festival Orchestra",
    href: "pages/meet-mulvium/international-festival-orchestra.html",
    radius: 3.0,
    planetSize: 0.32,
    tilt: [0, 0, 0], // vertical ring facing the viewer (XY plane)
    speed: 0.36,
    phase: 0.0,
  },
  {
    id: "castles",
    name: "Castles",
    href: "pages/meet-mulvium/castles.html",
    radius: 3.8,
    planetSize: 0.4,
    tilt: [Math.PI / 2, 0, 0], // horizontal ring lying flat (XZ plane)
    speed: 0.26,
    phase: 1.1,
  },
  {
    id: "education",
    name: "Education",
    href: "pages/meet-mulvium/education.html",
    radius: 4.5,
    planetSize: 0.38,
    tilt: [0, Math.PI / 2, 0], // vertical ring edge-on to viewer (YZ plane)
    speed: 0.22,
    phase: 2.4,
  },
  {
    id: "zones",
    name: "Economic Zones",
    href: "pages/meet-mulvium/economic-zones.html",
    radius: 5.0,
    planetSize: 0.42,
    tilt: [Math.PI / 3.2, Math.PI / 5, 0], // oblique gimbal
    speed: 0.18,
    phase: 3.8,
  },
];

const canvas = document.getElementById("cosmos");
const label = document.getElementById("planet-label");
const navbar = document.getElementById("navbar");
const visionOverlay = document.getElementById("vision-overlay");
const returnBtn = document.getElementById("return-cosmos");
const brandLink = document.getElementById("brand-link");
const body = document.body;

body.classList.add("cosmos-only");

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

// ---------- Lighting (soft, sculptural) ----------
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

// ---------- Material factory: polished cream stone ----------
function creamMaterial({ color = CREAM, roughness = 0.42, metalness = 0.0 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: false,
  });
}

// ---------- Central star ----------
const STAR_RADIUS = 0.95;
const starGeo = new THREE.SphereGeometry(STAR_RADIUS, 96, 96);
const starMat = creamMaterial({ color: CREAM, roughness: 0.38 });
const star = new THREE.Mesh(starGeo, starMat);
star.userData = { type: "star" };
scene.add(star);

// ---------- Orbit rings + spokes + planets ----------
const orbits = []; // { def, pivot, rotator, ring, spoke, planet, angle }

ORBITS.forEach((def) => {
  const pivot = new THREE.Group();
  pivot.rotation.set(def.tilt[0], def.tilt[1], def.tilt[2]);
  pivot.userData.baseTilt = [...def.tilt];
  scene.add(pivot);

  // Thin ring (torus in XY plane, axis = Z)
  const ringThickness = 0.04;
  const ringGeo = new THREE.TorusGeometry(def.radius, ringThickness, 24, 256);
  const ringMat = creamMaterial({
    color: CREAM_DEEP,
    roughness: 0.35,
    metalness: 0.0,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  pivot.add(ring);

  // Rotator carries spoke + planet around the ring's axis (Z)
  const rotator = new THREE.Group();
  rotator.rotation.z = def.phase;
  pivot.add(rotator);

  // Spoke: thin cylinder from origin to the planet along +X
  const spokeGeo = new THREE.CylinderGeometry(0.025, 0.025, def.radius, 24, 1);
  const spokeMat = creamMaterial({
    color: CREAM_DEEP,
    roughness: 0.35,
    metalness: 0.0,
  });
  const spoke = new THREE.Mesh(spokeGeo, spokeMat);
  // Cylinder default axis is Y; rotate to X and translate so it spans origin→radius
  spoke.rotation.z = -Math.PI / 2;
  spoke.position.x = def.radius / 2;
  rotator.add(spoke);

  // Planet at the far end of the spoke
  const planetGeo = new THREE.SphereGeometry(def.planetSize, 64, 64);
  const planetMat = creamMaterial({
    color: CREAM,
    roughness: 0.35,
    metalness: 0.0,
  });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  planet.position.x = def.radius;
  planet.userData = { type: "planet", def };
  rotator.add(planet);

  orbits.push({ def, pivot, rotator, ring, spoke, planet, angle: def.phase });
});

// ---------- Camera framing ----------
const CAM_3D = new THREE.Vector3(0, 2.6, 14.5);
const CAM_2D = new THREE.Vector3(0, 15, 0.001);
const LOOK_AT = new THREE.Vector3(0, 0, 0);

camera.position.copy(CAM_3D);
camera.lookAt(LOOK_AT);

// ---------- State ----------
const state = {
  mode: "3d", // "3d" | "transitioning" | "2d"
  t: 0, // 0 = 3d, 1 = 2d
  target: 0,
  hoverStar: false,
  hoverPlanet: null, // the orbit record currently hovered
  clock: new THREE.Clock(),
};

// ---------- Resize ----------
let lastW = 0;
let lastH = 0;
function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === lastW && h === lastH) return;
  lastW = w;
  lastH = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

// ---------- Pointer / raycaster ----------
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
  label.classList.remove("visible");
  canvas.style.cursor = "default";
});

// Click-only navigation
canvas.addEventListener("click", () => {
  if (state.mode !== "3d") return;
  if (state.hoverPlanet) {
    window.location.href = state.hoverPlanet.def.href;
  } else if (state.hoverStar) {
    goTo2D();
  }
});

// Keyboard accessibility
canvas.setAttribute("tabindex", "0");
canvas.setAttribute("role", "application");
canvas.setAttribute(
  "aria-label",
  "Mulvium cosmos. Click a planet to open a division. Click the center star to enter Mulvium."
);
canvas.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && state.mode === "3d") {
    goTo2D();
    e.preventDefault();
  }
});

// ---------- Transition controllers ----------
function goTo2D() {
  if (state.mode !== "3d") return;
  state.mode = "transitioning";
  state.target = 1;
  navbar.classList.add("visible");
  navbar.setAttribute("aria-hidden", "false");
  visionOverlay.classList.add("visible");
  body.classList.remove("cosmos-only");
  body.classList.add("mode-2d");
  label.classList.remove("visible");
}

function goTo3D() {
  if (state.mode !== "2d") return;
  state.mode = "transitioning";
  state.target = 0;
  navbar.classList.remove("visible");
  navbar.setAttribute("aria-hidden", "true");
  visionOverlay.classList.remove("visible");
  body.classList.add("cosmos-only");
  body.classList.remove("mode-2d");
  document
    .querySelectorAll(".nav-item.open")
    .forEach((el) => el.classList.remove("open"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

returnBtn.addEventListener("click", goTo3D);
brandLink.addEventListener("click", (e) => {
  e.preventDefault();
  goTo3D();
});

// ---------- Dropdown behaviour ----------
document.querySelectorAll(".nav-item.has-dropdown").forEach((item) => {
  const trigger = item.querySelector(".nav-trigger");
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = item.classList.contains("open");
    document
      .querySelectorAll(".nav-item.open")
      .forEach((el) => el.classList.remove("open"));
    if (!wasOpen) {
      item.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    } else {
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  item.addEventListener("mouseenter", () => {
    if (window.matchMedia("(hover: hover)").matches) {
      document
        .querySelectorAll(".nav-item.open")
        .forEach((el) => el.classList.remove("open"));
      item.classList.add("open");
    }
  });
  item.addEventListener("mouseleave", () => {
    item.classList.remove("open");
  });
});

document.addEventListener("click", () => {
  document
    .querySelectorAll(".nav-item.open")
    .forEach((el) => el.classList.remove("open"));
});

// ---------- Helpers ----------
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpVec(a, b, t, out) {
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.z = a.z + (b.z - a.z) * t;
  return out;
}
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const tmpVec = new THREE.Vector3();
const worldPos = new THREE.Vector3();

// Project a world position to pixel coords in the canvas.
function projectToCanvas(pos) {
  const v = pos.clone().project(camera);
  const rect = canvas.getBoundingClientRect();
  return {
    x: (v.x * 0.5 + 0.5) * rect.width,
    y: (-v.y * 0.5 + 0.5) * rect.height,
    behind: v.z > 1,
  };
}

function updateHover() {
  if (!pointerInside || state.mode !== "3d") {
    if (state.hoverStar || state.hoverPlanet) {
      state.hoverStar = false;
      state.hoverPlanet = null;
      label.classList.remove("visible");
      canvas.style.cursor = "default";
    }
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const targets = [star, ...orbits.map((o) => o.planet)];
  const hits = raycaster.intersectObjects(targets, false);

  let hoverStar = false;
  let hoverPlanet = null;

  if (hits.length > 0) {
    const obj = hits[0].object;
    if (obj.userData.type === "star") hoverStar = true;
    else if (obj.userData.type === "planet") {
      hoverPlanet = orbits.find((o) => o.planet === obj);
    }
  }

  state.hoverStar = hoverStar;
  state.hoverPlanet = hoverPlanet;

  if (hoverPlanet) {
    // Label follows the planet's current world position (along its orbit).
    hoverPlanet.planet.getWorldPosition(worldPos);
    const p = projectToCanvas(worldPos);
    label.textContent = hoverPlanet.def.name;
    label.style.left = p.x + "px";
    label.style.top = p.y + "px";
    label.classList.add("visible");
    canvas.style.cursor = "pointer";
  } else if (hoverStar) {
    star.getWorldPosition(worldPos);
    const p = projectToCanvas(worldPos);
    label.textContent = "Enter Mulvium";
    label.style.left = p.x + "px";
    label.style.top = p.y + "px";
    label.classList.add("visible");
    canvas.style.cursor = "pointer";
  } else {
    label.classList.remove("visible");
    canvas.style.cursor = "default";
  }
}

// Keep label anchored to moving planet even when not re-hovering each frame.
function trackLabel() {
  if (state.mode !== "3d") return;
  if (state.hoverPlanet) {
    state.hoverPlanet.planet.getWorldPosition(worldPos);
    const p = projectToCanvas(worldPos);
    label.style.left = p.x + "px";
    label.style.top = p.y + "px";
  } else if (state.hoverStar) {
    star.getWorldPosition(worldPos);
    const p = projectToCanvas(worldPos);
    label.style.left = p.x + "px";
    label.style.top = p.y + "px";
  }
}

// ---------- Animation loop ----------
function animate() {
  const dt = Math.min(state.clock.getDelta(), 0.05);

  // Orbit motion — rotators spin around Z (in their tilted frame)
  const speedScale = state.t > 0.5 ? 0.55 : 1;
  orbits.forEach((o) => {
    o.angle += o.def.speed * dt * speedScale;
    o.rotator.rotation.z = o.angle;
    o.planet.rotation.y += 0.25 * dt;
  });

  // In 2D mode, flatten every pivot to horizontal so planets orbit a single plane
  const eased = easeInOut(state.t);
  orbits.forEach((o) => {
    const [rx, ry, rz] = o.pivot.userData.baseTilt;
    o.pivot.rotation.x = lerp(rx, 0, eased);
    o.pivot.rotation.y = lerp(ry, 0, eased);
    o.pivot.rotation.z = lerp(rz, 0, eased);
  });

  // Star scale: idle pulse + hover bump
  const idlePulse = 1 + Math.sin(performance.now() * 0.0011) * 0.01;
  const starTarget =
    state.hoverStar && state.mode === "3d" ? 1.1 : idlePulse;
  star.scale.lerp(
    tmpVec.set(starTarget, starTarget, starTarget),
    1 - Math.pow(0.0005, dt)
  );
  // Planet hover bump
  orbits.forEach((o) => {
    const target =
      state.hoverPlanet === o && state.mode === "3d" ? 1.18 : 1;
    o.planet.scale.lerp(
      tmpVec.set(target, target, target),
      1 - Math.pow(0.001, dt)
    );
  });

  // Transition progress
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
