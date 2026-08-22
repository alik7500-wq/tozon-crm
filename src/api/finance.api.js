import { api } from './client.js';

export const financeApi = {
  getIncome: async (filters = {}) => {
    const res = await api.get('/finance/income', { params: filters });
    return res?.data || res;
  },

  addIncome: async (incomeData) => {
    const res = await api.post('/finance/income', incomeData);
    return res?.data || res;
  },

  getExpenses: async (filters = {}) => {
    const res = await api.get('/finance/expenses', { params: filters });
    return res?.data || res;
  },

  addExpense: async (expenseData) => {
    const res = await api.post('/finance/expenses', expenseData);
    return res?.data || res;
  },

  getCashflow: async (filters = {}) => {
    const res = await api.get('/finance/cashflow', { params: filters });
    return res?.data || res;
  },

  getDealsForSelect: async () => {
    const res = await api.get('/deals');
    const deals = res?.data?.deals || res?.deals || res || [];
    return deals;
  }
};
