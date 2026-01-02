import { Request, Response } from 'express';
import { CashbackService } from '../../../application/use-cases/cashback/cashback.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const cashbackService = new CashbackService(prisma);

export class CashbackController {
  // Configuração do programa
  async getConfig(req: Request, res: Response) {
    const config = await cashbackService.getCashbackConfig();
    res.json(config);
  }

  async updateConfig(req: Request, res: Response) {
    const config = await cashbackService.updateCashbackConfig(req.body);
    res.json({
      message: 'Configuração atualizada com sucesso',
      data: config,
    });
  }

  // Operações de cashback
  async calculateCashback(req: Request, res: Response) {
    const { subtotal, productIds, excludeProductIds } = req.body;
    const cashback = await cashbackService.calculateCashback(
      subtotal,
      productIds,
      excludeProductIds
    );
    res.json({ cashback });
  }

  async addCashback(req: Request, res: Response) {
    const userId = req.user?.id;
    const transaction = await cashbackService.addCashback({
      ...req.body,
      createdById: userId,
    });
    res.status(201).json({
      message: 'Cashback adicionado com sucesso',
      data: transaction,
    });
  }

  async useCashback(req: Request, res: Response) {
    const userId = req.user?.id;
    const transaction = await cashbackService.useCashback({
      ...req.body,
      createdById: userId,
    });
    res.json({
      message: 'Cashback utilizado com sucesso',
      data: transaction,
    });
  }

  async adjustCashback(req: Request, res: Response) {
    const userId = req.user?.id;
    const transaction = await cashbackService.adjustCashback({
      ...req.body,
      createdById: userId,
    });
    res.json({
      message: 'Cashback ajustado com sucesso',
      data: transaction,
    });
  }

  // Extrato do cliente
  async getCustomerStatement(req: Request, res: Response) {
    const { customerId } = req.params;
    const { startDate, endDate, transactionType, page, limit } = req.query;

    const statement = await cashbackService.getCustomerStatement(customerId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      transactionType: transactionType as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(statement);
  }

  // Utilitários
  async expireOldCashback(req: Request, res: Response) {
    const result = await cashbackService.expireOldCashback();
    res.json(result);
  }

  async getStatistics(req: Request, res: Response) {
    const stats = await cashbackService.getStatistics();
    res.json(stats);
  }

  async transferCashback(req: Request, res: Response) {
    const userId = req.user?.id;
    const result = await cashbackService.transferCashback({
      ...req.body,
      createdById: userId,
    });
    res.json(result);
  }
}
