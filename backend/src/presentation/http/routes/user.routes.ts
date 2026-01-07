import { Router } from 'express';
import { UserController } from '@presentation/http/controllers/user.controller';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { validate } from '@presentation/http/middlewares/validate';
import { userValidators } from '@presentation/validators/user.validator';

const router = Router();
const userController = new UserController();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * GET /users
 * Listar todos os usuários
 * Acesso: admin
 */
router.get(
  '/',
  validate(userValidators.listUsers),
  userController.list
);

/**
 * GET /users/:id
 * Obter usuário por ID
 * Acesso: admin
 */
router.get(
  '/:id',
  validate(userValidators.getUserById),
  userController.getById
);

/**
 * POST /users
 * Criar novo usuário
 * Acesso: admin
 */
router.post(
  '/',
  validate(userValidators.createUser),
  userController.create
);

/**
 * PUT /users/:id
 * Atualizar usuário
 * Acesso: admin
 */
router.put(
  '/:id',
  validate(userValidators.updateUser),
  userController.update
);

/**
 * PATCH /users/:id/toggle-active
 * Ativar/Desativar usuário
 * Acesso: admin
 */
router.patch(
  '/:id/toggle-active',
  validate(userValidators.toggleActiveUser),
  userController.toggleActive
);

/**
 * DELETE /users/:id
 * Desativar usuário (soft delete)
 * Acesso: admin
 */
router.delete(
  '/:id',
  validate(userValidators.deleteUser),
  userController.delete
);

export default router;
