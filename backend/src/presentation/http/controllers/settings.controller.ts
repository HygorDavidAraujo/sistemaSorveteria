import { Request, Response, NextFunction } from 'express';
import { CompanyInfoService } from '@application/use-cases/settings/company-info.service';

const companyInfoService = new CompanyInfoService();

export class SettingsController {
  // Company Info
  async getCompanyInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await companyInfoService.get();
      res.json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  async createOrUpdateCompanyInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await companyInfoService.createOrUpdate(req.body);
      res.json({
        status: 'success',
        data: company,
        message: 'Informações da empresa atualizadas com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}
