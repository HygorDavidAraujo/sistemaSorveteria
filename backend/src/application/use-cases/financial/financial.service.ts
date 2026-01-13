import { PrismaClient, FinancialTransaction, FinancialCategory } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';
import {
  FinancialTransactionType,
  FinancialTransactionStatus,
  CategoryType,
} from '@domain/entities/financial.entity';

// Re-exportar tipos para uso externo
export { FinancialTransactionType, FinancialTransactionStatus, CategoryType };

export interface CreateFinancialTransactionDTO {
  categoryId: string;
  transactionType: FinancialTransactionType;
  amount: number;
  description: string;
  referenceNumber?: string;
  transactionDate: Date;
  dueDate?: Date;
  status?: FinancialTransactionStatus;
  paidAt?: Date;
  saleId?: string;
  createdById: string;
}

export interface UpdateFinancialTransactionDTO {
  description?: string;
  dueDate?: Date;
  paidAt?: Date;
  status?: FinancialTransactionStatus;
}

export interface SearchFinancialTransactionDTO {
  categoryId?: string;
  transactionType?: FinancialTransactionType;
  status?: FinancialTransactionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface CreateFinancialCategoryDTO {
  name: string;
  categoryType: CategoryType;
  dreGroup?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateFinancialCategoryDTO {
  name?: string;
  categoryType?: CategoryType;
  dreGroup?: string;
  parentId?: string;
  isActive?: boolean;
}

const createdBySafeSelect = {
  select: {
    id: true,
    fullName: true,
    email: true,
    role: true,
  },
} as const;

/**
 * Financial Service - Núcleo do módulo financeiro
 * Responsável por gerenciar transações financeiras
 */
export class FinancialService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  /**
   * Criar transação financeira
   */
  async createTransaction(
    data: CreateFinancialTransactionDTO
  ): Promise<FinancialTransaction> {
    // Validar categoria
    const category = await this.prismaClient.financialCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category || !category.isActive) {
      throw new AppError('Categoria financeira não encontrada ou inativa', 404);
    }

    // Validar categoria type com valores do Prisma
    if (data.transactionType === 'revenue' && 
        !['revenue'].includes(category.categoryType)) {
      throw new AppError('Categoria inválida para receita', 400);
    }

    if (data.transactionType === 'expense' &&
        !['cost', 'expense'].includes(category.categoryType)) {
      throw new AppError('Categoria inválida para despesa', 400);
    }

    // Validar valor
    if (data.amount <= 0) {
      throw new AppError('Valor deve ser maior que zero', 400);
    }

    // Prisma só tem: pending, paid, cancelled, overdue
    const status: FinancialTransactionStatus = data.status ?? 'pending';
    const paidAt = status === 'paid' ? (data.paidAt ?? data.transactionDate) : undefined;

    const transaction = await this.prismaClient.financialTransaction.create({
      data: {
        categoryId: data.categoryId,
        transactionType: data.transactionType,
        amount: data.amount,
        description: data.description,
        referenceNumber: data.referenceNumber,
        transactionDate: data.transactionDate,
        dueDate: data.dueDate,
        paidAt,
        saleId: data.saleId,
        status: status as any,
        createdById: data.createdById,
      },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    });

    return transaction as any;
  }

  /**
   * Atualizar transação financeira
   */
  async updateTransaction(
    transactionId: string,
    data: UpdateFinancialTransactionDTO,
    userId: string
  ): Promise<FinancialTransaction> {
    const transaction = await this.prismaClient.financialTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new AppError('Transação financeira não encontrada', 404);
    }

    // Validações de transição de status
    if (data.status) {
      this.validateStatusTransition(transaction.status as any, data.status);
    }

    const updated = await this.prismaClient.financialTransaction.update({
      where: { id: transactionId },
      data: {
        ...data,
      },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    });

