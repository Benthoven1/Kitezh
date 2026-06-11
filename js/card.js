// card.js — contact card form: validation, submission, success state.
// The card is presented already open; the mesh network (contact-mesh.js)
// listens for the 'mulvium:card-sent' event dispatched on success.
const cardForm  = document.getElementById('card-form');
const ciSuccess = document.getElementById('ci-success');

if (!cardForm) throw new Error('card.js: #card-form not found');

// Clear error state as the visitor corrects a field
['ci-name', 'ci-email', 'ci-interest'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', function () {
    this.classList.remove('ci-input--error');
  });
});

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
  // The message textarea lives on the left page, outside the form element
  const msg = document.getElementById('ci-message')?.value || '';
  if (msg) payload.message = msg;
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
    const subject = encodeURIComponent(`[Mulvium] ${payload.interest || 'Inquiry'}`);
    const body    = encodeURIComponent(
      `Name: ${payload.name}\nEmail: ${payload.email}\nSubject: ${payload.interest || '—'}\n\n${payload.message || ''}`
    );
    window.location.href = `mailto:hello@mulvium.org?subject=${subject}&body=${body}`;
    showSuccess();
  }
});

function showSuccess() {
  ciSuccess.style.display = 'flex';
  document.dispatchEvent(new CustomEvent('mulvium:card-sent'));
}

function resetBtn(btn, html) {
  btn.disabled = false;
  btn.innerHTML = html;
}
