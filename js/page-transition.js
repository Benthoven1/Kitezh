// page-transition.js — fade transitions for sub-pages.
// Body starts at opacity:0 in the HTML; this script fades it in on load.
// All outgoing internal links get a fade-out before navigation.
// Links to index.html also set the ls-entering flag so the loading screen plays.
(function () {
  var active = false;
  var FADE = 350;

  // ── Fade-in on load ───────────────────────────────────────────────────────
  // Double rAF ensures the browser commits the initial opacity:0 before we
  // start the transition, giving a clean fade from transparent to visible.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.style.transition = 'opacity ' + FADE + 'ms ease';
      document.body.style.opacity = '1';
    });
  });

  // Bfcache restore (browser back/forward): JS state is frozen, page may be
  // opacity:0 — ensure it snaps back to visible immediately.
  window.addEventListener('pageshow', function (ev) {
    if (ev.persisted) {
      document.body.style.transition = '';
      document.body.style.opacity = '1';
      active = false;
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function isHome(href) {
    try {
      var u = new URL(href, location.href);
      return u.pathname.endsWith('/index.html') || u.pathname.endsWith('/');
    } catch (e) { return false; }
  }

  // ── Link interception ─────────────────────────────────────────────────────
  document.addEventListener('click', function (ev) {
    var link = ev.target.closest('a[href]');
    if (!link || link.target === '_blank') return;
    var href = link.getAttribute('href');
    if (!href) return;

    var resolved;
    try { resolved = new URL(href, location.href); } catch (e) { return; }
    if (resolved.origin !== location.origin) return;        // external
    if (resolved.href === location.href) return;            // same URL
    if (resolved.pathname === location.pathname && resolved.hash) return; // same-page anchor

    ev.preventDefault();
    if (active) { window.location.href = href; return; }
    active = true;

    // Flag must be set synchronously so index.html sees it even if the
    // browser is slow to unload this page.
    if (isHome(href)) { sessionStorage.setItem('ls-entering', '1'); }

    document.body.style.transition = 'opacity ' + FADE + 'ms ease';
    document.body.style.opacity = '0';
    setTimeout(function () { window.location.href = href; }, FADE);
  });
}());
