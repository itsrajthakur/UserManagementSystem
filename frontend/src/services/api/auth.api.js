import { api } from './client.js';

export const authApi = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  async signup(payload) {
    const { data } = await api.post('/auth/signup', payload);
    return data;
  },

  async me() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async forgotPassword(payload) {
    const { data } = await api.post('/auth/forgot-password', payload);
    return data;
  },

  async resetPassword(payload) {
    const { data } = await api.post('/auth/reset-password', payload);
    return data;
  },

  async verifyEmail(token) {
    const { data } = await api.get('/auth/verify-email', {
      params: { token },
    });
    return data;
  },
};
