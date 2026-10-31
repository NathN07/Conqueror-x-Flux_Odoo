import { Router, Request, Response } from 'express';

export const paymentsRouter = Router();

// Payments Module Stub Routes
paymentsRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    module: 'payments',
    description: 'Payment transactions, methods, and receipt recording',
    endpoints: [
      '/api/v1/payments',
      '/api/v1/payments/:id',
    ],
  });
});

paymentsRouter.get('/list', (_req: Request, res: Response) => {
  res.json({ data: [], page: 1, limit: 10, total: 0 });
});

export default paymentsRouter;
