import { Request, Response } from 'express';
import { LoyaltyService } from '../../../application/use-cases/loyalty/loyalty.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const loyaltyService = new LoyaltyService(prisma);

export class LoyaltyController {
  // Configuração do programa
  async getConfig(req: Request, res: Response) {
    const config = await loyaltyService.getLoyaltyConfig();
    res.json(config);
  }

  async updateConfig(req: Request, res: Response) {
    const config = await loyaltyService.updateLoyaltyConfig(req.body);
    res.json({
      message: 'Configuração atualizada com sucesso',
      data: config,
    });
  }

  // Operações de pontos
  async calculatePoints(req: Request, res: Response) {
    const { subtotal, productIds } = req.body;
    const points = await loyaltyService.calculatePoints(subtotal, productIds);
    res.json({ points });
  }

  async addPoints(req: Request, res: Response) {
    const userId = req.user?.id;
    const transaction = await loyaltyService.addPoints({
      ...req.body,
      createdById: userId,
    });
    res.status(201).json({
      message: 'Pontos adicionados com sucesso',
      data: transaction,
    });
  }

  async redeemPoints(req: Request, res: Response) {
    const userId = req.user?.id;
    const transaction = await loyaltyService.redeemPoints({
      ...req.body,
      createdById: userId,
    });
    res.json({
      message: 'Pontos resgatados com sucesso',
      data: transaction,
    });
  }

  async adjustPoints(req: Request, res: Response) {
    const userId = req.user?.id;
    const transaction = await loyaltyService.adjustPoints({
      ...req.body,
      createdById: userId,
    });
    res.json({
      message: 'Pontos ajustados com sucesso',
      data: transaction,
    });
  }

  // Extrato do cliente
  async getCustomerStatement(req: Request, res: Response) {
    const { customerId } = req.params;
    const { startDate, endDate, transactionType, page, limit } = req.query;

    const statement = await loyaltyService.getCustomerStatement(customerId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      transactionType: transactionType as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(statement);
  }

  // Prêmios
  async createReward(req: Request, res: Response) {
    const userId = req.user?.id;
    const reward = await loyaltyService.createReward({
      ...req.body,
      createdById: userId,
    });
    res.status(201).json({
      message: 'Prêmio criado com sucesso',
      data: reward,
    });
  }

  async listRewards(req: Request, res: Response) {
    const { isActive, page, limit } = req.query;

    const rewards = await loyaltyService.listRewards({
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(rewards);
  }

  // TODO: Implementar getRewardById no LoyaltyService
  // async getRewardById(req: Request, res: Response) {
  //   const { rewardId } = req.params;
  //   const reward = await loyaltyService.getRewardById(rewardId);
  //   res.json(reward);
  // }

  async redeemReward(req: Request, res: Response) {
    const { rewardId } = req.params;
    const { customerId } = req.body;
    const userId = req.user?.id;

    const result = await loyaltyService.redeemReward({
      customerId,
      rewardId,
      createdById: userId,
    });

    res.json({
      message: 'Prêmio resgatado com sucesso',
      data: result,
    });
  }

  async updateReward(req: Request, res: Response) {
    const { rewardId } = req.params;
    const reward = await loyaltyService.updateReward(rewardId, req.body);
    res.json({
      message: 'Prêmio atualizado com sucesso',
      data: reward,
    });
  }

  async deleteReward(req: Request, res: Response) {
    const { rewardId } = req.params;
    await loyaltyService.deleteReward(rewardId);
    res.json({ message: 'Prêmio excluído com sucesso' });
  }

  // Utilitários
  async expireOldPoints(req: Request, res: Response) {
    const result = await loyaltyService.expireOldPoints();
    res.json(result);
  }

  async getStatistics(req: Request, res: Response) {
    const stats = await loyaltyService.getStatistics();
    res.json(stats);
  }
}
