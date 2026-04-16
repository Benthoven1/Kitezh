import * as THREE from "three";

const CLAY = 0xb87758;
const CLAY_DEEP = 0x8f5a42;
const CLAY_SOFT = 0xc88a6c;
const PAPER = 0xffffff;

const DIVISIONS = [
  {
    id: "ifo",
    name: "International Festival Orchestra",
    href: "pages/meet-mulvium/international-festival-orchestra.html",
    orbit: 4.6,
    size: 0.46,
    speed: 0.22,
    phase: 0.0,
  },
  {
    id: "castles",
    name: "Castles",
    href: "pages/meet-mulvium/castles.html",
    orbit: 6.4,
    size: 0.62,
    speed: 0.16,
    phase: 1.4,
  },
  {
    id: "education",
    name: "Education",
    href: "pages/meet-mulvium/education.html",
    orbit: 8.2,
    size: 0.5,
    speed: 0.11,
    phase: 3.0,
  },
  {
    id: "zones",
    name: "Economic Zones",
    href: "pages/meet-mulvium/economic-zones.html",
    orbit: 10.0,
    size: 0.56,
    speed: 0.08,
    phase: 4.6,
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
renderer.toneMappingExposure = 1.05;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

// ----- Lighting: soft studio feel for matte clay -----
const hemi = new THREE.HemisphereLight(0xffffff, 0xe9d9cc, 0.85);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
keyLight.position.set(8, 12, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xfff3e8, 0.45);
fillLight.position.set(-10, 4, -6);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffd9c2, 0.4);
rimLight.position.set(0, -6, -10);
scene.add(rimLight);

// ----- Shared clay material factory -----
function clayMaterial(color = CLAY, roughness = 0.92) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
    flatShading: false,
  });
}

// ----- Star (center) -----
const starGroup = new THREE.Group();
scene.add(starGroup);

const starGeo = new THREE.SphereGeometry(1.7, 96, 96);
const starMat = clayMaterial(CLAY_DEEP, 0.88);
const star = new THREE.Mesh(starGeo, starMat);
star.userData = { type: "star" };
starGroup.add(star);

// Subtle halo ring around star to give presence
const haloGeo = new THREE.RingGeometry(1.85, 2.05, 128);
const haloMat = new THREE.MeshBasicMaterial({
  color: CLAY_SOFT,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
});
const halo = new THREE.Mesh(haloGeo, haloMat);
halo.rotation.x = Math.PI / 2;
starGroup.add(halo);

// ----- Planets + orbit rings -----
const planets = [];
const orbits = [];

DIVISIONS.forEach((d) => {
  const pGeo = new THREE.SphereGeometry(d.size, 64, 64);
  const pMat = clayMaterial(CLAY, 0.9);
  const mesh = new THREE.Mesh(pGeo, pMat);
  mesh.userData = { type: "planet", division: d };
  scene.add(mesh);
  planets.push({ def: d, mesh, angle: d.phase });

  // Orbit path (thin ring on XZ plane)
  const ringGeo = new THREE.RingGeometry(d.orbit - 0.008, d.orbit + 0.008, 256);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  orbits.push(ring);
});

// ----- Camera framing -----
const CAM_3D = new THREE.Vector3(9, 6.2, 12);
const CAM_2D = new THREE.Vector3(0, 22, 0.001);
const LOOK_AT = new THREE.Vector3(0, 0, 0);

const state = {
  mode: "3d", // "3d" | "transitioning" | "2d"
  t: 0, // 0 = 3d, 1 = 2d
  target: 0, // where t is heading
  hoverStar: false,
  hoverPlanet: null,
  starDwell: 0, // seconds hovered on star, triggers 2D at threshold
  clock: new THREE.Clock(),
};

const STAR_DWELL_THRESHOLD = 0.35; // seconds to hover before transition

camera.position.copy(CAM_3D);
camera.lookAt(LOOK_AT);

// ----- Resize -----
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

// ----- Raycaster (pointer interaction) -----
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerClient = { x: 0, y: 0 };
let pointerInside = false;

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  pointerClient.x = e.clientX;
  pointerClient.y = e.clientY;
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

canvas.addEventListener("click", () => {
  if (state.hoverPlanet && state.mode === "3d") {
    window.location.href = state.hoverPlanet.division.href;
  } else if (state.hoverStar && state.mode === "3d") {
    goTo2D(); // immediate on click; otherwise hover-dwell triggers it
  }
});

// Keyboard accessibility: Enter / Space triggers star transition
canvas.setAttribute("tabindex", "0");
canvas.setAttribute("role", "application");
canvas.setAttribute(
  "aria-label",
  "Mulvium cosmos. Hover planets for divisions, hover center star to enter."
);
canvas.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && state.mode === "3d") {
    goTo2D();
    e.preventDefault();
  }
});

