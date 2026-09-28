import { api } from '../../api/client';

export const passportApi = {
  analyzePassport: async (files, clientId = null) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((file) => formData.append('images', file));
    } else if (files) {
      formData.append('images', files);
    }

    if (clientId) {
      formData.append('client_id', String(clientId));
    }

    const response = await api.post('/documents/passport/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data?.data || response.data || response;
  },

  confirmPassport: async (confirmData) => {
    const response = await api.post('/documents/passport/confirm', confirmData);
    return response.data || response;
  },
};
