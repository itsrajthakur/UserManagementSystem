import { useCallback, useEffect, useMemo, useState } from 'react';
import { rolesApi } from '../services/api';
import { ACTIONS } from '../constants/rbac';
import PageHeader from '../components/ui/PageHeader';
import SurfaceCard from '../components/ui/SurfaceCard';
import './AdminRolesPage.css';

function toMsg(err) {
  return err.response?.data?.message || err.message || 'Request failed.';
}

function slug(p) {
  return `${p.resource}:${p.action}`;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newPermissionResource, setNewPermissionResource] = useState('users');
  const [newPermissionAction, setNewPermissionAction] = useState(ACTIONS.READ);
  const [newPermissionDescription, setNewPermissionDescription] = useState('');

  const [roleEditName, setRoleEditName] = useState('');
  const [roleEditDescription, setRoleEditDescription] = useState('');
  const [rolePermissionIds, setRolePermissionIds] = useState([]);

  const selectedRole = useMemo(
    () => roles.find((r) => String(r._id) === String(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  const sortedPermissions = useMemo(
    () => [...perms].sort((a, b) => slug(a).localeCompare(slug(b))),
    [perms]
  );

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
      });
      setNewRoleName('');
      setNewRoleDescription('');
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
    if (!selectedRole) return;
    setMsg('');
    try {
      await rolesApi.updateRole(selectedRole._id, {
        name: roleEditName.trim(),
        description: roleEditDescription.trim(),
        permissionIds: rolePermissionIds,
      });
      setMsg('Role updated.');
      await refresh();
    } catch (err) {
      setMsg(toMsg(err));
    }
  }

  async function handleDeleteRole() {
    if (!selectedRole) return;
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
        <div className="admin-roles-page__layout">
          <SurfaceCard className="admin-roles-page__card">
            <h2 className="admin-roles-page__sub">Create role</h2>
            <form onSubmit={handleCreateRole} className="admin-roles-page__form">
              <label>
                Name
                <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} required />
              </label>
              <label>
                Description
                <input
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                />
              </label>
              <button className="admin-roles-page__btn" type="submit">
                Create role
              </button>
            </form>

            <h2 className="admin-roles-page__sub">Create permission</h2>
            <form onSubmit={handleCreatePermission} className="admin-roles-page__form">
              <label>
                Resource
                <input
                  value={newPermissionResource}
                  onChange={(e) => setNewPermissionResource(e.target.value)}
                  required
                />
              </label>
              <label>
                Action
                <select
                  value={newPermissionAction}
                  onChange={(e) => setNewPermissionAction(e.target.value)}
                >
                  {Object.values(ACTIONS).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <input
                  value={newPermissionDescription}
                  onChange={(e) => setNewPermissionDescription(e.target.value)}
                />
              </label>
              <button className="admin-roles-page__btn" type="submit">
                Create permission
              </button>
            </form>
          </SurfaceCard>

          <SurfaceCard className="admin-roles-page__card">
            <h2 className="admin-roles-page__sub">Manage role</h2>
            {roles.length === 0 ? (
              <p className="admin-roles-page__muted">No roles found.</p>
            ) : (
              <>
                <label>
                  Role
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="admin-roles-page__select"
                  >
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedRole ? (
                  <form onSubmit={handleSaveRole} className="admin-roles-page__form">
                    <label>
                      Name
                      <input
                        value={roleEditName}
                        onChange={(e) => setRoleEditName(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Description
                      <input
                        value={roleEditDescription}
                        onChange={(e) => setRoleEditDescription(e.target.value)}
                      />
                    </label>
                    <div className="admin-roles-page__perm-list">
                      {sortedPermissions.map((p) => {
                        const key = String(p._id);
                        return (
                          <label key={key} className="admin-roles-page__perm-item">
                            <input
                              type="checkbox"
                              checked={rolePermissionIds.includes(key)}
                              onChange={() => togglePermissionId(key)}
                            />
                            <span>{slug(p)}</span>
                            {p.description ? (
                              <small className="admin-roles-page__muted"> — {p.description}</small>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>

                    <div className="admin-roles-page__row">
                      <button className="admin-roles-page__btn" type="submit">
                        Save role
                      </button>
                      <button
                        className="admin-roles-page__btn admin-roles-page__btn--danger"
                        type="button"
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
            <h2 className="admin-roles-page__sub">Permission catalog</h2>
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
      )}
    </div>
  );
}
