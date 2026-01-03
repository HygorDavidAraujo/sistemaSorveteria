/**
 * Financial Domain Entities
 * Entidades e tipos do domínio financeiro
 * 
 * Utiliza os tipos gerados pelo Prisma para garantir compatibilidade total
 * com o schema do banco de dados
 */

import { 
  TransactionStatus, 
  TransactionFinancialType, 
  CategoryType as PrismaCategoryType 
} from '@prisma/client';

// Re-exportar tipos do Prisma para uso no domínio
export type FinancialTransactionType = TransactionFinancialType;
export type FinancialTransactionStatus = TransactionStatus;
export type CategoryType = PrismaCategoryType;

// Enum para agrupamento no DRE (não existe no Prisma)
export enum DREGroup {
  GROSS_REVENUE = 'gross_revenue',
  GROSS_PROFIT = 'gross_profit',
  OPERATING_PROFIT = 'operating_profit',
  FINANCIAL_RESULT = 'financial_result',
  NET_PROFIT = 'net_profit',
}

export interface FinancialCategoryEntity {
  id: string;
  name: string;
  categoryType: CategoryType;
  dreGroup?: DREGroup;
  parentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialTransactionEntity {
  id: string;
  categoryId: string;
  transactionType: FinancialTransactionType;
  amount: number;
  description: string;
  referenceNumber?: string;
  transactionDate: Date;
  dueDate?: Date;
  paidAt?: Date;
  status: FinancialTransactionStatus;
  saleId?: string;
  createdById?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AccountPayableEntity {
  id: string;
  supplierName: string;
  description: string;
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  status: FinancialTransactionStatus;
  categoryId: string;
  notes?: string;
  createdById?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AccountReceivableEntity {
  id: string;
  customerId?: string;
  customerName: string;
  saleId?: string;
  description: string;
  amount: number;
  dueDate: Date;
  receivedAt?: Date;
  status: FinancialTransactionStatus;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DREReportEntity {
  period: {
    startDate: Date;
    endDate: Date;
  };
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

export interface CashFlowEntity {
  period: {
    startDate: Date;
    endDate: Date;
  };
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

export interface ProfitabilityAnalysisEntity {
  period: {
    startDate: Date;
    endDate: Date;
  };
  grossProfitMargin: number;
  operatingMargin: number;
  netMargin: number;
  roi: number;
  breakEvenPoint: number;
  contributionMargin: number;
}

export interface FinancialIndicatorsEntity {
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  returnOnAssets: number;
  returnOnEquity: number;
  inventoryTurnover: number;
  receivablesTurnover: number; // Corrigido o typo
}
