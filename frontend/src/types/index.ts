export interface User {
  id: string;
  email: string;
  name?: string; // Deprecated, use fullName
  fullName: string;
  role: 'admin' | 'operator' | 'cashier' | 'manager';
  createdAt?: string;
}

export type ProductCategoryType = 'common' | 'assembled';

export interface CategorySize {
  id: string;
  categoryId: string;
  name: string;
  maxFlavors: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  categoryType?: ProductCategoryType;
  sizes?: CategorySize[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductSizePrice {
  id: string;
  productId: string;
  categorySizeId: string;
  price: number | string;
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
  sizePrices?: ProductSizePrice[];
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

export interface TransactionsSummaryReport {
  totalIncome: number;
  totalExpense: number;
  pending: number;
  scheduled: number;
  paid: number;
  overdue: number;
}

export interface DREReport {
  period: { startDate: string; endDate: string };
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: number;
  operatingProfit: number;
  operatingMargin: number;
  financialIncome: number;
  financialExpenses: number;
  financialResult: number;
  otherIncome: number;
  otherExpenses: number;
  profitBeforeTaxes: number;
  taxes: number;
  netProfit: number;
  netMargin: number;
}

export interface CashFlowReport {
  period: { startDate: string; endDate: string };
  initialBalance: number;
  inflows: {
    sales: number;
    accountsReceivable: number;
    otherIncome: number;
    total: number;
  };
  outflows: {
    cogs: number;
    operatingExpenses: number;
    accountsPayable: number;
    taxes: number;
    investments: number;
    other: number;
    total: number;
  };
  netCashFlow: number;
  finalBalance: number;
}

export interface ProfitabilityReport {
  period: { startDate: string; endDate: string };
  grossProfitMargin: number;
  operatingMargin: number;
  netMargin: number;
  roi: number;
  breakEvenPoint: number;
  contributionMargin: number;
}

export type ProductReportGranularity = 'day' | 'month' | 'year';
export type ProductRankingMetric = 'revenue' | 'quantity';

export interface ProductTimeSeriesPoint {
  bucket: string;
  quantity: number;
  revenue: number;
}

export interface ProductTimeSeriesReport {
  period: { startDate: string; endDate: string };
  granularity: ProductReportGranularity;
  totals: { quantity: number; revenue: number };
  series: ProductTimeSeriesPoint[];
}

export interface ProductRankingItem {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface ProductRankingReport {
  period: { startDate: string; endDate: string };
  metric: ProductRankingMetric;
  limit: number;
  totals: { quantity: number; revenue: number };
  items: ProductRankingItem[];
}

export interface ProductABCCurveItem extends ProductRankingItem {
  share: number;
  cumulativeShare: number;
  abcClass: 'A' | 'B' | 'C';
}

export interface ProductABCCurveReport {
  period: { startDate: string; endDate: string };
  totalRevenue: number;
  items: ProductABCCurveItem[];
}

export interface FinancialIndicatorsReport {
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  returnOnAssets: number;
  returnOnEquity: number;
  inventoryTurnover: number;
  receivablesTurnover: number;
}

export interface ComparativeReport {
  current: DREReport;
  previous: DREReport;
  variation: {
    revenueVariation: number;
    revenueVariationPercent: number;
    netProfitVariation: number;
    netProfitVariationPercent: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// -----------------------------------------------------------------------------
// Finance module (backend: /financial/*)
// -----------------------------------------------------------------------------

export type PaymentMethod = 'cash' | 'debit_card' | 'credit_card' | 'pix' | 'other';

export interface FinancialCategory {
  id: string;
  name: string;
  categoryType: 'revenue' | 'cost' | 'expense';
  dreGroup?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface FinancialTransaction {
  id: string;
  categoryId: string;
  transactionType: 'revenue' | 'expense' | 'transfer';
  amount: number | string;
  description: string;
  referenceNumber?: string | null;
  transactionDate: string;
  dueDate?: string | null;
  paidAt?: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  category?: FinancialCategory;
}

export interface AccountPayable {
  id: string;
  supplierName: string;
  description: string;
  amount: number | string;
  dueDate: string;
  paidAt?: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  notes?: string | null;
  category?: FinancialCategory;
}

export interface AccountReceivable {
  id: string;
  customerId?: string | null;
  customerName: string;
  description: string;
  amount: number | string;
  dueDate: string;
  receivedAt?: string | null;
  saleId?: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  notes?: string | null;
}

export interface PaymentMethodConfig {
  id: string;
  paymentMethod: PaymentMethod;
  feePercent: number | string;
  settlementDays?: number | null;
  isActive: boolean;
}
