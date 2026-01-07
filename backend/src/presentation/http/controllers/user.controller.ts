import { Request, Response, NextFunction } from 'express';
import { UserService } from '@application/use-cases/users/user.service';

const userService = new UserService();

export class UserController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.list();
      res.json({
        status: 'success',
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getById(id);
      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const createdById = (req as any).user.userId;
      const user = await userService.create(req.body, createdById);
      res.status(201).json({
        status: 'success',
        data: user,
        message: 'Usuário criado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.update(id, req.body);
      res.json({
        status: 'success',
        data: user,
        message: 'Usuário atualizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.toggleActive(id);
      res.json({
        status: 'success',
        data: user,
        message: `Usuário ${user.isActive ? 'ativado' : 'desativado'} com sucesso`,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await userService.delete(id);
      res.json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
