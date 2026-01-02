import { Router } from 'express';
import { AuthController } from '@presentation/http/controllers/auth.controller';
import { validate } from '@presentation/http/middlewares/validate';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { auditLog } from '@presentation/http/middlewares/audit-log';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from '@presentation/validators/auth.validator';

const router = Router();
const authController = new AuthController();

// Public routes
router.post(
  '/login',
  validate(loginSchema),
  auditLog('user_login'),
  authController.login
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

// Protected routes
router.post(
  '/logout',
  authenticate,
  auditLog('user_logout'),
  authController.logout
);

router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

// Admin only - register new users
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  validate(registerSchema),
  auditLog('user_create'),
  authController.register
);

export default router;
