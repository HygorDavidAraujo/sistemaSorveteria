import { Request, Response, NextFunction } from 'express';
import { CashSessionService } from '@application/use-cases/cash/cash-session.service';

const cashSessionService = new CashSessionService();

export class CashSessionController {
  async open(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const session = await cashSessionService.openSession({
        terminalId: req.body.terminalId,
        initialCash: req.body.initialCash,
        openingNotes: req.body.openingNotes,
        userId,
      });

      res.status(201).json({ status: 'success', data: session });
    } catch (error) {
      next(error);
    }
  }

  async getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { terminalId } = req.query;
      const session = await cashSessionService.getCurrentSession(terminalId as string);
      res.json({ status: 'success', data: session });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const session = await cashSessionService.getById(id);
      res.json({ status: 'success', data: session });
    } catch (error) {
      next(error);
    }
  }

  async cashierClose(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const session = await cashSessionService.cashierClose(id, req.body, userId);
      res.json({ status: 'success', data: session });
    } catch (error) {
      next(error);
    }
  }

  async managerClose(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const session = await cashSessionService.managerClose(id, req.body, userId);
      res.json({ status: 'success', data: session });
    } catch (error) {
      next(error);
    }
  }

  async history(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, startDate, endDate, page, limit, terminalId } = req.query;
      const result = await cashSessionService.listHistory({
        status: status as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        terminalId: terminalId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ status: 'success', data: result.sessions, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async report(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const report = await cashSessionService.getReport(id);
      res.json({ status: 'success', data: report });
    } catch (error) {
      next(error);
    }
  }

  async recalculateTotals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const session = await cashSessionService.recalculateTotals(id);
      res.json({ status: 'success', data: session });
    } catch (error) {
      next(error);
    }
  }
}
