import { PrismaClient, CashSessionStatus, PaymentMethod } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';

export interface OpenCashSessionDTO {
  terminalId: string;
  initialCash?: number;
  openingNotes?: string;
  userId: string;
}

export interface CashierCloseDTO {
  cashierCashCount: number;
  cashierNotes?: string;
  paymentBreakdown?: Array<{
    paymentMethod: PaymentMethod;
    expectedAmount?: number;
    countedAmount?: number;
  }>;
}

export interface ManagerCloseDTO {
  managerNotes?: string;
}

export interface CashSessionFilters {
  status?: CashSessionStatus;
  startDate?: Date;
  endDate?: Date;
  terminalId?: string;
  page?: number;
  limit?: number;
}

export class CashSessionService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  private includeRelations() {
    return {
      openedBy: { select: { id: true, fullName: true, email: true, role: true } },
      cashierClosedBy: { select: { id: true, fullName: true, email: true, role: true } },
      managerClosedBy: { select: { id: true, fullName: true, email: true, role: true } },
      paymentBreakdown: true,
    };
  }

  async openSession(data: OpenCashSessionDTO) {
    if (!data.terminalId) {
      throw new AppError('Terminal é obrigatório para abrir caixa', 400);
    }

    const openSession = await this.prismaClient.cashSession.findFirst({
      where: {
        terminalId: data.terminalId,
        status: CashSessionStatus.open,
      },
    });

    if (openSession) {
      throw new AppError('Já existe um caixa aberto neste terminal', 400);
    }

    const session = await this.prismaClient.cashSession.create({
      data: {
        terminalId: data.terminalId,
        openedById: data.userId,
        initialCash: data.initialCash ?? 0,
        openingNotes: data.openingNotes,
        status: CashSessionStatus.open,
      },
      include: this.includeRelations(),
    });

    return session;
  }

  async getCurrentSession(terminalId: string) {
    const session = await this.prismaClient.cashSession.findFirst({
      where: {
        terminalId,
        status: {
          in: [CashSessionStatus.open, CashSessionStatus.cashier_closed],
        },
      },
      orderBy: { openedAt: 'desc' },
      include: this.includeRelations(),
    });

    if (!session) {
      throw new AppError('Nenhum caixa aberto para este terminal', 404);
    }

    return session;
  }

  async getById(id: string) {
    const session = await this.prismaClient.cashSession.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!session) {
      throw new AppError('Caixa não encontrado', 404);
    }

    return session;
  }

  async cashierClose(id: string, data: CashierCloseDTO, userId: string) {
    const session = await this.prismaClient.cashSession.findUnique({ where: { id } });

    if (!session) {
      throw new AppError('Caixa não encontrado', 404);
    }

    if (session.status !== CashSessionStatus.open) {
      throw new AppError('Caixa não está em status aberto', 400);
    }

    const difference = data.cashierCashCount - Number(session.totalCash);

    return this.prismaClient.$transaction(async (tx) => {
      if (data.paymentBreakdown) {
        await tx.cashSessionPayment.deleteMany({ where: { cashSessionId: id } });

        if (data.paymentBreakdown.length > 0) {
          await tx.cashSessionPayment.createMany({
            data: data.paymentBreakdown.map((item) => ({
              cashSessionId: id,
              paymentMethod: item.paymentMethod,
              expectedAmount: item.expectedAmount ?? 0,
              countedAmount: item.countedAmount,
              difference:
                item.countedAmount !== undefined && item.expectedAmount !== undefined
                  ? item.countedAmount - item.expectedAmount
                  : null,
            })),
          });
        }
      }

      return tx.cashSession.update({
        where: { id },
        data: {
          cashierClosedAt: new Date(),
          cashierClosedById: userId,
          cashierCashCount: data.cashierCashCount,
          cashierDifference: difference,
          cashierNotes: data.cashierNotes,
          status: CashSessionStatus.cashier_closed,
        },
        include: this.includeRelations(),
      });
    });
  }

  async managerClose(id: string, data: ManagerCloseDTO, userId: string) {
    const session = await this.prismaClient.cashSession.findUnique({ where: { id } });

    if (!session) {
      throw new AppError('Caixa não encontrado', 404);
    }

    if (session.status !== CashSessionStatus.cashier_closed) {
      throw new AppError('Caixa precisa estar fechado pelo operador antes da validação', 400);
    }

    const updated = await this.prismaClient.cashSession.update({
      where: { id },
      data: {
        managerClosedAt: new Date(),
        managerClosedById: userId,
        managerValidated: true,
        managerNotes: data.managerNotes,
        status: CashSessionStatus.manager_closed,
      },
      include: this.includeRelations(),
    });

    return updated;
  }

  async listHistory(filters: CashSessionFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.terminalId) {
      where.terminalId = filters.terminalId;
    }

    if (filters.startDate || filters.endDate) {
      where.openedAt = {};
      if (filters.startDate) {
        where.openedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.openedAt.lte = filters.endDate;
      }
    }

    const [sessions, total] = await Promise.all([
      this.prismaClient.cashSession.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
        include: this.includeRelations(),
      }),
      this.prismaClient.cashSession.count({ where }),
    ]);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReport(id: string) {
    const session = await this.getById(id);

    // Buscar todas as vendas e pagamentos para breakdown detalhado
    const sales = await this.prismaClient.sale.findMany({
      where: {
        cashSessionId: id,
        status: 'completed',
      },
      include: {
        payments: true,
      },
    });

    // Calcular breakdown detalhado por método de pagamento
    const paymentBreakdown = {
      cash: 0,
      debit_card: 0,
      credit_card: 0,
      pix: 0,
      other: 0,
    };

    let totalSalesCount = 0;

    for (const sale of sales) {
      totalSalesCount++;
      for (const payment of sale.payments) {
        const amount = Number(payment.amount);
        switch (payment.paymentMethod) {
          case 'cash':
            paymentBreakdown.cash += amount;
            break;
          case 'debit_card':
            paymentBreakdown.debit_card += amount;
            break;
          case 'credit_card':
            paymentBreakdown.credit_card += amount;
            break;
          case 'pix':
            paymentBreakdown.pix += amount;
            break;
          case 'other':
            paymentBreakdown.other += amount;
            break;
        }
      }
    }

    return {
      ...session,
      totals: {
        sales: Number(session.totalSales),
        cash: Number(session.totalCash),
        card: Number(session.totalCard),
        pix: Number(session.totalPix),
        other: Number(session.totalOther),
      },
      breakdown: {
        cash: paymentBreakdown.cash,
        debitCard: paymentBreakdown.debit_card,
        creditCard: paymentBreakdown.credit_card,
        pix: paymentBreakdown.pix,
        other: paymentBreakdown.other,
        totalCard: paymentBreakdown.debit_card + paymentBreakdown.credit_card,
      },
      salesCount: totalSalesCount,
    };
  }

  async recalculateTotals(sessionId: string) {
    const sales = await this.prismaClient.sale.findMany({
      where: {
        cashSessionId: sessionId,
        status: 'completed',
      },
      include: {
        payments: true,
      },
    });

    let totalSales = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalPix = 0;
    let totalOther = 0;

    for (const sale of sales) {
      totalSales += Number(sale.total);

      for (const payment of sale.payments) {
        const amount = Number(payment.amount);
        switch (payment.paymentMethod) {
          case 'cash':
            totalCash += amount;
            break;
          case 'debit_card':
          case 'credit_card':
            totalCard += amount;
            break;
          case 'pix':
            totalPix += amount;
            break;
          case 'other':
            totalOther += amount;
            break;
        }
      }
    }

    return this.prismaClient.cashSession.update({
      where: { id: sessionId },
      data: {
        totalSales,
        totalCash,
        totalCard,
        totalPix,
        totalOther,
      },
    });
  }
}
