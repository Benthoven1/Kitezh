// contact-mesh.js — mesh network behind the contact card.
// An explicit graph: the five cosmos spheres are the principal vertices,
// held in the side margins where the card never covers them, surrounded by
// a shell of small vertices distributed by golden angle and banded away
// from the title and card. Every vertex connects to its k nearest
// neighbours, edge weight falls off with length, and signal pulses travel
// the edges. Focusing a form field energizes the graph: a ripple spreads
// outward through the edges and sparks stream from the field's vertex.
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
const VERTEX_TINT  = 0xded5c2;
const EDGE_COLOR   = 0xa8966a; // deeper cream — edges must read clearly on paper
const SPARK_COLOR  = 0x6e5d38;

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

// ── Vertices ──────────────────────────────────────────────────────────────────
const nodes = [];
const sphereGeo = new THREE.SphereGeometry(1, 32, 32);

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
    bobSpeed: 0.4 + Math.random() * 0.3,
    scaleT: 0,
    scaleDelay: 0,
    pulse: 0,               // transient flash (typing / ripple)
    glow: 0, glowTarget: 0, // field-focus glow
  };
  nodes.push(node);
  return node;
}

// Principal vertices — in the side margins so the card never covers them.
// (Repositioned vertically on narrow viewports — see layoutMains.)
const star   = addNode(new THREE.Vector3( 0.0, -3.7, -0.8), 0.46, PASTEL_STAR, true);
const nMusic = addNode(new THREE.Vector3(-5.9,  2.0, -0.4), 0.38, PASTEL_MUSIC, true);
const nArt   = addNode(new THREE.Vector3( 5.9,  2.0, -0.4), 0.38, PASTEL_ART,  true);
const nArch  = addNode(new THREE.Vector3(-5.9, -1.9,  0.4), 0.38, PASTEL_ARCH, true);
const nHort  = addNode(new THREE.Vector3( 5.9, -1.9,  0.4), 0.38, PASTEL_HORT, true);
const mains  = [star, nMusic, nArt, nArch, nHort];

function layoutMains(narrow) {
  if (narrow) {
    star.base.set(0.0, -5.4, -0.8);
    nMusic.base.set(-1.5,  4.7, -0.4);
    nArt.base.set( 1.5,  4.7, -0.4);
    nArch.base.set(-1.5, -4.6,  0.4);
    nHort.base.set( 1.5, -4.6,  0.4);
  } else {
    star.base.set( 0.0, -3.7, -0.8);
    nMusic.base.set(-5.9,  2.0, -0.4);
    nArt.base.set( 5.9,  2.0, -0.4);
    nArch.base.set(-5.9, -1.9,  0.4);
    nHort.base.set( 5.9, -1.9,  0.4);
  }
}

// Vertex shell — golden-angle distribution, stretched toward the side margins
// and banded out of the title zone (top centre) and the card zone (centre).
const SHELL_N = 48;
const GOLDEN  = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < SHELL_N; i++) {
  const yy = 1 - 2 * (i + 0.5) / SHELL_N;
  const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
  const th = GOLDEN * i;
  const radius = 3.4 + (i % 6) * 0.55;
  let x = Math.cos(th) * rr * radius * 1.5;
  let y = yy * radius * 0.66;
  let z = Math.sin(th) * rr * radius * 0.4;
  // Keep-out bands: the card (centre) and the page title (top centre)
  const inCard  = Math.abs(x) < 4.8 && y > -3.1 && y < 2.7;
  const inTitle = Math.abs(x) < 3.6 && y >= 2.7;
  if (inCard || inTitle) {
    const side = x === 0 ? (i % 2 ? 1 : -1) : Math.sign(x);
    x = side * (5.0 + Math.abs(x) * 0.35);
  }
  x = Math.max(-6.9, Math.min(6.9, x));
  addNode(new THREE.Vector3(x, y, z), 0.075 + (i % 4) * 0.012, VERTEX_TINT, false);
}

// ── Edges — k-nearest-neighbour graph, weight falls off with length ──────────
const edges = [];
const edgeKeys = new Set();
const adjacency = new Map(); // node -> Set of connected edges

function addEdge(a, b, baseOpacity) {
  const ia = nodes.indexOf(a), ib = nodes.indexOf(b);
  const key = ia < ib ? `${ia}-${ib}` : `${ib}-${ia}`;
  if (edgeKeys.has(key)) return null;
  edgeKeys.add(key);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const mat = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0 });
  const line = new THREE.Line(geo, mat);
  line.renderOrder = -1;
  group.add(line);
  const len = a.base.distanceTo(b.base);
  const edge = {
    line, a, b,
    baseOpacity: baseOpacity !== undefined
      ? baseOpacity
      : Math.max(0.28, Math.min(0.55, 0.62 - len * 0.04)),
    flash: 0, draw: 0, drawDelay: 0,
  };
  edges.push(edge);
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a).add(edge);
  adjacency.get(b).add(edge);
  return edge;
}

