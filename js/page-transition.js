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

  // ── Exit animation ────────────────────────────────────────────────────────
  // Cover the page with a plain opaque overlay, set the sessionStorage flag,
  // then navigate on the very next frame.  All loading animation is handled
  // by main.js on the destination page — nothing should animate here.
  function playExit(href) {
    if (active) return;
    active = true;
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    // Reset frames to zero size so nothing leaks through
    [f1, f2, f3, fb].forEach(function (el) {
      el.style.width = "0"; el.style.height = "0";
      el.style.transform = "translate(-50%,-50%)";
    });

    overlay.style.clipPath      = "";
    overlay.style.opacity       = "1";
    overlay.style.display       = "block";
    overlay.style.pointerEvents = "all";
    overlay.setAttribute("aria-hidden", "false");
    sessionStorage.setItem("ls-entering", "1");

    // Wait one frame so the opaque overlay is painted before the browser
    // unloads this page, preventing a flash of the sub-page during navigation.
    raf = requestAnimationFrame(function () {
      window.location.href = href;
    });
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
