import { Request, Response, NextFunction } from 'express';
import { ComandaService } from '@application/use-cases/comandas/comanda.service';
import { ComandaStatus } from '@prisma/client';

export class ComandaController {
  private comandaService: ComandaService;

  constructor() {
    this.comandaService = new ComandaService();
  }

  openComanda = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const comanda = await this.comandaService.openComanda({
        ...req.body,
        openedById: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Comanda aberta com sucesso',
        data: comanda,
      });
    } catch (error) {
      next(error);
    }
  };

  getComandaById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const comanda = await this.comandaService.getComandaById(id);

      res.json({
        success: true,
        data: comanda,
      });
    } catch (error) {
      next(error);
    }
  };

  listComandas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        status,
        cashSessionId,
        customerId,
        tableNumber,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const filters = {
        status: status as ComandaStatus,
        cashSessionId: cashSessionId as string,
        customerId: customerId as string,
        tableNumber: tableNumber as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const result = await this.comandaService.listComandas(filters);

      res.json({
        success: true,
        data: result.comandas,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  addItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const item = await this.comandaService.addItem(id, {
        ...req.body,
        addedById: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Item adicionado com sucesso',
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  updateItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, itemId } = req.params;
      const item = await this.comandaService.updateItem(id, itemId, req.body);

      res.json({
        success: true,
        message: 'Item atualizado com sucesso',
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, itemId } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user.userId;

      const item = await this.comandaService.cancelItem(id, itemId, reason, userId);

      res.json({
        success: true,
        message: 'Item cancelado com sucesso',
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  closeComanda = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const comanda = await this.comandaService.closeComanda(id, {
        ...req.body,
        closedById: userId,
      });

      res.json({
        success: true,
        message: 'Comanda fechada com sucesso',
        data: comanda,
      });
    } catch (error) {
      next(error);
    }
  };

  reopenComanda = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user.userId;

      const comanda = await this.comandaService.reopenComanda(id, reason, userId);

      res.json({
        success: true,
        message: 'Comanda reaberta com sucesso',
        data: comanda,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelComanda = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user.userId;

      const comanda = await this.comandaService.cancelComanda(id, reason, userId);

      res.json({
        success: true,
        message: 'Comanda cancelada com sucesso',
        data: comanda,
      });
    } catch (error) {
      next(error);
    }
  };
}
