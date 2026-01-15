import { Router } from 'express';
import { geolocationController } from '../controllers/geolocation.controller';
import { validate } from '../middlewares/validate';
import Joi from 'joi';

const router = Router();

/**
 * Schemas de validação
 */
const searchCepSchema = Joi.object({
  cep: Joi.string().required().min(8).max(10),
});

const calculateDistanceSchema = Joi.object({
  lat1: Joi.number().required(),
  lon1: Joi.number().required(),
  lat2: Joi.number().required(),
  lon2: Joi.number().required(),
  useHaversine: Joi.boolean().optional().default(false),
});

const calculateDeliveryFeeSchema = Joi.object({
  distanceKm: Joi.number().required().min(0),
  baseFee: Joi.number().required().min(0),
  feePerKm: Joi.number().optional().default(0).min(0),
  // Até este km inteiro (ex.: 1km) cobra apenas a taxa base
  freeDistanceKm: Joi.number().optional().default(1).min(0),
});

/**
 * POST /api/v1/geolocation/search-cep
 * Busca endereço por CEP (ViaCEP + BrasilAPI)
 * PÚBLICO - Sem autenticação requerida
 */
router.post(
  '/search-cep',
  validate(searchCepSchema),
  geolocationController.searchCep
);

/**
 * POST /api/v1/geolocation/calculate-distance
 * Calcula distância entre dois pontos (OSRM ou Haversine)
 * PÚBLICO - Sem autenticação requerida
 */
router.post(
  '/calculate-distance',
  validate(calculateDistanceSchema),
  geolocationController.calculateDistance
);

/**
 * POST /api/v1/geolocation/calculate-delivery-fee
 * Calcula taxa de entrega dinamicamente
 * PÚBLICO - Sem autenticação requerida
 */
router.post(
  '/calculate-delivery-fee',
  validate(calculateDeliveryFeeSchema),
  geolocationController.calculateDeliveryFee
);

export default router;
