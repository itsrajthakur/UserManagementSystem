import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthUser } from '../context/AuthUserContext';
import { ROLE_NAME } from '../constants/rbac';
import { canAssignRoleInUi, canManageAnotherUser } from '../utils/rbacClient';
import { userApi } from '../services/api/user.api.js';
import { rolesApi } from '../services/api/roles.api.js';
import PageHeader from '../components/ui/PageHeader';
import './AdminUsersPage.css';

function fmtErr(err) {
  const body = err.response?.data;
  if (typeof body?.message === 'string') return body.message;
  return err.message ?? 'Something went wrong.';
}

function permLabel(p) {
  return `${p.resource}:${p.action}`;
}

function UserEditorPanel({
  user,
  assignableRoles,
  permissionsSorted,
  selfId,
  actorUser,
  onClose,
  onRefresh,
}) {
  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [roleId, setRoleId] = useState(user.role?._id ?? '');
  const [isActive, setIsActive] = useState(Boolean(user.isActive));

  const [permModes, setPermModes] = useState({});

  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);

  const isSelf = String(user._id) === String(selfId);
  const canHierarchyEdit = Boolean(actorUser && !isSelf && canManageAnotherUser(actorUser, user));

  /** Keep select valid if backend returns a higher role row (panel should rarely open then). */
  const roleChoices = useMemo(() => {
    const current = user.role ? [user.role] : [];
    const byId = new Map();
    [...assignableRoles, ...current].forEach((r) => {
      if (r && r._id) byId.set(String(r._id), r);
    });
    return Array.from(byId.values());
  }, [assignableRoles, user.role]);
  const actionColumns = useMemo(() => {
    const preferred = ['create', 'read', 'update', 'delete'];
    const discovered = [...new Set(permissionsSorted.map((p) => String(p.action || '').toLowerCase()))];
    const known = preferred.filter((a) => discovered.includes(a));
    const extra = discovered.filter((a) => !preferred.includes(a)).sort((a, b) => a.localeCompare(b));
    return [...known, ...extra];
  }, [permissionsSorted]);
  const permissionMatrix = useMemo(() => {
    const table = new Map();
    permissionsSorted.forEach((p) => {
      const resource = String(p.resource || '').toLowerCase();
      const action = String(p.action || '').toLowerCase();
      if (!resource || !action) return;
      if (!table.has(resource)) table.set(resource, new Map());
      table.get(resource).set(action, p);
    });
    return Array.from(table.entries())
      .map(([resource, actions]) => ({ resource, actions }))
      .sort((a, b) => a.resource.localeCompare(b.resource));
  }, [permissionsSorted]);

  useEffect(() => {
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setRoleId(user.role?._id ?? '');
    setIsActive(Boolean(user.isActive));
  }, [user._id, user.name, user.email, user.role?._id, user.isActive]);

  useEffect(() => {
    const grants = new Set((user.customPermissions ?? []).map((p) => String(p._id)));
    const denied = new Set((user.deniedPermissions ?? []).map((p) => String(p._id)));
    /** @type {Record<string,'inherit'|'grant'|'deny'>} */
    const modes = {};
    for (const p of permissionsSorted) {
      const id = String(p._id);
      if (denied.has(id)) modes[id] = 'deny';
      else if (grants.has(id)) modes[id] = 'grant';
      else modes[id] = 'inherit';
    }
    setPermModes(modes);
  }, [user._id, user.customPermissions, user.deniedPermissions, permissionsSorted]);

  const handlePermRadio = (pid, mode) => {
    const id = String(pid);
    setPermModes((prev) => ({ ...prev, [id]: mode }));
  };

  async function saveDetails(ev) {
    ev.preventDefault();
    setPending(true);
    setMsg('');
    try {
      const res = await userApi.patchUserDetails(user._id, { name: name.trim(), email: email.trim() });
      setMsg(res?.message ?? 'Saved.');
      await onRefresh();
    } catch (e) {
      setMsg(fmtErr(e));
    } finally {
      setPending(false);
    }
  }

  async function applyRole() {
    setPending(true);
    setMsg('');
    try {
      const res = await userApi.patchUserRole(user._id, roleId);
      setMsg(res?.message ?? 'Role updated.');
      await onRefresh();
    } catch (e) {
      setMsg(fmtErr(e));
    } finally {
      setPending(false);
    }
  }

  async function applyStatus() {
    setPending(true);
    setMsg('');
    try {
      const res = await userApi.patchUserStatus(user._id, isActive);
      setMsg(res?.message ?? 'Status updated.');
      await onRefresh();
    } catch (e) {
      setMsg(fmtErr(e));
    } finally {
      setPending(false);
    }
  }

  async function saveOverrides() {
    const grantIds = [];
    const denyIds = [];
    for (const p of permissionsSorted) {
      const id = String(p._id);
      const m = permModes[id] ?? 'inherit';
      if (m === 'grant') grantIds.push(id);
      else if (m === 'deny') denyIds.push(id);
    }
    setPending(true);
    setMsg('');
    try {
      await userApi.patchUserCustomPermissions(user._id, grantIds);
      await userApi.patchUserDeniedPermissions(user._id, denyIds);
      setMsg('Permission overrides saved.');
      await onRefresh();
    } catch (e) {
      setMsg(fmtErr(e));
    } finally {
      setPending(false);
    }
  }

  async function removeUser() {
    if (
      !window.confirm(
        `Delete user "${user.email}" permanently?`
      )
    ) {
      return;
    }
    setPending(true);
    setMsg('');
    try {
      await userApi.deleteUser(user._id);
      await onRefresh();
      onClose();
    } catch (e) {
      setMsg(fmtErr(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-users-page__editor">
      <div className="admin-users-page__editor-head">
        <h2 className="admin-users-page__editor-title">
          Manage · {user.name}
        </h2>
        <button type="button" className="admin-users-page__btn admin-users-page__btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
      {msg ? <p className="admin-users-page__banner">{msg}</p> : null}

      <form className="admin-users-page__grid" onSubmit={saveDetails}>
        <fieldset className="admin-users-page__fieldset">
          <legend>Contact</legend>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="mt-2">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" className="mt-2 admin-users-page__btn" disabled={pending}>
            Save details
          </button>
        </fieldset>
      </form>

      <fieldset className="admin-users-page__fieldset">
        <legend>Role & status</legend>
        <label>
          Role
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            disabled={pending || isSelf || !canHierarchyEdit}
          >
            {roleChoices.map((r) => {
              const assignable = assignableRoles.some((x) => String(x._id) === String(r._id));
              return (
                <option style={{ color: 'black' }} key={r._id} value={r._id} disabled={!assignable}>
                  {r.name}
                  {!assignable ? ' (not assignable)' : ''}
                </option>
              );
            })}
          </select>
        </label>
        {isSelf ? (
          <p className="admin-users-page__hint-small">You cannot change your own role here.</p>
        ) : null}
        <button
          type="button"
          className="admin-users-page__btn mt-2"
          disabled={pending || isSelf || !canHierarchyEdit}
          onClick={applyRole}
        >
          Apply role
        </button>
        <label className="admin-users-page__check">
          <input
            type="checkbox"
            checked={isActive}
            disabled={pending || isSelf || !canHierarchyEdit}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active account
          {isSelf ? <span className="admin-users-page__hint">Cannot deactivate yourself here.</span> : null}
        </label>
        <button
          type="button"
          className="admin-users-page__btn"
          disabled={pending || isSelf || !canHierarchyEdit}
          onClick={applyStatus}
        >
          Save status
        </button>
      </fieldset>

      <fieldset className="admin-users-page__fieldset">
        <legend>Permissions matrix (grant beyond role · or deny despite role/custom)</legend>
        <p className="admin-users-page__hint-small">
          Deny wins when both overlap. Only available for accounts you are allowed to manage (below your
          privilege level).
        </p>
        <div className="admin-users-page__override-legend">
          <span><strong>Role</strong> = inherit</span>
          <span><strong>Grant</strong> = force allow</span>
          <span><strong>Deny</strong> = force block</span>
        </div>
        <div className="admin-users-page__matrix-wrap">
          <table className="admin-users-page__matrix">
            <thead>
              <tr>
                <th scope="col">Resource</th>
                {actionColumns.map((action) => (
                  <th key={action} scope="col">
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map(({ resource, actions }) => (
                <tr key={resource}>
                  <th scope="row">{resource.charAt(0).toUpperCase() + resource.slice(1)}</th>
                  {actionColumns.map((action) => {
                    const p = actions.get(action);
                    if (!p) {
                      return (
                        <td key={`${resource}:${action}`}>
                          <span className="admin-users-page__matrix-empty" />
                        </td>
                      );
                    }
                    const pid = String(p._id);
                    return (
                      <td key={pid}>
                        <select
                          value={permModes[pid] ?? 'inherit'}
                          onChange={(e) => handlePermRadio(pid, e.target.value)}
                          disabled={isSelf || !canHierarchyEdit}
                          className="admin-users-page__mode-select"
                          aria-label={`${resource}:${action} override mode`}
                        >
                          <option value="inherit">Role</option>
                          <option value="grant">Grant</option>
                          <option value="deny">Deny</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="admin-users-page__btn"
          disabled={pending || permissionsSorted.length === 0 || isSelf || !canHierarchyEdit}
          onClick={saveOverrides}
        >
          Save overrides
        </button>
      </fieldset>

      <fieldset className="admin-users-page__fieldset admin-users-page__fieldset--danger">
        <legend>Danger zone</legend>
        <button
          type="button"
          className="admin-users-page__btn admin-users-page__btn--danger"
          disabled={pending || isSelf || !canHierarchyEdit}
          onClick={removeUser}
        >
          Delete user
        </button>
      </fieldset>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: me } = useAuthUser();
  const selfId = me?._id;
  const roleActive = me?.role?.isActive !== false;

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selected, setSelected] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cRoleId, setCRoleId] = useState('');
  const [cActive, setCActive] = useState(true);

  const permissionsSorted = useMemo(
    () =>
      [...permissions].sort((a, b) => {
        const k1 = `${a.resource}:${a.action}`;
        const k2 = `${b.resource}:${b.action}`;
        return k1.localeCompare(k2);
      }),
    [permissions],
  );

  const assignableRoles = useMemo(
    () => (me ? roles.filter((r) => r.isActive !== false && canAssignRoleInUi(me, r)) : []),
    [roles, me],
  );

  const loadRolesAndPermissions = useCallback(async () => {
    try {
      const [rolesBody, permsBody] = await Promise.all([rolesApi.listRoles(), rolesApi.listPermissions()]);
      const rList = Array.isArray(rolesBody?.data?.roles) ? rolesBody.data.roles : [];
      setRoles(rList);
      setPermissions(Array.isArray(permsBody?.data?.permissions) ? permsBody.data.permissions : []);
    } catch (e) {
      setBanner(fmtErr(e));
    }
  }, []);

  useEffect(() => {
    if (!roles.length || !me) return;
    setCRoleId((prev) => {
      if (prev && roles.some((r) => String(r._id) === String(prev))) return prev;
      const emp = roles.find((r) => r.name === ROLE_NAME.EMPLOYEE);
      if (emp) return emp._id;
      const firstAssignable = roles.find((r) => canAssignRoleInUi(me, r));
      return firstAssignable ? firstAssignable._id : roles[0]?._id || '';
    });
  }, [roles, me]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const body = await userApi.listUsers({
        page,
        limit,
        search: appliedSearch.trim() || undefined,
        activeOnly: activeOnly ? 'true' : 'false',
      });
      const d = body?.data;
      const list = Array.isArray(d?.users) ? d.users : [];
      setUsers(list);
      setTotal(d?.total ?? 0);
      setTotalPages(Math.max(1, d?.totalPages ?? 1));
      return list;
    } catch (e) {
      setBanner(fmtErr(e));
      setUsers([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedSearch, activeOnly]);

  useEffect(() => {
    loadRolesAndPermissions();
  }, [loadRolesAndPermissions]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [activeOnly]);

  async function submitCreate(ev) {
    ev.preventDefault();
    setBanner(null);
    try {
      await userApi.createUser({
        name: cName.trim(),
        email: cEmail.trim(),
        roleId: cRoleId || undefined,
        isActive: cActive,
      });
      setCreateOpen(false);
      setCName('');
      setCEmail('');
      setBanner('User created successfully. Login credentials sent to registered email.');
      setPage(1);
      await loadUsers();
    } catch (e) {
      setBanner(fmtErr(e));
    }
  }

  const refreshAfterEdit = useCallback(async () => {
    const id = selected?._id;
    const list = await loadUsers();
    if (!id) return;
    const u = list.find((x) => String(x._id) === String(id));
    setSelected(u ?? null);
  }, [loadUsers, selected?._id]);

  const editorUser = selected ? users.find((u) => String(u._id) === String(selected._id)) || selected : null;
  const activeCount = users.filter((u) => u.isActive !== false).length;
  const inactiveCount = Math.max(0, users.length - activeCount);

  return (
    <div className="admin-users-page">
      <PageHeader
        title="User management"
        subtitle="Search, paginate, create accounts, and adjust roles, status, and per-user permission grants or denials."
      />
      {!roleActive ? (
        <p className="admin-users-page__banner">Your role is inactive. Please contact admin.</p>
      ) : null}

      {banner ? <p className="admin-users-page__banner">{banner}</p> : null}

      <div className="admin-users-page__stats">
        <article className="admin-users-page__stat-card">
          <p>Total users (page)</p>
          <strong>{users.length}</strong>
        </article>
        <article className="admin-users-page__stat-card">
          <p>Active</p>
          <strong>{activeCount}</strong>
        </article>
        <article className="admin-users-page__stat-card">
          <p>Inactive</p>
          <strong>{inactiveCount}</strong>
        </article>
      </div>

      <div className="admin-users-page__toolbar">
        <form
          className="admin-users-page__search"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedSearch(searchDraft);
            setPage(1);
          }}
        >
          <input
            placeholder="Search name or email"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            aria-label="Search users"
          />
          <button type="submit" className="admin-users-page__btn">
            Search
          </button>
        </form>
        <label className="admin-users-page__check">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Active only
        </label>
        <button
          type="button"
          className="admin-users-page__btn admin-users-page__btn--secondary"
          disabled={!roleActive}
          onClick={() => setCreateOpen((o) => !o)}
        >
          {createOpen ? 'Cancel' : 'Create user'}
        </button>
      </div>

      {createOpen ? (
        <form className="admin-users-page__create" onSubmit={submitCreate}>
          <h2 className="admin-users-page__subhead">Create user</h2>
          <div className="admin-users-page__create-grid">
            <label>
              Name
              <input value={cName} onChange={(e) => setCName(e.target.value)} required />
            </label>
            <label>
              Email
              <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required />
            </label>
            <label>
              Role
              <select value={cRoleId} onChange={(e) => setCRoleId(e.target.value)}>
                {assignableRoles.map((r) => (
                  <option style={{ color: 'black' }} key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-users-page__check admin-users-page__create-active">
              <input type="checkbox" checked={cActive} onChange={(e) => setCActive(e.target.checked)} />
              Active
            </label>
          </div>
          <p className="admin-users-page__hint-small">
            A secure temporary password will be generated automatically and emailed to the user.
          </p>
          <button type="submit" className="admin-users-page__btn" disabled={!assignableRoles.length || !roleActive}>
            Create account
          </button>
        </form>
      ) : null}

      {loading ? <p className="admin-users-page__muted">Loading…</p> : null}

      <div className="admin-users-page__layout">
        <div className="admin-users-page__table-wrap">
          <div className="admin-users-page__table-head">
            <h2>Users</h2>
            <p>Click Manage to edit role, status, and overrides.</p>
          </div>
          <table className="admin-users-page__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role?.name ?? '—'}</td>
                  <td>
                    <span
                      className={
                        u.isActive === false
                          ? 'admin-users-page__status admin-users-page__status--inactive'
                          : 'admin-users-page__status'
                      }
                    >
                      {u.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-users-page__btn admin-users-page__btn--small admin-users-page__btn--ghost"
                      disabled={!roleActive}
                      onClick={() => setSelected(u)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !loading ? (
            <p className="admin-users-page__muted">No users match this query.</p>
          ) : null}

          <div className="admin-users-page__pager">
            <button
              type="button"
              className="admin-users-page__btn admin-users-page__btn--ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="admin-users-page__muted">
              Page {page} of {totalPages} · {total} users
            </span>
            <button
              type="button"
              className="admin-users-page__btn admin-users-page__btn--ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {editorUser ? (
          <UserEditorPanel
            key={editorUser._id}
            user={editorUser}
            assignableRoles={assignableRoles}
            actorUser={me}
            permissionsSorted={permissionsSorted}
            selfId={selfId}
            onClose={() => setSelected(null)}
            onRefresh={refreshAfterEdit}
          />
        ) : null}
      </div>
    </div>
  );
}
