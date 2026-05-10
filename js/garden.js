// garden.js — Botanical scroll experience.
// A lush formal garden lives in the site footer, always visible once the user
// enters "Enter Mulvium" (expansion mode). While scrolling through the letter,
// stars bloom into SVG flowers that parallax across the night sky and fall into
// the garden when the letter ends.

const NS = "http://www.w3.org/2000/svg";

// ── Helpers ───────────────────────────────────────────────────────────────────
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Colour palettes ───────────────────────────────────────────────────────────
const PALETTES = [
  { petal: "#f4b3c8", accent: "#f8cdd8", center: "#fde68a" },
  { petal: "#fde68a", accent: "#fed7aa", center: "#f97316" },
  { petal: "#ddd6fe", accent: "#c4b5fd", center: "#a78bfa" },
  { petal: "#F0D5BB", accent: "#f0c9a0", center: "#b45e2a" },
  { petal: "#E0B8C8", accent: "#f0c0d0", center: "#e05080" },
  { petal: "#f8f4ee", accent: "#e8e4e0", center: "#fde68a" },
  { petal: "#C4DDB8", accent: "#a8cc98", center: "#3d8a3a" },
  { petal: "#B8CAE0", accent: "#98b8d8", center: "#4080c0" },
  { petal: "#fed7aa", accent: "#fbbf72", center: "#ea580c" },
  { petal: "#d4f0a0", accent: "#b8d880", center: "#5a9a1a" },
];

// Foliage: medium greens visible on both the warm-paper and dark-sky backgrounds
const GDK = "#3a6e30";   // far hedge
const GMD = "#4e8e3e";   // mid hedge / topiary
const GLT = "#6ab050";   // highlight / fern
const GBR = "#90d464";   // bright accent

// ── SVG helpers ───────────────────────────────────────────────────────────────