// ----- Transition controllers -----
function goTo2D() {
  if (state.mode === "2d" || state.mode === "transitioning") return;
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
  if (state.mode === "3d" || state.mode === "transitioning") return;
  state.mode = "transitioning";
  state.target = 0;
  navbar.classList.remove("visible");
  navbar.setAttribute("aria-hidden", "true");
  visionOverlay.classList.remove("visible");
  body.classList.add("cosmos-only");
  body.classList.remove("mode-2d");
  // collapse any open dropdowns
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

// ----- Dropdown behaviour -----
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

// ----- Render loop -----
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
  const targets = [star, ...planets.map((p) => p.mesh)];
  const hits = raycaster.intersectObjects(targets, false);

  let hoverStar = false;
  let hoverPlanet = null;

  if (hits.length > 0) {
    const obj = hits[0].object;
    if (obj.userData.type === "star") {
      hoverStar = true;
    } else if (obj.userData.type === "planet") {
      hoverPlanet = planets.find((p) => p.mesh === obj);
    }
  }

  state.hoverStar = hoverStar;
  state.hoverPlanet = hoverPlanet;

  if (hoverPlanet) {
    label.textContent = hoverPlanet.def.name;
    const rect = canvas.getBoundingClientRect();
    label.style.left = pointerClient.x - rect.left + "px";
    label.style.top = pointerClient.y - rect.top + "px";
    label.classList.add("visible");
    canvas.style.cursor = "pointer";
  } else if (hoverStar) {
    label.textContent = "Enter Mulvium";
    const rect = canvas.getBoundingClientRect();
    label.style.left = pointerClient.x - rect.left + "px";
    label.style.top = pointerClient.y - rect.top + "px";
    label.classList.add("visible");
    canvas.style.cursor = "pointer";
  } else {
    label.classList.remove("visible");
    canvas.style.cursor = "default";
  }
}

function animate() {
  const dt = Math.min(state.clock.getDelta(), 0.05);

  // Orbit motion — slower in 2D so content is calm to read
  const speedScale = state.t > 0.5 ? 0.55 : 1;
  planets.forEach((p) => {
    p.angle += p.def.speed * dt * speedScale;
    const x = Math.cos(p.angle) * p.def.orbit;
    const z = Math.sin(p.angle) * p.def.orbit;
    p.mesh.position.set(x, 0, z);
    p.mesh.rotation.y += 0.2 * dt;
  });

  star.rotation.y += 0.04 * dt;

  // Hover bump for planet
  planets.forEach((p) => {
    const targetScale = state.hoverPlanet === p && state.mode === "3d" ? 1.15 : 1;
    p.mesh.scale.lerp(
      tmpVec.set(targetScale, targetScale, targetScale),
      1 - Math.pow(0.001, dt)
    );
  });

  // Star hover bump (and gentle pulsing idle)
  const idlePulse = 1 + Math.sin(performance.now() * 0.0012) * 0.012;
  const starTarget =
    state.hoverStar && state.mode === "3d" ? 1.14 : idlePulse;
  star.scale.lerp(
    tmpVec.set(starTarget, starTarget, starTarget),
    1 - Math.pow(0.0005, dt)
  );
  halo.scale.copy(star.scale);

  // Star hover-dwell triggers transition to 2D
  if (state.mode === "3d") {
    if (state.hoverStar) {
      state.starDwell += dt;
      if (state.starDwell >= STAR_DWELL_THRESHOLD) {
        state.starDwell = 0;
        goTo2D();
      }
    } else {
      state.starDwell = 0;
    }
  } else {
    state.starDwell = 0;
  }

  // Transition t
  if (state.mode === "transitioning") {
    const dir = state.target > state.t ? 1 : -1;
    state.t += dir * dt * 0.85; // ~1.2s transition
    if ((dir === 1 && state.t >= 1) || (dir === -1 && state.t <= 0)) {
      state.t = state.target;
      state.mode = state.target === 1 ? "2d" : "3d";
    }
  }

  const eased = easeInOut(state.t);
  lerpVec(CAM_3D, CAM_2D, eased, camera.position);
  camera.lookAt(LOOK_AT);

  // Fade orbit rings darker (more visible) in 2D mode
  orbits.forEach((ring) => {
    ring.material.opacity = 0.08 + 0.14 * eased;
  });
  halo.material.opacity = 0.18 * (1 - eased * 0.9);

  updateHover();
  resize(); // cheap — only reconfigures when canvas box actually changed

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
