import Joi from 'joi';

export const deliveryValidators = {
  createOrder: Joi.object({
    body: Joi.object({
      customerId: Joi.string().uuid().required(),
      cashSessionId: Joi.string().uuid().required(),
      items: Joi.array()
        .items(
          Joi.object({
            productId: Joi.string().uuid().required(),
            quantity: Joi.number().positive().required(),
          })
        )
        .min(1)
        .required(),
      deliveryFee: Joi.number().min(0).optional(),
      discount: Joi.number().min(0).optional(),
      couponCode: Joi.string().trim().max(50).optional(),
      estimatedTime: Joi.number().integer().positive().optional(),
      customerNotes: Joi.string().max(500).optional(),
      internalNotes: Joi.string().max(500).optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  getOrderById: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  listOrders: Joi.object({
    body: Joi.object({}),
    query: Joi.object({
      status: Joi.string()
        .valid('received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')
        .optional(),
      customerId: Joi.string().uuid().optional(),
      cashSessionId: Joi.string().uuid().optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
    params: Joi.object({}),
  }),

  updateStatus: Joi.object({
    body: Joi.object({
      status: Joi.string()
        .valid('received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')
        .required(),
      deliveryPerson: Joi.string().max(255).optional(),
      internalNotes: Joi.string().max(500).optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  getCustomerOrders: Joi.object({
    body: Joi.object({}),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
    params: Joi.object({
      customerId: Joi.string().uuid().required(),
    }),
  }),

  // Delivery Fees

  listFees: Joi.object({
    body: Joi.object({}),
    query: Joi.object({
      isActive: Joi.string().valid('true', 'false').optional(),
    }),
    params: Joi.object({}),
  }),

  getFeeById: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  createFee: Joi.object({
    body: Joi.object({
      neighborhood: Joi.string().max(100).required(),
      city: Joi.string().max(100).required(),
      fee: Joi.number().min(0).required(),
      minOrderValue: Joi.number().min(0).default(0),
      freeDeliveryAbove: Joi.number().min(0).optional(),
      isActive: Joi.boolean().default(true),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  updateFee: Joi.object({
    body: Joi.object({
      neighborhood: Joi.string().max(100).optional(),
      city: Joi.string().max(100).optional(),
      fee: Joi.number().min(0).optional(),
      minOrderValue: Joi.number().min(0).optional(),
      freeDeliveryAbove: Joi.number().min(0).optional().allow(null),
      isActive: Joi.boolean().optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  deleteFee: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  calculateFee: Joi.object({
    body: Joi.object({
      neighborhood: Joi.string().max(100).required(),
      city: Joi.string().max(100).required(),
      subtotal: Joi.number().positive().required(),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),
};
