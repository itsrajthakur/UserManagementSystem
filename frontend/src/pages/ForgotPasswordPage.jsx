import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { forgotPassword as forgotApi, getStoredToken } from '../services/authService';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (getStoredToken()) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setPending(true);
    try {
      const res = await forgotApi({ email: email.trim() });
      if (res.success) setMessage(res.message || 'Check your inbox.');
      else setError('Request failed');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot password</h1>
        <p className="auth-card__subtitle">
          Enter your account email. If it exists, you will receive reset instructions (in production via
          email; in development check the API server logs for a reset URL).
        </p>

        {message ? <div className="auth-banner auth-banner--success">{message}</div> : null}
        {error ? <div className="auth-banner">{error}</div> : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
    </div>
  );
}
