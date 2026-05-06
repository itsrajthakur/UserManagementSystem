import { hasPermission } from '../utils/rbacClient';
import { RESOURCES, ACTIONS } from '../constants/rbac';

/**
 * Sidebar entries: `when(user)` after profile load.
 * While loading, Sidebar only shows safe items (see Sidebar.jsx).
 */
export const mainNavItems = [
  {
    to: '/',
    label: 'Dashboard',
    end: true,
    when: () => true,
  },
  {
    to: '/users',
    label: 'User management',
    when: (user) => hasPermission(user, RESOURCES.USERS, ACTIONS.READ),
  },
  {
    to: '/roles',
    label: 'Roles & permissions',
    when: (user) =>
      hasPermission(user, RESOURCES.ROLES, ACTIONS.READ) ||
      hasPermission(user, RESOURCES.PERMISSIONS, ACTIONS.READ),
  },
];
