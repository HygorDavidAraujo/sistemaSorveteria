import { Router } from 'express';
import { LoyaltyController } from '../controllers/loyalty.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  updateLoyaltyConfigSchema,
  calculatePointsSchema,
  addPointsSchema,
  redeemPointsSchema,
  adjustPointsSchema,
  createRewardSchema,
  updateRewardSchema,
  redeemRewardSchema,
  statementFiltersSchema,
  rewardsFiltersSchema,
} from '../../validators/loyalty.validator';
import { asyncHandler } from '../../../shared/utils/async-handler';

const router = Router();
const loyaltyController = new LoyaltyController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ==================== CONFIGURAÇÃO ====================
// Obter configuração (todos os usuários autenticados)
router.get('/config', asyncHandler(loyaltyController.getConfig.bind(loyaltyController)));

// Atualizar configuração (admin/manager)
router.patch(
  '/config',
  authorize(['admin', 'manager']),
  validate(updateLoyaltyConfigSchema),
  asyncHandler(loyaltyController.updateConfig.bind(loyaltyController))
);

// ==================== PONTOS ====================
// Calcular pontos (todos os usuários autenticados)
router.post(
  '/calculate',
  validate(calculatePointsSchema),
  asyncHandler(loyaltyController.calculatePoints.bind(loyaltyController))
);

// Adicionar pontos (todos os usuários autenticados)
router.post(
  '/points',
  validate(addPointsSchema),
  asyncHandler(loyaltyController.addPoints.bind(loyaltyController))
);

// Resgatar pontos (todos os usuários autenticados)
router.post(
  '/points/redeem',
  validate(redeemPointsSchema),
  asyncHandler(loyaltyController.redeemPoints.bind(loyaltyController))
);

// Ajustar pontos manualmente (admin/manager)
router.post(
  '/points/adjust',
  authorize(['admin', 'manager']),
  validate(adjustPointsSchema),
  asyncHandler(loyaltyController.adjustPoints.bind(loyaltyController))
);

// Expirar pontos antigos (admin/manager)
router.post(
  '/points/expire',
  authorize(['admin', 'manager']),
  asyncHandler(loyaltyController.expireOldPoints.bind(loyaltyController))
);

// ==================== EXTRATO ====================
// Extrato do cliente (todos os usuários autenticados)
router.get(
  '/customers/:customerId/statement',
  asyncHandler(loyaltyController.getCustomerStatement.bind(loyaltyController))
);

// ==================== PRÊMIOS ====================
// Listar prêmios (todos os usuários autenticados)
router.get('/rewards', asyncHandler(loyaltyController.listRewards.bind(loyaltyController)));

// Obter prêmio por ID (todos os usuários autenticados)
router.get('/rewards/:rewardId', asyncHandler(loyaltyController.getRewardById.bind(loyaltyController)));

// Criar prêmio (admin/manager)
router.post(
  '/rewards',
  authorize(['admin', 'manager']),
  validate(createRewardSchema),
  asyncHandler(loyaltyController.createReward.bind(loyaltyController))
);

// Atualizar prêmio (admin/manager)
router.patch(
  '/rewards/:rewardId',
  authorize(['admin', 'manager']),
  validate(updateRewardSchema),
  asyncHandler(loyaltyController.updateReward.bind(loyaltyController))
);

// Excluir prêmio (admin/manager)
router.delete(
  '/rewards/:rewardId',
  authorize(['admin', 'manager']),
  asyncHandler(loyaltyController.deleteReward.bind(loyaltyController))
);

// Resgatar prêmio (todos os usuários autenticados)
router.post(
  '/rewards/:rewardId/redeem',
  validate(redeemRewardSchema),
  asyncHandler(loyaltyController.redeemReward.bind(loyaltyController))
);

// ==================== ESTATÍSTICAS ====================
// Estatísticas (admin/manager)
router.get(
  '/statistics',
  authorize(['admin', 'manager']),
  asyncHandler(loyaltyController.getStatistics.bind(loyaltyController))
);

export default router;