// Build a petal ring as an SVG <g> fragment string
function petalRing(n, orbitR, rx, ry, fill, opacity, rotOffset = 0) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const θ  = (i / n) * Math.PI * 2 + rotOffset;
    const cx = (Math.cos(θ) * orbitR).toFixed(2);
    const cy = (Math.sin(θ) * orbitR).toFixed(2);
    const rot = (θ * 180 / Math.PI + 90).toFixed(1);
    out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}"
      fill="${fill}" opacity="${opacity}"
      transform="rotate(${rot},${cx},${cy})"/>`;
  }
  return out;
}

// Build a complete flower SVG element (returns an HTMLElement with SVG namespace)
function buildFlower(type, pal, size) {
  const r   = size / 2;
  let inner = "";

  if (type === "daisy") {
    inner  = petalRing(14, r * 0.56, r * 0.16, r * 0.48, pal.petal, 0.88);
    inner += `<circle r="${(r * 0.24).toFixed(2)}" fill="${pal.center}"/>`;
    inner += `<circle r="${(r * 0.13).toFixed(2)}" fill="${pal.accent}" opacity="0.6"/>`;

  } else if (type === "rose") {
    inner  = petalRing(5, r * 0.44, r * 0.52, r * 0.80, pal.petal, 0.82);
    inner += petalRing(5, r * 0.24, r * 0.36, r * 0.58, pal.accent, 0.90, Math.PI / 5);
    inner += `<circle r="${(r * 0.22).toFixed(2)}" fill="${pal.center}" opacity="0.95"/>`;

  } else if (type === "peony") {
    inner  = petalRing(8,  r * 0.50, r * 0.30, r * 0.56, pal.petal,  0.78);
    inner += petalRing(10, r * 0.36, r * 0.24, r * 0.44, pal.accent, 0.86, Math.PI / 10);
    inner += petalRing(12, r * 0.22, r * 0.18, r * 0.32, pal.petal,  0.92, Math.PI / 6);
    inner += `<circle r="${(r * 0.16).toFixed(2)}" fill="${pal.center}"/>`;

  } else if (type === "aster") {
    inner  = petalRing(22, r * 0.56, r * 0.10, r * 0.54, pal.petal,  0.84);
    inner += petalRing(22, r * 0.56, r * 0.08, r * 0.50, pal.accent, 0.45, Math.PI / 22);
    inner += `<circle r="${(r * 0.20).toFixed(2)}" fill="${pal.center}"/>`;

  } else if (type === "tulip") {
    for (let i = 0; i < 3; i++) {
      const θ  = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const cx = (Math.cos(θ) * r * 0.28).toFixed(2);
      const cy = (Math.sin(θ) * r * 0.28).toFixed(2);
      const rot = (θ * 180 / Math.PI + 90).toFixed(1);
      const c = i === 1 ? pal.accent : pal.petal;
      inner += `<ellipse cx="${cx}" cy="${cy}" rx="${(r * 0.40).toFixed(2)}" ry="${(r * 0.70).toFixed(2)}"
        fill="${c}" opacity="0.86" transform="rotate(${rot},${cx},${cy})"/>`;
    }
    inner += `<circle r="${(r * 0.16).toFixed(2)}" fill="${pal.center}" opacity="0.7"/>`;

  } else { // wildflower
    inner  = petalRing(6, r * 0.50, r * 0.22, r * 0.60, pal.petal,  0.88);
    inner += petalRing(6, r * 0.50, r * 0.16, r * 0.52, pal.accent, 0.70, Math.PI / 6);
    inner += `<circle r="${(r * 0.26).toFixed(2)}" fill="${pal.center}"/>`;
    for (let i = 0; i < 5; i++) {
      const θ = (i / 5) * Math.PI * 2;
      inner += `<circle cx="${(Math.cos(θ) * r * 0.14).toFixed(2)}" cy="${(Math.sin(θ) * r * 0.14).toFixed(2)}"
        r="${(r * 0.05).toFixed(2)}" fill="${pal.petal}" opacity="0.8"/>`;
    }
  }

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width",   size);
  svg.setAttribute("height",  size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("overflow", "visible");
  svg.innerHTML = `<g transform="translate(${r},${r})">${inner}</g>`;
  return svg;
}

// ── Fern as SVG string ────────────────────────────────────────────────────────
function fernPaths(totalH) {
  const strokes = [];
  function branch(x1, y1, angle, len, depth) {
    if (depth < 0 || len < 3) return;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    const mx = (x1 + x2) / 2 + Math.cos(angle + Math.PI / 2) * len * 0.18;
    const my = (y1 + y2) / 2 + Math.sin(angle + Math.PI / 2) * len * 0.18;
    strokes.push(`M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`);
    branch(x2, y2, angle - 0.42, len * 0.62, depth - 1);
    branch(x2, y2, angle + 0.42, len * 0.62, depth - 1);
    branch(x2, y2, angle,        len * 0.80, depth - 1);
  }
  const w = totalH * 0.72;
  branch(w / 2, totalH * 0.96, -Math.PI / 2, totalH * 0.30, 4);
  return strokes.join(" ");
}

// ── Hedge blob as SVG string ──────────────────────────────────────────────────
function hedgeStr(x, y, w, h, fill) {
  let out = "";
  const n = Math.max(2, Math.ceil(w / (h * 0.55)));
  for (let i = 0; i <= n; i++) {
    const bx = x + (i / n) * w;
    const br = h * (0.44 + (i % 3 === 0 ? 0.08 : i % 2 === 0 ? -0.04 : 0.02));
    out += `<circle cx="${bx.toFixed(1)}" cy="${(y - br * 0.28).toFixed(1)}" r="${br.toFixed(1)}" fill="${fill}"/>`;
  }
  out += `<rect x="${x}" y="${(y - h * 0.12).toFixed(1)}" width="${w}" height="${(h * 0.3).toFixed(1)}" fill="${fill}" rx="2"/>`;
  return out;
}

// ── Garden SVG string builder ─────────────────────────────────────────────────
function buildGardenHTML(vw, H) {
  const W      = Math.max(vw, 1440);
  const ground = H * 0.70;
  let svg      = "";

  // Semi-transparent soil strip
  svg += `<rect x="0" y="${ground.toFixed(1)}" width="${W}" height="${(H - ground).toFixed(1)}" fill="rgba(20,50,10,0.22)"/>`;
  svg += `<rect x="0" y="${ground.toFixed(1)}" width="${W}" height="2" fill="rgba(100,180,60,0.40)"/>`;

  // Layer 1 — far hedge row
  svg += `<g opacity="0.62">`;
  svg += hedgeStr(0,        ground * 0.90, W * 0.55, H * 0.20, GDK);
  svg += hedgeStr(W * 0.38, ground * 0.88, W * 0.65, H * 0.22, GDK);
  svg += `</g>`;

  // Layer 2 — midground: topiary balls + clipped hedges + bush row
  svg += `<g opacity="0.90">`;

  // Topiary pillars
  for (const tx of [0.06, 0.18, 0.82, 0.94]) {
    const bx = W * tx, ballR = H * 0.11, stemH = H * 0.14;
    const stemY = (ground - ballR * 0.4 - stemH).toFixed(1);
    const ballCY = (ground - ballR * 1.1 - stemH).toFixed(1);
    svg += `<rect x="${(bx - 5).toFixed(1)}" y="${stemY}" width="10" height="${(stemH + ballR * 0.4).toFixed(1)}" fill="${GMD}" rx="5"/>`;
    svg += `<circle cx="${bx.toFixed(1)}" cy="${ballCY}" r="${ballR.toFixed(1)}" fill="${GMD}"/>`;
    svg += `<circle cx="${(bx - ballR * 0.28).toFixed(1)}" cy="${(parseFloat(ballCY) - ballR * 0.3).toFixed(1)}" r="${(ballR * 0.55).toFixed(1)}" fill="${GLT}" opacity="0.50"/>`;
  }

  // Clipped rectangular hedges
  for (const [xf, wf, hf] of [[0.12,0.09,0.24],[0.28,0.11,0.19],[0.44,0.12,0.16],[0.58,0.11,0.21],[0.74,0.09,0.26]]) {
    const rx = W * xf, rw = W * wf, rh = H * hf;
    svg += `<rect x="${rx.toFixed(1)}" y="${(ground - rh).toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${GMD}" rx="3"/>`;
    svg += `<rect x="${(rx + rw * 0.08).toFixed(1)}" y="${(ground - rh + 5).toFixed(1)}" width="${(rw * 0.84).toFixed(1)}" height="${(rh * 0.28).toFixed(1)}" fill="${GLT}" rx="2" opacity="0.42"/>`;
  }

  // Organic bush row
  svg += hedgeStr(W * 0.00, ground * 0.98, W * 0.20, H * 0.14, GMD);
  svg += hedgeStr(W * 0.33, ground * 0.96, W * 0.16, H * 0.12, GMD);
  svg += hedgeStr(W * 0.62, ground * 0.97, W * 0.18, H * 0.13, GMD);
  svg += hedgeStr(W * 0.84, ground * 0.98, W * 0.18, H * 0.15, GMD);
  svg += `</g>`;

  // Layer 3 — foreground: ferns, rose bushes, scattered wildflowers
  svg += `<g>`;

  // Ferns
  for (const [fxf, scale] of [[0.03,1],[0.22,0.9],[0.39,1.05],[0.55,0.95],[0.69,1],[0.86,0.92],[0.97,1.02]]) {
    const fh = H * 0.26 * scale;
    const fw = fh * 0.72;
    const fx = W * fxf - fw / 2;
    const fy = ground - fh * 0.88;
    svg += `<g transform="translate(${fx.toFixed(1)},${fy.toFixed(1)})">`;
    svg += `<path d="${fernPaths(fh)}" fill="none" stroke="${GLT}" stroke-width="1.4" stroke-linecap="round" opacity="0.88"/>`;
    svg += `</g>`;
  }

  // Rose bushes with flowers
  const roseBushes = [
    [0.10, 0], [0.32, 4], [0.51, 5], [0.68, 8], [0.88, 2],
  ];
  for (const [xf, pi] of roseBushes) {
    const bx = W * xf, bw = H * 0.20, bh = H * 0.16;
    svg += hedgeStr(bx - bw / 2, ground, bw, bh, GMD);
    const pal = PALETTES[pi % PALETTES.length];
    for (let j = 0; j < 4; j++) {
      const rsz = H * 0.082;
      const r   = rsz / 2;
      const rx2  = bx + (j - 1.5) * bw * 0.28;
      const ry2  = ground - bh * (0.55 + (j % 2) * 0.18);
      const rot  = (j * 37 - 20);
      // Inline a simple rose (5 petals) as SVG string
      svg += `<g transform="translate(${rx2.toFixed(1)},${ry2.toFixed(1)}) rotate(${rot})">`;
      svg += petalRing(5, r * 0.44, r * 0.52, r * 0.80, pal.petal, 0.84);
      svg += petalRing(5, r * 0.24, r * 0.36, r * 0.58, pal.accent, 0.92, Math.PI / 5);
      svg += `<circle r="${(r * 0.22).toFixed(2)}" fill="${pal.center}" opacity="0.95"/>`;
      svg += `</g>`;
    }
  }

  // Scattered ground-level wildflowers
  // Use a seeded layout so the random positions are stable across rebuilds
  const seedPositions = [
    0.04,0.09,0.15,0.20,0.26,0.35,0.42,0.48,0.53,0.57,
    0.63,0.67,0.72,0.76,0.80,0.85,0.90,0.93,0.96,0.99,
  ];
  for (let i = 0; i < seedPositions.length; i++) {
    const wx  = W * seedPositions[i];
    const wy  = ground - H * (0.015 + (i % 4) * 0.012);
    const wsz = H * (0.040 + (i % 3) * 0.008);
    const r   = wsz / 2;
    const pal = PALETTES[i % PALETTES.length];
    const rot = i * 23;
    const type = ["daisy","wildflower","aster"][i % 3];
    svg += `<g transform="translate(${wx.toFixed(1)},${wy.toFixed(1)}) rotate(${rot})" opacity="${(0.65 + (i % 4) * 0.07).toFixed(2)}">`;
    if (type === "daisy") {
      svg += petalRing(12, r * 0.56, r * 0.15, r * 0.48, pal.petal, 0.88);
      svg += `<circle r="${(r * 0.24).toFixed(2)}" fill="${pal.center}"/>`;
    } else if (type === "aster") {
      svg += petalRing(18, r * 0.56, r * 0.09, r * 0.52, pal.petal, 0.84);
      svg += `<circle r="${(r * 0.20).toFixed(2)}" fill="${pal.center}"/>`;
    } else {
      svg += petalRing(6, r * 0.50, r * 0.22, r * 0.60, pal.petal, 0.88);
      svg += `<circle r="${(r * 0.26).toFixed(2)}" fill="${pal.center}"/>`;
    }
    svg += `</g>`;
  }

  svg += `</g>`;
  return svg;
}

function buildGardenSVG(vw, H) {
  const W   = Math.max(vw, 1440);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width",               "100%");
  svg.setAttribute("height",              H);
  svg.setAttribute("viewBox",             `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMax slice");
  svg.setAttribute("aria-hidden",         "true");
  svg.style.display = "block";
  svg.innerHTML = buildGardenHTML(vw, H);
  return svg;
}

