const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateProfileUpdate({ name, email }) {
  const errors = {};
  if (name !== undefined && name !== null) {
    const n = String(name).trim();
    if (!n) errors.name = 'Name cannot be empty';
    else if (n.length > 120) errors.name = 'Name must be at most 120 characters';
  }
  if (email !== undefined && email !== null) {
    const e = String(email).trim();
    if (!e) errors.email = 'Email cannot be empty';
    else if (!EMAIL_REGEX.test(e)) errors.email = 'Invalid email';
  }
  return errors;
}

export function isEmptyErrors(obj) {
  return Object.keys(obj).length === 0;
}
