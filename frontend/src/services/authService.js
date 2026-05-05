import { TOKEN_KEY } from '../config/auth';
import { clearStoredToken, getStoredToken, setStoredToken } from '../config/authStorage';
import { authApi } from './api/auth.api.js';

export { TOKEN_KEY };
export { clearStoredToken, getStoredToken, setStoredToken } from '../config/authStorage';

export async function login(credentials) {
  return authApi.login(credentials);
}

export async function signup(payload) {
  return authApi.signup(payload);
}

export async function forgotPassword(payload) {
  return authApi.forgotPassword(payload);
}

export async function resetPassword(payload) {
  return authApi.resetPassword(payload);
}

export async function verifyEmail(token) {
  return authApi.verifyEmail(token);
}
