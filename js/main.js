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
window.scrollTo(0, 0);
body.classList.add("cosmos-only");

const scene = new THREE.Scene();

const PAPER_COLOR       = new THREE.Color(PAPER);
const PASTEL_STAR_COLOR = new THREE.Color(PASTEL_STAR);
const WHITE_COLOR       = new THREE.Color(0xffffff);
const BLACK_COLOR       = new THREE.Color(0x000000);
const NIGHT_COLOR       = new THREE.Color(0x060412);

const bgColor    = new THREE.Color(PAPER);
scene.background = bgColor;

// Star-field — scattered on the y≈0 plane, visible from the overhead 2D camera.
// Uses a ShaderMaterial for per-star size variation, subtle colour tint, and twinkle.
// Original positions are also the geometry's "position" attribute so Three.js frustum
// culling still works; aTargetPos holds flower-centre targets filled later.
const SKY_COUNT     = 4500;
const skyPosArr     = new Float32Array(SKY_COUNT * 3);
const skySizeArr    = new Float32Array(SKY_COUNT);
const skyTwinkleArr = new Float32Array(SKY_COUNT);
const skyColorArr   = new Float32Array(SKY_COUNT * 3);
const skyTargetArr  = new Float32Array(SKY_COUNT * 3);

for (let i = 0; i < SKY_COUNT; i++) {
  // 60% in visible area (±16), 25% near-outer (±45), 15% far scattered (±110)
  const sr0 = Math.random();
  const spread = sr0 < 0.60 ? 16 : (sr0 < 0.85 ? 45 : 110);
  skyPosArr[i * 3]     = (Math.random() - 0.5) * spread * 2;
  skyPosArr[i * 3 + 1] = Math.random() * 2;
  skyPosArr[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;

  // 50% small (1.0–2.0 px), 35% medium (2.0–3.5 px), 15% bright (3.5–6 px)
  const sr = Math.random();
  skySizeArr[i] = sr < 0.50 ? 1.0 + Math.random()
               : sr < 0.85 ? 2.0 + Math.random() * 1.5
               :              3.5 + Math.random() * 2.5;

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

let starTargetsComputed = false;

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

// ── Loading screen ────────────────────────────────────────────────────────────
// Plays a nested-rectangle reveal sequence when navigating via top/footer nav.
// Four concentric frames animate up from the bottom: Musical → Pictorial →
// Polymath (images from the repo) → transparent knockout that shows the live
// Three.js canvas. The knockout expands to fill the viewport, seamlessly
// becoming the destination animation before the overlay fades away.
const loadingScreen = document.getElementById("loading-screen");
const lsF1 = document.getElementById("ls-f1");
const lsF2 = document.getElementById("ls-f2");
const lsF3 = document.getElementById("ls-f3");
const lsBorder = document.getElementById("ls-border");
const lsF1img = lsF1.querySelector(".ls-img");
const lsF2img = lsF2.querySelector(".ls-img");
const lsF3img = lsF3.querySelector(".ls-img");
let lsRaf    = null;
let lsActive = false;

// Sets a transparent canvas-window hole in the loading screen via a nonzero-
// winding clip-path: outer CW rectangle + inner CCW rectangle = hole.
// Works with hardware-accelerated WebGL canvases (unlike mix-blend-mode).
function lsSetHole(vw, vh, hW, hH, hCY) {
  if (hW < 2 || hH < 2) { loadingScreen.style.clipPath = ""; return; }
  const cx = vw / 2;
  const x1 = cx - hW / 2, y1 = hCY - hH / 2;
  const x2 = cx + hW / 2, y2 = hCY + hH / 2;
  // Outer CW: 0,0 → vw,0 → vw,vh → 0,vh → 0,0
  // Inner CCW: x1,y1 → x1,y2 → x2,y2 → x2,y1 → x1,y1  (opposite winding = hole)
  loadingScreen.style.clipPath =
    `polygon(0px 0px,${vw}px 0px,${vw}px ${vh}px,0px ${vh}px,0px 0px,` +
    `${x1}px ${y1}px,${x1}px ${y2}px,${x2}px ${y2}px,${x2}px ${y1}px,${x1}px ${y1}px)`;
}

function showLoadingScreen(onReady, duration, startOpaque) {
  if (lsActive) return;
  lsActive = true;
  const dur = duration || 4000;
  if (lsRaf) { cancelAnimationFrame(lsRaf); lsRaf = null; }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Thin concentric borders: each gap is 2 vw / 1.5 vh per side.
  // WIN is the live-canvas hole (innermost); F1 is the outermost image frame.
  // EFF scales phases 1–2 to 92 % of viewport so phase 3 can expand to 100 %.
  const WIN_W = vw * 0.68, WIN_H = vh * 0.62;   // canvas hole / final rectangle
  const F3_W  = vw * 0.72, F3_H  = vh * 0.65;   // Polymath
  const F2_W  = vw * 0.76, F2_H  = vh * 0.68;   // Pictorial
  const F1_W  = vw * 0.80, F1_H  = vh * 0.71;   // Musical (outermost)
  const EFF   = 0.92;
  const EWIN_W = WIN_W * EFF, EWIN_H = WIN_H * EFF;
  const EF3_W  = F3_W  * EFF, EF3_H  = F3_H  * EFF;
  const EF2_W  = F2_W  * EFF, EF2_H  = F2_H  * EFF;
  const EF1_W  = F1_W  * EFF, EF1_H  = F1_H  * EFF;

  [lsF1, lsF2, lsF3, lsBorder].forEach(f => {
    f.style.width = "0"; f.style.height = "0";
    f.style.transform = "translate(-50%, -50%)";
    f.style.visibility = ""; // restore from CSS (visible) — clear any cover-nav hide
  });
  [lsF1img, lsF2img, lsF3img].forEach(f => { f.style.transform = "scale(1.8)"; });
  loadingScreen.style.clipPath  = "";
  loadingScreen.style.opacity   = startOpaque ? "1" : "0";
  loadingScreen.style.display   = "block";
  loadingScreen.style.pointerEvents = "all";
  loadingScreen.setAttribute("aria-hidden", "false");
  // Remove the pre-paint cover class now that JS has taken ownership
  document.documentElement.classList.remove("ls-instant-cover");

  let readyCalled = false, t0 = null;

  // Cubic ease-in-out — smoother than quadratic
  function e(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
  function ph(t, a, b) { return e(Math.max(0, Math.min(1, (t - a) / (b - a)))); }

  function setF(el, w, h, cy_off) {
    el.style.width     = w + "px";
    el.style.height    = h + "px";
    el.style.transform = `translate(-50%, calc(-50% + ${cy_off}px))`;
  }

  // Border ring: 3 px wider on each side than the hole so it sits around the edge
  function setBorder(w, h, cy_off = 0) {
    lsBorder.style.width  = (w + 6) + "px";
    lsBorder.style.height = (h + 6) + "px";
    lsBorder.style.transform = `translate(-50%, calc(-50% + ${cy_off}px))`;
  }

  function lsCleanup() {
    [lsF1, lsF2, lsF3, lsBorder].forEach(f => {
      f.style.width = "0"; f.style.height = "0";
      f.style.transform = "translate(-50%, -50%)";
      f.style.visibility = "hidden";
    });
    [lsF1img, lsF2img, lsF3img].forEach(f => { f.style.transform = ""; });
    loadingScreen.style.opacity    = "0";
    loadingScreen.style.clipPath   = "";
    loadingScreen.style.display    = "none";
    loadingScreen.style.pointerEvents = "none";
    loadingScreen.setAttribute("aria-hidden", "true");
    lsActive = false;
  }

  function tick(ts) {
    try {
      if (!t0) t0 = ts;
      const t = Math.min(1, (ts - t0) / dur);

      // Fire mode transition: immediately when overlay is already opaque (cross-page
      // entrance), otherwise wait until overlay has faded in (t ≥ 0.10).
      if (!readyCalled && (startOpaque || t >= 0.10)) {
        readyCalled = true;
        try { if (onReady) onReady(); } catch (err) { console.error(err); }
      }

      // Fade in [0→0.10] for in-page transitions; already opaque for cross-page.
      // Hold at 1 through phases 1-3, then let lsCleanup snap to 0.
      loadingScreen.style.opacity = String(
        startOpaque ? 1 : ph(t, 0, 0.10)
      );

      // Group rises from below viewport [0.10→0.30]; holeCY tracks with it
      const holeCY = vh / 2 + vh * 0.5 * (1 - ph(t, 0.10, 0.30));
      const cy_off = holeCY - vh / 2;

      // Each image zooms independently from its own pop-in time toward 1.0x —
      // staggered start + staggered end gives a cascading sense of depth.
      lsF1img.style.transform = `scale(${1.8 - 0.8 * ph(t, 0.10, 0.70)})`;
      lsF2img.style.transform = `scale(${1.8 - 0.8 * ph(t, 0.20, 0.76)})`;
      lsF3img.style.transform = `scale(${1.8 - 0.8 * ph(t, 0.30, 0.82)})`;

      if (t < 0.62) {
        // ── Phase 1 – all four rectangles pop in at full size, staggered by 0.10 ──
        if (t >= 0.10) setF(lsF1, EF1_W, EF1_H, cy_off);
        if (t >= 0.20) setF(lsF2, EF2_W, EF2_H, cy_off);
        if (t >= 0.30) setF(lsF3, EF3_W, EF3_H, cy_off);
        if (t >= 0.40) {
          lsSetHole(vw, vh, EWIN_W, EWIN_H, holeCY);
          setBorder(EWIN_W, EWIN_H, cy_off);
        } else {
          loadingScreen.style.clipPath = "";
          lsBorder.style.width = "0"; lsBorder.style.height = "0";
        }

      } else if (t < 0.80) {
        // ── Phase 2 – image frames shrink to match the EFF-scaled rectangle ─────
        const cp = ph(t, 0.62, 0.80);
        setF(lsF1, EF1_W + (EWIN_W - EF1_W) * cp, EF1_H + (EWIN_H - EF1_H) * cp, 0);
        setF(lsF2, EF2_W + (EWIN_W - EF2_W) * cp, EF2_H + (EWIN_H - EF2_H) * cp, 0);
        setF(lsF3, EF3_W + (EWIN_W - EF3_W) * cp, EF3_H + (EWIN_H - EF3_H) * cp, 0);
        lsSetHole(vw, vh, EWIN_W, EWIN_H, vh / 2);
        setBorder(EWIN_W, EWIN_H);

      } else {
        // ── Phase 3 – subtle expansion (92 %→100 %) then hole fills viewport ────
        // t 0.80→0.85: all frames expand from EFF size to full WIN size
        const expand = ph(t, 0.80, 0.85);
        const curW = EWIN_W + (WIN_W - EWIN_W) * expand;
        const curH = EWIN_H + (WIN_H - EWIN_H) * expand;
        setF(lsF1, curW, curH, 0);
        setF(lsF2, curW, curH, 0);
        setF(lsF3, curW, curH, 0);
        // t 0.85→1.0: hole + border expand to fill viewport (curW=WIN_W by then)
        const ep = ph(t, 0.85, 1.0);
        const hw = curW + (vw - curW) * ep;
        const hh = curH + (vh - curH) * ep;
        lsSetHole(vw, vh, hw, hh, vh / 2);
        setBorder(hw, hh);
      }

      if (t < 1) {
        lsRaf = requestAnimationFrame(tick);
      } else {
        lsCleanup();
      }
    } catch (err) {
      console.error("Loading screen animation error:", err);
      lsCleanup();
    }
  }

  lsRaf = requestAnimationFrame(tick);
}

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
  requestAnimationFrame(() => {
    body.classList.remove("mode-ifo");
    ifoModeEl.setAttribute("aria-hidden", "true");
  });
}

document.querySelectorAll("[data-ifo-link]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    if (state.mode === "ifo") return;
    fadeInLoadingScreen(() => jumpToIFO());
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
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  state.mode = "transitioning";
  state.target = 0;
  body.classList.add("cosmos-only");
  body.classList.remove("mode-2d", "expansion-active", "night-mode");
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  state.expansionP1 = 0;
  state.expansionP2 = 0;
  state.missionFired = false;
  state.starDriftP   = 0;
  missionChars.forEach((el) => { el.classList.remove("mc-in"); el.style.animationDelay = ""; });
  missionSection.setAttribute("aria-hidden", "true");
  bgColor.copy(PAPER_COLOR);
  starTargetsComputed = false;
}

// Instantly snaps to full IFO state without playing the animated 3D→IFO
// camera fly. Used when entering IFO via the navbar/footer (loading screen
// covers the snap); the animated entry is reserved for the direct planet click.
function jumpToIFO() {
  state.t         = 1;
  state.target    = 1;
  state.ifoT      = 1;
  state.ifoTarget = 1;
  state.mode      = "ifo";

  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  navbar.classList.add("visible");
  navbar.setAttribute("aria-hidden", "false");
  body.classList.remove("cosmos-only", "mode-2d", "expansion-active", "night-mode");
  body.classList.add("mode-ifo");
  ifoModeEl.setAttribute("aria-hidden", "false");
  label.classList.remove("visible");
  state.labelPlanet = null;
  state.labelStar   = false;

  state.expansionP1  = 0;
  state.expansionP2  = 0;
  state.missionFired = false;
  state.starDriftP   = 0;
  missionChars.forEach((el) => { el.classList.remove("mc-in"); el.style.animationDelay = ""; });
  missionSection.setAttribute("aria-hidden", "true");
  bgColor.copy(PAPER_COLOR);
  starTargetsComputed = false;

  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

// Instantly snaps all state to the 3D opening view from any mode.
// Called under cover of the loading screen so the snap is never visible.
function snapTo3D() {
  // Reparent IFO planet back to its orbit if it was detached
  if (cofPlanetInScene) {
    scene.remove(ifoOrbit.planet);
    ifoOrbit.rotator.add(ifoOrbit.planet);
    ifoOrbit.planet.position.set(ifoOrbit.def.radius, 0, 0);
    ifoOrbit.planet.rotation.set(0, 0, 0);
    cofPlanetInScene = false;
  }
  ifoModeEl.setAttribute("aria-hidden", "true");
  body.classList.remove("mode-ifo");

  state.ifoT      = 0;
  state.ifoTarget = 0;
  state.t         = 0;
  state.target    = 0;
  state.mode      = "3d";

  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  body.classList.add("cosmos-only");
  body.classList.remove("mode-2d", "expansion-active", "night-mode");
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
  navbar.classList.remove("visible");
  navbar.setAttribute("aria-hidden", "true");
  label.classList.remove("visible");
  state.labelPlanet  = null;
  state.labelStar    = false;
  state.expansionP1  = 0;
  state.expansionP2  = 0;
  state.missionFired = false;
  state.starDriftP   = 0;
  missionChars.forEach((el) => { el.classList.remove("mc-in"); el.style.animationDelay = ""; });
  missionSection.setAttribute("aria-hidden", "true");
  bgColor.copy(PAPER_COLOR);
  starTargetsComputed = false;
}

// Fade the current page content out to white, then start the loading animation.
// This is the "fade-out before the loading screen" — the overlay fades IN
// (covering the page) which from the viewer's perspective is a fade-out of
// whatever was visible (IFO prose, 3D cosmos, etc.).
function fadeInLoadingScreen(onReady) {
  if (lsActive) return;
  lsActive = true;
  [lsF1, lsF2, lsF3, lsBorder].forEach(f => {
    f.style.width = "0"; f.style.height = "0"; f.style.visibility = "hidden";
  });
  loadingScreen.style.clipPath      = "";
  loadingScreen.style.transition    = "";
  loadingScreen.style.opacity       = "0";
  loadingScreen.style.display       = "block";
  loadingScreen.style.pointerEvents = "all";
  loadingScreen.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      loadingScreen.style.transition = "opacity 0.25s ease";
      loadingScreen.style.opacity    = "1";
      setTimeout(() => {
        loadingScreen.style.transition = "";
        lsActive = false;
        showLoadingScreen(onReady, 4000, true);
      }, 250);
    });
  });
}

