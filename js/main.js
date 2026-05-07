import * as THREE from "three";

// Pastel porcelain colors
const PASTEL_STAR    = 0xF0D5BB;
const PASTEL_IFO     = 0xC4DDB8;
const PASTEL_CASTLES = 0xB8CAE0;
const PASTEL_EDU     = 0xE0B8C8;
const PASTEL_ZONES   = 0xB8DDD8;
const CREAM_DEEP     = 0xcdbe96;
const PAPER          = 0xffffff;

const STAR_RADIUS = 1.25;

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
    radius: 3.0,  radius2D: 2.5,  ellipseX: 1,  ringTube: 0.045,
    planetSize: 0.42, planetColor: PASTEL_IFO,
    tilt: [0, 0, 0],
    speed: 0.36,  phase: 0.0,
  },
  {
    id: "castles",
    name: "Castles",
    comingSoon: true,
    radius: 3.8,  radius2D: 4.5,  ellipseX: 1,  ringTube: 0.045,
    planetSize: 0.42,  planetColor: PASTEL_CASTLES,
    tilt: [Math.PI / 2, 0, 0],
    speed: 0.26,  phase: 1.1,
  },
  {
    id: "education",
    name: "Education",
    comingSoon: true,
    radius: 4.5,  radius2D: 6.5,  ellipseX: 1,  ringTube: 0.045,
    planetSize: 0.42, planetColor: PASTEL_EDU,
    tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0],
    speed: 0.22,  phase: 2.4,
  },
  {
    id: "zones",
    name: "Economic Zones",
    comingSoon: true,
    radius: 5.0,  radius2D: 8.5,  ellipseX: 1,  ringTube: 0.045,
    planetSize: 0.42, planetColor: PASTEL_ZONES,
    tilt: [Math.PI / 3.2, Math.PI / 5, 0],
    speed: 0.18,  phase: 3.8,
  },
];

const canvas            = document.getElementById("cosmos");
const label             = document.getElementById("planet-label");
const navbar            = document.getElementById("navbar");
const brandLink         = document.getElementById("brand-link");
const body              = document.body;
const expansionWrapper  = document.getElementById("expansion-wrapper");
const missionSection    = document.getElementById("mission-section");
const missionChars      = Array.from(missionSection.querySelectorAll(".mc"));
const roseSectionEl     = document.getElementById("rose-section");

window.scrollTo(0, 0);
body.classList.add("cosmos-only");

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);

const PAPER_COLOR       = new THREE.Color(PAPER);
const PASTEL_STAR_COLOR = new THREE.Color(PASTEL_STAR);
const WHITE_COLOR       = new THREE.Color(0xffffff);
const BLACK_COLOR       = new THREE.Color(0x000000);

// Night sky — gradient CanvasTexture; updated each frame during expansion
const nightBgCvs       = document.createElement("canvas");
nightBgCvs.width       = 2;
nightBgCvs.height      = 512;
const nightBgCtx       = nightBgCvs.getContext("2d");
const nightBgTex       = new THREE.CanvasTexture(nightBgCvs);
nightBgTex.flipY       = false; // canvas y=0 → screen top
let lastBgT            = -1;

function updateBackground(t) {
  if (Math.abs(t - lastBgT) < 0.002) return;
  lastBgT = t;
  if (t <= 0) { scene.background = PAPER_COLOR; return; }
  const mix = (a, b) => Math.round(a + (b - a) * t);
  const g   = nightBgCtx.createLinearGradient(0, 0, 0, 512);
  // Stops: [y_fraction, [r_night, g_night, b_night]]
  for (const [pos, [rN, gN, bN]] of [
    [0.00, [ 6,  2, 24]],  // top: deep indigo-purple
    [0.22, [ 5,  3, 32]],  // upper: blue-violet
    [0.45, [10,  6, 42]],  // mid: midnight blue
    [0.68, [ 7,  4, 30]],  // lower: dark violet
    [1.00, [12,  8, 48]],  // bottom: rich deep blue
  ]) {
    g.addColorStop(pos, `rgb(${mix(255,rN)},${mix(255,gN)},${mix(255,bN)})`);
  }
  nightBgCtx.fillStyle = g;
  nightBgCtx.fillRect(0, 0, 2, 512);
  nightBgTex.needsUpdate = true;
  scene.background = nightBgTex;
}

