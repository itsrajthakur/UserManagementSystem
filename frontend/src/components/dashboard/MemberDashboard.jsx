import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import { getEffectivePermissions, hasPermission } from '../../utils/rbacClient';
import { RESOURCES, ACTIONS } from '../../constants/rbac';
import './Dashboard.css';

export default function MemberDashboard() {
  const { user } = useAuthUser();
  const permissions = useMemo(() => getEffectivePermissions(user), [user]);

  const canSeeUsers = hasPermission(user, RESOURCES.USERS, ACTIONS.READ);
  const canSeeRoles = hasPermission(user, RESOURCES.ROLES, ACTIONS.READ);

  return (
    <section className="dash-stack">
      <div>
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.35rem' }}>Employee dashboard</h1>
        <p className="dash-intro">
          Limited workspace view. Extra capabilities only appear when your role or custom grants allow
          them.
        </p>
      </div>

      <div className="dash-cards">
        <div className="dash-card">
          <h3>Your profile</h3>
          <p>Update your own details and avatar from the profile entry points in the app shell.</p>
          <p className="dash-muted">
            Signed in as <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        <div className="dash-card">
          <h3>Granted actions</h3>
          <p>Union of role permissions and any admin-assigned custom permissions.</p>
          {permissions.length === 0 ? (
            <p className="dash-muted">No explicit grants yet — Employee role defaults may be empty.</p>
          ) : (
            <div className="dash-badges">
              {permissions.map((p) => (
                <span key={`${p.resource}:${p.action}`} className="dash-badge">
                  {p.resource}:{p.action}
                </span>
              ))}
            </div>
          )}
        </div>

        {(canSeeUsers || canSeeRoles) && (
          <div className="dash-card">
            <h3>Optional navigation</h3>
            <p className="dash-placeholder">
              When you hold read access to users or roles, matching items also appear in the sidebar.
            </p>
            {canSeeUsers ? (
              <Link className="dash-card-link" to="/users">
                Users (read) →
              </Link>
            ) : null}
            {canSeeRoles ? (
              <Link className="dash-card-link" to="/roles" style={{ display: 'block', marginTop: 8 }}>
                Roles (read) →
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
