import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  createCoupon,
  listCoupons,
  getCouponById,
  validateCoupon,
  applyCoupon,
  updateCoupon,
  deactivateCoupon,
  activateCoupon,
  deleteCoupon,
  getCouponUsageReport,
  getCouponStatistics,
  expireOldCoupons,
} from '../controllers/coupon.controller';
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  applyCouponSchema,
  getCouponByIdSchema,
  listCouponsSchema,
  getCouponUsageReportSchema,
} from '../../validators/coupon.validator';

const router = Router();

/**
 * POST /api/v1/coupons/validate
 * Validar cupom (PÚBLICA - sem autenticação requerida)
 */
router.post('/validate', validate(validateCouponSchema), validateCoupon);

/**
 * POST /api/v1/coupons/apply
 * Aplicar cupom (PÚBLICA - sem autenticação requerida)
 */
router.post('/apply', validate(applyCouponSchema), applyCoupon);

/**
 * Todas as demais rotas requerem autenticação
 */
router.use(authenticate);

/**
 * POST /api/v1/coupons
 * Criar novo cupom (apenas admin e gerente)
 */
router.post(
  '/',
  authorize(['admin', 'manager']),
  validate(createCouponSchema),
  createCoupon
);

/**
 * GET /api/v1/coupons
 * Listar cupons (todos autenticados)
 */
router.get('/', validate(listCouponsSchema), listCoupons);

/**
 * GET /api/v1/coupons/statistics
 * Estatísticas de cupons (admin e gerente)
 */
router.get('/statistics', authorize(['admin', 'manager']), getCouponStatistics);

/**
 * GET /api/v1/coupons/usage-report
 * Relatório de uso de cupons (admin e gerente)
 */
router.get(
  '/usage-report',
  authorize(['admin', 'manager']),
  validate(getCouponUsageReportSchema),
  getCouponUsageReport
);

/**
 * GET /api/v1/coupons/:id
 * Buscar cupom por ID (todos autenticados)
 */
router.get('/:id', validate(getCouponByIdSchema), getCouponById);

/**
 * PUT /api/v1/coupons/:id
 * Atualizar cupom (admin e gerente)
 */
router.put(
  '/:id',
  authorize(['admin', 'manager']),
  validate(updateCouponSchema),
  updateCoupon
);

/**
 * POST /api/v1/coupons/:id/deactivate
 * Desativar cupom (admin e gerente)
 */
router.post(
  '/:id/deactivate',
  authorize(['admin', 'manager']),
  validate(getCouponByIdSchema),
  deactivateCoupon
);

/**
 * POST /api/v1/coupons/:id/activate
 * Reativar cupom (admin e gerente)
 */
router.post(
  '/:id/activate',
  authorize(['admin', 'manager']),
  validate(getCouponByIdSchema),
  activateCoupon
);

/**
 * DELETE /api/v1/coupons/:id
 * Deletar cupom (apenas admin)
 */
router.delete(
  '/:id',
  authorize(['admin']),
  validate(getCouponByIdSchema),
  deleteCoupon
);

export default router;
