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

function setTransitions({ coverTrans }) {
  cardCover.style.transition = coverTrans;
}

// ── Open ──────────────────────────────────────────────────────────────────────
let isOpen = false;

function openCard() {
  if (isOpen) return;
  isOpen = true;

  setTransitions({
    coverTrans: `transform 0.82s ${EASE_OUT}`,
  });

  cardScene.classList.add('is-open');
  cardCover.setAttribute('aria-expanded', 'true');
  cardCover.removeAttribute('tabindex');
  cardInside.removeAttribute('aria-hidden');
  cardInside.style.pointerEvents = '';

  setTimeout(() => document.getElementById('ci-name')?.focus(), 950);
}

// ── Close ─────────────────────────────────────────────────────────────────────
function closeCard() {
  if (!isOpen) return;

  setTransitions({
    coverTrans: `transform 0.75s ${EASE_IN}`,
  });

  cardScene.classList.remove('is-open');
  cardCover.setAttribute('aria-expanded', 'false');

  // Restore cover interactivity once animation settles
  setTimeout(() => {
    isOpen = false;
    cardCover.setAttribute('tabindex', '0');
    cardInside.setAttribute('aria-hidden', 'true');
    cardInside.style.pointerEvents = 'none';
  }, 800);
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
