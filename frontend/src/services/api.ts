import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

const normalizeApiBaseUrl = (raw: string | undefined) => {
  const base = (raw || 'http://localhost:3000').replace(/\/+$/, '');
  if (base.endsWith('/api/v1')) return base;
  // If user provided an explicit API prefix (e.g. /api/v2), respect it.
  if (/\/api\/v\d+$/.test(base)) return base;
  return `${base}/api/v1`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async logout() {
    await this.client.post('/auth/logout');
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Products
  async getProducts() {
    const response = await this.client.get('/products');
    return response.data;
  }

  async getProduct(id: string) {
    const response = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async createProduct(data: any) {
    const response = await this.client.post('/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: any) {
    const response = await this.client.put(`/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string) {
    await this.client.delete(`/products/${id}`);
  }

  // Customers
  async getCustomers() {
    const response = await this.client.get('/customers');
    return response.data;
  }

  async getCustomer(id: string) {
    const response = await this.client.get(`/customers/${id}`);
    return response.data;
  }

  async createCustomer(data: any) {
    const response = await this.client.post('/customers', data);
    return response.data;
  }

  async updateCustomer(id: string, data: any) {
    const response = await this.client.put(`/customers/${id}`, data);
    return response.data;
  }

  // Sales
  async getSales() {
    const response = await this.client.get('/sales');
    return response.data;
  }

  async getSale(id: string) {
    const response = await this.client.get(`/sales/${id}`);
    return response.data;
  }

  async createSale(data: any) {
    const response = await this.client.post('/sales', data);
    return response.data;
  }

  // Cash Sessions
  async openCashSession(openingBalance: number, terminalId: string = 'TERMINAL_01') {
    const response = await this.client.post('/cash-sessions', { 
      initialCash: openingBalance,
      terminalId 
    });
    return response.data.data;
  }

  async closeCashSession(closingBalance: number, sessionId: string) {
    const response = await this.client.post(`/cash-sessions/${sessionId}/cashier-close`, { 
      cashierCashCount: closingBalance 
    });
    return response.data.data;
  }

  async getCurrentCashSession(terminalId: string = 'TERMINAL_01') {
    const response = await this.client.get(`/cash-sessions/current?terminalId=${terminalId}`);
    return response.data.data;
  }

  // Comandas
  async getComandasByTable(tableNumber: string) {
    const response = await this.client.get(`/comandas?table=${tableNumber}`);
    return response.data;
  }

  async createComanda(data: any) {
    const response = await this.client.post('/comandas', data);
    return response.data;
  }

  async updateComanda(id: string, data: any) {
    const response = await this.client.put(`/comandas/${id}`, data);
    return response.data;
  }

  async completeComanda(id: string) {
    const response = await this.client.post(`/comandas/${id}/complete`, {});
    return response.data;
  }

  // Coupons
  async getCoupons() {
    const response = await this.client.get('/coupons');
    return response.data;
  }

  async validateCoupon(code: string) {
    const response = await this.client.post('/coupons/validate', { code });
    return response.data;
  }

  // Loyalty
  async getLoyaltyTransactions(customerId: string) {
    const response = await this.client.get(`/loyalty/${customerId}/transactions`);
    return response.data;
  }

  async redeemLoyaltyPoints(customerId: string, points: number) {
    const response = await this.client.post(`/loyalty/${customerId}/redeem`, { points });
    return response.data;
  }

  // Cashback
  async getCashbackBalance(customerId: string) {
    const response = await this.client.get(`/cashback/${customerId}/balance`);
    return response.data;
  }

  async redeemCashback(customerId: string, amount: number) {
    const response = await this.client.post(`/cashback/${customerId}/redeem`, { amount });
    return response.data;
  }

  // Financial Reports
  async getTransactionsSummary(startDate: string, endDate: string) {
    const response = await this.client.get('/financial/transactions/summary', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getDREReport(startDate: string, endDate: string) {
    const response = await this.client.get('/financial/reports/dre', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getCashFlowReport(startDate: string, endDate: string) {
    const response = await this.client.get('/financial/reports/cash-flow', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getProfitabilityReport(startDate: string, endDate: string) {
    const response = await this.client.get('/financial/reports/profitability', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getIndicatorsReport() {
    const response = await this.client.get('/financial/reports/indicators');
    return response.data;
  }

  async getComparativeReport(startDate: string, endDate: string) {
    const response = await this.client.get('/financial/reports/comparative', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  // Product Reports
  async getProductTimeSeriesReport(
    startDate: string,
    endDate: string,
    granularity: 'day' | 'month' | 'year' = 'day'
  ) {
    const response = await this.client.get('/reports/products/timeseries', {
      params: { startDate, endDate, granularity },
    });
    return response.data;
  }

  async getProductRankingReport(
    startDate: string,
    endDate: string,
    metric: 'revenue' | 'quantity' = 'revenue',
    limit: number = 20
  ) {
    const response = await this.client.get('/reports/products/ranking', {
      params: { startDate, endDate, metric, limit },
    });
    return response.data;
  }

  async getProductABCCurveReport(startDate: string, endDate: string) {
    const response = await this.client.get('/reports/products/abc', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getDailyReport(date: string) {
    const response = await this.client.get('/financial/daily', {
      params: { date },
    });
    return response.data;
  }

  async getMonthlyReport(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    return this.getTransactionsSummary(startDate, endDate);
  }

  // Financial - Categories
  async getFinancialCategories(isActive?: boolean) {
    const response = await this.client.get('/financial/categories', {
      params: isActive === undefined ? undefined : { isActive },
    });
    return response.data;
  }

  async getFinancialCategoriesByType(categoryType: 'revenue' | 'cost' | 'expense') {
    const response = await this.client.get(`/financial/categories/type/${categoryType}`);
    return response.data;
  }

  async createFinancialCategory(data: any) {
    const response = await this.client.post('/financial/categories', data);
    return response.data;
  }

  async updateFinancialCategory(id: string, data: any) {
    const response = await this.client.put(`/financial/categories/${id}`, data);
    return response.data;
  }

  // Financial - Payment Methods Config
  async getPaymentMethodConfigs() {
    const response = await this.client.get('/financial/payment-methods');
    return response.data;
  }

  async upsertPaymentMethodConfig(paymentMethod: string, data: any) {
    const response = await this.client.put(`/financial/payment-methods/${paymentMethod}`, data);
    return response.data;
  }

  // Financial - Transactions
  async searchFinancialTransactions(params: any) {
    const response = await this.client.get('/financial/transactions', { params });
    return response.data;
  }

  async createFinancialTransaction(data: any) {
    const response = await this.client.post('/financial/transactions', data);
    return response.data;
  }

  async updateFinancialTransaction(id: string, data: any) {
    const response = await this.client.put(`/financial/transactions/${id}`, data);
    return response.data;
  }

  async markFinancialTransactionPaid(id: string) {
    const response = await this.client.patch(`/financial/transactions/${id}/mark-paid`, {});
    return response.data;
  }

  async cancelFinancialTransaction(id: string, reason: string) {
    const response = await this.client.post(`/financial/transactions/${id}/cancel`, { reason });
    return response.data;
  }

  // Financial - Accounts Payable
  async searchAccountsPayable(params: any) {
    const response = await this.client.get('/financial/accounts-payable', { params });
    return response.data;
  }

  async createAccountPayable(data: any) {
    const response = await this.client.post('/financial/accounts-payable', data);
    return response.data;
  }

  async updateAccountPayable(id: string, data: any) {
    const response = await this.client.put(`/financial/accounts-payable/${id}`, data);
    return response.data;
  }

  async payAccountPayable(id: string, data: any) {
    const response = await this.client.post(`/financial/accounts-payable/${id}/payment`, data);
    return response.data;
  }

  async cancelAccountPayable(id: string, reason: string) {
    const response = await this.client.post(`/financial/accounts-payable/${id}/cancel`, { reason });
    return response.data;
  }

  async getAccountsPayableSummary() {
    const response = await this.client.get('/financial/accounts-payable/summary');
    return response.data;
  }

  async getAccountsPayableUpcoming(days: number = 7) {
    const response = await this.client.get('/financial/accounts-payable/upcoming', { params: { days } });
    return response.data;
  }

  async getAccountsPayableOverdue() {
    const response = await this.client.get('/financial/accounts-payable/overdue');
    return response.data;
  }

  // Financial - Accounts Receivable
  async searchAccountsReceivable(params: any) {
    const response = await this.client.get('/financial/accounts-receivable', { params });
    return response.data;
  }

  async createAccountReceivable(data: any) {
    const response = await this.client.post('/financial/accounts-receivable', data);
    return response.data;
  }

  async receiveAccountReceivable(id: string, data: any) {
    const response = await this.client.post(`/financial/accounts-receivable/${id}/payment`, data);
    return response.data;
  }

  async cancelAccountReceivable(id: string, reason: string) {
    const response = await this.client.post(`/financial/accounts-receivable/${id}/cancel`, { reason });
    return response.data;
  }

  async getAccountsReceivableSummary() {
    const response = await this.client.get('/financial/accounts-receivable/summary');
    return response.data;
  }

  async getAccountsReceivableUpcoming(days: number = 7) {
    const response = await this.client.get('/financial/accounts-receivable/upcoming', { params: { days } });
    return response.data;
  }

  async getAccountsReceivableOverdue() {
    const response = await this.client.get('/financial/accounts-receivable/overdue');
    return response.data;
  }

  async getAccountsReceivableDSO() {
    const response = await this.client.get('/financial/accounts-receivable/analytics/dso');
    return response.data;
  }

  // Generic HTTP Methods
  async get(url: string, config?: any) {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: any) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: any) {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch(url: string, data?: any, config?: any) {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: any) {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
