import { useEffect, useState } from 'react';
import { userApi } from '../services/api';

export default function MemberUsersExplorePage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });

  useEffect(() => {
    let cancel = false;
    userApi
      .listUsers()
      .then((body) => {
        const list = body?.data?.users ?? [];
        if (!cancel) setState({ loading: false, error: '', rows: Array.isArray(list) ? list : [] });
      })
      .catch((err) => {
        if (cancel) return;
        const code = err.response?.status;
        const msg =
          code === 403
            ? 'The API denied this listing (backend currently requires Administrator for GET /users).'
            : err.response?.data?.message ?? 'Request failed.';
        setState({ loading: false, error: msg, rows: [] });
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (state.loading) return <p>Loading directory…</p>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Users directory</h1>
      <p style={{ opacity: 0.8 }}>
        Visible because your token includes <code>users:read</code>. If the server rejects the call, the
        policy needs to allow this grant for non-admin principals.
      </p>
      {state.error ? (
        <p style={{ color: '#fca5a5' }}>{state.error}</p>
      ) : (
        <ul style={{ paddingLeft: '1.1rem' }}>
          {state.rows.map((u) => (
            <li key={u._id}>
              {u.name} — {u.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
