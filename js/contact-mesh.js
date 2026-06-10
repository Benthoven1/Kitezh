// contact-mesh.js — living mesh network behind the contact card.
// The five cosmos spheres return as constellation nodes (same porcelain
// palette and lighting as the home page). The network listens to the card:
// focusing a field wakes that field's node, every keystroke sends a shimmer
// down its threads, completing a field births a new satellite into the
// constellation, and sealing the card sets the whole network alight.
import * as THREE from "three";

const canvas = document.getElementById("mesh-bg");
if (!canvas) throw new Error("contact-mesh: #mesh-bg not found");

const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Cosmos palette (mirrors js/main.js)
const PASTEL_STAR  = 0xf0d5bb;
const PASTEL_MUSIC = 0xc4ddb8;
const PASTEL_ART   = 0xe0b8c8;
const PASTEL_ARCH  = 0xb8cae0;
const PASTEL_HORT  = 0xb8ddd8;
const CREAM_DEEP   = 0xcdbe96;
const SAT_TINTS    = [0xe2d9c6, 0xd9d2c0, 0xe8dccB, 0xd5cdbd];

const scene = new THREE.Scene(); // transparent — the paper page shows through

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
const CAM_BASE = new THREE.Vector3(0, 0, 11);
camera.position.copy(CAM_BASE);

// Same sculptural lighting as the home cosmos
scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 10, 8);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

const group = new THREE.Group();
scene.add(group);

// ── Nodes ─────────────────────────────────────────────────────────────────────
const nodes = [];
const sphereGeo = new THREE.SphereGeometry(1, 40, 40);

function addNode(pos, size, color, isMain) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.38, metalness: 0,
    emissive: color, emissiveIntensity: 0,
  });
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.copy(pos);
  mesh.scale.setScalar(0.0001); // entrance animates this up
  group.add(mesh);
  const node = {
    mesh, size, isMain,
    base: pos.clone(),
    bobPhase: Math.random() * Math.PI * 2,
    bobSpeed: 0.4 + Math.random() * 0.4,
    scaleT: 0,            // entrance/spawn progress
    scaleDelay: 0,
    pulse: 0,             // transient flash (typing / celebration)
    glow: 0, glowTarget: 0, // field-focus glow
  };
  nodes.push(node);
  return node;
}

// The five spheres of the home cosmos
const star = addNode(new THREE.Vector3( 0.0,  0.35,  0.0), 0.58, PASTEL_STAR, true);
const nMusic = addNode(new THREE.Vector3(-3.6,  1.7, -1.0), 0.34, PASTEL_MUSIC, true);
const nArt   = addNode(new THREE.Vector3( 3.5,  2.0, -0.6), 0.34, PASTEL_ART,  true);
const nArch  = addNode(new THREE.Vector3(-3.1, -2.0,  0.6), 0.34, PASTEL_ARCH, true);
const nHort  = addNode(new THREE.Vector3( 3.3, -1.8, -1.2), 0.34, PASTEL_HORT, true);

// Founding satellites — a loose halo around the mains
const SATS = [
  [-1.9,  3.0, -2.0], [ 1.7,  3.2, -1.4], [ 5.1,  0.4, -2.2],
  [ 4.6, -3.4, -0.4], [ 1.3, -3.5,  0.8], [-1.6, -3.6, -1.6],
  [-5.2, -0.3, -1.0], [-4.8,  3.2, -2.6], [ 0.2,  1.9,  1.4],
  [ 5.6,  2.9, -3.0], [-2.6,  0.9,  1.8], [ 2.8,  0.4,  1.6],
];
SATS.forEach(([x, y, z], i) => {
  addNode(new THREE.Vector3(x, y, z), 0.10 + (i % 3) * 0.03, SAT_TINTS[i % SAT_TINTS.length], false);
});

