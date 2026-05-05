import { useLocation } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import { isAdminUser } from '../../utils/rbacClient';
import AdminDashboard from './AdminDashboard';
import MemberDashboard from './MemberDashboard';

/** Picks administrator vs member experience based on backend role name. */
export default function DashboardView() {
  const location = useLocation();
  const { user, loading } = useAuthUser();

  if (loading) {
    return <p style={{ opacity: 0.75 }}>Loading your dashboard…</p>;
  }

  if (!user) {
    return <p style={{ opacity: 0.75 }}>Sign in to see your dashboard.</p>;
  }

  const showVerifyBanner =
    user.emailVerified === false ||
    location.state?.emailUnverified === true;

  return (
    <>
      {showVerifyBanner ? (
        <div
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 10,
            border: '1px solid rgba(234, 179, 8, 0.35)',
            background: 'rgba(234, 179, 8, 0.12)',
            fontSize: '0.9rem',
            lineHeight: 1.45,
          }}
        >
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Verify your email</strong>
          Some areas stay locked until verification completes. Check your inbox. In development, the
          API logs a URL with <code style={{ fontSize: '0.85em', opacity: 0.9 }}>?token=</code> —
          open it in this browser to finish.
        </div>
      ) : null}
      {isAdminUser(user) ? <AdminDashboard /> : <MemberDashboard />}
    </>
  );
}
