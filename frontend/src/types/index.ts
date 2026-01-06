export interface User {
  id: string;
  email: string;
  name?: string; // Deprecated, use fullName
  fullName: string;
  role: 'admin' | 'operator' | 'cashier' | 'manager';
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  salePrice?: number | string; // Backend retorna como string
  costPrice?: number | string;
  categoryId?: string;
  category?: 'sorvete' | 'bebida' | 'sobremesa' | 'outro' | Category;
  image?: string;
  isActive?: boolean;
  code?: string;
  saleType?: string;
  unit?: string;
  eligibleForLoyalty?: boolean;
  loyaltyPointsMultiplier?: number | string;
  trackStock?: boolean;
  currentStock?: number | string;
  minStock?: number | string;
  cashbackPercentage?: number | string;
  earns_cashback?: boolean;
  createdAt?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
  customerType?: string;
  acceptsMarketing?: boolean;
  preferredContactMethod?: string;
  // Address fields
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  referencePoint?: string;
  // Loyalty - API returns as string for Decimal fields
  loyaltyPoints: number;
  cashbackBalance: number | string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  customerId?: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'pix';
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
}

export interface CashSession {
  id: string;
  operatorId: string;
  openingBalance: number;
  currentBalance: number;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
}

export interface Comanda {
  id: string;
  tableNumber?: string;
  items: SaleItem[];
  status: 'open' | 'completed' | 'cancelled';
  subtotal: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiresAt: string;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  points: number;
  type: 'earn' | 'redeem';
  description: string;
  createdAt: string;
}

export interface CashbackTransaction {
  id: string;
  customerId: string;
  amount: number;
  type: 'earn' | 'redeem';
  description: string;
  createdAt: string;
}

export interface FinancialReport {
  period: string;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalPix: number;
  discountsApplied: number;
  loyaltyRedeemed: number;
  cashbackRedeemed: number;
  netRevenue: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
