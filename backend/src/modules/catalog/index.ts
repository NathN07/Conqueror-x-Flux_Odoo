import { Router, Request, Response } from 'express';

export const catalogRouter = Router();

// Catalog Module Stub Routes: Products, Variants, Plans, Taxes
catalogRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    module: 'catalog',
    description: 'Products, Variants, Plans, and Taxes management',
    endpoints: [
      '/api/v1/catalog/products',
      '/api/v1/catalog/plans',
      '/api/v1/catalog/taxes',
    ],
  });
});

catalogRouter.get('/products', (_req: Request, res: Response) => {
  res.json({ data: [], page: 1, limit: 10, total: 0 });
});

catalogRouter.get('/plans', (_req: Request, res: Response) => {
  res.json({ data: [], page: 1, limit: 10, total: 0 });
});

catalogRouter.get('/taxes', (_req: Request, res: Response) => {
  res.json({ data: [], page: 1, limit: 10, total: 0 });
});

export default catalogRouter;
