import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthUser } from '../context/AuthUserContext';
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

function PermModes({ uid, pid, mode, onChange }) {
  const gid = `${uid}:${pid}`;
  return (
    <div className="admin-users-page__perm-modes">
      <label className="admin-users-page__perm-label">
        <input
          type="radio"
          name={gid}
          checked={mode === 'inherit'}
          onChange={() => onChange(pid, 'inherit')}
        />{' '}
        Role
      </label>
      <label className="admin-users-page__perm-label">
        <input
          type="radio"
          name={gid}
          checked={mode === 'grant'}
          onChange={() => onChange(pid, 'grant')}
        />{' '}
        Grant
      </label>
      <label className="admin-users-page__perm-label">
        <input
          type="radio"
          name={gid}
          checked={mode === 'deny'}
          onChange={() => onChange(pid, 'deny')}
        />{' '}
        Deny
      </label>
    </div>
  );
}

function UserEditorPanel({
  user,
  roles,
  permissionsSorted,
  selfId,
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
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" className="admin-users-page__btn" disabled={pending}>
            Save details
          </button>
        </fieldset>
      </form>

      <fieldset className="admin-users-page__fieldset">
        <legend>Role & status</legend>
        <label>
          Role
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => (
              <option style={{ color: 'black' }} key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="admin-users-page__btn" disabled={pending} onClick={applyRole}>
          Apply role
        </button>
        <label className="admin-users-page__check">
          <input
            type="checkbox"
            checked={isActive}
            disabled={pending || isSelf}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active account
          {isSelf ? <span className="admin-users-page__hint">Cannot deactivate yourself here.</span> : null}
        </label>
        <button type="button" className="admin-users-page__btn" disabled={pending || isSelf} onClick={applyStatus}>
          Save status
        </button>
      </fieldset>

      <fieldset className="admin-users-page__fieldset">
        <legend>Overrides (grant beyond role · or deny despite role/custom)</legend>
        <p className="admin-users-page__hint-small">
          Deny wins when both overlap. Admin role still bypasses API checks inside the middleware.
        </p>
        <div className="admin-users-page__perm-list">
          {permissionsSorted.map((p) => (
            <div key={p._id} className="admin-users-page__perm-row">
              <div className="admin-users-page__perm-key">{permLabel(p)}</div>
              <PermModes
                uid={String(user._id)}
                pid={String(p._id)}
                mode={permModes[String(p._id)] ?? 'inherit'}
                onChange={handlePermRadio}
              />
            </div>
          ))}
        </div>
        <button type="button" className="admin-users-page__btn" disabled={pending || permissionsSorted.length === 0} onClick={saveOverrides}>
          Save overrides
        </button>
      </fieldset>

      <fieldset className="admin-users-page__fieldset admin-users-page__fieldset--danger">
        <legend>Danger zone</legend>
        <button
          type="button"
          className="admin-users-page__btn admin-users-page__btn--danger"
          disabled={pending || isSelf}
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
  const [cPassword, setCPassword] = useState('');
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

  const loadRolesAndPermissions = useCallback(async () => {
    try {
      const [rolesBody, permsBody] = await Promise.all([rolesApi.listRoles(), rolesApi.listPermissions()]);
      const rList = Array.isArray(rolesBody?.data?.roles) ? rolesBody.data.roles : [];
      setRoles(rList);
      setPermissions(Array.isArray(permsBody?.data?.permissions) ? permsBody.data.permissions : []);
      const defaultMember = rList.find((r) => r.name === 'Member');
      setCRoleId((prev) => prev || (defaultMember ? defaultMember._id : ''));
    } catch (e) {
      setBanner(fmtErr(e));
    }
  }, []);

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
    if (!cPassword || cPassword.length < 8 || !/\d/.test(cPassword) || !/[a-zA-Z]/.test(cPassword)) {
      setBanner('Password: at least 8 characters, include a letter and a number.');
      return;
    }
    try {
      await userApi.createUser({
        name: cName.trim(),
        email: cEmail.trim(),
        password: cPassword,
        roleId: cRoleId || undefined,
        isActive: cActive,
      });
      setCreateOpen(false);
      setCName('');
      setCEmail('');
      setCPassword('');
      setBanner('User created.');
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

  return (
    <div className="admin-users-page">
      <PageHeader
        title="User management"
        subtitle="Search, paginate, create accounts, and adjust roles, status, and per-user permission grants or denials."
      />

      {banner ? <p className="admin-users-page__banner">{banner}</p> : null}

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
              Password
              <input type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} required />
            </label>
            <label>
              Role
              <select value={cRoleId} onChange={(e) => setCRoleId(e.target.value)}>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
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
          <button type="submit" className="admin-users-page__btn">
            Create account
          </button>
        </form>
      ) : null}

      {loading ? <p className="admin-users-page__muted">Loading…</p> : null}

      <div className="admin-users-page__layout">
        <div className="admin-users-page__table-wrap">
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
                  <td>{u.isActive === false ? 'Inactive' : 'Active'}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-users-page__btn admin-users-page__btn--small admin-users-page__btn--ghost"
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
        </div>

        {editorUser ? (
          <UserEditorPanel
            key={editorUser._id}
            user={editorUser}
            roles={roles}
            permissionsSorted={permissionsSorted}
            selfId={selfId}
            onClose={() => setSelected(null)}
            onRefresh={refreshAfterEdit}
          />
        ) : null}
      </div>

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
  );
}
