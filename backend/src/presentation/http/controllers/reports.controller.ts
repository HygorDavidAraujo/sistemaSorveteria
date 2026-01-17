import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/async-handler';
import { ProductReportsService, ProductRankingMetric, ProductReportGranularity } from '@application/use-cases/reports/product-reports.service';
import { GeneralReportsService } from '@application/use-cases/reports/general-reports.service';
import { ReportExportService } from '@application/services/report-export.service';

export class ReportsController {
  private productReportsService: ProductReportsService;
  private generalReportsService: GeneralReportsService;
  private reportExportService: ReportExportService;

  constructor() {
    this.productReportsService = new ProductReportsService();
    this.generalReportsService = new GeneralReportsService();
    this.reportExportService = new ReportExportService();
  }

  private parseDateInput(value: string, endOfDay: boolean): Date {
    // Se vier no formato YYYY-MM-DD, interpretar como data local (dia inteiro)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map((n) => parseInt(n, 10));
      return new Date(
        y,
        m - 1,
        d,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
      );
    }

    return new Date(value);
  }

  getProductRanking = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, metric, limit } = req.query;

    const data = await this.productReportsService.getProductRanking({
      startDate: this.parseDateInput(startDate as string, false),
      endDate: this.parseDateInput(endDate as string, true),
      metric: metric as ProductRankingMetric,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({
      success: true,
      data,
    });
  });

  getProductABCCurve = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const data = await this.productReportsService.getProductABCCurve({
      startDate: this.parseDateInput(startDate as string, false),
      endDate: this.parseDateInput(endDate as string, true),
    });

    res.json({
      success: true,
      data,
    });
  });

  getProductTimeSeries = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, granularity } = req.query;

    const data = await this.productReportsService.getProductTimeSeries({
      startDate: this.parseDateInput(startDate as string, false),
      endDate: this.parseDateInput(endDate as string, true),
      granularity: granularity as ProductReportGranularity,
    });

    res.json({
      success: true,
      data,
    });
  });

  getBirthdayCustomers = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const data = await this.generalReportsService.getBirthdayCustomers({
      startDate: this.parseDateInput(startDate as string, false),
      endDate: this.parseDateInput(endDate as string, true),
    });

    res.json({
      success: true,
      data,
    });
  });

  getSalesByModule = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const data = await this.generalReportsService.getSalesByModule({
      startDate: this.parseDateInput(startDate as string, false),
      endDate: this.parseDateInput(endDate as string, true),
    });

    res.json({
      success: true,
      data,
    });
  });

  getSalesByPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const data = await this.generalReportsService.getSalesByPaymentMethod({
      startDate: this.parseDateInput(startDate as string, false),
      endDate: this.parseDateInput(endDate as string, true),
    });

    res.json({
      success: true,
      data,
    });
  });

  getCardFeesByPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const data = await this.generalReportsService.getCardFeesByPaymentMethod({
      startDate: this.parseDateInput(startDate as string, false),
      endDate: this.parseDateInput(endDate as string, true),
    });

    res.json({
      success: true,
      data,
    });
  });

  exportReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, type, format, metric, limit, granularity } = req.query as Record<string, string>;

    const start = this.parseDateInput(startDate, false);
    const end = this.parseDateInput(endDate, true);

    let data: any;
    switch (type) {
      case 'products-ranking':
        data = await this.productReportsService.getProductRanking({
          startDate: start,
          endDate: end,
          metric: metric as ProductRankingMetric,
          limit: limit ? parseInt(limit, 10) : undefined,
        });
        break;
      case 'products-abc':
        data = await this.productReportsService.getProductABCCurve({ startDate: start, endDate: end });
        break;
      case 'products-timeseries':
        data = await this.productReportsService.getProductTimeSeries({
          startDate: start,
          endDate: end,
          granularity: granularity as ProductReportGranularity,
        });
        break;
      case 'customers-birthdays':
        data = await this.generalReportsService.getBirthdayCustomers({ startDate: start, endDate: end });
        break;
      case 'sales-modules':
        data = await this.generalReportsService.getSalesByModule({ startDate: start, endDate: end });
        break;
      case 'sales-payments':
        data = await this.generalReportsService.getSalesByPaymentMethod({ startDate: start, endDate: end });
        break;
      case 'card-fees':
        data = await this.generalReportsService.getCardFeesByPaymentMethod({ startDate: start, endDate: end });
        break;
      default:
        data = null;
    }

    const reportTitle = `Relatório ${type}`;
    const fileDate = new Date().toISOString().slice(0, 10);
    const fileName = `relatorio-${type}-${fileDate}.${format}`;

    const buffer =
      format === 'pdf'
        ? await this.reportExportService.buildPdf(reportTitle, data)
        : await this.reportExportService.buildExcel(reportTitle, data);

    res.setHeader('Content-Type',
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  });
}
