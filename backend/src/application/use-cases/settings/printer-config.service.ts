import prisma from '@infrastructure/database/prisma-client';

export interface PrinterConfigDTO {
  paperWidth: string;
  contentWidth: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  marginMm: number;
  maxCharsPerLine: number;
  showLogo: boolean;
  showCompanyInfo: boolean;
  footerText?: string | null;
  footerSecondaryText?: string | null;
}

const DEFAULT_PRINTER_CONFIG: PrinterConfigDTO = {
  paperWidth: '80mm',
  contentWidth: '70mm',
  fontFamily: 'Consolas',
  fontSize: 12,
  lineHeight: 1.25,
  marginMm: 5,
  maxCharsPerLine: 42,
  showLogo: true,
  showCompanyInfo: true,
  footerText: 'Documento não fiscal',
  footerSecondaryText: 'Gelatini © 2026',
};

export class PrinterConfigService {
  async getConfig() {
    const existing = await (prisma as any).printerConfig.findFirst();
    return existing || DEFAULT_PRINTER_CONFIG;
  }

  async upsertConfig(data: Partial<PrinterConfigDTO>) {
    const existing = await (prisma as any).printerConfig.findFirst();
    const payload: PrinterConfigDTO = {
      ...DEFAULT_PRINTER_CONFIG,
      ...(existing || {}),
      ...data,
    } as PrinterConfigDTO;

    if (existing) {
      return (prisma as any).printerConfig.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return (prisma as any).printerConfig.create({
      data: payload,
    });
  }
}
