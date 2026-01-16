import Joi from 'joi';

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

export const productRankingReportSchema = Joi.object({
  query: reportDateRangeQuerySchema.keys({
    metric: Joi.string().valid('revenue', 'quantity').optional(),
    limit: Joi.number().integer().min(1).max(200).optional(),
  }),
});

export const productABCCurveReportSchema = Joi.object({
  query: reportDateRangeQuerySchema,
});

export const productTimeSeriesReportSchema = Joi.object({
  query: reportDateRangeQuerySchema.keys({
    granularity: Joi.string().valid('day', 'month', 'year').optional(),
  }),
});

export const birthdayCustomersReportSchema = Joi.object({
  query: reportDateRangeQuerySchema,
});

export const salesByModuleReportSchema = Joi.object({
  query: reportDateRangeQuerySchema,
});

export const salesByPaymentMethodReportSchema = Joi.object({
  query: reportDateRangeQuerySchema,
});

export const cardFeesByPaymentMethodReportSchema = Joi.object({
  query: reportDateRangeQuerySchema,
});
