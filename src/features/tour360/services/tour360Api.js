import { api } from '../../../api/client';

export const tour360Api = {
  /**
   * Get all 360 tours for a project
   */
  async getTours(projectId, params = {}) {
    const res = await api.get(`/projects/${projectId}/360-tours`, { params });
    return res.data?.tours || [];
  },

  /**
   * Get complete 360 tour tree (with panoramas and hotspots)
   */
  async getTourById(tourId) {
    const res = await api.get(`/360-tours/${tourId}`);
    return res.data?.tour || null;
  },

  /**
   * Get single panorama details by ID
   */
  async getPanoramaById(panoramaId) {
    const res = await api.get(`/360-panoramas/${panoramaId}`);
    return res.data?.panorama || null;
  },

  /**
   * Get hotspots for a panorama
   */
  async getHotspots(panoramaId) {
    const res = await api.get(`/360-panoramas/${panoramaId}/hotspots`);
    return res.data?.hotspots || [];
  },
  async createTour(projectId, payload) {
    const res = await api.post(`/projects/${projectId}/360-tours`, payload);
    return res.data?.tour;
  },
  async createPanorama(tourId, payload) {
    const res = await api.post(`/360-tours/${tourId}/panoramas`, payload);
    return res.data?.panorama;
  },
  async requestUploadUrl(projectId, tourId, file) {
    const res = await api.post('/360-panoramas/upload-url', {
      projectId: Number(projectId), tourId: Number(tourId), filename: file.name, fileSizeBytes: file.size
    });
    return res.data;
  },
};
