import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { ScaleConfigService } from '@application/use-cases/settings/scale-config.service';
import { ScaleReaderService } from '@application/services/scale-reader.service';
import { SerialPort } from 'serialport';
import axios from 'axios';
import fs from 'fs';

const scaleConfigService = new ScaleConfigService();
const scaleReaderService = new ScaleReaderService();

const normalizeUrl = (raw?: string) => (raw ? raw.replace(/\/+$/, '') : '');
const proxyBaseUrl = normalizeUrl(process.env.SCALE_PROXY_URL);
const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKERIZED === 'true';
const allowMockOnError =
  (process.env.SCALE_ALLOW_MOCK_ON_ERROR ?? (isDocker ? 'true' : 'false'))
    .toLowerCase()
    .trim() === 'true';

const listLinuxSerialPorts = () => {
  try {
    const entries = fs.readdirSync('/dev');
    return entries
      .filter((name) => name.startsWith('ttyUSB') || name.startsWith('ttyACM'))
      .map((name) => ({ path: `/dev/${name}` }));
  } catch {
    return [];
  }
};

const router = Router();

// Scale endpoints are protected (same auth as other operational routes)
router.use(authenticate);

/**
 * GET /scale/ports
 * List available serial ports (USB/Serial adapters)
 */
router.get('/ports', async (req: Request, res: Response) => {
  try {
    if (proxyBaseUrl) {
      const proxyResp = await axios.get(`${proxyBaseUrl}/scale/ports`, {
        timeout: 4000,
      });
      res.json(proxyResp.data);
      return;
    }
    const ports = await SerialPort.list();
    res.json({
      ports: ports.map((port) => ({
        path: port.path,
        friendlyName: (port as any)?.friendlyName,
        manufacturer: port.manufacturer,
        vendorId: port.vendorId,
        productId: port.productId,
      })),
    });
  } catch (error: any) {
    // In Docker (especially on Windows), serial ports may be inaccessible.
    // Return an empty list with a warning instead of failing the request.
    const linuxPorts = listLinuxSerialPorts();
    res.json({
      ports: linuxPorts,
      warning:
        linuxPorts.length === 0
          ? error?.message || 'Não foi possível listar portas seriais no servidor atual'
          : 'Portas listadas via /dev (fallback).',
    });
  }
});

/**
 * GET /scale/weight
 * Mock endpoint for reading weight from a scale.
 * Returns weight in kilograms.
 *
 * Env:
 * - SCALE_MOCK_WEIGHT_KG: fixed numeric value (e.g. 0.372)
 */
router.get('/weight', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (proxyBaseUrl) {
      const proxyResp = await axios.get(`${proxyBaseUrl}/scale/weight`, {
        timeout: 4000,
      });
      res.json(proxyResp.data);
      return;
    }
    const config = await scaleConfigService.getEffectiveConfig();

    if (!config.isEnabled) {
      const weightKg = scaleConfigService.getMockWeight();
      res.json({
        weightKg,
        unit: 'kg',
        isMock: true,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const reading = await scaleReaderService.readWeight(config);
    res.json({
      weightKg: reading.weightKg,
      unit: 'kg',
      isMock: false,
      isStable: reading.isStable,
      raw: reading.raw,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (allowMockOnError) {
      const weightKg = scaleConfigService.getMockWeight();
      res.json({
        weightKg,
        unit: 'kg',
        isMock: true,
        warning: 'Leitura real indisponível no ambiente atual. Retornando mock.',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next(error);
  }
});

export default router;
