import { useEffect, useState } from 'react';
import { rolesApi } from '../services/api';

export default function MemberRolesExplorePage() {
  const [state, setState] = useState({ loading: true, error: '', roles: [] });

  useEffect(() => {
    let cancel = false;
    rolesApi
      .listRoles()
      .then((body) => {
        const list = body?.data?.roles ?? [];
        if (!cancel) setState({ loading: false, error: '', roles: Array.isArray(list) ? list : [] });
      })
      .catch((err) => {
        if (cancel) return;
        const code = err.response?.status;
        setState({
          loading: false,
          roles: [],
          error:
            code === 403
              ? 'Backend requires Administrator for roles APIs; extend the API if non-admins should read.'
              : err.response?.data?.message ?? 'Request failed.',
        });
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (state.loading) return <p>Checking access…</p>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Roles (read attempt)</h1>
      <p style={{ opacity: 0.8 }}>
        Visible when your profile includes <code>roles:read</code>; server policy may still deny the
        call.
      </p>
      {state.error ? (
        <p style={{ color: '#fca5a5' }}>{state.error}</p>
      ) : (
        <ul style={{ paddingLeft: '1.1rem' }}>
          {state.roles.map((r) => (
            <li key={r._id}>
              <strong>{r.name}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
