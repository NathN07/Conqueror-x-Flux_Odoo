import { Router, Request, Response } from 'express';

export const reportsRouter = Router();

// Reports Module Stub Routes
reportsRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    module: 'reports',
    description: 'Financial reporting, MRR/ARR analytics, and subscription churn metrics',
    endpoints: [
      '/api/v1/reports/revenue',
      '/api/v1/reports/subscriptions',
      '/api/v1/reports/tax-summary',
    ],
  });
});

reportsRouter.get('/revenue', (_req: Request, res: Response) => {
  res.json({ mrr: '0.00', arr: '0.00', totalRevenue: '0.00' });
});

reportsRouter.get('/subscriptions', (_req: Request, res: Response) => {
  res.json({ activeCount: 0, churnRate: 0.0 });
});

export default reportsRouter;
