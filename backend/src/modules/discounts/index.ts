import { Router, Request, Response } from 'express';

export const discountsRouter = Router();

// Discounts Module Stub Routes
discountsRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    module: 'discounts',
    description: 'Promotional rules and discount management',
    endpoints: [
      '/api/v1/discounts',
      '/api/v1/discounts/:id',
    ],
  });
});

discountsRouter.get('/list', (_req: Request, res: Response) => {
  res.json({ data: [], page: 1, limit: 10, total: 0 });
});

export default discountsRouter;
