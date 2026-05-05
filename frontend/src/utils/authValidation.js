/**
 * Client-side rules aligned with backend `auth.validators.js`.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginForm({ email, password }) {
  const errors = {};
  const em = typeof email === 'string' ? email.trim() : '';

  if (!em) errors.email = 'Email is required';
  else if (!EMAIL_REGEX.test(em)) errors.email = 'Invalid email';

  if (!password || String(password).length === 0) {
    errors.password = 'Password is required';
  }

  return errors;
}

export function validateSignupForm({ name, email, password }) {
  const errors = {};
  const n = typeof name === 'string' ? name.trim() : '';
  const em = typeof email === 'string' ? email.trim() : '';
  const pw = typeof password === 'string' ? password : '';

  if (!n) errors.name = 'Name is required';
  else if (n.length > 120) errors.name = 'Name must be at most 120 characters';

  if (!em) errors.email = 'Email is required';
  else if (!EMAIL_REGEX.test(em)) errors.email = 'Invalid email';

  if (!pw) errors.password = 'Password is required';
  else {
    if (pw.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (!/\d/.test(pw)) errors.password = 'Password must contain at least one number';
    else if (!/[a-zA-Z]/.test(pw)) errors.password = 'Password must contain at least one letter';
  }

  return errors;
}

export function isEmpty(errors) {
  return Object.keys(errors).length === 0;
}