// Star-field — scattered on the y≈0 plane, visible from the overhead 2D camera.
// Uses a ShaderMaterial for per-star size variation, subtle colour tint, and twinkle.
// Original positions are also the geometry's "position" attribute so Three.js frustum
// culling still works; aTargetPos holds flower-centre targets filled later.
const SKY_COUNT     = 1600;
const skyPosArr     = new Float32Array(SKY_COUNT * 3);
const skySizeArr    = new Float32Array(SKY_COUNT);
const skyTwinkleArr = new Float32Array(SKY_COUNT);
const skyColorArr   = new Float32Array(SKY_COUNT * 3);
const skyTargetArr  = new Float32Array(SKY_COUNT * 3);

for (let i = 0; i < SKY_COUNT; i++) {
  skyPosArr[i * 3]     = (Math.random() - 0.5) * 240;
  skyPosArr[i * 3 + 1] = Math.random() * 2;
  skyPosArr[i * 3 + 2] = (Math.random() - 0.5) * 240;

  // 55% small (1.5–2.5 px), 35% medium (2.5–4 px), 10% bright (4–5.5 px)
  const sr = Math.random();
  skySizeArr[i] = sr < 0.55 ? 1.5 + Math.random()
               : sr < 0.90 ? 2.5 + Math.random() * 1.5
               :              4.0 + Math.random() * 1.5;

  skyTwinkleArr[i] = Math.random() * Math.PI * 2;

  // Subtle warm, cool, or neutral white
  const ct = Math.random();
  if (ct < 0.15) {
    skyColorArr[i*3]=1.0; skyColorArr[i*3+1]=0.92+Math.random()*0.08; skyColorArr[i*3+2]=0.76+Math.random()*0.14;
  } else if (ct < 0.28) {
    skyColorArr[i*3]=0.80+Math.random()*0.15; skyColorArr[i*3+1]=0.88+Math.random()*0.12; skyColorArr[i*3+2]=1.0;
  } else {
    const v = 0.88 + Math.random() * 0.12;
    skyColorArr[i*3]=v; skyColorArr[i*3+1]=v; skyColorArr[i*3+2]=v;
  }
}

const skyStarGeo = new THREE.BufferGeometry();
skyStarGeo.setAttribute("position",   new THREE.BufferAttribute(skyPosArr,     3));
skyStarGeo.setAttribute("aSize",      new THREE.BufferAttribute(skySizeArr,    1));
skyStarGeo.setAttribute("aTwinkle",   new THREE.BufferAttribute(skyTwinkleArr, 1));
skyStarGeo.setAttribute("aColor",     new THREE.BufferAttribute(skyColorArr,   3));
const skyTargetBuf = new THREE.BufferAttribute(skyTargetArr, 3);
skyTargetBuf.setUsage(THREE.DynamicDrawUsage);
skyStarGeo.setAttribute("aTargetPos", skyTargetBuf);

const skyStarMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:    { value: 0.0 },
    uOpacity: { value: 0.0 },
    uDriftP:  { value: 0.0 },
  },
  vertexShader: `
    attribute float aSize;
    attribute float aTwinkle;
    attribute vec3  aColor;
    attribute vec3  aTargetPos;
    uniform float uTime;
    uniform float uOpacity;
    uniform float uDriftP;
    varying float vAlpha;
    varying vec3  vColor;
    void main() {
      vec3 pos = mix(position, aTargetPos, uDriftP);
      float twinkle = 0.72 + 0.28 * sin(uTime * 1.7 + aTwinkle);
      vAlpha = uOpacity * twinkle;
      vColor = aColor;
      gl_PointSize = aSize * (0.88 + 0.12 * sin(uTime * 1.1 + aTwinkle * 1.4));
      gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3  vColor;
    void main() {
      vec2  uv = gl_PointCoord - vec2(0.5);
      float r  = length(uv);
      float a  = (1.0 - smoothstep(0.25, 0.5, r)) * vAlpha;
      gl_FragColor = vec4(vColor, a);
    }
  `,
  transparent: true,
  depthTest:   false,
  depthWrite:  false,
});
const skyStars = new THREE.Points(skyStarGeo, skyStarMat);
scene.add(skyStars);

// Approximate flower-centre positions as [x_frac, y_frac] of the rose-bush image
const FLOWER_IMG_POS = [
  [0.06,0.54],[0.13,0.42],[0.19,0.53],[0.26,0.40],
  [0.31,0.50],[0.38,0.35],[0.42,0.44],[0.48,0.30],
  [0.51,0.43],[0.55,0.36],[0.59,0.47],[0.63,0.33],
  [0.67,0.44],[0.70,0.27],[0.73,0.39],[0.77,0.50],
  [0.82,0.39],[0.86,0.48],[0.90,0.42],[0.94,0.53],
];
let starTargetsComputed = false;
let starCenterTarget   = null;

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

