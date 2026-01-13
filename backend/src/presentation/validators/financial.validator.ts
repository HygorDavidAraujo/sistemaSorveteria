import Joi from 'joi';

/**
 * Financial Validators
 * Validações de dados para transações e categorias financeiras
 */

// Validação de transação financeira
export const createFinancialTransactionSchema = Joi.object({
  categoryId: Joi.string().uuid().required().messages({
    'string.guid': 'ID da categoria deve ser um UUID válido',
    'any.required': 'ID da categoria é obrigatório',
  }),
  transactionType: Joi.string()
    .valid('revenue', 'expense', 'transfer')
    .required()
    .messages({
      'any.only': 'Tipo deve ser revenue, expense ou transfer',
      'any.required': 'Tipo de transação é obrigatório',
    }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Valor deve ser maior que zero',
    'any.required': 'Valor é obrigatório',
  }),
  description: Joi.string().max(500).required().messages({
    'string.max': 'Descrição não pode ter mais de 500 caracteres',
    'any.required': 'Descrição é obrigatória',
  }),
  referenceNumber: Joi.string().max(100).optional(),
  transactionDate: Joi.date().iso().required().messages({
    'date.iso': 'Data deve estar em formato ISO',
    'any.required': 'Data da transação é obrigatória',
  }),
  dueDate: Joi.date().iso().optional(),
  saleId: Joi.string().uuid().optional(),
});

export const updateFinancialTransactionSchema = Joi.object({
  description: Joi.string().max(500).optional(),
  dueDate: Joi.date().iso().optional(),
  paidAt: Joi.date().iso().optional(),
  status: Joi.string()
    .valid('pending', 'paid', 'cancelled', 'overdue')
    .optional(),
});

export const searchFinancialTransactionSchema = Joi.object({
  categoryId: Joi.string().uuid().optional(),
  transactionType: Joi.string()
    .valid('revenue', 'expense', 'transfer')
    .optional(),
  status: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const cancelTransactionSchema = Joi.object({
  reason: Joi.string().max(500).required().messages({
    'string.max': 'Razão não pode ter mais de 500 caracteres',
    'any.required': 'Razão do cancelamento é obrigatória',
  }),
});

/**
 * Financial Category Validators
 */
export const createFinancialCategorySchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.max': 'Nome não pode ter mais de 100 caracteres',
    'any.required': 'Nome da categoria é obrigatório',
  }),
  categoryType: Joi.string()
    .valid('revenue', 'cost', 'expense')
    .required()
    .messages({
      'any.required': 'Tipo de categoria é obrigatório',
    }),
  dreGroup: Joi.string().max(50).optional(),
  parentId: Joi.string().uuid().optional(),
  isActive: Joi.boolean().default(true),
});

