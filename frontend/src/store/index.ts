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
  updateItem: (itemId: string, quantity: number, totalPrice?: number) => void;
  setItems: (items: any[]) => void;
  clear: () => void;
  setTotal: (total: number) => void;
}

export const useSalesStore = create<SalesStore>((set) => ({
  items: [],
  total: 0,

  addItem: (item: any) => {
    set((state) => {
      // Produtos de peso (balança) nunca são agrupados
      if (item.saleType === 'weight') {
        return { items: [...state.items, item] };
      }
      
      // Produtos normais são agrupados por productId (convertendo para string para comparação consistente)
      const productIdStr = String(item.productId);
      const existingItem = state.items.find((i) => String(i.productId) === productIdStr);
      
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            String(i.productId) === productIdStr
              ? { 
                  ...i, 
                  id: existingItem.id, // Mantém o ID original do item
                  quantity: i.quantity + item.quantity,
                  totalPrice: (i.quantity + item.quantity) * i.unitPrice
                }
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

  updateItem: (itemId: string, quantity: number, totalPrice?: number) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId 
          ? { 
              ...i, 
              quantity,
              totalPrice: totalPrice !== undefined ? totalPrice : quantity * i.unitPrice
            } 
          : i
      ).filter((i) => i.quantity > 0),
    }));
  },

  setItems: (items: any[]) => set({ items: Array.isArray(items) ? items : [] }),

  clear: () => set({ items: [], total: 0 }),

  setTotal: (total: number) => set({ total }),
}));

// Store separado para o carrinho do Delivery
interface DeliveryStore {
  items: any[];
  total: number;
  addItem: (item: any) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, quantity: number, totalPrice?: number) => void;
  setItems: (items: any[]) => void;
  clear: () => void;
  setTotal: (total: number) => void;
}

export const useDeliveryStore = create<DeliveryStore>((set) => ({
  items: [],
  total: 0,

  addItem: (item: any) => {
    set((state) => {
      if (item.saleType === 'weight') {
        return { items: [...state.items, item] };
      }
      const productIdStr = String(item.productId);
      const existingItem = state.items.find((i) => String(i.productId) === productIdStr);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            String(i.productId) === productIdStr
              ? {
                  ...i,
                  id: existingItem.id,
                  quantity: i.quantity + item.quantity,
                  totalPrice: (i.quantity + item.quantity) * i.unitPrice,
                }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    });
  },

  removeItem: (itemId: string) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
  },

  updateItem: (itemId: string, quantity: number, totalPrice?: number) => {
    set((state) => ({
      items: state.items
        .map((i) =>
          i.id === itemId
            ? {
                ...i,
                quantity,
                totalPrice: totalPrice !== undefined ? totalPrice : quantity * i.unitPrice,
              }
            : i
        )
        .filter((i) => i.quantity > 0),
    }));
  },

  setItems: (items: any[]) => set({ items: Array.isArray(items) ? items : [] }),

  clear: () => set({ items: [], total: 0 }),

  setTotal: (total: number) => set({ total }),
}));

interface CashSessionStore {
  currentSession: any | null;
  isOpen: boolean;
  lastLoadTime: number;
  isLoading: boolean;
  loadSession: () => Promise<void>;
  openSession: (openingBalance: number) => Promise<void>;
  closeSession: (closingBalance: number) => Promise<any>;
}

export const useCashSessionStore = create<CashSessionStore>((set, get) => ({
  currentSession: null,
  isOpen: false,
  lastLoadTime: 0,
  isLoading: false,

  loadSession: async () => {
    const state = get();
    const now = Date.now();
    
    // Se carregou há menos de 2 segundos, não recarrega
    if (state.isLoading || (now - state.lastLoadTime < 2000)) {
      return;
    }

    set({ isLoading: true });
    try {
      const terminalId = localStorage.getItem('terminalId') || 'TERMINAL_01';
      const session = await apiClient.getCurrentCashSession(terminalId);
      set({ 
        currentSession: session, 
        isOpen: session?.status === 'open',
        lastLoadTime: now,
        isLoading: false
      });
    } catch {
      set({ currentSession: null, isOpen: false, isLoading: false });
    }
  },

  openSession: async (openingBalance: number) => {
    const terminalId = localStorage.getItem('terminalId') || 'TERMINAL_01';
    const session = await apiClient.openCashSession(openingBalance, terminalId);
    set({ currentSession: session, isOpen: true });
  },

  closeSession: async (closingBalance: number) => {
    const { currentSession } = get();
    if (!currentSession?.id) {
      throw new Error('Nenhuma sessão aberta para fechar');
    }
    const session = await apiClient.closeCashSession(closingBalance, currentSession.id);
    set({ currentSession: session, isOpen: false });
    return session;
  },
}));

// Store para produtos com cache
interface ProductsStore {
  products: any[];
  lastLoadTime: number;
  isLoading: boolean;
  loadProducts: () => Promise<void>;
}

export const useProductsStore = create<ProductsStore>((set, get) => ({
  products: [],
  lastLoadTime: 0,
  isLoading: false,

  loadProducts: async () => {
    const state = get();
    const now = Date.now();
    
    // Se carregou há menos de 5 segundos, não recarrega
    if (state.isLoading || (now - state.lastLoadTime < 5000 && state.products.length > 0)) {
      return;
    }

    set({ isLoading: true });
    try {
      const response = await apiClient.getProducts();
      const productsData = response.data || response;
      set({ 
        products: productsData,
        lastLoadTime: now,
        isLoading: false
      });
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      set({ isLoading: false });
    }
  },
}));

// Store para clientes com cache
interface CustomersStore {
  customers: any[];
  lastLoadTime: number;
  isLoading: boolean;
  loadCustomers: () => Promise<void>;
}

export const useCustomersStore = create<CustomersStore>((set, get) => ({
  customers: [],
  lastLoadTime: 0,
  isLoading: false,

  loadCustomers: async () => {
    const state = get();
    const now = Date.now();
    
    // Se carregou há menos de 5 segundos, não recarrega
    if (state.isLoading || (now - state.lastLoadTime < 5000 && state.customers.length > 0)) {
      return;
    }

    set({ isLoading: true });
    try {
      const response = await apiClient.getCustomers();
      // apiClient.getCustomers() já retorna response.data que é { status, data }
      const customersData = response.data || response;
      set({ 
        customers: customersData,
        lastLoadTime: now,
        isLoading: false
      });
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      set({ isLoading: false });
    }
  },
}));