function connectKNearest(node, k) {
  nodes
    .filter((n) => n !== node)
    .sort((p, q) => p.base.distanceTo(node.base) - q.base.distanceTo(node.base))
    .slice(0, k)
    .forEach((n) => addEdge(node, n));
}

// The pillar spheres bind through the centre, then every vertex joins the graph
addEdge(star, nMusic, 0.5); addEdge(star, nArt, 0.5);
addEdge(star, nArch, 0.5);  addEdge(star, nHort, 0.5);
nodes.forEach((n) => connectKNearest(n, 3));

// Entrance stagger
nodes.forEach((n, i) => { n.scaleDelay = 0.12 + i * 0.04; });
edges.forEach((e, i) => { e.drawDelay = 0.4 + i * 0.024; });

// ── Ambient signal pulses — points travelling the edges at constant rate ─────
const PULSE_N = motionOK ? 8 : 0;
const pulses = [];
const pulseGeo = new THREE.SphereGeometry(0.038, 12, 12);
for (let i = 0; i < PULSE_N; i++) {
  const mesh = new THREE.Mesh(
    pulseGeo,
    new THREE.MeshBasicMaterial({ color: SPARK_COLOR, transparent: true, opacity: 0 })
  );
  group.add(mesh);
  pulses.push({ mesh, edge: null, t: Math.random(), speed: 0.3 + Math.random() * 0.25 });
}

function assignPulse(p) {
  const drawn = edges.filter((e) => e.draw >= 1);
  p.edge = drawn.length ? drawn[Math.floor(Math.random() * drawn.length)] : null;
  p.t = 0;
}

// ── Focus sparks — fast charges streaming outward from the active vertex ─────
const SPARK_N = motionOK ? 8 : 0;
const sparks = [];
for (let i = 0; i < SPARK_N; i++) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    new THREE.MeshBasicMaterial({ color: SPARK_COLOR, transparent: true, opacity: 0 })
  );
  mesh.visible = false;
  group.add(mesh);
  sparks.push({ mesh, edge: null, from: null, t: 1, speed: 1.5 });
}
let sparkTimer = 0;

function emitSpark(node) {
  const s = sparks.find((sp) => sp.t >= 1);
  if (!s) return;
  const incident = [...(adjacency.get(node) || [])].filter((e) => e.draw >= 1);
  if (!incident.length) return;
  s.edge = incident[Math.floor(Math.random() * incident.length)];
  s.from = node;
  s.t = 0;
  s.speed = 1.2 + Math.random() * 0.8;
  s.mesh.visible = true;
}

// ── Graph energizing — a ripple that spreads outward through the edges ───────
function flashEdges(node, strength) {
  (adjacency.get(node) || []).forEach((e) => {
    e.flash = Math.min(1, e.flash + strength);
  });
}

function energize(node, strength = 1) {
  if (!motionOK) return;
  node.pulse = Math.min(1.2, node.pulse + 0.45 * strength);
  flashEdges(node, 0.6 * strength);
  // Second ring: neighbours flash a beat later — the charge spreads
  setTimeout(() => {
    (adjacency.get(node) || []).forEach((e) => {
      const other = e.a === node ? e.b : e.a;
      other.pulse = Math.min(1, other.pulse + 0.2 * strength);
      flashEdges(other, 0.3 * strength);
    });
  }, 140);
}

// ── Field ↔ vertex binding ────────────────────────────────────────────────────
const FIELD_NODE = {
  "ci-name":     nMusic,
  "ci-email":    nArt,
  "ci-interest": nArch,
  "ci-message":  nHort,
};
let focusNode = null;
const completed = new Set();

// A completed field inserts a new vertex, threaded to that field's sphere and
// to its nearest existing neighbour — the graph grows as the form is filled.
function insertVertex(near) {
  const dir = new THREE.Vector3(
    (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5) * 0.4
  ).normalize().multiplyScalar(1.4 + Math.random() * 0.9);
  const pos = near.base.clone().add(dir);
  const v = addNode(pos, 0.09, VERTEX_TINT, false);
  v.scaleDelay = clock.getElapsedTime() + 0.3; // vertex pops after its edge arrives
  const e1 = addEdge(near, v, 0.5);
  if (e1) e1.drawDelay = clock.getElapsedTime();
  const nearest = nodes
    .filter((n) => n !== v && n !== near)
    .sort((p, q) => p.base.distanceTo(v.base) - q.base.distanceTo(v.base))[0];
  const e2 = addEdge(v, nearest);
  if (e2) e2.drawDelay = clock.getElapsedTime() + 0.35;
  energize(near, 1);
}

