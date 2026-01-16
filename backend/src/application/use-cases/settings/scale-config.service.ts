import prisma from '@infrastructure/database/prisma-client';

export type ScaleManufacturer = 'TOLEDO' | 'URANO' | 'FILIZOLA' | 'GENERIC';
export type ScaleProtocol = 'toledo_prix' | 'urano' | 'filizola' | 'generic';
export type ScaleParity = 'none' | 'even' | 'odd' | 'mark' | 'space';

export interface ScaleConfigDTO {
  isEnabled: boolean;
  manufacturer: ScaleManufacturer;
  model?: string | null;
  protocol: ScaleProtocol;
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: ScaleParity;
  stableOnly: boolean;
  readTimeoutMs: number;
  requestCommand?: string | null;
}

const parseBoolean = (raw: string | undefined, fallback: boolean) => {
  if (raw === undefined) return fallback;
  return raw.trim().toLowerCase() === 'true';
};

const parseNumber = (raw: string | undefined, fallback: number) => {
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

export class ScaleConfigService {
  private getEnvDefaults(): ScaleConfigDTO {
    return {
      isEnabled: parseBoolean(process.env.SCALE_ENABLED, false),
      manufacturer: ((process.env.SCALE_MANUFACTURER || 'TOLEDO').toUpperCase() as ScaleManufacturer) || 'TOLEDO',
      model: process.env.SCALE_MODEL || 'PRIX 3 FIT',
      protocol: ((process.env.SCALE_PROTOCOL || 'toledo_prix').toLowerCase() as ScaleProtocol) || 'toledo_prix',
      port: process.env.SCALE_PORT || 'COM3',
      baudRate: parseNumber(process.env.SCALE_BAUDRATE, 9600),
      dataBits: parseNumber(process.env.SCALE_DATABITS, 8),
      stopBits: parseNumber(process.env.SCALE_STOPBITS, 1),
      parity: ((process.env.SCALE_PARITY || 'none').toLowerCase() as ScaleParity) || 'none',
      stableOnly: parseBoolean(process.env.SCALE_STABLE_ONLY, true),
      readTimeoutMs: parseNumber(process.env.SCALE_READ_TIMEOUT_MS, 1500),
      requestCommand: process.env.SCALE_REQUEST_COMMAND || null,
    };
  }

  private normalizePayload(data: Partial<ScaleConfigDTO>): ScaleConfigDTO {
    const defaults = this.getEnvDefaults();

    return {
      isEnabled: data.isEnabled ?? defaults.isEnabled,
      manufacturer: (data.manufacturer || defaults.manufacturer).toUpperCase() as ScaleManufacturer,
      model: data.model ?? defaults.model ?? null,
      protocol: ((data.protocol || defaults.protocol) as ScaleProtocol) || 'toledo_prix',
      port: (data.port || defaults.port || 'COM3').trim(),
      baudRate: Number.isFinite(Number(data.baudRate)) ? Number(data.baudRate) : defaults.baudRate,
      dataBits: Number.isFinite(Number(data.dataBits)) ? Number(data.dataBits) : defaults.dataBits,
      stopBits: Number.isFinite(Number(data.stopBits)) ? Number(data.stopBits) : defaults.stopBits,
      parity: ((data.parity || defaults.parity) as ScaleParity) || 'none',
      stableOnly: data.stableOnly ?? defaults.stableOnly,
      readTimeoutMs: Number.isFinite(Number(data.readTimeoutMs)) ? Number(data.readTimeoutMs) : defaults.readTimeoutMs,
      requestCommand: data.requestCommand ?? defaults.requestCommand ?? null,
    };
  }

  async getConfig() {
    const existing = await (prisma as any).scaleConfig.findFirst();
    if (existing) {
      return {
        ...existing,
      } as ScaleConfigDTO & { id: string };
    }
    return {
      ...this.getEnvDefaults(),
      id: null,
    } as ScaleConfigDTO & { id: string | null };
  }

  async getEffectiveConfig(): Promise<ScaleConfigDTO> {
    const existing = await (prisma as any).scaleConfig.findFirst();
    if (existing) {
      return this.normalizePayload(existing);
    }
    return this.getEnvDefaults();
  }

  async upsertConfig(payload: Partial<ScaleConfigDTO>) {
    const data = this.normalizePayload(payload);
    const existing = await (prisma as any).scaleConfig.findFirst();

    if (existing) {
      return (prisma as any).scaleConfig.update({
        where: { id: existing.id },
        data: {
          isEnabled: data.isEnabled,
          manufacturer: data.manufacturer,
          model: data.model,
          protocol: data.protocol,
          port: data.port,
          baudRate: data.baudRate,
          dataBits: data.dataBits,
          stopBits: data.stopBits,
          parity: data.parity,
          stableOnly: data.stableOnly,
          readTimeoutMs: data.readTimeoutMs,
          requestCommand: data.requestCommand,
        },
      });
    }

    return (prisma as any).scaleConfig.create({
      data: {
        isEnabled: data.isEnabled,
        manufacturer: data.manufacturer,
        model: data.model,
        protocol: data.protocol,
        port: data.port,
        baudRate: data.baudRate,
        dataBits: data.dataBits,
        stopBits: data.stopBits,
        parity: data.parity,
        stableOnly: data.stableOnly,
        readTimeoutMs: data.readTimeoutMs,
        requestCommand: data.requestCommand,
      },
    });
  }

  getMockWeight(): number {
    const raw = (process.env.SCALE_MOCK_WEIGHT_KG || '').trim();
    const parsed = raw ? Number(raw.replace(',', '.')) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0.5;
  }
}