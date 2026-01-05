import Joi from 'joi';

export const productValidators = {
  /**
   * Validação para criar produto
   */
  createProduct: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(255).required().messages({
        'string.empty': 'Nome do produto é obrigatório',
        'string.min': 'Nome deve ter no mínimo 2 caracteres',
        'string.max': 'Nome deve ter no máximo 255 caracteres',
        'any.required': 'Nome do produto é obrigatório',
      }),
      code: Joi.string().max(50).required().messages({
        'string.empty': 'Código do produto é obrigatório',
        'any.required': 'Código do produto é obrigatório',
      }),
      description: Joi.string().max(1000).optional().allow(''),
      categoryId: Joi.string().uuid().optional(),
      saleType: Joi.string().valid('unit', 'weight').required().messages({
        'any.only': 'Tipo de venda inválido. Valores permitidos: unit, weight',
        'any.required': 'Tipo de venda é obrigatório',
      }),
      unit: Joi.string().max(50).optional().allow(''),
      salePrice: Joi.number().positive().precision(2).required().messages({
        'number.base': 'Preço de venda deve ser um número',
        'number.positive': 'Preço de venda deve ser positivo',
        'any.required': 'Preço de venda é obrigatório',
      }),
      costPrice: Joi.number().positive().precision(2).optional(),
      eligibleForLoyalty: Joi.boolean().optional().default(false),
      loyaltyPointsMultiplier: Joi.number().positive().precision(2).optional().default(1),
      trackStock: Joi.boolean().optional().default(false),
      currentStock: Joi.number().min(0).optional().default(0),
      minStock: Joi.number().min(0).optional().default(0),
      isActive: Joi.boolean().optional().default(true),
    }),
  }),

  /**
   * Validação para atualizar produto
   */
  updateProduct: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(255).optional(),
      description: Joi.string().max(1000).optional().allow(''),
      categoryId: Joi.string().uuid().optional().allow(null),
      code: Joi.string().max(50).optional(),
      saleType: Joi.string().valid('unit', 'weight').optional(),
      unit: Joi.string().max(50).optional().allow(''),
      salePrice: Joi.number().positive().precision(2).optional().allow(null),
      costPrice: Joi.number().positive().precision(2).optional().allow(null),
      eligibleForLoyalty: Joi.boolean().optional(),
      loyaltyPointsMultiplier: Joi.number().positive().precision(2).optional(),
      trackStock: Joi.boolean().optional(),
      currentStock: Joi.number().min(0).optional(),
      minStock: Joi.number().min(0).optional(),
      isActive: Joi.boolean().optional(),
    }).min(1),
  }),

  /**
   * Validação para buscar produtos
   */
  searchProducts: Joi.object({
    query: Joi.object({
      search: Joi.string().max(255).optional().allow(''),
      categoryId: Joi.string().uuid().optional(),
      isActive: Joi.string().valid('true', 'false').optional(),
      saleType: Joi.string().valid('unit', 'weight').optional(),
      page: Joi.number().integer().min(1).optional().default(1),
      limit: Joi.number().integer().min(1).max(100).optional().default(20),
    }),
  }),

  /**
   * Validação para adicionar custo
   */
  addCost: Joi.object({
    body: Joi.object({
      costPrice: Joi.number().positive().precision(2).required().messages({
        'number.base': 'Preço de custo deve ser um número',
        'number.positive': 'Preço de custo deve ser positivo',
        'any.required': 'Preço de custo é obrigatório',
      }),
    }),
  }),

  /**
   * Validação para atualizar estoque
   */
  updateStock: Joi.object({
    body: Joi.object({
      quantity: Joi.number().required().messages({
        'number.base': 'Quantidade deve ser um número',
        'any.required': 'Quantidade é obrigatória',
      }),
      operation: Joi.string().valid('add', 'subtract', 'set').required().messages({
        'any.only': 'Operação inválida. Valores permitidos: add, subtract, set',
        'any.required': 'Operação é obrigatória',
      }),
    }),
  }),

  /**
   * Validação para criar categoria
   */
  createCategory: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(255).required().messages({
        'string.empty': 'Nome da categoria é obrigatório',
        'string.min': 'Nome deve ter no mínimo 2 caracteres',
        'string.max': 'Nome deve ter no máximo 255 caracteres',
        'any.required': 'Nome da categoria é obrigatório',
      }),
      description: Joi.string().max(1000).optional().allow(''),
      isActive: Joi.boolean().optional().default(true),
    }),
  }),

  /**
   * Validação para atualizar categoria
   */
  updateCategory: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(255).optional(),
      description: Joi.string().max(1000).optional().allow(''),
      isActive: Joi.boolean().optional(),
    }).min(1),
  }),

  /**
   * Validação de UUID nos parâmetros
   */
  uuidParam: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required().messages({
        'string.guid': 'ID inválido',
        'any.required': 'ID é obrigatório',
      }),
    }),
  }),
};
