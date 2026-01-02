import { Router } from 'express';
import { CashbackController } from '../controllers/cashback.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  updateCashbackConfigSchema,
  calculateCashbackSchema,
  addCashbackSchema,
  useCashbackSchema,
  adjustCashbackSchema,
  transferCashbackSchema,
  statementFiltersSchema,
} from '../../validators/cashback.validator';
import { asyncHandler } from '../../../shared/utils/async-handler';

const router = Router();
const cashbackController = new CashbackController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ==================== CONFIGURAÇÃO ====================
// Obter configuração (todos os usuários autenticados)
router.get('/config', asyncHandler(cashbackController.getConfig.bind(cashbackController)));

// Atualizar configuração (admin/manager)
router.patch(
  '/config',
  authorize(['admin', 'manager']),
  validate(updateCashbackConfigSchema),
  asyncHandler(cashbackController.updateConfig.bind(cashbackController))
);

// ==================== CASHBACK ====================
// Calcular cashback (todos os usuários autenticados)
router.post(
  '/calculate',
  validate(calculateCashbackSchema),
  asyncHandler(cashbackController.calculateCashback.bind(cashbackController))
);

// Adicionar cashback (todos os usuários autenticados)
router.post(
  '/add',
  validate(addCashbackSchema),
  asyncHandler(cashbackController.addCashback.bind(cashbackController))
);

// Usar cashback (todos os usuários autenticados)
router.post(
  '/use',
  validate(useCashbackSchema),
  asyncHandler(cashbackController.useCashback.bind(cashbackController))
);

// Ajustar cashback manualmente (admin/manager)
router.post(
  '/adjust',
  authorize(['admin', 'manager']),
  validate(adjustCashbackSchema),
  asyncHandler(cashbackController.adjustCashback.bind(cashbackController))
);

// Transferir cashback entre clientes (admin/manager)
router.post(
  '/transfer',
  authorize(['admin', 'manager']),
  validate(transferCashbackSchema),
  asyncHandler(cashbackController.transferCashback.bind(cashbackController))
);

// Expirar cashback antigo (admin/manager)
router.post(
  '/expire',
  authorize(['admin', 'manager']),
  asyncHandler(cashbackController.expireOldCashback.bind(cashbackController))
);

// ==================== EXTRATO ====================
// Extrato do cliente (todos os usuários autenticados)
router.get(
  '/customers/:customerId/statement',
  asyncHandler(cashbackController.getCustomerStatement.bind(cashbackController))
);

// ==================== ESTATÍSTICAS ====================
// Estatísticas (admin/manager)
router.get(
  '/statistics',
  authorize(['admin', 'manager']),
  asyncHandler(cashbackController.getStatistics.bind(cashbackController))
);

export default router;
