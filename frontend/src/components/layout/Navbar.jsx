import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import { clearStoredToken, getStoredToken } from '../../services/authService';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import './AppLayout.css';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const authed = Boolean(getStoredToken());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const initials = useMemo(() => {
    const raw = String(user?.name || '').trim();
    if (!raw) return 'U';
    const parts = raw.split(/\s+/).slice(0, 2);
    return parts
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }, [user?.name]);
  const avatarUrl = resolveMediaUrl(user?.profilePic);

  function handleLogout() {
    clearStoredToken();
    setMenuOpen(false);
    navigate('/login', { replace: true });
  }

  function goToProfile() {
    setMenuOpen(false);
    navigate('/profile');
  }

  function goToPasswordSection() {
    setMenuOpen(false);
    navigate('/change-password');
  }

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onDocClick = (ev) => {
      if (menuRef.current && !menuRef.current.contains(ev.target)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (ev) => {
      if (ev.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

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
            <div className="app-navbar__profile" ref={menuRef}>
              <button
                type="button"
                className="app-navbar__profile-trigger"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="app-navbar__avatar" aria-hidden="true">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="app-navbar__avatar-image" />
                  ) : (
                    <span className="app-navbar__avatar-fallback">{initials}</span>
                  )}
                </span>
                <span className="app-navbar__profile-meta">
                  <strong>{loading ? 'Loading…' : user?.name || 'User'}</strong>
                  <small>{loading ? '—' : user?.role?.name || '—'}</small>
                </span>
                <span className="app-navbar__caret" aria-hidden="true">
                  ▾
                </span>
              </button>

              <div className={`app-navbar__dropdown${menuOpen ? ' app-navbar__dropdown--open' : ''}`} role="menu">
                <button type="button" className="app-navbar__dropdown-item" onClick={goToProfile}>
                  My Profile
                </button>
                <button type="button" className="app-navbar__dropdown-item" onClick={goToPasswordSection}>
                  Change Password
                </button>
                <button
                  type="button"
                  className="app-navbar__dropdown-item app-navbar__dropdown-item--danger"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
