import { PrismaClient, DeliveryStatus } from '@prisma/client';
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
  }>;
  deliveryFee?: number;
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
  neighborhood: string;
  city: string;
  fee: number;
  minOrderValue?: number;
  freeDeliveryAbove?: number;
  isActive?: boolean;
}

export interface UpdateDeliveryFeeDTO {
  neighborhood?: string;
  city?: string;
  fee?: number;
  minOrderValue?: number;
  freeDeliveryAbove?: number;
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
    const itemsData = [];

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = Number(product.salePrice);
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      itemsData.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });
    }

    const deliveryFee = data.deliveryFee ?? 0;
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

    const total = subtotal + deliveryFee - discount - couponDiscount;

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
      // Criar pedido de delivery
      const order = await tx.deliveryOrder.create({
        data: {
          customerId: data.customerId,
          cashSessionId: data.cashSessionId,
          subtotal,
          deliveryFee,
          discount: discount + couponDiscount,
          total,
          estimatedTime: data.estimatedTime,
          customerNotes: data.customerNotes,
          internalNotes: data.internalNotes,
          createdById: data.createdById,
        },
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

      // Atualizar totais do caixa
      await tx.cashSession.update({
        where: { id: data.cashSessionId },
        data: {
          totalSales: {
            increment: total,
          },
        },
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

      return order;
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

  async listFees(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
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
    // Verificar se já existe taxa para o mesmo bairro/cidade
    const existing = await this.prismaClient.deliveryFee.findFirst({
      where: {
        neighborhood: data.neighborhood,
        city: data.city,
        isActive: true,
      },
    });

    if (existing) {
      throw new AppError(
        `Já existe uma taxa ativa para ${data.neighborhood}, ${data.city}`,
        400
      );
    }

    const fee = await this.prismaClient.deliveryFee.create({
      data: {
        neighborhood: data.neighborhood,
        city: data.city,
        fee: data.fee,
        minOrderValue: data.minOrderValue ?? 0,
        freeDeliveryAbove: data.freeDeliveryAbove,
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
        neighborhood: data.neighborhood,
        city: data.city,
        fee: data.fee,
        minOrderValue: data.minOrderValue,
        freeDeliveryAbove: data.freeDeliveryAbove,
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
