import { useEffect, useId, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthUser } from '../context/AuthUserContext';
import {
  fetchMyProfile,
  patchMyProfile,
  uploadMyProfilePicture,
  changeMyPassword,
} from '../services/userService';
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [pwPending, setPwPending] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

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

  function validateNewPassword(pw) {
    if (!pw || pw.length < 8) return 'At least 8 characters';
    if (!/\d/.test(pw)) return 'Include at least one number';
    if (!/[a-zA-Z]/.test(pw)) return 'Include at least one letter';
    return '';
  }

  async function handlePassword(ev) {
    ev.preventDefault();
    setPwMsg('');
    if (!currentPassword) {
      setPwMsg('Enter your current password.');
      return;
    }
    const err = validateNewPassword(newPassword);
    if (err) {
      setPwMsg(err);
      return;
    }
    if (newPassword !== newPassword2) {
      setPwMsg('New passwords do not match.');
      return;
    }

    setPwPending(true);
    try {
      await changeMyPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
      setPwMsg('Password updated.');
    } catch (err) {
      setPwMsg(formatPatchError(err));
    } finally {
      setPwPending(false);
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
      <h1 className="profile-page__title">Profile</h1>

      {loadErr ? <p className="profile-page__banner profile-page__banner--error">{loadErr}</p> : null}

      {loading ? (
        <p className="profile-page__muted">Loading profile…</p>
      ) : (
        <>
          <section className="profile-page__photo">
            <div className="profile-page__avatar-wrap">
              {avatarHref ? (
                <img
                  src={avatarHref}
                  alt=""
                  width={96}
                  height={96}
                  className="profile-page__avatar"
                />
              ) : (
                <div className="profile-page__avatar profile-page__avatar--placeholder">
                  {(detail?.name || ctxUser?.name || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="profile-page__muted">Role: {detail?.role?.name ?? ctxUser?.role?.name ?? '—'}</p>
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
                {picPending ? 'Uploading…' : 'Change photo'}
              </button>
              {picMsg ? <p className="profile-page__hint">{picMsg}</p> : null}
            </div>
          </section>

          <section className="profile-page__section">
            <h2 className="profile-page__section-title">Password</h2>
            <form onSubmit={handlePassword} noValidate>
              <div className="profile-page__field">
                <label htmlFor="prof-current-pw">Current password</label>
                <input
                  id="prof-current-pw"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(ev) => setCurrentPassword(ev.target.value)}
                />
              </div>
              <div className="profile-page__field">
                <label htmlFor="prof-new-pw">New password</label>
                <input
                  id="prof-new-pw"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(ev) => setNewPassword(ev.target.value)}
                />
              </div>
              <div className="profile-page__field">
                <label htmlFor="prof-new-pw2">Confirm new password</label>
                <input
                  id="prof-new-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword2}
                  onChange={(ev) => setNewPassword2(ev.target.value)}
                />
              </div>
              <button type="submit" className="profile-page__btn" disabled={pwPending}>
                {pwPending ? 'Updating…' : 'Change password'}
              </button>
              {pwMsg ? <p className="profile-page__hint">{pwMsg}</p> : null}
            </form>
          </section>

          <section className="profile-page__section">
            <h2 className="profile-page__section-title">Account details</h2>
            <form onSubmit={handleSave} noValidate>
              <div className="profile-page__field">
                <label htmlFor="prof-name">Name</label>
                <input
                  id="prof-name"
                  autoComplete="name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name ? (
                  <p className="profile-page__err">{fieldErrors.name}</p>
                ) : null}
              </div>
              <div className="profile-page__field">
                <label htmlFor="prof-email">Email</label>
                <input
                  id="prof-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email ? (
                  <p className="profile-page__err">{fieldErrors.email}</p>
                ) : null}
              </div>
              <button type="submit" className="profile-page__btn" disabled={savePending}>
                {savePending ? 'Saving…' : 'Save changes'}
              </button>
              {saveMsg ? <p className="profile-page__hint">{saveMsg}</p> : null}
            </form>
          </section>
        </>
      )}
    </div>
  );
}
