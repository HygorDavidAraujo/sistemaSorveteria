import Joi from 'joi';

const uuid = Joi.string().uuid();

// Criação de cupom
export const createCouponSchema = Joi.object({
  body: Joi.object({
    code: Joi.string().min(3).max(50).pattern(/^[A-Za-z0-9%_-]+$/).required().messages({
      'string.empty': 'Código é obrigatório',
      'string.min': 'Código deve ter no mínimo 3 caracteres',
      'string.max': 'Código deve ter no máximo 50 caracteres',
      'string.pattern.base': 'Código deve conter apenas letras, números, %, _ ou -',
      'any.required': 'Código é obrigatório',
    }),
    description: Joi.string().max(500).optional().allow('').messages({
      'string.max': 'Descrição deve ter no máximo 500 caracteres',
    }),
    couponType: Joi.string().valid('percentage', 'fixed').required().messages({
      'any.only': 'Tipo deve ser "percentage" ou "fixed"',
      'any.required': 'Tipo é obrigatório',
    }),
    discountValue: Joi.number().positive().required().messages({
      'number.base': 'Valor do desconto deve ser um número',
      'number.positive': 'Valor do desconto deve ser positivo',
      'any.required': 'Valor do desconto é obrigatório',
    }),
    minPurchaseValue: Joi.number().min(0).optional().messages({
      'number.base': 'Valor mínimo deve ser um número',
      'number.min': 'Valor mínimo não pode ser negativo',
    }),
    maxDiscount: Joi.number().positive().optional().messages({
      'number.base': 'Desconto máximo deve ser um número',
      'number.positive': 'Desconto máximo deve ser positivo',
    }),
    usageLimit: Joi.number().integer().positive().optional().messages({
      'number.base': 'Limite de uso deve ser um número',
      'number.integer': 'Limite de uso deve ser um número inteiro',
      'number.positive': 'Limite de uso deve ser positivo',
    }),
    validFrom: Joi.date().required().messages({
      'date.base': 'Data de início inválida',
      'any.required': 'Data de início é obrigatória',
    }),
    validTo: Joi.date().optional().messages({
      'date.base': 'Data de término inválida',
    }),
  }),
});

// Atualização de cupom
export const updateCouponSchema = Joi.object({
  params: Joi.object({
    id: uuid.required().messages({
      'string.guid': 'ID deve ser um UUID válido',
      'any.required': 'ID é obrigatório',
    }),
  }),
  body: Joi.object({
    description: Joi.string().max(500).optional().allow('').messages({
      'string.max': 'Descrição deve ter no máximo 500 caracteres',
    }),
    minPurchaseValue: Joi.number().min(0).optional().messages({
      'number.base': 'Valor mínimo deve ser um número',
      'number.min': 'Valor mínimo não pode ser negativo',
    }),
    maxDiscount: Joi.number().positive().optional().messages({
      'number.base': 'Desconto máximo deve ser um número',
      'number.positive': 'Desconto máximo deve ser positivo',
    }),
    usageLimit: Joi.number().integer().positive().optional().messages({
      'number.base': 'Limite de uso deve ser um número',
      'number.integer': 'Limite de uso deve ser um número inteiro',
      'number.positive': 'Limite de uso deve ser positivo',
    }),
    validTo: Joi.date().optional().messages({
      'date.base': 'Data de término inválida',
    }),
    status: Joi.string().valid('active', 'inactive', 'expired').optional().messages({
      'any.only': 'Status deve ser "active", "inactive" ou "expired"',
    }),
  }).min(1),
});

