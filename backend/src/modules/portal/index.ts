import { Router, Request, Response } from 'express';

export const portalRouter = Router();

// Customer Portal Stub Routes (/me/subscriptions, /me/invoices, /me/payments)
portalRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    module: 'portal',
    description: 'Self-service customer portal API',
    endpoints: [
      '/api/v1/portal/me/subscriptions',
      '/api/v1/portal/me/invoices',
      '/api/v1/portal/me/payments',
    ],
  });
});

portalRouter.get('/me/subscriptions', (_req: Request, res: Response) => {
  res.json({ data: [], page: 1, limit: 10, total: 0 });
});

portalRouter.get('/me/invoices', (_req: Request, res: Response) => {
  res.json({ data: [], page: 1, limit: 10, total: 0 });
});

portalRouter.get('/me/payments', (_req: Request, res: Response) => {
  res.json({ data: [], page: 1, limit: 10, total: 0 });
});

export default portalRouter;
