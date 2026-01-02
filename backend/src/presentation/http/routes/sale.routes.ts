import { Router } from 'express';
import { SaleController } from '@presentation/http/controllers/sale.controller';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { validate } from '@presentation/http/middlewares/validate';
import { saleValidators } from '@presentation/validators/sale.validator';

const router = Router();
const saleController = new SaleController();

// Criar venda (cashier, manager, admin)
router.post(
  '/',
  authenticate,
  authorize('cashier', 'manager', 'admin'),
  validate(saleValidators.createSale),
  saleController.createSale
);

// Listar vendas (todos autenticados)
router.get(
  '/',
  authenticate,
  validate(saleValidators.listSales),
  saleController.listSales
);

// Obter venda por ID (todos autenticados)
router.get(
  '/:id',
  authenticate,
  validate(saleValidators.getSaleById),
  saleController.getSaleById
);

// Cancelar venda (apenas manager e admin)
router.post(
  '/:id/cancel',
  authenticate,
  authorize('manager', 'admin'),
  validate(saleValidators.cancelSale),
  saleController.cancelSale
);

// Reabrir venda (apenas manager e admin)
router.post(
  '/:id/reopen',
  authenticate,
  authorize('manager', 'admin'),
  validate(saleValidators.reopenSale),
  saleController.reopenSale
);

export default router;
