/**
 * Central API layer for the Express backend.
 *
 * @example
 * import api, { userApi, healthApi } from '../services/api';
 * await healthApi.check();
 * const user = await userApi.getMe();
 */
export { api } from './client.js';
export { default } from './client.js';
export { authApi } from './auth.api.js';
export { userApi } from './user.api.js';
export { healthApi } from './health.api.js';
export { rolesApi } from './roles.api.js';
