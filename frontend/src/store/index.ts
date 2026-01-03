import { create } from 'zustand';
import type { User, AuthResponse } from '@/types';
import { apiClient } from '@/services/api';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Attempting login...', { email });
      const response: any = await apiClient.login(email, password);
      console.log('Login response:', response);
      
      // Backend returns { status: 'success', data: { accessToken, refreshToken, user } }
      const authData = response.data || response;
      
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('user', JSON.stringify(authData.user));
      set({
        user: authData.user,
        accessToken: authData.accessToken,
        isLoading: false,
      });
      console.log('Login successful, state updated');
    } catch (error: any) {
      console.error('Login error:', error);
      set({
        error: error.response?.data?.message || 'Erro ao fazer login',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      set({ user: null, accessToken: null, isLoading: false });
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        set({
          accessToken: storedToken,
          user: JSON.parse(storedUser),
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

interface SalesStore {
  items: any[];
  total: number;
  addItem: (item: any) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, quantity: number) => void;
  clear: () => void;
  setTotal: (total: number) => void;
}

export const useSalesStore = create<SalesStore>((set) => ({
  items: [],
  total: 0,

  addItem: (item: any) => {
    set((state) => {
      const existingItem = state.items.find((i) => i.productId === item.productId);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    });
  },

  removeItem: (itemId: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
    }));
  },

  updateItem: (itemId: string, quantity: number) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      ).filter((i) => i.quantity > 0),
    }));
  },

  clear: () => set({ items: [], total: 0 }),

  setTotal: (total: number) => set({ total }),
}));

interface CashSessionStore {
  currentSession: any | null;
  isOpen: boolean;
  loadSession: () => Promise<void>;
  openSession: (openingBalance: number) => Promise<void>;
  closeSession: (closingBalance: number) => Promise<void>;
}

export const useCashSessionStore = create<CashSessionStore>((set) => ({
  currentSession: null,
  isOpen: false,

  loadSession: async () => {
    try {
      const session = await apiClient.getCurrentCashSession();
      set({ currentSession: session, isOpen: session?.status === 'open' });
    } catch {
      set({ currentSession: null, isOpen: false });
    }
  },

  openSession: async (openingBalance: number) => {
    const session = await apiClient.openCashSession(openingBalance);
    set({ currentSession: session, isOpen: true });
  },

  closeSession: async (closingBalance: number) => {
    const session = await apiClient.closeCashSession(closingBalance);
    set({ currentSession: session, isOpen: false });
  },
}));
