import { Request, Response, NextFunction } from 'express';
import { geolocationService } from '@application/services/geolocation.service';

export class GeolocationController {
  /**
   * POST /api/v1/geolocation/search-cep
   * Busca endereço por CEP usando ViaCEP + BrasilAPI
   */
  async searchCep(req: Request, res: Response, next: NextFunction) {
    try {
      const { cep } = req.body;

      if (!cep) {
        return res.status(400).json({
          status: 'error',
          message: 'CEP é obrigatório',
        });
      }

      const addressData = await geolocationService.searchAddressByCep(cep);

      return res.status(200).json({
        status: 'success',
        data: addressData,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/v1/geolocation/calculate-distance
   * Calcula distância entre dois pontos usando OSRM
   */
  async calculateDistance(req: Request, res: Response, next: NextFunction) {
    try {
      const { lat1, lon1, lat2, lon2, useHaversine } = req.body;

      if (
        lat1 === undefined ||
        lon1 === undefined ||
        lat2 === undefined ||
        lon2 === undefined
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Latitude e longitude de origem e destino são obrigatórias',
        });
      }

      let routeInfo;

      if (useHaversine) {
        // Usar fórmula de Haversine (fallback mais rápido)
        const distance = geolocationService.calculateDistanceHaversine(
          lat1,
          lon1,
          lat2,
          lon2
        );
        routeInfo = {
          distanceKm: distance,
          duration: 0,
          method: 'haversine',
        };
      } else {
        // Usar OSRM (mais preciso, considera rotas)
        routeInfo = await geolocationService.calculateDistance(
          lon1,
          lat1,
          lon2,
          lat2
        );
      }

      return res.status(200).json({
        status: 'success',
        data: routeInfo,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/v1/geolocation/calculate-delivery-fee
   * Calcula taxa de entrega dinamicamente baseada na distância
   */
  async calculateDeliveryFee(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { distanceKm, baseFee, feePerKm, freeDistanceKm } = req.body;

      if (distanceKm === undefined || baseFee === undefined) {
        return res.status(400).json({
          status: 'error',
          message: 'distanceKm e baseFee são obrigatórios',
        });
      }

      const numericBaseFee = Number(baseFee);
      const numericFeePerKm = Number(feePerKm || 0);
      const numericFreeDistanceKm = Number(freeDistanceKm || 0);
      const distanceKmInt = Math.floor(Math.max(0, Number(distanceKm)));

      const fee = geolocationService.calculateDeliveryFee(
        Number(distanceKm),
        numericBaseFee,
        numericFeePerKm,
        numericFreeDistanceKm
      );

      return res.status(200).json({
        status: 'success',
        data: {
          distanceKm,
          calculatedFee: fee,
          breakdown: {
            baseFee: numericBaseFee,
            feePerKm: numericFeePerKm,
            freeDistanceKm: numericFreeDistanceKm,
            distanceKmInt,
            exceededDistance: Math.max(0, distanceKmInt - Math.floor(Math.max(0, numericFreeDistanceKm))),
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const geolocationController = new GeolocationController();
