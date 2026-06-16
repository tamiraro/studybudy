/* =============================================
   LOGIN FORM — VALIDATION & INTERACTIVITY

   Validation is intentionally minimal on the login form:
   - We only check that the fields are not empty.
   - We do NOT reveal whether the username or password is
     wrong separately (security best practice — giving specific
     feedback helps attackers enumerate valid usernames).
   - Detailed format checks are skipped; the server will reject
     malformed credentials anyway.

   Same blur-then-live strategy as signup.js:
   validate on blur, then re-validate on every keystroke
   after the field has been touched.
   ============================================= */

/* ── DOM references ─────────────────────────── */
const form            = document.getElementById('loginForm');
const identifierInput = document.getElementById('identifier');
const passwordInput   = document.getElementById('loginPassword');
const submitBtn       = document.querySelector('.btn-submit');

/* =============================================
   VALIDATORS
   ============================================= */

function validateIdentifier(value) {
  if (!value.trim()) return { ok: false, msg: 'Please enter your username or email.' };
  return { ok: true };
}

function validatePassword(value) {
  if (!value) return { ok: false, msg: 'Please enter your password.' };
  return { ok: true };
}

/* =============================================
   ERROR / SUCCESS DISPLAY HELPERS
   (same pattern as signup.js)
   ============================================= */

function showError(input, errorEl, msg) {
  input.classList.add('invalid');
  input.classList.remove('valid');
  errorEl.textContent = msg;
  errorEl.classList.add('visible');
}

function clearError(input, errorEl) {
  input.classList.remove('invalid');
  input.classList.add('valid');
  errorEl.textContent = '';
  errorEl.classList.remove('visible');
}

/* =============================================
   FIELD-LEVEL VALIDATION RUNNERS
   ============================================= */

function runIdentifier() {
  const r = validateIdentifier(identifierInput.value);
  r.ok
    ? clearError(identifierInput, document.getElementById('identifierError'))
    : showError(identifierInput, document.getElementById('identifierError'), r.msg);
  return r.ok;
}

function runPassword() {
  const r = validatePassword(passwordInput.value);
  r.ok
    ? clearError(passwordInput, document.getElementById('loginPasswordError'))
    : showError(passwordInput, document.getElementById('loginPasswordError'), r.msg);
  return r.ok;
}

/* =============================================
   BLUR LISTENERS
   ============================================= */
identifierInput.addEventListener('blur', runIdentifier);
passwordInput.addEventListener('blur',   runPassword);

/* =============================================
   LIVE LISTENERS — re-validate after first touch
   ============================================= */
function makeLiveValidator(inputEl, runner) {
  let touched = false;
  inputEl.addEventListener('blur',  () => { touched = true; });
  inputEl.addEventListener('input', () => { if (touched) runner(); });
}

makeLiveValidator(identifierInput, runIdentifier);
makeLiveValidator(passwordInput,   runPassword);

/* =============================================
   PASSWORD VISIBILITY TOGGLE
   ============================================= */
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input    = document.getElementById(btn.getAttribute('data-target'));
    const isHidden = input.type === 'password';
    input.type      = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '🙈' : '👁';
  });
});

/* =============================================
   FORM SUBMIT
   ============================================= */
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const allValid = [runIdentifier(), runPassword()].every(Boolean);

  if (!allValid) {
    /* Shake the submit button */
    submitBtn.classList.remove('shake');
    void submitBtn.offsetWidth; /* force reflow so animation restarts */
    submitBtn.classList.add('shake');
    submitBtn.addEventListener('animationend', () => submitBtn.classList.remove('shake'), { once: true });

    /* Focus the first invalid field */
    const firstInvalid = form.querySelector('.invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  /* ── All valid: look up stored user ── */
  const identifier = identifierInput.value.trim();
  const stored     = JSON.parse(localStorage.getItem('sb_user') || 'null');

  /* Client-side only: accept the login if a matching account exists in localStorage.
     In a real app this check happens server-side. */
  const match = stored && (
    stored.username === identifier ||
    stored.email    === identifier
  );

  if (!match) {
    showError(identifierInput, document.getElementById('identifierError'),
      'Account not found. Please check your details or sign up.');
    return;
  }

  /* Persist the session and go to the dashboard */
  localStorage.setItem('sb_user', JSON.stringify(stored));
  window.location.href = 'dashboard.html';
});
