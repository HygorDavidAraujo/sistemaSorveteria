import { Request, Response, NextFunction } from 'express';
import { SaleService } from '@application/use-cases/sales/sale.service';
import { TransactionType, SaleStatus } from '@prisma/client';

export class SaleController {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  createSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const sale = await this.saleService.createSale({
        ...req.body,
        createdById: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Venda criada com sucesso',
        data: sale,
      });
    } catch (error) {
      next(error);
    }
  };

  getSaleById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const sale = await this.saleService.getSaleById(id);

      res.json({
        success: true,
        data: sale,
      });
    } catch (error) {
      next(error);
    }
  };

  listSales = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        startDate,
        endDate,
        cashSessionId,
        customerId,
        saleType,
        status,
        page,
        limit,
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        cashSessionId: cashSessionId as string,
        customerId: customerId as string,
        saleType: saleType as TransactionType,
        status: status as SaleStatus,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const result = await this.saleService.listSales(filters);

      res.json({
        success: true,
        data: result.sales,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user.userId;

      const sale = await this.saleService.cancelSale(id, reason, userId);

      res.json({
        success: true,
        message: 'Venda cancelada com sucesso',
        data: sale,
      });
    } catch (error) {
      next(error);
    }
  };

  reopenSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user.userId;

      const sale = await this.saleService.reopenSale(id, reason, userId);

      res.json({
        success: true,
        message: 'Venda reaberta com sucesso',
        data: sale,
      });
    } catch (error) {
      next(error);
    }
  };
}
