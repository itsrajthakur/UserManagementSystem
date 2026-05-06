import { useEffect, useId, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthUser } from '../context/AuthUserContext';
import { fetchMyProfile, patchMyProfile, uploadMyProfilePicture } from '../services/userService';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { validateProfileUpdate, isEmptyErrors } from '../utils/profileValidation';
import './ProfilePage.css';

function formatPatchError(err) {
  const body = err.response?.data;
  if (!body) return err.message ?? 'Update failed';
  if (typeof body.message === 'string') return body.message;
  return 'Update failed';
}

export default function ProfilePage() {
  const pickId = useId();
  const fileInputRef = useRef(null);

  const { user: ctxUser, loading: ctxLoading, refreshUser } = useAuthUser();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveMsg, setSaveMsg] = useState('');
  const [savePending, setSavePending] = useState(false);

  const [picPending, setPicPending] = useState(false);
  const [picMsg, setPicMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (ctxLoading) return undefined;

    if (!ctxUser) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    fetchMyProfile()
      .then((u) => {
        if (!cancelled) {
          setDetail(u);
          setName(u?.name ?? '');
          setEmail(u?.email ?? '');
          setLoadErr('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadErr(err.response?.data?.message ?? err.message ?? 'Could not load profile');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ctxUser, ctxLoading]);

  if (!ctxLoading && !ctxUser) {
    return <Navigate to="/login" replace />;
  }

  const avatarHref = resolveMediaUrl(detail?.profilePic || ctxUser?.profilePic);

  async function handleSave(ev) {
    ev.preventDefault();
    setSaveMsg('');
    const payload = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const origName = (detail?.name ?? ctxUser?.name ?? '').trim();
    const origEmail = (detail?.email ?? ctxUser?.email ?? '').trim();

    if (trimmedName !== origName) payload.name = trimmedName;
    if (trimmedEmail !== origEmail) payload.email = trimmedEmail;

    const errors = validateProfileUpdate(payload);
    setFieldErrors(errors);
    if (!isEmptyErrors(errors)) return;
    if (Object.keys(payload).length === 0) {
      setSaveMsg('No changes to save.');
      return;
    }

    setSavePending(true);
    try {
      const res = await patchMyProfile(payload);
      const updated = res?.data?.user;
      if (updated) {
        setDetail(updated);
        setName(updated.name);
        setEmail(updated.email);
      }
      await refreshUser();
      setSaveMsg(res?.message ?? 'Profile updated.');
    } catch (err) {
      setSaveMsg(formatPatchError(err));
    } finally {
      setSavePending(false);
    }
  }

  async function handlePickFile(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    const okTypes = /^image\/(jpeg|png|webp|gif)$/i.test(file.type);
    if (!okTypes) {
      setPicMsg('Please choose JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPicMsg('Max file size is 2 MB.');
      return;
    }

    setPicMsg('');
    setPicPending(true);
    try {
      const res = await uploadMyProfilePicture(file);
      if (res?.data?.user) {
        setDetail(res.data.user);
      }
      await refreshUser();
      setPicMsg(res?.message ?? 'Photo updated.');
    } catch (err) {
      setPicMsg(formatPatchError(err));
    } finally {
      setPicPending(false);
    }
  }

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <h1 className="profile-page__title">My Profile</h1>
        <p className="profile-page__subtitle">Manage your account details and profile picture.</p>
      </header>

      {loadErr ? <p className="profile-page__banner profile-page__banner--error">{loadErr}</p> : null}

      {loading ? (
        <p className="profile-page__muted">Loading profile...</p>
      ) : (
        <div className="profile-grid">
          <section className="profile-card profile-card--hero">
            <div className="profile-page__avatar-wrap">
              {avatarHref ? (
                <img src={avatarHref} alt="" width={108} height={108} className="profile-page__avatar" />
              ) : (
                <div className="profile-page__avatar profile-page__avatar--placeholder">
                  {(detail?.name || ctxUser?.name || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-card__hero-content">
              <h2>{detail?.name ?? ctxUser?.name ?? 'User'}</h2>
              <p className="profile-page__muted">{detail?.role?.name ?? ctxUser?.role?.name ?? 'No role'}</p>
              <p className="profile-page__muted">{detail?.email ?? ctxUser?.email ?? 'No email'}</p>
              <input
                ref={fileInputRef}
                id={pickId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="profile-page__file"
                onChange={handlePickFile}
              />
              <button
                type="button"
                className="profile-page__btn profile-page__btn--secondary"
                aria-controls={pickId}
                disabled={picPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {picPending ? 'Uploading...' : 'Change Photo'}
              </button>
              {picMsg ? <p className="profile-page__hint">{picMsg}</p> : null}
            </div>
          </section>

          <section className="profile-card profile-card--form">
            <h2 className="profile-card__title">Account Details</h2>
            <form onSubmit={handleSave} noValidate>
              <div className="profile-page__field">
                <label htmlFor="prof-name">Full name</label>
                <input
                  id="prof-name"
                  autoComplete="name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  disabled={savePending}
                />
                {fieldErrors.name ? <p className="profile-page__err">{fieldErrors.name}</p> : null}
              </div>
              <div className="profile-page__field">
                <label htmlFor="prof-email">Email address</label>
                <input
                  id="prof-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  disabled={savePending}
                />
                {fieldErrors.email ? <p className="profile-page__err">{fieldErrors.email}</p> : null}
              </div>

              <button type="submit" className="profile-page__btn" disabled={savePending}>
                {savePending ? 'Saving...' : 'Save Changes'}
              </button>
              {saveMsg ? <p className="profile-page__hint">{saveMsg}</p> : null}
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
