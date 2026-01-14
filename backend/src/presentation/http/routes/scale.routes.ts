import { Router, Request, Response } from 'express';
import { authenticate } from '@presentation/http/middlewares/authenticate';

const router = Router();

// Scale endpoints are protected (same auth as other operational routes)
router.use(authenticate);

/**
 * GET /scale/weight
 * Mock endpoint for reading weight from a scale.
 * Returns weight in kilograms.
 *
 * Env:
 * - SCALE_MOCK_WEIGHT_KG: fixed numeric value (e.g. 0.372)
 */
router.get('/weight', (req: Request, res: Response) => {
  const raw = (process.env.SCALE_MOCK_WEIGHT_KG || '').trim();
  const parsed = raw ? Number(raw.replace(',', '.')) : NaN;

  const weightKg = Number.isFinite(parsed) && parsed > 0 ? parsed : 0.5;

  res.json({
    weightKg,
    unit: 'kg',
    isMock: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
