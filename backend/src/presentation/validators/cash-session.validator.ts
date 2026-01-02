import Joi from 'joi';
import { CashSessionStatus, PaymentMethod } from '@prisma/client';

export const cashSessionValidators = {
  open: Joi.object({
    body: Joi.object({
      terminalId: Joi.string().max(50).required().messages({
        'any.required': 'terminalId é obrigatório',
      }),
      initialCash: Joi.number().min(0).optional().default(0),
      openingNotes: Joi.string().max(1000).optional().allow(''),
    }),
  }),

  current: Joi.object({
    query: Joi.object({
      terminalId: Joi.string().max(50).required(),
    }),
  }),

  history: Joi.object({
    query: Joi.object({
      status: Joi.string()
        .valid(...Object.values(CashSessionStatus))
        .optional(),
      terminalId: Joi.string().max(50).optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      page: Joi.number().integer().min(1).optional().default(1),
      limit: Joi.number().integer().min(1).max(100).optional().default(20),
    }),
  }),

  cashierClose: Joi.object({
    body: Joi.object({
      cashierCashCount: Joi.number().required().messages({
        'any.required': 'cashierCashCount é obrigatório',
      }),
      cashierNotes: Joi.string().max(1000).optional().allow(''),
      paymentBreakdown: Joi.array()
        .items(
          Joi.object({
            paymentMethod: Joi.string()
              .valid(...Object.values(PaymentMethod))
              .required(),
            expectedAmount: Joi.number().min(0).optional(),
            countedAmount: Joi.number().min(0).optional(),
          })
        )
        .optional(),
    }),
  }),

  managerClose: Joi.object({
    body: Joi.object({
      managerNotes: Joi.string().max(1000).optional().allow(''),
    }),
  }),

  idParam: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),
};
