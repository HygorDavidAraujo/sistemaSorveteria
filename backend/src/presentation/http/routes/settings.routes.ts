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

export default router;
