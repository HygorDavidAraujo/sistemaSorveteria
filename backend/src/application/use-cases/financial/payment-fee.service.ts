import { PrismaClient, PaymentMethod } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';

export interface PaymentFeeItem {
  paymentMethod: PaymentMethod;
  amount: number;
}

export interface PaymentFeeTransactionInput {
  source: 'sale' | 'comanda' | 'delivery';
  referenceId: string;
  referenceLabel: string;
  payments: PaymentFeeItem[];
  transactionDate: Date;
  createdById: string;
  saleId?: string;
  comandaId?: string;
  deliveryOrderId?: string;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  debit_card: 'Cartão Débito',
  credit_card: 'Cartão Crédito',
  pix: 'PIX',
  other: 'Outros',
};

const normalizeAmount = (value: number) => Number(Number(value).toFixed(2));

export class PaymentFeeService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  private async ensureFeeCategory() {
    const existing = await this.prismaClient.financialCategory.findFirst({
      where: { name: 'Despesas Financeiras - Taxas de Cartão' },
      select: { id: true, isActive: true, categoryType: true },
    });

    if (existing) {
      return existing;
    }

    return this.prismaClient.financialCategory.create({
      data: {
        name: 'Despesas Financeiras - Taxas de Cartão',
        categoryType: 'expense',
        dreGroup: 'financial_result',
        isActive: true,
      },
      select: { id: true, isActive: true, categoryType: true },
    });
  }

  private async getFeeConfigMap() {
    const configs = await this.prismaClient.paymentMethodConfig.findMany({
      where: { isActive: true },
    });

    const map = new Map<PaymentMethod, number>();
    for (const cfg of configs) {
      map.set(cfg.paymentMethod, Number(cfg.feePercent || 0));
    }

    return map;
  }

  async createCardFeeTransaction(input: PaymentFeeTransactionInput) {
    if (!input.payments || input.payments.length === 0) return null;

    const feeMap = await this.getFeeConfigMap();
    const totalsByMethod = new Map<PaymentMethod, number>();

    for (const payment of input.payments) {
      const current = totalsByMethod.get(payment.paymentMethod) ?? 0;
      totalsByMethod.set(payment.paymentMethod, current + Number(payment.amount || 0));
    }

    const breakdown: Array<{ method: PaymentMethod; amount: number; feePercent: number; feeAmount: number }> = [];

    for (const [method, amount] of totalsByMethod.entries()) {
      const feePercent = feeMap.get(method) ?? 0;
      if (!feePercent || feePercent <= 0) continue;
      const feeAmount = normalizeAmount((amount * feePercent) / 100);
      if (feeAmount <= 0) continue;

      breakdown.push({
        method,
        amount: normalizeAmount(amount),
        feePercent,
        feeAmount,
      });
    }

    if (breakdown.length === 0) return null;

    const category = await this.ensureFeeCategory();
    if (!category.isActive || category.categoryType !== 'expense') return null;

    const created: any[] = [];

    for (const item of breakdown) {
      const referenceNumber = `CARD_FEE-${input.source.toUpperCase()}-${input.referenceId}-${item.method}`;

      const existing = await this.prismaClient.financialTransaction.findFirst({
        where: { referenceNumber },
        select: { id: true },
      });

      if (existing) continue;

      const description = `Taxas de cartão (${input.referenceLabel}) - ${METHOD_LABEL[item.method]} ${item.feePercent}% sobre R$ ${item.amount.toFixed(2)} = R$ ${item.feeAmount.toFixed(2)}`;

      const transaction = await this.prismaClient.financialTransaction.create({
        data: {
          categoryId: category.id,
          transactionType: 'expense',
          amount: normalizeAmount(item.feeAmount),
          description,
          referenceNumber,
          transactionDate: input.transactionDate,
          dueDate: input.transactionDate,
          paidAt: input.transactionDate,
          status: 'paid',
          createdById: input.createdById,
          saleId: input.saleId,
          comandaId: input.comandaId,
          deliveryOrderId: input.deliveryOrderId,
          tags: [
            'card_fee',
            input.source,
            `method:${item.method}`,
            `base:${item.amount.toFixed(2)}`,
            `feePercent:${item.feePercent.toFixed(2)}`,
          ],
        },
      });

      created.push(transaction);
    }

    return created.length > 0 ? created : null;
  }
}