// ── ScrollFlower — one floating star→flower ───────────────────────────────────
class ScrollFlower {
  constructor({ xFrac, spawnVh, depth, type, size, pal }) {
    this.xFrac     = xFrac;
    this.spawnVh   = spawnVh;
    this.depth     = depth;
    this.size      = size;
    this.type      = type;
    this.pal       = pal;
    this.el        = null;
    this.spawned   = false;
    this.fallen    = false;
    this.baseY     = 0;
    this.rotation  = rnd(-28, 28);
    this.wobble    = rnd(0, Math.PI * 2);
    this.wobbleSpd = rnd(0.0007, 0.0017);
  }

  mount(container) {
    const wrap = document.createElement("div");
    wrap.className = "scroll-flower";
    wrap.style.cssText = [
      "position:absolute",
      `left:${(this.xFrac * 100).toFixed(1)}%`,
      "top:0",
      `width:${this.size}px`,
      `height:${this.size}px`,
      `margin-left:${-this.size / 2}px`,
      "pointer-events:none",
      "opacity:0",
      "will-change:transform,opacity",
      "transform-origin:center center",
    ].join(";");
    const svg = buildFlower(this.type, this.pal, this.size);
    svg.style.transform = `rotate(${this.rotation}deg)`;
    wrap.appendChild(svg);
    container.appendChild(wrap);
    this.el = wrap;
  }

