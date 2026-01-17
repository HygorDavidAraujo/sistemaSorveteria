import { PrismaClient, CashbackTransactionType } from '@prisma/client';
import { NotFoundError, ValidationError, BadRequestError } from '../../../shared/errors/app-error';

export class CashbackService {
  constructor(private prismaClient: PrismaClient) {}

  /**
   * Obter configuração de cashback
   */
  async getCashbackConfig() {
    const config = await this.prismaClient.cashbackConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      throw new NotFoundError('Configuração de cashback não encontrada');
    }

    return config;
  }

  /**
   * Atualizar configuração de cashback
   */
  async updateCashbackConfig(data: {
    cashbackPercentage?: number;
    minPurchaseForCashback?: number;
    maxCashbackPerPurchase?: number | null;
    cashbackExpirationDays?: number | null;
    minCashbackToUse?: number;
    isActive?: boolean;
    applyToAllProducts?: boolean;
  }) {
    const config = await this.prismaClient.cashbackConfig.findFirst();

    if (!config) {
      // Criar se não existir
      return this.prismaClient.cashbackConfig.create({
        data: {
          cashbackPercentage: data.cashbackPercentage || 5,
          minPurchaseForCashback: data.minPurchaseForCashback || 0,
          maxCashbackPerPurchase: data.maxCashbackPerPurchase ?? null,
          cashbackExpirationDays: data.cashbackExpirationDays ?? 180,
          minCashbackToUse: data.minCashbackToUse || 5,
          isActive: data.isActive ?? true,
          applyToAllProducts: data.applyToAllProducts ?? true,
        },
      });
    }

    // Preparar dados para update, mantendo null explícito quando fornecido
    const updateData: any = {};
    if (data.cashbackPercentage !== undefined) updateData.cashbackPercentage = data.cashbackPercentage;
    if (data.minPurchaseForCashback !== undefined) updateData.minPurchaseForCashback = data.minPurchaseForCashback;
    if (data.minCashbackToUse !== undefined) updateData.minCashbackToUse = data.minCashbackToUse;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.applyToAllProducts !== undefined) updateData.applyToAllProducts = data.applyToAllProducts;
    
    // Para campos nullable, incluir explicitamente mesmo se null
    if ('maxCashbackPerPurchase' in data) updateData.maxCashbackPerPurchase = data.maxCashbackPerPurchase;
    if ('cashbackExpirationDays' in data) updateData.cashbackExpirationDays = data.cashbackExpirationDays;

    return this.prismaClient.cashbackConfig.update({
      where: { id: config.id },
      data: updateData,
    });
  }

  /**
   * Calcular cashback para uma compra
   */
  async calculateCashback(
    subtotal: number,
    productIds?: string[],
    excludeProductIds?: string[]
  ): Promise<number> {
    const config = await this.getCashbackConfig();

    if (!config.isActive) {
      return 0;
    }

    // Verificar valor mínimo
    if (subtotal < Number(config.minPurchaseForCashback)) {
      return 0;
    }

    let eligibleAmount = subtotal;

    // Se não aplica a todos os produtos, precisa filtrar
    if (!config.applyToAllProducts && productIds && productIds.length > 0) {
      // Buscar produtos que participam do programa
      const eligibleProducts = await this.prismaClient.product.findMany({
        where: {
          id: { in: productIds },
          earnsCashback: true,
        },
        select: { id: true },
      });

      // Se nenhum produto é elegível, retorna 0
      if (eligibleProducts.length === 0) {
        return 0;
      }

      // Por simplicidade, se houver pelo menos um produto elegível, aplicamos ao total
    }

    // Calcular cashback
    let cashback = eligibleAmount * (Number(config.cashbackPercentage) / 100);

    // Aplicar limite máximo se houver
    if (
      config.maxCashbackPerPurchase &&
      cashback > Number(config.maxCashbackPerPurchase)
    ) {
      cashback = Number(config.maxCashbackPerPurchase);
    }

    return parseFloat(cashback.toFixed(2));
  }

  /**
   * Adicionar cashback para cliente (após venda)
   */
  async addCashback(data: {
    customerId: string;
    amount: number;
    saleId?: string;
    comandaId?: string;
    deliveryOrderId?: string;
    description?: string;
    createdById?: string;
  }) {
    if (data.amount <= 0) {
      throw new ValidationError('Valor do cashback deve ser maior que zero');
    }

    const config = await this.getCashbackConfig();

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (config.cashbackExpirationDays || 180));

    // Buscar cliente
    const customer = await this.prismaClient.customer.findUnique({
      where: { id: data.customerId },
      select: { cashbackBalance: true },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    const balanceAfter = Number(customer.cashbackBalance) + data.amount;

    // Criar transação e atualizar saldo
    const [transaction] = await this.prismaClient.$transaction([
      this.prismaClient.cashbackTransaction.create({
        data: {
          customerId: data.customerId,
          transactionType: 'earn',
          amount: data.amount,
          balanceAfter,
          saleId: data.saleId,
          comandaId: data.comandaId,
          deliveryOrderId: data.deliveryOrderId,
          description: data.description || 'Cashback ganho em compra',
          expiresAt,
          createdById: data.createdById,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              cpf: true,
              cashbackBalance: true,
            },
          },
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.customerId },
        data: { cashbackBalance: balanceAfter },
      }),
    ]);

    return transaction;
  }

  /**
   * Usar cashback (resgatar)
   */
  async useCashback(data: {
    customerId: string;
    amount: number;
    saleId?: string;
    comandaId?: string;
    deliveryOrderId?: string;
    description?: string;
    createdById?: string;
  }) {
    const config = await this.getCashbackConfig();

    if (data.amount < Number(config.minCashbackToUse)) {
      throw new ValidationError(
        `Valor mínimo de R$ ${Number(config.minCashbackToUse).toFixed(2)} para usar cashback`
      );
    }

    // Buscar cliente
    const customer = await this.prismaClient.customer.findUnique({
      where: { id: data.customerId },
      select: { cashbackBalance: true, name: true },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    if (Number(customer.cashbackBalance) < data.amount) {
      throw new BadRequestError('Saldo de cashback insuficiente');
    }

    const balanceAfter = Number(customer.cashbackBalance) - data.amount;

    // Criar transação e atualizar saldo
    const [transaction] = await this.prismaClient.$transaction([
      this.prismaClient.cashbackTransaction.create({
        data: {
          customerId: data.customerId,
          transactionType: 'redeem',
          amount: -data.amount,
          balanceAfter,
          saleId: data.saleId,
          comandaId: data.comandaId,
          deliveryOrderId: data.deliveryOrderId,
          description: data.description || 'Uso de cashback em compra',
          createdById: data.createdById,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              cpf: true,
              cashbackBalance: true,
            },
          },
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.customerId },
        data: { cashbackBalance: balanceAfter },
      }),
    ]);

    return transaction;
  }

  /**
   * Ajustar cashback manualmente (admin)
   */
  async adjustCashback(data: {
    customerId: string;
    amount: number;
    description: string;
    createdById: string;
  }) {
    const customer = await this.prismaClient.customer.findUnique({
      where: { id: data.customerId },
      select: { cashbackBalance: true },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    const balanceAfter = Number(customer.cashbackBalance) + data.amount;

    if (balanceAfter < 0) {
      throw new ValidationError('Saldo de cashback não pode ser negativo');
    }

    const transactionType: CashbackTransactionType = 'adjustment';

    const [transaction] = await this.prismaClient.$transaction([
      this.prismaClient.cashbackTransaction.create({
        data: {
          customerId: data.customerId,
          transactionType,
          amount: data.amount,
          balanceAfter,
          description: data.description,
          createdById: data.createdById,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              cpf: true,
              cashbackBalance: true,
            },
          },
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.customerId },
        data: { cashbackBalance: balanceAfter },
      }),
    ]);

    return transaction;
  }

  /**
   * Extrato de cashback do cliente
   */
  async getCustomerStatement(
    customerId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      transactionType?: CashbackTransactionType;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { customerId };

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [transactions, total, customer] = await Promise.all([
      this.prismaClient.cashbackTransaction.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.cashbackTransaction.count({ where }),
      this.prismaClient.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          cpf: true,
          cashbackBalance: true,
        },
      }),
    ]);

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    // Calcular totais
    const earned = await this.prismaClient.cashbackTransaction.aggregate({
      where: {
        customerId,
        transactionType: 'earn',
      },
      _sum: { amount: true },
    });

    const used = await this.prismaClient.cashbackTransaction.aggregate({
      where: {
        customerId,
        transactionType: 'redeem',
      },
      _sum: { amount: true },
    });

    return {
      customer: {
        ...customer,
        totalEarned: earned._sum.amount
          ? parseFloat(Number(earned._sum.amount).toFixed(2))
          : 0,
        totalUsed: used._sum.amount
          ? Math.abs(parseFloat(Number(used._sum.amount).toFixed(2)))
          : 0,
      },
      transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Expirar cashback vencido
   */
  async expireOldCashback() {
    const now = new Date();

    // Buscar cashback expirado que ainda está no saldo
    const expiredTransactions = await this.prismaClient.cashbackTransaction.findMany({
      where: {
        transactionType: 'earn',
        expiresAt: {
          lt: now,
        },
        amount: {
          gt: 0,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            cashbackBalance: true,
          },
        },
      },
    });

    let totalExpired = 0;

    for (const transaction of expiredTransactions) {
      const amountToExpire = Number(transaction.amount);

      // Verificar se cliente ainda tem o cashback
      if (Number(transaction.customer.cashbackBalance) >= amountToExpire) {
        const balanceAfter =
          Number(transaction.customer.cashbackBalance) - amountToExpire;

        await this.prismaClient.$transaction([
          this.prismaClient.cashbackTransaction.create({
            data: {
              customerId: transaction.customerId,
              transactionType: 'expire',
              amount: -amountToExpire,
              balanceAfter,
              description: `Expiração de cashback ganho em ${transaction.createdAt.toLocaleDateString()}`,
            },
          }),
          this.prismaClient.customer.update({
            where: { id: transaction.customerId },
            data: { cashbackBalance: balanceAfter },
          }),
        ]);

        totalExpired += amountToExpire;
      }
    }

    return {
      message: `R$ ${totalExpired.toFixed(2)} em cashback expirado`,
      totalExpired: parseFloat(totalExpired.toFixed(2)),
      customersAffected: expiredTransactions.length,
    };
  }

  /**
   * Estatísticas do programa de cashback
   */
  async getStatistics() {
    const [
      totalCustomers,
      customersWithCashback,
      totalCashbackIssued,
      totalCashbackUsed,
      recentTransactions,
    ] = await Promise.all([
      this.prismaClient.customer.count(),
      this.prismaClient.customer.count({
        where: { cashbackBalance: { gt: 0 } },
      }),
      this.prismaClient.cashbackTransaction.aggregate({
        where: { transactionType: 'earn' },
        _sum: { amount: true },
      }),
      this.prismaClient.cashbackTransaction.aggregate({
        where: { transactionType: 'redeem' },
        _sum: { amount: true },
      }),
      this.prismaClient.cashbackTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const currentBalance = await this.prismaClient.customer.aggregate({
      _sum: { cashbackBalance: true },
    });

    return {
      totalCustomers,
      customersWithCashback,
      totalCashbackIssued: totalCashbackIssued._sum.amount
        ? parseFloat(Number(totalCashbackIssued._sum.amount).toFixed(2))
        : 0,
      totalCashbackUsed: totalCashbackUsed._sum.amount
        ? Math.abs(parseFloat(Number(totalCashbackUsed._sum.amount).toFixed(2)))
        : 0,
      currentTotalBalance: currentBalance._sum.cashbackBalance
        ? parseFloat(Number(currentBalance._sum.cashbackBalance).toFixed(2))
        : 0,
      recentTransactions,
    };
  }

  /**
   * Transferir cashback entre clientes (admin)
   */
  async transferCashback(data: {
    fromCustomerId: string;
    toCustomerId: string;
    amount: number;
    description: string;
    createdById: string;
  }) {
    if (data.amount <= 0) {
      throw new ValidationError('Valor deve ser maior que zero');
    }

    if (data.fromCustomerId === data.toCustomerId) {
      throw new ValidationError('Não é possível transferir para o mesmo cliente');
    }

    // Buscar clientes
    const [fromCustomer, toCustomer] = await Promise.all([
      this.prismaClient.customer.findUnique({
        where: { id: data.fromCustomerId },
        select: { cashbackBalance: true, name: true },
      }),
      this.prismaClient.customer.findUnique({
        where: { id: data.toCustomerId },
        select: { cashbackBalance: true, name: true },
      }),
    ]);

    if (!fromCustomer) {
      throw new NotFoundError('Cliente origem não encontrado');
    }

    if (!toCustomer) {
      throw new NotFoundError('Cliente destino não encontrado');
    }

    if (Number(fromCustomer.cashbackBalance) < data.amount) {
      throw new BadRequestError('Saldo insuficiente no cliente origem');
    }

    const fromBalanceAfter = Number(fromCustomer.cashbackBalance) - data.amount;
    const toBalanceAfter = Number(toCustomer.cashbackBalance) + data.amount;

    // Executar transferência em transação
    await this.prismaClient.$transaction([
      // Débito do cliente origem
      this.prismaClient.cashbackTransaction.create({
        data: {
          customerId: data.fromCustomerId,
          transactionType: 'manual',
          amount: -data.amount,
          balanceAfter: fromBalanceAfter,
          description: `Transferência para ${toCustomer.name}: ${data.description}`,
          createdById: data.createdById,
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.fromCustomerId },
        data: { cashbackBalance: fromBalanceAfter },
      }),
      // Crédito do cliente destino
      this.prismaClient.cashbackTransaction.create({
        data: {
          customerId: data.toCustomerId,
          transactionType: 'manual',
          amount: data.amount,
          balanceAfter: toBalanceAfter,
          description: `Transferência de ${fromCustomer.name}: ${data.description}`,
          createdById: data.createdById,
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.toCustomerId },
        data: { cashbackBalance: toBalanceAfter },
      }),
    ]);

    return {
      message: 'Transferência realizada com sucesso',
      amount: data.amount,
      from: { id: data.fromCustomerId, name: fromCustomer.name },
      to: { id: data.toCustomerId, name: toCustomer.name },
    };
  }
}
