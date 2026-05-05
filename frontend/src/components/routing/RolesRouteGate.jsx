import { Navigate } from 'react-router-dom';
import { useAuthUser } from '../../context/AuthUserContext';
import { hasPermission } from '../../utils/rbacClient';
import { RESOURCES, ACTIONS } from '../../constants/rbac';
import AdminRolesPage from '../../pages/AdminRolesPage';
import MemberRolesExplorePage from '../../pages/MemberRolesExplorePage';

export default function RolesRouteGate() {
  const { user, loading } = useAuthUser();

  if (loading) {
    return <p style={{ padding: '1rem', opacity: 0.75 }}>Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const canManageRoles =
    hasPermission(user, RESOURCES.ROLES, ACTIONS.CREATE) ||
    hasPermission(user, RESOURCES.ROLES, ACTIONS.UPDATE) ||
    hasPermission(user, RESOURCES.ROLES, ACTIONS.DELETE) ||
    hasPermission(user, RESOURCES.PERMISSIONS, ACTIONS.CREATE) ||
    hasPermission(user, RESOURCES.PERMISSIONS, ACTIONS.UPDATE) ||
    hasPermission(user, RESOURCES.PERMISSIONS, ACTIONS.DELETE);

  if (canManageRoles) {
    return <AdminRolesPage />;
  }

  if (hasPermission(user, RESOURCES.ROLES, ACTIONS.READ)) {
    return <MemberRolesExplorePage />;
  }

  return <Navigate to="/" replace />;
}
