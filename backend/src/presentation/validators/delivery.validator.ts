import Joi from 'joi';

const uuid = Joi.string().uuid();

export const deliveryValidators = {
  createOrder: Joi.object({
    body: Joi.object({
      customerId: uuid.required(),
      cashSessionId: uuid.required(),
      items: Joi.array()
        .items(
          Joi.object({
            productId: uuid.required(),
            quantity: Joi.number().positive().required(),
            sizeId: uuid.optional(),
            // Optional: DeliveryService enforces flavorsTotal rules for Montado when sizeId is provided.
            flavorsTotal: Joi.number().integer().min(1).max(20).optional(),
          })
        )
        .min(1)
        .required(),
      deliveryFee: Joi.number().min(0).optional(),
      additionalFee: Joi.number().min(0).optional(),
      discount: Joi.number().min(0).optional(),
      couponCode: Joi.string().trim().max(50).optional(),
      estimatedTime: Joi.number().integer().positive().optional(),
      customerNotes: Joi.string().max(500).optional(),
      internalNotes: Joi.string().max(500).optional(),
      payments: Joi.array()
        .items(
          Joi.object({
            paymentMethod: Joi.string().valid('cash', 'credit_card', 'debit_card', 'pix', 'other').required(),
            amount: Joi.number().positive().required(),
          })
        )
        .min(1)
        .optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  getOrderById: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),

  listOrders: Joi.object({
    body: Joi.object({}),
    query: Joi.object({
      status: Joi.string()
        .valid('received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')
        .optional(),
      customerId: uuid.optional(),
      cashSessionId: uuid.optional(),
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
      customerId: uuid.required(),
    }),
  }),

  // Delivery Fees

  listFees: Joi.object({
    body: Joi.object({}),
    query: Joi.object({
      isActive: Joi.string().valid('true', 'false').optional(),
      feeType: Joi.string().valid('neighborhood', 'distance').optional(),
    }),
    params: Joi.object({}),
  }),

  getFeeById: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),

  createFee: Joi.object({
    body: Joi.object({
      feeType: Joi.string().valid('neighborhood', 'distance').default('neighborhood'),
      // Neighborhood-based
      neighborhood: Joi.when('feeType', {
        is: 'neighborhood',
        then: Joi.string().max(100).required(),
        otherwise: Joi.string().max(100).optional().allow(null, ''),
      }),
      city: Joi.when('feeType', {
        is: 'neighborhood',
        then: Joi.string().max(100).required(),
        otherwise: Joi.string().max(100).optional().allow(null, ''),
      }),
      fee: Joi.number().min(0).required(),
      minOrderValue: Joi.number().min(0).default(0),
      freeDeliveryAbove: Joi.number().min(0).optional().allow(null),
      // Distance-based
      maxDistance: Joi.when('feeType', {
        is: 'distance',
        // 0 = não isenta em nenhuma distância (cobra todas)
        then: Joi.number().min(0).required(),
        otherwise: Joi.number().optional().allow(null),
      }),
      feePerKm: Joi.when('feeType', {
        is: 'distance',
        then: Joi.number().positive().required(),
        otherwise: Joi.number().optional().allow(null),
      }),
      baseFee: Joi.when('feeType', {
        is: 'distance',
        then: Joi.number().min(0).required(),
        otherwise: Joi.number().optional().allow(null),
      }),
      isActive: Joi.boolean().default(true),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  updateFee: Joi.object({
    body: Joi.object({
      feeType: Joi.string().valid('neighborhood', 'distance').optional(),
      neighborhood: Joi.string().max(100).optional().allow(null, ''),
      city: Joi.string().max(100).optional().allow(null, ''),
      fee: Joi.number().min(0).optional(),
      minOrderValue: Joi.number().min(0).optional(),
      freeDeliveryAbove: Joi.number().min(0).optional().allow(null),
      // 0 = não isenta em nenhuma distância (cobra todas)
      maxDistance: Joi.number().min(0).optional().allow(null),
      feePerKm: Joi.number().positive().optional().allow(null),
      baseFee: Joi.number().min(0).optional().allow(null),
      isActive: Joi.boolean().optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),

  deleteFee: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: uuid.required(),
    }),
  }),

  calculateFee: Joi.object({
    body: Joi.object({
      neighborhood: Joi.string().min(1).max(100).required(),
      city: Joi.string().min(1).max(100).required(),
      subtotal: Joi.number().min(0).required(),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),
};
