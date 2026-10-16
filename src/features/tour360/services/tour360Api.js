import { api } from '../../../api/client';

export const tour360Api = {
  async getSkyboxStatus(projectId) { const res = await api.get(`/projects/${projectId}/360-ai/skybox/status`); return res.data?.data?.skybox ?? res.data?.skybox; },
  async getSkyboxStyles(projectId) { const res = await api.get(`/projects/${projectId}/360-ai/skybox/styles`); return res.data?.data?.styles ?? res.data?.styles; },
  async getSkyboxJob(projectId, jobId) { const res = await api.get(`/projects/${projectId}/360-ai/skybox/jobs/${jobId}`); return res.data?.data?.job ?? res.data?.job; },
  async startSkyboxGeneration(projectId, payload) { const res = await api.post(`/projects/${projectId}/360-ai/skybox/generate`, payload); return res.data?.data?.generation ?? res.data?.generation; },
  /** Preview the five-room AI generation plan (no provider charges or writes). */
  async getPilotAiManifest(projectId) {
    const res = await api.get(`/projects/${Number(projectId)}/360-ai/pilot-manifest`);
    return res.data?.data?.manifest ?? res.data?.manifest || null;
  },
  /**
   * Get all 360 tours for a project
   */
  async getTours(projectId, params = {}) {
    const res = await api.get(`/projects/${projectId}/360-tours`, { params });
    return res.data?.data?.tours ?? res.data?.data?.tour ?? res.data?.tours || [];
  },

  /**
   * Get complete 360 tour tree (with panoramas and hotspots)
   */
  async getTourById(tourId) {
    const res = await api.get(`/360-tours/${tourId}`);
    return res.data?.data?.tour ?? res.data?.tour || null;
  },

  /**
   * Get single panorama details by ID
   */
  async getPanoramaById(panoramaId) {
    const res = await api.get(`/360-panoramas/${panoramaId}`);
    return res.data?.data?.panorama ?? res.data?.panorama || null;
  },

  /**
   * Get hotspots for a panorama
   */
  async getHotspots(panoramaId) {
    const res = await api.get(`/360-panoramas/${panoramaId}/hotspots`);
    return res.data?.data?.hotspots ?? res.data?.data?.hotspot ?? res.data?.hotspots || [];
  },
  async createHotspot(panoramaId, payload) {
    const res = await api.post(`/360-panoramas/${panoramaId}/hotspots`, payload);
    return res.data?.data?.hotspot ?? res.data?.hotspot;
  },
  async deleteHotspot(hotspotId) {
    await api.delete(`/360-hotspots/${hotspotId}`);
  },
  async getPublishPreflight(tourId) {
    const res = await api.get(`/360-tours/${tourId}/publish-preflight`);
    return res.data?.data?.preflight ?? res.data?.preflight;
  },
  async getPublishManifest(tourId) {
    const res = await api.get(`/360-tours/${tourId}/publish-manifest`);
    return res.data?.data?.manifest ?? res.data?.manifest;
  },
  async createTour(projectId, payload) {
    const res = await api.post(`/projects/${projectId}/360-tours`, payload);
    return res.data?.data?.tour ?? res.data?.tour;
  },
  async createPanorama(tourId, payload) {
    const res = await api.post(`/360-tours/${tourId}/panoramas`, payload);
    return res.data?.data?.panorama ?? res.data?.panorama;
  },
  async requestUploadUrl(projectId, tourId, file) {
    const res = await api.post('/360-panoramas/upload-url', {
      projectId: Number(projectId), tourId: Number(tourId), filename: file.name, fileSizeBytes: file.size
    });
    return res.data?.data ?? res.data;
  },
};
