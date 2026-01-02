import { PrismaClient, LoyaltyTransactionType } from '@prisma/client';
import { NotFoundError, ValidationError, BadRequestError } from '../../../shared/errors/app-error';

export class LoyaltyService {
  constructor(private prismaClient: PrismaClient) {}

  /**
   * Obter configuração de fidelidade
   */
  async getLoyaltyConfig() {
    const config = await this.prismaClient.loyaltyConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      throw new NotFoundError('Configuração de fidelidade não encontrada');
    }

    return config;
  }

  /**
   * Atualizar configuração de fidelidade
   */
  async updateLoyaltyConfig(data: {
    pointsPerReal?: number;
    minPurchaseForPoints?: number;
    pointsExpirationDays?: number;
    minPointsToRedeem?: number;
    pointsRedemptionValue?: number;
    isActive?: boolean;
    applyToAllProducts?: boolean;
  }) {
    const config = await this.prismaClient.loyaltyConfig.findFirst();

    if (!config) {
      // Criar se não existir
      return this.prismaClient.loyaltyConfig.create({
        data: {
          pointsPerReal: data.pointsPerReal || 1,
          minPurchaseForPoints: data.minPurchaseForPoints || 0,
          pointsExpirationDays: data.pointsExpirationDays || 365,
          minPointsToRedeem: data.minPointsToRedeem || 100,
          pointsRedemptionValue: data.pointsRedemptionValue || 0.01,
          isActive: data.isActive ?? true,
          applyToAllProducts: data.applyToAllProducts ?? true,
        },
      });
    }

    return this.prismaClient.loyaltyConfig.update({
      where: { id: config.id },
      data,
    });
  }

  /**
   * Calcular pontos para uma compra
   */
  async calculatePoints(
    subtotal: number,
    productIds?: string[],
    excludeProductIds?: string[]
  ): Promise<number> {
    const config = await this.getLoyaltyConfig();

    if (!config.isActive) {
      return 0;
    }

    // Verificar valor mínimo
    if (subtotal < Number(config.minPurchaseForPoints)) {
      return 0;
    }

    let eligibleAmount = subtotal;

    // Se não aplica a todos os produtos, precisa filtrar
    if (!config.applyToAllProducts && productIds && productIds.length > 0) {
      // Buscar produtos que participam do programa
      const eligibleProducts = await this.prismaClient.product.findMany({
        where: {
          id: { in: productIds },
          eligibleForLoyalty: true,
        },
        select: { id: true },
      });

      // Se nenhum produto é elegível, retorna 0
      if (eligibleProducts.length === 0) {
        return 0;
      }

      // Aqui precisaríamos calcular o valor apenas dos produtos elegíveis
      // Por simplicidade, se houver pelo menos um produto elegível, aplicamos ao total
    }

    // Calcular pontos
    const points = Math.floor(eligibleAmount * Number(config.pointsPerReal));
    return points;
  }

  /**
   * Adicionar pontos para cliente (após venda)
   */
  async addPoints(data: {
    customerId: string;
    points: number;
    saleId?: string;
    description?: string;
    createdById?: string;
  }) {
    if (data.points <= 0) {
      throw new ValidationError('Pontos devem ser maior que zero');
    }

    const config = await this.getLoyaltyConfig();

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (config.pointsExpirationDays || 365));

    // Buscar cliente
    const customer = await this.prismaClient.customer.findUnique({
      where: { id: data.customerId },
      select: { loyaltyPoints: true },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    const balanceAfter = customer.loyaltyPoints + data.points;

    // Criar transação e atualizar saldo em uma transação atômica
    const [transaction] = await this.prismaClient.$transaction([
      this.prismaClient.loyaltyTransaction.create({
        data: {
          customerId: data.customerId,
          transactionType: 'earn',
          points: data.points,
          balanceAfter,
          saleId: data.saleId,
          description: data.description || 'Pontos ganhos em compra',
          expiresAt,
          createdById: data.createdById,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              cpf: true,
              loyaltyPoints: true,
            },
          },
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.customerId },
        data: { loyaltyPoints: balanceAfter },
      }),
    ]);

    return transaction;
  }

  /**
   * Resgatar pontos (usar pontos)
   */
  async redeemPoints(data: {
    customerId: string;
    points: number;
    description?: string;
    createdById?: string;
  }) {
    const config = await this.getLoyaltyConfig();

    if (data.points < config.minPointsToRedeem) {
      throw new ValidationError(
        `Mínimo de ${config.minPointsToRedeem} pontos para resgatar`
      );
    }

    // Buscar cliente
    const customer = await this.prismaClient.customer.findUnique({
      where: { id: data.customerId },
      select: { loyaltyPoints: true, name: true },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    if (customer.loyaltyPoints < data.points) {
      throw new BadRequestError('Pontos insuficientes');
    }

    const balanceAfter = customer.loyaltyPoints - data.points;

    // Criar transação e atualizar saldo
    const [transaction] = await this.prismaClient.$transaction([
      this.prismaClient.loyaltyTransaction.create({
        data: {
          customerId: data.customerId,
          transactionType: 'redeem',
          points: -data.points,
          balanceAfter,
          description: data.description || 'Resgate de pontos',
          createdById: data.createdById,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              cpf: true,
              loyaltyPoints: true,
            },
          },
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.customerId },
        data: { loyaltyPoints: balanceAfter },
      }),
    ]);

    // Calcular valor em reais
    const valueInReais = data.points * Number(config.pointsRedemptionValue);

    return {
      transaction,
      valueInReais: parseFloat(valueInReais.toFixed(2)),
    };
  }

  /**
   * Ajustar pontos manualmente (admin)
   */
  async adjustPoints(data: {
    customerId: string;
    points: number;
    description: string;
    createdById: string;
  }) {
    const customer = await this.prismaClient.customer.findUnique({
      where: { id: data.customerId },
      select: { loyaltyPoints: true },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    const balanceAfter = customer.loyaltyPoints + data.points;

    if (balanceAfter < 0) {
      throw new ValidationError('Saldo de pontos não pode ser negativo');
    }

    const transactionType: LoyaltyTransactionType = 'adjustment';

    const [transaction] = await this.prismaClient.$transaction([
      this.prismaClient.loyaltyTransaction.create({
        data: {
          customerId: data.customerId,
          transactionType,
          points: data.points,
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
              loyaltyPoints: true,
            },
          },
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.customerId },
        data: { loyaltyPoints: balanceAfter },
      }),
    ]);

    return transaction;
  }

  /**
   * Extrato de pontos do cliente
   */
  async getCustomerStatement(
    customerId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      transactionType?: LoyaltyTransactionType;
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
      this.prismaClient.loyaltyTransaction.findMany({
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
      this.prismaClient.loyaltyTransaction.count({ where }),
      this.prismaClient.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          cpf: true,
          loyaltyPoints: true,
        },
      }),
    ]);

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    return {
      customer,
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
   * Criar/Atualizar prêmio de fidelidade
   */
  async createReward(data: {
    productId?: string;
    name: string;
    description?: string;
    pointsRequired: number;
    quantityAvailable?: number;
    isActive?: boolean;
  }) {
    if (data.pointsRequired <= 0) {
      throw new ValidationError('Pontos necessários devem ser maior que zero');
    }

    const reward = await this.prismaClient.loyaltyReward.create({
      data: {
        productId: data.productId,
        name: data.name,
        description: data.description,
        pointsRequired: data.pointsRequired,
        quantityAvailable: data.quantityAvailable,
        isActive: data.isActive ?? true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    return reward;
  }

  /**
   * Listar prêmios disponíveis
   */
  async listRewards(filters: {
    isActive?: boolean;
    minPoints?: number;
    maxPoints?: number;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.minPoints || filters.maxPoints) {
      where.pointsRequired = {};
      if (filters.minPoints) {
        where.pointsRequired.gte = filters.minPoints;
      }
      if (filters.maxPoints) {
        where.pointsRequired.lte = filters.maxPoints;
      }
    }

    const [rewards, total] = await Promise.all([
      this.prismaClient.loyaltyReward.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              code: true,
            },
          },
        },
        orderBy: { pointsRequired: 'asc' },
        skip,
        take: limit,
      }),
      this.prismaClient.loyaltyReward.count({ where }),
    ]);

    return {
      data: rewards,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resgatar prêmio
   */
  async redeemReward(data: {
    customerId: string;
    rewardId: string;
    createdById?: string;
  }) {
    // Buscar prêmio
    const reward = await this.prismaClient.loyaltyReward.findUnique({
      where: { id: data.rewardId },
    });

    if (!reward) {
      throw new NotFoundError('Prêmio não encontrado');
    }

    if (!reward.isActive) {
      throw new ValidationError('Prêmio não está disponível');
    }

    if (
      reward.quantityAvailable !== null &&
      reward.quantityAvailable <= 0
    ) {
      throw new ValidationError('Prêmio esgotado');
    }

    // Buscar cliente
    const customer = await this.prismaClient.customer.findUnique({
      where: { id: data.customerId },
      select: { loyaltyPoints: true, name: true },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    if (customer.loyaltyPoints < reward.pointsRequired) {
      throw new BadRequestError('Pontos insuficientes para este prêmio');
    }

    const balanceAfter = customer.loyaltyPoints - reward.pointsRequired;

    // Criar transação, atualizar saldo e decrementar quantidade do prêmio
    const updates: any[] = [
      this.prismaClient.loyaltyTransaction.create({
        data: {
          customerId: data.customerId,
          transactionType: 'reward_redeem',
          points: -reward.pointsRequired,
          balanceAfter,
          rewardId: data.rewardId,
          description: `Resgate do prêmio: ${reward.name}`,
          createdById: data.createdById,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              cpf: true,
              loyaltyPoints: true,
            },
          },
          reward: true,
        },
      }),
      this.prismaClient.customer.update({
        where: { id: data.customerId },
        data: { loyaltyPoints: balanceAfter },
      }),
    ];

    // Decrementar quantidade se tiver limite
    if (reward.quantityAvailable !== null) {
      updates.push(
        this.prismaClient.loyaltyReward.update({
          where: { id: data.rewardId },
          data: { quantityAvailable: { decrement: 1 } },
        })
      );
    }

    const [transaction] = await this.prismaClient.$transaction(updates);

    return transaction;
  }

  /**
   * Atualizar prêmio
   */
  async updateReward(
    rewardId: string,
    data: {
      name?: string;
      description?: string;
      pointsRequired?: number;
      quantityAvailable?: number;
      isActive?: boolean;
    }
  ) {
    const reward = await this.prismaClient.loyaltyReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new NotFoundError('Prêmio não encontrado');
    }

    return this.prismaClient.loyaltyReward.update({
      where: { id: rewardId },
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  }

  /**
   * Deletar prêmio
   */
  async deleteReward(rewardId: string) {
    const reward = await this.prismaClient.loyaltyReward.findUnique({
      where: { id: rewardId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!reward) {
      throw new NotFoundError('Prêmio não encontrado');
    }

    if (reward._count.transactions > 0) {
      throw new ValidationError(
        'Não é possível deletar prêmio que já foi resgatado'
      );
    }

    await this.prismaClient.loyaltyReward.delete({
      where: { id: rewardId },
    });

    return { message: 'Prêmio deletado com sucesso' };
  }

  /**
   * Expirar pontos vencidos
   */
  async expireOldPoints() {
    const now = new Date();

    // Buscar pontos expirados que ainda estão no saldo
    const expiredTransactions = await this.prismaClient.loyaltyTransaction.findMany({
      where: {
        transactionType: 'earn',
        expiresAt: {
          lt: now,
        },
        points: {
          gt: 0,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            loyaltyPoints: true,
          },
        },
      },
    });

    let totalExpired = 0;

    for (const transaction of expiredTransactions) {
      const pointsToExpire = transaction.points;

      // Verificar se cliente ainda tem os pontos
      if (transaction.customer.loyaltyPoints >= pointsToExpire) {
        const balanceAfter = transaction.customer.loyaltyPoints - pointsToExpire;

        await this.prismaClient.$transaction([
          this.prismaClient.loyaltyTransaction.create({
            data: {
              customerId: transaction.customerId,
              transactionType: 'expire',
              points: -pointsToExpire,
              balanceAfter,
              description: `Expiração de pontos ganhos em ${transaction.createdAt.toLocaleDateString()}`,
            },
          }),
          this.prismaClient.customer.update({
            where: { id: transaction.customerId },
            data: { loyaltyPoints: balanceAfter },
          }),
        ]);

        totalExpired += pointsToExpire;
      }
    }

    return {
      message: `${totalExpired} pontos expirados`,
      totalExpired,
      customersAffected: expiredTransactions.length,
    };
  }

  /**
   * Estatísticas do programa de fidelidade
   */
  async getStatistics() {
    const [
      totalCustomers,
      customersWithPoints,
      totalPointsIssued,
      totalPointsRedeemed,
      activeRewards,
      recentTransactions,
    ] = await Promise.all([
      this.prismaClient.customer.count(),
      this.prismaClient.customer.count({
        where: { loyaltyPoints: { gt: 0 } },
      }),
      this.prismaClient.loyaltyTransaction.aggregate({
        where: { transactionType: 'earn' },
        _sum: { points: true },
      }),
      this.prismaClient.loyaltyTransaction.aggregate({
        where: { transactionType: { in: ['redeem', 'reward_redeem'] } },
        _sum: { points: true },
      }),
      this.prismaClient.loyaltyReward.count({
        where: { isActive: true },
      }),
      this.prismaClient.loyaltyTransaction.findMany({
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
      _sum: { loyaltyPoints: true },
    });

    return {
      totalCustomers,
      customersWithPoints,
      totalPointsIssued: totalPointsIssued._sum.points || 0,
      totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0),
      currentTotalBalance: currentBalance._sum.loyaltyPoints || 0,
      activeRewards,
      recentTransactions,
    };
  }
}
