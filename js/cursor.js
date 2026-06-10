// cursor.js — custom cursor: a precise dot with a trailing ring.
// Desktop pointer devices only; disabled for touch and reduced-motion users.
// Uses mix-blend-mode: difference (see style.css) so it stays visible on both
// the paper and night-sky backgrounds.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var root = document.documentElement;
  root.classList.add("cursor-on", "cur-hidden");

  var dot = document.createElement("div");
  var ring = document.createElement("div");
  dot.className = "cur-dot";
  ring.className = "cur-ring";
  dot.setAttribute("aria-hidden", "true");
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  var x = window.innerWidth / 2, y = window.innerHeight / 2;
  var rx = x, ry = y;
  var scale = 1, targetScale = 1;
  var down = false;
  var hoverEl = null;
  var seen = false;

  var INTERACTIVE = "a, button, input, textarea, select, label, [role='button'], summary";

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    hoverEl = e.target;
    if (!seen) { seen = true; rx = x; ry = y; }
    root.classList.remove("cur-hidden");
  }, { passive: true });

  document.addEventListener("pointerdown", function () { down = true; });
  document.addEventListener("pointerup", function () { down = false; });
  root.addEventListener("mouseleave", function () { root.classList.add("cur-hidden"); });
  root.addEventListener("mouseenter", function () { if (seen) root.classList.remove("cur-hidden"); });

  function isInteractive() {
    if (!hoverEl || !hoverEl.closest) return false;
    if (hoverEl.closest(INTERACTIVE)) return true;
    // The Three.js canvas signals hoverable spheres via its inline cursor style
    if (hoverEl.tagName === "CANVAS" && hoverEl.style.cursor === "pointer") return true;
    return false;
  }

  function frame() {
    rx += (x - rx) * 0.16;
    ry += (y - ry) * 0.16;
    targetScale = down ? 0.72 : (isInteractive() ? 1.65 : 1);
    scale += (targetScale - scale) * 0.18;
    dot.style.transform = "translate3d(" + (x - 3.5) + "px," + (y - 3.5) + "px,0)";
    ring.style.transform = "translate3d(" + (rx - 19) + "px," + (ry - 19) + "px,0) scale(" + scale.toFixed(3) + ")";
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
