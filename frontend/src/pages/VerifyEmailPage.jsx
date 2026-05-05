import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  verifyEmail as verifyEmailApi,
  setStoredToken,
  getStoredToken,
} from '../services/authService';
import { useAuthUser } from '../context/AuthUserContext';
import './AuthForm.css';

function formatApiError(err) {
  const body = err.response?.data;
  if (!body) return err.message || 'Verification failed';
  if (typeof body.message === 'string') return body.message;
  return 'Verification failed';
}

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuthUser();

  const token = useMemo(() => (params.get('token') || '').trim(), [params]);
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setStatus('error');
        setMessage('This link is invalid or incomplete.');
        return;
      }

      try {
        const res = await verifyEmailApi(token);
        if (cancelled) return;
        if (res.success && res.data?.token) {
          setStoredToken(res.data.token);
          await refreshUser();
          setStatus('ok');
          setMessage(res.message || 'Email verified. Redirecting…');
          setTimeout(() => navigate('/', { replace: true }), 1200);
        } else {
          setStatus('error');
          setMessage(res.message || 'Verification failed.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(formatApiError(err));
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, refreshUser]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Email verification</h1>

        {status === 'pending' ? (
          <p className="auth-card__subtitle">Confirming your address…</p>
        ) : null}

        {status === 'ok' ? (
          <div className="auth-banner auth-banner--success">{message}</div>
        ) : null}

        {status === 'error' ? <div className="auth-banner">{message}</div> : null}

        <p className="auth-footer">
          {!getStoredToken() ? (
            <>
              <Link to="/login">Log in</Link> ·{' '}
            </>
          ) : null}
          <Link to="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
