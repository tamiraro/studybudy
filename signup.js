/* =============================================
   SIGNUP FORM — VALIDATION & INTERACTIVITY

   Strategy:
   - On blur: validate that single field and show/clear its error.
   - On input (after first blur): re-validate live so the error
     clears as soon as the user fixes it.
   - On submit: validate every field; if anything fails, scroll to
     the first error and shake the submit button.

   Each validator returns { ok: true } or { ok: false, msg: '...' }.
   showError / clearError toggle the .invalid / .valid classes on
   the input and the .visible class on the error <span>.
   ============================================= */

/* ── DOM references ─────────────────────────── */
const form              = document.getElementById('signupForm');
const firstNameInput    = document.getElementById('firstName');
const lastNameInput     = document.getElementById('lastName');
const emailInput        = document.getElementById('email');
const phoneInput        = document.getElementById('phone');
const passwordInput     = document.getElementById('password');
const confirmInput      = document.getElementById('confirmPassword');
const rolePicker        = document.getElementById('rolePicker');
const coursesPicker     = document.querySelector('.courses-picker');
const submitBtn         = document.querySelector('.btn-submit');

/* =============================================
   VALIDATORS
   Each returns { ok, msg } where msg is only
   used when ok === false.
   ============================================= */

function validateName(value, label) {
  if (!value.trim()) return { ok: false, msg: `${label} is required.` };
  /* Only letters, spaces, hyphens, and apostrophes (handles names like O'Brien) */
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/.test(value.trim()))
    return { ok: false, msg: `${label} can only contain letters.` };
  if (value.trim().length < 2)
    return { ok: false, msg: `${label} must be at least 2 characters.` };
  return { ok: true };
}

function validateEmail(value) {
  if (!value.trim()) return { ok: false, msg: 'Email address is required.' };
  /* Standard email pattern */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return { ok: false, msg: 'Please enter a valid email address.' };
  return { ok: true };
}

function validatePhone(value) {
  if (!value.trim()) return { ok: false, msg: 'Phone number is required.' };
  /* Allows digits, spaces, dashes, dots, parentheses, leading +.
     Requires at least 7 digits total. */
  const digitsOnly = value.replace(/\D/g, '');
  if (!/^[+\d][\d\s\-().]+$/.test(value.trim()))
    return { ok: false, msg: 'Phone number contains invalid characters.' };
  if (digitsOnly.length < 7)
    return { ok: false, msg: 'Phone number must have at least 7 digits.' };
  if (digitsOnly.length > 15)
    return { ok: false, msg: 'Phone number is too long.' };
  return { ok: true };
}

function validateRole() {
  const selected = form.querySelector('input[name="role"]:checked');
  if (!selected) return { ok: false, msg: 'Please select Student or Teacher.' };
  return { ok: true };
}

function validateCourses() {
  const checked = form.querySelectorAll('input[name="courses"]:checked');
  if (checked.length === 0)
    return { ok: false, msg: 'Please select at least one course.' };
  return { ok: true };
}

function validatePassword(value) {
  if (!value) return { ok: false, msg: 'Password is required.' };
  if (value.length < 8)
    return { ok: false, msg: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(value))
    return { ok: false, msg: 'Password must contain at least one uppercase letter.' };
  if (!/[0-9]/.test(value))
    return { ok: false, msg: 'Password must contain at least one number.' };
  return { ok: true };
}

function validateConfirm(value) {
  if (!value) return { ok: false, msg: 'Please confirm your password.' };
  if (value !== passwordInput.value)
    return { ok: false, msg: 'Passwords do not match.' };
  return { ok: true };
}

/* =============================================
   ERROR / SUCCESS DISPLAY HELPERS
   ============================================= */

/* Show an error on a standard text/email/tel/password input */
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

/* Show/clear error for the role picker (no single input to mark) */
function showPickerError(pickerEl, errorEl, msg) {
  pickerEl.classList.add('invalid');
  errorEl.textContent = msg;
  errorEl.classList.add('visible');
}

function clearPickerError(pickerEl, errorEl) {
  pickerEl.classList.remove('invalid');
  errorEl.textContent = '';
  errorEl.classList.remove('visible');
}

