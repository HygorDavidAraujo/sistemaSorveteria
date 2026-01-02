import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper para handlers assíncronos
 * Captura erros e passa para o middleware de erro
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
