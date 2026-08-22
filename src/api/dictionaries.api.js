import { api } from './client';

export const dictionariesApi = {
  /**
   * Получить элементы справочника
   * @param {string} [type] EXPENSE_CATEGORY, INCOME_CATEGORY, LEAD_SOURCE, LOSS_REASON, PAYMENT_METHOD
   */
  getItems: async (type = null) => {
    const res = await api.get('/dictionaries', { params: type ? { type } : {} });
    return res?.data || res || [];
  },

  /**
   * Создать новый элемент справочника
   */
  createItem: async (data) => {
    const res = await api.post('/dictionaries', data);
    return res?.data || res;
  },

  /**
   * Обновить элемент справочника
   */
  updateItem: async (id, data) => {
    const res = await api.put(`/dictionaries/${id}`, data);
    return res?.data || res;
  },

  /**
   * Удалить элемент справочника
   */
  deleteItem: async (id) => {
    const res = await api.delete(`/dictionaries/${id}`);
    return res?.data || res;
  }
};
