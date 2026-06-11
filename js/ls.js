// ls.js — standalone loading screen for sub-pages (currently the Contact
// page). Plays the same nested-frame reveal as the home page: four image
// slits open, converge into a window, and the window expands to reveal the
// live canvas beneath. Dispatches:
//   'mulvium:ls-hole' — the canvas window first opens (start scene entrance)
//   'mulvium:ls-done' — overlay gone (page content may fade in)
// Adds body.ls-done on completion for CSS-gated reveals.
(function () {
  var loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;

  var lsF1 = document.getElementById('ls-f1');
  var lsF2 = document.getElementById('ls-f2');
  var lsF3 = document.getElementById('ls-f3');
  var lsF4 = document.getElementById('ls-f4');
  var lsBorder = document.getElementById('ls-border');
  var imgs = [lsF1, lsF2, lsF3, lsF4].map(function (f) { return f.querySelector('.ls-img'); });

  function dispatch(name) {
    // Flag for late listeners — module scripts (the mesh) may finish loading
    // after this event has already fired
    window['__' + name.replace(':', '_')] = true;
    document.dispatchEvent(new CustomEvent(name));
  }

  function finish() {
    [lsF1, lsF2, lsF3, lsF4, lsBorder].forEach(function (f) {
      f.style.width = '0'; f.style.height = '0'; f.style.visibility = 'hidden';
    });
    imgs.forEach(function (f) { f.style.transform = ''; });
    loadingScreen.style.opacity = '0';
    loadingScreen.style.clipPath = '';
    loadingScreen.style.display = 'none';
    loadingScreen.style.pointerEvents = 'none';
    loadingScreen.setAttribute('aria-hidden', 'true');
    document.body.classList.add('ls-done');
    dispatch('mulvium:ls-done');
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.remove('ls-instant-cover');
    dispatch('mulvium:ls-hole');
    finish();
    return;
  }

  var DUR = 4000;
  var holeDispatched = false;

  loadingScreen.style.opacity = '1';
  loadingScreen.style.display = 'block';
  loadingScreen.style.pointerEvents = 'all';
  loadingScreen.setAttribute('aria-hidden', 'false');
  lsBorder.style.visibility = 'hidden';
  imgs.forEach(function (f) { f.style.transform = 'scale(1.2)'; });
  document.documentElement.classList.remove('ls-instant-cover');

  // Transparent canvas-window hole via nonzero-winding clip-path
  function setHole(vw, vh, hW, hH, hCY) {
    if (hW < 2 || hH < 2) { loadingScreen.style.clipPath = ''; return; }
    var cx = vw / 2;
    var x1 = cx - hW / 2, y1 = hCY - hH / 2;
    var x2 = cx + hW / 2, y2 = hCY + hH / 2;
    loadingScreen.style.clipPath =
      'polygon(0px 0px,' + vw + 'px 0px,' + vw + 'px ' + vh + 'px,0px ' + vh + 'px,0px 0px,' +
      x1 + 'px ' + y1 + 'px,' + x1 + 'px ' + y2 + 'px,' + x2 + 'px ' + y2 + 'px,' +
      x2 + 'px ' + y1 + 'px,' + x1 + 'px ' + y1 + 'px)';
  }

  function eRise(t)     { return 1 - Math.pow(1 - t, 3); }
  function eSlit(t)     { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function eConverge(t) { return t * t * t * t; }
  function eExpand(t)   { return 1 - (1 - t) * (1 - t); }
  function eCubicInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function ph(t, a, b, efn) {
    return (efn || eCubicInOut)(Math.max(0, Math.min(1, (t - a) / (b - a))));
  }

  function setF(el, w, h, cyOff) {
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.transform = 'translate(-50%, calc(-50% + ' + cyOff + 'px))';
  }

  function setBorder(w, h, cyOff) {
    lsBorder.style.visibility = '';
    lsBorder.style.width = (w + 6) + 'px';
    lsBorder.style.height = (h + 6) + 'px';
    lsBorder.style.transform = 'translate(-50%, calc(-50% + ' + (cyOff || 0) + 'px))';
  }

  var t0 = null;
  function tick(ts) {
    try {
      if (!t0) t0 = ts;
      var t = Math.min(1, (ts - t0) / DUR);

      var vw = window.innerWidth, vh = window.innerHeight;
      var WIN_W = vw * 0.68, WIN_H = vh * 0.62;
      var EFF = 0.92;
      var EWIN_W = WIN_W * EFF, EWIN_H = WIN_H * EFF;
      var EF4_W = vw * 0.70 * EFF, EF4_H = vh * 0.635 * EFF;
      var EF3_W = vw * 0.72 * EFF, EF3_H = vh * 0.65 * EFF;
      var EF2_W = vw * 0.76 * EFF, EF2_H = vh * 0.68 * EFF;
      var EF1_W = vw * 0.80 * EFF, EF1_H = vh * 0.71 * EFF;

      var fadeOut = ph(t, 0.78, 1.0);
      loadingScreen.style.opacity = String(1 - fadeOut);

      // Slow directional drift across each photograph
      var d1 = ph(t, 0.08, 1.0), d2 = ph(t, 0.14, 1.0), d3 = ph(t, 0.20, 1.0), d4 = ph(t, 0.26, 1.0);
      imgs[0].style.transform = 'translate(' + (-7 + 14 * d1) + 'px,' + (4 - 8 * d1) + 'px) scale(' + (1.3 - 0.3 * ph(t, 0.08, 0.30, eRise)) + ')';
      imgs[1].style.transform = 'translate(' + (6 - 12 * d2) + 'px,' + (-5 + 10 * d2) + 'px) scale(' + (1.3 - 0.3 * ph(t, 0.14, 0.32, eRise)) + ')';
      imgs[2].style.transform = 'translate(' + (5 - 10 * d3) + 'px,' + (6 - 11 * d3) + 'px) scale(' + (1.3 - 0.3 * ph(t, 0.20, 0.34, eRise)) + ')';
      imgs[3].style.transform = 'translate(' + (-5 + 10 * d4) + 'px,' + (-7 + 14 * d4) + 'px) scale(' + (1.3 - 0.3 * ph(t, 0.26, 0.38, eRise)) + ')';

      var holeCY = vh / 2 + vh * 0.5 * (1 - ph(t, 0.06, 0.28, eRise));
      var cyOff = holeCY - vh / 2;

      if (t < 0.54) {
        // Phase 1 — each frame opens as a slit
        var f1w = ph(t, 0.08, 0.14, eRise), f2w = ph(t, 0.14, 0.20, eRise);
        var f3w = ph(t, 0.20, 0.26, eRise), f4w = ph(t, 0.26, 0.32, eRise);
        var f1h = ph(t, 0.08, 0.32, eSlit), f2h = ph(t, 0.14, 0.38, eSlit);
        var f3h = ph(t, 0.20, 0.44, eSlit), f4h = ph(t, 0.26, 0.46, eSlit);
        if (t >= 0.08) setF(lsF1, EF1_W * f1w, Math.max(3, EF1_H * f1h), cyOff);
        if (t >= 0.14) setF(lsF2, EF2_W * f2w, Math.max(3, EF2_H * f2h), cyOff);
        if (t >= 0.20) setF(lsF3, EF3_W * f3w, Math.max(3, EF3_H * f3h), cyOff);
        if (t >= 0.26) setF(lsF4, EF4_W * f4w, Math.max(3, EF4_H * f4h), cyOff);

        if (t >= 0.30) {
          if (!holeDispatched) { holeDispatched = true; dispatch('mulvium:ls-hole'); }
          var hw = ph(t, 0.30, 0.36, eRise);
          var hh = ph(t, 0.30, 0.48, eRise);
          var holeW = EWIN_W * hw;
          var holeH = Math.max(3, EWIN_H * hh);
          setHole(vw, vh, holeW, holeH, holeCY);
          setBorder(holeW, holeH, cyOff);
        } else {
          loadingScreen.style.clipPath = '';
          lsBorder.style.width = '0'; lsBorder.style.height = '0';
        }
      } else if (t < 0.67) {
        // Phase 2 — converge into the window
        var cp = ph(t, 0.54, 0.67, eConverge);
        setF(lsF1, EF1_W + (EWIN_W - EF1_W) * cp, EF1_H + (EWIN_H - EF1_H) * cp, 0);
        setF(lsF2, EF2_W + (EWIN_W - EF2_W) * cp, EF2_H + (EWIN_H - EF2_H) * cp, 0);
        setF(lsF3, EF3_W + (EWIN_W - EF3_W) * cp, EF3_H + (EWIN_H - EF3_H) * cp, 0);
        setF(lsF4, EF4_W + (EWIN_W - EF4_W) * cp, EF4_H + (EWIN_H - EF4_H) * cp, 0);
        setHole(vw, vh, EWIN_W, EWIN_H, vh / 2);
        setBorder(EWIN_W, EWIN_H);
      } else {
        // Phase 3 — window expands to the full viewport
        var ep = ph(t, 0.67, 0.90, eExpand);
        var hw2 = EWIN_W + (vw - EWIN_W) * ep;
        var hh2 = EWIN_H + (vh - EWIN_H) * ep;
        var fw = Math.min(hw2, WIN_W), fh = Math.min(hh2, WIN_H);
        setF(lsF1, fw, fh, 0); setF(lsF2, fw, fh, 0);
        setF(lsF3, fw, fh, 0); setF(lsF4, fw, fh, 0);
        setHole(vw, vh, hw2, hh2, vh / 2);
        setBorder(hw2, hh2);
      }

      if (t < 1) requestAnimationFrame(tick);
      else finish();
    } catch (err) {
      console.error('ls.js animation error:', err);
      finish();
    }
  }
  requestAnimationFrame(tick);
})();
