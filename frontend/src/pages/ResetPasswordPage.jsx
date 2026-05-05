import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword as resetApi, getStoredToken } from '../services/authService';
import './AuthForm.css';

function formatApiError(err) {
  const body = err.response?.data;
  if (!body) return err.message || 'Request failed';
  if (typeof body.message === 'string') return body.message;
  if (Array.isArray(body.errors) && body.errors.length) {
    return body.errors.map((e) => e.message || `${e.field}: invalid`).join(' ');
  }
  return 'Request failed';
}

function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'At least 8 characters';
  if (!/\d/.test(pw)) return 'Include at least one number';
  if (!/[a-zA-Z]/.test(pw)) return 'Include at least one letter';
  return '';
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => (params.get('token') || '').trim(), [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    const pErr = validatePassword(password);
    if (pErr) {
      setError(pErr);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setPending(true);
    try {
      const res = await resetApi({ token, password });
      if (res.success) setMessage(res.message || 'Password updated. You can sign in.');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Invalid link</h1>
          <p className="auth-card__subtitle">This reset link is missing a token.</p>
          <p className="auth-footer">
            <Link to="/forgot-password">Request a new link</Link> · <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    );
  }

  const loggedIn = Boolean(getStoredToken());

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Set a new password</h1>
        <p className="auth-card__subtitle">
          Choose a strong password. If you are still logged in elsewhere, existing sessions remain
          valid until tokens expire unless you rotate secrets.
        </p>

        {message ? (
          <div className="auth-banner auth-banner--success">{message}</div>
        ) : null}
        {error ? <div className="auth-banner">{error}</div> : null}

        {message ? (
          <p className="auth-footer">
            <Link to="/login">Go to log in</Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="reset-password">New password</label>
              <input
                id="reset-password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="reset-confirm">Confirm password</label>
              <input
                id="reset-confirm"
                type="password"
                name="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(ev) => setConfirm(ev.target.value)}
              />
            </div>
            <button type="submit" className="auth-submit" disabled={pending}>
              {pending ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}

        {!message ? (
          <p className="auth-footer">
            <Link to="/login">Back to log in</Link>
            {loggedIn ? (
              <>
                {' '}
                · <Link to="/">Home</Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