// ── Edges — individual lines so each thread can shimmer on its own ───────────
const edges = [];
function addEdge(a, b, baseOpacity = 0.30) {
  const positions = new Float32Array(6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: CREAM_DEEP, transparent: true, opacity: 0,
  });
  const line = new THREE.Line(geo, mat);
  line.renderOrder = -1;
  group.add(line);
  const edge = { line, a, b, baseOpacity, flash: 0, draw: 0, drawDelay: 0 };
  edges.push(edge);
  return edge;
}

// Mains connect through the star and to their neighbours
addEdge(star, nMusic); addEdge(star, nArt); addEdge(star, nArch); addEdge(star, nHort);
addEdge(nMusic, nArt, 0.2); addEdge(nArch, nHort, 0.2);
addEdge(nMusic, nArch, 0.16); addEdge(nArt, nHort, 0.16);
// Satellites connect to their two nearest nodes
nodes.filter((n) => !n.isMain).forEach((sat) => {
  const sorted = nodes
    .filter((n) => n !== sat)
    .sort((p, q) => p.base.distanceTo(sat.base) - q.base.distanceTo(sat.base));
  addEdge(sat, sorted[0], 0.22);
  if (sorted[1].base.distanceTo(sat.base) < 4.4) addEdge(sat, sorted[1], 0.14);
});

// Entrance stagger
nodes.forEach((n, i) => { n.scaleDelay = 0.15 + i * 0.07; });
edges.forEach((e, i) => { e.drawDelay = 0.5 + i * 0.05; });

// ── Field ↔ node mapping and engagement ──────────────────────────────────────
const FIELD_NODE = {
  "ci-name":      nMusic,
  "ci-email":     nArt,
  "ci-interest":  nArch,
  "ci-message":   nHort,
  "ci-message-m": nHort,
};
let focusNode = null;
const completed = new Set();

function edgesOf(node) { return edges.filter((e) => e.a === node || e.b === node); }

function shimmer(node, strength = 1) {
  if (!motionOK) return;
  node.pulse = Math.min(1.2, node.pulse + 0.45 * strength);
  edgesOf(node).forEach((e) => { e.flash = Math.min(1, e.flash + 0.5 * strength); });
}

// A completed field births a new satellite, threaded to that field's sphere —
// the visitor literally grows the network as they write.
function spawnSatellite(near) {
  const dir = new THREE.Vector3(
    (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.4)
  ).normalize().multiplyScalar(1.5 + Math.random() * 1.1);
  const pos = near.base.clone().add(dir);
  const sat = addNode(pos, 0.11 + Math.random() * 0.05, SAT_TINTS[Math.floor(Math.random() * SAT_TINTS.length)], false);
  sat.scaleDelay = clock.getElapsedTime() + 0.35; // node pops after the thread arrives
  const e = addEdge(near, sat, 0.26);
  e.drawDelay = clock.getElapsedTime();
  shimmer(near, 1);
  return sat;
}

function wireField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const node = FIELD_NODE[id];
  el.addEventListener("focus", () => {
    focusNode = node;
    node.glowTarget = 1;
    shimmer(node, 0.6);
  });
  el.addEventListener("blur", () => {
    node.glowTarget = 0;
    if (focusNode === node) focusNode = null;
    const key = id.replace("-m", "");
    if (el.value.trim() && !completed.has(key)) {
      completed.add(key);
      spawnSatellite(node);
    }
  });
  el.addEventListener("input", () => shimmer(node, 0.35));
  el.addEventListener("change", () => shimmer(node, 0.6));
}
Object.keys(FIELD_NODE).forEach(wireField);

// Opening the card wakes the whole constellation
document.getElementById("card-cover")?.addEventListener("click", () => {
  nodes.filter((n) => n.isMain).forEach((n, i) => {
    setTimeout(() => shimmer(n, 0.8), i * 90);
  });
});

// Sealing the card — celebration cascade and a few new cross-threads
document.addEventListener("mulvium:card-sent", () => {
  const mains = nodes.filter((n) => n.isMain);
  mains.forEach((n, i) => setTimeout(() => shimmer(n, 1.4), i * 130));
  setTimeout(() => {
    spawnSatellite(star);
    spawnSatellite(mains[1 + Math.floor(Math.random() * 4)]);
    const e = addEdge(nMusic, nHort, 0.18);
    e.drawDelay = clock.getElapsedTime();
    const e2 = addEdge(nArt, nArch, 0.18);
    e2.drawDelay = clock.getElapsedTime() + 0.3;
  }, 600);
});

