import axios from 'axios';
import { AppError } from '@shared/errors/app-error';

export interface AddressData {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  cep: string;
}

export interface RouteInfo {
  distance: number; // em metros
  duration: number; // em segundos
  distanceKm: number; // em km
}

export class GeolocationService {
  private readonly viacepUrl = 'https://viacep.com.br/ws';
  private readonly brasilapiUrl = 'https://brasilapi.com.br/api/cep/v1';
  private readonly osrmUrl = 'http://router.project-osrm.org/route/v1';
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  private hasValidCoordinates(latitude: number, longitude: number) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    // Treat (0,0) as "missing" for our Brazil-focused use-case.
    if (Math.abs(latitude) < 1e-9 && Math.abs(longitude) < 1e-9) return false;
    return true;
  }

  private buildGeocodeQuery(input: {
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  }) {
    const parts = [
      input.logradouro,
      input.bairro,
      input.cidade,
      input.estado,
      input.cep,
      'Brasil',
    ]
      .map((p) => (p ?? '').trim())
      .filter(Boolean);

    // Always try at least CEP + Brasil.
    if (parts.length === 0 && input.cep) return `${input.cep} Brasil`;
    return parts.join(', ');
  }

  private async geocodeWithNominatim(query: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const response = await axios.get(this.nominatimUrl, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
        },
        headers: {
          // Nominatim requires an identifiable User-Agent.
          'User-Agent': 'sistemaSorveteria/1.0 (CEP geocoding)',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        timeout: 10000,
      });

      const first = Array.isArray(response.data) ? response.data[0] : null;
      if (!first) return null;

      const latitude = Number(first.lat);
      const longitude = Number(first.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      return { latitude, longitude };
    } catch (error: any) {
      console.warn('Nominatim geocoding falhou:', error.message);
      return null;
    }
  }

  private async enrichCoordinatesIfMissing(input: AddressData): Promise<AddressData> {
    if (this.hasValidCoordinates(input.latitude, input.longitude)) return input;

    const query = this.buildGeocodeQuery({
      logradouro: input.logradouro,
      bairro: input.bairro,
      cidade: input.cidade,
      estado: input.estado,
      cep: input.cep,
    });

    const geocoded = await this.geocodeWithNominatim(query);
    if (!geocoded) return input;

    return {
      ...input,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    };
  }

  /**
   * Busca endereço por CEP usando ViaCEP + BrasilAPI como fallback
   * Retorna logradouro, bairro, cidade, estado e coordenadas
   */
  async searchAddressByCep(cep: string): Promise<AddressData> {
    // Limpar CEP
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      throw new AppError('CEP inválido. Deve conter 8 dígitos', 400);
    }

    try {
      // Tentar ViaCEP primeiro
      return await this.searchViaCep(cleanCep);
    } catch (error: any) {
      console.warn('ViaCEP falhou, tentando BrasilAPI...', error.message);
      try {
        // Fallback para BrasilAPI
        return await this.searchBrasilApi(cleanCep);
      } catch (brasilError: any) {
        console.error('BrasilAPI também falhou:', brasilError.message);
        throw new AppError(
          'CEP não encontrado em nenhuma base de dados',
          404
        );
      }
    }
  }

  /**
   * Busca endereço via ViaCEP
   */
  private async searchViaCep(cep: string): Promise<AddressData> {
    try {
      const response = await axios.get(
        `${this.viacepUrl}/${cep}/json/`,
        { timeout: 5000 }
      );

      if (response.data.erro) {
        throw new AppError('CEP não encontrado no ViaCEP', 404);
      }

      // ViaCEP não retorna coordenadas, precisamos buscar do BrasilAPI para lat/long
      const coords = await this.getBrasilApiCoordinates(cep);

      const address: AddressData = {
        logradouro: response.data.logradouro || '',
        bairro: response.data.bairro || '',
        cidade: response.data.localidade || '',
        estado: response.data.uf || '',
        latitude: coords.latitude,
        longitude: coords.longitude,
        cep,
      };

      return await this.enrichCoordinatesIfMissing(address);
    } catch (error: any) {
      if (error.response?.status === 404 || error.message?.includes('não encontrado')) {
        throw error;
      }
      throw new AppError(`Erro ao buscar CEP no ViaCEP: ${error.message}`, 500);
    }
  }

  /**
   * Busca endereço via BrasilAPI
   */
  private async searchBrasilApi(cep: string): Promise<AddressData> {
    try {
      const response = await axios.get(
        `${this.brasilapiUrl}/${cep}`,
        { timeout: 5000 }
      );

      if (response.data.status === 400) {
        throw new AppError('CEP não encontrado no BrasilAPI', 404);
      }

      // BrasilAPI já retorna latitude e longitude
      const address: AddressData = {
        logradouro: response.data.street || response.data.address || '',
        bairro: response.data.neighborhood || '',
        cidade: response.data.city || '',
        estado: response.data.state || '',
        latitude: response.data.location?.coordinates[1] || 0,
        longitude: response.data.location?.coordinates[0] || 0,
        cep,
      };

      return await this.enrichCoordinatesIfMissing(address);
    } catch (error: any) {
      if (error.response?.status === 404 || error.message?.includes('não encontrado')) {
        throw error;
      }
      throw new AppError(`Erro ao buscar CEP no BrasilAPI: ${error.message}`, 500);
    }
  }

  /**
   * Busca coordenadas (lat/long) via BrasilAPI para um CEP
   * Usado como complemento quando ViaCEP é a fonte principal
   */
  private async getBrasilApiCoordinates(
    cep: string
  ): Promise<{ latitude: number; longitude: number }> {
    try {
      const response = await axios.get(
        `${this.brasilapiUrl}/${cep}`,
        { timeout: 5000 }
      );

      if (response.data.status === 400) {
        // Se BrasilAPI não tiver, usar coordenada padrão (será ajustada depois)
        return { latitude: 0, longitude: 0 };
      }

      return {
        latitude: response.data.location?.coordinates[1] || 0,
        longitude: response.data.location?.coordinates[0] || 0,
      };
    } catch (error: any) {
      console.warn('Erro ao buscar coordenadas:', error.message);
      return { latitude: 0, longitude: 0 };
    }
  }

  /**
   * Calcula distância entre dois pontos usando OSRM
   * @param lon1 Longitude da loja
   * @param lat1 Latitude da loja
   * @param lon2 Longitude do cliente
   * @param lat2 Latitude do cliente
   * @returns Distância em km e tempo em minutos
   */
  async calculateDistance(
    lon1: number,
    lat1: number,
    lon2: number,
    lat2: number
  ): Promise<RouteInfo> {
    try {
      // OSRM espera: /driving/lon1,lat1;lon2,lat2
      const response = await axios.get(
        `${this.osrmUrl}/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`,
        { timeout: 10000 }
      );

      if (response.data.code !== 'Ok') {
        throw new AppError(
          `OSRM retornou erro: ${response.data.message}`,
          400
        );
      }

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new AppError('Rota não encontrada entre os pontos', 404);
      }

      const route = response.data.routes[0];
      const distanceKm = route.distance / 1000; // Converter metros para km
      const durationMinutes = Math.ceil(route.duration / 60); // Converter segundos para minutos

      return {
        distance: route.distance,
        duration: route.duration,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
      };
    } catch (error: any) {
      if (error.message?.includes('AppError')) {
        throw error;
      }
      throw new AppError(
        `Erro ao calcular distância: ${error.message}`,
        500
      );
    }
  }

  /**
   * Calcula a taxa de entrega dinamicamente baseada na distância
   * Usa as configurações de entrega armazenadas
   */
  calculateDeliveryFee(
    distanceKm: number,
    baseFee: number,
    feePerKm: number,
    freeDistanceKm: number = 0
  ): number {
    // Regra de cobrança (km inteiro):
    // - Até freeDistanceKm (ex.: 1km): cobra apenas a taxa base
    // - Acima: cobra taxa base + (taxaPorKm * distânciaKmInteiro)
    const distanceKmInt = Math.floor(Math.max(0, distanceKm));
    const baseOnlyUntilKmInt = Math.floor(Math.max(0, freeDistanceKm));

    if (distanceKmInt <= baseOnlyUntilKmInt) {
      return parseFloat(baseFee.toFixed(2));
    }

    // Cobra apenas o excedente acima do limite (km inteiro)
    const exceededKmInt = Math.max(0, distanceKmInt - baseOnlyUntilKmInt);
    const totalFee = baseFee + feePerKm * exceededKmInt;
    return parseFloat(totalFee.toFixed(2));
  }

  /**
   * Calcula distância em linha reta usando Fórmula de Haversine
   * Útil como fallback se OSRM estiver indisponível
   * Retorna distância aproximada em km
   */
  calculateDistanceHaversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }
}

export const geolocationService = new GeolocationService();
