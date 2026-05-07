import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../context/AuthUserContext';
import { signup as signupApi, setStoredToken, getStoredToken } from '../services/authService';
import { validateSignupForm, isEmpty } from '../utils/authValidation';
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

export default function SignupPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuthUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  if (getStoredToken()) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const errors = validateSignupForm({
      name,
      email: email.trim(),
      password,
    });
    setFieldErrors(errors);
    if (!isEmpty(errors)) return;

    setPending(true);
    try {
      const res = await signupApi({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      const token = res?.data?.token;
      if (res.success && token) {
        setStoredToken(token);
        await refreshUser();
        navigate('/', { replace: true });
        return;
      }

      if (res.success && res?.data?.needsEmailVerification) {
        navigate('/login', {
          replace: true,
          state: {
            banner:
              res.message ||
              'Account created. Check your email (or API logs in development) for a verification link before using secured APIs.',
          },
        });
        return;
      }

      setFormError(res.message || 'Signup failed');
    } catch (err) {
      setFormError(formatApiError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="auth-card__subtitle">
          New accounts use the Employee role. You may need to verify your email depending on server
          settings.
        </p>

        {formError ? <div className="auth-banner">{formError}</div> : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="signup-name">Name</label>
            <input
              id="signup-name"
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? (
              <p className="auth-field__error">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="auth-field__error">{fieldErrors.password}</p>
            ) : null}
          </div>

          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
