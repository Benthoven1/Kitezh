// garden.js — Botanical scroll experience.
// Stars bloom into flowers as the user scrolls the night sky; they drift with
// parallax through the letter, then settle into a formal garden in the footer.

const NS = "http://www.w3.org/2000/svg";

// ── Helpers ───────────────────────────────────────────────────────────────────
function se(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs))
    if (v !== undefined && v !== null) e.setAttribute(k, String(v));
  return e;
}
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ── Colour palettes ───────────────────────────────────────────────────────────
const PALETTES = [
  { petal: "#f4b3c8", accent: "#f4b3c8", center: "#fde68a" },
  { petal: "#fde68a", accent: "#fed7aa", center: "#f97316" },
  { petal: "#ddd6fe", accent: "#c4b5fd", center: "#7c3aed" },
  { petal: "#F0D5BB", accent: "#f0c9a0", center: "#b45e2a" },
  { petal: "#E0B8C8", accent: "#f0c0d0", center: "#9f1239" },
  { petal: "#f0f0f0", accent: "#e8e4e0", center: "#fde68a" },
  { petal: "#C4DDB8", accent: "#a8cc98", center: "#3d7a3a" },
  { petal: "#B8CAE0", accent: "#98b8d8", center: "#2054a0" },
  { petal: "#fed7aa", accent: "#fbbf72", center: "#ea580c" },
  { petal: "#d9f99d", accent: "#bef264", center: "#4d7c0f" },
];

// Medium greens — visible on both the warm paper background and the night sky
const FG = { dk: "#3a6e30", md: "#4e8e3e", lt: "#6ab050", br: "#90d464" };

// ── SVG flower builders ───────────────────────────────────────────────────────

function petalEllipses(g, n, orbitR, rx, ry, fill, opacity, rotOffset = 0) {
  for (let i = 0; i < n; i++) {
    const θ = (i / n) * Math.PI * 2 + rotOffset;
    const cx = Math.cos(θ) * orbitR, cy = Math.sin(θ) * orbitR;
    const e = se("ellipse", { cx, cy, rx, ry, fill, opacity });
    e.setAttribute("transform", `rotate(${(θ * 180 / Math.PI + 90).toFixed(1)}, ${cx.toFixed(1)}, ${cy.toFixed(1)})`);
    g.appendChild(e);
  }
}

