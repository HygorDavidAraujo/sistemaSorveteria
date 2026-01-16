import { SerialPort } from 'serialport';
import logger from '@shared/utils/logger';
import { BadRequestError } from '@shared/errors/app-error';
import type { ScaleConfigDTO } from '@application/use-cases/settings/scale-config.service';

interface ScaleReading {
  weightKg: number;
  isStable: boolean;
  raw: string;
}

const normalizeLine = (line: string) => line.replace(/[\x00-\x1F]+/g, ' ').trim();

const parseStable = (line: string) => {
  if (/\b(US|UNSTABLE|MOTION|MOV)\b/i.test(line)) return false;
  if (/\b(ST|STABLE)\b/i.test(line)) return true;
  return false;
};

const extractWeight = (line: string) => {
  const matches = Array.from(line.matchAll(/-?\d+(?:[\.,]\d+)?/g)).map((m) => m[0]);
  if (matches.length === 0) return null;
  const raw = matches[matches.length - 1];
  const normalized = raw.replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const hasKg = /kg\b/i.test(line);
  const hasG = /\bg\b/i.test(line) && !hasKg;

  if (hasG) {
    return value / 1000;
  }
  return value;
};

const parseLine = (line: string, protocol: ScaleConfigDTO['protocol']): ScaleReading | null => {
  const cleaned = normalizeLine(line);
  if (!cleaned) return null;

  let weight = extractWeight(cleaned);
  if (weight === null) return null;

  // Toledo Prix (Prt1/Prt3) can send 5 digits without decimal (kg with 3 decimals).
  if (
    protocol === 'toledo_prix' &&
    !/[\.,]/.test(cleaned) &&
    /^\d{5}$/.test(cleaned)
  ) {
    weight = weight / 1000;
  }

  const stable = parseStable(cleaned);

  if (protocol === 'toledo_prix') {
    return { weightKg: weight, isStable: stable, raw: cleaned };
  }

  if (protocol === 'urano') {
    return { weightKg: weight, isStable: stable, raw: cleaned };
  }

  if (protocol === 'filizola') {
    return { weightKg: weight, isStable: stable, raw: cleaned };
  }

  return { weightKg: weight, isStable: stable, raw: cleaned };
};

const decodeCommand = (command?: string | null) => {
  if (!command) return null;
  return command
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
};

export class ScaleReaderService {
  async readWeight(config: ScaleConfigDTO): Promise<ScaleReading> {
    if (!config.port) {
      throw new BadRequestError('Porta da balança não configurada');
    }

    const port = new SerialPort({
      path: config.port,
      baudRate: config.baudRate,
      dataBits: config.dataBits as 7 | 8,
      stopBits: config.stopBits as 1 | 2,
      parity: config.parity,
      autoOpen: false,
    });

    await new Promise<void>((resolve, reject) => {
      port.open((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    const requestCommand = decodeCommand(config.requestCommand);
    if (requestCommand) {
      try {
        port.write(requestCommand);
      } catch (err) {
        logger.warn('Scale command write failed', { err });
      }
    }

    return new Promise<ScaleReading>((resolve, reject) => {
      let buffer = '';
      let lastReading: ScaleReading | null = null;
      const timeoutMs = Math.max(500, config.readTimeoutMs || 1500);

      const cleanup = (error?: Error) => {
        port.removeAllListeners('data');
        port.removeAllListeners('error');
        port.close(() => {
          if (error) {
            reject(error);
          } else if (lastReading) {
            if (config.stableOnly && !lastReading.isStable) {
              reject(new BadRequestError('Peso instável na leitura da balança'));
            } else {
              resolve(lastReading);
            }
          } else {
            reject(new BadRequestError('Nenhuma leitura válida da balança'));
          }
        });
      };

      const timer = setTimeout(() => {
        cleanup();
      }, timeoutMs);

      port.on('error', (err) => {
        clearTimeout(timer);
        cleanup(err as Error);
      });

      port.on('data', (data) => {
        buffer += data.toString('utf8');
        const lines = buffer.split(/[\r\n\x03]+/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          const reading = parseLine(line, config.protocol);
          if (!reading) continue;

          if (reading.weightKg <= 0 || !Number.isFinite(reading.weightKg)) {
            continue;
          }

          lastReading = reading;

          if (!config.stableOnly || reading.isStable) {
            clearTimeout(timer);
            cleanup();
            return;
          }
        }
      });
    });
  }
}