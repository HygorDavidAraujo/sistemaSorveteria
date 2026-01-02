import { Router } from 'express';
import { ComandaController } from '@presentation/http/controllers/comanda.controller';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { validate } from '@presentation/http/middlewares/validate';
import { comandaValidators } from '@presentation/validators/comanda.validator';

const router = Router();
const comandaController = new ComandaController();

// Abrir comanda (cashier, manager, admin)
router.post(
  '/',
  authenticate,
  authorize('cashier', 'manager', 'admin'),
  validate(comandaValidators.openComanda),
  comandaController.openComanda
);

// Listar comandas (todos autenticados)
router.get(
  '/',
  authenticate,
  validate(comandaValidators.listComandas),
  comandaController.listComandas
);

// Obter comanda por ID (todos autenticados)
router.get(
  '/:id',
  authenticate,
  validate(comandaValidators.getComandaById),
  comandaController.getComandaById
);

// Adicionar item (cashier, manager, admin)
router.post(
  '/:id/items',
  authenticate,
  authorize('cashier', 'manager', 'admin'),
  validate(comandaValidators.addItem),
  comandaController.addItem
);

// Atualizar item (cashier, manager, admin)
router.put(
  '/:id/items/:itemId',
  authenticate,
  authorize('cashier', 'manager', 'admin'),
  validate(comandaValidators.updateItem),
  comandaController.updateItem
);

// Cancelar item (cashier, manager, admin)
router.delete(
  '/:id/items/:itemId',
  authenticate,
  authorize('cashier', 'manager', 'admin'),
  validate(comandaValidators.cancelItem),
  comandaController.cancelItem
);

// Fechar comanda (cashier, manager, admin)
router.post(
  '/:id/close',
  authenticate,
  authorize('cashier', 'manager', 'admin'),
  validate(comandaValidators.closeComanda),
  comandaController.closeComanda
);

// Reabrir comanda (apenas manager e admin)
router.post(
  '/:id/reopen',
  authenticate,
  authorize('manager', 'admin'),
  validate(comandaValidators.reopenComanda),
  comandaController.reopenComanda
);

// Cancelar comanda (apenas manager e admin)
router.post(
  '/:id/cancel',
  authenticate,
  authorize('manager', 'admin'),
  validate(comandaValidators.cancelComanda),
  comandaController.cancelComanda
);

export default router;
