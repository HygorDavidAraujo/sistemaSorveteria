import Joi from 'joi';

export const userValidators = {
  listUsers: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  getUserById: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  createUser: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'E-mail inválido',
        'any.required': 'E-mail é obrigatório',
      }),
      password: Joi.string().min(6).required().messages({
        'string.min': 'Senha deve ter no mínimo 6 caracteres',
        'any.required': 'Senha é obrigatória',
      }),
      fullName: Joi.string().min(3).max(255).required().messages({
        'string.min': 'Nome deve ter no mínimo 3 caracteres',
        'string.max': 'Nome deve ter no máximo 255 caracteres',
        'any.required': 'Nome completo é obrigatório',
      }),
      role: Joi.string().valid('admin', 'cashier').required().messages({
        'any.only': 'Função deve ser admin ou cashier',
        'any.required': 'Função é obrigatória',
      }),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  updateUser: Joi.object({
    body: Joi.object({
      email: Joi.string().email().optional().messages({
        'string.email': 'E-mail inválido',
      }),
      password: Joi.string().min(6).optional().messages({
        'string.min': 'Senha deve ter no mínimo 6 caracteres',
      }),
      fullName: Joi.string().min(3).max(255).optional().messages({
        'string.min': 'Nome deve ter no mínimo 3 caracteres',
        'string.max': 'Nome deve ter no máximo 255 caracteres',
      }),
      role: Joi.string().valid('admin', 'cashier').optional().messages({
        'any.only': 'Função deve ser admin ou cashier',
      }),
      isActive: Joi.boolean().optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  toggleActiveUser: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  deleteUser: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),
};
