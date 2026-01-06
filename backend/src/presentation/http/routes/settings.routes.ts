import { Router } from 'express';
import { SettingsController } from '@presentation/http/controllers/settings.controller';
import { validate } from '@presentation/middleware/validate.middleware';
import { authorize } from '@presentation/middleware/auth.middleware';
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
  settingsController.getCompanyInfo
);

/**
 * POST /settings/company-info
 * Criar ou atualizar informações da empresa
 * Acesso: admin
 */
router.post(
  '/company-info',
  authorize('admin'),
  validate(settingsValidators.createOrUpdateCompanyInfo),
  settingsController.createOrUpdateCompanyInfo
);

export default router;
