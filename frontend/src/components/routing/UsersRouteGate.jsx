import { Navigate } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import { hasPermission } from '../../utils/rbacClient';
import { RESOURCES, ACTIONS } from '../../constants/rbac';
import AdminUsersPage from '../../pages/AdminUsersPage';
import MemberUsersExplorePage from '../../pages/MemberUsersExplorePage';

/** Permission-driven gate: CRUD grants => management UI, read-only grant => directory view. */
export default function UsersRouteGate() {
  const { user, loading } = useAuthUser();

  if (loading) {
    return <p style={{ padding: '1rem', opacity: 0.75 }}>Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const canManageUsers =
    hasPermission(user, RESOURCES.USERS, ACTIONS.CREATE) ||
    hasPermission(user, RESOURCES.USERS, ACTIONS.UPDATE) ||
    hasPermission(user, RESOURCES.USERS, ACTIONS.DELETE);

  if (canManageUsers) {
    return <AdminUsersPage />;
  }

  if (hasPermission(user, RESOURCES.USERS, ACTIONS.READ)) {
    return <MemberUsersExplorePage />;
  }

  return <Navigate to="/" replace />;
}
