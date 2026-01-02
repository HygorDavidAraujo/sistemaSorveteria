import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@shared/errors/app-error';

type UserRole = 'admin' | 'manager' | 'cashier';

export const authorize = (...allowedRolesInput: (UserRole | UserRole[])[]) => {
  const allowedRoles = allowedRolesInput.flat() as UserRole[];
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('Usuário não autenticado'));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(
        new ForbiddenError('Você não tem permissão para acessar este recurso')
      );
    }

    next();
  };
};
