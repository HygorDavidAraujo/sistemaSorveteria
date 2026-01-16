import { Router } from 'express';
import { SettingsController } from '@presentation/http/controllers/settings.controller';
import { validate } from '@presentation/http/middlewares/validate';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { settingsValidators } from '@presentation/validators/settings.validator';

const router = Router();
const settingsController = new SettingsController();

/**
 * Company Info Routes
 */

/**
 * GET /settings/company-info
 * Obter informações da empresa
 * Acesso: público
 */
router.get(
  '/company-info',
  settingsController.getCompanyInfo.bind(settingsController)
);

/**
 * POST /settings/company-info
 * Criar ou atualizar informações da empresa
 * Acesso: admin
 */
router.post(
  '/company-info',
  authenticate,
  authorize('admin'),
  validate(settingsValidators.createOrUpdateCompanyInfo),
  settingsController.createOrUpdateCompanyInfo.bind(settingsController)
);

/**
 * GET /settings/scale
 * Obter configurações da balança
 * Acesso: admin
 */
router.get(
  '/scale',
  authenticate,
  authorize('admin'),
  settingsController.getScaleConfig.bind(settingsController)
);

/**
 * PUT /settings/scale
 * Atualizar configurações da balança
 * Acesso: admin
 */
router.put(
  '/scale',
  authenticate,
  authorize('admin'),
  validate(settingsValidators.upsertScaleConfig),
  settingsController.upsertScaleConfig.bind(settingsController)
);

/**
 * GET /settings/printer
 * Obter configurações de impressão
 * Acesso: público
 */
router.get(
  '/printer',
  settingsController.getPrinterConfig.bind(settingsController)
);

/**
 * PUT /settings/printer
 * Atualizar configurações de impressão
 * Acesso: admin
 */
router.put(
  '/printer',
  authenticate,
  authorize('admin'),
  validate(settingsValidators.upsertPrinterConfig),
  settingsController.upsertPrinterConfig.bind(settingsController)
);

export default router;
