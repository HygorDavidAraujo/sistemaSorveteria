import { PrismaClient, AccountReceivable } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';
import { FinancialTransactionStatus } from '@domain/entities/financial.entity';
import { FinancialService } from './financial.service';

export interface CreateAccountReceivableDTO {
  customerId?: string;
  customerName: string;
  description: string;
  saleId?: string;
  amount: number;
  dueDate: Date;
  notes?: string;
  createdById: string;
}

export interface UpdateAccountReceivableDTO {
  dueDate?: Date;
  notes?: string;
}

export interface ReceivePaymentDTO {
  paymentDate: Date;
  paymentMethod: string;
  notes?: string;
  userId: string;
}

export interface SearchAccountReceivableDTO {
  customerId?: string;
  status?: FinancialTransactionStatus;
  startDueDate?: Date;
  endDueDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Accounts Receivable Service - Gestão de contas a receber
 * Responsável por gerenciar créditos de clientes
 */
export class AccountReceivableService {
  private financialService: FinancialService;

  constructor(private prismaClient: PrismaClient = prisma) {
    this.financialService = new FinancialService(prismaClient);
  }

  /**
   * Criar conta a receber (geralmente via venda)
   */
  async createAccountReceivable(
    data: CreateAccountReceivableDTO
  ): Promise<AccountReceivable> {
    // Validar cliente (quando informado)
    if (data.customerId) {
      const customer = await this.prismaClient.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer) {
        throw new AppError('Cliente não encontrado', 404);
      }
    }

    // Se houver saleId, validar venda
    if (data.saleId) {
      const sale = await this.prismaClient.sale.findUnique({
        where: { id: data.saleId },
      });

      if (!sale) {
        throw new AppError('Venda não encontrada', 404);
      }
    }

    if (data.amount <= 0) {
      throw new AppError('Valor deve ser maior que zero', 400);
    }

    // Definir status inicial
    const now = new Date();
    const status = data.dueDate < now ? 'overdue' : 'pending';

    const accountReceivable = await this.prismaClient.accountReceivable.create({
      data: {
        customerId: data.customerId ?? null,
        customerName: data.customerName,
        description: data.description,
        saleId: data.saleId,
        amount: data.amount,
        dueDate: data.dueDate,
        status,
        notes: data.notes,
        createdById: data.createdById,
      },
      include: {
        customer: true,
      },
    });

    // Criar transação financeira vinculada (pendente/atrasada) para manter status consistente no Financeiro > Transações
    let revenueCategory = await this.prismaClient.financialCategory.findFirst({
      where: { name: 'Vendas' },
    });

    if (!revenueCategory) {
      revenueCategory = await this.prismaClient.financialCategory.create({
        data: {
          name: 'Vendas',
          categoryType: 'revenue',
          dreGroup: 'gross_revenue',
          isActive: true,
        },
      });
    }

    await this.financialService.createTransaction({
      categoryId: revenueCategory.id,
      transactionType: 'revenue',
      amount: Number(accountReceivable.amount),
      description: `Conta a Receber: ${accountReceivable.customerName} - ${accountReceivable.description}`,
      referenceNumber: accountReceivable.id,
      transactionDate: new Date(),
      dueDate: accountReceivable.dueDate,
      status: accountReceivable.status as any,
      createdById: data.createdById,
    });

    return accountReceivable as any;
  }