// Central star — emissive support needed for the radiant white transition
const star = new THREE.Mesh(
  new THREE.SphereGeometry(STAR_RADIUS, 96, 96),
  new THREE.MeshStandardMaterial({
    color: PASTEL_STAR, roughness: 0.38, metalness: 0, flatShading: false,
    emissive: 0x000000, emissiveIntensity: 0,
  })
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

// ── Circle of Fifths ──────────────────────────────────────────────────────────────────────────────
// Keys in circle-of-fifths order; alt = enharmonic equivalent where commonly used
const COF_KEY_PAIRS = [
  { key: "C",   alt: null  },
  { key: "G",   alt: null  },
  { key: "D",   alt: null  },
  { key: "A",   alt: null  },
  { key: "E",   alt: null  },
  { key: "B",   alt: "C♭" },
  { key: "F♯",  alt: "G♭" },
  { key: "D♭",  alt: "C♯" },
  { key: "A♭",  alt: null  },
  { key: "E♭",  alt: null  },
  { key: "B♭",  alt: null  },
  { key: "F",   alt: null  },
];
const COF_ACC_PAIRS = [
  { main: null,  alt: null  },
  { main: "1♯", alt: null  },
  { main: "2♯", alt: null  },
  { main: "3♯", alt: null  },
  { main: "4♯", alt: null  },
  { main: "5♯", alt: "7♭" },
  { main: "6♯", alt: "6♭" },
  { main: "5♭", alt: "7♯" },
  { main: "4♭", alt: null  },
  { main: "3♭", alt: null  },
  { main: "2♭", alt: null  },
  { main: "1♭", alt: null  },
];

// IFO and Castles orbit rings scale/flatten into the CoF reference rings
const COF_RING_TARGETS = { ifo: 2.8, castles: 1.55 };

function makeCoFSprite(mainText, altText, { canvasSize = 256, fontSize = 108, color = "#5a3e1b" } = {}) {
  const c = document.createElement("canvas");
  c.width = canvasSize; c.height = canvasSize;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.textAlign = "center";
  ctx.fillStyle = color;

  if (altText) {
    // Main letter stays at full fontSize — same size whether or not there's an alt
    const fs2 = Math.round(fontSize * 0.44);
    ctx.font = `${fontSize}px "Cormorant Garamond", serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(mainText, canvasSize / 2, canvasSize * 0.47);
    ctx.font = `${fs2}px "Cormorant Garamond", serif`;
    ctx.globalAlpha = 0.6;
    ctx.fillText(altText, canvasSize / 2, canvasSize * 0.72);
    ctx.globalAlpha = 1;
  } else {
    ctx.font = `${fontSize}px "Cormorant Garamond", serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(mainText, canvasSize / 2, canvasSize / 2);
  }

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: true, opacity: 0 });
  return new THREE.Sprite(mat);
}

// Outer ring: key letter sprites
const cofKeySprites = COF_KEY_PAIRS.map(({ key, alt }) => {
  const s = makeCoFSprite(key, alt, { canvasSize: 256, fontSize: 108 });
  s.scale.set(0.75, 0.75, 0.75);
  scene.add(s);
  return s;
});

// Inner ring: accidental sprites — index-matched so same i = same orbit angle as key
const cofAccSprites = COF_ACC_PAIRS.map(({ main, alt }) => {
  if (!main) return null;
  const s = makeCoFSprite(main, alt, { canvasSize: 256, fontSize: 72, color: "#8a6030" });
  s.scale.set(0.52, 0.52, 0.52);
  scene.add(s);
  return s;
});

// Track the actual IFO orbit for hub reparenting
const ifoOrbit = orbits.find((o) => o.def.id === "ifo");
let cofPlanetInScene = false;
const cofHubStartPos = new THREE.Vector3();

let cofAngle = 0; // single angle drives all CoF elements at the same rate

// Camera — 2D is overhead; Y=24 gives visible radius ≈9.2 which frames max Z semi-axis (8.5)
const CAM_3D  = new THREE.Vector3(0, 2.6, 14.5);
const CAM_2D  = new THREE.Vector3(0, 24, 0.001);
const CAM_IFO = new THREE.Vector3(0, 1.8, 6.8);
const LOOK_AT = new THREE.Vector3(0, 0, 0);

camera.position.copy(CAM_3D);
camera.lookAt(LOOK_AT);

