import { Request, Response, NextFunction } from 'express';
import { CompanyInfoService } from '@application/use-cases/settings/company-info.service';

const companyInfoService = new CompanyInfoService();

export class SettingsController {
  private serializeCompany(company: any) {
    if (!company) return company;
    const { logoData, ...rest } = company as any;
    return {
      ...rest,
      logoBase64: logoData ? Buffer.from(logoData).toString('base64') : null,
    };
  }

  // Company Info
  async getCompanyInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await companyInfoService.get();
      res.json({
        status: 'success',
        data: this.serializeCompany(company),
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
        data: this.serializeCompany(company),
        message: 'Informações da empresa atualizadas com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}
