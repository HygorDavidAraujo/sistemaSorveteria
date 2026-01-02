import Joi from 'joi';

const uuid = Joi.string().uuid();

// Configuração
export const updateCashbackConfigSchema = Joi.object({
  body: Joi.object({
    cashbackPercentage: Joi.number().positive().max(100).optional(),
    minPurchaseForCashback: Joi.number().min(0).optional(),
    maxCashbackPerPurchase: Joi.number().positive().optional().allow(null),
    cashbackExpirationDays: Joi.number().integer().positive().optional(),
    minCashbackToUse: Joi.number().positive().optional(),
    isActive: Joi.boolean().optional(),
    applyToAllProducts: Joi.boolean().optional(),
  }).min(1),
});

// Cálculo de cashback
export const calculateCashbackSchema = Joi.object({
  body: Joi.object({
    subtotal: Joi.number().positive().required(),
    productIds: Joi.array().items(uuid).optional(),
    excludeProductIds: Joi.array().items(uuid).optional(),
  }),
});

// Adicionar cashback
export const addCashbackSchema = Joi.object({
  body: Joi.object({
    customerId: uuid.required(),
    amount: Joi.number().positive().required(),
    saleId: uuid.optional(),
    comandaId: uuid.optional(),
    deliveryOrderId: uuid.optional(),
    description: Joi.string().max(500).optional(),
  }),
});

// Usar cashback
export const useCashbackSchema = Joi.object({
  body: Joi.object({
    customerId: uuid.required(),
    amount: Joi.number().positive().required(),
    saleId: uuid.optional(),
    comandaId: uuid.optional(),
    deliveryOrderId: uuid.optional(),
    description: Joi.string().max(500).optional(),
  }),
});

// Ajustar cashback
export const adjustCashbackSchema = Joi.object({
  body: Joi.object({
    customerId: uuid.required(),
    amount: Joi.number().required(),
    description: Joi.string().min(10).max(500).required(),
  }),
});

// Transferir cashback
export const transferCashbackSchema = Joi.object({
  body: Joi.object({
    fromCustomerId: uuid.required(),
    toCustomerId: uuid.required(),
    amount: Joi.number().positive().required(),
    description: Joi.string().min(10).max(500).required(),
  }),
});

// Filtros de extrato
export const statementFiltersSchema = Joi.object({
  query: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    transactionType: Joi.string()
      .valid('earn', 'use', 'adjustment_add', 'adjustment_subtract', 'expiration', 'transfer_in', 'transfer_out')
      .optional(),
    page: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().positive().max(100).optional(),
  }),
});
