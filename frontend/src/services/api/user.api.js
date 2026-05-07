import { api } from './client.js';

export const userApi = {
  async getAuthMeUser() {
    const { data } = await api.get('/auth/me');
    if (!data?.success || !data?.data?.user) return null;
    return data.data.user;
  },

  async getMe() {
    const { data } = await api.get('/users/me');
    if (!data?.success || !data?.data?.user) {
      throw new Error('Profile not loaded');
    }
    return data.data.user;
  },

  async patchMe(body) {
    const { data } = await api.patch('/users/me', body);
    return data;
  },

  async uploadProfilePicture(file) {
    const fd = new FormData();
    fd.append('picture', file);
    const { data } = await api.post('/users/me/picture', fd);
    return data;
  },

  async listUsers(params) {
    const { data } = await api.get('/users', { params });
    return data;
  },

  async changeMyPassword(body) {
    const { data } = await api.post('/users/me/password', body);
    return data;
  },

  async createUser(body) {
    const { data } = await api.post('/users', body);
    return data;
  },

  async patchUserDetails(userId, body) {
    const { data } = await api.patch(`/users/${userId}/details`, body);
    return data;
  },

  async deleteUser(userId) {
    const { data } = await api.delete(`/users/${userId}`);
    return data;
  },
  async restoreUser(userId) {
    const { data } = await api.post(`/users/${userId}/restore`);
    return data;
  },

  async patchUserStatus(userId, isActive) {
    const { data } = await api.patch(`/users/${userId}/status`, { isActive });
    return data;
  },

  async patchUserRole(userId, roleId) {
    const { data } = await api.patch(`/users/${userId}/role`, { roleId });
    return data;
  },

  async patchUserCustomPermissions(userId, permissionIds) {
    const { data } = await api.patch(`/users/${userId}/custom-permissions`, {
      permissionIds,
    });
    return data;
  },

  async patchUserDeniedPermissions(userId, permissionIds) {
    const { data } = await api.patch(`/users/${userId}/denied-permissions`, {
      permissionIds,
    });
    return data;
  },
};