  /**
   * Registrar recebimento de cliente
   */
  async recordPayment(
    accountReceivableId: string,
    paymentData: ReceivePaymentDTO
  ): Promise<AccountReceivable> {
    const account = await this.prismaClient.accountReceivable.findUnique({
      where: { id: accountReceivableId },
      include: { customer: true },
    });

    if (!account) {
      throw new AppError('Conta a receber não encontrada', 404);
    }

    if (account.status === 'cancelled') {
      throw new AppError('Não é possível receber de conta cancelada', 400);
    }

    if (account.status === 'paid') {
      throw new AppError('Conta já foi recebida', 400);
    }

    // Atualizar conta a receber para status pago
    const updated = await this.prismaClient.accountReceivable.update({
      where: { id: accountReceivableId },
      data: {
        status: 'paid',
        receivedAt: paymentData.paymentDate,
        notes: paymentData.notes ? `${account.notes || ''}\nRecebimento em ${paymentData.paymentDate.toLocaleDateString('pt-BR')}: ${paymentData.notes}` : account.notes,
      },
      include: {
        customer: true,
      },
    });

    // Atualizar saldo de cliente se houver
    if (account.customerId) {
      await this.prismaClient.customer.update({
        where: { id: account.customerId },
        data: {
          totalPurchases: {
            increment: Number(account.amount),
          },
        },
      });
    }

    // Sincronizar transação financeira vinculada a esta conta (não deixar como pendente)
    const txUpdate = await this.prismaClient.financialTransaction.updateMany({
      where: {
        referenceNumber: accountReceivableId,
        status: {
          not: 'cancelled',
        },
      },
      data: {
        status: 'paid',
        paidAt: paymentData.paymentDate,
        transactionDate: paymentData.paymentDate,
      },
    });

    // Caso não exista transação (dados antigos), cria uma já como paga
    if (txUpdate.count === 0) {
      let revenueCategory = await this.prismaClient.financialCategory.findFirst({
        where: { name: 'Vendas' },
      });

      if (!revenueCategory) {
        revenueCategory = await this.prismaClient.financialCategory.create({
          data: {
            name: 'Vendas',
            categoryType: 'revenue',
            dreGroup: 'gross_revenue',
            isActive: true,
          },
        });
      }

      await this.financialService.createTransaction({
        categoryId: revenueCategory.id,
        transactionType: 'revenue',
        amount: Number(account.amount),
        description: `Conta a Receber: ${account.customerName} - ${account.description}`,
        referenceNumber: accountReceivableId,
        transactionDate: paymentData.paymentDate,
        dueDate: account.dueDate,
        status: 'paid',
        paidAt: paymentData.paymentDate,
        createdById: paymentData.userId,
      });
    }

    return updated as any;
  }

