import Joi from 'joi';

export const settingsValidators = {
  // Company Info
  getCompanyInfo: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  createOrUpdateCompanyInfo: Joi.object({
    body: Joi.object({
      cnpj: Joi.string().length(18).pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).required(),
      businessName: Joi.string().max(255).required(),
      tradeName: Joi.string().max(255).required(),
      stateRegistration: Joi.string().max(50).allow('').optional(),
      municipalRegistration: Joi.string().max(50).allow('').optional(),
      street: Joi.string().max(255).required(),
      number: Joi.string().max(20).required(),
      complement: Joi.string().max(255).allow('').optional(),
      neighborhood: Joi.string().max(100).required(),
      city: Joi.string().max(100).required(),
      state: Joi.string().length(2).required(),
      zipCode: Joi.string().length(8).pattern(/^\d{8}$/).required(),
      email: Joi.string().email().allow('').optional(),
      phone: Joi.string().max(20).allow('').optional(),
      whatsapp: Joi.string().max(20).allow('').optional(),
      logoUrl: Joi.string().allow('').optional(),
      logoBase64: Joi.string().base64({ paddingRequired: false }).allow('').optional(),
      logoMimeType: Joi.string().max(100).allow('').optional(),
      // Geolocation (store origin)
      latitude: Joi.number().min(-90).max(90).optional().allow(null),
      longitude: Joi.number().min(-180).max(180).optional().allow(null),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  // Delivery Fees
  listDeliveryFees: Joi.object({
    body: Joi.object({}),
    query: Joi.object({
      isActive: Joi.string().valid('true', 'false').optional(),
      feeType: Joi.string().valid('neighborhood', 'distance').optional(),
    }),
    params: Joi.object({}),
  }),

  getDeliveryFeeById: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  createDeliveryFee: Joi.object({
    body: Joi.object({
      feeType: Joi.string().valid('neighborhood', 'distance').required(),
      // Neighborhood-based
      neighborhood: Joi.when('feeType', {
        is: 'neighborhood',
        then: Joi.string().max(100).required(),
        otherwise: Joi.string().optional(),
      }),
      city: Joi.when('feeType', {
        is: 'neighborhood',
        then: Joi.string().max(100).required(),
        otherwise: Joi.string().optional(),
      }),
      fee: Joi.when('feeType', {
        is: 'neighborhood',
        then: Joi.number().min(0).required(),
        otherwise: Joi.number().optional(),
      }),
      minOrderValue: Joi.number().min(0).default(0),
      freeDeliveryAbove: Joi.number().min(0).optional(),
      // Distance-based
      maxDistance: Joi.when('feeType', {
        is: 'distance',
        then: Joi.number().positive().required(),
        otherwise: Joi.number().optional(),
      }),
      feePerKm: Joi.when('feeType', {
        is: 'distance',
        then: Joi.number().positive().required(),
        otherwise: Joi.number().optional(),
      }),
      baseFee: Joi.when('feeType', {
        is: 'distance',
        then: Joi.number().min(0).required(),
        otherwise: Joi.number().optional(),
      }),
      isActive: Joi.boolean().default(true),
    }),
    query: Joi.object({}),
    params: Joi.object({}),
  }),

  updateDeliveryFee: Joi.object({
    body: Joi.object({
      feeType: Joi.string().valid('neighborhood', 'distance').optional(),
      neighborhood: Joi.string().max(100).optional(),
      city: Joi.string().max(100).optional(),
      fee: Joi.number().min(0).optional(),
      minOrderValue: Joi.number().min(0).optional(),
      freeDeliveryAbove: Joi.number().min(0).optional().allow(null),
      maxDistance: Joi.number().positive().optional(),
      feePerKm: Joi.number().positive().optional(),
      baseFee: Joi.number().min(0).optional(),
      isActive: Joi.boolean().optional(),
    }),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),

  deleteDeliveryFee: Joi.object({
    body: Joi.object({}),
    query: Joi.object({}),
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  }),
};
