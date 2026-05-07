// page-transition.js — loading-screen exit for sub-pages navigating TO index.html.
// Only intercepts links whose resolved target is index.html (Mulvium home or #ifo).
// Navigating between sub-pages (People ↔ Careers etc.) is plain browser navigation.
// The entrance animation on index.html is handled by main.js via showLoadingScreen.
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

  // ── Exit animation ────────────────────────────────────────────────────────
  // The overlay is made fully opaque and the sessionStorage flag is set
  // SYNCHRONOUSLY on click so the destination page always sees the flag,
  // even if the animation rAF is delayed (slow tab, background paint).
  // Frames animate briefly while the browser loads the new page.
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

    // Immediately cover the page and mark the destination to play its entrance
    overlay.style.clipPath      = "";
    overlay.style.opacity       = "1";
    overlay.style.display       = "block";
    overlay.style.pointerEvents = "all";
    overlay.setAttribute("aria-hidden", "false");
    sessionStorage.setItem("ls-entering", "1");

    var dur = 900, t0 = null, gone = false;

    function tick(ts) {
      try {
        if (!t0) t0 = ts;
        var t = Math.min(1, (ts - t0) / dur);

        // Frames rise while browser transitions; overlay stays fully opaque
        var holeCY = vh/2 + vh*0.5*(1 - ph(t, 0, 0.28));
        var cy = holeCY - vh/2;
        setF(f1, F1_W * ph(t, 0,    0.32), F1_H * ph(t, 0,    0.32), cy);
        setF(f2, F2_W * ph(t, 0.10, 0.44), F2_H * ph(t, 0.10, 0.44), cy);
        setF(f3, F3_W * ph(t, 0.20, 0.56), F3_H * ph(t, 0.20, 0.56), cy);
        var winP = ph(t, 0.32, 0.75);
        setB(WIN_W * winP, WIN_H * winP, cy);

        // Navigate once a couple of frames have rendered
        if (!gone && t >= 0.15) {
          gone = true;
          window.location.href = href;
        }

        if (t < 1) { raf = requestAnimationFrame(tick); }
        else        { active = false; }
      } catch (err) { active = false; }
    }

    raf = requestAnimationFrame(tick);
  }

  // ── Returns true if href resolves to index.html (with any hash) ───────────
  function isHomePage(href) {
    try {
      var url = new URL(href, location.href);
      return url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
    } catch (e) { return false; }
  }

  // ── Nav link interception — index.html links only ─────────────────────────
  document.addEventListener("click", function (ev) {
    var link = ev.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || link.target === "_blank") return;
    if (!isHomePage(href)) return;   // only intercept home / IFO navigation
    // Skip links that resolve to the current page (already on index.html)
    try { if (new URL(href, location.href).href === location.href) return; } catch (e) {}
    ev.preventDefault();
    if (active) { window.location.href = href; return; } // fall through if busy
    playExit(href);
  });
}());