  update(scrollY, now) {
    if (!this.el) return;
    const vh     = window.innerHeight;
    const spawnY = this.spawnVh * vh;

    if (!this.spawned && scrollY >= spawnY) {
      this.spawned = true;
      this.baseY   = vh * (0.10 + rnd(0, 0.18));
      this.el.style.top     = this.baseY + "px";
      this.el.style.opacity = "1";
      this.el.classList.add("scroll-flower--bloom");
    }

    if (!this.spawned || this.fallen) return;

    const past      = scrollY - spawnY;
    const parallaxY = past * (this.depth * 0.32 + 0.05);
    const wx        = Math.sin(now * this.wobbleSpd + this.wobble) * 5;
    const wy        = Math.cos(now * this.wobbleSpd * 0.7 + this.wobble) * 3;
    const wrot      = Math.sin(now * this.wobbleSpd * 0.5) * 4 + this.rotation;

    this.el.style.transform = `translate(${wx.toFixed(1)}px,${(-parallaxY + wy).toFixed(1)}px) rotate(${wrot.toFixed(1)}deg)`;
  }

  fall() {
    if (!this.spawned || this.fallen || !this.el) return;
    this.fallen = true;
    this.el.classList.add("scroll-flower--fall");
  }

  reset() {
    this.spawned = false;
    this.fallen  = false;
    if (!this.el) return;
    this.el.style.opacity   = "0";
    this.el.style.transform = "";
    this.el.classList.remove("scroll-flower--bloom", "scroll-flower--fall");
  }
}

