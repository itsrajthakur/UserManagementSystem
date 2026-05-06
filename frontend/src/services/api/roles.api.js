import { api } from './client.js';

export const rolesApi = {
  async listRoles() {
    const { data } = await api.get('/roles');
    return data;
  },

  async listPermissions() {
    const { data } = await api.get('/permissions');
    return data;
  },

  async createRole(body) {
    const { data } = await api.post('/roles', body);
    return data;
  },

  async updateRole(roleId, body) {
    const { data } = await api.patch(`/roles/${roleId}`, body);
    return data;
  },

  async deleteRole(roleId) {
    const { data } = await api.delete(`/roles/${roleId}`);
    return data;
  },
  async restoreRole(roleId) {
    const { data } = await api.post(`/roles/${roleId}/restore`);
    return data;
  },

  async createPermission(body) {
    const { data } = await api.post('/permissions', body);
    return data;
  },

  async updatePermission(permissionId, body) {
    const { data } = await api.patch(`/permissions/${permissionId}`, body);
    return data;
  },

  async deletePermission(permissionId) {
    const { data } = await api.delete(`/permissions/${permissionId}`);
    return data;
  },
  async restorePermission(permissionId) {
    const { data } = await api.post(`/permissions/${permissionId}/restore`);
    return data;
  },
};
