import Joi from 'joi';

export const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'E-mail inválido',
      'any.required': 'E-mail é obrigatório',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Senha deve ter no mínimo 6 caracteres',
      'any.required': 'Senha é obrigatória',
    }),
  }),
});

export const registerSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'E-mail inválido',
      'any.required': 'E-mail é obrigatório',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Senha deve ter no mínimo 6 caracteres',
      'any.required': 'Senha é obrigatória',
    }),
    fullName: Joi.string().min(3).required().messages({
      'string.min': 'Nome deve ter no mínimo 3 caracteres',
      'any.required': 'Nome completo é obrigatório',
    }),
    role: Joi.string().valid('admin', 'manager', 'cashier').required().messages({
      'any.only': 'Perfil deve ser admin, manager ou cashier',
      'any.required': 'Perfil é obrigatório',
    }),
  }),
});

export const refreshTokenSchema = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Token de atualização é obrigatório',
    }),
  }),
});
