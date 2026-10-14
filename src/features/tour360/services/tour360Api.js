import { api } from '../../../api/client';

export const tour360Api = {
  /**
   * Get all 360 tours for a project
   */
  async getTours(projectId, params = {}) {
    const res = await api.get(`/projects/${projectId}/360-tours`, { params });
    return res.data?.data?.tours || [];
  },

  /**
   * Get complete 360 tour tree (with panoramas and hotspots)
   */
  async getTourById(tourId) {
    const res = await api.get(`/360-tours/${tourId}`);
    return res.data?.data?.tour || null;
  },

  /**
   * Get single panorama details by ID
   */
  async getPanoramaById(panoramaId) {
    const res = await api.get(`/360-panoramas/${panoramaId}`);
    return res.data?.data?.panorama || null;
  },

  /**
   * Get hotspots for a panorama
   */
  async getHotspots(panoramaId) {
    const res = await api.get(`/360-panoramas/${panoramaId}/hotspots`);
    return res.data?.data?.hotspots || [];
  }
};
