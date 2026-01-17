import { Router } from 'express';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { validate } from '@presentation/http/middlewares/validate';
import {
  productRankingReportSchema,
  productABCCurveReportSchema,
  productTimeSeriesReportSchema,
  birthdayCustomersReportSchema,
  salesByModuleReportSchema,
  salesByPaymentMethodReportSchema,
  cardFeesByPaymentMethodReportSchema,
  exportReportSchema,
} from '@presentation/validators/reports.validator';
import { ReportsController } from '@presentation/http/controllers/reports.controller';

const router = Router();
const controller = new ReportsController();

router.use(authenticate);

/**
 * PRODUCT REPORTS
 */
router.get('/products/ranking', validate(productRankingReportSchema), controller.getProductRanking);
router.get('/products/abc', validate(productABCCurveReportSchema), controller.getProductABCCurve);
router.get('/products/timeseries', validate(productTimeSeriesReportSchema), controller.getProductTimeSeries);

/**
 * CUSTOMER REPORTS
 */
router.get('/customers/birthdays', validate(birthdayCustomersReportSchema), controller.getBirthdayCustomers);

/**
 * SALES REPORTS
 */
router.get('/sales/modules', validate(salesByModuleReportSchema), controller.getSalesByModule);
router.get('/sales/payment-methods', validate(salesByPaymentMethodReportSchema), controller.getSalesByPaymentMethod);
router.get('/fees/card', validate(cardFeesByPaymentMethodReportSchema), controller.getCardFeesByPaymentMethod);

/**
 * Export reports (PDF/Excel)
 */
router.get('/export', validate(exportReportSchema), controller.exportReport);

export default router;
