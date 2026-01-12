import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '@presentation/http/middlewares/error-handler';
import logger from '@shared/utils/logger';

// Routes
import authRoutes from '@presentation/http/routes/auth.routes';
import userRoutes from '@presentation/http/routes/user.routes';
import customerRoutes from '@presentation/http/routes/customer.routes';
import productRoutes from '@presentation/http/routes/product.routes';
import cashSessionRoutes from '@presentation/http/routes/cash-session.routes';
import saleRoutes from '@presentation/http/routes/sale.routes';
import comandaRoutes from '@presentation/http/routes/comanda.routes';
import deliveryRoutes from '@presentation/http/routes/delivery.routes';
import couponRoutes from '@presentation/http/routes/coupon.routes';
import loyaltyRoutes from '@presentation/http/routes/loyalty.routes';
import cashbackRoutes from '@presentation/http/routes/cashback.routes';
import financialRoutes from '@presentation/http/routes/financial.routes';
import settingsRoutes from '@presentation/http/routes/settings.routes';

export function createApp(): Application {
  const app = express();

  const isProduction = process.env.NODE_ENV === 'production';

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );

  // Rate limiting
  // In dev/test, this is disabled by default to avoid 429s from React dev behavior
  // and fast navigation between modules. Enable explicitly with RATE_LIMIT_ENABLED=true.
  const rateLimitEnabled = (process.env.RATE_LIMIT_ENABLED ?? (isProduction ? 'true' : 'false'))
    .toLowerCase()
    .trim() === 'true';

  if (rateLimitEnabled) {
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minuto
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requisições por minuto
      message: 'Muitas requisições deste IP, tente novamente mais tarde',
      skip: (req) => req.path === '/health' || req.method === 'OPTIONS',
    });
    app.use(limiter);
  }

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // Request logging
  app.use((req: Request, res: Response, next) => {
    logger.info(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      ip: req.ip,
    });
    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API routes
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);
  app.use(`${apiPrefix}/customers`, customerRoutes);
  app.use(`${apiPrefix}`, productRoutes);
  app.use(`${apiPrefix}/cash-sessions`, cashSessionRoutes);
  app.use(`${apiPrefix}/sales`, saleRoutes);
  app.use(`${apiPrefix}/comandas`, comandaRoutes);
  app.use(`${apiPrefix}/delivery`, deliveryRoutes);
  app.use(`${apiPrefix}/coupons`, couponRoutes);
  app.use(`${apiPrefix}/loyalty`, loyaltyRoutes);
  app.use(`${apiPrefix}/cashback`, cashbackRoutes);
  app.use(`${apiPrefix}/financial`, financialRoutes);
  app.use(`${apiPrefix}/settings`, settingsRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      message: 'Rota não encontrada',
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
