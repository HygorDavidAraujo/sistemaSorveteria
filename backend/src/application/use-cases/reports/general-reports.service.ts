import { PrismaClient, PaymentMethod } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';

export interface DateRangeFilters {
  startDate: Date;
  endDate: Date;
}

export type SalesModule = 'pdv' | 'comanda' | 'delivery';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  debit_card: 'Débito',
  credit_card: 'Crédito',
  pix: 'Pix',
  other: 'Outros',
};

const moduleLabels: Record<SalesModule, string> = {
  pdv: 'PDV',
  comanda: 'Comandas',
  delivery: 'Delivery',
};

const getMonthDayKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
};

const daysBetween = (start: Date, end: Date) => {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
};

export class GeneralReportsService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  async getBirthdayCustomers(filters: DateRangeFilters) {
    const { startDate, endDate } = filters;

    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que a data final', 400);
    }

    const rangeDays = daysBetween(startDate, endDate);
    const includeAll = rangeDays >= 366;

    const customers = await this.prismaClient.customer.findMany({
      where: {
        birthDate: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
        email: true,
        birthDate: true,
      },
      orderBy: { name: 'asc' },
    });

    let filtered = customers;

    if (!includeAll) {
      const monthDaySet = new Set<string>();
      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      while (cursor <= endCursor) {
        monthDaySet.add(getMonthDayKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      filtered = customers.filter((customer) => {
        if (!customer.birthDate) return false;
        return monthDaySet.has(getMonthDayKey(customer.birthDate));
      });
    }

    const sorted = filtered.sort((a, b) => {
      if (!a.birthDate || !b.birthDate) return 0;
      return getMonthDayKey(a.birthDate).localeCompare(getMonthDayKey(b.birthDate));
    });

    return {
      period: {
        startDate,
        endDate,
      },
      total: sorted.length,
      customers: sorted,
    };
  }

  async getSalesByModule(filters: DateRangeFilters) {
    const { startDate, endDate } = filters;

    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que a data final', 400);
    }

    const [sales, comandas, deliveries] = await Promise.all([
      this.prismaClient.sale.aggregate({
        where: {
          saleDate: { gte: startDate, lte: endDate },
          status: { in: ['completed', 'adjusted'] },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prismaClient.comanda.aggregate({
        where: {
          status: 'closed',
          closedAt: { gte: startDate, lte: endDate },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      (this.prismaClient as any).deliveryOrder.aggregate({
        where: {
          deliveryStatus: 'delivered',
          OR: [
            { deliveredAt: { gte: startDate, lte: endDate } },
            { deliveredAt: null, orderedAt: { gte: startDate, lte: endDate } },
          ],
        },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    const modules = [
      {
        module: 'pdv' as SalesModule,
        label: moduleLabels.pdv,
        totalAmount: Number(sales._sum.total || 0),
        count: Number(sales._count.id || 0),
      },
      {
        module: 'comanda' as SalesModule,
        label: moduleLabels.comanda,
        totalAmount: Number(comandas._sum.total || 0),
        count: Number(comandas._count.id || 0),
      },
      {
        module: 'delivery' as SalesModule,
        label: moduleLabels.delivery,
        totalAmount: Number(deliveries._sum.total || 0),
        count: Number(deliveries._count.id || 0),
      },
    ];

    const totals = modules.reduce(
      (acc, item) => {
        acc.totalAmount += item.totalAmount;
        acc.count += item.count;
        return acc;
      },
      { totalAmount: 0, count: 0 }
    );

    return {
      period: {
        startDate,
        endDate,
      },
      totals,
      modules,
    };
  }

  async getSalesByPaymentMethod(filters: DateRangeFilters) {
    const { startDate, endDate } = filters;

    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que a data final', 400);
    }

    const [salesPayments, comandaPayments, deliveryPayments] = await Promise.all([
      this.prismaClient.payment.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          sale: {
            saleDate: { gte: startDate, lte: endDate },
            status: { in: ['completed', 'adjusted'] },
          },
        },
      }),
      this.prismaClient.comandaPayment.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          comanda: {
            status: 'closed',
            closedAt: { gte: startDate, lte: endDate },
          },
        },
      }),
      (this.prismaClient as any).deliveryOrderPayment.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          deliveryOrder: {
            deliveryStatus: 'delivered',
            OR: [
              { deliveredAt: { gte: startDate, lte: endDate } },
              { deliveredAt: null, orderedAt: { gte: startDate, lte: endDate } },
            ],
          },
        },
      }),
    ]);

    const methods: Record<PaymentMethod, { amount: number; count: number }> = {
      cash: { amount: 0, count: 0 },
      debit_card: { amount: 0, count: 0 },
      credit_card: { amount: 0, count: 0 },
      pix: { amount: 0, count: 0 },
      other: { amount: 0, count: 0 },
    };

    const merge = (rows: Array<{ paymentMethod: PaymentMethod; _sum: { amount: any }; _count: { _all: number } }>) => {
      rows.forEach((row) => {
        const method = row.paymentMethod;
        methods[method].amount += Number(row._sum.amount || 0);
        methods[method].count += Number(row._count._all || 0);
      });
    };

    merge(salesPayments as any);
    merge(comandaPayments as any);
    merge(deliveryPayments as any);

    const list = (Object.keys(methods) as PaymentMethod[]).map((method) => ({
      paymentMethod: method,
      label: paymentMethodLabels[method],
      amount: methods[method].amount,
      count: methods[method].count,
    }));

    const totals = list.reduce(
      (acc, item) => {
        acc.amount += item.amount;
        acc.count += item.count;
        return acc;
      },
      { amount: 0, count: 0 }
    );

    const enriched = list.map((item) => ({
      ...item,
      share: totals.amount > 0 ? item.amount / totals.amount : 0,
    }));

    return {
      period: {
        startDate,
        endDate,
      },
      totals,
      methods: enriched,
    };
  }

  async getCardFeesByPaymentMethod(filters: DateRangeFilters) {
    const { startDate, endDate } = filters;

    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que a data final', 400);
    }

    const feeTransactions = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        transactionType: 'expense',
        status: 'paid',
        tags: {
          has: 'card_fee',
        },
      },
      select: {
        amount: true,
        description: true,
        tags: true,
      },
    });

    const methods: Record<PaymentMethod, { amount: number; count: number; feeAmount: number; feePercent: number }> = {
      cash: { amount: 0, count: 0, feeAmount: 0, feePercent: 0 },
      debit_card: { amount: 0, count: 0, feeAmount: 0, feePercent: 0 },
      credit_card: { amount: 0, count: 0, feeAmount: 0, feePercent: 0 },
      pix: { amount: 0, count: 0, feeAmount: 0, feePercent: 0 },
      other: { amount: 0, count: 0, feeAmount: 0, feePercent: 0 },
    };

    const parseMoney = (raw: string) => {
      const valueRaw = String(raw ?? '').trim();
      if (!valueRaw) return 0;
      const hasDot = valueRaw.includes('.');
      const hasComma = valueRaw.includes(',');

      let normalized = valueRaw;
      if (hasDot && hasComma) {
        normalized = valueRaw.replace(/\./g, '').replace(',', '.');
      } else if (hasComma && !hasDot) {
        normalized = valueRaw.replace(',', '.');
      }

      const value = Number(normalized);
      return Number.isFinite(value) ? value : 0;
    };

    const parsePercent = (raw: string) => {
      const valueRaw = String(raw ?? '').trim();
      if (!valueRaw) return 0;
      const normalized = valueRaw.replace(',', '.');
      const value = Number(normalized);
      return Number.isFinite(value) ? value : 0;
    };

    const extractFromTags = (tags: string[] | null | undefined) => {
      if (!tags || tags.length === 0) return null;
      const methodTag = tags.find((tag) => tag.startsWith('method:'));
      const baseTag = tags.find((tag) => tag.startsWith('base:'));
      const feePercentTag = tags.find((tag) => tag.startsWith('feePercent:'));
      if (!methodTag) return null;
      const method = methodTag.replace('method:', '') as PaymentMethod;
      const base = baseTag ? parseMoney(baseTag.replace('base:', '')) : 0;
      const feePercent = feePercentTag ? parsePercent(feePercentTag.replace('feePercent:', '')) : 0;
      return { method, base, feePercent };
    };

    const parseLegacyDescription = (description: string | null | undefined) => {
      if (!description) return [] as Array<{ method: PaymentMethod; base: number; feePercent: number; feeAmount: number }>;
      const results: Array<{ method: PaymentMethod; base: number; feePercent: number; feeAmount: number }> = [];
      const patterns: Array<{ method: PaymentMethod; regex: RegExp }> = [
        { method: 'credit_card', regex: /Cart[aã]o\s+Cr[eé]dito\s+([\d.,]+)%\s+sobre\s+R\$\s+([\d.,]+)\s*=\s*R\$\s+([\d.,]+)/gi },
        { method: 'debit_card', regex: /Cart[aã]o\s+D[eé]bito\s+([\d.,]+)%\s+sobre\s+R\$\s+([\d.,]+)\s*=\s*R\$\s+([\d.,]+)/gi },
      ];

      for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.regex.exec(description)) !== null) {
          const feePercent = parsePercent(match[1]);
          const base = parseMoney(match[2]);
          const feeAmount = parseMoney(match[3]);
          results.push({ method: pattern.method, base, feePercent, feeAmount });
        }
      }

      return results;
    };

    for (const txn of feeTransactions) {
      const feeAmount = Number(txn.amount || 0);
      const tagsInfo = extractFromTags(txn.tags as any);

      if (tagsInfo) {
        const bucket = methods[tagsInfo.method] ?? methods.other;
        bucket.amount += tagsInfo.base;
        bucket.feeAmount += feeAmount;
        bucket.count += 1;
        bucket.feePercent = tagsInfo.feePercent;
        continue;
      }

      const parsed = parseLegacyDescription(txn.description);
      if (parsed.length > 0) {
        for (const item of parsed) {
          const bucket = methods[item.method] ?? methods.other;
          bucket.amount += item.base;
          bucket.feeAmount += item.feeAmount;
          bucket.count += 1;
          bucket.feePercent = item.feePercent;
        }
        continue;
      }

      methods.other.feeAmount += feeAmount;
      methods.other.count += 1;
    }

    const list = (Object.keys(methods) as PaymentMethod[]).map((method) => ({
      paymentMethod: method,
      label: paymentMethodLabels[method],
      amount: methods[method].amount,
      count: methods[method].count,
      feePercent: methods[method].feePercent,
      feeAmount: methods[method].feeAmount,
    }));

    const totals = list.reduce(
      (acc, item) => {
        acc.amount += item.amount;
        acc.feeAmount += item.feeAmount;
        acc.count += item.count;
        return acc;
      },
      { amount: 0, feeAmount: 0, count: 0 }
    );

    return {
      period: {
        startDate,
        endDate,
      },
      totals,
      methods: list,
    };
  }
}
