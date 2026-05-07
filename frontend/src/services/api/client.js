import axios from 'axios';
import { TOKEN_KEY } from '../../config/auth';
import { clearStoredToken } from '../../config/authStorage';

/**
 * Paths that return 401 for invalid credentials — must not trigger global logout redirect.
 */
const UNAUTHENTICATED_AUTH_PATHS = ['/auth/login', '/auth/signup'];

function isUnauthenticatedAuthRequest(config) {
  const url = config?.url ?? '';
  return UNAUTHENTICATED_AUTH_PATHS.some((segment) => url.includes(segment));
}

/** Central Axios instance for the Node/Express API */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let browser set multipart boundary for FormData uploads.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const cfg = error.config ?? {};

    if (status === 401 && !cfg.skipAuthRedirect && !isUnauthenticatedAuthRequest(cfg)) {
      clearStoredToken();
      if (typeof window !== 'undefined') {
        const onLogin = window.location.pathname === '/login';
        const onSignup = window.location.pathname === '/signup';
        if (!onLogin && !onSignup) {
          window.location.replace(`${window.location.origin}/login`);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
