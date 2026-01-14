import Joi from 'joi';

const uuid = Joi.string().uuid();

export const comandaValidators = {
  openComanda: Joi.object({
    body: Joi.object({
      tableNumber: Joi.string().max(20).optional(),
      customerName: Joi.string().max(255).optional(),
      customerId: uuid.optional(),
      cashSessionId: uuid.required(),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  getComandaById: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),

  listComandas: Joi.object({
    body: Joi.object({}),
    query: Joi.object({
      status: Joi.string().valid('open', 'closed', 'cancelled').optional(),
      cashSessionId: uuid.optional(),
      customerId: uuid.optional(),
      tableNumber: Joi.string().max(20).optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
    params: Joi.object({}),
  }),

  addItem: Joi.object({
    body: Joi.object({
      productId: uuid.required(),
      quantity: Joi.number().positive().required(),
      sizeId: uuid.optional(),
      // Optional here; if sizeId is provided for Montado, ComandaService enforces flavorsTotal rules.
      flavorsTotal: Joi.number().integer().min(1).max(20).optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),

  updateItem: Joi.object({
    body: Joi.object({
      quantity: Joi.number().positive().required(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
      itemId: uuid.required(),
    }),
  }),

  cancelItem: Joi.object({
    body: Joi.object({
      reason: Joi.string().min(10).max(500).required(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
      itemId: uuid.required(),
    }),
  }),

  closeComanda: Joi.object({
    body: Joi.object({
      discount: Joi.number().min(0).default(0),
      additionalFee: Joi.number().min(0).default(0),
      couponCode: Joi.string().trim().max(50).optional(),
      payments: Joi.array()
        .items(
          Joi.object({
            paymentMethod: Joi.string()
              .valid('cash', 'debit_card', 'credit_card', 'pix', 'other')
              .required(),
            amount: Joi.number().positive().required(),
          })
        )
        .min(1)
        .required(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),

  reopenComanda: Joi.object({
    body: Joi.object({
      reason: Joi.string().min(10).max(500).required(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),

  cancelComanda: Joi.object({
    body: Joi.object({
      reason: Joi.string().min(10).max(500).required(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),
};
