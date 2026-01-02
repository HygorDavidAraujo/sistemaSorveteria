import { Router } from 'express';
import { CashSessionController } from '@presentation/http/controllers/cash-session.controller';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { validate } from '@presentation/http/middlewares/validate';
import { cashSessionValidators } from '@presentation/validators/cash-session.validator';

const router = Router();
const controller = new CashSessionController();

router.use(authenticate);

// Abrir caixa
router.post(
  '/',
  authorize(['admin', 'manager', 'cashier']),
  validate(cashSessionValidators.open),
  controller.open.bind(controller)
);

// Caixa atual por terminal
router.get(
  '/current',
  authorize(['admin', 'manager', 'cashier']),
  validate(cashSessionValidators.current, 'query'),
  controller.getCurrent.bind(controller)
);

// Histórico
router.get(
  '/history',
  authorize(['admin', 'manager']),
  validate(cashSessionValidators.history, 'query'),
  controller.history.bind(controller)
);

// Detalhe por id
router.get(
  '/:id',
  authorize(['admin', 'manager', 'cashier']),
  validate(cashSessionValidators.idParam, 'params'),
  controller.getById.bind(controller)
);

// Fechamento do operador
router.post(
  '/:id/cashier-close',
  authorize(['admin', 'manager', 'cashier']),
  validate(cashSessionValidators.idParam, 'params'),
  validate(cashSessionValidators.cashierClose),
  controller.cashierClose.bind(controller)
);

// Validação do gerente
router.post(
  '/:id/manager-close',
  authorize(['admin', 'manager']),
  validate(cashSessionValidators.idParam, 'params'),
  validate(cashSessionValidators.managerClose),
  controller.managerClose.bind(controller)
);

// Relatório rápido
router.get(
  '/:id/report',
  authorize(['admin', 'manager']),
  validate(cashSessionValidators.idParam, 'params'),
  controller.report.bind(controller)
);

// Recalcular totalizadores
router.post(
  '/:id/recalculate',
  authorize(['admin', 'manager']),
  validate(cashSessionValidators.idParam, 'params'),
  controller.recalculateTotals.bind(controller)
);

export default router;
