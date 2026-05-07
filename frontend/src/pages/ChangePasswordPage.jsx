import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../context/AuthUserContext';
import { changeMyPassword } from '../services/userService';
import './ProfilePage.css';

function formatError(err) {
  const body = err.response?.data;
  if (!body) return err.message ?? 'Failed to update password';
  if (typeof body.message === 'string') return body.message;
  return 'Failed to update password';
}

function validatePasswordStrength(value) {
  if (!value || value.length < 8) return 'At least 8 characters are required.';
  if (!/[a-zA-Z]/.test(value)) return 'Include at least one letter.';
  if (!/\d/.test(value)) return 'Include at least one number.';
  return '';
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useAuthUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      setError(strengthError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setSubmitting(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      await refreshUser();
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/', { replace: true }), 700);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <h1 className="profile-page__title">Change Password</h1>
        <p className="profile-page__subtitle">
          Use a strong password with at least 8 characters, including letters and numbers.
        </p>
        {user?.mustChangePassword ? (
          <p className="profile-page__banner profile-page__banner--error">
            You must reset your password before accessing the dashboard.
          </p>
        ) : null}
      </header>

      <section className="profile-card profile-card--form">
        <h2 className="profile-card__title">Security</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="profile-page__field">
            <label htmlFor="cp-current-pw">Current password</label>
            <input
              id="cp-current-pw"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(ev) => setCurrentPassword(ev.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="profile-page__field">
            <label htmlFor="cp-new-pw">New password</label>
            <input
              id="cp-new-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="profile-page__field">
            <label htmlFor="cp-confirm-pw">Confirm new password</label>
            <input
              id="cp-confirm-pw"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              disabled={submitting}
            />
          </div>

          {error ? <p className="profile-page__banner profile-page__banner--error">{error}</p> : null}
          {success ? <p className="profile-page__banner profile-page__banner--ok">{success}</p> : null}

          <button type="submit" className="profile-page__btn" disabled={submitting}>
            {submitting ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  );
}