    return updated as any;
  }

  /**
   * Marcar transação como paga
   */
  async markAsPaid(transactionId: string, userId: string): Promise<FinancialTransaction> {
    const transaction = await this.prismaClient.financialTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new AppError('Transação financeira não encontrada', 404);
    }

    if (transaction.status === 'paid') {
      throw new AppError('Transação já foi paga', 400);
    }

    if (transaction.status === 'cancelled') {
      throw new AppError('Não é possível marcar transação cancelada como paga', 400);
    }

    const updated = await this.prismaClient.financialTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    });

    return updated as any;
  }

  /**
   * Buscar transações financeiras
   */
  async searchTransactions(
    filters: SearchFinancialTransactionDTO
  ): Promise<{ data: FinancialTransaction[]; total: number }> {
    const {
      categoryId,
      transactionType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Construir where clause
    const where: any = {};

    if (categoryId) where.categoryId = categoryId;
    if (transactionType) where.transactionType = transactionType;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prismaClient.financialTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
        include: {
          category: true,
          createdBy: createdBySafeSelect,
        },
      }),
      this.prismaClient.financialTransaction.count({ where }),
    ]);

    return { data: data as any, total };
  }

  /**
   * Obter transação por ID
   */
  async getTransactionById(transactionId: string): Promise<FinancialTransaction> {
    const transaction = await this.prismaClient.financialTransaction.findUnique({
      where: { id: transactionId },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    });

    if (!transaction) {
      throw new AppError('Transação financeira não encontrada', 404);
    }

    return transaction as any;
  }

  /**
   * Cancelar transação
   */
  async cancelTransaction(
    transactionId: string,
    reason: string,
    userId: string
  ): Promise<FinancialTransaction> {
    const transaction = await this.prismaClient.financialTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new AppError('Transação financeira não encontrada', 404);
    }

    if (['paid', 'cancelled'].includes(transaction.status)) {
      throw new AppError('Não é possível cancelar esta transação', 400);
    }

    const updated = await this.prismaClient.financialTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'cancelled',
        description: `${transaction.description} - CANCELADO: ${reason}`,
      },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    });

    return updated as any;
  }

  /**
   * Obter categorias financeiras
   */
  async getCategories(isActive?: boolean): Promise<FinancialCategory[]> {
    return this.prismaClient.financialCategory.findMany({
      where: isActive !== undefined ? { isActive } : {},
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obter categorias por tipo
   */
  async getCategoriesByType(categoryType: CategoryType): Promise<FinancialCategory[]> {
    return this.prismaClient.financialCategory.findMany({
      where: { categoryType, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Criar categoria financeira
   */
  async createCategory(data: CreateFinancialCategoryDTO): Promise<FinancialCategory> {
    // Validar nome único
    const existing = await this.prismaClient.financialCategory.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError('Categoria com este nome já existe', 400);
    }

    // Validar categoria pai se existir
    if (data.parentId) {
      const parent = await this.prismaClient.financialCategory.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new AppError('Categoria pai não encontrada', 404);
      }
    }

    return this.prismaClient.financialCategory.create({
      data: {
        name: data.name,
        categoryType: data.categoryType,
        dreGroup: data.dreGroup,
        parentId: data.parentId,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Atualizar categoria financeira
   */
  async updateCategory(
    categoryId: string,
    data: UpdateFinancialCategoryDTO
  ): Promise<FinancialCategory> {
    const category = await this.prismaClient.financialCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new AppError('Categoria financeira não encontrada', 404);
    }

    // Se renomeando, validar unicidade
    if (data.name && data.name !== category.name) {
      const existing = await this.prismaClient.financialCategory.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new AppError('Categoria com este nome já existe', 400);
      }
    }

    // Validar categoria pai se for alterada
    if (data.parentId && data.parentId !== category.parentId) {
      const parent = await this.prismaClient.financialCategory.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new AppError('Categoria pai não encontrada', 404);
      }
    }

    return this.prismaClient.financialCategory.update({
      where: { id: categoryId },
      data,
    });
  }

  /**
   * Obter resumo de transações por status
   */
  async getTransactionsSummary(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    pending: number;
    scheduled: number;
    paid: number;
    overdue: number;
  }> {
    const transactions = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      pending: 0,
      scheduled: 0, // Não existe no Prisma, mas mantemos para retrocompatibilidade
      paid: 0,
      overdue: 0,
    };

    transactions.forEach((txn) => {
      if (txn.transactionType === 'revenue') {
        summary.totalIncome += Number(txn.amount);
      } else {
        summary.totalExpense += Number(txn.amount);
      }

      if (txn.status === 'pending') summary.pending++;
      // Scheduled não existe no enum do Prisma
      if (txn.status === 'paid') summary.paid++;
      if (txn.status === 'overdue') summary.overdue++;
    });

    return summary;
  }

  /**
   * Validar transição de status
   * Usa apenas os status do Prisma: pending, paid, cancelled, overdue
   */
  private validateStatusTransition(
    currentStatus: FinancialTransactionStatus,
    newStatus: FinancialTransactionStatus
  ): void {  
    // Status válidos do Prisma: 'pending', 'paid', 'cancelled', 'overdue'
    const validTransitions: Record<string, string[]> = {
      'pending': ['paid', 'cancelled', 'overdue'],
      'paid': [], // Não pode mais alterar
      'cancelled': [], // Não pode mais alterar
      'overdue': ['paid', 'cancelled'],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        `Transição de status inválida: ${currentStatus} para ${newStatus}`,
        400
      );
    }
  }
}
