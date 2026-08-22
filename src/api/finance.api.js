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

  updateIncome: async ({ id, ...data }) => {
    const res = await api.put(`/finance/income/${id}`, data);
    return res?.data || res;
  },

  deleteIncome: async (id) => {
    const res = await api.delete(`/finance/income/${id}`);
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

  updateExpense: async ({ id, ...data }) => {
    const res = await api.put(`/finance/expenses/${id}`, data);
    return res?.data || res;
  },

  deleteExpense: async (id) => {
    const res = await api.delete(`/finance/expenses/${id}`);
    return res?.data || res;
  },

  convertCurrency: async (convertData) => {
    const res = await api.post('/finance/convert', convertData);
    return res?.data || res;
  },

  getCashflow: async (filters = {}) => {
    const res = await api.get('/finance/cashflow', { params: filters });
    return res?.data || res;
  },

  getPlanFactReport: async (filters = {}) => {
    const res = await api.get('/finance/plan-fact', { params: filters });
    return res?.data || res;
  },

  getDealsForSelect: async () => {
    const res = await api.get('/deals');
    const deals = res?.data?.deals || res?.deals || res || [];
    return deals;
  },

  getProjectsForSelect: async () => {
    const res = await api.get('/projects');
    const projects = res?.data?.projects || res?.projects || res || [];
    return projects;
  }
};
