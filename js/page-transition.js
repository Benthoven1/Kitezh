// page-transition.js — loading-screen transitions for sub-pages
// Injects the overlay markup, intercepts nav link clicks (exit), and plays
// the entrance animation on arrival. Not loaded by index.html (main.js owns
// that page's loading screen and canvas-aware hole animation).
(function () {
  // ── Overlay setup ─────────────────────────────────────────────────────────
  var overlay = document.getElementById("loading-screen");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-screen";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div id="ls-f1" class="ls-frame"></div>' +
      '<div id="ls-f2" class="ls-frame"></div>' +
      '<div id="ls-f3" class="ls-frame"></div>' +
      '<div id="ls-border" class="ls-frame"></div>';
    document.body.appendChild(overlay);
  }

  var f1 = document.getElementById("ls-f1");
  var f2 = document.getElementById("ls-f2");
  var f3 = document.getElementById("ls-f3");
  var fb = document.getElementById("ls-border");
  var raf = null, active = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
  function ph(t, a, b) { return ease(Math.max(0, Math.min(1, (t - a) / (b - a)))); }

  function setF(el, w, h, cy) {
    el.style.width  = w + "px";
    el.style.height = h + "px";
    el.style.transform = "translate(-50%,calc(-50% + " + cy + "px))";
  }

  function setB(w, h, cy) {
    cy = cy || 0;
    fb.style.width  = (w + 6) + "px";
    fb.style.height = (h + 6) + "px";
    fb.style.transform = "translate(-50%,calc(-50% + " + cy + "px))";
  }

  // Nonzero-winding clip-path hole: outer CW rect + inner CCW rect = transparent window.
  function setHole(vw, vh, hw, hh, hcy) {
    if (hw < 2 || hh < 2) { overlay.style.clipPath = ""; return; }
    var cx = vw / 2;
    var x1 = cx - hw/2, y1 = hcy - hh/2, x2 = cx + hw/2, y2 = hcy + hh/2;
    overlay.style.clipPath =
      "polygon(0px 0px," + vw + "px 0px," + vw + "px " + vh + "px,0px " + vh + "px,0px 0px," +
      x1 + "px " + y1 + "px," + x1 + "px " + y2 + "px," +
      x2 + "px " + y2 + "px," + x2 + "px " + y1 + "px," + x1 + "px " + y1 + "px)";
  }

  function cleanup() {
    overlay.style.opacity       = "0";
    overlay.style.display       = "none";
    overlay.style.clipPath      = "";
    overlay.style.pointerEvents = "none";
    overlay.setAttribute("aria-hidden", "true");
    active = false;
  }

  // ── Exit animation ────────────────────────────────────────────────────────
  // Frames rise from below and stagger in. White reaches full opacity at
  // t≈0.18 (198 ms at 1100 ms duration), then the browser navigates.
  function playExit(href) {
    if (active) return;
    active = true;
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    var vw = window.innerWidth, vh = window.innerHeight;
    var WIN_W = vw * 0.68, WIN_H = vh * 0.62;
    var F3_W  = vw * 0.72, F3_H  = vh * 0.65;
    var F2_W  = vw * 0.76, F2_H  = vh * 0.68;
    var F1_W  = vw * 0.80, F1_H  = vh * 0.71;

    [f1, f2, f3, fb].forEach(function (el) {
      el.style.width = "0"; el.style.height = "0";
      el.style.transform = "translate(-50%,-50%)";
    });
    overlay.style.clipPath      = "";
    overlay.style.opacity       = "0";
    overlay.style.display       = "block";
    overlay.style.pointerEvents = "all";
    overlay.setAttribute("aria-hidden", "false");

    var dur = 1100, t0 = null, gone = false;

    function tick(ts) {
      try {
        if (!t0) t0 = ts;
        var t = Math.min(1, (ts - t0) / dur);

        overlay.style.opacity = String(ph(t, 0, 0.18));

        var holeCY = vh/2 + vh*0.5*(1 - ph(t, 0.10, 0.32));
        var cy = holeCY - vh/2;
        setF(f1, F1_W * ph(t,0.10,0.38), F1_H * ph(t,0.10,0.38), cy);
        setF(f2, F2_W * ph(t,0.18,0.50), F2_H * ph(t,0.18,0.50), cy);
        setF(f3, F3_W * ph(t,0.26,0.62), F3_H * ph(t,0.26,0.62), cy);
        var winP = ph(t, 0.38, 0.80);
        setB(WIN_W * winP, WIN_H * winP, cy);
        setHole(vw, vh, WIN_W * winP, WIN_H * winP, holeCY);

        if (!gone && t >= 0.18) {
          gone = true;
          sessionStorage.setItem("ls-entering", "1");
          window.location.href = href;
        }

        if (t < 1) { raf = requestAnimationFrame(tick); }
        else        { active = false; }
      } catch (err) { cleanup(); }
    }

    raf = requestAnimationFrame(tick);
  }

  // ── Entrance animation ────────────────────────────────────────────────────
  // Starts with the overlay at full opacity and the border ring at WIN size.
  // The hole + ring expand outward to reveal the destination page, then the
  // white overlay fades away.
  function playEntrance() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    var vw = window.innerWidth, vh = window.innerHeight;
    var WIN_W = vw * 0.68, WIN_H = vh * 0.62;
    var dur = 1400, t0 = null;

    [f1, f2, f3].forEach(function (el) {
      el.style.width  = WIN_W + "px";
      el.style.height = WIN_H + "px";
      el.style.transform = "translate(-50%,-50%)";
    });
    setB(WIN_W, WIN_H);
    setHole(vw, vh, WIN_W, WIN_H, vh / 2);
    overlay.style.opacity       = "1";
    overlay.style.display       = "block";
    overlay.style.pointerEvents = "none";

    function tick(ts) {
      if (!t0) t0 = ts;
      var t = Math.min(1, (ts - t0) / dur);

      overlay.style.opacity = t < 0.72 ? "1" : String(1 - ph(t, 0.72, 1.0));

      var ep = ph(t, 0, 0.72);
      var hw = WIN_W + (vw - WIN_W) * ep;
      var hh = WIN_H + (vh - WIN_H) * ep;
      [f1, f2, f3].forEach(function (el) {
        el.style.width  = WIN_W + "px";
        el.style.height = WIN_H + "px";
      });
      setB(hw, hh);
      setHole(vw, vh, hw, hh, vh / 2);

      if (t < 1) { raf = requestAnimationFrame(tick); }
      else        { cleanup(); }
    }

    raf = requestAnimationFrame(tick);
  }

  // ── Nav link interception ─────────────────────────────────────────────────
  document.addEventListener("click", function (ev) {
    var link = ev.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href) return;
    if (/^(#|https?:|mailto:|tel:|javascript:)/.test(href)) return;
    if (link.target === "_blank") return;
    // Skip links that resolve to the current page
    try { if (new URL(href, location.href).href === location.href) return; } catch (e) {}
    ev.preventDefault();
    if (active) return;
    playExit(href);
  });

  // ── Entrance on page load ─────────────────────────────────────────────────
  if (sessionStorage.getItem("ls-entering")) {
    sessionStorage.removeItem("ls-entering");
    playEntrance();
  }
}());