const state = {
  mode: "3d",
  t: 0,
  target: 0,
  ifoT: 0,
  ifoTarget: 0,
  hoverStar: false,
  hoverPlanet: null,
  labelPlanet: null,
  labelStar: false,
  clock: new THREE.Clock(),
  expansionP1: 0,
  expansionP2: 0,
  missionFired: false,
  starDriftP: 0,
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
  if (state.mode === "3d") {
    if (state.hoverPlanet) {
      if (state.hoverPlanet.def.id === "ifo") goToIFO();
    } else if (state.hoverStar) goTo2D();
  } else if ((state.mode === "ifo" || state.mode === "ifo-transitioning") && state.hoverPlanet) {
    returnFromIFO();
  }
});

const ifoModeEl = document.getElementById("ifo-mode");

function goToIFO() {
  if (state.mode !== "3d") return;
  label.classList.remove("visible");
  state.labelPlanet = null;
  state.labelStar = false;
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  navbar.classList.add("visible");
  navbar.setAttribute("aria-hidden", "false");
  body.classList.remove("cosmos-only");
  body.classList.add("mode-ifo");
  ifoModeEl.setAttribute("aria-hidden", "false");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  state.ifoTarget = 1;
  state.mode = "ifo-transitioning";
}

function returnFromIFO() {
  if (state.mode !== "ifo" && state.mode !== "ifo-transitioning") return;
  state.ifoTarget = 0;
  state.mode = "ifo-transitioning";
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  body.classList.add("cosmos-only");
  // Defer the display:none / reflow work to the next frame so the scroll and
  // cosmos-only paint settle first — prevents the main-thread stall on Safari.
  requestAnimationFrame(() => {
    body.classList.remove("mode-ifo");
    ifoModeEl.setAttribute("aria-hidden", "true");
  });
}

document.querySelectorAll("[data-ifo-link]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    if (state.mode === "ifo" || state.mode === "ifo-transitioning") return;
    if (state.mode === "2d") {
      goTo3D();
      setTimeout(() => goToIFO(), 1400);
    } else if (state.mode === "3d") {
      goToIFO();
    }
  });
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
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  body.classList.add("cosmos-only");
  body.classList.remove("mode-2d", "expansion-active", "night-mode");
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  state.expansionP1 = 0;
  state.expansionP2 = 0;
  state.missionFired = false;
  state.starDriftP   = 0;
  starCenterTarget   = null;
  missionChars.forEach((el) => { el.classList.remove("mc-in"); el.style.animationDelay = ""; });
  missionSection.setAttribute("aria-hidden", "true");
  roseSectionEl.style.opacity    = "0";
  roseSectionEl.setAttribute("aria-hidden", "true");
  lastBgT             = -1;
  scene.background    = PAPER_COLOR;
  starTargetsComputed = false;
}

brandLink.addEventListener("click", (e) => {
  e.preventDefault();
  if (state.mode === "ifo" || state.mode === "ifo-transitioning") returnFromIFO();
  else goTo3D();
});