function buildFlower(type, pal, size) {
  const svg = se("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, overflow: "visible" });
  const r = size / 2;
  const g = se("g", { transform: `translate(${r},${r})` });
  svg.appendChild(g);

  if (type === "daisy") {
    petalEllipses(g, 14, r * 0.56, r * 0.16, r * 0.48, pal.petal, 0.88);
    g.appendChild(se("circle", { r: r * 0.24, fill: pal.center }));
    g.appendChild(se("circle", { r: r * 0.14, fill: pal.petal, opacity: 0.5 }));

  } else if (type === "rose") {
    // Outer 5 petals + inner 5
    petalEllipses(g, 5, r * 0.44, r * 0.52, r * 0.80, pal.petal, 0.82);
    petalEllipses(g, 5, r * 0.24, r * 0.36, r * 0.58, pal.accent, 0.90, Math.PI / 5);
    g.appendChild(se("circle", { r: r * 0.22, fill: pal.center, opacity: 0.95 }));

  } else if (type === "peony") {
    petalEllipses(g, 8,  r * 0.50, r * 0.30, r * 0.56, pal.petal,  0.78);
    petalEllipses(g, 10, r * 0.36, r * 0.24, r * 0.44, pal.accent, 0.86, Math.PI / 10);
    petalEllipses(g, 12, r * 0.22, r * 0.18, r * 0.32, pal.petal,  0.92, Math.PI / 6);
    g.appendChild(se("circle", { r: r * 0.16, fill: pal.center }));

  } else if (type === "aster") {
    petalEllipses(g, 22, r * 0.56, r * 0.10, r * 0.54, pal.petal, 0.84);
    petalEllipses(g, 22, r * 0.56, r * 0.08, r * 0.50, pal.accent, 0.50, Math.PI / 22);
    g.appendChild(se("circle", { r: r * 0.20, fill: pal.center }));

  } else if (type === "tulip") {
    const pts = 3;
    for (let i = 0; i < pts; i++) {
      const θ = (i / pts) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.cos(θ) * r * 0.28, cy = Math.sin(θ) * r * 0.28;
      const e = se("ellipse", { cx, cy, rx: r * 0.40, ry: r * 0.70, fill: i === 1 ? pal.accent : pal.petal, opacity: 0.86 });
      e.setAttribute("transform", `rotate(${(θ * 180 / Math.PI + 90).toFixed(1)}, ${cx.toFixed(1)}, ${cy.toFixed(1)})`);
      g.appendChild(e);
    }
    g.appendChild(se("circle", { r: r * 0.16, fill: pal.center, opacity: 0.7 }));

  } else if (type === "wildflower") {
    petalEllipses(g, 6, r * 0.50, r * 0.22, r * 0.60, pal.petal,  0.88);
    petalEllipses(g, 6, r * 0.50, r * 0.16, r * 0.52, pal.accent, 0.70, Math.PI / 6);
    g.appendChild(se("circle", { r: r * 0.26, fill: pal.center }));
    // Stamen dots
    for (let i = 0; i < 5; i++) {
      const θ = (i / 5) * Math.PI * 2;
      g.appendChild(se("circle", { cx: Math.cos(θ) * r * 0.14, cy: Math.sin(θ) * r * 0.14, r: r * 0.05, fill: pal.petal, opacity: 0.8 }));
    }
  }
  return svg;
}

// ── Fern SVG (standalone, sized for garden) ───────────────────────────────────
function buildFern(totalH, color) {
  const w = totalH * 0.72;
  const svg = se("svg", { width: w, height: totalH, viewBox: `0 0 ${w} ${totalH}`, overflow: "visible" });
  const strokes = [];

  function branch(x1, y1, angle, len, depth) {
    if (depth < 0 || len < 2.5) return;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    const mx = (x1 + x2) / 2 + Math.cos(angle + Math.PI / 2) * len * 0.18;
    const my = (y1 + y2) / 2 + Math.sin(angle + Math.PI / 2) * len * 0.18;
    strokes.push(`M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`);
    branch(x2, y2, angle - 0.42, len * 0.62, depth - 1);
    branch(x2, y2, angle + 0.42, len * 0.62, depth - 1);
    branch(x2, y2, angle, len * 0.80, depth - 1);
  }

  branch(w / 2, totalH * 0.96, -Math.PI / 2, totalH * 0.30, 4);
  const path = se("path", { d: strokes.join(" "), fill: "none", stroke: color, "stroke-width": 1.4, "stroke-linecap": "round", opacity: 0.88 });
  svg.appendChild(path);
  return svg;
}

// ── Hedge blob helper ─────────────────────────────────────────────────────────
function hedgeBlob(x, y, w, h, fill, svg) {
  const n = Math.ceil(w / (h * 0.55));
  const g = se("g");
  for (let i = 0; i <= n; i++) {
    const bx = x + (i / n) * w;
    const br = h * (0.44 + rnd(-0.06, 0.1));
    g.appendChild(se("circle", { cx: bx, cy: y - br * 0.28, r: br, fill }));
  }
  g.appendChild(se("rect", { x, y: y - h * 0.12, width: w, height: h * 0.3, fill, rx: 2 }));
  svg.appendChild(g);
}

// ── Garden footer SVG ─────────────────────────────────────────────────────────
function buildGardenSVG(vw, gardenH) {
  const W = Math.max(vw, 1440);
  const H = gardenH;
  const ground = H * 0.70;

  const svg = se("svg", {
    width: "100%", height: H,
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "xMidYMax slice",
    "aria-hidden": "true",
    style: "display:block",
  });

  // SVG is transparent — page background (paper or night sky) shows through.
  // A thin ground-line and soil strip anchor the plants on both light and dark.
  svg.appendChild(se("rect", { x: 0, y: ground, width: W, height: H - ground, fill: "rgba(30,60,20,0.18)" }));
  svg.appendChild(se("rect", { x: 0, y: ground, width: W, height: 2, fill: "rgba(100,180,60,0.35)" }));

  // ── Layer 1: Far background hedge row ───────────────────────────────────────
  const farG = se("g", { opacity: 0.65 });
  hedgeBlob(0,        ground * 0.90, W * 0.55, H * 0.20, FG.dk, farG);
  hedgeBlob(W * 0.38, ground * 0.88, W * 0.65, H * 0.22, FG.dk, farG);
  svg.appendChild(farG);

  // ── Layer 2: Midground formal elements ─────────────────────────────────────
  const midG = se("g", { opacity: 0.88 });

  // Symmetrical topiary balls on stems (formal garden pillars)
  const topiaryXs = [0.06, 0.18, 0.82, 0.94];
  for (const tx of topiaryXs) {
    const bx = W * tx, ballR = H * 0.11, stemH = H * 0.14;
    midG.appendChild(se("rect", { x: bx - 5, y: ground - ballR - stemH, width: 10, height: stemH + ballR * 0.4, fill: FG.md, rx: 5 }));
    midG.appendChild(se("circle", { cx: bx, cy: ground - ballR * 1.1 - stemH, r: ballR, fill: FG.md }));
    midG.appendChild(se("circle", { cx: bx - ballR * 0.28, cy: ground - ballR * 1.4 - stemH, r: ballR * 0.55, fill: FG.lt, opacity: 0.45 }));
  }

  // Formal clipped rectangular hedges (boxwood)
  const rects = [
    { xf: 0.12, wf: 0.09, hf: 0.24 },
    { xf: 0.28, wf: 0.11, hf: 0.19 },
    { xf: 0.44, wf: 0.12, hf: 0.16 },
    { xf: 0.58, wf: 0.11, hf: 0.21 },
    { xf: 0.74, wf: 0.09, hf: 0.26 },
  ];
  for (const rh of rects) {
    const rx = W * rh.xf, rw = W * rh.wf, rheight = H * rh.hf;
    midG.appendChild(se("rect", { x: rx, y: ground - rheight, width: rw, height: rheight, fill: FG.md, rx: 3 }));
    // Highlight strip
    midG.appendChild(se("rect", { x: rx + rw * 0.08, y: ground - rheight + 4, width: rw * 0.84, height: rheight * 0.28, fill: FG.lt, rx: 2, opacity: 0.38 }));
  }

  // Organic mid-ground bush row
  hedgeBlob(W * 0.0,  ground * 0.98, W * 0.20, H * 0.14, FG.md, midG);
  hedgeBlob(W * 0.33, ground * 0.96, W * 0.16, H * 0.12, FG.md, midG);
  hedgeBlob(W * 0.62, ground * 0.97, W * 0.18, H * 0.13, FG.md, midG);
  hedgeBlob(W * 0.84, ground * 0.98, W * 0.18, H * 0.15, FG.md, midG);

  svg.appendChild(midG);

  // ── Layer 3: Foreground plants and flowers ──────────────────────────────────
  const fgG = se("g");

  // Ferns
  const fernXs = [0.03, 0.22, 0.39, 0.55, 0.69, 0.86, 0.97];
  for (const fx of fernXs) {
    const fh = H * (0.22 + rnd(-0.04, 0.06));
    const fsvg = buildFern(fh, FG.lt);
    const fw = fh * 0.72;
    const fg = se("g", { transform: `translate(${W * fx - fw / 2}, ${ground - fh * 0.88})` });
    // Inline fern path
    const fpath = fsvg.querySelector("path");
    if (fpath) {
      const fp2 = se("path", {});
      for (const attr of fpath.attributes) fp2.setAttribute(attr.name, attr.value);
      fg.appendChild(fp2);
    }
    fgG.appendChild(fg);
  }

  // Rose bushes with actual flowers
  const roseBushes = [
    { xf: 0.10, pal: PALETTES[4], roses: 4 },
    { xf: 0.32, pal: PALETTES[0], roses: 3 },
    { xf: 0.51, pal: PALETTES[5], roses: 5 },
    { xf: 0.68, pal: PALETTES[8], roses: 3 },
    { xf: 0.88, pal: PALETTES[2], roses: 4 },
  ];

  for (const rb of roseBushes) {
    const bx = W * rb.xf;
    const bw = H * 0.20, bh = H * 0.16;
    // Bush foliage base
    hedgeBlob(bx - bw / 2, ground, bw, bh, FG.md, fgG);

    // Roses scattered on the bush
    for (let j = 0; j < rb.roses; j++) {
      const rflx = bx + (j - rb.roses / 2 + 0.5) * (bw / (rb.roses + 0.5));
      const rfly = ground - bh * (0.65 + rnd(-0.1, 0.25));
      const rsz = H * (0.07 + rnd(-0.01, 0.02));
      const rsvg = buildFlower("rose", rb.pal, rsz);

      const rg = se("g", { transform: `translate(${rflx - rsz / 2}, ${rfly - rsz / 2})` });
      // Inline rose petals
      const rsvgG = rsvg.querySelector("g");
      if (rsvgG) {
        const rg2 = se("g", { transform: rsvgG.getAttribute("transform") || "" });
        for (const child of rsvgG.children) {
          const clone = se(child.tagName, {});
          for (const attr of child.attributes) clone.setAttribute(attr.name, attr.value);
          rg2.appendChild(clone);
        }
        rg.appendChild(rg2);
      }
      fgG.appendChild(rg);
    }
  }

  // Scattered small wildflowers at ground level
  const wildCount = 22;
  for (let i = 0; i < wildCount; i++) {
    const wx = rnd(W * 0.01, W * 0.99);
    const wy = ground - H * rnd(0.01, 0.06);
    const wsz = H * rnd(0.035, 0.055);
    const wpal = pick(PALETTES);
    const wsvg = buildFlower(pick(["daisy", "wildflower", "aster"]), wpal, wsz);
    const wg = se("g", { transform: `translate(${wx - wsz / 2}, ${wy - wsz / 2})`, opacity: rnd(0.6, 0.9) });
    const wsvgG = wsvg.querySelector("g");
    if (wsvgG) {
      const wg2 = se("g", { transform: wsvgG.getAttribute("transform") || "" });
      for (const child of wsvgG.children) {
        const clone = se(child.tagName, {});
        for (const attr of child.attributes) clone.setAttribute(attr.name, attr.value);
        wg2.appendChild(clone);
      }
      wg.appendChild(wg2);
    }
    fgG.appendChild(wg);
  }

  svg.appendChild(fgG);
  return svg;
}

// ── ScrollFlower — one star that blooms and parallaxes ───────────────────────
const FLOWER_TYPES = ["daisy", "rose", "peony", "aster", "tulip", "wildflower"];

class ScrollFlower {
  constructor({ xFrac, spawnVh, depth, type, size, pal }) {
    this.xFrac     = xFrac;
    this.spawnVh   = spawnVh;   // scroll position in vh to appear
    this.depth     = depth;     // 0 = far/slow, 1 = near/fast
    this.size      = size;
    this.type      = type;
    this.pal       = pal;
    this.el        = null;
    this.spawned   = false;
    this.fallen    = false;
    this.baseY     = null;      // viewport Y when spawned
    this.rotation  = rnd(-25, 25);
    this.wobble    = rnd(0, Math.PI * 2);
    this.wobbleSpd = rnd(0.0008, 0.0018);
  }

  mount(container) {
    const wrapper = document.createElement("div");
    wrapper.className = "scroll-flower";
    wrapper.style.cssText = `
      position: absolute;
      left: ${(this.xFrac * 100).toFixed(1)}%;
      top: 0;
      width: ${this.size}px;
      height: ${this.size}px;
      margin-left: ${-this.size / 2}px;
      pointer-events: none;
      opacity: 0;
      will-change: transform, opacity;
      transform-origin: center center;
    `;
    const svg = buildFlower(this.type, this.pal, this.size);
    svg.style.transform = `rotate(${this.rotation}deg)`;
    wrapper.appendChild(svg);
    container.appendChild(wrapper);
    this.el = wrapper;
  }

  update(scrollY, now) {
    if (!this.el) return;
    const vh = window.innerHeight;
    const spawnY = this.spawnVh * vh;

    if (!this.spawned && scrollY >= spawnY) {
      this.spawned = true;
      this.baseY   = vh * (0.12 + rnd(-0.05, 0.15));
      this.el.style.top = this.baseY + "px";
      this.el.classList.add("scroll-flower--bloom");
      this.el.style.opacity = "1";
    }

    if (!this.spawned || this.fallen) return;

    // Parallax: shift y relative to scroll past spawnY
    const scrolledPast = scrollY - spawnY;
    const parallaxY    = scrolledPast * (this.depth * 0.35 + 0.05);

    // Gentle wobble
    const wobbleX = Math.sin(now * this.wobbleSpd + this.wobble) * 6;
    const wobbleY = Math.cos(now * this.wobbleSpd * 0.7 + this.wobble + 1) * 4;
    const wRot    = Math.sin(now * this.wobbleSpd * 0.5) * 4 + this.rotation;

    this.el.style.transform = `translate(${wobbleX.toFixed(1)}px, ${(-parallaxY + wobbleY).toFixed(1)}px) rotate(${wRot.toFixed(1)}deg)`;
  }

  fall() {
    if (!this.spawned || this.fallen || !this.el) return;
    this.fallen = true;
    this.el.classList.add("scroll-flower--fall");
  }
}

// ── Flower spawn configurations ───────────────────────────────────────────────
function makeConfigs() {
  const raw = [
    // xFrac, spawnVh, depth, type
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

  return raw.map(([xFrac, spawnVh, depth, type]) => ({
    xFrac,
    spawnVh,
    depth,
    type,
    size: Math.round(rnd(44, 72)),
    pal: pick(PALETTES),
  }));
}

// ── Public init ───────────────────────────────────────────────────────────────
export function initGarden() {
  const body   = document.body;
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  // ── Flower layer (fixed overlay, only active during expansion) ─────────────
  const flowerLayer = document.createElement("div");
  flowerLayer.id = "flower-layer";
  document.body.appendChild(flowerLayer);

  const configs = makeConfigs();
  const flowers = configs.map((cfg) => {
    const sf = new ScrollFlower(cfg);
    sf.mount(flowerLayer);
    return sf;
  });

  // ── Garden SVG in footer ───────────────────────────────────────────────────
  const gardenWrap = document.createElement("div");
  gardenWrap.id = "garden-scene";
  gardenWrap.setAttribute("aria-hidden", "true");
  footer.insertBefore(gardenWrap, footer.firstChild);

  function rebuildGarden() {
    gardenWrap.innerHTML = "";
    const gardenH = Math.round(window.innerHeight * 0.46);
    gardenWrap.style.height = gardenH + "px";
    gardenWrap.appendChild(buildGardenSVG(window.innerWidth, gardenH));
  }
  rebuildGarden();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuildGarden, 300);
  });

  // ── Scroll + RAF update ────────────────────────────────────────────────────
  let active   = false;
  let fallSent = false;
  let rafId    = null;

  function tick(now) {
    rafId = requestAnimationFrame(tick);
    if (!active) return;

    const scrollY = window.scrollY;

    // Determine when to trigger "fall" — bottom of letter section
    const letter = document.getElementById("letter-close");
    if (letter && !fallSent) {
      const letterBottom = letter.getBoundingClientRect().bottom;
      if (letterBottom < window.innerHeight * 1.2) {
        fallSent = true;
        flowers.forEach((f) => f.fall());
      }
    }

    flowers.forEach((f) => f.update(scrollY, now));
  }
  rafId = requestAnimationFrame(tick);

  // Watch body classes to know when expansion is active
  const mo = new MutationObserver(() => {
    const isActive = body.classList.contains("expansion-active");
    if (isActive !== active) {
      active = isActive;
      flowerLayer.classList.toggle("flower-layer--active", isActive);
      if (!isActive) {
        // Reset for next time
        fallSent = false;
        flowers.forEach((f) => {
          f.spawned = false;
          f.fallen  = false;
          if (f.el) {
            f.el.style.opacity  = "0";
            f.el.style.transform = "";
            f.el.classList.remove("scroll-flower--bloom", "scroll-flower--fall");
          }
        });
      }
    }
  });
  mo.observe(body, { attributes: true, attributeFilter: ["class"] });
}