export const updateFinancialCategorySchema = Joi.object({
  name: Joi.string().max(100).optional(),
  categoryType: Joi.string()
    .valid('revenue', 'cost', 'expense')
    .optional(),
  dreGroup: Joi.string().max(50).optional(),
  parentId: Joi.string().uuid().optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Accounts Payable Validators
 */
export const createAccountPayableSchema = Joi.object({
  supplierName: Joi.string().max(255).required().messages({
    'any.required': 'Nome do fornecedor é obrigatório',
  }),
  description: Joi.string().max(500).required().messages({
    'string.max': 'Descrição não pode ter mais de 500 caracteres',
    'any.required': 'Descrição é obrigatória',
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Valor deve ser maior que zero',
    'any.required': 'Valor é obrigatório',
  }),
  dueDate: Joi.date().iso().required().messages({
    'date.iso': 'Data deve estar em formato ISO',
    'any.required': 'Data de vencimento é obrigatória',
  }),
  categoryId: Joi.string().uuid().required().messages({
    'string.guid': 'ID da categoria deve ser um UUID válido',
    'any.required': 'ID da categoria é obrigatório',
  }),
  notes: Joi.string().optional(),
});

export const recordAccountPayablePaymentSchema = Joi.object({
  paymentDate: Joi.date().iso().required().messages({
    'date.iso': 'Data deve estar em formato ISO',
    'any.required': 'Data do pagamento é obrigatória',
  }),
  notes: Joi.string().optional(),
});

export const updateAccountPayableSchema = Joi.object({
  description: Joi.string().max(500).optional(),
  dueDate: Joi.date().iso().optional(),
  paymentMethod: Joi.string().max(50).optional(),
  notes: Joi.string().optional(),
});

export const cancelAccountPayableSchema = Joi.object({
  reason: Joi.string().max(500).required().messages({
    'string.max': 'Razão não pode ter mais de 500 caracteres',
    'any.required': 'Razão do cancelamento é obrigatória',
  }),
});

/**
 * Accounts Receivable Validators
 */
export const createAccountReceivableSchema = Joi.object({
  customerId: Joi.string().uuid().optional().messages({
    'string.guid': 'ID do cliente deve ser um UUID válido',
  }),
  customerName: Joi.string().max(255).required().messages({
    'any.required': 'Nome do cliente é obrigatório',
  }),
  description: Joi.string().max(500).required().messages({
    'string.max': 'Descrição não pode ter mais de 500 caracteres',
    'any.required': 'Descrição é obrigatória',
  }),
  saleId: Joi.string().uuid().optional(),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Valor deve ser maior que zero',
    'any.required': 'Valor é obrigatório',
  }),
  dueDate: Joi.date().iso().required().messages({
    'date.iso': 'Data deve estar em formato ISO',
    'any.required': 'Data de vencimento é obrigatória',
  }),
  notes: Joi.string().optional(),
});

export const receivePaymentSchema = Joi.object({
  paymentDate: Joi.date().iso().required().messages({
    'date.iso': 'Data deve estar em formato ISO',
    'any.required': 'Data do recebimento é obrigatória',
  }),
  paymentMethod: Joi.string().max(50).required().messages({
    'any.required': 'Método de pagamento é obrigatório',
  }),
  notes: Joi.string().optional(),
});

export const updateAccountReceivableSchema = Joi.object({
  dueDate: Joi.date().iso().optional(),
  notes: Joi.string().optional(),
});

export const cancelAccountReceivableSchema = Joi.object({
  reason: Joi.string().max(500).required().messages({
    'string.max': 'Razão não pode ter mais de 500 caracteres',
    'any.required': 'Razão do cancelamento é obrigatória',
  }),
});

/**
 * DRE Report Validators
 */
const reportDateRangeQuerySchema = Joi.object({
  startDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'Data deve estar em formato ISO',
    'any.required': 'Data inicial é obrigatória',
  }),
  endDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'Data deve estar em formato ISO',
    'any.required': 'Data final é obrigatória',
  }),
})
  .custom((value, helpers) => {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return helpers.error('any.invalid');
    }

    if (start > end) {
      return helpers.error('any.custom');
    }

    return value;
  })
  .messages({
    'any.custom': 'Data final não pode ser anterior à data inicial',
    'any.invalid': 'Data deve estar em formato ISO',
  });

export const dreReportSchema = Joi.object({
  query: reportDateRangeQuerySchema,
});

export const cashFlowSchema = Joi.object({
  query: reportDateRangeQuerySchema,
});

export const comparativeReportSchema = Joi.object({
  query: reportDateRangeQuerySchema,
});

/**
 * Payment Method Config Validators
 */
export const upsertPaymentMethodConfigSchema = Joi.object({
  params: Joi.object({
    paymentMethod: Joi.string()
      .valid('cash', 'debit_card', 'credit_card', 'pix', 'other')
      .required(),
  }),
  body: Joi.object({
    feePercent: Joi.number().min(0).max(100).optional(),
    settlementDays: Joi.number().integer().min(0).allow(null).optional(),
    isActive: Joi.boolean().optional(),
  }).required(),
});
