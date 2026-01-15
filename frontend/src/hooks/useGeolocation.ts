import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api';

export interface AddressData {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  cep: string;
}

export function useAddressByCep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  const searchCep = useCallback(async (cep: string) => {
    // Limpar estado anterior
    setError(null);
    setAddressData(null);

    // Validar CEP
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setError('CEP deve conter 8 dígitos');
      return null;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/geolocation/search-cep', {
        cep: cleanCep,
      });

      if (response.status === 'success' && response.data) {
        setAddressData(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Erro ao buscar endereço');
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        'CEP não encontrado';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAddress = useCallback(() => {
    setAddressData(null);
    setError(null);
  }, []);

  return {
    searchCep,
    clearAddress,
    addressData,
    loading,
    error,
  };
}

export interface DistanceData {
  distanceKm: number;
  duration: number;
}

export function useCalculateDistance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateDistance = useCallback(
    async (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
      useHaversine = false
    ): Promise<DistanceData | null> => {
      setError(null);

      // Validar coordenadas
      if (!lat1 || !lon1 || !lat2 || !lon2) {
        setError('Coordenadas inválidas');
        return null;
      }

      try {
        setLoading(true);
        const response = await apiClient.post('/geolocation/calculate-distance', {
          lat1,
          lon1,
          lat2,
          lon2,
          useHaversine,
        });

        if (response.status === 'success' && response.data) {
          return response.data;
        } else {
          throw new Error(response.message || 'Erro ao calcular distância');
        }
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          'Erro ao calcular distância';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    calculateDistance,
    loading,
    error,
  };
}

export interface DeliveryFeeData {
  distanceKm: number;
  calculatedFee: number;
  breakdown: {
    baseFee: number;
    feePerKm: number;
    freeDistanceKm: number;
    exceededDistance: number;
  };
}

export function useCalculateDeliveryFee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateDeliveryFee = useCallback(
    async (
      distanceKm: number,
      baseFee: number,
      feePerKm: number = 0,
      freeDistanceKm: number = 0
    ): Promise<DeliveryFeeData | null> => {
      setError(null);

      try {
        setLoading(true);
        const response = await apiClient.post(
          '/geolocation/calculate-delivery-fee',
          {
            distanceKm,
            baseFee,
            feePerKm,
            freeDistanceKm,
          }
        );

        if (response.status === 'success' && response.data) {
          return response.data;
        } else {
          throw new Error(response.message || 'Erro ao calcular taxa');
        }
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          'Erro ao calcular taxa de entrega';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    calculateDeliveryFee,
    loading,
    error,
  };
}