  /**
   * Buscar contas a receber
   */
  async searchAccountsReceivable(
    filters: SearchAccountReceivableDTO
  ): Promise<{ data: AccountReceivable[]; total: number }> {
    const {
      customerId,
      status,
      startDueDate,
      endDueDate,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    if (startDueDate || endDueDate) {
      where.dueDate = {};
      if (startDueDate) where.dueDate.gte = startDueDate;
      if (endDueDate) where.dueDate.lte = endDueDate;
    }

    const [data, total] = await Promise.all([
      this.prismaClient.accountReceivable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          customer: true,
        },
      }),
      this.prismaClient.accountReceivable.count({ where }),
    ]);

    return { data: data as any, total };
  }

  /**
   * Obter conta a receber por ID
   */
  async getAccountReceivableById(accountReceivableId: string): Promise<AccountReceivable> {
    const account = await this.prismaClient.accountReceivable.findUnique({
      where: { id: accountReceivableId },
      include: {
        customer: true,
      },
    });

    if (!account) {
      throw new AppError('Conta a receber não encontrada', 404);
    }

    return account as any;
  }

  /**
   * Atualizar conta a receber
   */
  async updateAccountReceivable(
    accountReceivableId: string,
    data: UpdateAccountReceivableDTO
  ): Promise<AccountReceivable> {
    const account = await this.prismaClient.accountReceivable.findUnique({
      where: { id: accountReceivableId },
    });

    if (!account) {
      throw new AppError('Conta a receber não encontrada', 404);
    }

    if (['paid', 'cancelled'].includes(account.status)) {
      throw new AppError('Não é possível atualizar conta que já foi recebida', 400);
    }

    const updated = await this.prismaClient.accountReceivable.update({
      where: { id: accountReceivableId },
      data,
      include: {
        customer: true,
      },
    }) as any;

    // Manter transação financeira vinculada sincronizada (vencimento)
    await this.prismaClient.financialTransaction.updateMany({
      where: {
        referenceNumber: accountReceivableId,
        status: {
          notIn: ['paid', 'cancelled'],
        },
      },
      data: {
        ...(data.dueDate ? { dueDate: data.dueDate } : {}),
      },
    });

    return updated;
  }

  /**
   * Cancelar conta a receber
   */
  async cancelAccountReceivable(
    accountReceivableId: string,
    reason: string,
    userId: string
  ): Promise<AccountReceivable> {
    const account = await this.prismaClient.accountReceivable.findUnique({
      where: { id: accountReceivableId },
      include: { customer: true },
    });

    if (!account) {
      throw new AppError('Conta a receber não encontrada', 404);
    }

    if (['paid', 'cancelled'].includes(account.status)) {
      throw new AppError('Não é possível cancelar esta conta', 400);
    }

    const updated = await this.prismaClient.accountReceivable.update({
      where: { id: accountReceivableId },
      data: {
        status: 'cancelled',
        notes: `${account.notes || ''}\nCANCELADA: ${reason}`,
      },
      include: {
        customer: true,
      },
    }) as any;

    await this.prismaClient.financialTransaction.updateMany({
      where: {
        referenceNumber: accountReceivableId,
        status: {
          not: 'paid',
        },
      },
      data: {
        status: 'cancelled',
      },
    });

    return updated;
  }

  /**
   * Obter contas a receber por vencer (próximos N dias)
   */
  async getUpcomingReceivables(daysAhead: number = 7): Promise<AccountReceivable[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.prismaClient.accountReceivable.findMany({
      where: {
        dueDate: {
          gte: today,
          lte: futureDate,
        },
        status: 'pending',
      },
      orderBy: { dueDate: 'asc' },
      include: {
        customer: true,
      },
    }) as any;
  }

  /**
   * Obter contas vencidas
   */
  async getOverdueReceivables(): Promise<AccountReceivable[]> {
    const today = new Date();

    return this.prismaClient.accountReceivable.findMany({
      where: {
        dueDate: {
          lt: today,
        },
        status: {
          in: ['pending', 'overdue'],
        },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        customer: true,
      },
    }) as any;
  }

  /**
   * Obter contas a receber por cliente
   */
  async getCustomerAccountsReceivable(customerId: string): Promise<AccountReceivable[]> {
    return this.prismaClient.accountReceivable.findMany({
      where: {
        customerId,
        status: {
          not: 'cancelled',
        },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        customer: true,
      },
    }) as any;
  }

  /**
   * Resumo de contas a receber
   */
  async getSummary(): Promise<{
    totalAmount: number;
    received: number;
    pending: number;
    overdue: number;
  }> {
    const accounts = await this.prismaClient.accountReceivable.findMany({
      where: {
        status: {
          not: 'cancelled',
        },
      },
    });

    const now = new Date();

    return {
      totalAmount: accounts.reduce((sum, acc) => sum + Number(acc.amount), 0),
      received: accounts.filter((acc) => acc.status === 'paid').length,
      pending: accounts.filter((acc) => acc.status === 'pending').length,
      overdue: accounts.filter((acc) => acc.dueDate < now && acc.status !== 'paid').length,
    };
  }

  /**
   * Análise de DSO (Days Sales Outstanding)
   */
  async calculateDSO(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const receivables = await this.prismaClient.accountReceivable.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        status: {
          not: 'cancelled',
        },
      },
    });

    if (receivables.length === 0) return 0;

    const totalDays = receivables.reduce((sum, account) => {
      if (account.receivedAt) {
        const daysToPayment = Math.floor(
          (account.receivedAt.getTime() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + daysToPayment;
      }
      return sum;
    }, 0);

    return Math.round(totalDays / receivables.length);
  }
}
