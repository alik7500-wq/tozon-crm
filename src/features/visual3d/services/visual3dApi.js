import { api } from '../../../api/client';

export const visual3dApi = {
  /**
   * Get all 3D scenes for a project
   */
  async getScenes(projectId, params = {}) {
    const res = await api.get(`/projects/${projectId}/3d-scenes`, { params });
    return res.data?.scenes || [];
  },

  /**
   * Get single scene details by ID
   */
  async getSceneById(sceneId) {
    const res = await api.get(`/3d-scenes/${sceneId}`);
    return res.data?.scene || null;
  },

  /**
   * Get all mapped entities for a 3D scene
   */
  async getSceneEntities(sceneId) {
    const res = await api.get(`/3d-scenes/${sceneId}/entities`);
    return res.data?.entities || [];
  },

  /**
   * Resolve a meshKey to live CRM unit data on hover/click
   */
  async resolveMesh(sceneId, meshKey) {
    const res = await api.get(`/3d-scenes/${sceneId}/entities/${encodeURIComponent(meshKey)}/resolve`);
    return res.data || null;
  }
};
