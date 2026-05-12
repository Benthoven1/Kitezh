const cardScene    = document.getElementById('card-scene');
const cardWrap     = document.getElementById('card-wrap');
const cardCover    = document.getElementById('card-cover');
const cardInside   = document.getElementById('card-inside');
const cardCloseBtn = document.getElementById('card-close-btn');
const cardForm     = document.getElementById('card-form');
const ciSuccess    = document.getElementById('ci-success');

if (!cardScene) throw new Error('card.js: #card-scene not found');

// ── Scroll reveal ─────────────────────────────────────────────────────────────
new IntersectionObserver(([entry], obs) => {
  if (entry.isIntersecting) {
    cardWrap.classList.add('card-in');
    obs.disconnect();
  }
}, { threshold: 0.12 }).observe(cardWrap);

// ── Transition presets ────────────────────────────────────────────────────────
// easeOut feels like pushing/swinging open; easeIn feels like falling back shut
const EASE_OUT = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const EASE_IN  = 'cubic-bezier(0.55, 0.06, 0.68, 0.19)';

// ── Open (two-step) ───────────────────────────────────────────────────────────
// Step 1 — pan: scene slides right, clip expands. Cover is pinned at rotateY(0)
//           via inline style so the .is-open CSS rule cannot rotate it yet.
// Step 2 — fold: inline pin is released; CSS class drives the cover rotation.
let isOpen = false;

function openCard() {
  if (isOpen) return;
  isOpen = true;

  // Pin cover so it doesn't rotate during the pan
  cardCover.style.transition = 'none';
  cardCover.style.transform  = 'rotateY(0deg)';
  cardScene.style.transition = `transform 0.60s ${EASE_OUT}, clip-path 0.60s ${EASE_OUT}`;

  cardScene.classList.add('is-open');
  cardCover.setAttribute('aria-expanded', 'true');
  cardCover.removeAttribute('tabindex');
  cardInside.removeAttribute('aria-hidden');
  cardInside.style.pointerEvents = '';

  // After pan settles, release the pin and fold the cover open
  setTimeout(() => {
    cardCover.style.transition = `transform 0.82s ${EASE_OUT}`;
    cardCover.style.transform  = ''; // CSS .is-open rule takes over → rotateY(-175deg)
    setTimeout(() => document.getElementById('ci-name')?.focus(), 900);
  }, 660);
}

// ── Close (two-step, reversed) ────────────────────────────────────────────────
// Step 1 — fold shut: cover rotates back to 0 via inline override.
// Step 2 — pan back: scene slides left and clip re-hides; inline pin removed.
function closeCard() {
  if (!isOpen) return;
  isOpen = false; // block re-entry immediately

  // Step 1 — fold the cover shut
  cardCover.style.transition = `transform 0.65s ${EASE_IN}`;
  cardCover.style.transform  = 'rotateY(0deg)';

  setTimeout(() => {
    // Step 2 — pan back to closed position
    cardScene.style.transition = `transform 0.58s ${EASE_IN}, clip-path 0.58s ${EASE_IN}`;
    cardCover.style.transition = 'none';
    cardCover.style.transform  = ''; // base CSS rule keeps cover at rotateY(0deg)
    cardScene.classList.remove('is-open');
    cardCover.setAttribute('aria-expanded', 'false');

    setTimeout(() => {
      cardCover.setAttribute('tabindex', '0');
      cardInside.setAttribute('aria-hidden', 'true');
      cardInside.style.pointerEvents = 'none';
    }, 620);
  }, 700);
}

// ── Event listeners ───────────────────────────────────────────────────────────
cardCover.addEventListener('click', openCard);
cardCover.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); }
});

cardCloseBtn.addEventListener('click', closeCard);

// ── Input error-state clearing ────────────────────────────────────────────────
['ci-name', 'ci-email', 'ci-interest'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', function () {
    this.classList.remove('ci-input--error');
  });
});

// ── Form submission ───────────────────────────────────────────────────────────
cardForm.addEventListener('submit', async e => {
  e.preventDefault();
  e.stopPropagation();

  const required = ['ci-name', 'ci-email', 'ci-interest'];
  let valid = true;
  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el?.value.trim()) { el?.classList.add('ci-input--error'); valid = false; }
  });
  if (!valid) return;

  const btn = cardForm.querySelector('.ci-submit');
  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>Sending&hellip;</span>';

  const payload = Object.fromEntries(new FormData(cardForm));
  const endpoint = cardForm.dataset.endpoint?.trim();

  if (endpoint) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      resp.ok ? showSuccess() : resetBtn(btn, origHTML);
    } catch {
      resetBtn(btn, origHTML);
    }
  } else {
    const subject = encodeURIComponent(`[Mulvium] ${payload.interest || 'Hello'}`);
    const body    = encodeURIComponent(
      `Name: ${payload.name}\nEmail: ${payload.email}\nInterest: ${payload.interest || '—'}\n\n${payload.message || ''}`
    );
    window.location.href = `mailto:hello@mulvium.org?subject=${subject}&body=${body}`;
    showSuccess();
  }
});

function showSuccess() {
  cardForm.style.display = 'none';
  ciSuccess.style.display = 'flex';
}

function resetBtn(btn, html) {
  btn.disabled = false;
  btn.innerHTML = html;
}
