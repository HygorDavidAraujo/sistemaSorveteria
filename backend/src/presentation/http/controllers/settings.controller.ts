import { Request, Response, NextFunction } from 'express';
import { CompanyInfoService } from '@application/use-cases/settings/company-info.service';
import { ScaleConfigService } from '@application/use-cases/settings/scale-config.service';
import { PrinterConfigService } from '@application/use-cases/settings/printer-config.service';

const companyInfoService = new CompanyInfoService();
const scaleConfigService = new ScaleConfigService();
const printerConfigService = new PrinterConfigService();

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

  // Scale Config
  async getScaleConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await scaleConfigService.getConfig();
      res.json({
        status: 'success',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  async upsertScaleConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await scaleConfigService.upsertConfig(req.body);
      res.json({
        status: 'success',
        data: config,
        message: 'Configurações da balança atualizadas com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  // Printer Config
  async getPrinterConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await printerConfigService.getConfig();
      res.json({
        status: 'success',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  async upsertPrinterConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await printerConfigService.upsertConfig(req.body);
      res.json({
        status: 'success',
        data: config,
        message: 'Configurações de impressão atualizadas com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}
