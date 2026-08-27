import { api } from '../../api/client';

export const passportApi = {
  /**
   * Request private signed upload URL for passport scan
   */
  async getUploadUrl({ projectId, dealId, leadId, filename, side }) {
    const res = await api.post('/documents/passport/upload-url', {
      projectId,
      dealId,
      leadId,
      filename,
      side
    });
    return res.data || res;
  },

  /**
   * Run Passport OCR Recognition Pipeline
   */
  async recognize({ frontPath, backPath, frontText, backText, projectId, dealId, leadId, documentType }) {
    const res = await api.post('/documents/passport/recognize', {
      frontPath,
      backPath,
      frontText,
      backText,
      projectId,
      dealId,
      leadId,
      documentType: documentType || 'PASSPORT_TJ'
    });
    return res.data || res;
  },

  /**
   * Confirm and verify passport data by manager
   */
  async verify(docId, verifiedData) {
    const res = await api.post(`/documents/passport/${docId}/verify`, {
      verifiedData
    });
    return res.data || res;
  },

  /**
   * Fetch passport document details
   */
  async getById(docId) {
    const res = await api.get(`/documents/passport/${docId}`);
    return res.data || res;
  },

  /**
   * Delete original raw scan images
   */
  async deleteImages(docId) {
    const res = await api.delete(`/documents/passport/${docId}/images`);
    return res.data || res;
  }
};