document.querySelectorAll(".nav-item.has-dropdown").forEach((item) => {
  const trigger = item.querySelector(".nav-trigger");
  let leaveTimer = null;
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    clearTimeout(leaveTimer);
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
    if (!wasOpen) { item.classList.add("open"); trigger.setAttribute("aria-expanded", "true"); }
    else           { trigger.setAttribute("aria-expanded", "false"); }
  });
  item.addEventListener("mouseenter", () => {
    clearTimeout(leaveTimer);
    if (window.matchMedia("(hover: hover)").matches) {
      document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
      item.classList.add("open");
    }
  });
  item.addEventListener("mouseleave", () => {
    leaveTimer = setTimeout(() => item.classList.remove("open"), 150);
  });
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
  const inCoFMode = state.mode === "ifo" || state.mode === "ifo-transitioning";
  if (!pointerInside || (state.mode !== "3d" && !inCoFMode)) {
    state.hoverStar = false;
    state.hoverPlanet = null;
    canvas.style.cursor = "default";
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([star, ...orbits.map((o) => o.planet)], true);

  if (hits.length > 0) {
    const obj = hits[0].object;
    state.hoverStar   = obj.userData.type === "star" && !inCoFMode;
    const hitPlanet   = obj.userData.type === "planet" ? orbits.find((o) => o.planet === obj) : null;
    if (inCoFMode) {
      state.hoverPlanet = hitPlanet && hitPlanet.def.id === "ifo" ? hitPlanet : null;
    } else {
      state.hoverPlanet = hitPlanet && !hitPlanet.def.comingSoon ? hitPlanet : null;
    }
    canvas.style.cursor = (state.hoverPlanet || state.hoverStar) ? "pointer" : "default";

    if (inCoFMode) {
      if (state.hoverPlanet) {
        state.labelPlanet = state.hoverPlanet;
        state.labelStar   = false;
        state.hoverPlanet.planet.getWorldPosition(worldPos);
        const p = projectToCanvas(worldPos);
        label.textContent = state.hoverPlanet.def.name;
        label.style.left = p.x + "px";
        label.style.top  = p.y + "px";
        label.classList.add("visible");
      } else {
        label.classList.remove("visible");
      }
    } else if (hitPlanet) {
      state.labelPlanet = hitPlanet;
      state.labelStar   = false;
      hitPlanet.planet.getWorldPosition(worldPos);
      const p = projectToCanvas(worldPos);
      label.textContent = hitPlanet.def.comingSoon ? "Coming Soon" : hitPlanet.def.name;
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
  const inCoFMode = state.mode === "ifo" || state.mode === "ifo-transitioning";
  if (state.mode !== "3d" && !inCoFMode) return;
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
  const dt       = Math.min(state.clock.getDelta(), 0.05);
  const eased    = easeInOut(state.t);
  const easedIFO = easeInOut(Math.max(0, Math.min(1, state.ifoT)));
  const p1e      = easeInOut(state.expansionP1);

  // Constant circular orbiting (pause while in ifo)
  const orbitActive = state.ifoT < 0.01;
  orbits.forEach((o) => {
    if (orbitActive) o.angle += o.def.speed * dt;
    o.rotator.rotation.z = o.angle;
    o.planet.rotation.y += 0.08 * dt * (1 - easedIFO);
  });

  // 3D↔2D tilt/scale transition; IFO+Castles rings transform into CoF rings
  orbits.forEach((o) => {
    const [rx, ry, rz] = o.pivot.userData.baseTilt;
    const cofR = COF_RING_TARGETS[o.def.id];

    const expF         = 1 + easeInOut(state.expansionP1) * 10;
    const expansionFade = 1 - easeInOut(state.expansionP1);
    const isExpanding  = state.expansionP1 > 0;

    if (cofR !== undefined) {
      // This ring becomes a CoF ring: flatten to XZ, scale toward cofR
      const flatT  = Math.max(eased, easedIFO);
      const scaleT = lerp(lerp(1, o.def.radius2D / o.def.radius, eased), cofR / o.def.radius, easedIFO);
      o.pivot.rotation.x = lerp(rx, Math.PI / 2, flatT);
      o.pivot.rotation.y = lerp(ry, 0, flatT);
      o.pivot.rotation.z = lerp(rz, 0, flatT);
      o.pivot.scale.setScalar(scaleT * expF);
      // Only enter transparent pass during expansion — avoids depth-order
      // conflicts with the Circle of Fifths sprites in IFO mode.
      if (isExpanding) {
        o.ring.material.opacity     = expansionFade;
        o.ring.material.transparent = true;
      } else {
        o.ring.material.opacity     = 1;
        o.ring.material.transparent = false;
      }
    } else {
      // Standard 3D↔2D transition + fade during IFO + scale-out during expansion
      o.pivot.rotation.x = lerp(rx, Math.PI / 2, eased);
      o.pivot.rotation.y = lerp(ry, 0, eased);
      o.pivot.rotation.z = lerp(rz, 0, eased);
      const s  = lerp(1, o.def.radius2D / o.def.radius, eased);
      const ex = lerp(1, o.def.ellipseX,                eased);
      o.pivot.scale.set(s * ex * expF, s * expF, s * expF);
      o.ring.material.opacity     = lerp(1, 0, easedIFO) * expansionFade;
      o.ring.material.transparent = true;
    }

    // Orbiting planets fade during IFO and/or expansion
    if (o.def.id !== "ifo") {
      o.planet.material.opacity     = lerp(1, 0, easedIFO) * expansionFade;
      o.planet.material.transparent = true;
    } else if (!cofPlanetInScene) {
      // IFO planet: only go transparent during expansion to preserve opaque
      // depth ordering with CoF sprites in 3D / IFO modes.
      if (isExpanding) {
        o.planet.material.opacity     = expansionFade;
        o.planet.material.transparent = true;
      } else {
        o.planet.material.opacity     = 1;
        o.planet.material.transparent = false;
      }
    }
  });

  // Star fully disappears during ifo
  star.material.opacity     = lerp(1, 0, easedIFO);
  star.material.transparent  = true;

  // IFO planet: detach from orbit and fly to origin, no opacity change
  if (easedIFO > 0 && !cofPlanetInScene) {
    scene.attach(ifoOrbit.planet);            // preserves world transform
    cofHubStartPos.copy(ifoOrbit.planet.position);
    cofPlanetInScene = true;
  }
  if (cofPlanetInScene) {
    ifoOrbit.planet.position.lerpVectors(cofHubStartPos, LOOK_AT, easedIFO);
  }
  // Re-attach to orbit once fully returned to 3D
  if (cofPlanetInScene && state.ifoT <= 0 && state.mode === "3d") {
    scene.remove(ifoOrbit.planet);
    ifoOrbit.rotator.add(ifoOrbit.planet);
    ifoOrbit.planet.position.set(ifoOrbit.def.radius, 0, 0);
    ifoOrbit.planet.rotation.set(0, 0, 0);
    cofPlanetInScene = false;
  }

  // Star: shrinks as expansion progresses, then drifts to a flower centre once tiny
  const pulse      = 1 + Math.sin(performance.now() * 0.0011) * 0.01;
  const starShrink = lerp(1, 0.04, p1e);
  const starTarget = (state.hoverStar && state.mode === "3d" ? 1.1 : pulse) * starShrink;
  star.scale.lerp(tmpVec.set(starTarget, starTarget, starTarget), 1 - Math.pow(0.0005, dt));

  // Once star is fully tiny and drift has started, scatter it toward a flower
  if (p1e > 0.88 && state.starDriftP > 0 && starTargetsComputed) {
    if (!starCenterTarget) {
      const fi = Math.floor(Math.random() * FLOWER_IMG_POS.length);
      starCenterTarget = new THREE.Vector3(
        skyTargetArr[fi * 3], skyTargetArr[fi * 3 + 1], skyTargetArr[fi * 3 + 2]
      );
    }
    const driftT = easeInOut(Math.max(0, (state.starDriftP - 0.1) / 0.9));
    star.position.lerpVectors(new THREE.Vector3(0, 0, 0), starCenterTarget, driftT);
  } else {
    star.position.set(0, 0, 0);
  }

  // Color + emissive: pastel cream → pure white with radiant glow
  star.material.color.copy(PASTEL_STAR_COLOR).lerp(WHITE_COLOR, p1e);
  star.material.emissive.copy(BLACK_COLOR).lerp(WHITE_COLOR, p1e);
  star.material.emissiveIntensity = p1e * 2;
  star.material.roughness = lerp(0.38, 0, p1e);

  orbits.forEach((o) => {
    const target = state.hoverPlanet === o && state.mode === "3d" ? 1.18 : 1;
    o.planet.scale.lerp(tmpVec.set(target, target, target), 1 - Math.pow(0.001, dt));
  });

  // 3D↔2D transition
  if (state.mode === "transitioning") {
    const dir = state.target > state.t ? 1 : -1;
    state.t += dir * dt * 0.85;
    if ((dir === 1 && state.t >= 1) || (dir === -1 && state.t <= 0)) {
      state.t    = state.target;
      state.mode = state.target === 1 ? "2d" : "3d";
      if (state.mode === "2d") {
        body.classList.add("expansion-active");
      } else {
        navbar.classList.remove("visible");
        navbar.setAttribute("aria-hidden", "true");
      }
    }
  }

  // IFO entry/exit transition
  if (state.mode === "ifo-transitioning") {
    const dir = state.ifoTarget > state.ifoT ? 1 : -1;
    state.ifoT += dir * dt * 0.75;
    if (dir === 1 && state.ifoT >= 1) {
      state.ifoT = 1;
      state.mode = "ifo";
    } else if (dir === -1 && state.ifoT <= 0) {
      state.ifoT = 0;
      state.mode = "3d";
      navbar.classList.remove("visible");
      navbar.setAttribute("aria-hidden", "true");
    }
  }

  // ── Circle of Fifths animation ─────────────────────────────────────────────────────────────────────────────
  if (easedIFO > 0.001) {
    cofAngle += dt * 0.18;

    const R_KEY  = 3.6;  // orbit outside the outer ring (2.8)
    const R_ACC  = 2.2;  // orbit between/outside the rings
    const now    = performance.now() * 0.0004;

    cofKeySprites.forEach((s, i) => {
      const θ   = cofAngle + (i / 12) * Math.PI * 2;
      const yBob = Math.sin(now + i * 0.52) * 0.12;
      s.position.set(Math.sin(θ) * R_KEY, yBob, Math.cos(θ) * R_KEY);
      s.material.opacity = easedIFO;
    });

    // Accidentals share the exact same θ as their paired key (index i) at inner radius
    cofAccSprites.forEach((s, i) => {
      if (!s) return;
      const θ   = cofAngle + (i / 12) * Math.PI * 2;
      const yBob = Math.sin(now + i * 0.52 + 0.3) * 0.08;
      s.position.set(Math.sin(θ) * R_ACC, yBob, Math.cos(θ) * R_ACC);
      s.material.opacity = easedIFO * 0.85;
    });

  } else {
    cofKeySprites.forEach((s) => { s.material.opacity = 0; });
    cofAccSprites.forEach((s) => { if (s) s.material.opacity = 0; });
  }

  // Camera: blend 3D→2D then blend toward CAM_IFO
  const basePos = new THREE.Vector3();
  lerpVec(CAM_3D, CAM_2D, eased, basePos);
  lerpVec(basePos, CAM_IFO, easedIFO, camera.position);
  camera.lookAt(LOOK_AT);

  // Expansion: background gradient and star-field fade in from phase 1 start
  updateBackground(p1e);
  skyStarMat.uniforms.uTime.value    = performance.now() * 0.001;
  skyStarMat.uniforms.uOpacity.value = p1e;
  skyStarMat.uniforms.uDriftP.value  = easeInOut(state.starDriftP);

  updateHover();
  trackLabel();
  resize();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ---------- Expansion scroll sequence ----------
function updateExpansionScroll() {
  if (!body.classList.contains("expansion-active")) return;
  const totalScroll = expansionWrapper.offsetHeight - window.innerHeight;
  if (totalScroll <= 0) return;
  const rawP = Math.max(0, Math.min(1, window.scrollY / totalScroll));

  // Phase 1 (0–60 %): rings expand outward, star shrinks + goes radiant, night sky fades in
  state.expansionP1 = Math.min(1, rawP / 0.6);
  // Phase 2 (60–100 %): transition held, dark starfield maintained
  state.expansionP2 = Math.max(0, Math.min(1, (rawP - 0.6) / 0.4));

  if (state.expansionP1 > 0) {
    body.classList.add("night-mode");
  } else {
    body.classList.remove("night-mode");
  }
}

// ---------- Star drift toward rose flower centres ----------
// Pixel-samples the rose image to find exact flower locations, then
// back-projects them into Three.js world space so star targets align precisely.
function computeStarTargets() {
  const img = document.getElementById("rose-bush-img");
  if (!img || !img.complete || !img.naturalWidth) return;

  // ── 1. Draw image at reduced scale ───────────────────────────────────────
  const SW  = 180;
  const SH  = Math.round(SW * img.naturalHeight / img.naturalWidth);
  const oc  = document.createElement("canvas");
  oc.width = SW; oc.height = SH;
  const ctx = oc.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, SW, SH);
  const { data } = ctx.getImageData(0, 0, SW, SH);

  // ── 2. Rose-pixel heat map ────────────────────────────────────────────────
  const heat = new Float32Array(SW * SH);
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const i = (y * SW + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 64) continue;
      // Pink/red petals: r dominant, not grey/white
      if (r > 110 && r > g + 28 && r > b - 10 && !(r > 220 && g > 190 && b > 190)) {
        heat[y * SW + x] = (r - g) / 255;
      }
    }
  }

  // ── 3. Box-blur to merge petal pixels into blobs ─────────────────────────
  const blurred = new Float32Array(SW * SH);
  const R = 6;
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      let s = 0, c = 0;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < SW && ny >= 0 && ny < SH) { s += heat[ny * SW + nx]; c++; }
        }
      }
      blurred[y * SW + x] = s / c;
    }
  }

  // ── 4. Greedy local-max peak picking (one peak per flower) ───────────────
  const N         = 20;
  const suppR     = Math.max(9, Math.round(SW / 13));
  const centers   = [];
  const rem       = new Float32Array(blurred);

  for (let k = 0; k < N; k++) {
    let maxVal = 0, maxI = 0;
    for (let i = 0; i < rem.length; i++) if (rem[i] > maxVal) { maxVal = rem[i]; maxI = i; }
    if (maxVal < 0.003) break;
    const cx = maxI % SW, cy = Math.floor(maxI / SW);
    centers.push([cx / SW, cy / SH]);
    for (let dy = -suppR; dy <= suppR; dy++)
      for (let dx = -suppR; dx <= suppR; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < SW && ny >= 0 && ny < SH) rem[ny * SW + nx] = 0;
      }
  }
  // Fallback to hardcoded positions for any missing centres
  while (centers.length < N) centers.push(FLOWER_IMG_POS[centers.length % FLOWER_IMG_POS.length]);

  // ── 5. Back-project to Three.js world space via camera ray ───────────────
  const imgRect    = img.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const plane      = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const tmpRay     = new THREE.Raycaster();

  const worldFlowers = centers.map(([fx, fy]) => {
    const sx  = imgRect.left + fx * imgRect.width  - canvasRect.left;
    const sy  = imgRect.top  + fy * imgRect.height - canvasRect.top;
    tmpRay.setFromCamera(
      new THREE.Vector2((sx / canvasRect.width) * 2 - 1, -(sy / canvasRect.height) * 2 + 1),
      camera
    );
    const pt = new THREE.Vector3();
    tmpRay.ray.intersectPlane(plane, pt);
    return pt.lengthSq() > 0 ? pt : new THREE.Vector3();
  });

  // ── 6. Assign every star to a flower cluster ──────────────────────────────
  const NF = worldFlowers.length;
  for (let i = 0; i < SKY_COUNT; i++) {
    const fpt    = worldFlowers[i % NF];
    const spread = 0.20;
    skyTargetArr[i * 3]     = fpt.x + (Math.random() - 0.5) * spread;
    skyTargetArr[i * 3 + 1] = fpt.y;
    skyTargetArr[i * 3 + 2] = fpt.z + (Math.random() - 0.5) * spread;
  }
  skyTargetBuf.needsUpdate = true;
  starTargetsComputed = true;
}

