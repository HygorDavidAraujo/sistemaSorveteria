import { PrismaClient } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';

export type ProductReportGranularity = 'day' | 'month' | 'year';
export type ProductRankingMetric = 'revenue' | 'quantity';

export interface ProductReportFiltersDTO {
  startDate: Date;
  endDate: Date;
}

type SoldItemRow = {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  occurredAt: Date;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatBucket = (date: Date, granularity: ProductReportGranularity) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());

  switch (granularity) {
    case 'year':
      return String(y);
    case 'month':
      return `${y}-${m}`;
    case 'day':
    default:
      return `${y}-${m}-${d}`;
  }
};

export class ProductReportsService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  private async getSoldItems(startDate: Date, endDate: Date): Promise<SoldItemRow[]> {
    const prismaAny = this.prismaClient as any;

    const [saleItems, comandaItems, deliveryItems] = await Promise.all([
      this.prismaClient.saleItem.findMany({
        where: {
          sale: {
            saleDate: { gte: startDate, lte: endDate },
            status: { in: ['completed', 'adjusted'] },
          },
        },
        select: {
          productId: true,
          productName: true,
          quantity: true,
          total: true,
          sale: {
            select: {
              saleDate: true,
            },
          },
        },
      }),
      this.prismaClient.comandaItem.findMany({
        where: {
          isCancelled: false,
          comanda: {
            closedAt: { gte: startDate, lte: endDate },
            status: 'closed',
          },
        },
        select: {
          productId: true,
          productName: true,
          quantity: true,
          subtotal: true,
          comanda: {
            select: {
              closedAt: true,
              openedAt: true,
            },
          },
        },
      }),
      prismaAny.deliveryOrderItem.findMany({
        where: {
          deliveryOrder: {
            deliveryStatus: 'delivered',
            OR: [
              { deliveredAt: { gte: startDate, lte: endDate } },
              { deliveredAt: null, orderedAt: { gte: startDate, lte: endDate } },
            ],
          },
        },
        select: {
          productId: true,
          productName: true,
          quantity: true,
          subtotal: true,
          deliveryOrder: {
            select: {
              deliveredAt: true,
              orderedAt: true,
            },
          },
        },
      }),
    ]);

    const rows: SoldItemRow[] = [];

    for (const item of saleItems) {
      rows.push({
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity || 0),
        revenue: Number(item.total || 0),
        occurredAt: item.sale.saleDate,
      });
    }

    for (const item of comandaItems) {
      rows.push({
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity || 0),
        revenue: Number(item.subtotal || 0),
        occurredAt: item.comanda.closedAt ?? item.comanda.openedAt,
      });
    }

    for (const item of deliveryItems) {
      rows.push({
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity || 0),
        revenue: Number(item.subtotal || 0),
        occurredAt: item.deliveryOrder.deliveredAt ?? item.deliveryOrder.orderedAt,
      });
    }

    return rows;
  }

  async getProductRanking(filters: ProductReportFiltersDTO & { metric?: ProductRankingMetric; limit?: number }) {
    const { startDate, endDate } = filters;
    const metric: ProductRankingMetric = filters.metric ?? 'revenue';
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 200);

    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que a data final', 400);
    }

    const rows = await this.getSoldItems(startDate, endDate);

    const aggregated = new Map<
      string,
      { productId: string; productName: string; quantity: number; revenue: number }
    >();

    for (const row of rows) {
      const current = aggregated.get(row.productId) ?? {
        productId: row.productId,
        productName: row.productName,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += row.quantity;
      current.revenue += row.revenue;
      if (!current.productName && row.productName) current.productName = row.productName;
      aggregated.set(row.productId, current);
    }

    const items = Array.from(aggregated.values())
      .sort((a, b) => (metric === 'quantity' ? b.quantity - a.quantity : b.revenue - a.revenue))
      .slice(0, limit);

    const totals = items.reduce(
      (acc, item) => {
        acc.quantity += item.quantity;
        acc.revenue += item.revenue;
        return acc;
      },
      { quantity: 0, revenue: 0 }
    );

    return {
      period: { startDate, endDate },
      metric,
      limit,
      totals,
      items,
    };
  }

  async getProductABCCurve(filters: ProductReportFiltersDTO) {
    const { startDate, endDate } = filters;

    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que a data final', 400);
    }

    const rows = await this.getSoldItems(startDate, endDate);

    const aggregated = new Map<
      string,
      { productId: string; productName: string; quantity: number; revenue: number }
    >();

    for (const row of rows) {
      const current = aggregated.get(row.productId) ?? {
        productId: row.productId,
        productName: row.productName,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += row.quantity;
      current.revenue += row.revenue;
      if (!current.productName && row.productName) current.productName = row.productName;
      aggregated.set(row.productId, current);
    }

    const list = Array.from(aggregated.values()).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = list.reduce((sum, item) => sum + item.revenue, 0);

    let cumulativeRevenue = 0;

    const items = list.map((item) => {
      cumulativeRevenue += item.revenue;
      const share = totalRevenue > 0 ? item.revenue / totalRevenue : 0;
      const cumulativeShare = totalRevenue > 0 ? cumulativeRevenue / totalRevenue : 0;

      let abcClass: 'A' | 'B' | 'C' = 'C';
      if (cumulativeShare <= 0.8) abcClass = 'A';
      else if (cumulativeShare <= 0.95) abcClass = 'B';

      return {
        ...item,
        share,
        cumulativeShare,
        abcClass,
      };
    });

    return {
      period: { startDate, endDate },
      totalRevenue,
      items,
    };
  }

  async getProductTimeSeries(filters: ProductReportFiltersDTO & { granularity?: ProductReportGranularity }) {
    const { startDate, endDate } = filters;
    const granularity: ProductReportGranularity = filters.granularity ?? 'day';

    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que a data final', 400);
    }

    const rows = await this.getSoldItems(startDate, endDate);

    const buckets = new Map<string, { bucket: string; quantity: number; revenue: number }>();

    for (const row of rows) {
      const bucket = formatBucket(row.occurredAt, granularity);
      const current = buckets.get(bucket) ?? { bucket, quantity: 0, revenue: 0 };
      current.quantity += row.quantity;
      current.revenue += row.revenue;
      buckets.set(bucket, current);
    }

    const series = Array.from(buckets.values()).sort((a, b) => (a.bucket < b.bucket ? -1 : 1));

    return {
      period: { startDate, endDate },
      granularity,
      totals: series.reduce(
        (acc, p) => {
          acc.quantity += p.quantity;
          acc.revenue += p.revenue;
          return acc;
        },
        { quantity: 0, revenue: 0 }
      ),
      series,
    };
  }
}
