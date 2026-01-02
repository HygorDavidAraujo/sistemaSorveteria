import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@shared/errors/app-error';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (error) {
      const message = error.details
        .map((detail) => detail.message)
        .join(', ');
      return next(new ValidationError(message));
    }

    // Replace request data with validated data
    req.body = value.body || req.body;
    req.query = value.query || req.query;
    req.params = value.params || req.params;

    next();
  };
};
