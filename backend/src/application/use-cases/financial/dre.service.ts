import { PrismaClient } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';
import {
  DREReportEntity,
  CashFlowEntity,
  ProfitabilityAnalysisEntity,
  FinancialIndicatorsEntity,
} from '@domain/entities/financial.entity';

export interface DREFiltersDTO {
  startDate: Date;
  endDate: Date;
}

export interface CashFlowFiltersDTO {
  startDate: Date;
  endDate: Date;
}

/**
 * DRE (Demonstração de Resultado do Exercício) Service
 * Responsável por gerar relatórios financeiros e análises de lucratividade
 */
export class DREService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  private buildExcludeDescriptionPrefixes(prefixes: string[] | undefined) {
    if (!prefixes || prefixes.length === 0) return undefined;
    return prefixes.map((prefix) => ({ NOT: { description: { startsWith: prefix } } }));
  }

  private async getSalesWithItems(startDate: Date, endDate: Date) {
    return this.prismaClient.sale.findMany({
      where: {
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['completed', 'adjusted'],
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                costPrice: true,
              },
            },
          },
        },
      },
    });
  }

  private async getClosedComandasWithItems(startDate: Date, endDate: Date) {
    return this.prismaClient.comanda.findMany({
      where: {
        closedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'closed',
      },
      include: {
        items: {
          where: {
            isCancelled: false,
          },
          include: {
            product: {
              select: {
                costPrice: true,
              },
            },
          },
        },
      },
    });
  }

  private async getDeliveredDeliveryOrders(startDate: Date, endDate: Date) {
    return this.prismaClient.deliveryOrder.findMany({
      where: {
        deliveryStatus: 'delivered',
        OR: [
          {
            deliveredAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            // Safety fallback if deliveredAt isn't set for legacy rows.
            deliveredAt: null,
            orderedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      include: {
        items: true,
      },
    });
  }

  /**
   * Gerar DRE (Income Statement)
   * Demonstração de Resultado do Exercício
   */
  async generateDREReport(filters: DREFiltersDTO): Promise<DREReportEntity> {
    const { startDate, endDate } = filters;

    // Validar datas
    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que a data final', 400);
    }

    // 1. RECEITA BRUTA (Gross Revenue)
    // Observação: `total` já é líquido (após descontos).
    // Para Receita Bruta, usamos `subtotal + taxas`.
    // Importante: a operação pode registrar vendas em múltiplos fluxos (PDV = Sale, Comandas).
    const [sales, comandas, deliveries] = await Promise.all([
      this.getSalesWithItems(startDate, endDate),
      this.getClosedComandasWithItems(startDate, endDate),
      this.getDeliveredDeliveryOrders(startDate, endDate),
    ]);

    const grossRevenueFromSales = sales.reduce(
      (sum, sale) =>
        sum +
        Number(sale.subtotal || 0) +
        Number(sale.deliveryFee || 0) +
        Number(sale.additionalFee || 0),
      0
    );

    const grossRevenueFromComandas = comandas.reduce(
      (sum, comanda) => sum + Number(comanda.subtotal || 0) + Number(comanda.additionalFee || 0),
      0
    );

    const grossRevenueFromDeliveries = deliveries.reduce(
      (sum, order) =>
        sum +
        Number(order.subtotal || 0) +
        Number(order.deliveryFee || 0) +
        Number(order.additionalFee || 0),
      0
    );

    const manualRevenueTransactions = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        transactionType: 'revenue',
        status: 'paid',
        saleId: null,
        comandaId: null,
        deliveryOrderId: null,
        category: {
          name: {
            not: {
              contains: 'Financeira',
            },
          },
        },
      },
      include: { category: true },
    });

    const manualRevenue = manualRevenueTransactions
      .filter((txn) => !txn.category?.name?.includes('Extraordinária'))
      .reduce((sum, txn) => sum + Number(txn.amount), 0);

    const grossRevenue =
      grossRevenueFromSales + grossRevenueFromComandas + grossRevenueFromDeliveries + manualRevenue;

    // 2. RECEITA LÍQUIDA (valor efetivamente cobrado)
    const netRevenueFromSales = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const netRevenueFromComandas = comandas.reduce(
      (sum, comanda) => sum + Number(comanda.total || 0),
      0
    );
    const netRevenueFromDeliveries = deliveries.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );
    const netRevenue = netRevenueFromSales + netRevenueFromComandas + netRevenueFromDeliveries + manualRevenue;

    // 3. DESCONTOS (derivado para manter consistência bruta - descontos = líquida)
    const discounts = Math.max(0, grossRevenue - netRevenue);

    // 4. CUSTO DOS PRODUTOS VENDIDOS (COGS)
    const saleItems = sales.flatMap((sale) => sale.items);
    const comandaItems = comandas.flatMap((comanda) => comanda.items);
    const deliveryItems = deliveries.flatMap((order) => order.items ?? []);

    const cogsFromSaleItems = saleItems.reduce((sum, item) => {
      const unitCost =
        item.costPrice !== null && item.costPrice !== undefined
          ? Number(item.costPrice)
          : Number(item.product?.costPrice || 0);

      const quantity = Number(item.quantity || 0);
      if (!unitCost || !quantity) return sum;
      return sum + unitCost * quantity;
    }, 0);

    const cogsFromComandaItems = comandaItems.reduce((sum, item) => {
      const unitCost =
        item.costPrice !== null && item.costPrice !== undefined
          ? Number(item.costPrice)
          : Number(item.product?.costPrice || 0);

      const quantity = Number(item.quantity || 0);
      if (!unitCost || !quantity) return sum;
      return sum + unitCost * quantity;
    }, 0);

    const cogsFromDeliveryItems = deliveryItems.reduce((sum, item) => {
      const unitCost = item.costPrice !== null && item.costPrice !== undefined ? Number(item.costPrice) : 0;
      const quantity = Number(item.quantity || 0);
      if (!unitCost || !quantity) return sum;
      return sum + unitCost * quantity;
    }, 0);

    const cogs = cogsFromSaleItems + cogsFromComandaItems + cogsFromDeliveryItems;

    // 5. LUCRO BRUTO (Gross Profit)
    const grossProfit = netRevenue - cogs;
    const grossProfitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    // 6. DESPESAS OPERACIONAIS (Operating Expenses)
    const operatingExpenses = await this.getOperatingExpenses(startDate, endDate);

    // 7. LUCRO OPERACIONAL (Operating Profit)
    const operatingProfit = grossProfit - operatingExpenses;
    const operatingMargin = netRevenue > 0 ? (operatingProfit / netRevenue) * 100 : 0;

    // 8. RECEITAS FINANCEIRAS
    const financialIncome = await this.getFinancialIncome(startDate, endDate);

    // 9. DESPESAS FINANCEIRAS
    const financialExpenses = await this.getFinancialExpenses(startDate, endDate);

    // 10. RESULTADO FINANCEIRO
    const financialResult = financialIncome - financialExpenses;

    // 11. OUTRAS RECEITAS E DESPESAS
    const { otherIncome, otherExpenses } = await this.getOtherOperations(startDate, endDate);

    // 12. LUCRO ANTES DE IMPOSTOS
    const profitBeforeTaxes = operatingProfit + financialResult + otherIncome - otherExpenses;

    // 13. IMPOSTOS (Tax)
    const taxes = await this.getTaxes(startDate, endDate);

    // 14. LUCRO LÍQUIDO (Net Profit)
    const netProfit = profitBeforeTaxes - taxes;
    const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      period: { startDate, endDate },
      grossRevenue,
      discounts,
      netRevenue,
      costOfGoodsSold: cogs,
      grossProfit,
      grossProfitMargin,
      operatingExpenses,
      operatingProfit,
      operatingMargin,
      financialIncome,
      financialExpenses,
      financialResult,
      otherIncome,
      otherExpenses,
      profitBeforeTaxes,
      taxes,
      netProfit,
      netMargin,
    };
  }

  /**
   * Gerar Fluxo de Caixa (Cash Flow)
   */
  async generateCashFlow(filters: CashFlowFiltersDTO): Promise<CashFlowEntity> {
    const { startDate, endDate } = filters;

    // Saldo inicial (somar todas as transações antes de startDate)
    const previousTransactions = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          lt: startDate,
        },
        status: 'paid',
      },
    });

    let initialBalance = 0;
    previousTransactions.forEach((txn) => {
      if (txn.transactionType === 'revenue') {
        initialBalance += Number(txn.amount);
      } else {
        initialBalance -= Number(txn.amount);
      }
    });

    // ENTRADAS (Inflows)
    const [sales, comandas, deliveries] = await Promise.all([
      this.prismaClient.sale.findMany({
        where: {
          saleDate: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['completed', 'adjusted'],
          },
        },
      }),
      this.prismaClient.comanda.findMany({
        where: {
          closedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'closed',
        },
      }),
      this.getDeliveredDeliveryOrders(startDate, endDate),
    ]);

    const salesInflow =
      sales.reduce((sum, sale) => sum + Number(sale.total), 0) +
      comandas.reduce((sum, comanda) => sum + Number(comanda.total), 0) +
      deliveries.reduce((sum, order) => sum + Number(order.total), 0);

    const accountReceivablePaid = await this.prismaClient.accountReceivable.findMany({
      where: {
        receivedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'paid',
      },
    });

    const receivableInflow = accountReceivablePaid.reduce((sum, acc) => sum + Number(acc.amount), 0);

    const otherIncomeTransactions = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        transactionType: 'revenue',
        status: 'paid',
        // Evitar dupla-contagem:
        // - Fechamentos de caixa são apenas consolidação para listagem/auditoria.
        // - Contas a receber pagas já entram em `receivableInflow`.
        AND: [
          { NOT: { referenceNumber: { startsWith: 'CASHSESSION-' } } },
          { NOT: { description: { startsWith: 'Conta a Receber:' } } },
        ],
      },
    });

    const otherIncome = otherIncomeTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

    const totalInflows = salesInflow + receivableInflow + otherIncome;

    // SAÍDAS (Outflows)
    const cogs = await this.calculateCOGS(startDate, endDate);

    // Evitar dupla-contagem: Contas a pagar pagas entram em `accountsPayable` via tabela accountPayable.
    // As transações financeiras vinculadas às contas a pagar (descrição "Conta a Pagar:") não devem entrar aqui.
    const operatingExpenses = await this.getOperatingExpensesInternal(startDate, endDate, {
      includeCategoryTypes: ['expense', 'cost'],
      excludeDescriptionPrefixes: ['Conta a Pagar:'],
    });

    const accountPayablePaid = await this.prismaClient.accountPayable.findMany({
      where: {
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'paid',
      },
    });

    const payableOutflow = accountPayablePaid.reduce((sum, acc) => sum + Number(acc.amount), 0);

    const taxes = await this.getTaxes(startDate, endDate, {
      excludeDescriptionPrefixes: ['Conta a Pagar:'],
    });

    const investmentTransactions = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        description: {
          contains: 'Investimento',
        },
        transactionType: 'expense',
        status: 'paid',
        AND: this.buildExcludeDescriptionPrefixes(['Conta a Pagar:']),
      },
    });

    const investments = investmentTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

    const otherExpenseTransactions = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        transactionType: 'expense',
        status: 'paid',
        AND: this.buildExcludeDescriptionPrefixes(['Conta a Pagar:']),
      },
    });

    const otherExpenses = otherExpenseTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0) - cogs - operatingExpenses - taxes - investments;

    const totalOutflows = cogs + operatingExpenses + payableOutflow + taxes + investments + Math.max(0, otherExpenses);

    // FLUXO LÍQUIDO
    const netCashFlow = totalInflows - totalOutflows;

    // SALDO FINAL
    const finalBalance = initialBalance + netCashFlow;

    return {
      period: { startDate, endDate },
      initialBalance,
      inflows: {
        sales: salesInflow,
        accountsReceivable: receivableInflow,
        otherIncome,
        total: totalInflows,
      },
      outflows: {
        cogs,
        operatingExpenses,
        accountsPayable: payableOutflow,
        taxes,
        investments,
        other: Math.max(0, otherExpenses),
        total: totalOutflows,
      },
      netCashFlow,
      finalBalance,
    };
  }

  /**
   * Análise de Lucratividade
   */
  async analyzeProfitability(filters: DREFiltersDTO): Promise<ProfitabilityAnalysisEntity> {
    const dre = await this.generateDREReport(filters);

    // Break-even point = Fixed Costs / Contribution Margin
    // Simplified: Break-even = Operating Expenses / Gross Profit Margin
    const breakEvenPoint =
      dre.grossProfitMargin > 0
        ? (dre.operatingExpenses / (dre.grossProfitMargin / 100)) * 100
        : 0;

    // Contribution Margin = (Sales - COGS) / Sales
    const contributionMargin =
      dre.netRevenue > 0 ? ((dre.netRevenue - dre.costOfGoodsSold) / dre.netRevenue) * 100 : 0;

    return {
      period: filters,
      grossProfitMargin: dre.grossProfitMargin,
      operatingMargin: dre.operatingMargin,
      netMargin: dre.netMargin,
      roi: dre.netMargin, // Simplified ROI
      breakEvenPoint,
      contributionMargin,
    };
  }

  /**
   * Indicadores Financeiros
   */
  async calculateFinancialIndicators(): Promise<FinancialIndicatorsEntity> {
    // Simplificado - em produção, seria necessário dados de balanço patrimonial
    const accountsReceivable = await this.prismaClient.accountReceivable.findMany({
      where: { status: 'paid' },
    });

    const accountsPayable = await this.prismaClient.accountPayable.findMany({
      where: { status: 'paid' },
    });

    const receivablesSum = accountsReceivable.reduce((sum, acc) => sum + Number(acc.amount), 0);
    const payablesSum = accountsPayable.reduce((sum, acc) => sum + Number(acc.amount), 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentSales, recentComandas, recentDeliveries] = await Promise.all([
      this.prismaClient.sale.findMany({
        where: {
          saleDate: {
            gte: thirtyDaysAgo,
          },
          status: {
            in: ['completed', 'adjusted'],
          },
        },
      }),
      this.prismaClient.comanda.findMany({
        where: {
          closedAt: {
            gte: thirtyDaysAgo,
          },
          status: 'closed',
        },
      }),
      this.prismaClient.deliveryOrder.findMany({
        where: {
          deliveryStatus: 'delivered',
          OR: [
            { deliveredAt: { gte: thirtyDaysAgo } },
            { deliveredAt: null, orderedAt: { gte: thirtyDaysAgo } },
          ],
        },
      }),
    ]);

    const revenueSum =
      recentSales.reduce((sum, sale) => sum + Number(sale.total), 0) +
      recentComandas.reduce((sum, comanda) => sum + Number(comanda.total), 0) +
      recentDeliveries.reduce((sum, order) => sum + Number(order.total), 0);
    const receivablesTurnover =
      revenueSum > 0 ? (revenueSum / Math.max(receivablesSum, 1)) * 30 : 0;

    return {
      currentRatio: receivablesSum > 0 ? receivablesSum / Math.max(payablesSum, 1) : 0,
      quickRatio: receivablesSum > 0 ? receivablesSum / Math.max(payablesSum * 0.8, 1) : 0,
      debtToEquity: payablesSum > 0 && receivablesSum > 0 ? payablesSum / receivablesSum : 0,
      returnOnAssets: 0, // Requer dados de ativos
      returnOnEquity: 0, // Requer dados de patrimônio
      inventoryTurnover: 0, // Requer dados de inventário
      receivablesTurnover,
    };
  }

  /**
   * Relatório Comparativo (Período anterior vs Período atual)
   */
  async generateComparativeReport(
    currentStart: Date,
    currentEnd: Date
  ): Promise<{
    current: DREReportEntity;
    previous: DREReportEntity;
    variation: any;
  }> {
    // Calcular período anterior com a mesma duração
    const duration = currentEnd.getTime() - currentStart.getTime();

    const previousStart = new Date(currentStart.getTime() - duration);
    const previousEnd = new Date(currentStart.getTime());

    const current = await this.generateDREReport({ startDate: currentStart, endDate: currentEnd });
    const previous = await this.generateDREReport({ startDate: previousStart, endDate: previousEnd });

    return {
      current,
      previous,
      variation: {
        netProfitVariation: current.netProfit - previous.netProfit,
        netProfitVariationPercent:
          previous.netProfit !== 0
            ? ((current.netProfit - previous.netProfit) / Math.abs(previous.netProfit)) * 100
            : 0,
        revenueVariation: current.netRevenue - previous.netRevenue,
        revenueVariationPercent:
          previous.netRevenue !== 0
            ? ((current.netRevenue - previous.netRevenue) / previous.netRevenue) * 100
            : 0,
        marginVariation: current.netMargin - previous.netMargin,
      },
    };
  }

  /**
   * Métodos auxiliares
   */

  private async getOperatingExpenses(startDate: Date, endDate: Date): Promise<number> {
    // No DRE, consideramos despesas pagas classificadas como "expense" e também "cost"
    // (ex.: CPV lançado via conta a pagar), para não sumirem do relatório.
    return this.getOperatingExpensesInternal(startDate, endDate, {
      includeCategoryTypes: ['expense', 'cost'],
    });
  }

  private async getOperatingExpensesInternal(
    startDate: Date,
    endDate: Date,
    options?: {
      includeCategoryTypes?: Array<'expense' | 'cost'>;
      excludeDescriptionPrefixes?: string[];
    }
  ): Promise<number> {
    const includeCategoryTypes = options?.includeCategoryTypes ?? ['expense'];
    const excludeDescriptionPrefixes = options?.excludeDescriptionPrefixes;

    const expenses = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        transactionType: 'expense',
        status: 'paid',
        category: {
          categoryType: {
            in: includeCategoryTypes,
          },
          name: {
            not: {
              contains: 'Imposto',
            },
          },
        },
        AND: this.buildExcludeDescriptionPrefixes(excludeDescriptionPrefixes),
      },
      include: { category: true },
    });

    return expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  }

  private async getFinancialIncome(startDate: Date, endDate: Date): Promise<number> {
    const income = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        transactionType: 'revenue',
        status: 'paid',
        category: {
          name: {
            contains: 'Financeira',
          },
        },
      },
    });

    return income.reduce((sum, inc) => sum + Number(inc.amount), 0);
  }

  private async getFinancialExpenses(startDate: Date, endDate: Date): Promise<number> {
    const expenses = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        transactionType: 'expense',
        status: 'paid',
        category: {
          name: {
            contains: 'Financeira',
          },
        },
      },
    });

    return expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  }

  private async getOtherOperations(
    startDate: Date,
    endDate: Date
  ): Promise<{ otherIncome: number; otherExpenses: number }> {
    const extraordinary = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'paid',
        category: {
          name: {
            contains: 'Extraordinária',
          },
        },
      },
    });

    const otherIncome = extraordinary
      .filter((txn) => txn.transactionType === 'revenue')
      .reduce((sum, inc) => sum + Number(inc.amount), 0);

    const otherExpenses = extraordinary
      .filter((txn) => txn.transactionType === 'expense')
      .reduce((sum, exp) => sum + Number(exp.amount), 0);

    return { otherIncome, otherExpenses };
  }

  private async getTaxes(
    startDate: Date,
    endDate: Date,
    options?: {
      excludeDescriptionPrefixes?: string[];
    }
  ): Promise<number> {
    const taxes = await this.prismaClient.financialTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        transactionType: 'expense',
        status: 'paid',
        category: {
          name: {
            contains: 'Imposto',
          },
        },
        AND: this.buildExcludeDescriptionPrefixes(options?.excludeDescriptionPrefixes),
      },
    });

    return taxes.reduce((sum, tax) => sum + Number(tax.amount), 0);
  }

  private async calculateCOGS(startDate: Date, endDate: Date): Promise<number> {
    const [sales, comandas, deliveries] = await Promise.all([
      this.getSalesWithItems(startDate, endDate),
      this.getClosedComandasWithItems(startDate, endDate),
      this.getDeliveredDeliveryOrders(startDate, endDate),
    ]);

    const saleItems = sales.flatMap((sale) => sale.items);
    const comandaItems = comandas.flatMap((comanda) => comanda.items);
    const deliveryItems = deliveries.flatMap((order) => order.items ?? []);

    const cogsFromSales = saleItems.reduce((sum, item) => {
      const unitCost =
        item.costPrice !== null && item.costPrice !== undefined
          ? Number(item.costPrice)
          : Number(item.product?.costPrice || 0);

      const quantity = Number(item.quantity || 0);
      if (!unitCost || !quantity) return sum;
      return sum + unitCost * quantity;
    }, 0);

    const cogsFromComandas = comandaItems.reduce((sum, item) => {
      const unitCost =
        item.costPrice !== null && item.costPrice !== undefined
          ? Number(item.costPrice)
          : Number(item.product?.costPrice || 0);

      const quantity = Number(item.quantity || 0);
      if (!unitCost || !quantity) return sum;
      return sum + unitCost * quantity;
    }, 0);

    const cogsFromDeliveries = deliveryItems.reduce((sum, item) => {
      const unitCost = item.costPrice !== null && item.costPrice !== undefined ? Number(item.costPrice) : 0;
      const quantity = Number(item.quantity || 0);
      if (!unitCost || !quantity) return sum;
      return sum + unitCost * quantity;
    }, 0);

    return cogsFromSales + cogsFromComandas + cogsFromDeliveries;
  }
}
