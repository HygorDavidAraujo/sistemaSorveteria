import { PrismaClient, ComandaStatus, PaymentMethod } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';
import { LoyaltyService } from '@application/use-cases/loyalty/loyalty.service';
import { CashbackService } from '@application/use-cases/cashback/cashback.service';
import { CouponService } from '@application/use-cases/coupons/coupon.service';

export interface CreateComandaDTO {
  tableNumber?: string;
  customerName?: string;
  customerId?: string;
  cashSessionId: string;
  openedById: string;
}

export interface AddItemDTO {
  productId: string;
  quantity: number;
  addedById: string;
}

export interface UpdateItemDTO {
  quantity: number;
}

export interface CloseComandaDTO {
  discount?: number;
  additionalFee?: number;
  couponCode?: string;
  payments: {
    paymentMethod: PaymentMethod;
    amount: number;
  }[];
  closedById: string;
}

export interface ComandaFilters {
  status?: ComandaStatus;
  cashSessionId?: string;
  customerId?: string;
  tableNumber?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class ComandaService {
  private loyaltyService: LoyaltyService;
  private cashbackService: CashbackService;
  private couponService: CouponService;

  constructor(private prismaClient: PrismaClient = prisma) {
    this.loyaltyService = new LoyaltyService(this.prismaClient);
    this.cashbackService = new CashbackService(this.prismaClient);
    this.couponService = new CouponService(this.prismaClient);
  }

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
          addedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          addedAt: 'asc' as const,
        },
      },
      payments: true,
      customer: {
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
        },
      },
      openedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
      closedBy: {
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

  async openComanda(data: CreateComandaDTO) {
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

    // Validar cliente se fornecido
    if (data.customerId) {
      const customer = await this.prismaClient.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer) {
        throw new AppError('Cliente não encontrado', 404);
      }
    }

    // Gerar número da comanda (último número do dia + 1)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastComanda = await this.prismaClient.comanda.findFirst({
      where: {
        openedAt: {
          gte: today,
        },
      },
      orderBy: {
        comandaNumber: 'desc',
      },
    });

    const comandaNumber = lastComanda ? lastComanda.comandaNumber + 1 : 1;

    // Criar comanda
    const comanda = await this.prismaClient.comanda.create({
      data: {
        comandaNumber,
        tableNumber: data.tableNumber,
        customerName: data.customerName,
        customerId: data.customerId,
        cashSessionId: data.cashSessionId,
        openedById: data.openedById,
      },
      include: this.includeRelations(),
    });

    return comanda;
  }

  async getComandaById(id: string) {
    const comanda = await this.prismaClient.comanda.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!comanda) {
      throw new AppError('Comanda não encontrada', 404);
    }

    return comanda;
  }

  async listComandas(filters: ComandaFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.cashSessionId) {
      where.cashSessionId = filters.cashSessionId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.tableNumber) {
      where.tableNumber = filters.tableNumber;
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

    const [comandas, total] = await Promise.all([
      this.prismaClient.comanda.findMany({
        where,
        include: this.includeRelations(),
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.comanda.count({ where }),
    ]);

    return {
      comandas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addItem(comandaId: string, data: AddItemDTO) {
    // Validar comanda
    const comanda = await this.prismaClient.comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda) {
      throw new AppError('Comanda não encontrada', 404);
    }

    if (comanda.status !== 'open') {
      throw new AppError('Comanda não está aberta', 400);
    }

    // Validar produto
    const product = await this.prismaClient.product.findUnique({
      where: { id: data.productId },
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

    if (!product || !product.isActive) {
      throw new AppError('Produto não encontrado ou inativo', 404);
    }

    // Validar estoque
    if (product.trackStock && Number(product.currentStock) < data.quantity) {
      throw new AppError(`Estoque insuficiente para o produto ${product.name}`, 400);
    }

    // Calcular valores
    const unitPrice = Number(product.salePrice);
    const subtotal = unitPrice * data.quantity;
    const currentCost = product.productCosts[0]?.costPrice || product.costPrice || 0;

    return this.prismaClient.$transaction(async (tx) => {
      // Adicionar item
      const item = await tx.comandaItem.create({
        data: {
          comandaId,
          productId: data.productId,
          productName: product.name,
          quantity: data.quantity,
          unitPrice,
          costPrice: Number(currentCost),
          subtotal,
          addedById: data.addedById,
        },
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
          addedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Atualizar estoque
      if (product.trackStock) {
        await tx.product.update({
          where: { id: data.productId },
          data: {
            currentStock: {
              decrement: data.quantity,
            },
          },
        });
      }

      // Recalcular totais da comanda
      await this.recalculateTotals(tx, comandaId);

      return item;
    });
  }

  async updateItem(comandaId: string, itemId: string, data: UpdateItemDTO) {
    // Validar item
    const item = await this.prismaClient.comandaItem.findUnique({
      where: { id: itemId },
      include: {
        product: true,
      },
    });

    if (!item) {
      throw new AppError('Item não encontrado', 404);
    }

    if (item.comandaId !== comandaId) {
      throw new AppError('Item não pertence a esta comanda', 400);
    }

    if (item.isCancelled) {
      throw new AppError('Item já foi cancelado', 400);
    }

    // Validar comanda
    const comanda = await this.prismaClient.comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda || comanda.status !== 'open') {
      throw new AppError('Comanda não está aberta', 400);
    }

    // Calcular diferença de estoque
    const oldQuantity = Number(item.quantity);
    const quantityDiff = data.quantity - oldQuantity;

    // Validar estoque
    if (item.product.trackStock && quantityDiff > 0) {
      if (Number(item.product.currentStock) < quantityDiff) {
        throw new AppError('Estoque insuficiente para aumentar a quantidade', 400);
      }
    }

    return this.prismaClient.$transaction(async (tx) => {
      // Atualizar item
      const newSubtotal = Number(item.unitPrice) * data.quantity;
      const updatedItem = await tx.comandaItem.update({
        where: { id: itemId },
        data: {
          quantity: data.quantity,
          subtotal: newSubtotal,
        },
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
          addedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Atualizar estoque
      if (item.product.trackStock) {
        if (quantityDiff > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                decrement: quantityDiff,
              },
            },
          });
        } else if (quantityDiff < 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                increment: Math.abs(quantityDiff),
              },
            },
          });
        }
      }

      // Recalcular totais da comanda
      await this.recalculateTotals(tx, comandaId);

      return updatedItem;
    });
  }

  async cancelItem(comandaId: string, itemId: string, reason: string, userId: string) {
    // Validar item
    const item = await this.prismaClient.comandaItem.findUnique({
      where: { id: itemId },
      include: {
        product: true,
      },
    });

    if (!item) {
      throw new AppError('Item não encontrado', 404);
    }

    if (item.comandaId !== comandaId) {
      throw new AppError('Item não pertence a esta comanda', 400);
    }

    if (item.isCancelled) {
      throw new AppError('Item já está cancelado', 400);
    }

    // Validar comanda
    const comanda = await this.prismaClient.comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda || comanda.status !== 'open') {
      throw new AppError('Comanda não está aberta', 400);
    }

    return this.prismaClient.$transaction(async (tx) => {
      // Cancelar item
      const cancelledItem = await tx.comandaItem.update({
        where: { id: itemId },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
          cancelledById: userId,
          cancellationReason: reason,
        },
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
          addedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Reverter estoque
      if (item.product.trackStock) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              increment: Number(item.quantity),
            },
          },
        });
      }

      // Recalcular totais da comanda
      await this.recalculateTotals(tx, comandaId);

      return cancelledItem;
    });
  }

  async closeComanda(comandaId: string, data: CloseComandaDTO) {
    const addDays = (days?: number | null) => {
      if (!days) return undefined;
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    };

    // Validar comanda
    const comanda = await this.prismaClient.comanda.findUnique({
      where: { id: comandaId },
      include: {
        items: {
          where: {
            isCancelled: false,
          },
        },
      },
    });

    if (!comanda) {
      throw new AppError('Comanda não encontrada', 404);
    }

    if (comanda.status !== 'open') {
      throw new AppError('Comanda não está aberta', 400);
    }

    if (comanda.items.length === 0) {
      throw new AppError('Comanda não possui itens ativos', 400);
    }

    const productIds = comanda.items.map((item) => item.productId);

    // Cliente (se houver) para pontos/cashback
    let customer: any = null;
    if (comanda.customerId) {
      customer = await this.prismaClient.customer.findUnique({
        where: { id: comanda.customerId },
        select: {
          id: true,
          loyaltyPoints: true,
          cashbackBalance: true,
        },
      });

      if (!customer) {
        throw new AppError('Cliente não encontrado', 404);
      }
    }

    if (data.couponCode && !customer) {
      throw new AppError('Cupom exige um cliente identificado', 400);
    }

    if (!data.payments || data.payments.length === 0) {
      throw new AppError('Informe ao menos uma forma de pagamento', 400);
    }

    const discount = data.discount || 0;
    const additionalFee = data.additionalFee || 0;
    const baseForCoupon = Math.max(Number(comanda.subtotal) - discount, 0);

    let couponDiscount = 0;
    let validatedCoupon: any = null;
    if (data.couponCode) {
      validatedCoupon = await this.couponService.validateCoupon(
        data.couponCode,
        baseForCoupon,
        comanda.customerId!
      );
      couponDiscount = validatedCoupon.discountAmount;
    }

    const total = Number(comanda.subtotal) + additionalFee - discount - couponDiscount;

    const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);

    if (Math.abs(totalPayments - total) > 0.01) {
      throw new AppError(
        `O total dos pagamentos (R$ ${totalPayments.toFixed(
          2
        )}) não corresponde ao total da comanda (R$ ${total.toFixed(2)})`,
        400
      );
    }

    // Pontos e cashback
    let loyaltyPointsEarned = 0;
    let cashbackEarned = 0;
    let loyaltyConfig = null;
    let cashbackConfig = null;

    if (customer) {
      loyaltyPointsEarned = await this.loyaltyService.calculatePoints(total, productIds);
      cashbackEarned = await this.cashbackService.calculateCashback(total, productIds);
      loyaltyConfig = await this.loyaltyService.getLoyaltyConfig();
      cashbackConfig = await this.cashbackService.getCashbackConfig();
    }

    return this.prismaClient.$transaction(async (tx) => {
      // Registrar pagamentos
      await tx.comandaPayment.createMany({
        data: data.payments.map((p) => ({
          comandaId,
          paymentMethod: p.paymentMethod,
          amount: p.amount,
        })),
      });

      // Fechar comanda
      const closedComanda = await tx.comanda.update({
        where: { id: comandaId },
        data: {
          discount: discount + couponDiscount,
          additionalFee,
          total,
          status: 'closed',
          closedAt: new Date(),
          closedById: data.closedById,
        },
        include: this.includeRelations(),
      });

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
        where: { id: comanda.cashSessionId },
        data: paymentTotals,
      });

      // Atualizar cliente se houver
      if (customer) {
        let loyaltyBalance = customer.loyaltyPoints;

        if (loyaltyPointsEarned > 0) {
          loyaltyBalance += loyaltyPointsEarned;
          await tx.loyaltyTransaction.create({
            data: {
              customerId: customer.id,
              transactionType: 'earn',
              points: loyaltyPointsEarned,
              balanceAfter: loyaltyBalance,
              description: `Comanda #${comanda.comandaNumber}`,
              saleId: null,
              expiresAt: addDays(loyaltyConfig?.pointsExpirationDays || 0),
              createdById: data.closedById,
            },
          });
        }

        let cashbackBalance = Number(customer.cashbackBalance || 0);
        if (cashbackEarned > 0) {
          cashbackBalance += cashbackEarned;
          await tx.cashbackTransaction.create({
            data: {
              customerId: customer.id,
              transactionType: 'earn',
              amount: cashbackEarned,
              balanceAfter: cashbackBalance,
              comandaId,
              description: `Cashback da comanda #${comanda.comandaNumber}`,
              expiresAt: addDays(cashbackConfig?.cashbackExpirationDays || 0),
              createdById: data.closedById,
            },
          });
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            loyaltyPoints: loyaltyBalance,
            cashbackBalance,
            totalCashbackEarned: {
              increment: cashbackEarned,
            },
            purchaseCount: {
              increment: 1,
            },
            totalPurchases: {
              increment: total,
            },
          },
        });
      }

      if (validatedCoupon) {
        const couponService = new CouponService(tx as any);
        await couponService.applyCoupon({
          couponId: validatedCoupon.coupon.id,
          customerId: customer!.id,
          discountApplied: couponDiscount,
          comandaId,
        });
      }

      return closedComanda;
    });
  }

  async reopenComanda(comandaId: string, reason: string, userId: string) {
    const comanda = await this.prismaClient.comanda.findUnique({
      where: { id: comandaId },
      include: {
        payments: true,
        items: {
          where: {
            isCancelled: false,
          },
        },
      },
    });

    if (!comanda) {
      throw new AppError('Comanda não encontrada', 404);
    }

    if (comanda.status !== 'closed') {
      throw new AppError('Apenas comandas fechadas podem ser reabertas', 400);
    }

    return this.prismaClient.$transaction(async (tx) => {
      // Deletar pagamentos
      await tx.comandaPayment.deleteMany({
        where: { comandaId },
      });

      // Reabrir comanda
      const reopenedComanda = await tx.comanda.update({
        where: { id: comandaId },
        data: {
          status: 'open',
          closedAt: null,
          closedById: null,
          discount: 0,
          additionalFee: 0,
          total: comanda.subtotal,
          isAdjusted: true,
          adjustmentReason: reason,
        },
        include: this.includeRelations(),
      });

      // Reverter totalizadores do caixa
      const paymentTotals = {
        totalSales: { decrement: Number(comanda.total) },
        totalCash: { decrement: 0 },
        totalCard: { decrement: 0 },
        totalPix: { decrement: 0 },
        totalOther: { decrement: 0 },
      };

      for (const payment of comanda.payments) {
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
        where: { id: comanda.cashSessionId },
        data: paymentTotals,
      });

      // Reverter totais do cliente se houver
      if (comanda.customerId) {
        await tx.customer.update({
          where: { id: comanda.customerId },
          data: {
            purchaseCount: {
              decrement: 1,
            },
          },
        });
      }

      return reopenedComanda;
    });
  }

  async cancelComanda(comandaId: string, reason: string, userId: string) {
    const comanda = await this.prismaClient.comanda.findUnique({
      where: { id: comandaId },
      include: {
        items: {
          where: {
            isCancelled: false,
          },
        },
        payments: true,
      },
    });

    if (!comanda) {
      throw new AppError('Comanda não encontrada', 404);
    }

    if (comanda.status === 'cancelled') {
      throw new AppError('Comanda já está cancelada', 400);
    }

    return this.prismaClient.$transaction(async (tx) => {
      // Cancelar todos os itens ativos
      for (const item of comanda.items) {
        await tx.comandaItem.update({
          where: { id: item.id },
          data: {
            isCancelled: true,
            cancelledAt: new Date(),
            cancelledById: userId,
            cancellationReason: 'Comanda cancelada',
          },
        });

        // Reverter estoque
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

      // Cancelar comanda
      const cancelledComanda = await tx.comanda.update({
        where: { id: comandaId },
        data: {
          status: 'cancelled',
          closedAt: new Date(),
          closedById: userId,
          isAdjusted: true,
          adjustmentReason: reason,
        },
        include: this.includeRelations(),
      });

      // Se estava fechada, reverter totalizadores do caixa
      if (comanda.status === 'closed' && comanda.payments.length > 0) {
        const paymentTotals = {
          totalSales: { decrement: Number(comanda.total) },
          totalCash: { decrement: 0 },
          totalCard: { decrement: 0 },
          totalPix: { decrement: 0 },
          totalOther: { decrement: 0 },
        };

        for (const payment of comanda.payments) {
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
          where: { id: comanda.cashSessionId },
          data: paymentTotals,
        });

        // Reverter totais do cliente se houver
        if (comanda.customerId) {
          await tx.customer.update({
            where: { id: comanda.customerId },
            data: {
              purchaseCount: {
                decrement: 1,
              },
            },
          });
        }
      }

      return cancelledComanda;
    });
  }

  private async recalculateTotals(tx: any, comandaId: string) {
    const items = await tx.comandaItem.findMany({
      where: {
        comandaId,
        isCancelled: false,
      },
    });

    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + Number(item.subtotal);
    }, 0);

    await tx.comanda.update({
      where: { id: comandaId },
      data: {
        subtotal,
        total: subtotal,
      },
    });
  }
}
