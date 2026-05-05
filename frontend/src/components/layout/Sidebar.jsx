import { NavLink } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import { mainNavItems } from '../../config/menuConfig';
import './AppLayout.css';

export default function Sidebar() {
  const { user, loading } = useAuthUser();

  const links = mainNavItems.filter((item) => {
    if (loading) {
      return item.to === '/';
    }
    try {
      return item.when(user);
    } catch {
      return false;
    }
  });

  return (
    <aside className="app-sidebar">
      <nav className="app-sidebar__nav" aria-label="Main">
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `app-sidebar__link${isActive ? ' app-sidebar__link--active' : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
