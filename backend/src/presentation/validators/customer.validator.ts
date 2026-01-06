import Joi from 'joi';

export const createCustomerSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(3).max(255).required().messages({
      'string.min': 'Nome deve ter no mínimo 3 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres',
      'any.required': 'Nome é obrigatório',
    }),
    phone: Joi.string().max(20).optional().allow(''),
    whatsapp: Joi.string().max(20).optional().allow(''),
    email: Joi.string().email().optional().allow(''),
    cpf: Joi.string().max(14).optional().allow(''),
    notes: Joi.string().optional().allow(''),
    birthDate: Joi.string().isoDate().optional().allow(''),
    gender: Joi.string().max(50).optional().allow(''),
    customerType: Joi.string().valid('pf', 'pj').optional(),
    acceptsMarketing: Joi.boolean().optional(),
    preferredContactMethod: Joi.string().max(50).optional().allow(''),
    street: Joi.string().max(255).optional().allow(''),
    number: Joi.string().max(20).optional().allow(''),
    complement: Joi.string().max(255).optional().allow(''),
    neighborhood: Joi.string().max(100).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    state: Joi.string().length(2).optional().allow(''),
    zipCode: Joi.string().max(10).optional().allow(''),
    referencePoint: Joi.string().optional().allow(''),
    addresses: Joi.array()
      .items(
        Joi.object({
          label: Joi.string().max(100).optional(),
          street: Joi.string().max(255).required(),
          number: Joi.string().max(20).optional(),
          complement: Joi.string().max(255).optional(),
          neighborhood: Joi.string().max(100).optional(),
          city: Joi.string().max(100).required(),
          state: Joi.string().length(2).required(),
          zipCode: Joi.string().max(10).optional(),
          referencePoint: Joi.string().optional(),
          isDefault: Joi.boolean().optional(),
        })
      )
      .optional(),
  }),
});

export const updateCustomerSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(3).max(255).optional(),
    phone: Joi.string().max(20).optional(),
    whatsapp: Joi.string().max(20).optional(),
    email: Joi.string().email().optional(),
    cpf: Joi.string().max(14).optional(),
    notes: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    birthDate: Joi.string().isoDate().optional().allow(''),
    gender: Joi.string().max(50).optional().allow(''),
    customerType: Joi.string().valid('pf', 'pj').optional(),
    acceptsMarketing: Joi.boolean().optional(),
    preferredContactMethod: Joi.string().max(50).optional().allow(''),
    street: Joi.string().max(255).optional().allow(''),
    number: Joi.string().max(20).optional().allow(''),
    complement: Joi.string().max(255).optional().allow(''),
    neighborhood: Joi.string().max(100).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    state: Joi.string().length(2).optional().allow(''),
    zipCode: Joi.string().max(10).optional().allow(''),
    referencePoint: Joi.string().optional().allow(''),
  }),
});

export const customerIdSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
});

export const searchCustomersSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().optional(),
    isActive: Joi.string().valid('true', 'false').optional(),
    limit: Joi.number().min(1).max(100).optional(),
    offset: Joi.number().min(0).optional(),
  }),
});

export const addAddressSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    label: Joi.string().max(100).optional(),
    street: Joi.string().max(255).required(),
    number: Joi.string().max(20).optional(),
    complement: Joi.string().max(255).optional(),
    neighborhood: Joi.string().max(100).optional(),
    city: Joi.string().max(100).required(),
    state: Joi.string().length(2).required(),
    zipCode: Joi.string().max(10).optional(),
    referencePoint: Joi.string().optional(),
    isDefault: Joi.boolean().optional(),
  }),
});

export const addressIdSchema = Joi.object({
  params: Joi.object({
    addressId: Joi.string().uuid().required(),
  }),
});
