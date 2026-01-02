import { PrismaClient, TransactionType, SaleStatus, PaymentMethod } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';

export interface SaleItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface PaymentInput {
  paymentMethod: PaymentMethod;
  amount: number;
  cardBrand?: string;
  cardLastDigits?: string;
  installments?: number;
  pixKey?: string;
  pixTransactionId?: string;
}

export interface CreateSaleDTO {
  cashSessionId: string;
  customerId?: string;
  saleType?: TransactionType;
  items: SaleItemInput[];
  payments: PaymentInput[];
  discount?: number;
  deliveryFee?: number;
  loyaltyPointsUsed?: number;
  createdById: string;
}

export interface SaleFilters {
  startDate?: Date;
  endDate?: Date;
  cashSessionId?: string;
  customerId?: string;
  saleType?: TransactionType;
  status?: SaleStatus;
  page?: number;
  limit?: number;
}

export class SaleService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  private includeRelations() {
    return {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              saleType: true,
              unit: true,
            },
          },
        },
      },
      payments: true,
      customer: {
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          loyaltyPoints: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
      cashSession: {
        select: {
          id: true,
          sessionNumber: true,
          terminalId: true,
          status: true,
        },
      },
    };
  }

  async createSale(data: CreateSaleDTO) {
    // Validar caixa aberto
    const cashSession = await this.prismaClient.cashSession.findUnique({
      where: { id: data.cashSessionId },
    });

    if (!cashSession) {
      throw new AppError('Sessão de caixa não encontrada', 404);
    }

    if (cashSession.status !== 'open') {
      throw new AppError('A sessão de caixa não está aberta', 400);
    }

    // Validar que há itens
    if (!data.items || data.items.length === 0) {
      throw new AppError('A venda deve conter ao menos um item', 400);
    }

    // Buscar produtos
    const productIds = data.items.map((item) => item.productId);
    const products = await this.prismaClient.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        productCosts: {
          where: {
            validFrom: { lte: new Date() },
            OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
          },
          orderBy: { validFrom: 'desc' },
          take: 1,
        },
      },
    });

    if (products.length !== productIds.length) {
      throw new AppError('Um ou mais produtos não foram encontrados ou estão inativos', 400);
    }

    // Validar estoque
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      if (product.trackStock && Number(product.currentStock) < item.quantity) {
        throw new AppError(`Estoque insuficiente para o produto ${product.name}`, 400);
      }
    }

    // Validar cliente e pontos de fidelidade
    let customer = null;
    if (data.customerId) {
      customer = await this.prismaClient.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer) {
        throw new AppError('Cliente não encontrado', 404);
      }

      if (data.loyaltyPointsUsed && data.loyaltyPointsUsed > 0) {
        if (customer.loyaltyPoints < data.loyaltyPointsUsed) {
          throw new AppError('Cliente não possui pontos suficientes', 400);
        }
      }
    }

    // Validar pagamentos
    if (!data.payments || data.payments.length === 0) {
      throw new AppError('A venda deve conter ao menos uma forma de pagamento', 400);
    }

    // Calcular itens e totais
    let subtotal = 0;
    let totalLoyaltyPointsEarned = 0;
    const saleItems = [];

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      const unitPrice = Number(product.salePrice);
      const itemDiscount = item.discount || 0;
      const itemSubtotal = unitPrice * item.quantity;
      const itemTotal = itemSubtotal - itemDiscount;

      subtotal += itemSubtotal;

      // Calcular pontos de fidelidade do item
      let itemLoyaltyPoints = 0;
      if (product.eligibleForLoyalty && customer) {
        itemLoyaltyPoints = Math.floor(
          itemTotal * Number(product.loyaltyPointsMultiplier)
        );
      }
      totalLoyaltyPointsEarned += itemLoyaltyPoints;

      // Obter custo atual
      const currentCost = product.productCosts[0]?.costPrice || product.costPrice || 0;

      saleItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        costPrice: Number(currentCost),
        subtotal: itemSubtotal,
        discount: itemDiscount,
        total: itemTotal,
        loyaltyPointsEarned: itemLoyaltyPoints,
      });
    }

    const saleDiscount = data.discount || 0;
    const deliveryFee = data.deliveryFee || 0;
    const loyaltyPointsUsed = data.loyaltyPointsUsed || 0;

    // Calcular desconto em reais dos pontos (1 ponto = R$ 0.01)
    const loyaltyDiscount = loyaltyPointsUsed * 0.01;

    const total = subtotal - saleDiscount - loyaltyDiscount + deliveryFee;

    // Validar que o total dos pagamentos está correto
    const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPayments - total) > 0.01) {
      throw new AppError(
        `O total dos pagamentos (R$ ${totalPayments.toFixed(2)}) não corresponde ao total da venda (R$ ${total.toFixed(2)})`,
        400
      );
    }

    // Criar venda em transação
    return this.prismaClient.$transaction(async (tx) => {
      // Criar venda
      const sale = await tx.sale.create({
        data: {
          cashSessionId: data.cashSessionId,
          customerId: data.customerId,
          saleType: data.saleType || 'pdv',
          subtotal,
          discount: saleDiscount + loyaltyDiscount,
          deliveryFee,
          total,
          loyaltyPointsUsed,
          loyaltyPointsEarned: totalLoyaltyPointsEarned,
          status: 'completed',
          createdById: data.createdById,
          items: {
            create: saleItems,
          },
          payments: {
            create: data.payments,
          },
        },
        include: this.includeRelations(),
      });

      // Atualizar estoque dos produtos
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product || !product.trackStock) continue;

        await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Atualizar pontos do cliente
      if (customer) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            loyaltyPoints: {
              increment: totalLoyaltyPointsEarned,
              decrement: loyaltyPointsUsed,
            },
            totalPurchases: {
              increment: 1,
            },
            totalSpent: {
              increment: total,
            },
          },
        });

        // Registrar transação de fidelidade (ganho)
        if (totalLoyaltyPointsEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              customerId: customer.id,
              transactionType: 'earned',
              points: totalLoyaltyPointsEarned,
              description: `Compra #${sale.saleNumber}`,
              relatedSaleId: sale.id,
            },
          });
        }

        // Registrar transação de fidelidade (uso)
        if (loyaltyPointsUsed > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              customerId: customer.id,
              transactionType: 'redeemed',
              points: -loyaltyPointsUsed,
              description: `Resgate na compra #${sale.saleNumber}`,
              relatedSaleId: sale.id,
            },
          });
        }
      }

      // Atualizar totalizadores do caixa
      const paymentTotals = {
        totalSales: { increment: total },
        totalCash: { increment: 0 },
        totalCard: { increment: 0 },
        totalPix: { increment: 0 },
        totalOther: { increment: 0 },
      };

      for (const payment of data.payments) {
        switch (payment.paymentMethod) {
          case 'cash':
            paymentTotals.totalCash.increment += payment.amount;
            break;
          case 'debit_card':
          case 'credit_card':
            paymentTotals.totalCard.increment += payment.amount;
            break;
          case 'pix':
            paymentTotals.totalPix.increment += payment.amount;
            break;
          case 'other':
            paymentTotals.totalOther.increment += payment.amount;
            break;
        }
      }

      await tx.cashSession.update({
        where: { id: data.cashSessionId },
        data: paymentTotals,
      });

      return sale;
    });
  }

  async getSaleById(id: string) {
    const sale = await this.prismaClient.sale.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!sale) {
      throw new AppError('Venda não encontrada', 404);
    }

    return sale;
  }

  async listSales(filters: SaleFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.cashSessionId) {
      where.cashSessionId = filters.cashSessionId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.saleType) {
      where.saleType = filters.saleType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.saleDate = {};
      if (filters.startDate) {
        where.saleDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.saleDate.lte = filters.endDate;
      }
    }

    const [sales, total] = await Promise.all([
      this.prismaClient.sale.findMany({
        where,
        include: this.includeRelations(),
        orderBy: { saleDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.sale.count({ where }),
    ]);

    return {
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelSale(id: string, reason: string, userId: string) {
    const sale = await this.prismaClient.sale.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!sale) {
      throw new AppError('Venda não encontrada', 404);
    }

    if (sale.status === 'cancelled') {
      throw new AppError('Venda já está cancelada', 400);
    }

    return this.prismaClient.$transaction(async (tx) => {
      // Atualizar venda
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: 'cancelled',
          isAdjusted: true,
          adjustmentReason: reason,
          adjustedAt: new Date(),
          adjustedById: userId,
        },
        include: this.includeRelations(),
      });

      // Criar registro de ajuste
      await tx.saleAdjustment.create({
        data: {
          saleId: id,
          adjustmentType: 'cancellation',
          reason,
          oldTotal: sale.total,
          newTotal: 0,
          adjustedById: userId,
        },
      });

      // Reverter estoque
      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product?.trackStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                increment: Number(item.quantity),
              },
            },
          });
        }
      }

      // Reverter pontos do cliente
      if (sale.customer) {
        await tx.customer.update({
          where: { id: sale.customer.id },
          data: {
            loyaltyPoints: {
              decrement: sale.loyaltyPointsEarned,
              increment: sale.loyaltyPointsUsed,
            },
            totalPurchases: {
              decrement: 1,
            },
            totalSpent: {
              decrement: Number(sale.total),
            },
          },
        });

        // Registrar transações de fidelidade (reversão)
        if (sale.loyaltyPointsEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              customerId: sale.customer.id,
              transactionType: 'expired',
              points: -sale.loyaltyPointsEarned,
              description: `Estorno compra #${sale.saleNumber} (cancelada)`,
              relatedSaleId: sale.id,
            },
          });
        }

        if (sale.loyaltyPointsUsed > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              customerId: sale.customer.id,
              transactionType: 'earned',
              points: sale.loyaltyPointsUsed,
              description: `Devolução resgate compra #${sale.saleNumber} (cancelada)`,
              relatedSaleId: sale.id,
            },
          });
        }
      }

      // Atualizar totalizadores do caixa (decrementar)
      const payments = await tx.payment.findMany({
        where: { saleId: id },
      });

      const paymentTotals = {
        totalSales: { decrement: Number(sale.total) },
        totalCash: { decrement: 0 },
        totalCard: { decrement: 0 },
        totalPix: { decrement: 0 },
        totalOther: { decrement: 0 },
      };

      for (const payment of payments) {
        const amount = Number(payment.amount);
        switch (payment.paymentMethod) {
          case 'cash':
            paymentTotals.totalCash.decrement += amount;
            break;
          case 'debit_card':
          case 'credit_card':
            paymentTotals.totalCard.decrement += amount;
            break;
          case 'pix':
            paymentTotals.totalPix.decrement += amount;
            break;
          case 'other':
            paymentTotals.totalOther.decrement += amount;
            break;
        }
      }

      await tx.cashSession.update({
        where: { id: sale.cashSessionId },
        data: paymentTotals,
      });

      return updatedSale;
    });
  }

  async reopenSale(id: string, reason: string, userId: string) {
    const sale = await this.prismaClient.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      throw new AppError('Venda não encontrada', 404);
    }

    if (sale.status !== 'cancelled') {
      throw new AppError('Apenas vendas canceladas podem ser reabertas', 400);
    }

    const updatedSale = await this.prismaClient.sale.update({
      where: { id },
      data: {
        status: 'completed',
        isAdjusted: true,
        adjustmentReason: reason,
        adjustedAt: new Date(),
        adjustedById: userId,
      },
      include: this.includeRelations(),
    });

    await this.prismaClient.saleAdjustment.create({
      data: {
        saleId: id,
        adjustmentType: 'reopening',
        reason,
        oldTotal: 0,
        newTotal: sale.total,
        adjustedById: userId,
      },
    });

    return updatedSale;
  }
}