/* =============================================
   FIELD-LEVEL VALIDATION RUNNERS
   Called on blur and live (after first touch).
   Return true if valid, false if not.
   ============================================= */

function runFirstName() {
  const r = validateName(firstNameInput.value, 'First name');
  r.ok
    ? clearError(firstNameInput, document.getElementById('firstNameError'))
    : showError(firstNameInput, document.getElementById('firstNameError'), r.msg);
  return r.ok;
}

function runLastName() {
  const r = validateName(lastNameInput.value, 'Last name');
  r.ok
    ? clearError(lastNameInput, document.getElementById('lastNameError'))
    : showError(lastNameInput, document.getElementById('lastNameError'), r.msg);
  return r.ok;
}

function runEmail() {
  const r = validateEmail(emailInput.value);
  r.ok
    ? clearError(emailInput, document.getElementById('emailError'))
    : showError(emailInput, document.getElementById('emailError'), r.msg);
  return r.ok;
}

function runPhone() {
  const r = validatePhone(phoneInput.value);
  r.ok
    ? clearError(phoneInput, document.getElementById('phoneError'))
    : showError(phoneInput, document.getElementById('phoneError'), r.msg);
  return r.ok;
}

function runRole() {
  const r = validateRole();
  r.ok
    ? clearPickerError(rolePicker, document.getElementById('roleError'))
    : showPickerError(rolePicker, document.getElementById('roleError'), r.msg);
  return r.ok;
}

function runCourses() {
  const r = validateCourses();
  r.ok
    ? clearPickerError(coursesPicker, document.getElementById('coursesError'))
    : showPickerError(coursesPicker, document.getElementById('coursesError'), r.msg);
  return r.ok;
}

function runPassword() {
  const r = validatePassword(passwordInput.value);
  r.ok
    ? clearError(passwordInput, document.getElementById('passwordError'))
    : showError(passwordInput, document.getElementById('passwordError'), r.msg);
  return r.ok;
}

function runConfirm() {
  const r = validateConfirm(confirmInput.value);
  r.ok
    ? clearError(confirmInput, document.getElementById('confirmPasswordError'))
    : showError(confirmInput, document.getElementById('confirmPasswordError'), r.msg);
  return r.ok;
}

/* =============================================
   BLUR LISTENERS — validate on leave
   ============================================= */
firstNameInput.addEventListener('blur', runFirstName);
lastNameInput.addEventListener('blur',  runLastName);
emailInput.addEventListener('blur',     runEmail);
phoneInput.addEventListener('blur',     runPhone);
passwordInput.addEventListener('blur',  runPassword);
confirmInput.addEventListener('blur',   runConfirm);

/* =============================================
   LIVE (INPUT) LISTENERS — re-validate while typing,
   but only after the field has been touched once (blur).
   This avoids showing errors before the user has had
   a chance to fill in the field.
   ============================================= */
function makeLiveValidator(inputEl, runner) {
  let touched = false;
  inputEl.addEventListener('blur', () => { touched = true; });
  inputEl.addEventListener('input', () => { if (touched) runner(); });
}

makeLiveValidator(firstNameInput, runFirstName);
makeLiveValidator(lastNameInput,  runLastName);
makeLiveValidator(emailInput,     runEmail);
makeLiveValidator(phoneInput,     runPhone);
makeLiveValidator(passwordInput,  () => { runPassword(); if (confirmInput.value) runConfirm(); });
makeLiveValidator(confirmInput,   runConfirm);

/* =============================================
   ROLE CARDS — update .selected class on click
   ============================================= */
document.querySelectorAll('.role-card').forEach((card) => {
  card.addEventListener('click', () => {
    /* Deselect all cards, then select the clicked one */
    document.querySelectorAll('.role-card').forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    /* Clear the role error immediately when a choice is made */
    clearPickerError(rolePicker, document.getElementById('roleError'));
  });
});

/* =============================================
   COURSE CHECKBOX CARDS — toggle .selected on click
   ============================================= */
