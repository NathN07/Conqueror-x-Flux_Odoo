import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler';
import catalogRouter from './modules/catalog';
import discountsRouter from './modules/discounts';
import paymentsRouter from './modules/payments';
import reportsRouter from './modules/reports';
import portalRouter from './modules/portal';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root & Health routes
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'brightloop-backend', timestamp: new Date().toISOString() });
  });

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'brightloop-backend', version: '1.0.0', timestamp: new Date().toISOString() });
  });

  // Mount one router per module from src/modules/<name>/index.ts
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/discounts', discountsRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/portal', portalRouter);

  // 404 Handler for unmatched routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested API route does not exist',
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