// ── Flower configurations (stable across page loads) ─────────────────────────
const FLOWER_SEEDS = [
  [0.08, 0.40, 0.25, "rose"],
  [0.88, 0.55, 0.60, "daisy"],
  [0.18, 0.72, 0.45, "peony"],
  [0.75, 0.85, 0.30, "wildflower"],
  [0.35, 1.00, 0.70, "aster"],
  [0.62, 1.15, 0.50, "tulip"],
  [0.05, 1.30, 0.20, "daisy"],
  [0.92, 1.35, 0.65, "rose"],
  [0.47, 1.50, 0.40, "peony"],
  [0.23, 1.65, 0.55, "wildflower"],
  [0.80, 1.70, 0.35, "aster"],
  [0.55, 1.90, 0.75, "daisy"],
  [0.12, 2.05, 0.28, "tulip"],
  [0.70, 2.10, 0.60, "rose"],
  [0.40, 2.25, 0.45, "peony"],
  [0.85, 2.40, 0.32, "wildflower"],
  [0.30, 2.55, 0.65, "aster"],
  [0.60, 2.70, 0.50, "daisy"],
];

// ── Public init ───────────────────────────────────────────────────────────────
export function initGarden() {
  const body   = document.body;
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  // ── Garden scene in footer ─────────────────────────────────────────────────
  const gardenWrap = document.createElement("div");
  gardenWrap.id = "garden-scene";
  gardenWrap.setAttribute("aria-hidden", "true");
  footer.insertBefore(gardenWrap, footer.firstChild);

  function rebuildGarden() {
    const H = Math.round(window.innerHeight * 0.44);
    gardenWrap.style.height = H + "px";
    gardenWrap.innerHTML    = "";
    gardenWrap.appendChild(buildGardenSVG(window.innerWidth, H));
  }
  rebuildGarden();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuildGarden, 280);
  });

  // ── Floating flower overlay (active during expansion scroll) ───────────────
  const flowerLayer = document.createElement("div");
  flowerLayer.id = "flower-layer";
  body.appendChild(flowerLayer);

  const flowers = FLOWER_SEEDS.map(([xFrac, spawnVh, depth, type], i) => {
    const sf = new ScrollFlower({
      xFrac, spawnVh, depth, type,
      size: 44 + (i % 5) * 7,
      pal:  PALETTES[i % PALETTES.length],
    });
    sf.mount(flowerLayer);
    return sf;
  });

  // ── RAF + scroll update ─────────────────────────────────────────────────────
  let active   = false;
  let fallSent = false;

  function tick(now) {
    requestAnimationFrame(tick);
    if (!active) return;
    const scrollY    = window.scrollY;
    const letterClose = document.getElementById("letter-close");
    if (letterClose && !fallSent) {
      if (letterClose.getBoundingClientRect().bottom < window.innerHeight * 1.1) {
        fallSent = true;
        flowers.forEach((f) => f.fall());
      }
    }
    flowers.forEach((f) => f.update(scrollY, now));
  }
  requestAnimationFrame(tick);

  // Watch body class list for expansion-active
  new MutationObserver(() => {
    const nowActive = body.classList.contains("expansion-active");
    if (nowActive === active) return;
    active = nowActive;
    flowerLayer.classList.toggle("flower-layer--active", nowActive);
    if (!nowActive) {
      fallSent = false;
      flowers.forEach((f) => f.reset());
    }
  }).observe(body, { attributes: true, attributeFilter: ["class"] });
}
