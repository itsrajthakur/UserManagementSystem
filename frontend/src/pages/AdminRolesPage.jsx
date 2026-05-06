import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthUser } from '../context/AuthUserContext';
import { rolesApi } from '../services/api';
import { ACTIONS, ROLE_LEVEL, inferRoleLevelFromRole, inferUserRoleLevel } from '../constants/rbac';
import { canEditRoleDefinitionInUi } from '../utils/rbacClient';
import PageHeader from '../components/ui/PageHeader';
import SurfaceCard from '../components/ui/SurfaceCard';
import './AdminRolesPage.css';

function toMsg(err) {
  return err.response?.data?.message || err.message || 'Request failed.';
}

function slug(p) {
  return `${p.resource}:${p.action}`;
}

function titleText(value) {
  if (!value) return '';
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

export default function AdminRolesPage() {
  const { user: me } = useAuthUser();
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState(ROLE_LEVEL.EMPLOYEE);
  const [newRoleIsActive, setNewRoleIsActive] = useState(true);
  const [newPermissionResource, setNewPermissionResource] = useState('users');
  const [newPermissionAction, setNewPermissionAction] = useState(ACTIONS.READ);
  const [newPermissionDescription, setNewPermissionDescription] = useState('');

  const [roleEditName, setRoleEditName] = useState('');
  const [roleEditDescription, setRoleEditDescription] = useState('');
  const [roleEditLevel, setRoleEditLevel] = useState(ROLE_LEVEL.EMPLOYEE);
  const [roleEditIsActive, setRoleEditIsActive] = useState(true);
  const [rolePermissionIds, setRolePermissionIds] = useState([]);

  const selectedRole = useMemo(
    () => roles.find((r) => String(r._id) === String(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  const sortedPermissions = useMemo(
    () => [...perms].sort((a, b) => slug(a).localeCompare(slug(b))),
    [perms]
  );
  const actionColumns = useMemo(() => Object.values(ACTIONS), []);
  const permissionMatrix = useMemo(() => {
    const matrix = new Map();
    sortedPermissions.forEach((permission) => {
      const resourceKey = String(permission.resource || '').toLowerCase();
      if (!resourceKey) return;
      if (!matrix.has(resourceKey)) matrix.set(resourceKey, new Map());
      matrix.get(resourceKey).set(String(permission.action), permission);
    });
    return Array.from(matrix.entries()).map(([resource, actionMap]) => ({ resource, actionMap }));
  }, [sortedPermissions]);
  const roleCount = roles.length;
  const permissionCount = sortedPermissions.length;
  const myRoleLevel = inferUserRoleLevel(me);
  const isMyRoleActive = me?.role?.isActive !== false;
  const allowedRoleLevels = useMemo(() => {
    if (!Number.isFinite(myRoleLevel) || myRoleLevel <= 1) return [];
    return Array.from({ length: myRoleLevel - 1 }, (_, idx) => idx + 1).sort((a, b) => b - a);
  }, [myRoleLevel]);

  const canMutateRoleRow = Boolean(
    selectedRole && me && isMyRoleActive && canEditRoleDefinitionInUi(me, selectedRole)
  );
  const canUseAdminRoleTools = Boolean(me && isMyRoleActive && allowedRoleLevels.length > 0);
  const canMutatePermissionCatalog = canUseAdminRoleTools;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rBody, pBody] = await Promise.all([rolesApi.listRoles(), rolesApi.listPermissions()]);
      const roleList = Array.isArray(rBody?.data?.roles) ? rBody.data.roles : [];
      const permList = Array.isArray(pBody?.data?.permissions) ? pBody.data.permissions : [];
      setRoles(roleList);
      setPerms(permList);

      setSelectedRoleId((prev) => {
        if (!prev) return roleList[0]?._id || '';
        return roleList.some((r) => String(r._id) === String(prev)) ? prev : roleList[0]?._id || '';
      });
      if (!msg) setMsg('');
    } catch (err) {
      setMsg(toMsg(err));
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedRole) return;
    setRoleEditName(selectedRole.name || '');
    setRoleEditDescription(selectedRole.description || '');
    setRoleEditLevel(inferRoleLevelFromRole(selectedRole));
    setRoleEditIsActive(selectedRole.isActive !== false);
    setRolePermissionIds((selectedRole.permissions || []).map((p) => String(p._id)));
  }, [selectedRole]);

  function togglePermissionId(id) {
    const key = String(id);
    setRolePermissionIds((prev) =>
      prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]
    );
  }

  async function handleCreateRole(ev) {
    ev.preventDefault();
    setMsg('');
    try {
      await rolesApi.createRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        roleLevel: Number(newRoleLevel),
        isActive: Boolean(newRoleIsActive),
      });
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRoleLevel(allowedRoleLevels.at(-1) ?? ROLE_LEVEL.EMPLOYEE);
      setNewRoleIsActive(true);
      setMsg('Role created.');
      await refresh();
    } catch (err) {
      setMsg(toMsg(err));
    }
  }

  async function handleCreatePermission(ev) {
    ev.preventDefault();
    setMsg('');
    try {
      await rolesApi.createPermission({
        resource: newPermissionResource.trim().toLowerCase(),
        action: newPermissionAction,
        description: newPermissionDescription.trim(),
      });
      setNewPermissionDescription('');
      setMsg('Permission created.');
      await refresh();
    } catch (err) {
      setMsg(toMsg(err));
    }
  }

  async function handleSaveRole(ev) {
    ev.preventDefault();
    if (!selectedRole || !canMutateRoleRow) return;
    setMsg('');
    try {
      await rolesApi.updateRole(selectedRole._id, {
        name: roleEditName.trim(),
        description: roleEditDescription.trim(),
        roleLevel: Number(roleEditLevel),
        isActive: Boolean(roleEditIsActive),
        permissionIds: rolePermissionIds,
      });
      setMsg('Role updated.');
      await refresh();
    } catch (err) {
      setMsg(toMsg(err));
    }
  }

  async function handleDeleteRole() {
    if (!selectedRole || !canMutateRoleRow) return;
    if (!window.confirm(`Delete role "${selectedRole.name}"?`)) return;
    setMsg('');
    try {
      await rolesApi.deleteRole(selectedRole._id);
      setMsg('Role deleted.');
      await refresh();
    } catch (err) {
      setMsg(toMsg(err));
    }
  }

  async function handleDeletePermission(permission) {
    if (!permission) return;
    if (!window.confirm(`Delete permission "${permission.resource}:${permission.action}"?`)) return;
    setMsg('');
    try {
      await rolesApi.deletePermission(permission._id);
      setMsg('Permission deleted.');
      await refresh();
    } catch (err) {
      setMsg(toMsg(err));
    }
  }

  return (
    <div className="admin-roles-page">
      <PageHeader
        title="Roles & permissions"
        subtitle="Create permissions, create roles, and assign permission links directly from UI."
      />

      {msg ? <p className="admin-roles-page__banner">{msg}</p> : null}
      {loading ? (
        <p className="admin-roles-page__muted">Loading…</p>
      ) : (
        <>
          <div className="admin-roles-page__stats">
            <SurfaceCard className="admin-roles-page__stat-card">
              <p className="admin-roles-page__stat-label">Total roles</p>
              <strong className="admin-roles-page__stat-value">{roleCount}</strong>
            </SurfaceCard>
            <SurfaceCard className="admin-roles-page__stat-card">
              <p className="admin-roles-page__stat-label">Total permissions</p>
              <strong className="admin-roles-page__stat-value">{permissionCount}</strong>
            </SurfaceCard>
          </div>

          <div className="admin-roles-page__layout">
            <SurfaceCard className="admin-roles-page__card admin-roles-page__card--wide">
            <div className="admin-roles-page__section-head">
              <h2 className="admin-roles-page__sub">Manage role</h2>
              <p className="admin-roles-page__muted">
                Select a role, update details, and assign permissions.
              </p>
            </div>
            {roles.length === 0 ? (
              <p className="admin-roles-page__muted">No roles found.</p>
            ) : (
              <>
                <label className="admin-roles-page__field">
                  Role
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="admin-roles-page__select"
                  >
                    {roles.map((r) => (
                      <option style={{ color: 'black' }} key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedRole ? (
                  <form onSubmit={handleSaveRole} className="admin-roles-page__form">
                    {!canMutateRoleRow ? (
                      <p className="admin-roles-page__hint">
                        This role is read-only (system role or at/above your privilege level).
                      </p>
                    ) : null}
                    <div className="admin-roles-page__split">
                      <label>
                        Name
                        <input
                          value={roleEditName}
                          onChange={(e) => setRoleEditName(e.target.value)}
                          disabled={!canMutateRoleRow}
                          required
                        />
                      </label>
                      <label>
                        Description
                        <input
                          value={roleEditDescription}
                          onChange={(e) => setRoleEditDescription(e.target.value)}
                          disabled={!canMutateRoleRow}
                        />
                      </label>
              <label>
                Role level
                <select
                  value={roleEditLevel}
                  onChange={(e) => setRoleEditLevel(Number(e.target.value))}
                  disabled={!canMutateRoleRow}
                >
                  {allowedRoleLevels.map((level) => (
                    <option style={{ color: 'black' }} key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Active role
                <input
                  type="checkbox"
                  checked={roleEditIsActive}
                  onChange={(e) => setRoleEditIsActive(e.target.checked)}
                  disabled={!canMutateRoleRow}
                />
              </label>
                    </div>
                    <div className="admin-roles-page__perm-list">
                      <p className="admin-roles-page__perm-title">Permissions matrix</p>
                      <div className="admin-roles-page__matrix-wrap">
                        <table className="admin-roles-page__matrix">
                          <thead>
                            <tr>
                              <th scope="col">Resource</th>
                              {actionColumns.map((action) => (
                                <th scope="col" key={action}>
                                  {titleText(action)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {permissionMatrix.map(({ resource, actionMap }) => (
                              <tr key={resource}>
                                <th scope="row">{titleText(resource)}</th>
                                {actionColumns.map((action) => {
                                  const permission = actionMap.get(action);
                                  if (!permission) {
                                    return (
                                      <td key={`${resource}:${action}`}>
                                        <span
                                          className="admin-roles-page__matrix-empty"
                                          aria-label="Permission not defined"
                                        />
                                      </td>
                                    );
                                  }
                                  const key = String(permission._id);
                                  return (
                                    <td key={key}>
                                      <input
                                        className="admin-roles-page__matrix-check"
                                        type="checkbox"
                                        checked={rolePermissionIds.includes(key)}
                                        onChange={() => togglePermissionId(key)}
                                        disabled={!canMutateRoleRow}
                                        aria-label={`${resource} ${action}`}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="admin-roles-page__row">
                      <button className="admin-roles-page__btn" type="submit" disabled={!canMutateRoleRow}>
                        Save role
                      </button>
                      <button
                        className="admin-roles-page__btn admin-roles-page__btn--danger"
                        type="button"
                        disabled={!canMutateRoleRow}
                        onClick={handleDeleteRole}
                      >
                        Delete role
                      </button>
                    </div>
                  </form>
                ) : null}
              </>
            )}
            </SurfaceCard>

            <SurfaceCard className="admin-roles-page__card">
            <div className="admin-roles-page__section-head">
              <h2 className="admin-roles-page__sub">Quick actions</h2>
              <p className="admin-roles-page__muted">Create role and permission from one place.</p>
            </div>
            <h3 className="admin-roles-page__mini-sub">Create role</h3>
            <form onSubmit={handleCreateRole} className="admin-roles-page__form">
              <label>
                Name
                <input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  disabled={!canUseAdminRoleTools}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  disabled={!canUseAdminRoleTools}
                />
              </label>
              <label>
                Role level
                <select
                  value={newRoleLevel}
                  onChange={(e) => setNewRoleLevel(Number(e.target.value))}
                  disabled={!canUseAdminRoleTools}
                >
                  {allowedRoleLevels.map((level) => (
                    <option style={{ color: 'black' }} key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Active role
                <input
                  type="checkbox"
                  checked={newRoleIsActive}
                  onChange={(e) => setNewRoleIsActive(e.target.checked)}
                  disabled={!canUseAdminRoleTools}
                />
              </label>
              <button className="admin-roles-page__btn" type="submit" disabled={!canUseAdminRoleTools}>
                Create role
              </button>
            </form>
            {!isMyRoleActive ? (
              <p className="admin-roles-page__hint">Your role is inactive. Please contact admin.</p>
            ) : null}

            <h3 className="admin-roles-page__mini-sub">Create permission</h3>
            <form onSubmit={handleCreatePermission} className="admin-roles-page__form">
              <div className="admin-roles-page__split">
                <label>
                  Resource
                  <input
                    value={newPermissionResource}
                    onChange={(e) => setNewPermissionResource(e.target.value)}
                    disabled={!canUseAdminRoleTools}
                    required
                  />
                </label>
                <label>
                  Action
                  <select
                    value={newPermissionAction}
                    onChange={(e) => setNewPermissionAction(e.target.value)}
                    disabled={!canUseAdminRoleTools}
                  >
                    {Object.values(ACTIONS).map((a) => (
                      <option style={{ color: 'black' }} key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Description
                <input
                  value={newPermissionDescription}
                  onChange={(e) => setNewPermissionDescription(e.target.value)}
                  disabled={!canUseAdminRoleTools}
                />
              </label>
              <button className="admin-roles-page__btn" type="submit" disabled={!canUseAdminRoleTools}>
                Create permission
              </button>
            </form>
            </SurfaceCard>

            <SurfaceCard className="admin-roles-page__card admin-roles-page__card--full">
            <div className="admin-roles-page__section-head">
              <h2 className="admin-roles-page__sub">Permission catalog</h2>
              <p className="admin-roles-page__muted">Review all permissions and remove unused ones.</p>
            </div>
            {sortedPermissions.length === 0 ? (
              <p className="admin-roles-page__muted">No permissions found.</p>
            ) : (
              <ul className="admin-roles-page__perm-catalog">
                {sortedPermissions.map((p) => (
                  <li key={p._id}>
                    <code>{slug(p)}</code>
                    {p.description ? <span> — {p.description}</span> : null}
                    <button
                      className="admin-roles-page__btn admin-roles-page__btn--small admin-roles-page__btn--ghost"
                      type="button"
                      disabled={!canMutatePermissionCatalog}
                      onClick={() => handleDeletePermission(p)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            </SurfaceCard>
          </div>
        </>
      )}
    </div>
  );
}