// Validação de cupom
export const validateCouponSchema = Joi.object({
  body: Joi.object({
    code: Joi.string().pattern(/^[A-Za-z0-9%_-]+$/).required().messages({
      'string.empty': 'Código é obrigatório',
      'string.pattern.base': 'Código inválido',
      'any.required': 'Código é obrigatório',
    }),
    subtotal: Joi.number().positive().required().messages({
      'number.base': 'Subtotal deve ser um número',
      'number.positive': 'Subtotal deve ser positivo',
      'any.required': 'Subtotal é obrigatório',
    }),
    customerId: Joi.alternatives().try(
      uuid,
      Joi.string().allow('')
    ).optional().allow(null).messages({
      'string.guid': 'ID do cliente deve ser um UUID válido',
    }),
  }),
});

// Aplicação de cupom
export const applyCouponSchema = Joi.object({
  body: Joi.object({
    couponId: uuid.required().messages({
      'string.guid': 'ID do cupom deve ser um UUID válido',
      'any.required': 'ID do cupom é obrigatório',
    }),
    customerId: uuid.required().messages({
      'string.guid': 'ID do cliente deve ser um UUID válido',
      'any.required': 'ID do cliente é obrigatório',
    }),
    discountApplied: Joi.number().positive().required().messages({
      'number.base': 'Desconto aplicado deve ser um número',
      'number.positive': 'Desconto aplicado deve ser positivo',
      'any.required': 'Desconto aplicado é obrigatório',
    }),
    saleId: uuid.optional().messages({
      'string.guid': 'ID da venda deve ser um UUID válido',
    }),
    comandaId: uuid.optional().messages({
      'string.guid': 'ID da comanda deve ser um UUID válido',
    }),
    deliveryOrderId: uuid.optional().messages({
      'string.guid': 'ID do pedido de delivery deve ser um UUID válido',
    }),
  }),
});

// Buscar por ID
export const getCouponByIdSchema = Joi.object({
  params: Joi.object({
    id: uuid.required().messages({
      'string.guid': 'ID deve ser um UUID válido',
      'any.required': 'ID é obrigatório',
    }),
  }),
});

// Listagem de cupons
export const listCouponsSchema = Joi.object({
  query: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'expired').optional().messages({
      'any.only': 'Status deve ser "active", "inactive" ou "expired"',
    }),
    couponType: Joi.string().valid('percentage', 'fixed').optional().messages({
      'any.only': 'Tipo deve ser "percentage" ou "fixed"',
    }),
    search: Joi.string().optional().messages({
      'string.base': 'Busca deve ser um texto',
    }),
    page: Joi.number().integer().min(1).optional().messages({
      'number.base': 'Página deve ser um número',
      'number.integer': 'Página deve ser um número inteiro',
      'number.min': 'Página deve ser no mínimo 1',
    }),
    limit: Joi.number().integer().min(1).max(100).optional().messages({
      'number.base': 'Limite deve ser um número',
      'number.integer': 'Limite deve ser um número inteiro',
      'number.min': 'Limite deve ser no mínimo 1',
      'number.max': 'Limite deve ser no máximo 100',
    }),
  }),
});

// Relatório de uso
export const getCouponUsageReportSchema = Joi.object({
  query: Joi.object({
    couponId: uuid.optional().messages({
      'string.guid': 'ID do cupom deve ser um UUID válido',
    }),
    customerId: uuid.optional().messages({
      'string.guid': 'ID do cliente deve ser um UUID válido',
    }),
    startDate: Joi.date().optional().messages({
      'date.base': 'Data de início inválida',
    }),
    endDate: Joi.date().optional().messages({
      'date.base': 'Data de término inválida',
    }),
    page: Joi.number().integer().min(1).optional().messages({
      'number.base': 'Página deve ser um número',
      'number.integer': 'Página deve ser um número inteiro',
      'number.min': 'Página deve ser no mínimo 1',
    }),
    limit: Joi.number().integer().min(1).max(100).optional().messages({
      'number.base': 'Limite deve ser um número',
      'number.integer': 'Limite deve ser um número inteiro',
      'number.min': 'Limite deve ser no mínimo 1',
      'number.max': 'Limite deve ser no máximo 100',
    }),
  }),
});
