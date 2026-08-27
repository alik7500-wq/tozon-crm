import { api } from '../../../api/client';
import axios from 'axios';

export const visualAdminApi = {
  // -------------------------------------------------------------
  // 3D SCENES
  // -------------------------------------------------------------
  async getScenes(projectId) {
    const res = await api.get(`/projects/${projectId}/3d-scenes`);
    return res.data?.scenes || [];
  },

  async createScene(projectId, data) {
    const res = await api.post(`/projects/${projectId}/3d-scenes`, data);
    return res.data?.scene || null;
  },

  async updateScene(sceneId, data) {
    const res = await api.patch(`/3d-scenes/${sceneId}`, data);
    return res.data?.scene || null;
  },

  async activateScene(sceneId) {
    const res = await api.post(`/3d-scenes/${sceneId}/activate`);
    return res.data?.scene || null;
  },

  async deleteScene(sceneId) {
    await api.delete(`/3d-scenes/${sceneId}`);
    return true;
  },

  async getSceneEntities(sceneId) {
    const res = await api.get(`/3d-scenes/${sceneId}/entities`);
    return res.data?.entities || [];
  },

  async saveBatchEntities(sceneId, entities) {
    const res = await api.post(`/3d-scenes/${sceneId}/entities/batch`, { entities });
    return res.data?.entities || [];
  },

  async deleteEntity(entityId) {
    await api.delete(`/3d-scene-entities/${entityId}`);
    return true;
  },

  // -------------------------------------------------------------
  // 3D GLB UPLOAD
  // -------------------------------------------------------------
  async getGlbUploadUrl(projectId, filename, fileSizeBytes) {
    const res = await api.post('/3d-scenes/upload-url', {
      projectId,
      filename,
      fileSizeBytes
    });
    return res.data;
  },

  async uploadFileToSignedUrl(signedUploadUrl, file, onProgress) {
    // Direct upload to Supabase storage signed upload URL
    await axios.put(signedUploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  },

  // -------------------------------------------------------------
  // 360 TOURS
  // -------------------------------------------------------------
  async getTours(projectId) {
    const res = await api.get(`/projects/${projectId}/360-tours`);
    return res.data?.tours || [];
  },

  async getTourTree(tourId) {
    const res = await api.get(`/360-tours/${tourId}`);
    return res.data?.tour || null;
  },

  async createTour(projectId, data) {
    const res = await api.post(`/projects/${projectId}/360-tours`, data);
    return res.data?.tour || null;
  },

  async updateTour(tourId, data) {
    const res = await api.patch(`/360-tours/${tourId}`, data);
    return res.data?.tour || null;
  },

  async deleteTour(tourId) {
    await api.delete(`/360-tours/${tourId}`);
    return true;
  },

  // -------------------------------------------------------------
  // 360 PANORAMAS
  // -------------------------------------------------------------
  async getPanoramaUploadUrl(projectId, filename, fileSizeBytes) {
    const res = await api.post('/360-panoramas/upload-url', {
      projectId,
      filename,
      fileSizeBytes
    });
    return res.data;
  },

  async createPanorama(tourId, data) {
    const res = await api.post(`/360-tours/${tourId}/panoramas`, data);
    return res.data?.panorama || null;
  },

  async updatePanorama(panoramaId, data) {
    const res = await api.patch(`/360-panoramas/${panoramaId}`, data);
    return res.data?.panorama || null;
  },

  async deletePanorama(panoramaId) {
    await api.delete(`/360-panoramas/${panoramaId}`);
    return true;
  },

  // -------------------------------------------------------------
  // 360 HOTSPOTS
  // -------------------------------------------------------------
  async createHotspot(panoramaId, data) {
    const res = await api.post(`/360-panoramas/${panoramaId}/hotspots`, data);
    return res.data?.hotspot || null;
  },

  async updateHotspot(hotspotId, data) {
    const res = await api.patch(`/360-hotspots/${hotspotId}`, data);
    return res.data?.hotspot || null;
  },

  async deleteHotspot(hotspotId) {
    await api.delete(`/360-hotspots/${hotspotId}`);
    return true;
  }
};
