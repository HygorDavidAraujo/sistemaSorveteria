import { PrismaClient, PaymentMethod, PaymentMethodConfig } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';

export interface UpsertPaymentMethodConfigDTO {
  feePercent?: number;
  settlementDays?: number | null;
  isActive?: boolean;
}

const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'debit_card',
  'credit_card',
  'pix',
  'other',
];

export class PaymentMethodConfigService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  async list(): Promise<PaymentMethodConfig[]> {
    const existing = await this.prismaClient.paymentMethodConfig.findMany({
      orderBy: { paymentMethod: 'asc' },
    });

    // Ensure a stable list for the UI even if some methods are not yet configured
    const byMethod = new Map<PaymentMethod, PaymentMethodConfig>();
    for (const row of existing) byMethod.set(row.paymentMethod, row);

    const result: PaymentMethodConfig[] = [];
    for (const method of ALL_PAYMENT_METHODS) {
      const row = byMethod.get(method);
      if (row) {
        result.push(row);
        continue;
      }

      // Not persisted yet; return a virtual default config
      result.push({
        id: `virtual-${method}`,
        paymentMethod: method,
        feePercent: 0 as any,
        settlementDays: null,
        isActive: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      } as any);
    }

    return result;
  }

  async upsert(paymentMethod: PaymentMethod, data: UpsertPaymentMethodConfigDTO) {
    const feePercent = data.feePercent ?? undefined;
    const settlementDays = data.settlementDays === undefined ? undefined : data.settlementDays;

    return this.prismaClient.paymentMethodConfig.upsert({
      where: { paymentMethod },
      create: {
        paymentMethod,
        feePercent: feePercent ?? 0,
        settlementDays: settlementDays ?? null,
        isActive: data.isActive ?? true,
      } as any,
      update: {
        ...(feePercent !== undefined ? { feePercent } : {}),
        ...(settlementDays !== undefined ? { settlementDays } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      } as any,
    });
  }
}