// Bidirectional scroll driver: drift=0 when 2/3-mark of letter-body enters
// viewport, drift=1 when letter-close centre reaches mid-viewport.
// Rose opacity is derived directly so both directions are fully reversible.
function updateLetterScroll() {
  if (!body.classList.contains("night-mode")) return;
  const letterBody  = document.querySelector(".letter-body");
  const letterClose = document.getElementById("letter-close");
  if (!letterBody || !letterClose) return;

  const bodyRect  = letterBody.getBoundingClientRect();
  const closeRect = letterClose.getBoundingClientRect();
  const vh        = window.innerHeight;

  // startMark: viewport-y of the 2/3 point of the letter body
  const startMark = bodyRect.top  + bodyRect.height * (2 / 3);
  // endMark: viewport-y of the centre of letter-close footer
  const endMark   = closeRect.top + closeRect.height * 0.5;

  // docDist is constant regardless of scroll (relative distance in document)
  const docDist    = endMark - startMark;
  // scrolledPast: 0 when startMark == vh (drift trigger), grows as user scrolls down
  const scrolledPast = vh - startMark;
  const totalRange   = Math.max(1, vh * 0.5 + docDist);

  state.starDriftP = Math.max(0, Math.min(1, scrolledPast / totalRange));
  if (state.starDriftP > 0 && !starTargetsComputed) computeStarTargets();

  // Rose: fades in from driftP=0.45 to driftP=1 (fully opaque=0.82)
  const roseAlpha = Math.max(0, (state.starDriftP - 0.45) / 0.55) * 0.82;
  roseSectionEl.style.opacity = roseAlpha.toFixed(3);
  if (roseAlpha > 0) roseSectionEl.setAttribute("aria-hidden", "false");
}

