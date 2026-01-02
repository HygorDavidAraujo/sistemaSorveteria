import Joi from 'joi';

const uuid = Joi.string().uuid();

// Configuração
export const updateLoyaltyConfigSchema = Joi.object({
  body: Joi.object({
    pointsPerReal: Joi.number().positive().optional(),
    minPurchaseForPoints: Joi.number().min(0).optional(),
    pointsExpirationDays: Joi.number().integer().positive().optional(),
    minPointsToRedeem: Joi.number().integer().positive().optional(),
    pointsRedemptionValue: Joi.number().positive().optional(),
    isActive: Joi.boolean().optional(),
    applyToAllProducts: Joi.boolean().optional(),
  }).min(1),
});

// Cálculo de pontos
export const calculatePointsSchema = Joi.object({
  body: Joi.object({
    subtotal: Joi.number().positive().required(),
    productIds: Joi.array().items(uuid).optional(),
  }),
});

// Adicionar pontos
export const addPointsSchema = Joi.object({
  body: Joi.object({
    customerId: uuid.required(),
    points: Joi.number().integer().positive().required(),
    saleId: uuid.optional(),
    comandaId: uuid.optional(),
    deliveryOrderId: uuid.optional(),
    description: Joi.string().max(500).optional(),
  }),
});

// Resgatar pontos
export const redeemPointsSchema = Joi.object({
  body: Joi.object({
    customerId: uuid.required(),
    points: Joi.number().integer().positive().required(),
    saleId: uuid.optional(),
    comandaId: uuid.optional(),
    deliveryOrderId: uuid.optional(),
    description: Joi.string().max(500).optional(),
  }),
});

// Ajustar pontos
export const adjustPointsSchema = Joi.object({
  body: Joi.object({
    customerId: uuid.required(),
    points: Joi.number().integer().required(),
    description: Joi.string().min(10).max(500).required(),
  }),
});

// Criar prêmio
export const createRewardSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).optional(),
    pointsCost: Joi.number().integer().positive().required(),
    quantityAvailable: Joi.number().integer().min(0).optional().allow(null),
    expiresAt: Joi.date().greater('now').optional().allow(null),
    isActive: Joi.boolean().optional(),
  }),
});

// Atualizar prêmio
export const updateRewardSchema = Joi.object({
  params: Joi.object({
    rewardId: uuid.required(),
  }),
  body: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().max(500).optional(),
    pointsCost: Joi.number().integer().positive().optional(),
    quantityAvailable: Joi.number().integer().min(0).optional().allow(null),
    expiresAt: Joi.date().greater('now').optional().allow(null),
    isActive: Joi.boolean().optional(),
  }).min(1),
});

// Resgatar prêmio
export const redeemRewardSchema = Joi.object({
  params: Joi.object({
    rewardId: uuid.required(),
  }),
  body: Joi.object({
    customerId: uuid.required(),
    quantity: Joi.number().integer().positive().optional().default(1),
  }),
});

// Filtros de extrato
export const statementFiltersSchema = Joi.object({
  query: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    transactionType: Joi.string()
      .valid('earn', 'redeem', 'adjustment_add', 'adjustment_subtract', 'expiration')
      .optional(),
    page: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().positive().max(100).optional(),
  }),
});

// Filtros de prêmios
export const rewardsFiltersSchema = Joi.object({
  query: Joi.object({
    isActive: Joi.string().valid('true', 'false').optional(),
    page: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().positive().max(100).optional(),
    orderBy: Joi.string().valid('name', 'pointsCost', 'createdAt').optional(),
  }),
});