document.querySelectorAll('.course-checkbox-card').forEach((card) => {
  card.addEventListener('click', () => {
    /* Toggle is handled by the browser (checkbox state changes automatically).
       We mirror the checkbox state as a .selected class on the card for styling. */
    const cb = card.querySelector('input[type="checkbox"]');
    /* Use setTimeout(0) so the click event updates cb.checked before we read it */
    setTimeout(() => {
      card.classList.toggle('selected', cb.checked);
      /* Clear courses error as soon as at least one course is chosen */
      if (document.querySelectorAll('input[name="courses"]:checked').length > 0)
        clearPickerError(coursesPicker, document.getElementById('coursesError'));
    }, 0);
  });
});

/* =============================================
   PASSWORD STRENGTH BAR
   Scores the password on four criteria; each met
   criterion adds 1 point (0–4). The bar segments
   fill and change color progressively.
   ============================================= */
const segments    = [
  document.getElementById('seg1'),
  document.getElementById('seg2'),
  document.getElementById('seg3'),
  document.getElementById('seg4'),
];
const strengthLabel = document.getElementById('strengthLabel');

const STRENGTH_LEVELS = [
  { label: '',       colorClass: '' },          /* 0 — empty */
  { label: 'Weak',   colorClass: 'weak' },      /* 1 */
  { label: 'Fair',   colorClass: 'fair' },      /* 2 */
  { label: 'Good',   colorClass: 'good' },      /* 3 */
  { label: 'Strong', colorClass: 'strong' },    /* 4 */
];

function scorePassword(val) {
  let score = 0;
  if (val.length >= 8)          score++; /* length */
  if (/[A-Z]/.test(val))        score++; /* uppercase */
  if (/[0-9]/.test(val))        score++; /* digit */
  if (/[^A-Za-z0-9]/.test(val)) score++; /* special character */
  return score;
}

passwordInput.addEventListener('input', () => {
  const score = scorePassword(passwordInput.value);
  const level = STRENGTH_LEVELS[score];

  segments.forEach((seg, i) => {
    /* Clear all color classes first */
    seg.classList.remove('weak', 'fair', 'good', 'strong');
    /* Fill segments up to the score */
    if (i < score) seg.classList.add(level.colorClass);
  });

  strengthLabel.textContent = passwordInput.value ? level.label : '';
});

/* =============================================
   PASSWORD VISIBILITY TOGGLE
   Clicking the 👁 button switches the input between
   type="password" and type="text".
   ============================================= */
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const input    = document.getElementById(targetId);
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '🙈' : '👁';
  });
});

/* =============================================
   FORM SUBMIT — validate all fields at once
   ============================================= */
form.addEventListener('submit', (e) => {
  e.preventDefault(); /* prevent native browser submission */

  /* Run all validators and collect results */
  const results = [
    runFirstName(),
    runLastName(),
    runEmail(),
    runPhone(),
    runRole(),
    runCourses(),
    runPassword(),
    runConfirm(),
  ];

  const allValid = results.every(Boolean);

  if (!allValid) {
    /* Shake the submit button to signal failure */
    submitBtn.classList.remove('shake'); /* reset before re-adding */
    void submitBtn.offsetWidth;          /* force reflow so animation restarts */
    submitBtn.classList.add('shake');
    submitBtn.addEventListener('animationend', () => submitBtn.classList.remove('shake'), { once: true });

    /* Scroll to the first invalid field so the user sees it */
    const firstInvalid = form.querySelector('.invalid, .role-picker.invalid, .courses-picker.invalid');
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return;
  }

  /* ── All valid: collect form data ── */
  const data = {
    firstName: firstNameInput.value.trim(),
    lastName:  lastNameInput.value.trim(),
    email:     emailInput.value.trim(),
    phone:     phoneInput.value.trim(),
    role:      form.querySelector('input[name="role"]:checked').value,
    courses:   [...form.querySelectorAll('input[name="courses"]:checked')].map((cb) => cb.value),
    /* Never log passwords in production — this is a placeholder */
  };

  /* Placeholder: log to console until a backend is connected */
  console.log('Sign up submitted:', data);
  alert(`Welcome, ${data.firstName}! Account creation will be wired up to a backend soon.`);
});
