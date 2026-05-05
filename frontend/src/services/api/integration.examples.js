/**
 * Reference-only examples for wiring the React app to the Express API.
 * Do not import this file from production code.
 *
 * Raw client (JWT attached by request interceptor):
 *   import api from './services/api';
 *   const { data } = await api.get('/health');
 *
 * Domain modules:
 *   import { healthApi, userApi, authApi } from './services/api';
 *   const health = await healthApi.check();
 *   const user = await userApi.getAuthMeUser();
 *   await authApi.login({ email, password });
 *
 * Skip global 401 redirect (rare):
 *   await api.get('/optional-endpoint', { skipAuthRedirect: true });
 */

export {};
