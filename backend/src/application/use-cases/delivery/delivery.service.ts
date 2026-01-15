import { PrismaClient, DeliveryStatus, PaymentMethod, type LoyaltyConfig, type CashbackConfig } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';
import { LoyaltyService } from '@application/use-cases/loyalty/loyalty.service';
import { CashbackService } from '@application/use-cases/cashback/cashback.service';
import { CouponService } from '@application/use-cases/coupons/coupon.service';

export interface CreateDeliveryOrderDTO {
  customerId: string;
  cashSessionId: string;
  couponCode?: string;
  items: Array<{
    productId: string;
    quantity: number;
    sizeId?: string;
    flavorsTotal?: number;
  }>;
  payments?: Array<{
    paymentMethod: PaymentMethod;
    amount: number;
  }>;
  deliveryFee?: number;
  additionalFee?: number;
  discount?: number;
  estimatedTime?: number;
  customerNotes?: string;
  internalNotes?: string;
  createdById: string;
}

export interface UpdateDeliveryStatusDTO {
  status: DeliveryStatus;
  deliveryPerson?: string;
  internalNotes?: string;
}

export interface DeliveryOrderFilters {
  status?: DeliveryStatus;
  customerId?: string;
  cashSessionId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface CreateDeliveryFeeDTO {
  feeType?: 'neighborhood' | 'distance';
  neighborhood?: string | null;
  city?: string | null;
  fee: number;
  minOrderValue?: number;
  freeDeliveryAbove?: number | null;
  // Distance-based
  maxDistance?: number | null;
  feePerKm?: number | null;
  baseFee?: number | null;
  isActive?: boolean;
}

export interface UpdateDeliveryFeeDTO {
  feeType?: 'neighborhood' | 'distance';
  neighborhood?: string | null;
  city?: string | null;
  fee?: number;
  minOrderValue?: number;
  freeDeliveryAbove?: number | null;
  // Distance-based
  maxDistance?: number | null;
  feePerKm?: number | null;
  baseFee?: number | null;
  isActive?: boolean;
}

export class DeliveryService {
  private loyaltyService: LoyaltyService;
  private cashbackService: CashbackService;
  private couponService: CouponService;

  constructor(private prismaClient: PrismaClient = prisma) {
    this.loyaltyService = new LoyaltyService(this.prismaClient);
    this.cashbackService = new CashbackService(this.prismaClient);
    this.couponService = new CouponService(this.prismaClient);
  }

  private includeOrderRelations() {
    return {
      items: true,
      payments: true,
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          whatsapp: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          zipCode: true,
          referencePoint: true,
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
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    };
  }

  async createOrder(data: CreateDeliveryOrderDTO) {
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

    // Validar cliente
    const customer = await this.prismaClient.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new AppError('Cliente não encontrado', 404);
    }

    if (data.couponCode && !customer) {
      throw new AppError('Cupom exige um cliente identificado', 400);
    }

    // Validar items
    if (!data.items || data.items.length === 0) {
      throw new AppError('Pedido deve conter ao menos um item', 400);
    }

    // Buscar produtos e validar
    const productIds = data.items.map((item) => item.productId);
    const products = await this.prismaClient.product.findMany({
      where: {
        id: { in: productIds },
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
      throw new AppError('Um ou mais produtos não foram encontrados', 404);
    }

    // Verificar produtos inativos
    const inactiveProducts = products.filter((p) => !p.isActive);
    if (inactiveProducts.length > 0) {
      throw new AppError(
        `Produto(s) inativo(s): ${inactiveProducts.map((p) => p.name).join(', ')}`,
        400
      );
    }

    // Verificar estoque
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.trackStock) {
        if (Number(product.currentStock) < item.quantity) {
          throw new AppError(`Estoque insuficiente para o produto ${product.name}`, 400);
        }
      }
    }

    // Calcular valores
    let subtotal = 0;
    const itemsData: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      subtotal: number;
    }> = [];

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      let unitPrice = Number(product.salePrice);
      let productName = product.name;

      // Regra Montado: se o produto é Montado, tamanho é obrigatório.
      if (product.category?.categoryType === 'assembled' && !item.sizeId) {
        throw new AppError(`Produto Montado exige tamanho: ${product.name}`, 400);
      }

      if (item.sizeId) {
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
        unitPrice = Number(sizePrice.price) / flavorsTotal;
        productName = `${product.name} (${size.name} 1/${flavorsTotal})`;
      }

      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      const currentCost = product.productCosts[0]?.costPrice || product.costPrice || 0;

