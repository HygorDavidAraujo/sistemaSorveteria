import { Request, Response, NextFunction } from 'express';
import { CouponService } from '../../../application/use-cases/coupons/coupon.service';
import prismaClient from '../../../infrastructure/database/prisma-client';

const couponService = new CouponService(prismaClient);

/**
 * Criar novo cupom
 */
export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, description, couponType, discountValue, minPurchaseValue, maxDiscount, usageLimit, validFrom, validTo } = req.body;
    const userId = req.user!.userId;

    const coupon = await couponService.createCoupon({
      code,
      description,
      couponType,
      discountValue,
      minPurchaseValue,
      maxDiscount,
      usageLimit,
      validFrom: new Date(validFrom),
      validTo: validTo ? new Date(validTo) : undefined,
      createdById: userId,
    });

    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

/**
 * Listar cupons
 */
export const listCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, couponType, search, page, limit } = req.query;

    const result = await couponService.listCoupons({
      status: status as any,
      couponType: couponType as any,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Buscar cupom por ID
 */
export const getCouponById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const coupon = await couponService.getCouponById(id);

    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

/**
 * Validar cupom
 */
export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, subtotal, customerId } = req.body;

    const result = await couponService.validateCoupon(code, subtotal, customerId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Aplicar cupom
 */
export const applyCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { couponId, customerId, discountApplied, saleId, comandaId, deliveryOrderId } = req.body;

    const usage = await couponService.applyCoupon({
      couponId,
      customerId,
      discountApplied,
      saleId,
      comandaId,
      deliveryOrderId,
    });

    res.status(201).json(usage);
  } catch (error) {
    next(error);
  }
};

/**
 * Atualizar cupom
 */
export const updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { description, minPurchaseValue, maxDiscount, usageLimit, validTo, status } = req.body;

    const coupon = await couponService.updateCoupon(id, {
      description,
      minPurchaseValue,
      maxDiscount,
      usageLimit,
      validTo: validTo ? new Date(validTo) : undefined,
      status,
    });

    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

/**
 * Desativar cupom
 */
export const deactivateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await couponService.deactivateCoupon(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Reativar cupom
 */
export const activateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await couponService.activateCoupon(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletar cupom
 */
export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await couponService.deleteCoupon(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Relatório de uso de cupons
 */
export const getCouponUsageReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { couponId, customerId, startDate, endDate, page, limit } = req.query;

    const result = await couponService.getCouponUsageReport({
      couponId: couponId as string,
      customerId: customerId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Estatísticas de cupons
 */
export const getCouponStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await couponService.getCouponStatistics();

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Expirar cupons vencidos (job)
 */
export const expireOldCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await couponService.expireOldCoupons();

    res.json(result);
  } catch (error) {
    next(error);
  }
};
