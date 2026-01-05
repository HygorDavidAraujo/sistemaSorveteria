import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@shared/errors/app-error';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const expectsWrapper = schema.$_terms?.keys?.some(
      (k: any) => ['body', 'query', 'params'].includes(k.key)
    );

    const payload = expectsWrapper
      ? { body: req.body, query: req.query, params: req.params }
      : req.body;

    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details
        .map((detail) => detail.message)
        .join(', ');
      return next(new ValidationError(message));
    }

    // Replace request data with validated data
    if (expectsWrapper) {
      req.body = value.body ?? req.body;
      req.query = value.query ?? req.query;
      req.params = value.params ?? req.params;
    } else {
      req.body = value ?? req.body;
    }

    next();
  };
};
