import { Router } from 'express';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { validate } from '@presentation/http/middlewares/validate';
import {
  productRankingReportSchema,
  productABCCurveReportSchema,
  productTimeSeriesReportSchema,
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

export default router;
