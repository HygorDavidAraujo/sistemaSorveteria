import { Router } from 'express';
import { DeliveryController } from '@presentation/http/controllers/delivery.controller';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { validate } from '@presentation/http/middlewares/validate';
import { deliveryValidators } from '@presentation/validators/delivery.validator';

const router = Router();
const deliveryController = new DeliveryController();

// Todas as rotas exigem autenticação
router.use(authenticate);

// ========================================
// DELIVERY ORDERS
// ========================================

/**
 * POST /delivery/orders
 * Criar pedido de delivery
 * Acesso: cashier, manager, admin
 */
router.post(
  '/orders',
  authorize('cashier', 'manager', 'admin'),
  validate(deliveryValidators.createOrder),
  deliveryController.createOrder
);

/**
 * GET /delivery/orders
 * Listar pedidos com filtros
 * Acesso: todos autenticados
 */
router.get(
  '/orders',
  validate(deliveryValidators.listOrders),
  deliveryController.listOrders
);

/**
 * GET /delivery/orders/:id
 * Detalhes do pedido
 * Acesso: todos autenticados
 */
router.get(
  '/orders/:id',
  validate(deliveryValidators.getOrderById),
  deliveryController.getOrderById
);

/**
 * PUT /delivery/orders/:id/status
 * Atualizar status do pedido
 * Acesso: cashier, manager, admin
 */
router.put(
  '/orders/:id/status',
  authorize('cashier', 'manager', 'admin'),
  validate(deliveryValidators.updateStatus),
  deliveryController.updateStatus
);

/**
 * GET /delivery/customer/:customerId
 * Pedidos do cliente
 * Acesso: todos autenticados
 */
router.get(
  '/customer/:customerId',
  validate(deliveryValidators.getCustomerOrders),
  deliveryController.getCustomerOrders
);

// ========================================
// DELIVERY FEES
// ========================================

/**
 * GET /delivery/fees
 * Listar taxas de entrega
 * Acesso: todos autenticados
 */
router.get(
  '/fees',
  validate(deliveryValidators.listFees),
  deliveryController.listFees
);

/**
 * GET /delivery/fees/:id
 * Detalhes da taxa
 * Acesso: todos autenticados
 */
router.get(
  '/fees/:id',
  validate(deliveryValidators.getFeeById),
  deliveryController.getFeeById
);

/**
 * POST /delivery/fees
 * Criar taxa de entrega
 * Acesso: manager, admin
 */
router.post(
  '/fees',
  authorize('manager', 'admin'),
  validate(deliveryValidators.createFee),
  deliveryController.createFee
);

/**
 * PUT /delivery/fees/:id
 * Atualizar taxa
 * Acesso: manager, admin
 */
router.put(
  '/fees/:id',
  authorize('manager', 'admin'),
  validate(deliveryValidators.updateFee),
  deliveryController.updateFee
);

/**
 * DELETE /delivery/fees/:id
 * Desativar taxa
 * Acesso: admin
 */
router.delete(
  '/fees/:id',
  authorize('admin'),
  validate(deliveryValidators.deleteFee),
  deliveryController.deleteFee
);

/**
 * POST /delivery/calculate-fee
 * Calcular taxa de entrega
 * Acesso: todos autenticados
 */
router.post(
  '/calculate-fee',
  validate(deliveryValidators.calculateFee),
  deliveryController.calculateFee
);

export default router;
