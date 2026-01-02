import { PrismaClient, CouponType, CouponStatus } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/app-error';

export class CouponService {
  constructor(private prismaClient: PrismaClient) {}

  /**
   * Criar novo cupom
   */
  async createCoupon(data: {
    code: string;
    description?: string;
    couponType: CouponType;
    discountValue: number;
    minPurchaseValue?: number;
    maxDiscount?: number;
    usageLimit?: number;
    validFrom: Date;
    validTo?: Date;
    createdById: string;
  }) {
    // Validar código único
    const existingCoupon = await this.prismaClient.coupon.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existingCoupon) {
      throw new ConflictError('Código de cupom já existe');
    }

    // Validar valores
    if (data.couponType === 'percentage' && data.discountValue > 100) {
      throw new ValidationError('Desconto percentual não pode ser maior que 100%');
    }

    if (data.discountValue <= 0) {
      throw new ValidationError('Valor do desconto deve ser maior que zero');
    }

    if (data.validTo && data.validFrom >= data.validTo) {
      throw new ValidationError('Data de início deve ser anterior à data de término');
    }

    // Criar cupom
    const coupon = await this.prismaClient.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        couponType: data.couponType,
        discountValue: data.discountValue,
        minPurchaseValue: data.minPurchaseValue || 0,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
        validFrom: data.validFrom,
        validTo: data.validTo,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return coupon;
  }

  /**
   * Listar todos os cupons
   */
  async listCoupons(filters: {
    status?: CouponStatus;
    couponType?: CouponType;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.couponType) {
      where.couponType = filters.couponType;
    }

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search.toUpperCase() } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [coupons, total] = await Promise.all([
      this.prismaClient.coupon.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          _count: {
            select: { usages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.coupon.count({ where }),
    ]);

    return {
      data: coupons,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Buscar cupom por ID
   */
  async getCouponById(id: string) {
    const coupon = await this.prismaClient.coupon.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        usages: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                cpf: true,
              },
            },
          },
          orderBy: { usedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundError('Cupom não encontrado');
    }

    return coupon;
  }

  /**
   * Validar cupom por código
   */
  async validateCoupon(code: string, subtotal: number, customerId: string) {
    const coupon = await this.prismaClient.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new NotFoundError('Cupom não encontrado');
    }

    // Verificar status
    if (coupon.status !== 'active') {
      throw new ValidationError('Cupom inativo');
    }

    // Verificar datas
    const now = new Date();
    if (now < coupon.validFrom) {
      throw new ValidationError('Cupom ainda não está válido');
    }

    if (coupon.validTo && now > coupon.validTo) {
      throw new ValidationError('Cupom expirado');
    }

    // Verificar valor mínimo de compra
    if (subtotal < Number(coupon.minPurchaseValue)) {
      throw new ValidationError(
        `Valor mínimo de compra é R$ ${Number(coupon.minPurchaseValue).toFixed(2)}`
      );
    }

    // Verificar limite de uso
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new ValidationError('Cupom atingiu limite de uso');
    }

    // Calcular desconto
    let discountAmount = 0;
    if (coupon.couponType === 'percentage') {
      discountAmount = subtotal * (Number(coupon.discountValue) / 100);
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    // Aplicar desconto máximo se houver
    if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
      discountAmount = Number(coupon.maxDiscount);
    }

    // Desconto não pode ser maior que o subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    return {
      coupon,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      valid: true,
    };
  }

  /**
   * Aplicar cupom (registrar uso)
   */
  async applyCoupon(data: {
    couponId: string;
    customerId: string;
    discountApplied: number;
    saleId?: string;
    comandaId?: string;
    deliveryOrderId?: string;
  }) {
    const coupon = await this.prismaClient.coupon.findUnique({
      where: { id: data.couponId },
    });

    if (!coupon) {
      throw new NotFoundError('Cupom não encontrado');
    }

    // Registrar uso e incrementar contador em transação
    const [usage] = await this.prismaClient.$transaction([
      this.prismaClient.couponUsage.create({
        data: {
          couponId: data.couponId,
          customerId: data.customerId,
          saleId: data.saleId,
          comandaId: data.comandaId,
          deliveryOrderId: data.deliveryOrderId,
          discountApplied: data.discountApplied,
        },
        include: {
          coupon: true,
          customer: {
            select: {
              id: true,
              name: true,
              cpf: true,
            },
          },
        },
      }),
      this.prismaClient.coupon.update({
        where: { id: data.couponId },
        data: {
          usageCount: { increment: 1 },
        },
      }),
    ]);

    return usage;
  }

  /**
   * Atualizar cupom
   */
  async updateCoupon(
    id: string,
    data: {
      description?: string;
      minPurchaseValue?: number;
      maxDiscount?: number;
      usageLimit?: number;
      validTo?: Date;
      status?: CouponStatus;
    }
  ) {
    const existingCoupon = await this.prismaClient.coupon.findUnique({
      where: { id },
    });

    if (!existingCoupon) {
      throw new NotFoundError('Cupom não encontrado');
    }

    // Não permitir alterar cupons já expirados
    if (existingCoupon.status === 'expired') {
      throw new ValidationError('Não é possível editar cupom expirado');
    }

    const coupon = await this.prismaClient.coupon.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: { usages: true },
        },
      },
    });

    return coupon;
  }

  /**
   * Desativar cupom
   */
  async deactivateCoupon(id: string) {
    const coupon = await this.prismaClient.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundError('Cupom não encontrado');
    }

    await this.prismaClient.coupon.update({
      where: { id },
      data: { status: 'inactive' },
    });

    return { message: 'Cupom desativado com sucesso' };
  }

  /**
   * Reativar cupom
   */
  async activateCoupon(id: string) {
    const coupon = await this.prismaClient.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundError('Cupom não encontrado');
    }

    if (coupon.status === 'expired') {
      throw new ValidationError('Não é possível reativar cupom expirado');
    }

    await this.prismaClient.coupon.update({
      where: { id },
      data: { status: 'active' },
    });

    return { message: 'Cupom ativado com sucesso' };
  }

  /**
   * Deletar cupom (somente se não tiver uso)
   */
  async deleteCoupon(id: string) {
    const coupon = await this.prismaClient.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundError('Cupom não encontrado');
    }

    if (coupon._count.usages > 0) {
      throw new ValidationError('Não é possível deletar cupom que já foi usado');
    }

    await this.prismaClient.coupon.delete({
      where: { id },
    });

    return { message: 'Cupom deletado com sucesso' };
  }

  /**
   * Relatório de uso de cupons
   */
  async getCouponUsageReport(filters: {
    couponId?: string;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.couponId) {
      where.couponId = filters.couponId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.startDate || filters.endDate) {
      where.usedAt = {};
      if (filters.startDate) {
        where.usedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.usedAt.lte = filters.endDate;
      }
    }

    const [usages, total, summary] = await Promise.all([
      this.prismaClient.couponUsage.findMany({
        where,
        include: {
          coupon: {
            select: {
              id: true,
              code: true,
              couponType: true,
              discountValue: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              cpf: true,
              phone: true,
            },
          },
        },
        orderBy: { usedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.couponUsage.count({ where }),
      this.prismaClient.couponUsage.aggregate({
        where,
        _sum: {
          discountApplied: true,
        },
        _count: true,
      }),
    ]);

    return {
      data: usages,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalUsages: summary._count,
        totalDiscountGiven: summary._sum.discountApplied
          ? parseFloat(Number(summary._sum.discountApplied).toFixed(2))
          : 0,
      },
    };
  }

  /**
   * Estatísticas de cupons
   */
  async getCouponStatistics() {
    const [activeCoupons, expiredCoupons, inactiveCoupons, totalUsages, topCoupons] =
      await Promise.all([
        this.prismaClient.coupon.count({ where: { status: 'active' } }),
        this.prismaClient.coupon.count({ where: { status: 'expired' } }),
        this.prismaClient.coupon.count({ where: { status: 'inactive' } }),
        this.prismaClient.couponUsage.aggregate({
          _sum: { discountApplied: true },
          _count: true,
        }),
        this.prismaClient.coupon.findMany({
          select: {
            id: true,
            code: true,
            description: true,
            couponType: true,
            discountValue: true,
            usageCount: true,
            usageLimit: true,
            status: true,
          },
          orderBy: { usageCount: 'desc' },
          take: 10,
        }),
      ]);

    return {
      totalActive: activeCoupons,
      totalExpired: expiredCoupons,
      totalInactive: inactiveCoupons,
      totalUsages: totalUsages._count,
      totalDiscountGiven: totalUsages._sum.discountApplied
        ? parseFloat(Number(totalUsages._sum.discountApplied).toFixed(2))
        : 0,
      topCoupons,
    };
  }

  /**
   * Expirar cupons vencidos (job automático)
   */
  async expireOldCoupons() {
    const now = new Date();

    const result = await this.prismaClient.coupon.updateMany({
      where: {
        status: 'active',
        validTo: {
          lt: now,
        },
      },
      data: {
        status: 'expired',
      },
    });

    return {
      message: `${result.count} cupons expirados`,
      count: result.count,
    };
  }
}