brandLink.addEventListener("click", (e) => {
  e.preventDefault();
  if (state.mode === "3d") return; // already on the opening page
  fadeInLoadingScreen(() => snapTo3D());
});

// Fade to white before navigating to any sub-page from index.html.
// Uses the existing #loading-screen overlay so the WebGL canvas is covered
// cleanly (avoids GPU-compositing issues with body opacity on canvas elements).
function coverAndNavigate(href) {
  if (lsActive) { window.location.href = href; return; }
  // visibility:hidden suppresses rendering entirely — prevents image frames
  // from showing at residual sizes AND prevents #ls-border's CSS border from
  // collapsing to a visible 6 px square when width/height are zeroed.
  [lsF1, lsF2, lsF3, lsBorder].forEach(f => {
    f.style.width = "0"; f.style.height = "0"; f.style.visibility = "hidden";
  });
  loadingScreen.style.transition = ""; // clear any leftover transition
  loadingScreen.style.clipPath = "";
  loadingScreen.style.opacity = "0";
  loadingScreen.style.display = "block";
  loadingScreen.style.pointerEvents = "all";
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      loadingScreen.style.transition = "opacity 0.35s ease";
      loadingScreen.style.opacity = "1";
      setTimeout(function () {
        loadingScreen.style.transition = "";
        window.location.href = href;
      }, 350);
    });
  });
}

