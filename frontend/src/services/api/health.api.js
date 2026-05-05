import { api } from './client.js';

export const healthApi = {
  async check() {
    const { data } = await api.get('/health');
    return data;
  },
};
