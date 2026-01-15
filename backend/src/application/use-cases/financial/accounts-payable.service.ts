import { PrismaClient, AccountPayable } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';
import { FinancialTransactionStatus } from '@domain/entities/financial.entity';
import { FinancialService } from './financial.service';

const createdBySafeSelect = {
  select: {
    id: true,
    fullName: true,
    email: true,
    role: true,
  },
} as const;

export interface CreateAccountPayableDTO {
  supplierName: string; // Alterado de supplierId para supplierName
  description: string;
  amount: number;
  dueDate: Date;
  categoryId: string;
  notes?: string;
  createdById: string;
}

export interface UpdateAccountPayableDTO {
  description?: string;
  dueDate?: Date;
  paymentMethod?: string;
  notes?: string;
}

export interface PaymentAccountPayableDTO {
  paymentDate: Date;
  notes?: string;
  userId: string;
}

export interface SearchAccountPayableDTO {
  supplierName?: string; // Alterado de supplierId
  status?: FinancialTransactionStatus;
  startDueDate?: Date;
  endDueDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Accounts Payable Service - Gestão de contas a pagar
 * Responsável por gerenciar débitos com fornecedores
 */
export class AccountPayableService {
  private financialService: FinancialService;

  constructor(private prismaClient: PrismaClient = prisma) {
    this.financialService = new FinancialService(prismaClient);
  }

  /**
   * Criar conta a pagar
   */
  async createAccountPayable(
    data: CreateAccountPayableDTO
  ): Promise<AccountPayable> {
    // Validar categoria
    const category = await this.prismaClient.financialCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new AppError('Categoria financeira não encontrada', 404);
    }

    // Validar fornecedor (se temos tabela de suppliers)
    // Por enquanto, apenas validar valores
    if (data.amount <= 0) {
      throw new AppError('Valor deve ser maior que zero', 400);
    }

    // Comparar datas no nível de dia usando horário local (evita erro de UTC em datas ISO "YYYY-MM-DD")
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Converter string ISO "YYYY-MM-DD" para data local sem retroceder fuso (new Date("YYYY-MM-DD") é UTC)
    let dueLocal: Date;
    if (typeof (data as any).dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test((data as any).dueDate)) {
      const [y, m, d] = (data as any).dueDate.split('-').map(Number);
      dueLocal = new Date(y, m - 1, d); // data local à meia-noite
    } else {
      const due = new Date(data.dueDate);
      dueLocal = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    }

    if (dueLocal < todayLocal) {
      throw new AppError('Data de vencimento não pode ser no passado', 400);
    }

    // Definir status inicial
    let status: 'pending' | 'overdue' = 'pending';

    // Criar conta a pagar e transação financeira em transação atômica
    const accountPayable = await this.prismaClient.$transaction(async (tx) => {
      // Criar conta a pagar
      const payable = await tx.accountPayable.create({
        data: {
          supplierName: data.supplierName,
          description: data.description,
          amount: data.amount,
          dueDate: data.dueDate,
          status,
          categoryId: data.categoryId,
          notes: data.notes,
          createdById: data.createdById,
        },
        include: {
          category: true,
          createdBy: createdBySafeSelect,
        },
      });

      // Registrar transação financeira correspondente
      try {
        await this.financialService.createTransaction({
          categoryId: data.categoryId,
          transactionType: 'expense',
          amount: data.amount,
          description: `Conta a Pagar: ${data.description}`,
          referenceNumber: payable.id,
          transactionDate: new Date(),
          dueDate: data.dueDate,
          status: 'pending', // Defina explicitamente para pending
          createdById: data.createdById,
        });
      } catch (error) {
        // Se falhar na transação financeira, a conta ainda será criada
        // mas registre o erro para auditoria
        console.error('Erro ao criar transação financeira para conta a pagar:', error);
      }

      return payable;
    });

    return accountPayable as any;
  }