document.addEventListener("click", (ev) => {
  const link = ev.target.closest("a[href]");
  if (!link || link.target === "_blank") return;
  const href = link.getAttribute("href");
  if (!href) return;
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;       // external
    if (url.pathname === location.pathname) return;   // same page (IFO, brand handled elsewhere)
    ev.preventDefault();
    coverAndNavigate(href);
  } catch (e) {}
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

  // Center star stays at rose origin (0,0,0) — it becomes the heart of the rose
  star.position.set(0, 0, 0);

  // Color: pastel cream → plain white; keep emissive very faint so it blends with the field
  star.material.color.copy(PASTEL_STAR_COLOR).lerp(WHITE_COLOR, p1e);
  star.material.emissive.copy(BLACK_COLOR).lerp(WHITE_COLOR, p1e);
  star.material.emissiveIntensity = p1e * 0.2;
  star.material.roughness = lerp(0.38, 0.2, p1e);

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

  // Expansion: background fades from paper to #060412; star-field fades in
  bgColor.copy(PAPER_COLOR).lerp(NIGHT_COLOR, p1e);
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

// ---------- Star drift toward a continuous ring figure ----------
// Stars form a clean glowing ring (like a ring nebula) with a soft inner core.
// 72 % of stars are evenly distributed in angle around a circle of radius R_RING
// with a Gaussian radial spread — producing a solid, unbroken luminous band.
// The remaining 28 % fill a soft disc at the centre.
function computeRoseTargets() {
  const R_WORLD  = 7.4;
  const R_RING   = R_WORLD * 0.62;  // ring radius
  const R_SIG    = R_WORLD * 0.055; // radial σ — tighter = crisper ring edge

  const ringCount = Math.round(SKY_COUNT * 0.72);
  let idx = 0;

  for (let i = 0; i < ringCount; i++) {
    // Equidistant base angle + small jitter keeps the ring visually continuous
    const theta = (i / ringCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.20;
    // Gaussian radial offset via Box-Muller
    const u1 = Math.max(Math.random(), 1e-9);
    const g  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
    const r  = Math.max(0.4, R_RING + g * R_SIG);
    skyTargetArr[idx * 3]     = Math.cos(theta) * r;
    skyTargetArr[idx * 3 + 1] = (Math.random() - 0.5) * 0.24;
    skyTargetArr[idx * 3 + 2] = Math.sin(theta) * r;
    skySizeArr[idx] = 0.8 + Math.random() * 1.3;
    idx++;
  }

  // Soft inner glow: power-law distribution concentrates stars toward the centre
  while (idx < SKY_COUNT) {
    const angle  = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.5) * R_WORLD * 0.36;
    skyTargetArr[idx * 3]     = Math.cos(angle) * radius;
    skyTargetArr[idx * 3 + 1] = (Math.random() - 0.5) * 0.14;
    skyTargetArr[idx * 3 + 2] = Math.sin(angle) * radius;
    skySizeArr[idx] = 0.5 + Math.random() * 0.9;
    idx++;
  }

  skyTargetBuf.needsUpdate = true;
  skyStarGeo.attributes.aSize.needsUpdate = true;
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
  if (state.starDriftP > 0 && !starTargetsComputed) computeRoseTargets();
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

// When arriving from a sub-page (sessionStorage flag set by page-transition.js),
// play the full loading screen animation so the canvas is revealed through the
// same frame-sequence the user already saw start on the previous page.
// The canvas background is white on load, so the overlay fade-in (t 0→0.10)
// is invisible — both are #ffffff until the frames appear.
{
  const _entering = sessionStorage.getItem("ls-entering");
  const _ifoHash  = window.location.hash === "#ifo";
  if (_ifoHash) history.replaceState(null, "", window.location.pathname);

  if (_entering) {
    sessionStorage.removeItem("ls-entering");
    showLoadingScreen(() => { if (_ifoHash) jumpToIFO(); }, 4000, true);
  } else if (_ifoHash) {
    // Direct URL access with #ifo — no loading screen, just snap state
    jumpToIFO();
  }
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

