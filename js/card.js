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
const EASE_OUT = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const EASE_IN  = 'cubic-bezier(0.55, 0.06, 0.68, 0.19)';

// ── Open (two-step) ───────────────────────────────────────────────────────────
// Step 1 — pan:  scene slides right via transform only; clip stays at 50% so
//                the inside-left ("Dear Benjamin") is never visible during pan.
// Step 2 — fold: cover rotates open AND clip expands simultaneously — the left
//                page is revealed exactly as the cover sweeps away.
let isOpen = false;

function openCard() {
  if (isOpen) return;
  isOpen = true;

  cardScene.classList.add('is-open'); // enables close-button visibility etc.
  cardCover.setAttribute('aria-expanded', 'true');
  cardCover.removeAttribute('tabindex');
  cardInside.removeAttribute('aria-hidden');
  cardInside.style.pointerEvents = '';

  if (window.innerWidth <= 639) {
    // Mobile portrait: single-step fold only
    cardCover.style.transition = `transform 0.82s ${EASE_OUT}`;
    cardCover.style.transform  = 'rotateY(-175deg)';
    setTimeout(() => document.getElementById('ci-name')?.focus(), 900);
    return;
  }

  // Step 1 — pan (transform only, clip locked at 50%)
  cardCover.style.transition = 'none';
  cardCover.style.transform  = 'rotateY(0deg)';     // pin cover during pan
  cardScene.style.transition = `transform 0.60s ${EASE_OUT}`;
  cardScene.style.transform  = 'translateX(0)';     // slide to spread position
  cardScene.style.clipPath   = 'inset(0 0 0 50%)';  // hold — inside-left stays hidden

  // Step 2 — fold (cover rotates, inside-left revealed in sync)
  setTimeout(() => {
    cardCover.style.transition = `transform 0.82s ${EASE_OUT}`;
    cardCover.style.transform  = 'rotateY(-175deg)';
    cardScene.style.transition = `clip-path 0.82s ${EASE_OUT}`;
    cardScene.style.clipPath   = 'inset(0 0 0 0%)';
    setTimeout(() => document.getElementById('ci-name')?.focus(), 900);
  }, 660);
}

// ── Close (reversed two-step) ─────────────────────────────────────────────────
// Step 1 — fold shut: cover rotates back AND clip hides the inside-left in sync.
// Step 2 — pan back: scene slides left to re-centre the cover; clip stays at 50%.
function closeCard() {
  if (!isOpen) return;
  isOpen = false;

  cardCover.setAttribute('aria-expanded', 'false');

  if (window.innerWidth <= 639) {
    // Mobile portrait: single-step close
    cardCover.style.transition = `transform 0.75s ${EASE_IN}`;
    cardCover.style.transform  = 'rotateY(0deg)';
    setTimeout(() => {
      cardScene.classList.remove('is-open');
      cardCover.setAttribute('tabindex', '0');
      cardInside.setAttribute('aria-hidden', 'true');
      cardInside.style.pointerEvents = 'none';
    }, 800);
    return;
  }

  // Step 1 — fold shut (cover closes, inside-left hides in sync)
  cardCover.style.transition = `transform 0.65s ${EASE_IN}`;
  cardCover.style.transform  = 'rotateY(0deg)';
  cardScene.style.transition = `clip-path 0.65s ${EASE_IN}`;
  cardScene.style.clipPath   = 'inset(0 0 0 50%)';

  // Step 2 — pan back (cover returns to centred position)
  setTimeout(() => {
    cardCover.style.transition = 'none';
    cardScene.style.transition = `transform 0.58s ${EASE_IN}`;
    cardScene.style.transform  = 'translateX(-25%)';
    cardScene.classList.remove('is-open');

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
document.querySelector('.card-close-btn--mobile')?.addEventListener('click', closeCard);

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
  // On desktop the message textarea lives on the cover's back face (outside the form element)
  const msgEl = document.getElementById('ci-message');
  if (msgEl?.value) payload.message = msgEl.value;
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
