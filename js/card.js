const cardScene  = document.getElementById('card-scene');
const cardWrap   = document.getElementById('card-wrap');
const cardCover  = document.getElementById('card-cover');
const cardInside = document.getElementById('card-inside');
const cardForm   = document.getElementById('card-form');
const ciSuccess  = document.getElementById('ci-success');

if (!cardScene) throw new Error('card.js: #card-scene not found');

// Scroll reveal — slide card up from below as it enters the viewport
new IntersectionObserver(([entry], obs) => {
  if (entry.isIntersecting) {
    cardWrap.classList.add('card-in');
    obs.disconnect();
  }
}, { threshold: 0.12 }).observe(cardWrap);

// Open the card (cover folds back, scene zooms)
let isOpen = false;
function openCard() {
  if (isOpen) return;
  isOpen = true;
  cardScene.classList.add('is-open');
  cardCover.setAttribute('aria-expanded', 'true');
  cardCover.removeAttribute('tabindex');
  cardInside.removeAttribute('aria-hidden');
  cardInside.style.pointerEvents = '';
  // Focus first field after the fold animation completes
  setTimeout(() => document.getElementById('ci-name')?.focus(), 1050);
}

cardCover.addEventListener('click', openCard);
cardCover.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); }
});

// Input error-state clearing
['ci-name', 'ci-email', 'ci-interest'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', function () {
    this.classList.remove('ci-input--error');
  });
});

// Form submission
cardForm.addEventListener('submit', async e => {
  e.preventDefault();
  e.stopPropagation();

  // Validate required fields
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
    // mailto fallback — opens the user's mail client
    const subject = encodeURIComponent(`[Mulvium] ${payload.interest || 'Hello'}`);
    const body = encodeURIComponent(
      `Name: ${payload.name}\nEmail: ${payload.email}\nInterest: ${payload.interest || '—'}\n\n${payload.message || ''}`
    );
    window.location.href = `mailto:hello@mulvium.org?subject=${subject}&body=${body}`;
    showSuccess();
  }
});

function showSuccess() {
  cardForm.hidden = true;
  ciSuccess.hidden = false;
}

function resetBtn(btn, html) {
  btn.disabled = false;
  btn.innerHTML = html;
}
