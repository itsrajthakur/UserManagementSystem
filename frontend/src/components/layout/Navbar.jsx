import { Link, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import { clearStoredToken, getStoredToken } from '../../services/authService';
import './AppLayout.css';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const authed = Boolean(getStoredToken());

  function handleLogout() {
    clearStoredToken();
    navigate('/login', { replace: true });
  }

  return (
    <header className="app-navbar">
      <Link to={authed ? '/' : '/login'} className="app-navbar__brand-link">
        <div className="app-navbar__brand">User Management</div>
      </Link>
      <div className="app-navbar__actions">
        {!authed ? (
          <>
            <Link className="app-navbar__link" to="/login">
              Log in
            </Link>
            <Link className="app-navbar__link app-navbar__link--primary" to="/signup">
              Sign up
            </Link>
          </>
        ) : (
          <>
            {!loading && user?.role?.name ? (
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Role: {user.role.name}</span>
            ) : null}
            <button type="button" className="app-navbar__btn" onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
