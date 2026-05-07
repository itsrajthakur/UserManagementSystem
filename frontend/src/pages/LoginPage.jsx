import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../context/AuthUserContext';
import { login as loginApi, setStoredToken, getStoredToken } from '../services/authService';
import { validateLoginForm, isEmpty } from '../utils/authValidation';
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

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuthUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const signupBanner = typeof location.state?.banner === 'string' ? location.state.banner : '';
  let blockedBanner = '';
  try {
    blockedBanner = sessionStorage.getItem('authBlockedMessage') || '';
    if (blockedBanner) sessionStorage.removeItem('authBlockedMessage');
  } catch {
    blockedBanner = '';
  }

  if (getStoredToken()) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const errors = validateLoginForm({
      email: email.trim(),
      password,
    });
    setFieldErrors(errors);
    if (!isEmpty(errors)) return;

    setPending(true);
    try {
      const res = await loginApi({
        email: email.trim(),
        password,
      });

      const token = res?.data?.token;
      if (res.success && token) {
        setStoredToken(token);
        await refreshUser();
        const needsVerify = Boolean(res?.data?.needsEmailVerification);
        const needsPasswordChange = Boolean(res?.data?.user?.mustChangePassword);
        const destination = needsPasswordChange ? '/change-password' : '/';
        const navState = needsPasswordChange
          ? { forcePasswordReset: true }
          : needsVerify
            ? { emailUnverified: true }
            : undefined;
        navigate(destination, { replace: true, state: navState });
        return;
      }

      setFormError(res.message || 'Login failed');
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Log in</h1>
        <p className="auth-card__subtitle">Use your email and password to continue.</p>

        {signupBanner ? (
          <div className="auth-banner auth-banner--success">{signupBanner}</div>
        ) : null}
        {blockedBanner ? <div className="auth-banner">{blockedBanner}</div> : null}
        {formError ? <div className="auth-banner">{formError}</div> : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? (
              <p className="auth-field__error">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="auth-field__error">{fieldErrors.password}</p>
            ) : null}
          </div>

          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.88rem' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p className="auth-footer">
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