// Mission section: animate characters in when it first scrolls into view.
const missionObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !state.missionFired) {
    state.missionFired = true;
    missionSection.setAttribute("aria-hidden", "false");
    missionChars.forEach((el, i) => {
      el.style.animationDelay = `${i * 0.033}s`;
      el.classList.add("mc-in");
    });
  }
}, { threshold: 0.1 });
missionObserver.observe(missionSection);

window.addEventListener("scroll", () => {
  if (body.classList.contains("expansion-active")) updateExpansionScroll();
  if (body.classList.contains("night-mode")) updateLetterScroll();
}, { passive: true });

window.addEventListener("resize", () => {
  if (body.classList.contains("expansion-active")) updateExpansionScroll();
  if (body.classList.contains("night-mode")) updateLetterScroll();
});

animate();

// If the page was reached via an IFO deep-link (e.g. from a sub-page navbar
// or footer), strip the hash and immediately enter IFO mode.
if (window.location.hash === '#ifo') {
  history.replaceState(null, '', window.location.pathname);
  goToIFO();
}

// When the page is restored from the browser back-forward cache the WebGL
// context may have been lost. Reload to reinitialise Three.js cleanly.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

// Discard accumulated clock time so the first frame after a tab-switch or
// page restore doesn't produce a massive dt spike.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) state.clock.getDelta();
});

