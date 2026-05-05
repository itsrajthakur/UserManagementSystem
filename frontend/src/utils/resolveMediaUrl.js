import { api } from '../services/api';

/** Backend serves `/uploads/...` at API origin without `/api` prefix. */
export function resolveMediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const baseURL = api.defaults.baseURL ?? '';
  const origin = baseURL.replace(/\/api\/?$/i, '') || '';
  const clean = path.startsWith('/') ? path : `/${path}`;
  return origin ? `${origin}${clean}` : clean;
}
