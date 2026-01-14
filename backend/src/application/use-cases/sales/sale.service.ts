import { PrismaClient, TransactionType, SaleStatus, PaymentMethod, type LoyaltyConfig, type CashbackConfig } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';
import { LoyaltyService } from '@application/use-cases/loyalty/loyalty.service';
import { CashbackService } from '@application/use-cases/cashback/cashback.service';
import { CouponService } from '@application/use-cases/coupons/coupon.service';

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  sizeId?: string;
  flavorsTotal?: number;
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
  couponCode?: string;
  items: SaleItemInput[];
  payments: PaymentInput[];
  discount?: number;
  additionalFee?: number;
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
    const addDays = (days?: number | null) => {
      if (!days) return undefined;
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    };

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
        category: {
          include: {
            sizes: { orderBy: { displayOrder: 'asc' } },
          },
        },
        sizePrices: {
          select: {
            categorySizeId: true,
            price: true,
          },
        },
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
    let customer: any = null;
    if (data.customerId) {
      customer = await this.prismaClient.customer.findUnique({
        where: { id: data.customerId },
        select: {
          id: true,
          name: true,
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
      throw new AppError('A venda deve conter ao menos uma forma de pagamento', 400);
    }

    // Calcular itens e totais
    let subtotal = 0;
    let itemsDiscountTotal = 0;
    const saleItems: any[] = [];
    let eligibleLoyaltyTotal = 0;
    let eligibleCashbackTotal = 0;

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;

      // Regra Montado: se o produto é Montado, tamanho é obrigatório.
      if (product.category?.categoryType === 'assembled' && !item.sizeId) {
        throw new AppError(`Produto Montado exige tamanho: ${product.name}`, 400);
      }

      const isAssembled = !!item.sizeId;
      if (isAssembled) {
        if (!product.categoryId || product.category?.categoryType !== 'assembled') {
          throw new AppError('Tamanho/sabores só podem ser usados em produtos de categoria Montado', 400);
        }
        const size = product.category.sizes.find((s: any) => s.id === item.sizeId);
        if (!size) {
          throw new AppError('Tamanho não pertence à categoria do produto', 400);
        }
        const flavorsTotal = Number(item.flavorsTotal ?? 1);
        if (!Number.isFinite(flavorsTotal) || flavorsTotal < 1 || flavorsTotal > size.maxFlavors) {
          throw new AppError(`Quantidade de sabores inválida para o tamanho ${size.name}`, 400);
        }
        const sizePrice = product.sizePrices.find((sp: any) => sp.categorySizeId === item.sizeId);
        if (!sizePrice) {
          throw new AppError(`Preço não cadastrado para o tamanho ${size.name} do produto ${product.name}`, 400);
        }

        const unitPrice = Number(sizePrice.price) / flavorsTotal;
        const itemDiscount = item.discount || 0;
        const itemSubtotal = unitPrice * item.quantity;
        const itemTotal = itemSubtotal - itemDiscount;

        subtotal += itemSubtotal;
        itemsDiscountTotal += itemDiscount;

        if (product.eligibleForLoyalty) {
          eligibleLoyaltyTotal += itemTotal;
        }

        if (product.earnsCashback) {
          eligibleCashbackTotal += itemTotal;
        }

        const currentCost = product.productCosts[0]?.costPrice || product.costPrice || 0;

        saleItems.push({
          productId: product.id,
          productName: `${product.name} (${size.name} 1/${flavorsTotal})`,
          quantity: item.quantity,
          unitPrice,
          costPrice: Number(currentCost),
          subtotal: itemSubtotal,
          discount: itemDiscount,
          total: itemTotal,
          loyaltyPointsEarned: 0,
        });
        continue;
      }

      const providedUnitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : NaN;
      const unitPrice = Number.isFinite(providedUnitPrice) ? providedUnitPrice : Number(product.salePrice);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new AppError(`Preço inválido para o produto ${product.name}`, 400);
      }
      const itemDiscount = item.discount || 0;
      const itemSubtotal = unitPrice * item.quantity;
      const itemTotal = itemSubtotal - itemDiscount;

      subtotal += itemSubtotal;
      itemsDiscountTotal += itemDiscount;

      if (product.eligibleForLoyalty) {
        eligibleLoyaltyTotal += itemTotal;
      }

      if (product.earnsCashback) {
        eligibleCashbackTotal += itemTotal;
      }

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
        loyaltyPointsEarned: 0,
      });
    }

    const saleDiscount = data.discount || 0;
    const baseForCoupon = Math.max(subtotal - itemsDiscountTotal - saleDiscount, 0);

    // Validar cupom
    let couponDiscount = 0;
    let validatedCoupon: any = null;
    if (data.couponCode) {
      validatedCoupon = await this.couponService.validateCoupon(
        data.couponCode,
        baseForCoupon,
        data.customerId!
      );
      couponDiscount = validatedCoupon.discountAmount;
    }

    // Converter pontos em desconto usando config
    const loyaltyPointsUsed = data.loyaltyPointsUsed || 0;
    let loyaltyDiscount = 0;
    let loyaltyConfig: LoyaltyConfig | null = null;
    if (customer) {
      loyaltyConfig = await this.loyaltyService.getLoyaltyConfig();
    }

    if (customer && loyaltyPointsUsed > 0) {
      if (loyaltyPointsUsed < Number(loyaltyConfig!.minPointsToRedeem)) {
        throw new AppError(
          `Mínimo de ${loyaltyConfig!.minPointsToRedeem} pontos para resgatar`,
          400
        );
      }

      if (customer.loyaltyPoints < loyaltyPointsUsed) {
        throw new AppError('Cliente não possui pontos suficientes', 400);
      }

      loyaltyDiscount = parseFloat(
        (loyaltyPointsUsed * Number(loyaltyConfig!.pointsRedemptionValue)).toFixed(2)
      );

      const maxRedeemable = Math.max(baseForCoupon - couponDiscount, 0);
      if (loyaltyDiscount > maxRedeemable + 0.01) {
        throw new AppError('Valor de pontos excede o total após descontos', 400);
      }
    }

    const deliveryFee = data.deliveryFee || 0;
    const additionalFee = data.additionalFee || 0;
    const itemsNet = subtotal - itemsDiscountTotal;
    const grossTotal =
      itemsNet - saleDiscount - couponDiscount - loyaltyDiscount + deliveryFee + additionalFee;

    if (grossTotal < 0) {
      throw new AppError('Total da venda não pode ser negativo', 400);
    }

    const total = parseFloat(grossTotal.toFixed(2));

    const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPayments - total) > 0.01) {
      throw new AppError(
        `O total dos pagamentos (R$ ${totalPayments.toFixed(
          2
        )}) não corresponde ao total da venda (R$ ${total.toFixed(2)})`,
        400
      );
    }

    // Calcular pontos e cashback (base = total líquido)
    let loyaltyPointsEarned = 0;
    let cashbackEarned = 0;
    let cashbackConfig: CashbackConfig | null = null;

    if (customer) {
      const baseForRewards = total;
      loyaltyPointsEarned = await this.loyaltyService.calculatePoints(
        baseForRewards,
        productIds
      );
      cashbackEarned = await this.cashbackService.calculateCashback(
        baseForRewards,
        productIds
      );
      cashbackConfig = await this.cashbackService.getCashbackConfig();
    }

    // Distribuir pontos por item proporcionalmente aos elegíveis
    if (loyaltyPointsEarned > 0 && eligibleLoyaltyTotal > 0) {
      let remainingPoints = loyaltyPointsEarned;
      const eligibleItems = saleItems.filter((item) =>
        products.find((p) => p.id === item.productId)?.eligibleForLoyalty
      );

      eligibleItems.forEach((item, index) => {
        const isLast = index === eligibleItems.length - 1;
        if (isLast) {
          item.loyaltyPointsEarned = remainingPoints;
          return;
        }

        const share = item.total / eligibleLoyaltyTotal;
        const pointsForItem = Math.floor(loyaltyPointsEarned * share);
        item.loyaltyPointsEarned = pointsForItem;
        remainingPoints -= pointsForItem;
      });
    }

    return this.prismaClient.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          cashSessionId: data.cashSessionId,
          customerId: data.customerId,
          saleType: data.saleType || 'pdv',
          subtotal,
          discount: itemsDiscountTotal + saleDiscount + couponDiscount + loyaltyDiscount,
          deliveryFee,
          additionalFee,
          total,
          loyaltyPointsUsed,
          loyaltyPointsEarned,
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

      if (customer) {
        let loyaltyBalance = customer.loyaltyPoints;

        if (loyaltyPointsUsed > 0) {
          loyaltyBalance -= loyaltyPointsUsed;
          await tx.loyaltyTransaction.create({
            data: {
              customerId: customer.id,
              transactionType: 'redeem',
              points: -loyaltyPointsUsed,
              balanceAfter: loyaltyBalance,
              description: `Resgate na venda #${sale.saleNumber}`,
              saleId: sale.id,
              createdById: data.createdById,
            },
          });
        }

        if (loyaltyPointsEarned > 0) {
          loyaltyBalance += loyaltyPointsEarned;
          await tx.loyaltyTransaction.create({
            data: {
              customerId: customer.id,
              transactionType: 'earn',
              points: loyaltyPointsEarned,
              balanceAfter: loyaltyBalance,
              description: `Compra #${sale.saleNumber}`,
              saleId: sale.id,
              expiresAt: addDays(loyaltyConfig?.pointsExpirationDays || 0),
              createdById: data.createdById,
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
              saleId: sale.id,
              description: `Cashback da venda #${sale.saleNumber}`,
              expiresAt: addDays(cashbackConfig?.cashbackExpirationDays || 0),
              createdById: data.createdById,
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
          saleId: sale.id,
        });
      }

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
        let loyaltyBalance = sale.customer.loyaltyPoints;

        if (sale.loyaltyPointsEarned > 0) {
          loyaltyBalance -= sale.loyaltyPointsEarned;
          await tx.loyaltyTransaction.create({
            data: {
              customerId: sale.customer.id,
              transactionType: 'expire',
              points: -sale.loyaltyPointsEarned,
              balanceAfter: loyaltyBalance,
              description: `Estorno compra #${sale.saleNumber} (cancelada)`,
              saleId: sale.id,
            },
          });
        }

        if (sale.loyaltyPointsUsed > 0) {
          loyaltyBalance += sale.loyaltyPointsUsed;
          await tx.loyaltyTransaction.create({
            data: {
              customerId: sale.customer.id,
              transactionType: 'earn',
              points: sale.loyaltyPointsUsed,
              balanceAfter: loyaltyBalance,
              description: `Devolução resgate compra #${sale.saleNumber} (cancelada)`,
              saleId: sale.id,
            },
          });
        }

        await tx.customer.update({
          where: { id: sale.customer.id },
          data: {
            loyaltyPoints: loyaltyBalance,
            purchaseCount: {
              decrement: 1,
            },
            totalPurchases: {
              decrement: Number(sale.total),
            },
          },
        });
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
