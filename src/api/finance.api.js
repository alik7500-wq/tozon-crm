import api from './axios';

export const financeApi = {
  getIncome: async (filters = {}) => {
    const { data } = await api.get('/finance/income', { params: filters });
    return data;
  },

  getExpenses: async (filters = {}) => {
    const { data } = await api.get('/finance/expenses', { params: filters });
    return data;
  },

  addExpense: async (expenseData) => {
    const { data } = await api.post('/finance/expenses', expenseData);
    return data;
  },

  getCashflow: async (filters = {}) => {
    const { data } = await api.get('/finance/cashflow', { params: filters });
    return data;
  },
};