  /**
   * Registrar pagamento de conta a pagar
   */
  async recordPayment(
    accountPayableId: string,
    paymentData: PaymentAccountPayableDTO
  ): Promise<AccountPayable> {
    const account = await this.prismaClient.accountPayable.findUnique({
      where: { id: accountPayableId },
    });

    if (!account) {
      throw new AppError('Conta a pagar não encontrada', 404);
    }

    if (account.status === 'cancelled') {
      throw new AppError('Não é possível pagar conta cancelada', 400);
    }

    if (account.status === 'paid') {
      throw new AppError('Conta já foi paga', 400);
    }

    // Marcar como pago
    const updated = await this.prismaClient.accountPayable.update({
      where: { id: accountPayableId },
      data: {
        status: 'paid',
        paidAt: paymentData.paymentDate,
        notes: paymentData.notes ? `${account.notes || ''}\nPagamento em ${paymentData.paymentDate.toLocaleDateString('pt-BR')}: ${paymentData.notes}` : account.notes,
      },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    });

    // Sincronizar status da transação financeira vinculada a esta conta (não deixar como pendente)
    const txUpdate = await this.prismaClient.financialTransaction.updateMany({
      where: {
        referenceNumber: accountPayableId,
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
      await this.financialService.createTransaction({
        categoryId: account.categoryId,
        transactionType: 'expense',
        amount: Number(account.amount),
        description: `Conta a Pagar: ${account.description}`,
        referenceNumber: accountPayableId,
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
   * Buscar contas a pagar
   */
  async searchAccountsPayable(
    filters: SearchAccountPayableDTO
  ): Promise<{ data: AccountPayable[]; total: number }> {
    const {
      supplierName,
      status,
      startDueDate,
      endDueDate,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (supplierName) where.supplierName = { contains: supplierName };
    if (status) where.status = status;

    if (startDueDate || endDueDate) {
      where.dueDate = {};
      if (startDueDate) where.dueDate.gte = startDueDate;
      if (endDueDate) where.dueDate.lte = endDueDate;
    }

    const [data, total] = await Promise.all([
      this.prismaClient.accountPayable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          category: true,
          createdBy: createdBySafeSelect,
        },
      }),
      this.prismaClient.accountPayable.count({ where }),
    ]);

    return { data: data as any, total };
  }

  /**
   * Obter conta a pagar por ID
   */
  async getAccountPayableById(accountPayableId: string): Promise<AccountPayable> {
    const account = await this.prismaClient.accountPayable.findUnique({
      where: { id: accountPayableId },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    });

    if (!account) {
      throw new AppError('Conta a pagar não encontrada', 404);
    }

    return account as any;
  }

  /**
   * Atualizar conta a pagar (antes do pagamento)
   */
  async updateAccountPayable(
    accountPayableId: string,
    data: UpdateAccountPayableDTO
  ): Promise<AccountPayable> {
    const account = await this.prismaClient.accountPayable.findUnique({
      where: { id: accountPayableId },
    });

    if (!account) {
      throw new AppError('Conta a pagar não encontrada', 404);
    }

    if (['paid', 'cancelled'].includes(account.status)) {
      throw new AppError('Não é possível atualizar conta que já foi paga', 400);
    }

    const updated = await this.prismaClient.accountPayable.update({
      where: { id: accountPayableId },
      data,
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    }) as any;

    // Manter transação financeira vinculada sincronizada (descrição/vencimento)
    await this.prismaClient.financialTransaction.updateMany({
      where: {
        referenceNumber: accountPayableId,
        status: {
          notIn: ['paid', 'cancelled'],
        },
      },
      data: {
        ...(data.description ? { description: `Conta a Pagar: ${data.description}` } : {}),
        ...(data.dueDate ? { dueDate: data.dueDate } : {}),
      },
    });

    return updated;
  }

  /**
   * Cancelar conta a pagar
   */
  async cancelAccountPayable(
    accountPayableId: string,
    reason: string,
    userId: string
  ): Promise<AccountPayable> {
    const account = await this.prismaClient.accountPayable.findUnique({
      where: { id: accountPayableId },
    });

    if (!account) {
      throw new AppError('Conta a pagar não encontrada', 404);
    }

    if (['paid', 'cancelled'].includes(account.status)) {
      throw new AppError('Não é possível cancelar esta conta', 400);
    }

    const updated = await this.prismaClient.accountPayable.update({
      where: { id: accountPayableId },
      data: {
        status: 'cancelled',
        notes: `${account.notes || ''}\nCANCELADA: ${reason}`,
      },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    }) as any;

    // Sincronizar transação financeira vinculada
    await this.prismaClient.financialTransaction.updateMany({
      where: {
        referenceNumber: accountPayableId,
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
   * Obter contas a pagar por vencer (próximos N dias)
   */
  async getUpcomingPayables(daysAhead: number = 7): Promise<AccountPayable[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.prismaClient.accountPayable.findMany({
      where: {
        dueDate: {
          gte: today,
          lte: futureDate,
        },
        status: 'pending',
      },
      orderBy: { dueDate: 'asc' },
      include: {
        category: true,
        createdBy: createdBySafeSelect,
      },
    }) as any;
  }

  /**
   * Obter contas vencidas
   */
  async getOverduePayables(): Promise<AccountPayable[]> {
    const today = new Date();

    return this.prismaClient.accountPayable.findMany({
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
        category: true,
        createdBy: createdBySafeSelect,
      },
    }) as any;
  }

  /**
   * Resumo de contas a pagar
   */
  async getSummary(): Promise<{
    totalAmount: number;
    paid: number;
    pending: number;
    overdue: number;
    scheduled: number;
  }> {
    const accounts = await this.prismaClient.accountPayable.findMany({
      where: {
        status: {
          not: 'cancelled',
        },
      },
    });

    const now = new Date();

    return {
      totalAmount: accounts.reduce((sum, acc) => sum + Number(acc.amount), 0),
      paid: accounts.filter((acc) => acc.status === 'paid').length,
      pending: accounts.filter((acc) => acc.status === 'pending').length,
      overdue: accounts.filter((acc) => acc.dueDate < now && acc.status !== 'paid').length,
      scheduled: 0, // Status 'scheduled' não existe no Prisma
    };
  }
}