// ── Pointer parallax ──────────────────────────────────────────────────────────
const drift = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("pointermove", (e) => {
  drift.tx = (e.clientX / window.innerWidth) * 2 - 1;
  drift.ty = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

// ── Resize ────────────────────────────────────────────────────────────────────
let lastW = 0, lastH = 0;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w === lastW && h === lastH) return;
  lastW = w; lastH = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // Pull the camera back on narrow viewports so the constellation still frames the card
  CAM_BASE.z = w < 700 ? 15 : 11;
}
resize();
window.addEventListener("resize", resize);

// ── Animation loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
const lookTarget = new THREE.Vector3(0, 0, 0);
const lookCur = new THREE.Vector3(0, 0, 0);

function easeOutBack(t) {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  // Slow constellation rotation
  if (motionOK) group.rotation.y = Math.sin(t * 0.05) * 0.18;

  nodes.forEach((n) => {
    // Entrance / spawn pop
    if (t > n.scaleDelay && n.scaleT < 1) {
      n.scaleT = Math.min(1, n.scaleT + dt / 0.7);
    }
    const pop = motionOK ? easeOutBack(Math.max(0, n.scaleT)) : (n.scaleT > 0 ? 1 : 0);

    // Glow follows focus; pulse decays
    n.glow += (n.glowTarget - n.glow) * (1 - Math.pow(0.005, dt));
    n.pulse *= Math.exp(-dt * 3.2);

    const s = n.size * pop * (1 + n.glow * 0.22 + n.pulse * 0.12);
    n.mesh.scale.setScalar(Math.max(0.0001, s));
    n.mesh.material.emissiveIntensity = n.glow * 0.45 + n.pulse * 0.5;

    // Gentle float
    const bob = motionOK ? Math.sin(t * n.bobSpeed + n.bobPhase) * 0.10 : 0;
    n.mesh.position.set(n.base.x, n.base.y + bob, n.base.z);
  });

  edges.forEach((e) => {
    // Thread draw-in: endpoint travels from a to b
    if (t > e.drawDelay && e.draw < 1) {
      e.draw = motionOK ? Math.min(1, e.draw + dt / 0.6) : 1;
    }
    const pa = e.a.mesh.position;
    const pb = e.b.mesh.position;
    tmp.copy(pa).lerp(pb, Math.max(0.0001, e.draw));
    const arr = e.line.geometry.attributes.position.array;
    arr[0] = pa.x; arr[1] = pa.y; arr[2] = pa.z;
    arr[3] = tmp.x; arr[4] = tmp.y; arr[5] = tmp.z;
    e.line.geometry.attributes.position.needsUpdate = true;

    e.flash *= Math.exp(-dt * 3.5);
    e.line.material.opacity = e.draw * (e.baseOpacity + e.flash * 0.45);
  });

  // Camera: parallax plus a soft lean toward the focused node
  if (focusNode) {
    lookTarget.copy(focusNode.base).multiplyScalar(0.22);
  } else {
    lookTarget.set(0, 0, 0);
  }
  lookCur.lerp(lookTarget, 1 - Math.pow(0.01, dt));
  if (motionOK) {
    drift.x += (drift.tx - drift.x) * (1 - Math.pow(0.02, dt));
    drift.y += (drift.ty - drift.y) * (1 - Math.pow(0.02, dt));
  }
  camera.position.x += (CAM_BASE.x + drift.x * 0.45 - camera.position.x) * (1 - Math.pow(0.01, dt));
  camera.position.y += (CAM_BASE.y - drift.y * 0.3 - camera.position.y) * (1 - Math.pow(0.01, dt));
  camera.position.z += (CAM_BASE.z - camera.position.z) * (1 - Math.pow(0.01, dt));
  camera.lookAt(lookCur);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
