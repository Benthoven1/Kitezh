// cursor.js — custom cursor: a slowly turning four-pointed star (the same
// ✦ glyph as the letter ornaments) inside a fine trailing ring.
// Desktop pointer devices only; disabled for touch and reduced-motion users.
// Uses mix-blend-mode: difference (see style.css) so it stays visible on both
// the paper and night-sky backgrounds.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var root = document.documentElement;
  root.classList.add("cursor-on", "cur-hidden");

  var star = document.createElement("div");
  var ring = document.createElement("div");
  star.className = "cur-star";
  ring.className = "cur-ring";
  star.setAttribute("aria-hidden", "true");
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(star);
  document.body.appendChild(ring);

  var x = window.innerWidth / 2, y = window.innerHeight / 2;
  var ringScale = 1, starScale = 1;
  var down = false;
  var hoverEl = null;
  var hoverOn = false;
  var seen = false;

  var INTERACTIVE = "a, button, input, textarea, select, label, [role='button'], summary";

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    hoverEl = e.target;
    if (!seen) { seen = true; }
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
    var hov = isInteractive();
    if (hov !== hoverOn) { hoverOn = hov; root.classList.toggle("cur-hover", hov); }

    // Ring and star move as one; only their scales ease
    var starTarget = down ? 0.7 : (hov ? 1.5 : 1);
    var ringTarget = down ? 0.78 : (hov ? 1.85 : 1);
    starScale += (starTarget - starScale) * 0.2;
    ringScale += (ringTarget - ringScale) * 0.14;

    star.style.transform = "translate3d(" + (x - 7) + "px," + (y - 7) + "px,0) scale(" + starScale.toFixed(3) + ")";
    ring.style.transform = "translate3d(" + (x - 17) + "px," + (y - 17) + "px,0) scale(" + ringScale.toFixed(3) + ")";
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