      itemsData.push({
        productId: item.productId,
        productName,
        quantity: item.quantity,
        unitPrice,
        costPrice: Number(currentCost),
        subtotal: itemSubtotal,
      });
    }

    const deliveryFee = data.deliveryFee ?? 0;
    const additionalFee = data.additionalFee ?? 0;
    const discount = data.discount ?? 0;
    const baseForCoupon = Math.max(subtotal + deliveryFee - discount, 0);

    let couponDiscount = 0;
    let validatedCoupon: any = null;
    if (data.couponCode) {
      validatedCoupon = await this.couponService.validateCoupon(
        data.couponCode,
        baseForCoupon,
        data.customerId
      );
      couponDiscount = validatedCoupon.discountAmount;
    }

    const total = subtotal + deliveryFee + additionalFee - discount - couponDiscount;

    let loyaltyPointsEarned = 0;
    let cashbackEarned = 0;
    let loyaltyConfig: LoyaltyConfig | null = null;
    let cashbackConfig: CashbackConfig | null = null;

    if (customer) {
      loyaltyPointsEarned = await this.loyaltyService.calculatePoints(total, productIds);
      cashbackEarned = await this.cashbackService.calculateCashback(total, productIds);
      loyaltyConfig = await this.loyaltyService.getLoyaltyConfig();
      cashbackConfig = await this.cashbackService.getCashbackConfig();
    }

    return this.prismaClient.$transaction(async (tx) => {
      // Criar pedido de delivery
      const order = await tx.deliveryOrder.create({
        data: {
          customerId: data.customerId,
          cashSessionId: data.cashSessionId,
          subtotal,
          deliveryFee,
          additionalFee,
          discount: discount + couponDiscount,
          total,
          estimatedTime: data.estimatedTime,
          customerNotes: data.customerNotes,
          internalNotes: data.internalNotes,
          createdById: data.createdById,
        },
        include: this.includeOrderRelations(),
      });

      // Persistir itens do pedido (para relatórios/COGS)
      if (itemsData.length > 0) {
        await tx.deliveryOrderItem.createMany({
          data: itemsData.map((it) => ({
            deliveryOrderId: order.id,
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            costPrice: it.costPrice,
            subtotal: it.subtotal,
          })),
        });
      }

      // Persistir pagamentos (para exibição no comprovante)
      if (data.payments && data.payments.length > 0) {
        await tx.deliveryOrderPayment.createMany({
          data: data.payments.map((p) => ({
            deliveryOrderId: order.id,
            paymentMethod: p.paymentMethod,
            amount: p.amount,
          })),
        });
      }

      // Recarregar com itens incluídos (createMany não retorna rows)
      const orderWithItems = await tx.deliveryOrder.findUnique({
        where: { id: order.id },
        include: this.includeOrderRelations(),
      });

      // Atualizar estoque
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId)!;
        if (product.trackStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // Atualizar totais do caixa (por método + total)
      const paymentTotals = {
        totalSales: { increment: total },
        totalCash: { increment: 0 },
        totalCard: { increment: 0 },
        totalPix: { increment: 0 },
        totalOther: { increment: 0 },
      };

      if (data.payments && data.payments.length > 0) {
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
            default:
              paymentTotals.totalOther.increment += payment.amount;
              break;
          }
        }
      }

      await tx.cashSession.update({
        where: { id: data.cashSessionId },
        data: paymentTotals,
      });

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
              description: `Delivery #${order.orderNumber}`,
              saleId: null,
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
              deliveryOrderId: order.id,
              description: `Cashback do delivery #${order.orderNumber}`,
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
          deliveryOrderId: order.id,
        });
      }

      return orderWithItems;
    });
  }

  async getOrderById(id: string) {
    const order = await this.prismaClient.deliveryOrder.findUnique({
      where: { id },
      include: this.includeOrderRelations(),
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    return order;
  }

  async listOrders(filters: DeliveryOrderFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.deliveryStatus = filters.status;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.cashSessionId) {
      where.cashSessionId = filters.cashSessionId;
    }

    if (filters.startDate || filters.endDate) {
      where.orderedAt = {};
      if (filters.startDate) {
        where.orderedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.orderedAt.lte = filters.endDate;
      }
    }

    const [orders, total] = await Promise.all([
      this.prismaClient.deliveryOrder.findMany({
        where,
        include: this.includeOrderRelations(),
        orderBy: { orderedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.deliveryOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, data: UpdateDeliveryStatusDTO) {
    const order = await this.prismaClient.deliveryOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    // Validar transições de status
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      received: ['preparing', 'cancelled'],
      preparing: ['out_for_delivery', 'cancelled'],
      out_for_delivery: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    const allowedStatuses = validTransitions[order.deliveryStatus];
    if (!allowedStatuses.includes(data.status)) {
      throw new AppError(
        `Transição de status inválida: ${order.deliveryStatus} → ${data.status}`,
        400
      );
    }

    // Preparar dados de atualização
    const updateData: any = {
      deliveryStatus: data.status,
    };

    if (data.deliveryPerson) {
      updateData.deliveryPerson = data.deliveryPerson;
    }

    if (data.internalNotes) {
      updateData.internalNotes = data.internalNotes;
    }

    // Atualizar timestamps conforme status
    const now = new Date();
    switch (data.status) {
      case 'preparing':
        updateData.preparingAt = now;
        break;
      case 'out_for_delivery':
        updateData.outForDeliveryAt = now;
        break;
      case 'delivered':
        updateData.deliveredAt = now;
        break;
    }

    const updated = await this.prismaClient.deliveryOrder.update({
      where: { id },
      data: updateData,
      include: this.includeOrderRelations(),
    });

    return updated;
  }

  async getCustomerOrders(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prismaClient.deliveryOrder.findMany({
        where: { customerId },
        include: this.includeOrderRelations(),
        orderBy: { orderedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.deliveryOrder.count({ where: { customerId } }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Delivery Fees Management

  async listFees(isActive?: boolean, feeType?: 'neighborhood' | 'distance') {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (feeType) {
      where.feeType = feeType;
    }

    const fees = await this.prismaClient.deliveryFee.findMany({
      where,
      orderBy: [{ city: 'asc' }, { neighborhood: 'asc' }],
    });

    return fees;
  }

  async getFeeById(id: string) {
    const fee = await this.prismaClient.deliveryFee.findUnique({
      where: { id },
    });

    if (!fee) {
      throw new AppError('Taxa de entrega não encontrada', 404);
    }

    return fee;
  }

  async createFee(data: CreateDeliveryFeeDTO) {
    const feeType = data.feeType ?? 'neighborhood';

    if (feeType === 'neighborhood') {
      if (!data.neighborhood || !data.city) {
        throw new AppError('Bairro e cidade são obrigatórios para taxa por bairro', 400);
      }
    }

    // Verificar se já existe taxa ativa para a mesma combinação
    const existingWhere: any = { isActive: true, feeType };
    if (feeType === 'distance' && !data.neighborhood && !data.city) {
      existingWhere.neighborhood = null;
      existingWhere.city = null;
    } else {
      existingWhere.neighborhood = data.neighborhood ?? null;
      existingWhere.city = data.city ?? null;
    }

    const existing = await this.prismaClient.deliveryFee.findFirst({ where: existingWhere });

    if (existing) {
      const location = existingWhere.neighborhood || existingWhere.city
        ? `${existingWhere.neighborhood ?? ''}, ${existingWhere.city ?? ''}`.replace(/^,\s*|,\s*$/g, '')
        : 'taxa padrão';
      throw new AppError(`Já existe uma taxa ativa para ${location}`, 400);
    }

    const fee = await this.prismaClient.deliveryFee.create({
      data: {
        feeType,
        neighborhood: data.neighborhood ?? null,
        city: data.city ?? null,
        fee: data.fee,
        minOrderValue: data.minOrderValue ?? 0,
        freeDeliveryAbove: data.freeDeliveryAbove ?? null,
        maxDistance: data.maxDistance ?? null,
        feePerKm: data.feePerKm ?? null,
        baseFee: data.baseFee ?? null,
        isActive: data.isActive ?? true,
      },
    });

    return fee;
  }

  async updateFee(id: string, data: UpdateDeliveryFeeDTO) {
    const fee = await this.prismaClient.deliveryFee.findUnique({
      where: { id },
    });

    if (!fee) {
      throw new AppError('Taxa de entrega não encontrada', 404);
    }

    const updated = await this.prismaClient.deliveryFee.update({
      where: { id },
      data: {
        feeType: data.feeType,
        neighborhood: data.neighborhood,
        city: data.city,
        fee: data.fee,
        minOrderValue: data.minOrderValue,
        freeDeliveryAbove: data.freeDeliveryAbove,
        maxDistance: data.maxDistance,
        feePerKm: data.feePerKm,
        baseFee: data.baseFee,
        isActive: data.isActive,
      },
    });

    return updated;
  }

  async deleteFee(id: string) {
    const fee = await this.prismaClient.deliveryFee.findUnique({
      where: { id },
    });

    if (!fee) {
      throw new AppError('Taxa de entrega não encontrada', 404);
    }

    // Soft delete
    await this.prismaClient.deliveryFee.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async calculateDeliveryFee(
    neighborhood: string,
    city: string,
    subtotal: number
  ): Promise<number> {
    const fee = await this.prismaClient.deliveryFee.findFirst({
      where: {
        neighborhood,
        city,
        isActive: true,
      },
    });

    if (!fee) {
      return 0; // Sem taxa configurada
    }

    // Verificar valor mínimo
    if (subtotal < Number(fee.minOrderValue)) {
      throw new AppError(
        `Valor mínimo para entrega em ${neighborhood}: R$ ${Number(fee.minOrderValue).toFixed(2)}`,
        400
      );
    }

    // Entrega grátis acima de um valor
    if (fee.freeDeliveryAbove && subtotal >= Number(fee.freeDeliveryAbove)) {
      return 0;
    }

    return Number(fee.fee);
  }
}