function wireField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const node = FIELD_NODE[id];
  el.addEventListener("focus", () => {
    focusNode = node;
    node.glowTarget = 1;
    energize(node, 0.8);
  });
  el.addEventListener("blur", () => {
    node.glowTarget = 0;
    if (focusNode === node) focusNode = null;
    if (el.value.trim() && !completed.has(id)) {
      completed.add(id);
      insertVertex(node);
    }
  });
  el.addEventListener("input", () => {
    if (!motionOK) return;
    node.pulse = Math.min(1.2, node.pulse + 0.25);
    flashEdges(node, 0.35);
    emitSpark(node);
  });
  el.addEventListener("change", () => energize(node, 0.6));
}
Object.keys(FIELD_NODE).forEach(wireField);

// Submission — sequential activation across the principal vertices plus two
// new cross-edges between the pillars
document.addEventListener("mulvium:card-sent", () => {
  mains.forEach((n, i) => setTimeout(() => energize(n, 1.4), i * 130));
  setTimeout(() => {
    insertVertex(star);
    const e = addEdge(nMusic, nHort, 0.4);
    if (e) e.drawDelay = clock.getElapsedTime();
    const e2 = addEdge(nArt, nArch, 0.4);
    if (e2) e2.drawDelay = clock.getElapsedTime() + 0.3;
  }, 600);
});

// Entrance complete — one wake pass through the principal vertices
if (motionOK) {
  setTimeout(() => {
    mains.forEach((n, i) => setTimeout(() => energize(n, 0.7), i * 90));
  }, 1800);
}

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
  // Narrow viewports: camera pulls back and the pillars stack above/below the card
  const narrow = w < 700;
  CAM_BASE.z = narrow ? 15 : 11;
  layoutMains(narrow);
}
resize();
window.addEventListener("resize", resize);

// ── Animation loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();

function easeOutBack(t) {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  // Slow oscillation of the whole graph
  if (motionOK) group.rotation.y = Math.sin(t * 0.05) * 0.10;

  // While a field is focused, charges stream from its vertex continuously
  if (focusNode && motionOK) {
    sparkTimer -= dt;
    if (sparkTimer <= 0) {
      emitSpark(focusNode);
      sparkTimer = 0.22 + Math.random() * 0.15;
    }
  }

  nodes.forEach((n) => {
    if (t > n.scaleDelay && n.scaleT < 1) {
      n.scaleT = Math.min(1, n.scaleT + dt / 0.7);
    }
    const pop = motionOK ? easeOutBack(Math.max(0, n.scaleT)) : (n.scaleT > 0 ? 1 : 0);

    n.glow += (n.glowTarget - n.glow) * (1 - Math.pow(0.005, dt));
    n.pulse *= Math.exp(-dt * 3.2);

    const s = n.size * pop * (1 + n.glow * 0.22 + n.pulse * 0.12);
    n.mesh.scale.setScalar(Math.max(0.0001, s));
    n.mesh.material.emissiveIntensity = n.glow * 0.45 + n.pulse * 0.5;

    // Tight float — the lattice stays precise
    const bob = motionOK ? Math.sin(t * n.bobSpeed + n.bobPhase) * 0.05 : 0;
    n.mesh.position.set(n.base.x, n.base.y + bob, n.base.z);
  });

  edges.forEach((e) => {
    // Edge draw-in: endpoint travels from a to b
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

    e.flash *= Math.exp(-dt * 3.0);
    e.line.material.opacity = e.draw * Math.min(1, e.baseOpacity + e.flash * 0.5);
  });

  // Ambient signal pulses ride the edges
  pulses.forEach((p) => {
    if (!p.edge || p.t >= 1) { assignPulse(p); if (!p.edge) { p.mesh.visible = false; return; } }
    p.t += dt * p.speed;
    const k = Math.min(1, p.t);
    p.mesh.visible = true;
    p.mesh.position.lerpVectors(p.edge.a.mesh.position, p.edge.b.mesh.position, k);
    p.mesh.material.opacity = Math.sin(Math.PI * k) * 0.6;
  });

  // Focus sparks — directional, outward from the active vertex
  sparks.forEach((s) => {
    if (s.t >= 1) { if (s.mesh.visible) s.mesh.visible = false; return; }
    s.t = Math.min(1, s.t + dt * s.speed);
    const a = s.from === s.edge.a ? s.edge.a : s.edge.b;
    const b = s.from === s.edge.a ? s.edge.b : s.edge.a;
    s.mesh.position.lerpVectors(a.mesh.position, b.mesh.position, s.t);
    s.mesh.material.opacity = Math.sin(Math.PI * s.t) * 0.85;
  });

  // Camera: pointer parallax only — the framing never shifts on focus
  if (motionOK) {
    drift.x += (drift.tx - drift.x) * (1 - Math.pow(0.02, dt));
    drift.y += (drift.ty - drift.y) * (1 - Math.pow(0.02, dt));
  }
  camera.position.x += (CAM_BASE.x + drift.x * 0.45 - camera.position.x) * (1 - Math.pow(0.01, dt));
  camera.position.y += (CAM_BASE.y - drift.y * 0.3 - camera.position.y) * (1 - Math.pow(0.01, dt));
  camera.position.z += (CAM_BASE.z - camera.position.z) * (1 - Math.pow(0.01, dt));
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
