import { Link } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import { getEffectivePermissions } from '../../utils/rbacClient';
import './Dashboard.css';

export default function AdminDashboard() {
  const { user } = useAuthUser();
  const permissions = getEffectivePermissions(user);

  return (
    <section className="dash-stack">
      <div>
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.35rem' }}>Administrator dashboard</h1>
        <p className="dash-intro">
          Manage users and roles / permissions across the workspace.
        </p>
      </div>

      <div className="dash-cards">
        <div className="dash-card">
          <h3>Users</h3>
          <p>Create, deactivate, assign roles and custom grants via the API-connected UI scaffold.</p>
          <Link className="dash-card-link" to="/users">
            Open user management →
          </Link>
        </div>
        <div className="dash-card">
          <h3>Roles & permissions</h3>
          <p>Define RBAC payloads and audit who can mutate roles or permission records.</p>
          <Link className="dash-card-link" to="/roles">
            Open roles workspace →
          </Link>
        </div>
        <div className="dash-card">
          <h3>Effective access (you)</h3>
          <p>This account uses the Admin role shortcut (full bypass in route guards).</p>
          <div className="dash-badges" aria-hidden="true">
            {permissions.slice(0, 8).map((p) => (
              <span key={`${p.resource}:${p.action}`} className="dash-badge">
                {p.resource}:{p.action}
              </span>
            ))}
            {permissions.length > 8 ? (
              <span className="dash-badge">+{permissions.length - 8}</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
