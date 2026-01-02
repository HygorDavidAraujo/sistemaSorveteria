import Joi from 'joi';

export const saleValidators = {
  createSale: Joi.object({
    body: Joi.object({
      cashSessionId: Joi.string().uuid().required(),
      customerId: Joi.string().uuid().optional(),
      saleType: Joi.string().valid('pdv', 'comanda', 'delivery').default('pdv'),
      items: Joi.array()
        .items(
          Joi.object({
            productId: Joi.string().uuid().required(),
            quantity: Joi.number().positive().required(),
            discount: Joi.number().min(0).default(0),
          })
        )
        .min(1)
        .required(),
      payments: Joi.array()
        .items(
          Joi.object({
            paymentMethod: Joi.string()
              .valid('cash', 'debit_card', 'credit_card', 'pix', 'other')
              .required(),
            amount: Joi.number().positive().required(),
            cardBrand: Joi.string().optional(),
            cardLastDigits: Joi.string().length(4).optional(),
            installments: Joi.number().integer().min(1).optional(),
            pixKey: Joi.string().optional(),
            pixTransactionId: Joi.string().optional(),
          })
        )
        .min(1)
        .required(),
      discount: Joi.number().min(0).default(0),
      deliveryFee: Joi.number().min(0).default(0),
      loyaltyPointsUsed: Joi.number().integer().min(0).default(0),
      couponCode: Joi.string().trim().max(50).optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  getSaleById: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  listSales: Joi.object({
    body: Joi.object({}),
    query: Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      cashSessionId: Joi.string().uuid().optional(),
      customerId: Joi.string().uuid().optional(),
      saleType: Joi.string().valid('pdv', 'comanda', 'delivery').optional(),
      status: Joi.string().valid('completed', 'cancelled', 'adjusted').optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
    params: Joi.object({}),
  }),

  cancelSale: Joi.object({
    body: Joi.object({
      reason: Joi.string().min(10).max(500).required(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  reopenSale: Joi.object({
    body: Joi.object({
      reason: Joi.string().min(10).max(500).required(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),
};
