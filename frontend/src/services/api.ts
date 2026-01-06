import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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
  async getFinancialReport(startDate: string, endDate: string) {
    const response = await this.client.get('/financial/report', {
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
    const response = await this.client.get('/financial/monthly', {
      params: { month, year },
    });
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
